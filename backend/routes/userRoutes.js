const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken);
router.use(authorizeRoles('Admin'));

router.get('/', userController.getAllUsers);
router.post('/', userController.createUser);
router.put('/:id/toggle', userController.toggleUserStatus);

module.exports = router;
