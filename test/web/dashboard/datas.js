const test = require('ava');
const { factory } = require('factory-girl');
const prettyMs = require('pretty-ms');
const ms = require('ms');
const dayjs = require('dayjs');
dayjs.extend(require('dayjs/plugin/utc'));
dayjs.extend(require('dayjs/plugin/timezone'));

const config = require('../../../config');
const { Users, Datas, Targets } = require('../../../app/models');

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

  let query = await Datas.findOne({ target: target.id });
  t.is(query, null);

  const res = await web.put(`${root}/${target.id}/data`).send({
    date: dayjs(data.date).format('YYYY-MM-DDThh:mm'),
    data: data.value.toString(),
    add_data: 'true'
  });

  t.is(res.status, 200);

  query = await Datas.findOne({ target: target.id });
  t.is(
    dayjs(query.date).format('YYYY-MM-DDThh:mm'),
    dayjs(data.date).format('YYYY-MM-DDThh:mm')
  );
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

  let query = await Datas.findOne({ target: target.id });
  t.is(query.value, data.value);

  const res = await web.post(`${root}/${target.id}/data`).send({
    date: data.date.toISOString(),
    data: newData.value.toString(),
    origData: data.value.toString(),
    edit_data: 'true',
    timezone: 'UTC'
  });

  t.is(res.status, 200);

  query = await Datas.find({ target: target.id });
  t.is(query.length, 2);
  t.is(
    dayjs(query[0].date).format('YYYY-MM-DDThh:mm'),
    dayjs(data.date).format('YYYY-MM-DDThh:mm')
  );
  t.is(query[0].value, data.value);
  t.is(
    dayjs(query[1].date).format('YYYY-MM-DDThh:mm'),
    dayjs(data.date).format('YYYY-MM-DDThh:mm')
  );
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

  let query = await Datas.findOne({ target: target.id });
  t.is(query.value, data.value);

  const res = await web.post(`${root}/${target.id}/data`).send({
    id: data.id,
    data: newData.value.toString(),
    edit_raw_data: 'true',
    timezone: 'America/New_York'
  });

  t.is(res.status, 200);

  query = await Datas.find({ target: target.id });
  t.is(query.length, 1);
  t.is(
    dayjs(query[0].date).format('YYYY-MM-DDThh:mm'),
    dayjs(data.date).format('YYYY-MM-DDThh:mm')
  );
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

  let query = await Datas.findOne({ target: target.id });
  t.is(query, null);

  const res = await web.put(`${root}/${target.id}/data`).send({
    date: dayjs(data.date).format('YYYY-MM-DDThh:mm'),
    data: input,
    add_data: 'true',
    timezone: 'America/New_York'
  });

  t.is(res.status, 200);

  query = await Datas.findOne({ target: target.id });
  t.is(
    dayjs(query.date).format('YYYY-MM-DDThh:mm'),
    dayjs(data.date).format('YYYY-MM-DDThh:mm')
  );
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

  let query = await Datas.findOne({ target: target.id });
  t.is(query.value, data.value);

  const res = await web.post(`${root}/${target.id}/data`).send({
    id: data.id,
    data: input,
    edit_raw_data: 'true',
    timezone: 'America/New_York'
  });

  t.is(res.status, 200);

  query = await Datas.find({ target: target.id });
  t.is(query.length, 1);
  t.is(
    dayjs(query[0].date).format('YYYY-MM-DDThh:mm'),
    dayjs(data.date).format('YYYY-MM-DDThh:mm')
  );
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

  let query = await Datas.findOne({ target: target.id });
  t.is(query, null);

  const res = await web.put(`${root}/${target.id}/data`).send({
    date: dayjs(date).format('YYYY-MM-DDThh:mm'),
    correct: '3',
    incorrect: '4',
    counting_time: '1:00',
    add_data: 'true',
    timezone: 'America/New_York'
  });

  t.is(res.status, 200);

  query = await Datas.findOne({ target: target.id });
  t.is(
    dayjs(query.date).format('YYYY-MM-DDThh:mm'),
    dayjs(date).format('YYYY-MM-DDThh:mm')
  );
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
    correct: '4',
    incorrect: '3',
    counting_time: '1:00'
  };

  let query = await Datas.findOne({ target: target.id });
  t.is(query.value.correct, data.value.correct);
  t.is(query.value.incorrect, data.value.incorrect);
  t.is(query.value.counting_time, data.value.counting_time);

  const res = await web.post(`${root}/${target.id}/data`).send({
    id: data.id,
    ...value,
    edit_raw_data: 'true',
    timezone: 'America/New_York'
  });

  t.is(res.status, 200);

  query = await Datas.find({ target: target.id });
  t.is(query.length, 1);
  t.is(
    dayjs(query[0].date).format('YYYY-MM-DDThh:mm'),
    dayjs(data.date).format('YYYY-MM-DDThh:mm')
  );
  t.is(query[0].value.correct, Number.parseInt(value.correct, 10));
  t.is(query[0].value.incorrect, Number.parseInt(value.incorrect, 10));
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

  let query = await Datas.findOne({ target: target.id });
  t.is(query, null);

  const res = await web.put(`${root}/${target.id}/data`).send({
    date: dayjs(data.date).format('YYYY-MM-DDThh:mm'),
    data: data.value.toString(),
    add_data: 'true',
    timezone: 'America/New_York'
  });

  t.is(res.status, 200);

  query = await Datas.findOne({ target: target.id });
  t.is(
    dayjs(query.date).format('YYYY-MM-DDThh:mm'),
    dayjs(data.date).format('YYYY-MM-DDThh:mm')
  );
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

  let query = await Datas.findOne({ target: target.id });
  t.is(query.value, data.value);

  const res = await web.post(`${root}/${target.id}/data`).send({
    id: data.id,
    data: newData.value.toString(),
    edit_raw_data: 'true',
    timezone: 'America/New_York'
  });

  t.is(res.status, 200);

  query = await Datas.find({ target: target.id });
  t.is(query.length, 1);
  t.is(
    dayjs(query[0].date).format('YYYY-MM-DDThh:mm'),
    dayjs(data.date).format('YYYY-MM-DDThh:mm')
  );
  t.is(query[0].value, newData.value);
});

