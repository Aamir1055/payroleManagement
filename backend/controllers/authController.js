const db = require('../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// ✅ User Registration
exports.register = async (req, res) => {
  try {
    const { username, email, password, role = 'employee' } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    // Validate role
    const validRoles = ['admin', 'floor_manager', 'employee'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified' });
    }

    // Check if user exists
    db.query('SELECT id FROM users WHERE email = ? OR username = ?', [email, username], async (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      
      if (results.length > 0) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Insert user
      const query = `
        INSERT INTO users (username, email, password, role, created_at, updated_at)
        VALUES (?, ?, ?, ?, NOW(), NOW())
      `;

      db.query(query, [username, email, hashedPassword, role], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        res.status(201).json({
          message: 'User registered successfully',
          userId: result.insertId,
          username,
          email,
          role
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ User Login
exports.login = async (req, res) => {
  try {
    const { username, password, twoFactorToken } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user
    db.query('SELECT * FROM users WHERE username = ? OR email = ?', [username, username], async (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      if (results.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = results[0];

      // Check password
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if user is active
      if (user.status === 'inactive') {
        return res.status(401).json({ error: 'Account is inactive. Please contact administrator.' });
      }

      // Check 2FA if enabled
      if (user.two_factor_enabled) {
        if (!twoFactorToken) {
          return res.status(200).json({
            requiresTwoFactor: true,
            message: 'Two-factor authentication required'
          });
        }

        const verified = speakeasy.totp.verify({
          secret: user.two_factor_secret,
          encoding: 'base32',
          token: twoFactorToken,
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
          email: user.email, 
          role: user.role 
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      // Update last login
      db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          twoFactorEnabled: user.two_factor_enabled
        }
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Setup 2FA
exports.setup2FA = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Payroll System (${req.user.username})`,
      issuer: 'Payroll System'
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Store temporary secret (will be confirmed later)
    db.query(
      'UPDATE users SET two_factor_temp_secret = ? WHERE id = ?',
      [secret.base32, userId],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });

        res.json({
          qrCode: qrCodeUrl,
          secret: secret.base32,
          manualEntryKey: secret.base32
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Verify and Enable 2FA
exports.verify2FA = async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.userId;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Get temporary secret
    db.query('SELECT two_factor_temp_secret FROM users WHERE id = ?', [userId], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      if (results.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const tempSecret = results[0].two_factor_temp_secret;
      if (!tempSecret) {
        return res.status(400).json({ error: 'No 2FA setup in progress' });
      }

      // Verify token
      const verified = speakeasy.totp.verify({
        secret: tempSecret,
        encoding: 'base32',
        token: token,
        window: 2
      });

      if (!verified) {
        return res.status(400).json({ error: 'Invalid token' });
      }

      // Enable 2FA
      db.query(
        'UPDATE users SET two_factor_enabled = 1, two_factor_secret = ?, two_factor_temp_secret = NULL WHERE id = ?',
        [tempSecret, userId],
        (err) => {
          if (err) return res.status(500).json({ error: err.message });

          res.json({ message: '2FA enabled successfully' });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Disable 2FA
exports.disable2FA = async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.user.userId;

    if (!password) {
      return res.status(400).json({ error: 'Password is required to disable 2FA' });
    }

    // Verify password
    db.query('SELECT password FROM users WHERE id = ?', [userId], async (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      if (results.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const passwordMatch = await bcrypt.compare(password, results[0].password);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid password' });
      }

      // Disable 2FA
      db.query(
        'UPDATE users SET two_factor_enabled = 0, two_factor_secret = NULL WHERE id = ?',
        [userId],
        (err) => {
          if (err) return res.status(500).json({ error: err.message });

          res.json({ message: '2FA disabled successfully' });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Get User Profile
exports.getProfile = (req, res) => {
  const userId = req.user.userId;

  db.query(
    'SELECT id, username, email, role, two_factor_enabled, created_at, last_login FROM users WHERE id = ?',
    [userId],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      if (results.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user: results[0] });
    }
  );
};

// ✅ Change Password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    // Get current password
    db.query('SELECT password FROM users WHERE id = ?', [userId], async (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      if (results.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify current password
      const passwordMatch = await bcrypt.compare(currentPassword, results[0].password);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      db.query(
        'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
        [hashedNewPassword, userId],
        (err) => {
          if (err) return res.status(500).json({ error: err.message });

          res.json({ message: 'Password changed successfully' });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Logout (for token blacklisting if needed)
exports.logout = (req, res) => {
  // In a production environment, you might want to implement token blacklisting
  // For now, we'll just send a success response
  res.json({ message: 'Logged out successfully' });
};