const test = require('ava');
const { factory, MongooseAdapter } = require('factory-girl');
const mongoose = require('mongoose');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const { Clients } = require('../../../app/models');
const {
  retrieveClients,
  retrieveClient
} = require('../../../app/controllers/web/dashboard/clients');
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
test.beforeEach(beforeEach);
test.afterEach.always(async () => {
  sinon.restore();

  await Clients.deleteMany({});
  await Member.deleteMany({});
});

test.serial(
  'retrieveClients > get clients that only the user has permissions for',
  async t => {
    t.plan(2);

    const members = await factory.createMany('member', 2);
    const clients = await factory.createMany('client', [
      { members: [members[0]] },
      { members: [members[1]] }
    ]);

    const ctx = {
      isAuthenticated: () => true,
      state: { user: members[0].user }
    };

    await retrieveClients(ctx, () => {
      t.is(ctx.state.clients[0].id, clients[0].id);
      t.is(typeof ctx.state.clients[1], 'undefined');
    });
  }
);

test.serial('retrieveClient > get client information', async t => {
  const client = await factory.create('client');

  const ctx = {
    params: { client_id: client.id },
    state: { clients: [client] }
  };

  await retrieveClient(ctx, () => {
    t.is(ctx.state.client.id, client.id);
  });
});

test('retrieveClient > errors if client does not exist', async t => {
  const ctx = {
    params: { client_id: '34' },
    state: { clients: [] },
    translateError: err => err,
    throw: err => {
      throw new Error(err);
    }
  };

  await t.throwsAsync(
    retrieveClient(ctx, () => {}),
    {
      message: 'Error: CLIENT_DOES_NOT_EXIST'
    }
  );
});

test('retrieveClient > errors if client_id !isSANB and req.body.client !isSANB', async t => {
  const ctx = {
    params: { client_id: 34 },
    request: {
      body: { client: 34 }
    },
    translateError: err => err,
    throw: err => {
      throw new Error(err);
    }
  };

  await t.throwsAsync(
    retrieveClient(ctx, () => {}),
    {
      message: 'Error: CLIENT_DOES_NOT_EXIST'
    }
  );
});

test.serial('GET dashboard > successfully', async t => {
  const { web } = t.context;

  const res = await web.get('/en/dashboard');

  t.is(res.status, 200);
  t.true(res.text.includes('Dashboard'));
});

test.serial('GET dashboard/clients > successfully with no clients', async t => {
  const { web } = t.context;

  const res = await web.get('/en/dashboard/clients');

  t.log(res.text);
  t.is(res.status, 200);
  t.true(res.text.includes('Clients'));
  t.true(res.text.includes('No clients exist yet'));
});

test.serial('GET dashboard/clients > successfully with clients', async t => {
  const { web, user } = t.context;
  const member = await factory.create('member', { user });
  const client = await factory.create('client', { members: member });

  const res = await web.get('/en/dashboard/clients');

  t.is(res.status, 200);
  t.true(res.text.includes('Clients'));
  t.true(res.text.includes(client.first_name));
});

test.serial('PUT dashboard/clients > successfully with name', async t => {
  const { web } = t.context;
  const client = await factory.build('client');

  const res = await web.put('/en/dashboard/clients').send({
    first_name: client.first_name,
    last_name: client.last_name
  });

  t.is(res.status, 302);
  t.is(res.header.location, '/en/dashboard/clients');

  const query = await Clients.findOne({});
  t.is(query.first_name, client.first_name);
  t.is(query.last_name, client.last_name);
  t.is(query.gender, undefined);
  t.is(query.dob, undefined);
});

test.serial(
  'PUT dashboard/clients > successfully with name and gender',
  async t => {
    const { web } = t.context;
    const client = await factory.build('client');

    const res = await web.put('/en/dashboard/clients').send({
      first_name: client.first_name,
      last_name: client.last_name,
      gender: client.gender
    });

    t.is(res.status, 302);
    t.is(res.header.location, '/en/dashboard/clients');

    const query = await Clients.findOne({});
    t.is(query.first_name, client.first_name);
    t.is(query.last_name, client.last_name);
    t.is(query.gender, client.gender);
    t.is(query.dob, undefined);
  }
);

