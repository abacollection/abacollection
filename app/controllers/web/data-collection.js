const dayjs = require('dayjs');
const revHash = require('rev-hash');
const safeStringify = require('fast-safe-stringify');

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
  const body = {};

  // get previous data
  ctx.state.previous = {};
  ctx.state.current = {};
  await Promise.all(
    ctx.state.targets.map(async (target) => {
      ctx.state.previous[target._id] = await target.getPreviousData();
      ctx.state.current[target._id] = await target.getCurrentData();

      body[target._id] = {};
      body[target._id].data_type = target.data_type;
      body[target._id].previous = ctx.state.previous[target._id];
      body[target._id].current = ctx.state.current[target._id];

      // get percent correct
      const percentCorrect = await Datas.find({
        $and: [
          {
            target: target._id
          },
          {
            created_at: {
              $gte: dayjs().startOf('day').toDate()
            }
          }
        ]
      }).exec();

      body[target._id].percentCorrect = percentCorrect.map((pc) => pc.value);
    })
  );

  if (ctx.accepts('html')) return ctx.render('data-collection');

  body.hash = revHash(safeStringify(body));

  ctx.body = body;
}

async function update(ctx) {
  const { targets } = ctx.request.body;
  ctx.state.targets = ctx.state.targets.map(async (target) => {
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

  ctx.state.targets = await Promise.all(ctx.state.targets);

  await getUpdates(ctx);
}

module.exports = {
  retrieveTargets,
  getUpdates,
  update
};
