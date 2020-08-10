const mongoose = require('mongoose');
const mongooseCommonPlugin = require('mongoose-common-plugin');

// <https://github.com/Automattic/mongoose/issues/5534>
mongoose.Error.messages = require('@ladjs/mongoose-error-messages');

// discrimanator key
const options = { discriminatorKey: 'data_type' };

const dataSchema = new mongoose.Schema(
  {
    target: { type: mongoose.Schema.ObjectId, ref: 'Target' },
    created_by: { type: mongoose.Schema.ObjectId, ref: 'User' }
  },
  options
);

dataSchema.plugin(mongooseCommonPlugin, { object: 'data' });

const Data = mongoose.model('Data', dataSchema);

//
// Frequency model
//
const frequencySchema = new mongoose.Schema(
  {
    value: { type: Number }
  },
  options
);

Data.discriminator('Frequency', frequencySchema);

module.exports = Data;
