const paginate = require('koa-ctx-paginate');
const Boom = require('@hapi/boom');
const isSANB = require('is-string-and-not-blank');
const _ = require('lodash');

const { Targets } = require('../../../models');

async function retrieveTargets(ctx, next) {
  ctx.state.targets = [];

  const query = {
    $or: [{ program: ctx.state.program._id }]
  };

  ctx.state.targets = await Targets.find(query).sort('name').exec();

  //
  // set breadcrumb
  //
  if (ctx.state.breadcrumbs) {
    ctx.state.breadcrumbs = ctx.state.breadcrumbs.map((breadcrumb) => {
      if (!_.isObject(breadcrumb) && breadcrumb === 'targets') {
        return {
          name: 'Targets',
          header: ctx.state.program.name,
          href: ctx.state.l(
            `/dashboard/clients/${ctx.state.client.id}/programs/${ctx.state.program.id}/targets`
          )
        };
      }

      return breadcrumb;
    });
  }

  return next();
}

async function retrieveTarget(ctx, next) {
  if (!isSANB(ctx.params.target_id) && !isSANB(ctx.request.body.target)) {
    return ctx.throw(
      Boom.badRequest(ctx.translateError('TARGET_DOES_NOT_EXIST'))
    );
  }

  const id = isSANB(ctx.params.target_id)
    ? ctx.params.target_id
    : ctx.request.body.target;

  ctx.state.target = ctx.state.targets.find((target) =>
    [target.id, target.name].includes(id)
  );

  if (!ctx.state.target) {
    return ctx.throw(
      Boom.badRequest(ctx.translateError('TARGET_DOES_NOT_EXIST'))
    );
  }

  //
  // set breadcrumb
  //
  if (ctx.state.breadcrumbs) {
    ctx.state.breadcrumbs = ctx.state.breadcrumbs.map((breadcrumb) => {
      if (!_.isObject(breadcrumb) && breadcrumb === id) {
        return {
          name: ctx.state.target.name,
          header: `${ctx.state.program.name}: ${ctx.state.target.name}`,
          href: ctx.state.l(
            `/dashboard/clients/${ctx.state.client.id}/programs/${ctx.state.program.id}/targets/${id}`
          )
        };
      }

      return breadcrumb;
    });
  }

  return next();
}

async function list(ctx) {
  const [targets, itemCount] = await Promise.all([
    Targets.find({
      $or: [{ program: ctx.state.program._id }]
    })
      .collation({ locale: ctx.locale, strength: 2 })
      .sort(ctx.query.sort)
      .limit(ctx.query.limit)
      .skip(ctx.paginate.skip)
      .lean()
      .exec(),
    Targets.countDocuments({
      $or: [{ program: ctx.state.program._id }]
    })
  ]);

  const pageCount = Math.ceil(itemCount / ctx.query.limit);

  await ctx.render('dashboard/clients/targets', {
    targets,
    pageCount,
    itemCount,
    pages: paginate.getArrayPages(ctx)(3, pageCount, ctx.query.page)
  });
}

async function addTarget(ctx) {
  if (!isSANB(ctx.request.body.name)) {
    return ctx.throw(
      Boom.badRequest(ctx.translateError('INVALID_TARGET_NAME'))
    );
  }

  try {
    const doc = {
      name: ctx.request.body.name,
      data_type: ctx.request.body.data_type,
      description: ctx.request.body.description,
      created_by: ctx.state.user,
      program: ctx.state.program
    };

    if (doc.data_type === 'Task Analysis') {
      if (_.isEmpty(ctx.request.body.ta)) {
        return ctx.throw(
          Boom.badRequest(ctx.translateError('INVALID_TA_STEPS'))
        );
      }

      doc.ta = ctx.request.body.ta;
    }

    ctx.state.target = await Targets.create(doc);

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

    if (ctx.accepts('html')) {
      ctx.redirect(redirectTo);
    } else {
      ctx.body = { redirectTo };
    }
  } catch (error) {
    ctx.logger.error(error);
    ctx.throw(Boom.badRequest(error.message));
  }
}

async function deleteTarget(ctx) {
  await Targets.findByIdAndRemove(ctx.state.target._id);
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
    `/dashboard/clients/${ctx.state.client.id}/programs/${ctx.state.program.id}/targets`
  );
  if (ctx.accepts('html')) {
    ctx.redirect(redirectTo);
  } else {
    ctx.body = { redirectTo };
  }
}

async function editTarget(ctx) {
  if (!isSANB(ctx.request.body.name)) {
    return ctx.throw(
      Boom.badRequest(ctx.translateError('INVALID_TARGET_NAME'))
    );
  }

  const { name, description } = ctx.request.body;

  ctx.state.target = await Targets.findOneAndUpdate(
    { id: ctx.state.target._id },
    { name, description },
    { new: true, runValidators: true, context: 'query' }
  );

  if (ctx.state.target.data_type === 'Task Analysis' && ctx.request.body) {
    ctx.state.target.ta = ctx.request.body.ta;
    ctx.state.target = ctx.state.target.save();
  }

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
    `/dashboard/clients/${ctx.state.client._id}/programs/${ctx.state.program._id}/targets`
  );
  if (ctx.accepts('html')) {
    ctx.redirect(redirectTo);
  } else {
    ctx.body = { redirectTo };
  }
}

async function getData(ctx) {
  const { target, data } = ctx.state;

  const yaxisTitles = {
    Frequency: ctx.state.t('Count per Day'),
    'Percent Correct': ctx.state.t('Percent Correct per Day'),
    Duration: ctx.state.t('Duration(mins) per Day'),
    Rate: ctx.state.t('Count per Minute (first)'),
    'Task Analysis': ctx.state.t('Percent Correct per Day')
  };

  if (ctx.accepts('html')) {
    return ctx.render('dashboard/clients/_data-table');
  }

  let series = [];

  if (target.data_type === 'Rate') {
    series = series.concat([
      {
        name: 'Correct',
        data: data.map((d) => {
          return { x: d.x, y: d.correct };
        })
      },
      {
        name: 'Incorrect',
        data: data.map((d) => {
          return { x: d.x, y: d.incorrect };
        })
      }
    ]);
  } else {
    series.push({ name: target.name, data });
  }

  ctx.body = {
    series,
    title: target.name,
    xaxisTitle: ctx.state.t('Date'),
    yaxisTitle: yaxisTitles[target.data_type],
    yaxisMax: ['Percent Correct', 'Task Analysis'].includes(target.data_type)
      ? 100
      : false
  };
}

module.exports = {
  retrieveTargets,
  retrieveTarget,
  list,
  addTarget,
  deleteTarget,
  editTarget,
  getData
};
