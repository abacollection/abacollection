const ms = require('ms');

const { Datas } = require('../../../models');

async function retrieveDatas(ctx, next) {
  ctx.state.data = await ctx.state.target.getData(ctx.query);

  if (!Array.isArray(ctx.state.data)) {
    ctx.state.rawData = ctx.state.data.rawData;
    ctx.state.data = ctx.state.data.data;
  }

  return next();
}

async function retrieveGraph(ctx, next) {
  ctx.state.data = await ctx.state.target.getGraph(ctx.query);

  return next();
}

async function addData(ctx, next) {
  try {
    const { body } = ctx.request;

    let value = body.data;

    if (ctx.state.target.data_type === 'Duration') {
      const vals = body.data.split(':');

      switch (vals.length) {
        case 3:
          value = vals[0] * ms('1h') + vals[1] * ms('1m') + vals[2] * ms('1s');
          break;
        case 2:
          value = vals[0] * ms('1m') + vals[1] * ms('1s');
          break;
        case 1:
          value = vals[0] * ms('1s');
          break;
        default:
          break;
      }
    }

    await Datas.create({
      date: body.date,
      value,
      data_type: ctx.state.target.data_type,
      creation_date: new Date(),
      target: ctx.state.target._id,
      created_by: ctx.state.client._id
    });

    await retrieveDatas(ctx, next);

    await ctx.render('dashboard/clients/_data-table');

    ctx.body = {
      message: ctx.body,
      resetModal: true
    };
  } catch (err) {
    ctx.logger.error(err);
  }
}

async function editData(ctx, next) {
  try {
    const { body } = ctx.request;

    let value = body.data;

    if (ctx.state.target.data_type === 'Duration') {
      const vals = body.data.split(':');

      switch (vals.length) {
        case 3:
          value = vals[0] * ms('1h') + vals[1] * ms('1m') + vals[2] * ms('1s');
          break;
        case 2:
          value = vals[0] * ms('1m') + vals[1] * ms('1s');
          break;
        case 1:
          value = vals[0] * ms('1s');
          break;
        default:
          break;
      }
    }

    if (body.id) {
      const data = await Datas.findById(body.id);
      data.value = value;
      await data.save();
    } else
      await Datas.create({
        date: body.date,
        value:
          Number.parseInt(body.data, 10) - Number.parseInt(body.origData, 10),
        data_type: ctx.state.target.data_type,
        creation_date: new Date(),
        target: ctx.state.target._id,
        created_by: ctx.state.client._id
      });

    await retrieveDatas(ctx, next);

    await ctx.render('dashboard/clients/_data-table');

    ctx.body = {
      message: ctx.body,
      resetModal: true
    };
  } catch (err) {
    ctx.logger.error(err);
  }
}

async function deleteData(ctx, next) {
  await Datas.findByIdAndRemove(ctx.request.body.id);

  await retrieveDatas(ctx, next);

  await ctx.render('dashboard/clients/_data-table');

  ctx.body = {
    message: ctx.body,
    resetModal: true
  };
}

module.exports = {
  retrieveDatas,
  retrieveGraph,
  addData,
  editData,
  deleteData
};
