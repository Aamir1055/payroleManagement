const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();

// Import middleware
const { requireAuth, requireAdmin, requireManager } = require('./middleware/auth');

// Routes
const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const holidaysRoutes = require('./routes/holidaysRoutes');
const masterRoutes = require('./routes/masterRoutes');

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint (public)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Authentication routes (public)
app.use('/api/auth', authRoutes);

// Protected routes with role-based access
app.use('/api/employees', requireAuth, employeeRoutes);
app.use('/api/attendance', requireAuth, attendanceRoutes);
app.use('/api/payroll', requireManager, payrollRoutes); // Only admin and floor_manager
app.use('/api/holidays', requireManager, holidaysRoutes); // Only admin and floor_manager
app.use('/api/masters', requireAdmin, masterRoutes); // Only admin

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }
  
  // Default error
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  if (process.env.NODE_ENV !== 'production') {
    console.log('\n🔐 API Endpoints:');
    console.log('📍 Health Check: GET /api/health');
    console.log('🔑 Authentication: POST /api/auth/login');
    console.log('👤 Registration: POST /api/auth/register');
    console.log('👥 Employees: GET /api/employees (requires auth)');
    console.log('🏢 Masters: GET /api/masters/* (requires admin)');
    console.log('💰 Payroll: GET /api/payroll/* (requires manager+)');
    console.log('\n🚀 Run migration: npm run migrate');
  }
});
