const mongoose = require('mongoose');
const mongooseCommonPlugin = require('mongoose-common-plugin');

// <https://github.com/Automattic/mongoose/issues/5534>
mongoose.Error.messages = require('@ladjs/mongoose-error-messages');

const Data = new mongoose.Schema({
  value: { type: Number },
  target: { type: mongoose.Schema.ObjectId, ref: 'Target' },
  created_by: { type: mongoose.Schema.ObjectId, ref: 'User' }
});

Data.plugin(mongooseCommonPlugin, { object: 'data' });

module.exports = mongoose.model('Data', Data);
