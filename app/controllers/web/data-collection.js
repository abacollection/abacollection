const { Targets, Datas } = require('../../models');

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

async function update(ctx) {
  const { targets } = ctx.request.body;
  ctx.state.targets = ctx.state.targets.map(async target => {
    if (!targets[target._id]) return target;

    if (Array.isArray(targets[target._id])) {
      await target.populate('data').execPopulate();

      const data = targets[target._id].map((d, i) => {
        let result;
        if (target.data[i]) {
          target.data[i].value = d.value ? d.value : d;
          result = target.data[i].save();
        } else {
          result = Datas.create({
            value: d.value ? d.value : d,
            target: target._id,
            user: ctx.state.user._id,
            data_type: target.data_type
          });
        }

        return result;
      });

      target.data = await Promise.all(data);
    } else if (targets[target._id].value !== 0) {
      const data = await Datas.create({
        value: targets[target._id].value,
        target: target._id,
        user: ctx.state.user._id,
        data_type: target.data_type
      });

      target.data.push(data);
    }

    return target.save();
  });

  await Promise.all(ctx.state.targets);

  ctx.body = {};
}

module.exports = {
  retrieveTargets,
  getUpdates,
  update
};
