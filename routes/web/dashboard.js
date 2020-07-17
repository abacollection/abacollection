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
//
// client specific routes
//
const clientRouter = new Router({ prefix: '/clients/:client_id' });
clientRouter.use(policies.ensureLoggedIn);
clientRouter.use(web.breadcrumbs);
clientRouter.use(web.dashboard.clients.retrieveClients);
clientRouter.use(web.dashboard.clients.retrieveClient);
clientRouter.get('/', render('dashboard/clients/overview'));
clientRouter.get('/settings', render('dashboard/clients/settings'));
clientRouter.post('/settings', web.dashboard.clients.settings);
clientRouter.delete(
  '/',
  web.dashboard.clients.ensureAdmin,
  web.dashboard.clients.delete_client
);
//
// programs
//
clientRouter.use(web.dashboard.programs.retrievePrograms);
clientRouter.get(
  '/programs',
  paginate.middleware(10, 50),
  web.dashboard.programs.list
);

router.use(clientRouter.routes());

module.exports = router;
