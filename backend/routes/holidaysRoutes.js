const express = require('express');
const router = express.Router();
const holidaysController = require('../controllers/holidaysController');

router.get('/', holidaysController.getHolidays);
router.post('/', holidaysController.addHoliday);
router.delete('/:id', holidaysController.deleteHoliday); // Changed from holiday_date to id

module.exports = router;