test.serial(
  'PUT dashbaord/clients > successfully with name and dob',
  async t => {
    const { web } = t.context;
    const client = await factory.build('client');

    const res = await web.put('/en/dashboard/clients').send({
      first_name: client.first_name,
      last_name: client.last_name,
      dob: client.dob
    });

    t.is(res.status, 302);
    t.is(res.header.location, '/en/dashboard/clients');

    const query = await Clients.findOne({});
    t.is(query.first_name, client.first_name);
    t.is(query.last_name, client.last_name);
    t.is(query.gender, undefined);
    t.deepEqual(query.dob, client.dob);
  }
);

test.serial(
  'PUT dashbaord/clients > successfully with name, gender, and dob',
  async t => {
    const { web } = t.context;
    const client = await factory.build('client');

    const res = await web.put('/en/dashboard/clients').send({
      first_name: client.first_name,
      last_name: client.last_name,
      gender: client.gender,
      dob: client.dob
    });

    t.is(res.status, 302);
    t.is(res.header.location, '/en/dashboard/clients');

    const query = await Clients.findOne({});
    t.is(query.first_name, client.first_name);
    t.is(query.last_name, client.last_name);
    t.is(query.gender, client.gender);
    t.deepEqual(query.dob, client.dob);
  }
);

test.serial('PUT dashboard/clients > fails with no name', async t => {
  const { web } = t.context;

  const res = await web.put('/en/dashboard/clients').send({});

  t.is(res.status, 400);
  t.is(JSON.parse(res.text).message, phrases.INVALID_NAME);
});

test.serial('PUT dashboard/clients > fails with invalid dob', async t => {
  const { web } = t.context;

  const res = await web.put('/en/dashboard/clients').send({
    first_name: 'Leroy',
    last_name: 'Jenkins',
    dob: 'nonsense'
  });

  t.is(res.status, 400);
  t.is(JSON.parse(res.text).message, phrases.INVALID_DOB);
});

test.serial('DELETE dashboard/clients > successfully', async t => {
  const { web, user } = t.context;
  const member = await factory.create('member', {
    user,
    group: 'admin'
  });
  const client = await factory.create('client', { members: member });

  let query = await Clients.findOne({});
  t.is(query.id, client.id);

  const res = await web.delete(`/en/dashboard/clients/${client.id}`);

  t.is(res.status, 302);
  t.is(res.header.location, '/en/dashboard/clients');

  query = await Clients.findOne({});
  t.is(query, null);
});

test.serial(
  'DELETE dashboard/clients > fails if user does not have permissions',
  async t => {
    const { web } = t.context;
    const client = await factory.create('client');

    const res = await web.delete(`/en/dashboard/clients/${client.id}`);

    t.is(res.status, 400);
    t.is(JSON.parse(res.text).message, phrases.CLIENT_DOES_NOT_EXIST);
  }
);

test.serial(
  'DELETE dashboard/clients > fails if client does not exist',
  async t => {
    const { web } = t.context;

    const res = await web.delete('/en/dashboard/clients/1');

    t.is(res.status, 400);
    t.is(JSON.parse(res.text).message, phrases.CLIENT_DOES_NOT_EXIST);
  }
);

test.serial(
  'DELETE dashboard/clients > fails if user is not admin',
  async t => {
    const { web, user } = t.context;
    const member = await factory.create('member', {
      user,
      group: 'user'
    });
    const client = await factory.create('client', { members: member });

    let query = await Clients.findOne({});
    t.is(query.id, client.id);

    const res = await web.delete(`/en/dashboard/clients/${client.id}`);

    t.is(res.status, 400);
    t.is(JSON.parse(res.text).message, phrases.IS_NOT_ADMIN);

    query = await Clients.findOne({});
    t.is(query.id, client.id);
  }
);

test.serial('GET dashboard/clients/settings > successfully', async t => {
  const { web, user } = t.context;
  const member = await factory.create('member', { user });
  const client = await factory.create('client', { members: member });

  const res = await web.get(`/en/dashboard/clients/${client.id}/settings`);

  t.is(res.status, 200);
});
