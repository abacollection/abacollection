const test = require('ava');
const { factory } = require('factory-girl');
const dayjs = require('dayjs');
const ms = require('ms');

const config = require('../../../config');
const { Users, Targets } = require('../../../app/models');
const {
  retrieveTargets,
  retrieveTarget
} = require('../../../app/controllers/web/dashboard/targets');

const phrases = require('../../../config/phrases');

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

  t.context.root = `/en/dashboard/clients/${t.context.client.id}/programs/${t.context.program.id}`;
});

test('retrieveTargets > get targets only linked to program', async (t) => {
  t.plan(2);

  const { program } = t.context;
  const targets = await factory.createMany('target', [{ program }, {}]);

  const ctx = {
    state: {
      program
    }
  };

  await retrieveTargets(ctx, () => {
    t.is(ctx.state.targets.length, 1);
    t.is(ctx.state.targets[0].id, targets[0].id);
  });
});

test('retrieveTarget > get target', async (t) => {
  t.plan(2);

  const targets = await factory.createMany('target', 2);

  const ctx = {
    params: { target_id: targets[0].id },
    state: {
      targets,
      program: targets[0].program,
      breadcrumbs: [targets[0].id],
      client: { id: '32' },
      l: (url) => `/en${url}`
    }
  };

  await retrieveTarget(ctx, () => {
    t.is(ctx.state.target.id, targets[0].id);
    t.is(ctx.state.breadcrumbs[0].name, targets[0].name);
  });
});

test('retrieveTarget > errors if no params', async (t) => {
  const targets = await factory.createMany('target', 2);

  const ctx = {
    params: { target_id: '' },
    request: {
      body: { target: '' }
    },
    state: { targets },
    translateError: (err) => err,
    throw: (err) => {
      throw err;
    }
  };

  await t.throwsAsync(() => retrieveTarget(ctx, () => {}), {
    message: 'TARGET_DOES_NOT_EXIST'
  });
});

test('retrieveTarget > errors if target does not exist', async (t) => {
  const ctx = {
    params: { target_id: '1' },
    state: { targets: [] },
    translateError: (err) => err,
    throw: (err) => {
      throw err;
    }
  };

  await t.throwsAsync(() => retrieveTarget(ctx, () => {}), {
    message: 'TARGET_DOES_NOT_EXIST'
  });
});

test('GET targets > successfully with no targets', async (t) => {
  const { web, root } = t.context;

  const res = await web.get(`${root}/targets`);

  t.is(res.status, 200);
  t.true(res.text.includes('No targets for this client yet.'));
});

test('GET targets > successfully with targets', async (t) => {
  const { web, root, program } = t.context;

  const target = await factory.create('target', { program });

  const res = await web.get(`${root}/targets`);

  t.is(res.status, 200);
  t.true(res.text.includes(target.name));
});

async function putTargets(t, input) {
  const { web, root } = t.context;
  const target = await factory.build('target', { data_type: input });

  let query = await Targets.findOne({ name: target.name });
  t.is(query, null);

  const res = await web.put(`${root}/targets`).send({
    name: target.name,
    description: target.description,
    data_type: target.data_type
  });

  t.is(res.status, 302);
  t.is(res.header.location, `${root}/targets`);

  query = await Targets.findOne({ name: target.name });
  t.is(query.name, target.name);
  t.is(query.description, target.description);
  t.is(query.data_type, target.data_type);
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
    ta: ['1', '2', '3']
  });

  t.is(res.status, 302);
  t.is(res.header.location, `${root}/targets`);

  query = await Targets.findOne({ name: target.name });
  t.is(query.name, target.name);
  t.is(query.description, target.description);
  t.is(query.data_type, 'Task Analysis');
  t.is(query.ta[0], '1');
  t.is(query.ta[1], '2');
  t.is(query.ta[2], '3');
});

