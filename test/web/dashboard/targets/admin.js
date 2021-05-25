const test = require('ava');
const { factory } = require('factory-girl');

const config = require('../../../../config');
const { Users, Targets } = require('../../../../app/models');

const phrases = require('../../../../config/phrases');

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
    group: 'admin'
  });
  t.context.client = await factory.create('client', { members: member });
  t.context.program = await factory.create('program', {
    client: t.context.client
  });

  t.context.root = `/en/dashboard/clients/${t.context.client.id}/programs/${t.context.program.id}`;
});

async function putTargets(t, input) {
  const { web, root } = t.context;
  const target = await factory.build('target', { data_type: input });

  let query = await Targets.findOne({ name: target.name });
  t.is(query, null);

  const res = await web.put(`${root}/targets`).send({
    name: target.name,
    description: target.description,
    data_type: target.data_type,
    phase: target.phase
  });

  t.is(res.status, 302);
  t.is(res.header.location, `${root}/targets`);

  query = await Targets.findOne({ name: target.name });
  t.is(query.name, target.name);
  t.is(query.description, target.description);
  t.is(query.data_type, target.data_type);
  t.is(query.phase, target.phase);
}

putTargets.title = (providedTitle = '') =>
  `PUT targets > ${providedTitle} > successfully`.trim();

test('frequency', putTargets, 'Frequency');
test('duration', putTargets, 'Duration');
test('rate', putTargets, 'Rate');

test('PUT targets > task analysis > successfully', async (t) => {
  const { web, root } = t.context;
  const target = await factory.build('target');

  let query = await Targets.findOne({ name: target.name });
  t.is(query, null);

  const res = await web.put(`${root}/targets`).send({
    name: target.name,
    description: target.description,
    data_type: 'Task Analysis',
    ta: ['1', '2', '3'],
    phase: target.phase
  });

  t.is(res.status, 302);
  t.is(res.header.location, `${root}/targets`);

  query = await Targets.findOne({ name: target.name });
  t.is(query.name, target.name);
  t.is(query.description, target.description);
  t.is(query.data_type, 'Task Analysis');
  t.is(query.phase, target.phase);
  t.is(query.ta[0], '1');
  t.is(query.ta[1], '2');
  t.is(query.ta[2], '3');
});

test('POST targets > modifies name, description, and phase', async (t) => {
  const { web, root, program } = t.context;

  const target = await factory.create('target', { program });
  const newTarget = await factory.build('target', { program });

  let query = await Targets.findOne({ name: target.name });
  t.is(query.name, target.name);
  t.is(query.description, target.description);

  const res = await web.post(`${root}/targets/${target.id}`).send({
    name: newTarget.name,
    description: newTarget.description,
    phase: 'Mastered'
  });

  t.is(res.status, 302);
  t.is(res.header.location, `${root}/targets`);

  query = await Targets.findOne({ name: newTarget.name });
  t.is(query.name, newTarget.name);
  t.is(query.description, newTarget.description);
  t.is(query.phase, 'Mastered');
});

test('DELETE targets > successfully', async (t) => {
  const { web, root, program } = t.context;
  const target = await factory.create('target', { program });

  let query = await Targets.findOne({ id: target.id });
  t.is(query.id, target.id);

  const res = await web.delete(`${root}/targets/${target.id}`);

  t.is(res.status, 302);
  t.is(res.header.location, `${root}/targets`);

  query = await Targets.findOne({ id: target.id });
  t.is(query, null);
});

test('PUT targets > task analysis > fails with no steps', async (t) => {
  const { web, root } = t.context;
  const target = await factory.build('target');

  let query = await Targets.findOne({ name: target.name });
  t.is(query, null);

  const res = await web.put(`${root}/targets`).send({
    name: target.name,
    description: target.description,
    data_type: 'Task Analysis',
    ta: [],
    phase: target.phase
  });

  t.is(res.status, 400);
  t.is(JSON.parse(res.text).message, phrases.INVALID_TA_STEPS);

  query = await Targets.findOne({ name: target.name });
  t.is(query, null);
});

test('PUT targets > fails with invalid name', async (t) => {
  const { web, root } = t.context;

  const res = await web.put(`${root}/targets`).send({});

  t.is(res.status, 400);
  t.is(JSON.parse(res.text).message, phrases.INVALID_TARGET_NAME);
});

test('POST targets > task analysis > modifies order of steps', async (t) => {
  const { web, root, program } = t.context;

  const target = await factory.build('target', {
    program,
    data_type: 'Task Analysis',
    ta: ['1', '2', '3']
  });

  await web.put(`${root}/targets`).send({
    name: target.name,
    description: target.description,
    data_type: target.data_type,
    ta: target.ta
  });

  let query = await Targets.findOne({ name: target.name });
  t.is(query.name, target.name);
  t.is(query.ta[0], '1');
  t.is(query.ta[1], '2');
  t.is(query.ta[2], '3');

  const res = await web.post(`${root}/targets/${query.id}`).send({
    name: target.name,
    description: target.description,
    ta: ['3', '1', '2']
  });

  t.is(res.status, 302);
  t.is(res.header.location, `${root}/targets`);

  query = await Targets.findOne({ name: target.name });
  t.is(query.name, target.name);
  t.is(query.ta[0], '3');
  t.is(query.ta[1], '1');
  t.is(query.ta[2], '2');
});
