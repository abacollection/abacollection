const test = require('ava');
const { factory } = require('factory-girl');
const dayjs = require('dayjs');
const ms = require('ms');

const config = require('../../config');
const { Users, Targets } = require('../../app/models');
const {
  retrieveTargets
} = require('../../app/controllers/web/data-collection');

const utils = require('../utils');

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

test('GET(HTML) collection page > frequency', async (t) => {
  const { web, root, programs } = t.context;
  const program = programs[0];

  // setup frequency target with data from yesterday
  const frequency = await factory.create('target', {
    program,
    data_type: 'Frequency'
  });
  await factory.createMany('data', [
    {
      value: 1,
      target: frequency,
      data_type: 'Frequency',
      date: dayjs().subtract(2, 'day').toDate()
    },
    {
      value: 1,
      target: frequency,
      data_type: 'Frequency',
      date: dayjs().subtract(1, 'day').toDate()
    },
    {
      value: 1,
      target: frequency,
      data_type: 'Frequency',
      date: dayjs().subtract(1, 'day').toDate()
    },
    {
      value: 1,
      target: frequency,
      data_type: 'Frequency',
      date: dayjs().toDate()
    },
    {
      value: 2,
      target: frequency,
      data_type: 'Frequency',
      date: dayjs().toDate()
    }
  ]);

  const res = await web.get(root);

  t.is(res.status, 200);
  t.true(res.text.includes('Previous: 2'));
  t.true(res.text.includes('Current: 3'));
});

test('GET(HTML) collection page > duration', async (t) => {
  const { web, root, programs } = t.context;
  const program = programs[0];

  // setup frequency target with data from yesterday
  const duration = await factory.create('target', {
    program,
    data_type: 'Duration'
  });
  await factory.createMany('data', [
    {
      value: ms('30s'),
      target: duration,
      data_type: 'Duration',
      date: dayjs().subtract(2, 'day').toDate()
    },
    {
      value: ms('3m'),
      target: duration,
      data_type: 'Duration',
      date: dayjs().subtract(1, 'day').toDate()
    },
    {
      value: ms('2m'),
      target: duration,
      data_type: 'Duration',
      date: dayjs().subtract(1, 'day').toDate()
    },
    {
      value: ms('1m'),
      target: duration,
      data_type: 'Duration',
      date: dayjs().toDate()
    }
  ]);

  const res = await web.get(root);

  t.is(res.status, 200);
  t.true(res.text.includes(`Previous: 1 minute`));
  t.true(res.text.includes('Current: NA'));
});

test('GET(HTML) collection page > percent correct', async (t) => {
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

test('GET(HTML) collection page > rate', async (t) => {
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

test('POST collection page > frequency > adds data', async (t) => {
  const { web, root, programs } = t.context;
  const program = programs[0];
  const target = await factory.create('target', {
    program,
    data_type: 'Frequency'
  });

  const res = await web
    .post(root)
    .set('Accept', 'application/json')
    .send({
      targets: {
        [target.id]: {
          value: 2
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
  t.is(query.data[0].value, 2);
});

test('POST collction page > data is 0, no changes', async (t) => {
  const { web, root, programs } = t.context;
  const program = programs[0];
  const target = await factory.create('target', {
    program,
    data_type: 'Frequency'
  });

  const res = await web
    .post(root)
    .set('Accept', 'application/json')
    .send({
      targets: {
        [target.id]: {
          value: 0
        }
      }
    });

  t.is(res.status, 200);

  const query = await Targets.findOne({ id: target.id })
    .populate('data')
    .exec();
  t.is(query.data.length, 0);
});

test('POST collection page > duration > adds data', async (t) => {
  const { web, root, programs } = t.context;
  const program = programs[0];
  const target = await factory.create('target', {
    program,
    data_type: 'Duration'
  });

  const res = await web
    .post(root)
    .set('Accept', 'application/json')
    .send({
      targets: {
        [target.id]: [{ value: 1000 }]
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
  t.is(query.data[0].value, 1000);
});

test('POST collection page > Percent Correct > adds data', async (t) => {
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

test('POST collection page > Rate > adds data', async (t) => {
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

test('POST collection page > task analysis > adds data', async (t) => {
  const { web, root, programs } = t.context;
  const program = programs[0];
  let target = await factory.create('target', {
    program,
    data_type: 'Task Analysis'
  });
  target = await Targets.findOne({ id: target.id });
  target.ta = ['1', '2', '3'];
  target = await target.save();

  const res = await web
    .post(root)
    .set('Accept', 'application/json')
    .send({
      targets: {
        [target.id]: [
          {
            value: ['correct', 'incorrect', 'correct']
          }
        ]
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
  t.is(query.data[0].value[0], 'correct');
  t.is(query.data[0].value[1], 'incorrect');
  t.is(query.data[0].value[2], 'correct');
});
