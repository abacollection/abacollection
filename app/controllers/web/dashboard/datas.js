const { Datas } = require('../../../models');

async function retrieveDatas(ctx, next) {
  ctx.state.data = await ctx.state.target.getData(
    ctx.query ? (ctx.query.interval ? ctx.query.interval : 'D') : 'D'
  );

  return next();
}

async function addData(ctx, next) {
  try {
    const { body } = ctx.request;
    await Datas.create({
      date: body.date,
      value: body.data,
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

module.exports = {
  retrieveDatas,
  addData,
  editData
};
