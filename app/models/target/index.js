const mongoose = require('mongoose');
const mongooseCommonPlugin = require('mongoose-common-plugin');

const Datas = require('../data');
const durationSchema = require('./duration');
const frequencySchema = require('./frequency');
const pcSchema = require('./percent-correct');
const rateSchema = require('./rate');
const taSchema = require('./task-analysis');

// <https://github.com/Automattic/mongoose/issues/5534>
mongoose.Error.messages = require('@ladjs/mongoose-error-messages');

const targetSchema = new mongoose.Schema(
  {
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
        'Task Analysis'
        // 'Momentary Time Sampling',
        // 'Whole Interval',
        // 'Partial Interval'
      ],
      required: true
    },
    description: {
      type: String
    },
    phase: {
      type: String
    },
    start_date: {
      type: Date
    },
    mastered_date: {
      type: Date
    },
    created_by: { type: mongoose.Schema.ObjectId, ref: 'User' },
    program: { type: mongoose.Schema.ObjectId, ref: 'Program' },
    data: [{ type: mongoose.Schema.ObjectId, ref: 'Data' }]
    // TODO create mastery criterion setup
    // TODO add phase categories
  },
  { discriminatorKey: 'data_type' }
);

targetSchema.plugin(mongooseCommonPlugin, { object: 'target' });

targetSchema.post('findOneAndRemove', async function () {
  const datas = await Datas.find({ target: this.getQuery()._id }).lean().exec();

  await Promise.all(datas.map((data) => Datas.findByIdAndRemove(data._id)));
});

targetSchema.method('getPreviousData', async () => {
  const returnValue = 'WIP';

  return returnValue;
});

targetSchema.method('getCurrentData', async () => {
  const returnValue = 'WIP';

  return returnValue;
});

const Target = mongoose.model('Target', targetSchema);

//
// Discriminators
//
Target.discriminator('FrequencyTarget', frequencySchema, 'Frequency');
Target.discriminator('DurationTarget', durationSchema, 'Duration');
Target.discriminator('PercentCorrectTarget', pcSchema, 'Percent Correct');
Target.discriminator('RateTarget', rateSchema, 'Rate');
Target.discriminator('TaskAnalysisTarget', taSchema, 'Task Analysis');

module.exports = Target;
