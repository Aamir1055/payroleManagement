const express = require('express');
const router = express.Router();
const db = require('../db');

// Get employee attendance summary for a specific month/year
router.get('/employee-summary', async (req, res) => {
  try {
    const { month, year } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year parameters are required' });
    }

    const query = `
      SELECT 
        e.employee_id as employeeId,
        e.full_name as name,
        e.office,
        e.position,
        COUNT(CASE WHEN a.status IN ('present', 'late') THEN 1 END) as presentDays,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absentDays,
        COUNT(CASE WHEN a.status = 'late' THEN 1 END) as lateDays,
        COUNT(a.date) as totalDays,
        ROUND(
          (COUNT(CASE WHEN a.status IN ('present', 'late') THEN 1 END) / COUNT(a.date)) * 100, 
          1
        ) as attendancePercentage
      FROM Employees e
      LEFT JOIN Attendance a ON e.employee_id = a.employee_id 
        AND MONTH(a.date) = ? 
        AND YEAR(a.date) = ?
      WHERE e.status = 1
      GROUP BY e.employee_id, e.full_name, e.office, e.position
      ORDER BY e.full_name
    `;

    const [results] = await db.query(query, [month, year]);
    res.json(results);
  } catch (error) {
    console.error('Error fetching employee summary:', error);
    res.status(500).json({ error: 'Failed to fetch employee attendance summary' });
  }
});

// Get detailed attendance for a specific employee
router.get('/employee-detail/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month, year } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year parameters are required' });
    }

    // Get employee information
    const [employeeInfo] = await db.query(`
      SELECT employee_id as employeeId, full_name as name, office, position, reporting_time as reportingTime
      FROM Employees 
      WHERE employee_id = ? AND status = 1
    `, [employeeId]);

    if (employeeInfo.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Get attendance details for the month
    const [attendanceData] = await db.query(`
      SELECT 
        DATE(date) as date,
        punch_in as punchIn,
        punch_out as punchOut,
        status,
        CASE 
          WHEN status = 'late' THEN true 
          ELSE false 
        END as isLate,
        CASE 
          WHEN status = 'late' AND punch_in IS NOT NULL THEN 
            TIMESTAMPDIFF(MINUTE, 
              CONCAT(DATE(date), ' ', ?), 
              CONCAT(DATE(date), ' ', punch_in)
            )
          ELSE 0 
        END as lateMinutes
      FROM Attendance 
      WHERE employee_id = ? 
        AND MONTH(date) = ? 
        AND YEAR(date) = ?
      ORDER BY date
    `, [employeeInfo[0].reportingTime, employeeId, month, year]);

    // Calculate summary
    const presentDays = attendanceData.filter(day => ['present', 'late'].includes(day.status)).length;
    const absentDays = attendanceData.filter(day => day.status === 'absent').length;
    const lateDays = attendanceData.filter(day => day.status === 'late').length;
    const totalDays = attendanceData.length;
    const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    const response = {
      ...employeeInfo[0],
      attendance: attendanceData,
      summary: {
        presentDays,
        absentDays,
        lateDays,
        totalDays,
        attendancePercentage
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching employee detail:', error);
    res.status(500).json({ error: 'Failed to fetch employee attendance details' });
  }
});

module.exports = router;