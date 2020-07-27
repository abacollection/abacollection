const test = require('ava');
const { factory, MongooseAdapter } = require('factory-girl');
const mongoose = require('mongoose');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const { Clients, Programs, Targets } = require('../../../app/models');
const {
  retrieveTargets
} = require('../../../app/controllers/web/dashboard/targets');

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

  // setup target factory
  factory.define('target', Targets, buildOptions => {
    return {
      name: factory.chance('word'),
      data_type: 'Frequency',
      description: factory.chance('sentence'),
      program: buildOptions.program
        ? buildOptions.program
        : factory.assoc('program', '_id')
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
  t.context.program = await factory.create('program', {
    client: t.context.client
  });

  t.context.root = `/en/dashboard/clients/${t.context.client.id}/programs/${t.context.program.id}`;
});
test.afterEach.always(async () => {
  sinon.restore();

  await Targets.deleteMany({});
  await Programs.deleteMany({});
  await Clients.deleteMany({});
  await Member.deleteMany({});
});

test('retrieveTargets > get targets only linked to program', async t => {
  t.plan(2);

  const { program } = t.context;
  const targets = await factory.createMany('target', [{ program }, {}]);

  const ctx = {
    state: {
      program
    }
  };

  await retrieveTargets(ctx, () => {
    t.is(ctx.state.targets.length, 1);
    t.is(ctx.state.targets[0].id, targets[0].id);
  });
});

test('GET targets > successfully with no targets', async t => {
  const { web, root } = t.context;

  const res = await web.get(`${root}/targets`);

  t.is(res.status, 200);
  t.true(res.text.includes('No targets for this client yet.'));
});

test('GET targets > successfully with targets', async t => {
  const { web, root, program } = t.context;

  const target = await factory.create('target', { program });

  const res = await web.get(`${root}/targets`);

  t.is(res.status, 200);
  t.true(res.text.includes(target.name));
});

test('PUT targets > successfully', async t => {
  const { web, root } = t.context;
  const target = await factory.build('target');

  let query = await Targets.findOne({});
  t.is(query, null);

  const res = await web.put(`${root}/targets`).send({
    name: target.name,
    description: target.description,
    data_type: target.data_type
  });

  t.is(res.status, 302);
  t.is(res.header.location, `${root}/targets`);

  query = await Targets.findOne({});
  t.is(query.data_type, target.data_type);
  t.is(query.name, target.name);
  t.is(query.description, target.description);
  t.is(query.data_type, target.data_type);
});

test('PUT targets >  fails with invalid name', async t => {
  const { web, root } = t.context;

  const res = await web.put(`${root}/targets`).send({});

  t.is(res.status, 400);
  t.is(JSON.parse(res.text).message, phrases.INVALID_TARGET_NAME);
});
