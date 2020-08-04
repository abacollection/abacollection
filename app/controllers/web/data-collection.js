const { Targets } = require('../../models');

async function retrieveTargets(ctx, next) {
  ctx.state.targets = [];

  ctx.state.targets = await Targets.where('program')
    .in(ctx.state.programs)
    .populate('program')
    .exec();

  return next();
}

module.exports = {
  retrieveTargets
};
