const test = require('ava');
const { factory } = require('factory-girl');
const prettyMs = require('pretty-ms');
const ms = require('ms');

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
    value: 3,
    target,
    data_type: 'Frequency'
  });

  const newData = await factory.build('data', {
    value: 4,
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
  t.is(query[1].value, Math.round(newData.value - data.value));
});

test('POST data(JSON) > frequency > raw data', async (t) => {
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
    id: data.id,
    data: newData.value
  });

  t.is(res.status, 200);

  query = await Datas.find({
    $and: [{ target: target.id, date: data.date }]
  });
  t.is(query.length, 1);
  t.deepEqual(query[0].date, data.date);
  t.is(query[0].value, newData.value);
});

async function putDuration(t, input, expected) {
  const { web, root, program } = t.context;

  const target = await factory.create('target', {
    program,
    data_type: 'Duration'
  });

  const data = await factory.build('data', {
    target,
    data_type: 'Duration'
  });

  let query = await Datas.findOne({
    $and: [{ target: target.id, date: data.date }]
  });
  t.is(query, null);

  const res = await web.put(`${root}/${target.id}/data`).send({
    date: data.date,
    data: input
  });

  t.is(res.status, 200);

  query = await Datas.findOne({
    $and: [{ target: target.id, date: data.date }]
  });
  t.deepEqual(query.date, data.date);
  t.is(prettyMs(query.value, { colonNotation: true }), expected);
}

test('PUT data(JSON) > duration > seconds', putDuration, '10', '0:10');
test('PUT data(JSON) > duration > minutes', putDuration, '01:10', '1:10');
test('PUT data(JSON) > duration > hours', putDuration, '01:01:10', '1:01:10');

async function postDuration(t, input, expected) {
  const { web, root, program } = t.context;

  const target = await factory.create('target', {
    program,
    data_type: 'Duration'
  });

  const data = await factory.create('data', {
    target,
    data_type: 'Duration'
  });

  let query = await Datas.findOne({
    $and: [{ target: target.id, date: data.date }]
  });
  t.is(query.value, data.value);

  const res = await web.post(`${root}/${target.id}/data`).send({
    id: data.id,
    data: input
  });

  t.is(res.status, 200);

  query = await Datas.find({
    $and: [{ target: target.id, date: data.date }]
  });
  t.is(query.length, 1);
  t.deepEqual(query[0].date, data.date);
  t.is(prettyMs(query[0].value, { colonNotation: true }), expected);
}

test(
  'POST data(JSON) > duration > raw data > seconds',
  postDuration,
  '10',
  '0:10'
);
test(
  'POST data(JSON) > duration > raw data > minutes',
  postDuration,
  '01:10',
  '1:10'
);
test(
  'POST data(JSON) > duration > raw data > hours',
  postDuration,
  '01:01:10',
  '1:01:10'
);

test('PUT data(JSON) > rate', async (t) => {
  const { web, root, program } = t.context;

  const target = await factory.create('target', {
    program,
    data_type: 'Rate'
  });

  const date = new Date(Date.now());

  let query = await Datas.findOne({
    $and: [{ target: target.id, date }]
  });
  t.is(query, null);

  const res = await web.put(`${root}/${target.id}/data`).send({
    date,
    correct: 3,
    incorrect: 4,
    counting_time: '1:00'
  });

  t.is(res.status, 200);

  query = await Datas.findOne({
    $and: [{ target: target.id, date }]
  });
  t.deepEqual(query.date, date);
  t.is(query.value.correct, 3);
  t.is(query.value.incorrect, 4);
  t.is(query.value.counting_time, ms('1m'));
});

test('POST data(JSON) > rate > raw data', async (t) => {
  const { web, root, program } = t.context;

  const target = await factory.create('target', {
    program,
    data_type: 'Rate'
  });

  const data = await factory.create('data', {
    value: {
      correct: 3,
      incorrect: 4,
      counting_time: ms('1m')
    },
    target,
    data_type: 'Rate'
  });

  const value = {
    correct: 4,
    incorrect: 3,
    counting_time: '1:00'
  };

  let query = await Datas.findOne({
    $and: [{ target: target.id, date: data.date }]
  });
  t.is(query.value.correct, data.value.correct);
  t.is(query.value.incorrect, data.value.incorrect);
  t.is(query.value.counting_time, data.value.counting_time);

  const res = await web.post(`${root}/${target.id}/data`).send({
    id: data.id,
    ...value
  });

  t.is(res.status, 200);

  query = await Datas.find({
    $and: [{ target: target.id, date: data.date }]
  });
  t.is(query.length, 1);
  t.deepEqual(query[0].date, data.date);
  t.is(query[0].value.correct, value.correct);
  t.is(query[0].value.incorrect, value.incorrect);
  t.is(query[0].value.counting_time, ms('1m'));
});

test('PUT data(JSON) > percent correct', async (t) => {
  const { web, root, program } = t.context;

  const target = await factory.create('target', {
    program,
    data_type: 'Percent Correct'
  });

  const data = await factory.build('data', {
    value: 'incorrect',
    target,
    data_type: 'Percent Correct'
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

test('POST data(JSON) > percent correct > raw data', async (t) => {
  const { web, root, program } = t.context;

  const target = await factory.create('target', {
    program,
    data_type: 'Percent Correct'
  });

  const data = await factory.create('data', {
    value: 'correct',
    target,
    data_type: 'Percent Correct'
  });

  const newData = await factory.build('data', {
    value: 'incorrect',
    target,
    data_type: 'Percent Correct'
  });

  let query = await Datas.findOne({
    $and: [{ target: target.id, date: data.date }]
  });
  t.is(query.value, data.value);

  const res = await web.post(`${root}/${target.id}/data`).send({
    id: data.id,
    data: newData.value
  });

  t.is(res.status, 200);

  query = await Datas.find({
    $and: [{ target: target.id, date: data.date }]
  });
  t.is(query.length, 1);
  t.deepEqual(query[0].date, data.date);
  t.is(query[0].value, newData.value);
});
