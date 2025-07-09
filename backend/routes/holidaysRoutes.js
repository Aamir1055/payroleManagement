const express = require('express');
const router = express.Router();
const holidaysController = require('../controllers/holidaysController');

// GET all holidays
router.get('/', holidaysController.getAllHolidays);

// GET holidays by month/year
router.get('/month', holidaysController.getHolidaysByMonth);

// GET working days calculation
router.get('/working-days', holidaysController.getWorkingDays);

// GET upcoming holidays
router.get('/upcoming', holidaysController.getUpcomingHolidays);

// POST add new holiday
router.post('/', holidaysController.addHoliday);

// PUT update holiday
router.put('/:id', holidaysController.updateHoliday);

// DELETE holiday
router.delete('/:id', holidaysController.deleteHoliday);

module.exports = router;