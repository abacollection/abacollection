const mongoose = require('mongoose');
const mongooseCommonPlugin = require('mongoose-common-plugin');

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
  created_by: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
  client: [{ type: mongoose.Schema.ObjectId, ref: 'Client' }],
  targets: [{ type: mongoose.Schema.ObjectId, ref: 'Target' }]
});

Program.plugin(mongooseCommonPlugin, { object: 'program' });

module.exports = mongoose.model('Program', Program);
