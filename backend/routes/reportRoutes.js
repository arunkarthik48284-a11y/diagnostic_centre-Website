const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(authenticateToken);

router.get('/', reportController.getAllReports);
router.get('/:id', reportController.getReportById);
router.post('/', authorizeRoles('Admin', 'Lab Technician'), upload.single('report_file'), reportController.createReport);

module.exports = router;
