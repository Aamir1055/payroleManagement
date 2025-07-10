const db = require('../db');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// ✅ Generate next employee ID
const generateNextEmployeeId = async () => {
  return new Promise((resolve, reject) => {
    db.query(
      'SELECT employee_id FROM Employees WHERE employee_id REGEXP "^EMP[0-9]+$" ORDER BY CAST(SUBSTRING(employee_id, 4) AS UNSIGNED) DESC LIMIT 1',
      (err, results) => {
        if (err) {
          reject(err);
          return;
        }
        
        let nextNumber = 1;
        if (results.length > 0) {
          const lastId = results[0].employee_id;
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

// ✅ Get all employees with office and position details
exports.getEmployees = (req, res) => {
  const query = `
    SELECT 
      e.*,
      o.name as office_name,
      p.title as position_name,
      op.reporting_time,
      op.duty_hours
    FROM Employees e
    LEFT JOIN Offices o ON e.office_id = o.id
    LEFT JOIN Positions p ON e.position_id = p.id
    LEFT JOIN OfficePositions op ON e.office_id = op.office_id AND e.position_id = op.position_id
    ORDER BY e.employee_id
  `;
  
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

// ✅ Get employee by ID
exports.getEmployeeById = (req, res) => {
  const { employeeId } = req.params;
  const query = `
    SELECT 
      e.*,
      o.name as office_name,
      p.title as position_name,
      op.reporting_time,
      op.duty_hours
    FROM Employees e
    LEFT JOIN Offices o ON e.office_id = o.id
    LEFT JOIN Positions p ON e.position_id = p.id
    LEFT JOIN OfficePositions op ON e.office_id = op.office_id AND e.position_id = op.position_id
    WHERE e.employee_id = ?
  `;
  
  db.query(query, [employeeId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ message: 'Employee not found' });
    res.json(results[0]);
  });
};

// ✅ Create new employee with auto-generated ID
exports.createEmployee = async (req, res) => {
  try {
    const {
      name, email, phone, office_id, position_id, salary, hire_date, status
    } = req.body;

    // Auto-generate employee ID
    const employee_id = await generateNextEmployeeId();

    // Validate required fields
    if (!name || !email || !office_id || !position_id || !salary || !hire_date) {
      return res.status(400).json({ error: 'Missing required fields: name, email, office_id, position_id, salary, hire_date' });
    }

    const query = `
      INSERT INTO Employees 
      (employee_id, name, email, phone, office_id, position_id, salary, hire_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      employee_id, name, email, phone || '', office_id, position_id,
      salary, hire_date, status !== undefined ? status : 1
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
        employee_id: employee_id,
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
  delete updates.employee_id;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  db.query('UPDATE Employees SET ? WHERE employee_id = ?', [updates, employeeId], (err, result) => {
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

  db.query('DELETE FROM Employees WHERE employee_id = ?', [employeeId], (err, result) => {
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
      
      // Auto-generate ID (Excel import shouldn't include employee ID)
      const employee_id = await generateNextEmployeeId();

      // Map Excel columns to database fields
      processedData.push([
        employee_id,
        row['Name'] || row['Full Name'] || '',
        row['Email'] || '',
        row['Phone'] || '',
        parseInt(row['Office ID']) || null,
        parseInt(row['Position ID']) || null,
        Number(row['Salary']) || 0,
        row['Hire Date'] || row['Joining Date'] || '',
        row['Status']?.toLowerCase() === 'inactive' ? 0 : 1
      ]);
    }

    const query = `
      INSERT INTO Employees
      (employee_id, name, email, phone, office_id, position_id, salary, hire_date, status)
      VALUES ?
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        email = VALUES(email),
        phone = VALUES(phone),
        office_id = VALUES(office_id),
        position_id = VALUES(position_id),
        salary = VALUES(salary),
        hire_date = VALUES(hire_date),
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

// ✅ Export employees template (for Excel download)
exports.exportEmployeesTemplate = (req, res) => {
  // Get offices and positions for reference
  const officesQuery = 'SELECT id, name FROM Offices ORDER BY name';
  const positionsQuery = 'SELECT id, title FROM Positions ORDER BY title';
  
  db.query(officesQuery, (err, offices) => {
    if (err) return res.status(500).json({ error: err.message });
    
    db.query(positionsQuery, (err, positions) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // Create sample template data
      const templateData = [
        {
          'Name': 'John Doe',
          'Email': 'john.doe@example.com',
          'Phone': '+971501234567',
          'Office ID': offices.length > 0 ? offices[0].id : 1,
          'Position ID': positions.length > 0 ? positions[0].id : 1,
          'Salary': 5000,
          'Hire Date': '2025-01-01',
          'Status': 'active'
        }
      ];
      
      // Create workbook
      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Employees');
      
      // Create reference sheets
      const officeWs = XLSX.utils.json_to_sheet(offices.map(o => ({ 'Office ID': o.id, 'Office Name': o.name })));
      const positionWs = XLSX.utils.json_to_sheet(positions.map(p => ({ 'Position ID': p.id, 'Position Title': p.title })));
      
      XLSX.utils.book_append_sheet(wb, officeWs, 'Office Reference');
      XLSX.utils.book_append_sheet(wb, positionWs, 'Position Reference');
      
      // Generate buffer
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Disposition', 'attachment; filename=employee_template.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    });
  });
};

// ✅ Get total employee count
exports.getEmployeeCount = (req, res) => {
  db.query('SELECT COUNT(*) AS total FROM Employees WHERE status = 1', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ total: results[0].total });
  });
};

// ✅ Get total monthly salary
exports.getTotalMonthlySalary = (req, res) => {
  db.query('SELECT SUM(salary) AS totalSalary FROM Employees WHERE status = 1', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    const totalSalary = results[0].totalSalary || 0;
    res.json({ totalSalary });
  });
};

// ✅ Enhanced Summary by Office - Shows all offices including empty ones
exports.getSummaryByOffice = (req, res) => {
  const query = `
    SELECT 
      o.id as office_id,
      o.name as office,
      COALESCE(emp_summary.totalEmployees, 0) as totalEmployees,
      COALESCE(emp_summary.totalSalary, 0) as totalSalary
    FROM Offices o
    LEFT JOIN (
      SELECT 
        office_id, 
        COUNT(*) AS totalEmployees, 
        SUM(salary) AS totalSalary 
      FROM Employees 
      WHERE status = 1
      GROUP BY office_id
    ) emp_summary ON o.id = emp_summary.office_id
    ORDER BY o.name
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};











