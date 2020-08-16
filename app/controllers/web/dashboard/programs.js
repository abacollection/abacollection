const paginate = require('koa-ctx-paginate');
const Boom = require('@hapi/boom');
const isSANB = require('is-string-and-not-blank');
const _ = require('lodash');

const { Programs } = require('../../../models');

async function retrievePrograms(ctx, next) {
  ctx.state.programs = [];

  const query = {
    $or: [{ client: ctx.state.client._id }]
  };

  ctx.state.programs = await Programs.find(query).sort('name').lean().exec();

  //
  // set breadcrumb
  //
  if (ctx.state.breadcrumbs)
    ctx.state.breadcrumbs = ctx.state.breadcrumbs.map((breadcrumb) => {
      if (!_.isObject(breadcrumb) && breadcrumb === 'programs')
        return {
          name: 'Programs',
          header: 'Programs',
          href: ctx.state.l(
            `/dashboard/clients/${ctx.state.client.id}/programs`
          )
        };

      return breadcrumb;
    });

  return next();
}

async function retrieveProgram(ctx, next) {
  if (!isSANB(ctx.params.program_id) && !isSANB(ctx.request.body.program))
    return ctx.throw(
      Boom.badRequest(ctx.translateError('PROGRAM_DOES_NOT_EXIST'))
    );

  const id = isSANB(ctx.params.program_id)
    ? ctx.params.program_id
    : ctx.request.body.program;

  ctx.state.program = ctx.state.programs.find((program) =>
    [program.id, program.name].includes(id)
  );

  if (!ctx.state.program)
    return ctx.throw(
      Boom.badRequest(ctx.translateError('PROGRAM_DOES_NOT_EXIST'))
    );

  //
  // set breadcrumb
  //
  if (ctx.state.breadcrumbs)
    ctx.state.breadcrumbs = ctx.state.breadcrumbs.map((breadcrumb) => {
      if (!_.isObject(breadcrumb) && breadcrumb === id)
        return {
          name: ctx.state.program.name,
          header: ctx.state.program.name,
          href: ctx.state.l(
            `/dashboard/clients/${ctx.state.client.id}/programs/${id}`
          )
        };

      return breadcrumb;
    });

  return next();
}

async function list(ctx) {
  const [programs, itemCount] = await Promise.all([
    Programs.find({})
      .limit(ctx.query.limit)
      .skip(ctx.paginate.skip)
      .lean()
      .sort('name')
      .exec(),
    Programs.countDocuments({})
  ]);

  const pageCount = Math.ceil(itemCount / ctx.query.limit);

  await ctx.render('dashboard/clients/programs', {
    programs,
    pageCount,
    itemCount,
    pages: paginate.getArrayPages(ctx)(3, pageCount, ctx.query.page)
  });
}

async function addProgram(ctx) {
  if (!isSANB(ctx.request.body.name))
    return ctx.throw(
      Boom.badRequest(ctx.translateError('INVALID_PROGRAM_NAME'))
    );

  try {
    ctx.state.program = await Programs.create({
      name: ctx.request.body.name,
      description: ctx.request.body.description,
      creation_date: new Date(),
      client: ctx.state.client._id
    });

    const redirectTo = ctx.state.l(
      `/dashboard/clients/${ctx.state.client.id}/programs`
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

async function deleteProgram(ctx) {
  await Programs.findByIdAndRemove(ctx.state.program._id);
  ctx.flash('custom', {
    title: ctx.request.t('Success'),
    text: ctx.translate('REQUEST_OK'),
    type: 'success',
    toast: true,
    showConfirmButton: false,
    timer: 3000,
    position: 'top'
  });

  const redirectTo = ctx.state.l(
    `/dashboard/clients/${ctx.state.client.id}/programs`
  );
  if (ctx.accepts('html')) ctx.redirect(redirectTo);
  else ctx.body = { redirectTo };
}

async function editProgram(ctx) {
  if (!isSANB(ctx.request.body.name))
    return ctx.throw(
      Boom.badRequest(ctx.translateError('INVALID_PROGRAM_NAME'))
    );

  const { name, description } = ctx.request.body;

  ctx.state.program = await Programs.findOneAndUpdate(
    { id: ctx.state.program._id },
    { name, description },
    { new: true, runValidators: true, context: 'query' }
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

  const redirectTo = ctx.state.l(
    `/dashboard/clients/${ctx.state.client._id}/programs`
  );
  if (ctx.accepts('html')) ctx.redirect(redirectTo);
  else ctx.body = { redirectTo };
}

module.exports = {
  retrievePrograms,
  retrieveProgram,
  list,
  addProgram,
  deleteProgram,
  editProgram
};
