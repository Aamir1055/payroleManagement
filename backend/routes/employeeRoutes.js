const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Specific routes must come BEFORE parameterized routes
router.get('/', employeeController.getEmployees);
router.get('/next-id', employeeController.getNextEmployeeId);
router.get('/count', employeeController.getEmployeeCount);
router.get('/salary/total', employeeController.getTotalMonthlySalary);
router.get('/summary-by-office', employeeController.getSummaryByOffice);
router.post('/', employeeController.createEmployee);
router.post('/import', upload.single('file'), employeeController.importEmployees);

// Parameterized routes must come AFTER specific routes
router.get('/:employeeId', employeeController.getEmployeeById);
router.put('/:employeeId', employeeController.updateEmployee);
router.delete('/:employeeId', employeeController.deleteEmployee);

module.exports = router;
