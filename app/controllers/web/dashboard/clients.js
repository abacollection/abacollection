const { isISO8601 } = require('validator');
const Boom = require('@hapi/boom');
const _ = require('lodash');
const isSANB = require('is-string-and-not-blank');
const paginate = require('koa-ctx-paginate');

const { Users, Clients } = require('../../../models');
const config = require('../../../../config/index');

const { fields } = config.passport;

async function list(ctx) {
  let [clients, itemCount] = await Promise.all([
    Clients.find({
      $or: [{ 'members.user': ctx.state.user._id }]
    })
      .collation({ locale: ctx.locale, strength: 2 })
      .populate('members.user', 'id')
      .sort(ctx.query.sort)
      .limit(ctx.query.limit)
      .skip(ctx.paginate.skip)
      .lean({ virtuals: true })
      .exec(),
    Clients.countDocuments({
      $or: [{ 'members.user': ctx.state.user._id }]
    })
  ]);

  clients = clients.map((client) => {
    // Populate a `group` on the client based off the user's association
    const member = client.members.find(
      (member) => member.user.id === ctx.state.user.id
    );

    const { group } = member ? member : { group: null };

    return {
      ...client,
      group
    };
  });

  const pageCount = Math.ceil(itemCount / ctx.query.limit);

  await ctx.render('dashboard/clients', {
    clients,
    pageCount,
    itemCount,
    pages: paginate.getArrayPages(ctx)(3, pageCount, ctx.query.page)
  });
}

async function add_client(ctx) {
  if (
    !isSANB(ctx.request.body.first_name) ||
    !isSANB(ctx.request.body.last_name)
  ) {
    return ctx.throw(Boom.badRequest(ctx.translateError('INVALID_NAME')));
  }

  if (ctx.request.body.dob && !isISO8601(ctx.request.body.dob)) {
    return ctx.throw(Boom.badRequest(ctx.translateError('INVALID_DOB')));
  }

  try {
    ctx.state.client = await Clients.create({
      first_name: ctx.request.body.first_name,
      last_name: ctx.request.body.last_name,
      dob: ctx.request.body.dob,
      gender: ctx.request.body.gender,
      created_by: ctx.state.user._id,
      creation_date: new Date(),
      members: [{ user: ctx.state.user._id, group: 'owner' }]
    });

    const redirectTo = ctx.state.l('/dashboard/clients');

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
  } catch (err) {
    ctx.logger.error(err);
    ctx.throw(Boom.badRequest(err.message));
  }
}

async function retrieveClients(ctx, next) {
  ctx.state.clients = [];

  if (!ctx.isAuthenticated()) {
    return next();
  }

  ctx.state.clients = await Clients.find({
    $or: [{ 'members.user': ctx.state.user._id }]
  })
    .populate('members.user', `id ${fields.displayName}`)
    .sort('last_name')
    .lean({ virtuals: true })
    .exec();

  ctx.state.clients = ctx.state.clients.map((client) => {
    // Populate a `group` on the client based off the user's association
    const member = client.members.find(
      (member) => member.user.id === ctx.state.user.id
    );

    const { group } = member ? member : { group: null };

    return {
      ...client,
      group
    };
  });

  //
  // set breadcrumb
  //
  if (ctx.state.breadcrumbs) {
    ctx.state.breadcrumbs = ctx.state.breadcrumbs.map((breadcrumb) => {
      if (!_.isObject(breadcrumb) && breadcrumb === 'clients') {
        return {
          name: 'Clients',
          header: 'Clients',
          href: ctx.state.l('/dashboard/clients')
        };
      }

      return breadcrumb;
    });
  }

  return next();
}

async function retrieveClient(ctx, next) {
  if (!isSANB(ctx.params.client_id) && !isSANB(ctx.request.body.client)) {
    return ctx.throw(
      Boom.badRequest(ctx.translateError('CLIENT_DOES_NOT_EXIST'))
    );
  }

  const id = isSANB(ctx.params.client_id)
    ? ctx.params.client_id
    : ctx.request.body.client;

  ctx.state.client = ctx.state.clients.find((client) =>
    [client.id, client.name].includes(id)
  );

  if (!ctx.state.client) {
    return ctx.throw(
      Boom.badRequest(ctx.translateError('CLIENT_DOES_NOT_EXIST'))
    );
  }

  //
  // set breadcrumb
  //
  if (ctx.state.breadcrumbs) {
    ctx.state.breadcrumbs = ctx.state.breadcrumbs.map((breadcrumb) => {
      if (!_.isObject(breadcrumb) && breadcrumb === id) {
        return {
          name: ctx.state.client.name,
          header: ctx.state.client.name,
          href: ctx.state.l(`/dashboard/clients/${id}`)
        };
      }

      return breadcrumb;
    });
  }

  return next();
}

