const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRY = '24h';

// ✅ Login with optional 2FA
exports.login = async (req, res) => {
  const { username, password, twoFactorCode } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    // Find user
    db.query('SELECT * FROM Users WHERE username = ?', [username], async (err, users) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      
      if (users.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = users[0];

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check 2FA if enabled
      if (user.two_factor_enabled) {
        if (!twoFactorCode) {
          return res.status(200).json({ 
            requiresTwoFactor: true,
            message: 'Two-factor authentication code required' 
          });
        }

        const verified = speakeasy.totp.verify({
          secret: user.two_factor_secret,
          encoding: 'base32',
          token: twoFactorCode,
          window: 2
        });

        if (!verified) {
          return res.status(401).json({ error: 'Invalid two-factor authentication code' });
        }
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          username: user.username, 
          role: user.role,
          employeeId: user.employee_id 
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          employeeId: user.employee_id,
          twoFactorEnabled: user.two_factor_enabled
        }
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// ✅ Generate 2FA setup QR code
exports.generate2FASetup = async (req, res) => {
  try {
    const { userId } = req.user; // From auth middleware

    // Get user details
    db.query('SELECT username FROM Users WHERE id = ?', [userId], async (err, users) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      
      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = users[0];

      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `Payroll System (${user.username})`,
        issuer: 'Payroll Management System',
        length: 32
      });

      // Store secret temporarily (not enabled yet)
      db.query(
        'UPDATE Users SET two_factor_secret = ? WHERE id = ?',
        [secret.base32, userId],
        async (err) => {
          if (err) return res.status(500).json({ error: 'Failed to store secret' });

          // Generate QR code
          const qrCodeUrl = speakeasy.otpauthURL({
            secret: secret.base32,
            label: user.username,
            issuer: 'Payroll System',
            encoding: 'base32'
          });

          try {
            const qrCodeImage = await QRCode.toDataURL(qrCodeUrl);
            
            res.json({
              qrCode: qrCodeImage,
              secret: secret.base32,
              backupCodes: [
                // Generate some backup codes (optional)
                Math.random().toString(36).substr(2, 8).toUpperCase(),
                Math.random().toString(36).substr(2, 8).toUpperCase(),
                Math.random().toString(36).substr(2, 8).toUpperCase()
              ]
            });
          } catch (qrError) {
            console.error('QR Code generation error:', qrError);
            res.status(500).json({ error: 'Failed to generate QR code' });
          }
        }
      );
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ error: 'Failed to setup 2FA' });
  }
};

// ✅ Verify and enable 2FA
exports.verify2FASetup = async (req, res) => {
  const { token } = req.body;
  const { userId } = req.user;

  if (!token) {
    return res.status(400).json({ error: 'Verification token is required' });
  }

  try {
    // Get user's secret
    db.query('SELECT two_factor_secret FROM Users WHERE id = ?', [userId], (err, users) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      
      if (users.length === 0 || !users[0].two_factor_secret) {
        return res.status(400).json({ error: 'No 2FA setup found. Please generate setup first.' });
      }

      const secret = users[0].two_factor_secret;

      // Verify the token
      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 2
      });

      if (!verified) {
        return res.status(400).json({ error: 'Invalid verification code' });
      }

      // Enable 2FA for user
      db.query(
        'UPDATE Users SET two_factor_enabled = TRUE WHERE id = ?',
        [userId],
        (err) => {
          if (err) return res.status(500).json({ error: 'Failed to enable 2FA' });
          
          res.json({ 
            message: '2FA successfully enabled!',
            enabled: true 
          });
        }
      );
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
};

// ✅ Disable 2FA
exports.disable2FA = async (req, res) => {
  const { password, token } = req.body;
  const { userId } = req.user;

  if (!password || !token) {
    return res.status(400).json({ error: 'Password and current 2FA token are required' });
  }

  try {
    // Get user details
    db.query('SELECT password, two_factor_secret FROM Users WHERE id = ?', [userId], async (err, users) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      
      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = users[0];

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid password' });
      }

      // Verify current 2FA token
      const verified = speakeasy.totp.verify({
        secret: user.two_factor_secret,
        encoding: 'base32',
        token: token,
        window: 2
      });

      if (!verified) {
        return res.status(400).json({ error: 'Invalid 2FA token' });
      }

      // Disable 2FA
      db.query(
        'UPDATE Users SET two_factor_enabled = FALSE, two_factor_secret = NULL WHERE id = ?',
        [userId],
        (err) => {
          if (err) return res.status(500).json({ error: 'Failed to disable 2FA' });
          
          res.json({ 
            message: '2FA successfully disabled!',
            enabled: false 
          });
        }
      );
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
};

// ✅ Register new user (Admin only)
exports.register = async (req, res) => {
  const { username, password, role, employeeId } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Username, password, and role are required' });
  }

  if (!['admin', 'floor_manager', 'employee'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    db.query(
      'INSERT INTO Users (username, password, role, employee_id) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, role, employeeId],
      (err, result) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Username already exists' });
          }
          return res.status(500).json({ error: 'Registration failed' });
        }

        res.status(201).json({
          message: 'User registered successfully',
          userId: result.insertId
        });
      }
    );
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// ✅ Get current user profile
exports.getProfile = (req, res) => {
  const { userId } = req.user;

  db.query(
    'SELECT id, username, role, employee_id, two_factor_enabled, created_at FROM Users WHERE id = ?',
    [userId],
    (err, users) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      
      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(users[0]);
    }
  );
};