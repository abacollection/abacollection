const test = require('ava');
const { factory } = require('factory-girl');

const config = require('../../config');
const { Users, Targets } = require('../../app/models');
const {
  retrieveTargets
} = require('../../app/controllers/web/data-collection');

const utils = require('../utils');

test.before(utils.setupMongoose);
test.before(utils.defineUserFactory);
test.before(utils.defineClientFactory);
test.before(utils.defineProgramFactory);
test.before(utils.defineTargetFactory);
test.before(utils.defineDataFactory);

test.after.always(utils.teardownMongoose);

test.beforeEach(async t => {
  // set password
  t.context.password = '!@K#NLK!#N';
  // create user
  let user = await factory.build('user');
  // must register in order for authentication to work
  user = await Users.register(user, t.context.password);
  // setup user for otp
  user[config.userFields.hasSetPassword] = true;
  t.context.user = await user.save();

  await utils.setupWebServer(t);
  await utils.loginUser(t);

  const member = await factory.create('member', {
    user: t.context.user,
    group: 'admin'
  });
  t.context.client = await factory.create('client', { members: member });
  t.context.programs = await factory.createMany('program', 3, {
    client: t.context.client
  });

  t.context.targets = t.context.programs.map(program => {
    return factory.createMany('target', 3, { program });
  });
  t.context.targets = await Promise.all(t.context.targets);
  t.context.targets = t.context.targets.flat();

  t.context.root = `/en/collection/${t.context.client.id}`;
});

test('retrieveTargets > successfully', async t => {
  t.plan(1);

  const { user, client, programs } = t.context;

  const ctx = {
    state: {
      user,
      client,
      programs
    }
  };

  await retrieveTargets(ctx, () => {
    t.is(ctx.state.targets.length, 9);
  });
});

test('GET(HTML) collection page', async t => {
  const { web, root } = t.context;

  const res = await web.get(root);

  t.is(res.status, 200);
});

test('POST collection page > frequency > adds data', async t => {
  const { web, root, programs } = t.context;
  const program = programs[0];
  const target = await factory.create('target', {
    program,
    data_type: 'Frequency'
  });

  const res = await web
    .post(root)
    .set('Accept', 'application/json')
    .send({
      targets: {
        [target.id]: {
          value: 2
        }
      }
    });

  t.is(res.status, 200);

  const query = await Targets.findOne({ id: target.id })
    .populate('data')
    .exec();
  t.is(query.data[0].value, 2);
});

test('POST collction page > data is 0, no changes', async t => {
  const { web, root, programs } = t.context;
  const program = programs[0];
  const target = await factory.create('target', {
    program,
    data_type: 'Frequency'
  });

  const res = await web
    .post(root)
    .set('Accept', 'application/json')
    .send({
      targets: {
        [target.id]: {
          value: 0
        }
      }
    });

  t.is(res.status, 200);

  const query = await Targets.findOne({ id: target.id })
    .populate('data')
    .exec();
  t.is(query.data.length, 0);
});

test('POST collection page > duration > adds data', async t => {
  const { web, root, programs } = t.context;
  const program = programs[0];
  const target = await factory.create('target', {
    program,
    data_type: 'Duration'
  });

  const res = await web
    .post(root)
    .set('Accept', 'application/json')
    .send({
      targets: {
        [target.id]: {
          value: 2
        }
      }
    });

  t.is(res.status, 200);

  const query = await Targets.findOne({ id: target.id })
    .populate('data')
    .exec();
  t.is(query.data[0].value, 2);
});
