const mongoose = require('mongoose');
const dayjs = require('dayjs');

const Datas = require('../data');
const { format } = require('../../../helpers/format');

// <https://github.com/Automattic/mongoose/issues/5534>
mongoose.Error.messages = require('@ladjs/mongoose-error-messages');

const pcSchema = new mongoose.Schema();

pcSchema.method('getGraph', async function (query) {
  let form = format.D;
  if (query && query.interval) form = format[query.interval];

  let ret = {};

  const datas = await Datas.find({ target: this._id })
    .sort('date')
    .lean()
    .exec();

  datas.forEach((data) => {
    const date = dayjs(data.date).format(form);

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

  return ret;
});

pcSchema.method('getData', async function (query) {
  let form = format.D;
  if (query && query.interval) form = format[query.interval];

  let rawData;

  if (query && query.rawData) rawData = {};

  let ret = {};

  const datas = await Datas.find({ target: this._id })
    .sort('date')
    .lean()
    .exec();

  datas.forEach((data) => {
    const date = dayjs(data.date).format(form);

    if (ret[date]) ret[date].push(data.value);
    else ret[date] = [data.value];

    if (rawData) {
      if (rawData[date]) rawData[date].push(data);
      else rawData[date] = [data];
    }
  });

  ret = Object.entries(ret).map((r) => {
    const [key, value] = r;

    const total = value.length;
    const correct = value.filter((d) => d === 'correct').length;

    const percent = ((correct / total) * 100).toFixed(0);

    return { date: key, value: Number.parseInt(percent, 10) };
  });

  if (rawData) return { data: ret, rawData };

  return ret;
});

pcSchema.method('getPreviousData', async function () {
  let ret;

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

  return ret;
});

pcSchema.method('getCurrentData', async function () {
  let ret = 'NA';

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

  return ret;
});

module.exports = pcSchema;
