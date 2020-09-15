const mongoose = require('mongoose');

const Datas = require('../data');

// <https://github.com/Automattic/mongoose/issues/5534>
mongoose.Error.messages = require('@ladjs/mongoose-error-messages');

const taSchema = new mongoose.Schema({ ta: [{ type: String }] });

taSchema.method('getPreviousData', async function () {
  let ret;

  ret = await Datas.find({ target: this._id }).sort('-date').limit(1).exec();

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
