const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/login', authController.login);
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, upload.single('avatar'), authController.updateProfile);
router.put('/change-password', authenticateToken, authController.changePassword);

module.exports = router;
