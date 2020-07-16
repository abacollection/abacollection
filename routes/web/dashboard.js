const Router = require('@koa/router');
const render = require('koa-views-render');
const paginate = require('koa-ctx-paginate');

const policies = require('../../helpers/policies');
const web = require('../../app/controllers/web');

const router = new Router({ prefix: '/dashboard' });

router.use(policies.ensureLoggedIn);
router.use(web.breadcrumbs);
router.use(web.dashboard.clients.retrieveClients);
router.get('/', render('dashboard'));

//
// clients
//

router.get('/clients', paginate.middleware(10, 50), web.dashboard.clients.list);
router.put('/clients', web.dashboard.clients.add_client);
router.get(
  '/clients/:client_id/settings',
  web.dashboard.clients.retrieveClient,
  render('dashboard/clients/settings')
);
router.delete(
  '/clients/:client_id',
  web.dashboard.clients.retrieveClient,
  web.dashboard.clients.ensureAdmin,
  web.dashboard.clients.delete_client
);

module.exports = router;
