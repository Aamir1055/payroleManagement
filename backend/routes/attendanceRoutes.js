const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { uploadAttendance } = require('../controllers/attendanceController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `attendance_${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

router.post('/upload', upload.single('file'), uploadAttendance);

module.exports = router;
