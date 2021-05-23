const mongoose = require('mongoose');
const ms = require('ms');
const dayjs = require('dayjs');
const prettyMs = require('pretty-ms');

const Datas = require('../data');
const { format } = require('../../../helpers/format');

// <https://github.com/Automattic/mongoose/issues/5534>
mongoose.Error.messages = require('@ladjs/mongoose-error-messages');

const rateSchema = new mongoose.Schema();

rateSchema.method('getGraph', async function (query) {
  let form = format.D;
  if (query && query.interval) form = format[query.interval];

  let ret = {};

  const datas = await Datas.find({ target: this._id })
    .sort('date')
    .lean()
    .exec();

  for (const data of datas) {
    const date = dayjs(data.date).format(form);

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
  }

  ret = Object.entries(ret).map((r) => {
    return {
      x: r[0],
      correct: r[1].correct,
      incorrect: r[1].incorrect
    };
  });

  return ret;
});

rateSchema.method('getData', async function (query) {
  let form = format.D;
  if (query && query.interval) form = format[query.interval];

  let rawData;

  if (query && query.rawData) rawData = {};

  let ret = {};

  const datas = await Datas.find({ target: this._id })
    .sort('date')
    .lean()
    .exec();

  for (const data of datas) {
    const date = dayjs(data.date).format(form);

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

      ret[date] = {
        correct,
        incorrect,
        counting_time: prettyMs(value.counting_time, { colonNotation: true })
      };
    }

    if (rawData) {
      data.value.counting_time = prettyMs(data.value.counting_time, {
        colonNotation: true
      });

      if (rawData[date]) rawData[date].push(data);
      else rawData[date] = [data];
    }
  }

  ret = Object.entries(ret).map((r) => {
    return {
      date: r[0],
      correct: r[1].correct,
      incorrect: r[1].incorrect,
      counting_time: r[1].counting_time
    };
  });

  if (rawData) return { data: ret, rawData };

  return ret;
});

rateSchema.method('getPreviousData', async function () {
  let ret;

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

  return ret;
});

rateSchema.method('getCurrentData', async () => {
  return 'NA';
});

module.exports = rateSchema;
