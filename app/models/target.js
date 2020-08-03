const mongoose = require('mongoose');
const mongooseCommonPlugin = require('mongoose-common-plugin');

// <https://github.com/Automattic/mongoose/issues/5534>
mongoose.Error.messages = require('@ladjs/mongoose-error-messages');

const Target = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    index: true
  },
  data_type: {
    type: String,
    enum: [
      'Frequency',
      'Rate',
      'Duration',
      'Percent Correct',
      'Task Analysis',
      'Momentary Time Sampling',
      'Whole Interval',
      'Partial Interval'
    ],
    required: true
  },
  description: {
    type: String
  },
  start_date: {
    type: Date
  },
  mastered_date: {
    type: Date
  },
  created_by: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
  program: [{ type: mongoose.Schema.ObjectId, ref: 'Program' }]
  // TODO create mastery criterion setup
  // TODO add phase categories
});

Target.plugin(mongooseCommonPlugin, { object: 'target' });

module.exports = mongoose.model('Target', Target);
