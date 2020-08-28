const test = require('ava');
const { factory } = require('factory-girl');

const config = require('../../../config');
const { Users, Datas } = require('../../../app/models');

// const phrases = require('../../../config/phrases');

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
  t.context.program = await factory.create('program', {
    client: t.context.client
  });

  t.context.root = `/en/dashboard/clients/${t.context.client.id}/programs/${t.context.program.id}/targets`;
});

test('PUT data(JSON) > frequency', async (t) => {
  const { web, root, program } = t.context;

  const target = await factory.create('target', {
    program,
    data_type: 'Frequency'
  });

  const data = await factory.build('data', {
    target,
    data_type: 'Frequency'
  });

  let query = await Datas.findOne({
    $and: [{ target: target.id, date: data.date }]
  });
  t.is(query, null);

  const res = await web.put(`${root}/${target.id}/data`).send({
    date: data.date,
    data: data.value
  });

  t.is(res.status, 200);

  query = await Datas.findOne({
    $and: [{ target: target.id, date: data.date }]
  });
  t.deepEqual(query.date, data.date);
  t.is(query.value, data.value);
});

test('POST data(JSON) > frequency', async (t) => {
  const { web, root, program } = t.context;

  const target = await factory.create('target', {
    program,
    data_type: 'Frequency'
  });

  const data = await factory.create('data', {
    target,
    data_type: 'Frequency'
  });

  const newData = await factory.build('data', {
    target,
    data_type: 'Frequency'
  });

  let query = await Datas.findOne({
    $and: [{ target: target.id, date: data.date }]
  });
  t.is(query.value, data.value);

  const res = await web.post(`${root}/${target.id}/data`).send({
    date: data.date,
    data: newData.value,
    origData: data.value
  });

  t.is(res.status, 200);

  query = await Datas.find({
    $and: [{ target: target.id, date: data.date }]
  });
  t.is(query.length, 2);
  t.deepEqual(query[0].date, data.date);
  t.is(query[0].value, data.value);
  t.deepEqual(query[1].date, data.date);
  t.is(query[1].value, Math.trunc(newData.value - data.value));
});
