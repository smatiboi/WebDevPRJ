const express = require('express');
const { asyncHandler } = require('../utils/errors');
const { authenticate } = require('../middleware/auth');
const auth = require('../controllers/authController');

const router = express.Router();

router.post('/register', asyncHandler(auth.register));
router.post('/login', asyncHandler(auth.login));
router.post('/forgot-password', asyncHandler(auth.forgotPassword));
router.post('/reset-password', asyncHandler(auth.resetPassword));
router.get('/me', authenticate, asyncHandler(auth.me));
router.post('/logout', authenticate, (req, res) => res.json({ message: 'Logged out on client.' }));

module.exports = router;
