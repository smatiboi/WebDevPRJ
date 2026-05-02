const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { AppError } = require('../utils/errors');
const { getPagination, pageMeta } = require('../utils/pagination');

async function listUsers(req, res) {
  const { page, limit, offset } = getPagination(req.query);
  const params = [];
  const where = [];
  if (req.query.search) {
    where.push('(u.name LIKE ? OR u.email LIKE ?)');
    const term = `%${req.query.search}%`;
    params.push(term, term);
  }
  if (req.query.role) {
    where.push('u.role = ?');
    params.push(req.query.role);
  }
  if (req.query.status) {
    where.push('u.status = ?');
    params.push(req.query.status);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [countRows] = await pool.execute(`SELECT COUNT(*) AS total FROM users u ${whereSql}`, params);
  const [rows] = await pool.execute(
    `SELECT u.id, u.name, u.email, u.role, u.status, u.department_id AS departmentId,
            d.name AS department, u.created_at AS createdAt
     FROM users u
     LEFT JOIN departments d ON d.id = u.department_id
     ${whereSql}
     ORDER BY u.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  res.json({ data: rows, meta: pageMeta(page, limit, countRows[0].total) });
}

async function createUser(req, res) {
  const { name, email, password, role, departmentId, status = 'active' } = req.body;
  if (!name || !email || !password || !role) throw new AppError('Name, email, password, and role are required.', 400);
  if (role === 'owner' && req.user.role !== 'owner') {
    throw new AppError('Only the owner can create another owner account.', 403);
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const [result] = await pool.execute(
    `INSERT INTO users (name, email, password_hash, role, department_id, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, email.toLowerCase(), passwordHash, role, departmentId || null, status]
  );
  res.status(201).json({ id: result.insertId, message: 'User created.' });
}

async function updateUser(req, res) {
  const { name, role, departmentId, status } = req.body;
  if (role === 'owner' && req.user.role !== 'owner') {
    throw new AppError('Only the owner can assign owner role.', 403);
  }
  if (Number(req.params.id) === req.user.id && status === 'inactive') {
    throw new AppError('You cannot deactivate your own account.', 409);
  }
  const [targetRows] = await pool.execute('SELECT role FROM users WHERE id = ?', [req.params.id]);
  if (!targetRows.length) throw new AppError('User not found.', 404);
  if (targetRows[0].role === 'owner' && req.user.role !== 'owner') {
    throw new AppError('Only the owner can edit an owner account.', 403);
  }
  const [result] = await pool.execute(
    `UPDATE users
     SET name = COALESCE(?, name),
         role = COALESCE(?, role),
         department_id = COALESCE(?, department_id),
         status = COALESCE(?, status)
     WHERE id = ?`,
    [name || null, role || null, departmentId || null, status || null, req.params.id]
  );
  if (!result.affectedRows) throw new AppError('User not found.', 404);
  res.json({ message: 'User updated.' });
}

async function updateProfile(req, res) {
  const { name, departmentId } = req.body;
  await pool.execute(
    'UPDATE users SET name = COALESCE(?, name), department_id = COALESCE(?, department_id) WHERE id = ?',
    [name || null, departmentId || null, req.user.id]
  );
  res.json({ message: 'Profile updated.' });
}

module.exports = { listUsers, createUser, updateUser, updateProfile };