async function ensureAdmin(ctx, next) {
  if (['owner', 'admin'].includes(ctx.state.client.group)) {
    return next();
  }

  ctx.throw(Boom.badRequest(ctx.translateError('NO_PERMISSION')));
}

async function ensureOwner(ctx, next) {
  if (ctx.state.client.group === 'owner') {
    return next();
  }

  ctx.throw(Boom.badRequest(ctx.translateError('NO_PERMISSION')));
}

async function delete_client(ctx) {
  await Clients.findByIdAndRemove(ctx.state.client._id);
  ctx.flash('custom', {
    title: ctx.request.t('Success'),
    text: ctx.translate('REQUEST_OK'),
    type: 'success',
    toast: true,
    showConfirmButton: false,
    timer: 3000,
    position: 'top'
  });

  const redirectTo = ctx.state.l('/dashboard/clients');
  if (ctx.accepts('html')) {
    ctx.redirect(redirectTo);
  } else {
    ctx.body = { redirectTo };
  }
}

async function settings(ctx) {
  if (
    !isSANB(ctx.request.body.first_name) ||
    !isSANB(ctx.request.body.last_name)
  ) {
    return ctx.throw(Boom.badRequest(ctx.translateError('INVALID_NAME')));
  }

  if (ctx.request.body.dob && !isISO8601(ctx.request.body.dob)) {
    return ctx.throw(Boom.badRequest(ctx.translateError('INVALID_DOB')));
  }

  const { first_name, last_name, dob, gender } = ctx.request.body;

  ctx.state.client = await Clients.findOneAndUpdate(
    { id: ctx.state.client._id },
    { first_name, last_name, dob, gender },
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

  const redirectTo = ctx.state.l('/dashboard/clients');
  if (ctx.accepts('html')) {
    ctx.redirect(redirectTo);
  } else {
    ctx.body = { redirectTo };
  }
}

async function listShare(ctx) {
  const { members } = await Clients.findById(ctx.state.client._id)
    .populate('members.user', fields.displayName)
    .lean()
    .exec();

  await ctx.render('dashboard/clients/_share', { members, fields });

  ctx.body = {
    message: ctx.body,
    renderModalBodyWithHTML: true
  };
}

async function addMember(ctx) {
  const { body } = ctx.request;

  const newMember = await Users.findOne({
    [fields.displayName]: body.member
  })
    .lean()
    .exec();

  if (!newMember)
    return ctx.throw(Boom.badRequest(ctx.translateError('INVALID_USER')));

  const client = await Clients.findById(ctx.state.client._id);

  client.members.push({ user: newMember._id, group: 'user' });

  ctx.state.client = await client.save({ validateBeforeSave: false });

  await listShare(ctx);
}

async function deleteMember(ctx) {
  const { body } = ctx.request;

  // check that member exists
  const member = ctx.state.client.members.find(
    (member) => member.user && member.user[fields.displayName] === body.member
  );

  if (!member)
    return ctx.throw(
      Boom.badRequest(ctx.translateError('MEMBER_DOES_NOT_EXIST'))
    );

  ctx.state.client = await Clients.findById(ctx.state.client._id)
    .populate('members.user', fields.displayName)
    .exec();
  ctx.state.client.members = ctx.state.client.members.filter(
    (member) => member.user[fields.displayName] !== body.member
  );

  ctx.state.client = await ctx.state.client.save({ validateBeforeSave: false });

  await listShare(ctx);
}

async function editMember(ctx) {
  const { body } = ctx.request;

  // check that group is appropriate
  if (!['owner', 'admin', 'user'].includes(body.group))
    return ctx.throw(Boom.badRequest(ctx.translateError('NOT_A_GROUP_TYPE')));

  // check that member exists
  const member = ctx.state.client.members.find(
    (member) => member.user && member.user[fields.displayName] === body.member
  );

  if (!member)
    return ctx.throw(
      Boom.badRequest(ctx.translateError('MEMBER_DOES_NOT_EXIST'))
    );

  // check that if changing an owner there is still an owner for the client
  if (
    member.group === 'owner' &&
    ctx.state.client.members.filter((member) => member.group === 'owner')
      .length <= 1
  ) {
    return ctx.throw(Boom.badRequest(ctx.translateError('MUST_HAVE_OWNER')));
  }

  ctx.state.client = await Clients.findById(ctx.state.client._id)
    .populate('members.user', fields.displayName)
    .exec();
  ctx.state.client.members.find(
    (member) => member.user && member.user[fields.displayName] === body.member
  ).group = body.group;

  ctx.state.client = await ctx.state.client.save({ validateBeforeSave: false });

  await listShare(ctx);
}

module.exports = {
  list,
  add_client,
  retrieveClients,
  retrieveClient,
  ensureAdmin,
  ensureOwner,
  delete_client,
  settings,
  listShare,
  addMember,
  deleteMember,
  editMember
};
