const db = require('../db');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// ✅ Generate next employee ID
const generateNextEmployeeId = async () => {
  return new Promise((resolve, reject) => {
    db.query(
      'SELECT employeeId FROM employees WHERE employeeId REGEXP "^EMP[0-9]+$" ORDER BY CAST(SUBSTRING(employeeId, 4) AS UNSIGNED) DESC LIMIT 1',
      (err, results) => {
        if (err) {
          reject(err);
          return;
        }
        
        let nextNumber = 1;
        if (results.length > 0) {
          const lastId = results[0].employeeId;
          const lastNumber = parseInt(lastId.substring(3));
          nextNumber = lastNumber + 1;
        }
        
        const nextId = `EMP${nextNumber.toString().padStart(3, '0')}`;
        resolve(nextId);
      }
    );
  });
};

// ✅ Get next employee ID endpoint
exports.getNextEmployeeId = (req, res) => {
  generateNextEmployeeId()
    .then(nextId => {
      res.json({ nextEmployeeId: nextId });
    })
    .catch(err => {
      res.status(500).json({ error: err.message });
    });
};

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

// ✅ Create new employee with auto-generated ID
exports.createEmployee = async (req, res) => {
  try {
    const {
      fullName, email, office, position,
      monthlySalary, dutyHours, reportingTime,
      allowedLateDays, joiningDate, status
    } = req.body;

    // Auto-generate employee ID if not provided
    let { employeeId } = req.body;
    if (!employeeId || employeeId.trim() === '') {
      employeeId = await generateNextEmployeeId();
    }

    // Validate required fields
    if (!fullName || !email || !office || !position || !monthlySalary || !joiningDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const query = `
      INSERT INTO employees 
      (employeeId, fullName, email, office, position, monthlySalary, dutyHours, reportingTime, allowedLateDays, joiningDate, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      employeeId, fullName, email, office, position,
      monthlySalary, dutyHours || 8, reportingTime || '09:00',
      allowedLateDays || 3, joiningDate, status || 'active'
    ];

    db.query(query, values, (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ error: 'Employee ID or email already exists' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ 
        message: 'Employee created successfully', 
        employeeId: employeeId,
        id: result.insertId 
      });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Update employee
exports.updateEmployee = (req, res) => {
  const { employeeId } = req.params;
  const updates = req.body;

  // Don't allow updating the employee ID
  delete updates.employeeId;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  db.query('UPDATE employees SET ? WHERE employeeId = ?', [updates, employeeId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json({ message: 'Employee updated successfully' });
  });
};

// ✅ Delete employee
exports.deleteEmployee = (req, res) => {
  const { employeeId } = req.params;

  db.query('DELETE FROM employees WHERE employeeId = ?', [employeeId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json({ message: 'Employee deleted successfully' });
  });
};

// ✅ Import employees via Excel upload
exports.importEmployees = async (req, res) => {
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

    // Process each row and auto-generate IDs if needed
    const processedData = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      let employeeId = row['Employee ID']?.toString().trim();
      
      // Auto-generate ID if not provided or empty
      if (!employeeId || employeeId === '') {
        employeeId = await generateNextEmployeeId();
      }

      processedData.push([
        employeeId,
        row['Full Name'] || '',
        row['Email'] || '',
        row['Office'] || '',
        row['Position'] || '',
        Number(row['Monthly Salary (AED)']) || 0,
        Number(row['Duty Hours']) || 8,
        row['Reporting Time'] || '09:00',
        Number(row['Allowed Late Days']) || 3,
        row['Joining Date'] || '',
        row['Status']?.toLowerCase() === 'inactive' ? 'inactive' : 'active'
      ]);
    }

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

    db.query(query, [processedData], (err, result) => {
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
  db.query('SELECT COUNT(*) AS total FROM employees WHERE status = "active"', (err, results) => {
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

// ✅ Enhanced Summary by Office - Shows all offices including empty ones
exports.getSummaryByOffice = (req, res) => {
  const query = `
    SELECT 
      om.name as office,
      COALESCE(emp_summary.totalEmployees, 0) as totalEmployees,
      COALESCE(emp_summary.totalSalary, 0) as totalSalary
    FROM OfficeMaster om
    LEFT JOIN (
      SELECT 
        office, 
        COUNT(*) AS totalEmployees, 
        SUM(monthlySalary) AS totalSalary 
      FROM employees 
      WHERE status = 'active'
      GROUP BY office
    ) emp_summary ON om.name = emp_summary.office
    ORDER BY om.name
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};











