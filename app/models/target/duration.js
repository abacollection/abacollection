const mongoose = require('mongoose');
const ms = require('ms');
const dayjs = require('dayjs');
const prettyMs = require('pretty-ms');

const Datas = require('../data');
const format = require('../../../helpers/format');

// <https://github.com/Automattic/mongoose/issues/5534>
mongoose.Error.messages = require('@ladjs/mongoose-error-messages');

const durationSchema = new mongoose.Schema();

durationSchema.method('getGraph', async function (query) {
  let form = format.D;
  if (query && query.interval) form = format[query.interval];

  let ret = {};

  const datas = await Datas.find({ target: this._id })
    .sort('date')
    .lean()
    .exec();

  for (const data of datas) {
    const date = dayjs(data.date).format(form);

    if (ret[date]) ret[date] += data.value;
    else ret[date] = data.value;
  }

  ret = Object.entries(ret).map((r) => {
    return {
      x: r[0],
      y: Number.parseInt((r[1] / ms('1 min')).toFixed(0), 10)
    };
  });

  return ret;
});

durationSchema.method('getData', async function (query) {
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

    if (ret[date]) ret[date] += data.value;
    else ret[date] = data.value;

    if (rawData) {
      data.value = prettyMs(data.value, { colonNotation: true });

      if (rawData[date]) rawData[date].push(data);
      else rawData[date] = [data];
    }
  }

  ret = Object.entries(ret).map((r) => {
    return {
      date: r[0],
      value: prettyMs(r[1], { colonNotation: true })
    };
  });

  if (rawData) return { data: ret, rawData };

  return ret;
});

durationSchema.method('getPreviousData', async function () {
  let ret;

  ret = await Datas.find({ target: this._id }).sort('-date').limit(1).exec();

  if (ret.length === 0) return 'NA';

  ret = ret[0] ? ms(ret[0].value, { long: true }) : 'NA';

  return ret;
});

durationSchema.method('getCurrentData', async () => {
  return 'NA';
});

module.exports = durationSchema;
