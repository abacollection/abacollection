const paginate = require('koa-ctx-paginate');

const { Targets } = require('../../../models');

async function retrieveTargets(ctx, next) {
  ctx.state.targets = [];

  const query = {
    $or: [{ program: ctx.state.program._id }]
  };

  ctx.state.targets = await Targets.find(query)
    .sort('name')
    .lean()
    .exec();

  return next();
}

async function list(ctx) {
  const [targets, itemCount] = await Promise.all([
    Targets.find({})
      .limit(ctx.query.limit)
      .skip(ctx.paginate.skip)
      .lean()
      .sort('name')
      .exec(),
    Targets.countDocuments({})
  ]);

  const pageCount = Math.ceil(itemCount / ctx.query.limit);

  await ctx.render('dashboard/clients/programs/targets', {
    targets,
    pageCount,
    itemCount,
    pages: paginate.getArrayPages(ctx)(3, pageCount, ctx.query.page)
  });
}

module.exports = {
  retrieveTargets,
  list
};
