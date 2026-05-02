const express = require('express');
const { asyncHandler } = require('../utils/errors');
const { authenticate, requireRole } = require('../middleware/auth');
const users = require('../controllers/userController');

const router = express.Router();

router.use(authenticate);
router.put('/profile', asyncHandler(users.updateProfile));
router.get('/', requireRole('admin'), asyncHandler(users.listUsers));
router.post('/', requireRole('admin'), asyncHandler(users.createUser));
router.put('/:id', requireRole('admin'), asyncHandler(users.updateUser));

module.exports = router;
