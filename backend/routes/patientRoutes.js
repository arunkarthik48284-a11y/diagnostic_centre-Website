const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', patientController.getAllPatients);
router.get('/:id', patientController.getPatientById);
router.post('/', authorizeRoles('Admin', 'Receptionist'), patientController.createPatient);
router.put('/:id', authorizeRoles('Admin', 'Receptionist'), patientController.updatePatient);
router.delete('/:id', authorizeRoles('Admin'), patientController.deletePatient);

module.exports = router;
