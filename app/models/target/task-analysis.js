const mongoose = require('mongoose');
const dayjs = require('dayjs');

const Datas = require('../data');
const { format } = require('../../../helpers/format');

// <https://github.com/Automattic/mongoose/issues/5534>
mongoose.Error.messages = require('@ladjs/mongoose-error-messages');

const taSchema = new mongoose.Schema({ ta: [{ type: String }] });

taSchema.method('getData', async function (query) {
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

    const total = data.value.length;
    const correct = data.value.filter((d) => d === 'correct').length;

    const value = ((correct / total) * 100).toFixed(0);

    if (ret[date]) ret[date].push(value);
    else ret[date] = [value];

    if (rawData) {
      data.ta = data.value;
      data.value = value;
      if (rawData[date]) rawData[date].push(data);
      else rawData[date] = [data];
    }
  });

  ret = Object.entries(ret).map((r) => {
    const [key, value] = r;

    const total = value.length;
    let sum = 0;
    value.forEach((item) => {
      sum += Number.parseInt(item, 10);
    });

    const percent = (sum / total).toFixed(0);

    return { date: key, value: Number.parseInt(percent, 10) };
  });

  if (rawData) return { data: ret, rawData };

  return ret;
});

taSchema.method('getPreviousData', async function () {
  let ret;

  ret = await Datas.find({ target: this._id }).sort('-date').limit(1).exec();
  if (ret.length === 0) return 'NA';

  const total = ret[0].value.length;
  const correct = ret[0].value.filter((data) => data === 'correct').length;

  const percent = ((correct / total) * 100).toFixed(0);

  ret = `${percent === 'NaN' ? 'NA' : percent}%`;

  return ret;
});

taSchema.method('getCurrentData', async function () {
  const ret = 'NA';

  return ret;
});

module.exports = taSchema;
