const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes
router.use(requireAuth); // All routes below require authentication

router.get('/profile', authController.getProfile);
router.post('/change-password', authController.changePassword);
router.post('/logout', authController.logout);

// 2FA routes
router.post('/2fa/setup', authController.setup2FA);
router.post('/2fa/verify', authController.verify2FA);
router.post('/2fa/disable', authController.disable2FA);

module.exports = router;