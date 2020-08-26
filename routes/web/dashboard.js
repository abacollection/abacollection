const Router = require('@koa/router');
const render = require('koa-views-render');
const paginate = require('koa-ctx-paginate');

const policies = require('../../helpers/policies');
const web = require('../../app/controllers/web');

const router = new Router({ prefix: '/dashboard' });

router.use(policies.ensureLoggedIn);
router.use(policies.ensureOtp);
router.use(web.breadcrumbs);
router.get('/', render('dashboard'));
//
// clients
//
router.get('/clients', paginate.middleware(10, 50), web.dashboard.clients.list);

router.use(web.dashboard.clients.retrieveClients);

router.put('/clients', web.dashboard.clients.add_client);
//
// client specific routes
//
const clientRouter = new Router({ prefix: '/clients/:client_id' });
clientRouter.use(web.dashboard.clients.retrieveClient);

clientRouter.get('/', render('dashboard/clients/overview'));
clientRouter.post('/', web.dashboard.clients.settings);
clientRouter.delete(
  '/',
  web.dashboard.clients.ensureAdmin,
  web.dashboard.clients.delete_client
);
//
// programs
//
clientRouter.get(
  '/programs',
  paginate.middleware(10, 50),
  web.dashboard.programs.list
);

clientRouter.use(web.dashboard.programs.retrievePrograms);

clientRouter.put('/programs', web.dashboard.programs.addProgram);
//
// program specific routes
//
const programRouter = new Router({ prefix: '/programs/:program_id' });
programRouter.use(web.dashboard.programs.retrieveProgram);

programRouter.post('/', web.dashboard.programs.editProgram);
programRouter.delete(
  '/',
  web.dashboard.clients.ensureAdmin,
  web.dashboard.programs.deleteProgram
);
//
// targets
//
programRouter.get(
  '/targets',
  paginate.middleware(10, 50),
  web.dashboard.targets.list
);

programRouter.use(web.dashboard.targets.retrieveTargets);

programRouter.put('/targets', web.dashboard.targets.addTarget);
//
// target specific routes
//
const targetRouter = new Router({ prefix: '/targets/:target_id' });
targetRouter.use(web.dashboard.targets.retrieveTarget);

targetRouter.post('/', web.dashboard.targets.editTarget);
targetRouter.delete(
  '/',
  web.dashboard.clients.ensureAdmin,
  web.dashboard.targets.deleteTarget
);

targetRouter.get(
  '/',
  web.dashboard.datas.retrieveDatas,
  web.dashboard.targets.getData
);

targetRouter.get(
  '/graph',
  web.dashboard.datas.retrieveGraph,
  web.dashboard.targets.getData
);
//
// data
//
const dataRouter = new Router({ prefix: '/data' });

dataRouter.put('/', web.dashboard.datas.addData);
dataRouter.post('/', web.dashboard.datas.editData);
dataRouter.delete('/', web.dashboard.datas.deleteData);

targetRouter.use(dataRouter.routes());
programRouter.use(targetRouter.routes());
clientRouter.use(programRouter.routes());
router.use(clientRouter.routes());

module.exports = router;
