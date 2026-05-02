const express = require('express');
const { asyncHandler } = require('../utils/errors');
const { authenticate, requireRole } = require('../middleware/auth');
const { getDashboard } = require('../controllers/dashboardController');

const router = express.Router();

router.get('/', authenticate, requireRole('librarian', 'admin'), asyncHandler(getDashboard));

module.exports = router;
