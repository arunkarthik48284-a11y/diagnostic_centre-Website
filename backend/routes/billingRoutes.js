const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', billingController.getAllInvoices);
router.get('/:id', billingController.getInvoiceById);
router.put('/:id/pay', authorizeRoles('Admin', 'Receptionist'), billingController.updatePaymentStatus);

module.exports = router;
