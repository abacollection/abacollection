const test = require('ava');
const { factory } = require('factory-girl');

const config = require('../../../config');
const { Users, Programs } = require('../../../app/models');
const {
  retrievePrograms,
  retrieveProgram
} = require('../../../app/controllers/web').dashboard.programs;

const phrases = require('../../../config/phrases');

const utils = require('../../utils');

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

test('retrievePrograms > get programs only linked to the client', async (t) => {
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
});

test('retrieveProgram > get program', async (t) => {
  t.plan(2);

  const programs = await factory.createMany('program', 2);

  const ctx = {
    params: { program_id: programs[0].id },
    state: {
      programs,
      breadcrumbs: [programs[0].id],
      client: { id: '32' },
      l: (url) => `/en${url}`
    }
  };

  await retrieveProgram(ctx, () => {
    t.is(ctx.state.program.id, programs[0].id);
    t.is(ctx.state.breadcrumbs[0].name, programs[0].name);
  });
});

test('retrieveProgram > errors if no params', async (t) => {
  const programs = await factory.createMany('program', 2);

  const ctx = {
    params: { program_id: '' },
    request: {
      body: { program: '' }
    },
    state: { programs },
    translateError: (err) => err,
    throw: (err) => {
      throw new Error(err);
    }
  };

  await t.throwsAsync(() => retrieveProgram(ctx, () => {}), {
    message: 'Error: PROGRAM_DOES_NOT_EXIST'
  });
});

test('retrieveProgram > errors if program does not exist', async (t) => {
  const ctx = {
    params: { program_id: '1' },
    state: { programs: [] },
    translateError: (err) => err,
    throw: (err) => {
      throw err;
    }
  };

  await t.throwsAsync(() => retrieveProgram(ctx, () => {}), {
    message: 'PROGRAM_DOES_NOT_EXIST'
  });
});

test('GET dashboard/clients/programs > successfully with no programs', async (t) => {
  const { web, root } = t.context;

  const res = await web.get(`${root}/programs`);

  t.is(res.status, 200);
  t.true(res.text.includes('No programs for this client yet.'));
});

test('GET dashboard/clients/programs > successfully with programs', async (t) => {
  const { web, client, root } = t.context;
  const program = await factory.create('program', { client });

  const res = await web.get(`${root}/programs`);

  t.is(res.status, 200);
  t.true(res.text.includes(program.name));
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

test('DELETE dashboard/clients/programs > fails if program does not exist', async (t) => {
  const { web, root } = t.context;

  const res = await web.delete(`${root}/programs/1`);

  t.is(res.status, 400);
  t.is(JSON.parse(res.text).message, phrases.PROGRAM_DOES_NOT_EXIST);
});

test('DELETE dashboard/clients/programs > fails if user is not admin', async (t) => {
  const { web, user } = t.context;

  const member = await factory.create('member', { user, group: 'user' });
  const client = await factory.create('client', { members: member });
  const program = await factory.create('program', { client });

  let query = await Programs.findOne({ id: program.id });
  t.is(query.id, program.id);

  const res = await web.delete(
    `/en/dashboard/clients/${client.id}/programs/${program.id}`
  );

  t.is(res.status, 400);
  t.is(JSON.parse(res.text).message, phrases.IS_NOT_ADMIN);

  query = await Programs.findOne({ id: program.id });
  t.is(query.id, program.id);
});

test('deletes program when client deleted', async (t) => {
  const { web, client } = t.context;

  await factory.createMany('program', 2, { client });

  let query = await Programs.find({ $or: [{ client: client._id }] });
  t.is(query.length, 2);

  const res = await web.delete(`/en/dashboard/clients/${client.id}`);

  t.is(res.status, 302);
  t.is(res.header.location, '/en/dashboard/clients');

  query = await Programs.find({ $or: [{ client: client._id }] });
  t.is(query.length, 0);
});

test('POST dashboard/clients/program > modifies name and description', async (t) => {
  const { web, client } = t.context;

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
