const db = require('../db');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// ✅ Get all employees
exports.getEmployees = (req, res) => {
  db.query('SELECT * FROM employees', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

// ✅ Get employee by ID
exports.getEmployeeById = (req, res) => {
  const { employeeId } = req.params;
  db.query('SELECT * FROM employees WHERE employeeId = ?', [employeeId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ message: 'Employee not found' });
    res.json(results[0]);
  });
};

// ✅ Create new employee
exports.createEmployee = (req, res) => {
  const {
    employeeId, fullName, email, office, position,
    monthlySalary, dutyHours, reportingTime,
    allowedLateDays, joiningDate, status
  } = req.body;

  const query = `
    INSERT INTO employees 
    (employeeId, fullName, email, office, position, monthlySalary, dutyHours, reportingTime, allowedLateDays, joiningDate, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    employeeId, fullName, email, office, position,
    monthlySalary, dutyHours, reportingTime,
    allowedLateDays, joiningDate, status
  ];

  db.query(query, values, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'Employee created successfully', id: employeeId });
  });
};

// ✅ Update employee
exports.updateEmployee = (req, res) => {
  const { employeeId } = req.params;
  const updates = req.body;

  db.query('UPDATE employees SET ? WHERE employeeId = ?', [updates, employeeId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Employee updated successfully' });
  });
};

// ✅ Delete employee
exports.deleteEmployee = (req, res) => {
  const { employeeId } = req.params;

  db.query('DELETE FROM employees WHERE employeeId = ?', [employeeId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Employee deleted successfully' });
  });
};

// ✅ Import employees via Excel upload
exports.importEmployees = (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const filePath = path.resolve(req.file.path);

  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    if (!Array.isArray(data) || data.length === 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Invalid or empty Excel file.' });
    }

    const values = data.map(row => ([
      row['Employee ID']?.toString().trim() || '',
      row['Full Name'] || '',
      row['Email'] || '',
      row['Office'] || '',
      row['Position'] || '',
      Number(row['Monthly Salary (AED)']) || 0,
      Number(row['Duty Hours']) || 8,
      row['Reporting Time'] || '09:00',
      Number(row['Allowed Late Days']) || 0,
      row['Joining Date'] || '',
      row['Status']?.toLowerCase() === 'inactive' ? 'inactive' : 'active'
    ]));

    const query = `
      INSERT INTO employees
      (employeeId, fullName, email, office, position, monthlySalary, dutyHours, reportingTime, allowedLateDays, joiningDate, status)
      VALUES ?
      ON DUPLICATE KEY UPDATE
        fullName = VALUES(fullName),
        email = VALUES(email),
        office = VALUES(office),
        position = VALUES(position),
        monthlySalary = VALUES(monthlySalary),
        dutyHours = VALUES(dutyHours),
        reportingTime = VALUES(reportingTime),
        allowedLateDays = VALUES(allowedLateDays),
        joiningDate = VALUES(joiningDate),
        status = VALUES(status)
    `;

    db.query(query, [values], (err, result) => {
      fs.unlinkSync(filePath);
      if (err) return res.status(500).json({ error: err.message });
      res.status(200).json({
        message: 'Employees imported successfully',
        inserted: result.affectedRows
      });
    });
  } catch (err) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return res.status(500).json({ error: 'Failed to process the file. ' + err.message });
  }
};

// ✅ Get total employee count
exports.getEmployeeCount = (req, res) => {
  db.query('SELECT COUNT(*) AS total FROM employees', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ total: results[0].total });
  });
};

// ✅ Get total monthly salary
exports.getTotalMonthlySalary = (req, res) => {
  db.query('SELECT SUM(monthlySalary) AS totalSalary FROM employees WHERE status = "active"', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    const totalSalary = results[0].totalSalary || 0;
    res.json({ totalSalary });
  });
};




// ✅ Summary by Office
exports.getSummaryByOffice = (req, res) => {
  const query = `
    SELECT office, 
           COUNT(*) AS totalEmployees, 
           SUM(monthlySalary) AS totalSalary 
    FROM employees 
    WHERE status = 'active'
    GROUP BY office
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};











