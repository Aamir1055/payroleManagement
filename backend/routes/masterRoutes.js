const express = require('express');
const router = express.Router();
const masterController = require('../controllers/masterController');

// -------- OFFICE ROUTES --------
router.get('/offices', masterController.getAllOffices);
router.post('/offices', masterController.createOffice);

// -------- POSITION ROUTES --------
router.get('/positions', masterController.getAllPositions);
router.post('/positions', masterController.createPosition);

module.exports = router;
