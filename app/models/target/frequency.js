const mongoose = require('mongoose');
const dayjs = require('dayjs');

const Datas = require('../data');
const { format } = require('../../../helpers/format');

// <https://github.com/Automattic/mongoose/issues/5534>
mongoose.Error.messages = require('@ladjs/mongoose-error-messages');

const frequencySchema = new mongoose.Schema();

frequencySchema.method('getGraph', async function (query) {
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
    return { x: r[0], y: Number.parseInt(r[1].toFixed(0), 10) };
  });

  return ret;
});

frequencySchema.method('getData', async function (query) {
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
      if (rawData[date]) rawData[date].push(data);
      else rawData[date] = [data];
    }
  }

  ret = Object.entries(ret).map((r) => {
    return { date: r[0], value: Number.parseInt(r[1].toFixed(0), 10) };
  });

  if (rawData) return { data: ret, rawData };

  return ret;
});

frequencySchema.method('getPreviousData', async function () {
  let ret;

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

  for (const data of datas) {
    ret += data.value;
  }

  return ret;
});

frequencySchema.method('getCurrentData', async function () {
  let ret = 'NA';

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

  for (const data of datas) {
    ret += data.value;
  }

  return ret;
});

module.exports = frequencySchema;
