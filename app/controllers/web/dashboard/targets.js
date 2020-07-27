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

module.exports = {
  retrieveTargets
};
