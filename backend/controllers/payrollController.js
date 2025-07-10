const db = require('../db');

// Create attendance table if it doesn't exist
const createAttendanceTable = () => {
  const createAttendanceTableQuery = `
    CREATE TABLE IF NOT EXISTS Attendance (
      id INT PRIMARY KEY AUTO_INCREMENT,
      employee_id VARCHAR(10) NOT NULL,
      date DATE NOT NULL,
      punch_in TIME,
      punch_out TIME,
      status ENUM('present', 'absent', 'half_day', 'late') DEFAULT 'present',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_employee_date (employee_id, date),
      FOREIGN KEY (employee_id) REFERENCES Employees(employee_id) ON DELETE CASCADE
    )
  `;
  
  db.query(createAttendanceTableQuery, (err) => {
    if (err) {
      console.error('Error creating Attendance table:', err);
    }
  });
};

// Initialize attendance table
createAttendanceTable();

exports.generatePayrollReport = (req, res) => {
  const { month, year } = req.query;

  if (!month || !year) {
    return res.status(400).json({ error: 'Month and year are required' });
  }

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
  const totalWorkingDays = 26;

  const query = `
    SELECT 
      e.employee_id,
      e.name,
      o.name as office,
      p.title as position,
      e.salary as monthlySalary,
      op.duty_hours as dutyHours,
      op.reporting_time as reportingTime,
      3 as allowedLateDays,
      COUNT(a.date) AS presentDays,
      SUM(CASE 
        WHEN a.punch_in IS NOT NULL AND TIME(a.punch_in) > op.reporting_time THEN 1
        ELSE 0
      END) AS lateDays
    FROM Employees e
    LEFT JOIN Offices o ON e.office_id = o.id
    LEFT JOIN Positions p ON e.position_id = p.id
    LEFT JOIN OfficePositions op ON e.office_id = op.office_id AND e.position_id = op.position_id
    LEFT JOIN Attendance a ON e.employee_id = a.employee_id 
      AND a.date BETWEEN ? AND ?
      AND a.status IN ('present', 'late')
    WHERE e.status = 1
    GROUP BY e.employee_id
  `;

  db.query(query, [startDate, endDate], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    const report = rows.map(emp => {
      const perDaySalary = emp.monthlySalary / totalWorkingDays;
      const presentDays = emp.presentDays || 0;
      const absentDays = totalWorkingDays - presentDays;
      const lateDays = emp.lateDays || 0;
      const allowedLateDays = emp.allowedLateDays || 3;

      // ✅ Half Day Logic (1 half day per extra late day)
      const extraLateDays = Math.max(0, lateDays - allowedLateDays);
      const halfDays = extraLateDays;

      // ✅ Leave Deduction Logic
      const leaves = absentDays;
      let leaveDeduction = 0;

      if (leaves <= 2) {
        leaveDeduction = leaves * perDaySalary;
      } else {
        const excessLeaves = leaves - 2;
        leaveDeduction = (2 * perDaySalary) + (excessLeaves * 2 * perDaySalary);
      }

      const halfDayDeduction = halfDays * (perDaySalary / 2);
      const totalDeductions = leaveDeduction + halfDayDeduction;
      const netSalary = emp.monthlySalary - totalDeductions;

      return {
        employeeId: emp.employee_id,
        name: emp.name,
        office: emp.office || 'N/A',
        position: emp.position || 'N/A',
        monthlySalary: Number(emp.monthlySalary).toFixed(2),
        presentDays,
        absentDays,
        lateDays,
        allowedLateDays,
        halfDays,
        leaves,
        perDaySalary: perDaySalary.toFixed(2),
        leaveDeduction: leaveDeduction.toFixed(2),
        halfDayDeduction: halfDayDeduction.toFixed(2),
        deductions: totalDeductions.toFixed(2),
        netSalary: netSalary.toFixed(2)
      };
    });

    res.status(200).json(report);
  });
};

// ✅ Get payroll summary
exports.getPayrollSummary = (req, res) => {
  const { month, year } = req.query;

  if (!month || !year) {
    return res.status(400).json({ error: 'Month and year are required' });
  }

  const query = `
    SELECT 
      COUNT(*) as totalEmployees,
      SUM(e.salary) as totalMonthlySalary,
      COUNT(DISTINCT o.id) as totalOffices
    FROM Employees e
    LEFT JOIN Offices o ON e.office_id = o.id
    WHERE e.status = 1
  `;

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    const summary = results[0];
    res.json({
      totalEmployees: summary.totalEmployees || 0,
      totalMonthlySalary: Number(summary.totalMonthlySalary || 0).toFixed(2),
      totalOffices: summary.totalOffices || 0,
      month: parseInt(month),
      year: parseInt(year)
    });
  });
};

// ✅ Save/Update payroll data
exports.savePayroll = (req, res) => {
  const { payrollData } = req.body;

  if (!payrollData || !Array.isArray(payrollData)) {
    return res.status(400).json({ error: 'Invalid payroll data' });
  }

  // Start transaction
  db.beginTransaction((err) => {
    if (err) return res.status(500).json({ error: err.message });

    let processedCount = 0;
    let errors = [];

    payrollData.forEach((record, index) => {
      const {
        employeeId, month, year, presentDays, halfDays, lateDays,
        leaves, deductions, netSalary, monthlySalary
      } = record;

      const insertQuery = `
        INSERT INTO Payroll 
        (employee_id, month, year, present_days, half_days, late_days, leaves, 
         deductions, gross_salary, net_salary, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'calculated')
        ON DUPLICATE KEY UPDATE
          present_days = VALUES(present_days),
          half_days = VALUES(half_days),
          late_days = VALUES(late_days),
          leaves = VALUES(leaves),
          deductions = VALUES(deductions),
          gross_salary = VALUES(gross_salary),
          net_salary = VALUES(net_salary),
          status = 'calculated'
      `;

      db.query(insertQuery, [
        employeeId, month, year, presentDays, halfDays, lateDays,
        leaves, deductions, monthlySalary, netSalary
      ], (err) => {
        if (err) {
          errors.push(`Error saving payroll for employee ${employeeId}: ${err.message}`);
        }
        processedCount++;
        checkCompletion();
      });
    });

    function checkCompletion() {
      if (processedCount === payrollData.length) {
        if (errors.length > 0) {
          return db.rollback(() => {
            res.status(500).json({ error: 'Some payroll records failed to save', details: errors });
          });
        }
        
        db.commit((err) => {
          if (err) {
            return db.rollback(() => {
              res.status(500).json({ error: err.message });
            });
          }
          res.json({ 
            message: 'Payroll data saved successfully',
            recordsSaved: payrollData.length
          });
        });
      }
    }
  });
};
