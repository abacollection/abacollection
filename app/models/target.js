const mongoose = require('mongoose');
const mongooseCommonPlugin = require('mongoose-common-plugin');
const dayjs = require('dayjs');
const ms = require('ms');

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
  let ret = {};

  const datas = await Datas.find({ target: this._id }).sort('date').exec();

  if (this.data_type === 'Frequency') {
    datas.forEach((data) => {
      const date = dayjs(data.date).format('MM/DD/YYYY');

      if (ret[date]) ret[date] += data.value;
      else ret[date] = data.value;
    });

    ret = Object.entries(ret).map((r) => {
      return { x: r[0], y: r[1] };
    });
  } else if (this.data_type === 'Percent Correct') {
    datas.forEach((data) => {
      const date = dayjs(data.date).format('MM/DD/YYYY');

      if (ret[date]) ret[date].push(data.value);
      else ret[date] = [data.value];
    });

    ret = Object.entries(ret).map((r) => {
      const [key, value] = r;

      const total = value.length;
      const correct = value.filter((d) => d === 'correct').length;

      const percent = ((correct / total) * 100).toFixed(0);

      return { x: key, y: Number.parseInt(percent, 10) };
    });
  } else if (this.data_type === 'Duration') {
    datas.forEach((data) => {
      const date = dayjs(data.date).format('MM/DD/YYYY');

      if (ret[date]) ret[date] += data.value;
      else ret[date] = data.value;
    });

    ret = Object.entries(ret).map((r) => {
      return { x: r[0], y: (r[1] / ms('1 min')).toFixed(0) };
    });
  } else if (this.data_type === 'Rate') {
    datas.forEach((data) => {
      const date = dayjs(data.date).format('MM/DD/YYYY');

      if (!ret[date]) {
        const { value } = data;
        const counting_time = value.counting_time / ms('1m');
        const correct = Number.parseInt(
          (value.correct / counting_time).toFixed(3),
          10
        );
        const incorrect = Number.parseInt(
          (value.incorrect / counting_time).toFixed(3),
          10
        );

        ret[date] = { correct, incorrect };
      }
    });

    ret = Object.entries(ret).map((r) => {
      return {
        x: r[0],
        correct: r[1].correct,
        incorrect: r[1].incorrect
      };
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

    ret = ret[0] ? ms(ret[0].value, { long: true }) : 'NA';
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
  } else if (this.data_type === 'Rate') {
    ret = await Datas.find({ target: this._id }).sort('-date').limit(1).exec();

    if (ret[0]) {
      const counting_time = ret[0].value.counting_time / ms('1m');
      const correct = Number.parseInt(
        (ret[0].value.correct / counting_time).toFixed(3),
        10
      );
      const incorrect = Number.parseInt(
        (ret[0].value.incorrect / counting_time).toFixed(3),
        10
      );

      ret = `${correct} correct, ${incorrect} incorrect(/min)`;
    } else ret = 'NA';
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
  } else if (this.data_type === 'Rate') {
    ret = 'NA';
  }

  return ret;
});

const Target = mongoose.model('Target', targetSchema);

module.exports = Target;
