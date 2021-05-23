const test = require('ava');
const { factory } = require('factory-girl');

const config = require('../../../config');
const { Users } = require('../../../app/models');
const {
  retrieveTargets
} = require('../../../app/controllers/web/data-collection');

const utils = require('../../utils');

test.before(utils.setupMongoose);
test.before(utils.defineUserFactory);
test.before(utils.defineClientFactory);
test.before(utils.defineProgramFactory);
test.before(utils.defineTargetFactory);
test.before(utils.defineDataFactory);

test.after.always(utils.teardownMongoose);

test.beforeEach(async (t) => {
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

  t.context.root = `/en/collection/${t.context.client.id}`;
});

test('retrieveTargets > successfully', async (t) => {
  t.plan(19);

  const { user, client, programs } = t.context;

  await Promise.all([
    ...programs.map((program) => {
      return factory.createMany('target', 3, { program });
    }),
    ...programs.map((program) => {
      return factory.createMany('target', 3, { program, phase: 'Not Started' });
    }),
    ...programs.map((program) => {
      return factory.createMany('target', 3, { program, phase: 'Mastered' });
    })
  ]);

  const ctx = {
    state: {
      user,
      client,
      programs
    }
  };

  await retrieveTargets(ctx, () => {
    const { targets } = ctx.state;
    t.is(targets.length, 9);
    for (const target of targets) {
      t.not(target.phase, 'Not Started');
      t.not(target.phase, 'Mastered');
    }
  });
});

test('retrieveTargets > only active targets', async (t) => {
  t.plan(1);

  const { user, client, programs } = t.context;

  await Promise.all(
    programs.map((program) => {
      return factory.createMany('target', 3, { program });
    })
  );

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
