const db = require('../db');

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
      e.employeeId,
      e.fullName,
      e.office,
      e.position,
      e.monthlySalary,
      e.dutyHours,
      e.reportingTime,
      e.allowedLateDays,
      COUNT(a.date) AS presentDays,
      SUM(CASE 
        WHEN TIME(a.punchIn) > e.reportingTime THEN 1
        ELSE 0
      END) AS lateDays
    FROM employees e
    LEFT JOIN attendance a 
      ON e.employeeId = a.employeeId 
      AND a.date BETWEEN ? AND ?
    GROUP BY e.employeeId
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
      const allowedLateDays = emp.allowedLateDays || 0;

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
        employeeId: emp.employeeId,
        name: emp.fullName,
        office: emp.office,
        position: emp.position,
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
