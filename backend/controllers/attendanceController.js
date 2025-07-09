const xlsx = require('xlsx');
const fs = require('fs');
const db = require('../db');

exports.uploadAttendance = (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    const attendanceRecords = data.map(row => {
      const excelDate = row['Date'];
      const jsDate = typeof excelDate === 'number'
        ? new Date((excelDate - 25569) * 86400 * 1000)  // Excel serial date to JS date
        : new Date(excelDate);

      const formatTime = (value) => {
        if (typeof value === 'number') {
          const date = new Date(Math.round((value - Math.floor(value)) * 86400 * 1000));
          return date.toISOString().split('T')[1].substring(0, 8);
        }
        return value;
      };

      return [
        row['Employee ID'],
        jsDate.toISOString().split('T')[0],
        formatTime(row['Punch In']),
        formatTime(row['Punch Out'])
      ];
    });

    const sql = `
      INSERT INTO attendance (employeeId, date, punchIn, punchOut)
      VALUES ?
      ON DUPLICATE KEY UPDATE
        punchIn = VALUES(punchIn),
        punchOut = VALUES(punchOut)
    `;

    db.query(sql, [attendanceRecords], (err, result) => {
      fs.unlinkSync(req.file.path); // Delete uploaded file

      if (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
      }

      return res.status(200).json({
        message: '✅ Attendance uploaded successfully',
        affectedRows: result.affectedRows,
      });
    });
  } catch (err) {
    if (req.file?.path) fs.unlinkSync(req.file.path);
    return res.status(500).json({ error: 'Failed to process file', details: err.message });
  }
};
