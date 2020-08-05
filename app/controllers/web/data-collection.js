const { Targets } = require('../../models');

async function retrieveTargets(ctx, next) {
  ctx.state.targets = [];

  ctx.state.targets = await Targets.where('program')
    .in(ctx.state.programs)
    .populate('program', 'name')
    .exec();

  return next();
}

async function getUpdates(ctx) {
  if (ctx.accepts('html')) return ctx.render('data-collection');
  // TODO add updating of data on page
}

module.exports = {
  retrieveTargets,
  getUpdates
};
