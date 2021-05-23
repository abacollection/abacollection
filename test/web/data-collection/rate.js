const test = require('ava');
const { factory } = require('factory-girl');
const dayjs = require('dayjs');
const ms = require('ms');

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
  const rate = await factory.create('target', {
    program,
    data_type: 'Rate'
  });
  await factory.createMany('data', [
    {
      value: {
        correct: 1,
        incorrect: 3,
        counting_time: ms('1m')
      },
      target: rate,
      data_type: 'Rate',
      date: dayjs().subtract(2, 'day').toDate()
    },
    {
      value: {
        correct: 3,
        incorrect: 1,
        counting_time: ms('1m')
      },
      target: rate,
      data_type: 'Rate',
      date: dayjs().subtract(1, 'day').toDate()
    },
    {
      value: {
        correct: 6,
        incorrect: 1,
        counting_time: ms('1m')
      },
      target: rate,
      data_type: 'Rate',
      date: dayjs().subtract(1, 'day').toDate()
    },
    {
      value: {
        correct: 12,
        incorrect: 4,
        counting_time: ms('1m')
      },
      target: rate,
      data_type: 'Rate',
      date: dayjs().toDate()
    }
  ]);

  const res = await web.get(root);

  t.is(res.status, 200);
  t.true(res.text.includes('Previous: 12 correct, 4 incorrect(/min)'));
  t.true(res.text.includes('Current: NA'));
});

test('POST collection page > adds data', async (t) => {
  const { web, root, programs } = t.context;
  const program = programs[0];
  const target = await factory.create('target', {
    program,
    data_type: 'Rate'
  });

  const res = await web
    .post(root)
    .set('Accept', 'application/json')
    .send({
      targets: {
        [target.id]: {
          value: {
            correct: 1,
            incorrect: 2,
            counting_time: 1000
          }
        }
      }
    });

  t.is(res.status, 200);

  const query = await Targets.findOne({ id: target.id })
    .populate('data')
    .exec();
  t.is(query.data.length, 1);
  t.not(typeof query.data[0].date, undefined);
  t.is(
    dayjs(query.data[0].date).format('MM/DD/YYYY'),
    dayjs().format('MM/DD/YYYY')
  );
  t.is(query.data[0].value.correct, 1);
  t.is(query.data[0].value.incorrect, 2);
  t.is(query.data[0].value.counting_time, 1000);
});
