const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', testController.getAllTests);
router.get('/categories', testController.getTestCategories);
router.post('/', authorizeRoles('Admin'), testController.createTest);
router.put('/:id', authorizeRoles('Admin'), testController.updateTest);
router.delete('/:id', authorizeRoles('Admin'), testController.deleteTest);

module.exports = router;
