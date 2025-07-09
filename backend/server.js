const express = require('express');
const app = express();
const cors = require('cors');

// Routes
const employeeRoutes = require('./routes/employeeRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const holidaysRoutes = require('./routes/holidaysRoutes');
const masterRoutes = require('./routes/masterRoutes');

// Middleware
app.use(cors());
app.use(express.json());

// Register routes
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/holidays', holidaysRoutes);
app.use('/api/masters', masterRoutes);

// Server
app.listen(5000, () => {
  console.log('Server running on port 5000');
});
