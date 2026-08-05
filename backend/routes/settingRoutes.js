const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', settingController.getSettings);
router.put('/', authorizeRoles('Admin'), settingController.updateSettings);

module.exports = router;
