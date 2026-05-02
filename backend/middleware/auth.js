const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { forceOwnerRole } = require('../config/owner');
const { AppError, asyncHandler } = require('../utils/errors');

const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    throw new AppError('Authentication required.', 401);
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
  } catch (error) {
    throw new AppError('Invalid or expired token.', 401);
  }

  const [rows] = await pool.execute(
    `SELECT u.id, u.name, u.email, u.role, u.status, u.department_id, d.name AS department
     FROM users u
     LEFT JOIN departments d ON d.id = u.department_id
     WHERE u.id = ?`,
    [payload.sub]
  );

  const user = forceOwnerRole(rows[0]);
  if (!rows.length || user.status !== 'active') {
    throw new AppError('Account is inactive or unavailable.', 403);
  }

  req.user = user;
  next();
});

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || (req.user.role !== 'owner' && !roles.includes(req.user.role))) {
    return next(new AppError('You do not have permission to perform this action.', 403));
  }
  return next();
};

module.exports = { authenticate, requireRole };
