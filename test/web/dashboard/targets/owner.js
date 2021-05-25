const test = require('ava');
const { factory } = require('factory-girl');

const config = require('../../../../config');
const { Users, Targets } = require('../../../../app/models');

const utils = require('../../../utils');

test.before(utils.setupMongoose);
test.before(utils.defineUserFactory);
test.before(utils.defineClientFactory);
test.before(utils.defineProgramFactory);
test.before(utils.defineTargetFactory);
test.before(utils.defineDataFactory);

test.after.always(utils.teardownMongoose);

test.beforeEach(async (t) => {
  // Set password
  t.context.password = '!@K#NLK!#N';
  // Create user
  let user = await factory.build('user');
  // Must register in order for authentication to work
  user = await Users.register(user, t.context.password);
  // Setup user for otp
  user[config.userFields.hasSetPassword] = true;
  t.context.user = await user.save();

  await utils.setupWebServer(t);
  await utils.loginUser(t);

  const member = await factory.create('member', {
    user: t.context.user,
    group: 'owner'
  });
  t.context.client = await factory.create('client', { members: member });
  t.context.program = await factory.create('program', {
    client: t.context.client
  });

  t.context.root = `/en/dashboard/clients/${t.context.client.id}/programs/${t.context.program.id}`;
});

test('deletes target when program is deleted', async (t) => {
  const { web, program, root } = t.context;

  await factory.createMany('target', 2, { program });

  let query = await Targets.find({ $or: [{ program: program._id }] });
  t.is(query.length, 2);

  const res = await web.delete(root);

  t.is(res.status, 302);

  query = await Targets.find({ $or: [{ program: program._id }] });
  t.is(query.length, 0);
});
