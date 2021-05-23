// Necessary utils for testing
// Librarires required for testing
const MongodbMemoryServer = require('mongodb-memory-server').default;
const mongoose = require('mongoose');
const request = require('supertest');
const { factory, MongooseAdapter } = require('factory-girl');
const getPort = require('get-port');

factory.setAdapter(new MongooseAdapter());

// Models and server
const config = require('../config');
const { Users, Clients, Programs, Targets, Datas } = require('../app/models');
const Member = mongoose.model('Member', Clients.Member);

const mongod = new MongodbMemoryServer();

//
// setup utilities
//
exports.setupMongoose = async () => {
  const uri = await mongod.getConnectionString();
  await mongoose.connect(uri);
};

exports.setupWebServer = async (t) => {
  // must require here in order to load changes made during setup
  process.env.WEB_RATELIMIT_MAX = 500;
  const { app } = require('../web');
  const port = await getPort();
  t.context.web = request.agent(app.listen(port));
};

exports.setupApiServer = async (t) => {
  // must require here in order to load changes made during setup
  const { app } = require('../api');
  const port = await getPort();
  t.context.api = request.agent(app.listen(port));
};

// make sure to load the web server first using setupWebServer
exports.loginUser = async (t) => {
  const { web, user, password } = t.context;

  await web.post('/en/login').send({
    email: user.email,
    password
  });
};

//
// teardown utilities
//
exports.teardownMongoose = async () => {
  await mongoose.disconnect();
  mongod.stop();
};

//
// factory definitions
// <https://github.com/simonexmachina/factory-girl>
//
exports.defineUserFactory = async () => {
  factory.define('user', Users, (buildOptions) => {
    const user = {
      email: factory.sequence('Users.email', (n) => `test${n}@example.com`),
      password: buildOptions.password ? buildOptions.password : '!@K#NLK!#N'
    };

    if (buildOptions.resetToken) {
      user[config.userFields.resetToken] = buildOptions.resetToken;
      user[config.userFields.resetTokenExpiresAt] = new Date(
        Date.now() + 10000
      );
    }

    return user;
  });
};

exports.defineClientFactory = async () => {
  // setup members factory
  factory.define('member', Member, (buildOptions) => {
    return {
      user: buildOptions.user
        ? buildOptions.user
        : factory.assoc('user', '_id'),
      group: buildOptions.group
        ? buildOptions.group
        : factory.chance('pickone', ['admin', 'user'])
    };
  });

  // setup client factory
  factory.define('client', Clients, (buildOptions) => {
    return {
      first_name: factory.chance('first'),
      last_name: factory.chance('last'),
      dob: factory.chance('birthday'),
      gender: factory.chance('gender'),
      creation_date: new Date(Date.now()),
      members: buildOptions.members
        ? buildOptions.members
        : factory.assocMany('member', 2, '_id')
    };
  });
};

exports.defineProgramFactory = async () => {
  // setup program factory
  factory.define('program', Programs, (buildOptions) => {
    return {
      name: factory.chance('word'),
      description: factory.chance('sentence'),
      creation_date: new Date(Date.now()),
      client: buildOptions.client
        ? buildOptions.client
        : factory.assoc('client', '_id')
    };
  });
};

exports.defineTargetFactory = async () => {
  // setup target factory
  factory.define('target', Targets, (buildOptions) => {
    return {
      name: factory.chance('word'),
      data_type: 'Frequency',
      description: factory.chance('sentence'),
      phase: 'Intervention',
      program: buildOptions.program
        ? buildOptions.program
        : factory.assoc('program', '_id')
    };
  });
};

exports.defineDataFactory = async () => {
  factory.define('data', Datas, (buildOptions) => {
    return {
      value: factory.chance('floating', { min: 0, max: 100 }),
      target: buildOptions.target
        ? buildOptions.target
        : factory.assoc('target', '_id'),
      date: factory.chance('date')
    };
  });
};
