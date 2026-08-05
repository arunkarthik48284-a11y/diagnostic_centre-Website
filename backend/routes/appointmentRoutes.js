const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', appointmentController.getAllAppointments);
router.get('/:id', appointmentController.getAppointmentById);
router.post('/', authorizeRoles('Admin', 'Receptionist'), appointmentController.createAppointment);
router.put('/:id/status', authorizeRoles('Admin', 'Receptionist', 'Lab Technician'), appointmentController.updateStatus);
router.put('/:id/cancel', authorizeRoles('Admin', 'Receptionist'), appointmentController.cancelAppointment);

module.exports = router;
