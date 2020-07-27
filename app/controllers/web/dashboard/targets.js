const paginate = require('koa-ctx-paginate');
const Boom = require('@hapi/boom');
const isSANB = require('is-string-and-not-blank');

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

async function addTarget(ctx) {
  if (!isSANB(ctx.request.body.name))
    return ctx.throw(
      Boom.badRequest(ctx.translateError('INVALID_TARGET_NAME'))
    );
  try {
    ctx.state.target = await Targets.create({
      name: ctx.request.body.name,
      data_type: ctx.request.body.data_type,
      description: ctx.request.body.description,
      created_by: ctx.state.user,
      program: ctx.state.program
    });

    const redirectTo = ctx.state.l(
      `/dashboard/clients/${ctx.state.client.id}/programs/${ctx.state.program.id}/targets`
    );

    ctx.flash('custom', {
      title: ctx.request.t('Success'),
      text: ctx.translate('REQUEST_OK'),
      type: 'success',
      toast: true,
      showConfirmButton: false,
      timer: 3000,
      position: 'top'
    });

    if (ctx.accepts('html')) ctx.redirect(redirectTo);
    else ctx.body = { redirectTo };
  } catch (err) {
    ctx.logger.error(err);
    ctx.throw(Boom.badRequest(err.message));
  }
}

module.exports = {
  retrieveTargets,
  list,
  addTarget
};
