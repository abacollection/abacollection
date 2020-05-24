const paginate = require('koa-ctx-paginate');

const { Clients } = require('../../../models');
const config = require('../../../../config');

async function list(ctx) {
  // TODO add limit to only allow them to see clients they have permissions for
  const [clients, itemCount] = await Promise.all([
    Clients.find({})
      .limit(ctx.query.limit)
      .skip(ctx.paginate.skip)
      // .lean()
      // .sort('last_name')
      .exec(),
    Clients.countDocuments({})
  ]);

  const pageCount = Math.ceil(itemCount / ctx.query.limit);

  await ctx.render('dashboard/clients', {
    clients,
    pageCount,
    itemCount,
    pages: paginate.getArrayPages(ctx)(3, pageCount, ctx.query.page)
  });
}

module.exports = { list };
