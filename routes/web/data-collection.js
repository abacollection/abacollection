const Router = require('@koa/router');

const policies = require('../../helpers/policies');
const web = require('../../app/controllers/web');

const router = new Router({ prefix: '/collection/:client_id' });

router.use(policies.ensureLoggedIn);
router.use(policies.ensureOtp);
router.use(web.dashboard.clients.retrieveClients);
router.use(web.dashboard.clients.retrieveClient);
router.use(web.dashboard.programs.retrievePrograms);
router.use(web.dataCollection.retrieveTargets);

router.get('/', web.dataCollection.getUpdates);
router.post('/', web.dataCollection.update);

module.exports = router;
