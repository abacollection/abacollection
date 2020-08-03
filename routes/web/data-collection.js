const Router = require('@koa/router');
const render = require('koa-views-render');

const policies = require('../../helpers/policies');
const web = require('../../app/controllers/web');

const router = new Router({ prefix: '/collection' });

router.use(policies.ensureLoggedIn);
router.use(policies.ensureOtp);

router.get(
  '/:client_id',
  web.dashboard.clients.retrieveClients,
  web.dashboard.clients.retrieveClient,
  web.dashboard.programs.retrievePrograms,
  web.dataCollection.retrieveTargets,
  render('data-collection')
);

module.exports = router;
