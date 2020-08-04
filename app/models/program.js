const mongoose = require('mongoose');
const mongooseCommonPlugin = require('mongoose-common-plugin');

const Targets = require('./target');

// <https://github.com/Automattic/mongoose/issues/5534>
mongoose.Error.messages = require('@ladjs/mongoose-error-messages');

const Program = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    index: true
  },
  description: {
    type: String
  },
  creation_date: {
    type: Date,
    required: true
  },
  created_by: { type: mongoose.Schema.ObjectId, ref: 'User' },
  client: { type: mongoose.Schema.ObjectId, ref: 'Client' }
});

Program.plugin(mongooseCommonPlugin, { object: 'program' });

// remove targets when program is removed
Program.post('findOneAndRemove', async function() {
  const targets = await Targets.find(
    {
      $or: [{ program: this.getQuery()._id }]
    },
    '_id'
  )
    .lean()
    .exec();

  targets.forEach(async target => {
    await Targets.findByIdAndRemove(target._id);
  });
});

module.exports = mongoose.model('Program', Program);
