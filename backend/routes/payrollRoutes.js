// routes/payrollRoutes.js
const express = require('express');
const router = express.Router();
const { generatePayrollReport } = require('../controllers/payrollController');

router.get('/report', generatePayrollReport);

module.exports = router;
