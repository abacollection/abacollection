const Router = require('@koa/router');
const render = require('koa-views-render');

const policies = require('../../helpers/policies');
const web = require('../../app/controllers/web');

const router = new Router({ prefix: '/dashboard' });

router.use(policies.ensureLoggedIn);
router.use(web.breadcrumbs);
router.get('/', render('dashboard'));
router.get('/clients', render('dashboard/clients'));

module.exports = router;
