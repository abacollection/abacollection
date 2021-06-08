const { factory } = require('factory-girl');
const test = require('ava');

const { Users, Programs } = require('../../../../app/models');
const config = require('../../../../config');
const phrases = require('../../../../config/phrases');
const utils = require('../../../utils');

test.before(utils.setupMongoose);
test.before(utils.defineUserFactory);
test.before(utils.defineClientFactory);
test.before(utils.defineProgramFactory);

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

  t.context.root = `/en/dashboard/clients/${t.context.client.id}`;
});

test('PUT dashboard/clients/programs > successfully', async (t) => {
  const { web, root } = t.context;
  const program = await factory.build('program');

  let query = await Programs.findOne({ name: program.name });
  t.is(query, null);

  const res = await web.put(`${root}/programs`).send({
    name: program.name,
    description: program.description
  });

  t.is(res.status, 302);
  t.is(res.header.location, `${root}/programs`);

  query = await Programs.findOne({ name: program.name });
  t.true(
    query.name === program.name && query.description === program.description
  );
});

test('DELETE dashboard/clients/programs > successfully', async (t) => {
  const { web, client, root } = t.context;

  const program = await factory.create('program', { client });

  let query = await Programs.findOne({ id: program.id });
  t.is(query.id, program.id);

  const res = await web.delete(`${root}/programs/${program.id}`);

  t.is(res.status, 302);
  t.is(res.header.location, `${root}/programs`);

  query = await Programs.findOne({ id: program.id });
  t.is(query, null);
});

test('POST dashboard/clients/program > modifies name and description', async (t) => {
  const { web, user } = t.context;
  const member = await factory.create('member', { user, group: 'admin' });
  const client = await factory.create('client', { members: member });

  const program = await factory.create('program', { client });
  const newProgram = await factory.build('program', { client });

  let query = await Programs.findOne({ name: program.name });
  t.is(query.name, program.name);
  t.is(query.description, program.description);

  const res = await web
    .post(`/en/dashboard/clients/${client.id}/programs/${program.id}`)
    .send({
      name: newProgram.name,
      description: newProgram.description
    });

  t.is(res.status, 302);
  t.is(res.header.location, `/en/dashboard/clients/${client.id}/programs`);

  query = await Programs.findOne({ name: newProgram.name });
  t.is(query.name, newProgram.name);
  t.is(query.description, newProgram.description);
});

test('PUT dashboard/clients/programs > fails with no name', async (t) => {
  const { web, root } = t.context;
  const program = await factory.build('program');

  let query = await Programs.findOne({ name: program.name });
  t.is(query, null);

  const res = await web.put(`${root}/programs`);

  t.is(res.status, 400);
  t.is(JSON.parse(res.text).message, phrases.INVALID_PROGRAM_NAME);

  query = await Programs.findOne({ name: program.name });
  t.is(query, null);
});
