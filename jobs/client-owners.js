// eslint-disable-next-line import/no-unassigned-import
require('../config/env');

const { parentPort } = require('worker_threads');

const Graceful = require('@ladjs/graceful');
const Mongoose = require('@ladjs/mongoose');
const sharedConfig = require('@ladjs/shared-config');

const logger = require('../helpers/logger');
const { Clients } = require('../app/models');

const breeSharedConfig = sharedConfig('BREE');

const mongoose = new Mongoose({ ...breeSharedConfig.mongoose, logger });

const graceful = new Graceful({
  mongooses: [mongoose],
  logger
});

graceful.listen();

(async () => {
  await mongoose.connect();

  // any clients that don't have an owner group need to have one
  const noOwner = await Clients.find({
    $nor: [
      {
        'members.group': 'owner'
      }
    ]
  })
    .populate('members')
    .exec();

  if (noOwner.length > 0) {
    await Promise.all(
      noOwner.map((client) => {
        for (let i = 0; i < client.members.length; i++) {
          if (client.members[i].group === 'admin')
            client.members[i] = {
              user: client.members[i].user,
              group: 'owner'
            };
        }

        return client.save({ validateBeforeSave: false });
      })
    );
  }

  if (parentPort) parentPort.postMessage('done');
  else process.exit(0);
})();
