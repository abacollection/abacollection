const mongoose = require('mongoose');
const mongooseCommonPlugin = require('mongoose-common-plugin');
const dayjs = require('dayjs');

const Datas = require('./data');

// <https://github.com/Automattic/mongoose/issues/5534>
mongoose.Error.messages = require('@ladjs/mongoose-error-messages');

const targetSchema = new mongoose.Schema({
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
  created_by: { type: mongoose.Schema.ObjectId, ref: 'User' },
  program: { type: mongoose.Schema.ObjectId, ref: 'Program' },
  data: [{ type: mongoose.Schema.ObjectId, ref: 'Data' }]
  // TODO create mastery criterion setup
  // TODO add phase categories
});

targetSchema.plugin(mongooseCommonPlugin, { object: 'target' });

targetSchema.post('findOneAndRemove', async function () {
  const datas = await Datas.find({ target: this.getQuery()._id }).lean().exec();

  datas.forEach(async (data) => {
    await Datas.findByIdAndRemove(data._id);
  });
});

targetSchema.method('getDailyData', async function () {
  let ret;

  if (this.data_type === 'Frequency') {
    ret = {};
    const datas = await Datas.find({ target: this._id }).sort('date').exec();

    datas.forEach((data) => {
      const date = dayjs(data.date).format('MM/DD/YYYY');

      if (ret[date]) ret[date] += data.value;
      else ret[date] = data.value;
    });

    ret = Object.entries(ret).map((r) => {
      return { x: r[0], y: r[1] };
    });
  }

  return ret;
});

targetSchema.method('getPreviousData', async function () {
  let ret = 'WIP';

  if (this.data_type === 'Frequency') {
    const datas = await Datas.find({
      $and: [
        {
          target: this._id
        },
        {
          date: {
            $lt: dayjs().startOf('day').toDate(),
            $gte: dayjs().startOf('day').subtract(1, 'day').toDate()
          }
        }
      ]
    }).exec();

    ret = 0;

    datas.forEach((data) => {
      ret += data.value;
    });
  } else if (this.data_type === 'Duration') {
    ret = await Datas.find({ target: this._id }).sort('-date').limit(1).exec();

    ret = ret[0] ? ret[0].value : 'NA';
  } else if (this.data_type === 'Percent Correct') {
    ret = await Datas.find({
      $and: [
        {
          target: this._id
        },
        {
          date: {
            $lt: dayjs().startOf('day').toDate(),
            $gte: dayjs().startOf('day').subtract(1, 'day').toDate()
          }
        }
      ]
    }).exec();

    const total = ret.length;
    const correct = ret.filter((data) => data.value === 'correct').length;

    const percent = ((correct / total) * 100).toFixed(0);

    ret = `${percent === 'NaN' ? 'NA' : percent}%`;
  }

  return ret;
});

targetSchema.method('getCurrentData', async function () {
  let ret = 'WIP';

  if (this.data_type === 'Frequency') {
    const datas = await Datas.find({
      $and: [
        {
          target: this._id
        },
        {
          date: {
            $gte: dayjs().startOf('day').toDate()
          }
        }
      ]
    }).exec();

    ret = 0;

    datas.forEach((data) => {
      ret += data.value;
    });
  } else if (this.data_type === 'Duration') {
    ret = 'NA';
  } else if (this.data_type === 'Percent Correct') {
    ret = await Datas.find({
      $and: [
        {
          target: this._id
        },
        {
          date: {
            $gte: dayjs().startOf('day').toDate()
          }
        }
      ]
    }).exec();

    const total = ret.length;
    const correct = ret.filter((data) => data.value === 'correct').length;

    const percent = ((correct / total) * 100).toFixed(0);

    ret = `${percent === 'NaN' ? 'NA' : percent}%`;
  }

  return ret;
});

const Target = mongoose.model('Target', targetSchema);

module.exports = Target;
