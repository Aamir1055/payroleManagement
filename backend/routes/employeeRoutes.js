const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.get('/', employeeController.getEmployees);
router.get('/next-id', employeeController.getNextEmployeeId);
router.get('/count', employeeController.getEmployeeCount); // if not added
router.get('/salary/total', employeeController.getTotalMonthlySalary); // if not added
router.get('/summary-by-office', employeeController.getSummaryByOffice); // ✅ Add this

router.get('/:employeeId', employeeController.getEmployeeById);
router.post('/', employeeController.createEmployee);
router.put('/:employeeId', employeeController.updateEmployee);
router.delete('/:employeeId', employeeController.deleteEmployee);
router.post('/import', upload.single('file'), employeeController.importEmployees);

module.exports = router;