test('PUT data(JSON) > task analysis', async (t) => {
  const { web, root, program } = t.context;

  let target = await factory.build('target', {
    program,
    data_type: 'Task Analysis',
    ta: ['1', '2', '3']
  });

  await web.put(`${root}`).send({
    name: target.name,
    description: target.description,
    data_type: target.data_type,
    ta: target.ta
  });

  target = await Targets.findOne({ name: target.name });

  const data = await factory.build('data', {
    value: ['incorrect', 'correct', 'incorrect'],
    target,
    data_type: 'Task Analysis'
  });

  let query = await Datas.findOne({ target: target.id });
  t.is(query, null);

  const res = await web.put(`${root}/${target.id}/data`).send({
    date: dayjs(data.date).format('YYYY-MM-DDThh:mm'),
    data: data.value,
    add_data: 'true',
    timezone: 'America/New_York'
  });

  t.is(res.status, 200);

  query = await Datas.findOne({ target: target.id });
  t.is(
    dayjs(query.date).format('YYYY-MM-DDThh:mm'),
    dayjs(data.date).format('YYYY-MM-DDThh:mm')
  );
  t.is(query.value[0], data.value[0]);
  t.is(query.value[1], data.value[1]);
  t.is(query.value[2], data.value[2]);
});

test('POST data(JSON) > task analysis > raw data', async (t) => {
  const { web, root, program } = t.context;

  let target = await factory.build('target', {
    program,
    data_type: 'Task Analysis',
    ta: ['1', '2', '3']
  });

  await web.put(`${root}`).send({
    name: target.name,
    description: target.description,
    data_type: target.data_type,
    ta: target.ta
  });

  target = await Targets.findOne({ name: target.name });

  const data = await factory.create('data', {
    value: ['correct', 'correct', 'correct'],
    target,
    data_type: 'Task Analysis'
  });

  const newData = await factory.build('data', {
    value: ['incorrect', 'correct', 'correct'],
    target,
    data_type: 'Task Analysis'
  });

  let query = await Datas.findOne({ target: target.id });
  t.is(query.value[0], data.value[0]);
  t.is(query.value[1], data.value[1]);
  t.is(query.value[2], data.value[2]);

  const res = await web.post(`${root}/${target.id}/data`).send({
    id: data.id,
    data: newData.value,
    edit_raw_data: 'true',
    timezone: 'America/New_York'
  });

  t.is(res.status, 200);

  query = await Datas.find({ target: target.id });
  t.is(query.length, 1);
  t.is(
    dayjs(query[0].date).format('YYYY-MM-DDThh:mm'),
    dayjs(data.date).format('YYYY-MM-DDThh:mm')
  );
  t.is(query[0].value[0], newData.value[0]);
  t.is(query[0].value[1], newData.value[1]);
  t.is(query[0].value[2], newData.value[2]);
});
