const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// ✅ Verify JWT Token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(403).json({ error: 'Invalid token' });
    }

    // Verify user still exists and is active
    db.query('SELECT id, username, role FROM Users WHERE id = ?', [user.userId], (dbErr, results) => {
      if (dbErr) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length === 0) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Add user info to request
      req.user = {
        userId: user.userId,
        username: user.username,
        role: user.role
      };
      next();
    });
  });
};

// ✅ Role-based Access Control
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.role;
    
    // Convert single role to array for consistency
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    if (!roles.includes(userRole)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions', 
        required: roles,
        current: userRole 
      });
    }

    next();
  };
};

// ✅ Admin only access
const requireAdmin = requireRole(['admin']);

// ✅ Admin or HR access
const requireHR = requireRole(['admin', 'hr']);

// ✅ Admin, HR, or Floor Manager access
const requireManager = requireRole(['admin', 'hr', 'floor_manager']);

// ✅ All authenticated users
const requireAuth = verifyToken;

// ✅ Optional authentication (for public endpoints that can benefit from user context)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(); // Continue without user context
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err) {
      req.user = user;
    }
    next();
  });
};

module.exports = {
  verifyToken,
  requireRole,
  requireAdmin,
  requireHR,
  requireManager,
  requireAuth,
  optionalAuth
};