test('PUT targets > fails with invalid name', async (t) => {
  const { web, root } = t.context;

  const res = await web.put(`${root}/targets`).send({});

  t.is(res.status, 400);
  t.is(JSON.parse(res.text).message, phrases.INVALID_TARGET_NAME);
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

test('DELETE targets > fails if target does not exist', async (t) => {
  const { web, root } = t.context;

  const res = await web.delete(`${root}/targets/1`);

  t.is(res.status, 400);
  t.is(JSON.parse(res.text).message, phrases.TARGET_DOES_NOT_EXIST);
});

test('DELETE targets > fails if not admin', async (t) => {
  const { web, user } = t.context;

  const member = await factory.create('member', { user, group: 'user' });
  const client = await factory.create('client', { members: member });
  const program = await factory.create('program', { client });
  const target = await factory.create('target', { program });

  let query = await Targets.findOne({ id: target.id });
  t.is(query.id, target.id);

  const res = await web.delete(
    `/en/dashboard/clients/${client.id}/programs/${program.id}/targets/${target.id}`
  );

  t.is(res.status, 400);
  t.is(JSON.parse(res.text).message, phrases.IS_NOT_ADMIN);

  query = await Targets.findOne({ id: target.id });
  t.is(query.id, target.id);
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

test('POST targets > modifies name and description', async (t) => {
  const { web, root, program } = t.context;

  const target = await factory.create('target', { program });
  const newTarget = await factory.build('target', { program });

  let query = await Targets.findOne({ name: target.name });
  t.is(query.name, target.name);
  t.is(query.description, target.description);

  const res = await web.post(`${root}/targets/${target.id}`).send({
    name: newTarget.name,
    description: newTarget.description
  });

  t.is(res.status, 302);
  t.is(res.header.location, `${root}/targets`);

  query = await Targets.findOne({ name: newTarget.name });
  t.is(query.name, newTarget.name);
  t.is(query.description, newTarget.description);
});

test('GET data(JSON) > frequency > default', async (t) => {
  t.plan(14);

  const { web, root, program } = t.context;

  const target = await factory.create('target', {
    program,
    data_type: 'Frequency'
  });
  const datas = [];
  for (let i = 0; i < 10; i++) {
    datas.push(
      factory.create('data', {
        value: 1,
        target,
        date: dayjs().subtract(i, 'day').toDate(),
        data_type: 'Frequency'
      })
    );
  }

  datas.push(
    factory.create('data', {
      value: 1,
      target,
      date: dayjs().subtract(1, 'day').toDate(),
      data_type: 'Frequency'
    })
  );

  await Promise.all(datas);

  const res = await web
    .get(`${root}/targets/${target.id}/graph`)
    .set('Accept', 'application/json')
    .send();

  t.is(res.status, 200);
  t.is(res.body.series[0].data.length, 10);
  t.is(res.body.xaxisTitle, 'Date');
  t.is(res.body.yaxisTitle, 'Count per Day');

  for (let i = 0; i < 10; i++) {
    const data = res.body.series[0].data[i];
    t.is(data.y, i === 8 ? 2 : 1);
  }
});

test('GET data(JSON) > frequency > monthly', async (t) => {
  t.plan(5);

  const { web, root, program } = t.context;

  const target = await factory.create('target', {
    program,
    data_type: 'Frequency'
  });
  const datas = [];
  for (let i = 0; i < 10; i++) {
    datas.push(
      factory.create('data', {
        value: 1,
        target,
        date: dayjs('5/15/2020').subtract(i, 'day').toDate(),
        data_type: 'Frequency'
      })
    );
  }

  datas.push(
    factory.create('data', {
      value: 1,
      target,
      date: dayjs('5/15/2020').subtract(1, 'day').toDate(),
      data_type: 'Frequency'
    })
  );

  await Promise.all(datas);

  const res = await web
    .get(`${root}/targets/${target.id}/graph?interval=M`)
    .set('Accept', 'application/json')
    .send();

  t.is(res.status, 200);
  t.is(res.body.series[0].data.length, 1);
  t.is(res.body.xaxisTitle, 'Date');
  t.is(res.body.yaxisTitle, 'Count per Day');

  t.is(res.body.series[0].data[0].y, 11);
});

test('GET data(JSON) > percent correct > default', async (t) => {
  t.plan(15);

  const { web, root, program } = t.context;

  const target = await factory.create('target', {
    program,
    data_type: 'Percent Correct'
  });
  const datas = [];
  for (let i = 0; i < 10; i++) {
    datas.push(
      factory.create('data', {
        value: 'correct',
        target,
        date: dayjs().subtract(i, 'day').toDate(),
        data_type: 'Percent Correct'
      })
    );
  }

  datas.push(
    factory.create('data', {
      value: 'incorrect',
      target,
      date: dayjs().subtract(1, 'day').toDate(),
      data_type: 'Percent Correct'
    })
  );

  await Promise.all(datas);

  const res = await web
    .get(`${root}/targets/${target.id}/graph`)
    .set('Accept', 'application/json')
    .send();

  t.is(res.status, 200);
  t.is(res.body.series[0].data.length, 10);
  t.is(res.body.xaxisTitle, 'Date');
  t.is(res.body.yaxisTitle, 'Percent Correct per Day');
  t.is(res.body.yaxisMax, 100);

  for (let i = 0; i < 10; i++) {
    const data = res.body.series[0].data[i];
    t.is(data.y, i === 8 ? 50 : 100);
  }
});

test('GET data(JSON) > duration > default', async (t) => {
  t.plan(14);

  const { web, root, program } = t.context;

  const target = await factory.create('target', {
    program,
    data_type: 'Duration'
  });
  const datas = [];
  for (let i = 0; i < 10; i++) {
    datas.push(
      factory.create('data', {
        value: ms('1 min'),
        target,
        date: dayjs().subtract(i, 'day').toDate(),
        data_type: 'Duration'
      })
    );
  }

  datas.push(
    factory.create('data', {
      value: ms('1 min'),
      target,
      date: dayjs().subtract(1, 'day').toDate(),
      data_type: 'Duration'
    })
  );

  await Promise.all(datas);

  const res = await web
    .get(`${root}/targets/${target.id}/graph`)
    .set('Accept', 'application/json')
    .send();

  t.is(res.status, 200);
  t.is(res.body.series[0].data.length, 10);
  t.is(res.body.xaxisTitle, 'Date');
  t.is(res.body.yaxisTitle, 'Duration(mins) per Day');

  for (let i = 0; i < 10; i++) {
    const data = res.body.series[0].data[i];
    t.is(data.y, i === 8 ? 2 : 1);
  }
});

test('GET data(JSON) > rate > default', async (t) => {
  t.plan(28);

  const { web, root, program } = t.context;

  const target = await factory.create('target', {
    program,
    data_type: 'Rate'
  });
  const datas = [];
  for (let i = 0; i < 10; i++) {
    datas.push(
      factory.create('data', {
        value: { correct: 1, incorrect: 1, counting_time: ms('1m') },
        target,
        date: dayjs().subtract(i, 'day').toDate(),
        data_type: 'Rate'
      })
    );
  }

  datas.push(
    factory.create('data', {
      value: { correct: 2, incorrect: 2, counting_time: ms('1m') },
      target,
      date: dayjs().subtract(1, 'day').toDate(),
      data_type: 'Rate'
    })
  );

  await Promise.all(datas);

  const res = await web
    .get(`${root}/targets/${target.id}/graph`)
    .set('Accept', 'application/json')
    .send();

  t.is(res.status, 200);
  t.is(res.body.series.length, 2);
  t.is(res.body.series[0].data.length, 10);
  t.is(res.body.series[1].data.length, 10);
  t.is(res.body.xaxisTitle, 'Date');
  t.is(res.body.yaxisTitle, 'Count per Minute (first)');

  // check that series was named
  t.is(res.body.series[0].name, 'Correct');
  t.is(res.body.series[1].name, 'Incorrect');

  for (let i = 0; i < 10; i++) {
    let data = res.body.series[0].data[i];
    t.is(data.y, 1);

    data = res.body.series[1].data[i];
    t.is(data.y, 1);
  }
});
