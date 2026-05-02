const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { forceOwnerRole } = require('../config/owner');
const { AppError } = require('../utils/errors');

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

function publicUser(user) {
  user = forceOwnerRole(user);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    canManageAdmins: user.role === 'owner',
    departmentId: user.department_id,
    department: user.department || null,
    status: user.status
  };
}

async function register(req, res) {
  const { name, email, password, departmentId } = req.body;
  const role = 'student';

  if (!name || !email || !password || !departmentId) {
    throw new AppError('Name, email, password, and department are required.', 400);
  }
  if (password.length < 8) {
    throw new AppError('Password must be at least 8 characters.', 400);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const [result] = await pool.execute(
      `INSERT INTO users (name, email, password_hash, role, department_id)
       VALUES (?, ?, ?, ?, ?)`,
      [name.trim(), email.trim().toLowerCase(), passwordHash, role, departmentId]
    );
    const [rows] = await pool.execute(
      `SELECT u.id, u.name, u.email, u.role, u.status, u.department_id, d.name AS department
       FROM users u LEFT JOIN departments d ON d.id = u.department_id
       WHERE u.id = ?`,
      [result.insertId]
    );
    res.status(201).json({ user: publicUser(rows[0]), token: signToken(rows[0]) });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw new AppError('Email is already registered.', 409);
    }
    throw error;
  }
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new AppError('Email and password are required.', 400);
  }

  const [rows] = await pool.execute(
    `SELECT u.id, u.name, u.email, u.password_hash, u.role, u.status, u.department_id, d.name AS department
     FROM users u LEFT JOIN departments d ON d.id = u.department_id
     WHERE u.email = ?`,
    [email.trim().toLowerCase()]
  );

  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new AppError('Invalid email or password.', 401);
  }
  if (user.status !== 'active') {
    throw new AppError('Your account is inactive. Contact the librarian.', 403);
  }

  res.json({ user: publicUser(user), token: signToken(user) });
}

async function me(req, res) {
  res.json({ user: publicUser(req.user) });
}

async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) throw new AppError('Email is required.', 400);

  const [users] = await pool.execute('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
  if (users.length) {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await pool.execute(
      `INSERT INTO password_resets (user_id, token_hash, expires_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE))`,
      [users[0].id, tokenHash]
    );
    return res.json({
      message: 'Password reset token generated. In production this would be emailed.',
      resetToken: token
    });
  }

  res.json({ message: 'If that account exists, a reset link has been prepared.' });
}

async function resetPassword(req, res) {
  const { token, password } = req.body;
  if (!token || !password) throw new AppError('Token and password are required.', 400);
  if (password.length < 8) throw new AppError('Password must be at least 8 characters.', 400);

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const [rows] = await pool.execute(
    `SELECT id, user_id FROM password_resets
     WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()`,
    [tokenHash]
  );
  if (!rows.length) throw new AppError('Invalid or expired reset token.', 400);

  const passwordHash = await bcrypt.hash(password, 10);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, rows[0].user_id]);
    await connection.execute('UPDATE password_resets SET used_at = NOW() WHERE id = ?', [rows[0].id]);
    await connection.commit();
    res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { register, login, me, forgotPassword, resetPassword };
