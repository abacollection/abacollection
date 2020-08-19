const mongoose = require('mongoose');
const mongooseCommonPlugin = require('mongoose-common-plugin');

// <https://github.com/Automattic/mongoose/issues/5534>
mongoose.Error.messages = require('@ladjs/mongoose-error-messages');

// discrimanator key
const options = { discriminatorKey: 'data_type' };

const dataSchema = new mongoose.Schema(
  {
    target: { type: mongoose.Schema.ObjectId, ref: 'Target' },
    created_by: { type: mongoose.Schema.ObjectId, ref: 'User' },
    date: { type: Date }
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
    value: { type: Number, required: true }
  },
  options
);

Data.discriminator('Frequency', frequencySchema);

//
// Duration model
//
const durationSchema = new mongoose.Schema(
  {
    value: { type: Number, required: true } // value is in milliseconds
  },
  options
);

Data.discriminator('Duration', durationSchema);

//
// Percent Correct model
//
const percentCorrectSchema = new mongoose.Schema(
  {
    value: { type: String, required: true }
  },
  options
);

Data.discriminator('Percent Correct', percentCorrectSchema);

//
// Rate model
//
const rateSchema = new mongoose.Schema(
  {
    value: {
      correct: { type: Number, required: true },
      incorrect: { type: Number, required: true },
      counting_time: { type: Number, required: true } // in milliseconds
    }
  },
  options
);

Data.discriminator('Rate', rateSchema);

module.exports = Data;
