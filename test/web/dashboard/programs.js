const test = require('ava');
const { factory, MongooseAdapter } = require('factory-girl');
const mongoose = require('mongoose');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const { Clients, Programs } = require('../../../app/models');
const {
  retrievePrograms,
  retrieveProgram
} = require('../../../app/controllers/web').dashboard.programs;

const policies = require('../../../helpers/policies');
const phrases = require('../../../config/phrases');

const { before, beforeEach, after } = require('../../_utils');

const adapter = new MongooseAdapter();
const Member = mongoose.model('Member', Clients.Member);

test.before(async t => {
  // call setup
  await before(t);

  factory.setAdapter(adapter);
  // setup members factory
  factory.define('member', Member, buildOptions => {
    return {
      user: buildOptions.user
        ? buildOptions.user
        : factory.assoc('user', '_id'),
      group: buildOptions.group
        ? buildOptions.group
        : factory.chance('pickone', ['admin', 'user'])
    };
  });

  // setup client factory
  factory.define('client', Clients, buildOptions => {
    return {
      first_name: factory.chance('first'),
      last_name: factory.chance('last'),
      dob: factory.chance('birthday'),
      gender: factory.chance('gender'),
      creation_date: new Date(Date.now()),
      members: buildOptions.members
        ? buildOptions.members
        : factory.assocMany('member', 2, '_id')
    };
  });

  // setup program factory
  factory.define('program', Programs, buildOptions => {
    return {
      name: factory.chance('word'),
      description: factory.chance('sentence'),
      creation_date: new Date(Date.now()),
      client: buildOptions.client
        ? buildOptions.client
        : factory.assoc('client', '_id')
    };
  });

  // stub policies in routes/web/otp
  t.context.ensureLoggedIn = sinon.stub(policies, 'ensureLoggedIn');
  proxyquire('../../../routes/web', {
    '../../helpers': {
      policies
    }
  });
  t.context.user = await factory.create('user');
  t.context.ensureLoggedIn.callsFake(async (ctx, next) => {
    ctx.state.user = t.context.user;
    return next();
  });
});
test.after.always(async t => {
  await factory.cleanUp();

  await after(t);
});
test.beforeEach(async t => {
  await beforeEach(t);

  const member = await factory.create('member', {
    user: t.context.user,
    group: 'admin'
  });
  t.context.client = await factory.create('client', { members: member });

  t.context.root = `/en/dashboard/clients/${t.context.client.id}`;
});
test.afterEach.always(async () => {
  sinon.restore();

  await Programs.deleteMany({});
  await Clients.deleteMany({});
  await Member.deleteMany({});
});

test.serial(
  'retrievePrograms > get programs only linked to the client',
  async t => {
    t.plan(2);

    const members = await factory.createMany('member', 2);
    const clients = await factory.createMany('client', [
      { members: members[0] },
      { members: members[1] }
    ]);
    const programs = await factory.createMany('program', [
      { client: clients[0] },
      { client: clients[1] }
    ]);

    const ctx = {
      state: {
        user: members[0].user,
        client: clients[0]
      }
    };

    await retrievePrograms(ctx, () => {
      t.is(ctx.state.programs.length, 1);
      t.is(ctx.state.programs[0].id, programs[0].id);
    });
  }
);

test.serial('retrieveProgram > get program', async t => {
  t.plan(2);

  const programs = await factory.createMany('program', 2);

  const ctx = {
    params: { program_id: programs[0].id },
    state: {
      programs,
      breadcrumbs: [programs[0].id],
      client: { id: '32' },
      l: url => `/en${url}`
    }
  };

  await retrieveProgram(ctx, () => {
    t.is(ctx.state.program.id, programs[0].id);
    t.is(ctx.state.breadcrumbs[0].name, programs[0].name);
  });
});

test.serial('retrieveProgram > errors if no params', async t => {
  const programs = await factory.createMany('program', 2);

  const ctx = {
    params: { program_id: '' },
    request: {
      body: { program: '' }
    },
    state: { programs },
    translateError: err => err,
    throw: err => {
      throw new Error(err);
    }
  };

  await t.throwsAsync(() => retrieveProgram(ctx, () => {}), {
    message: 'Error: PROGRAM_DOES_NOT_EXIST'
  });
});

test.serial('retrieveProgram > errors if program does not exist', async t => {
  const ctx = {
    params: { program_id: '1' },
    state: { programs: [] },
    translateError: err => err,
    throw: err => {
      throw new Error(err);
    }
  };

  await t.throwsAsync(() => retrieveProgram(ctx, () => {}), {
    message: 'Error: PROGRAM_DOES_NOT_EXIST'
  });
});

test.serial(
  'GET dashboard/clients/programs > successfully with no programs',
  async t => {
    const { web, root } = t.context;

    const res = await web.get(`${root}/programs`);

    t.is(res.status, 200);
    t.true(res.text.includes('No programs for this client yet.'));
  }
);

test.serial(
  'GET dashboard/clients/programs > successfully with programs',
  async t => {
    const { web, client, root } = t.context;
    const program = await factory.create('program', { client });

    const res = await web.get(`${root}/programs`);

    t.is(res.status, 200);
    t.true(res.text.includes(program.name));
  }
);

test.serial('PUT dashboard/clients/programs > successfully', async t => {
  const { web, root } = t.context;
  const program = await factory.build('program');

  let query = await Programs.findOne({});
  t.is(query, null);

  const res = await web.put(`${root}/programs`).send({
    name: program.name,
    description: program.description
  });

  t.is(res.status, 302);
  t.is(res.header.location, `${root}/programs`);

  query = await Programs.findOne({});
  t.true(
    query.name === program.name && query.description === program.description
  );
});

test.serial('PUT dashboard/clients/programs > fails with no name', async t => {
  const { web, root } = t.context;

  let query = await Programs.findOne({});
  t.is(query, null);

  const res = await web.put(`${root}/programs`);

  t.is(res.status, 400);
  t.is(JSON.parse(res.text).message, phrases.INVALID_PROGRAM_NAME);

  query = await Programs.findOne({});
  t.is(query, null);
});

test.serial('DELETE dashboard/clients/programs > successfully', async t => {
  const { web, client, root } = t.context;

  const program = await factory.create('program', { client });

  let query = await Programs.findOne({});
  t.is(query.id, program.id);

  const res = await web.delete(`${root}/programs/${program.id}`);

  t.is(res.status, 302);
  t.is(res.header.location, `${root}/programs`);

  query = await Programs.findOne({});
  t.is(query, null);
});

test.serial(
  'DELETE dashboard/clients/programs > fails if program does not exist',
  async t => {
    const { web, root } = t.context;

    const res = await web.delete(`${root}/programs/1`);

    t.is(res.status, 400);
    t.is(JSON.parse(res.text).message, phrases.PROGRAM_DOES_NOT_EXIST);
  }
);

test.serial(
  'DELETE dashboard/clients/programs > fails if user is not admin',
  async t => {
    const { web, user } = t.context;

    const member = await factory.create('member', { user, group: 'user' });
    const client = await factory.create('client', { members: member });
    const program = await factory.create('program', { client });

    let query = await Programs.findOne({});
    t.is(query.id, program.id);

    const res = await web.delete(
      `/en/dashboard/clients/${client.id}/programs/${program.id}`
    );

    t.is(res.status, 400);
    t.is(JSON.parse(res.text).message, phrases.IS_NOT_ADMIN);

    query = await Programs.findOne({});
    t.is(query.id, program.id);
  }
);
