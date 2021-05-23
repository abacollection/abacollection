const test = require('ava');
const { factory } = require('factory-girl');
const dayjs = require('dayjs');

const config = require('../../../config');
const { Users, Targets } = require('../../../app/models');

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

test('GET(HTML) collection page', async (t) => {
  const { web, root, programs } = t.context;
  const program = programs[0];

  // setup frequency target with data from yesterday
  const percentCorrect = await factory.create('target', {
    program,
    data_type: 'Percent Correct'
  });
  await factory.createMany('data', [
    {
      value: 'correct',
      target: percentCorrect,
      data_type: 'Percent Correct',
      date: dayjs().subtract(2, 'day').toDate()
    },
    {
      value: 'incorrect',
      target: percentCorrect,
      data_type: 'Percent Correct',
      date: dayjs().subtract(1, 'day').toDate()
    },
    {
      value: 'correct',
      target: percentCorrect,
      data_type: 'Percent Correct',
      date: dayjs().subtract(1, 'day').toDate()
    },
    {
      value: 'incorrect',
      target: percentCorrect,
      data_type: 'Percent Correct',
      date: dayjs().toDate()
    }
  ]);

  const res = await web.get(root);

  t.is(res.status, 200);
  t.true(res.text.includes('Previous: 50%'));
  t.true(res.text.includes('Current: 0%'));
});

test('POST collection page > adds data', async (t) => {
  const { web, root, programs } = t.context;
  const program = programs[0];
  const target = await factory.create('target', {
    program,
    data_type: 'Percent Correct'
  });

  let res = await web
    .post(root)
    .set('Accept', 'application/json')
    .send({
      targets: {
        [target.id]: ['correct']
      }
    });

  t.is(res.status, 200);

  let query = await Targets.findOne({ id: target.id }).populate('data').exec();
  t.is(query.data.length, 1);
  t.not(typeof query.data[0].date, undefined);
  t.is(
    dayjs(query.data[0].date).format('MM/DD/YYYY'),
    dayjs().format('MM/DD/YYYY')
  );
  t.is(query.data[0].value, 'correct');

  res = await web
    .post(root)
    .set('Accept', 'application/json')
    .send({
      targets: {
        [target.id]: ['incorrect', 'approximation']
      }
    });

  t.is(res.status, 200);

  t.is(res.body[target._id].percentCorrect.length, 2);

  query = await Targets.findOne({ id: target.id }).populate('data').exec();
  t.is(query.data.length, 2);
  t.not(typeof query.data[0].date, undefined);
  t.is(
    dayjs(query.data[0].date).format('MM/DD/YYYY'),
    dayjs().format('MM/DD/YYYY')
  );
  t.is(query.data[0].value, 'incorrect');
  t.not(typeof query.data[1].date, undefined);
  t.is(
    dayjs(query.data[1].date).format('MM/DD/YYYY'),
    dayjs().format('MM/DD/YYYY')
  );
  t.is(query.data[1].value, 'approximation');
});
