const pool = require('../config/db');
const { AppError } = require('../utils/errors');
const { getPagination, pageMeta } = require('../utils/pagination');

const LOAN_RULES = {
  student: { maxLoans: 5, days: 14 },
  faculty: { maxLoans: 10, days: 30 }
};

async function refreshOverdue(connection = pool) {
  await connection.execute(
    `UPDATE loans
     SET status = 'overdue'
     WHERE returned_at IS NULL AND due_at < NOW() AND status = 'active'`
  );
}

async function listMyLoans(req, res) {
  await refreshOverdue();
  const { page, limit, offset } = getPagination(req.query);
  const status = req.query.status;
  const params = [req.user.id];
  let where = 'WHERE l.user_id = ?';
  if (status) {
    where += status === 'active'
      ? ' AND l.returned_at IS NULL'
      : ' AND l.status = ?';
    if (status !== 'active') params.push(status);
  }

  const [countRows] = await pool.execute(`SELECT COUNT(*) AS total FROM loans l ${where}`, params);
  const [rows] = await pool.execute(
    `SELECT l.id, l.borrowed_at AS borrowedAt, l.due_at AS dueAt, l.returned_at AS returnedAt,
            l.renewal_count AS renewalCount, l.status,
            b.id AS bookId, b.title, b.author, b.isbn, b.cover_image AS coverImage
     FROM loans l
     JOIN books b ON b.id = l.book_id
     ${where}
     ORDER BY l.borrowed_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  res.json({ data: rows, meta: pageMeta(page, limit, countRows[0].total) });
}

async function listAllLoans(req, res) {
  await refreshOverdue();
  const { page, limit, offset } = getPagination(req.query);
  const params = [];
  const where = [];
  if (req.query.status) {
    where.push('l.status = ?');
    params.push(req.query.status);
  }
  if (req.query.userId) {
    where.push('l.user_id = ?');
    params.push(req.query.userId);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [countRows] = await pool.execute(`SELECT COUNT(*) AS total FROM loans l ${whereSql}`, params);
  const [rows] = await pool.execute(
    `SELECT l.id, l.borrowed_at AS borrowedAt, l.due_at AS dueAt, l.returned_at AS returnedAt,
            l.renewal_count AS renewalCount, l.status,
            u.id AS userId, u.name AS userName, u.email AS userEmail, u.role AS userRole,
            b.id AS bookId, b.title, b.author, b.isbn
     FROM loans l
     JOIN users u ON u.id = l.user_id
     JOIN books b ON b.id = l.book_id
     ${whereSql}
     ORDER BY l.borrowed_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  res.json({ data: rows, meta: pageMeta(page, limit, countRows[0].total) });
}

async function borrowBook(req, res) {
  const bookId = Number(req.params.bookId || req.body.bookId);
  if (!bookId) throw new AppError('Book ID is required.', 400);

  const rules = LOAN_RULES[req.user.role];
  if (!rules) throw new AppError('Only students and faculty can borrow books.', 403);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await refreshOverdue(connection);

    const [users] = await connection.execute('SELECT id, role, status FROM users WHERE id = ? FOR UPDATE', [req.user.id]);
    if (!users.length || users[0].status !== 'active') throw new AppError('Account is unavailable.', 403);

    const [bookRows] = await connection.execute(
      'SELECT id, title, available_copies FROM books WHERE id = ? AND deleted_at IS NULL FOR UPDATE',
      [bookId]
    );
    if (!bookRows.length) throw new AppError('Book not found.', 404);
    if (bookRows[0].available_copies < 1) throw new AppError('No available copies for this book.', 409);

    const [sameBook] = await connection.execute(
      'SELECT id FROM loans WHERE user_id = ? AND book_id = ? AND returned_at IS NULL',
      [req.user.id, bookId]
    );
    if (sameBook.length) throw new AppError('You already have an active loan for this book.', 409);

    const [activeRows] = await connection.execute(
      'SELECT COUNT(*) AS total FROM loans WHERE user_id = ? AND returned_at IS NULL',
      [req.user.id]
    );
    if (activeRows[0].total >= rules.maxLoans) {
      throw new AppError(`Loan limit reached. ${req.user.role} users can borrow ${rules.maxLoans} books.`, 409);
    }

    const [loanResult] = await connection.execute(
      `INSERT INTO loans (user_id, book_id, due_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ${rules.days} DAY))`,
      [req.user.id, bookId]
    );
    await connection.execute(
      'UPDATE books SET available_copies = available_copies - 1 WHERE id = ?',
      [bookId]
    );

    await connection.commit();
    res.status(201).json({ id: loanResult.insertId, message: 'Book borrowed successfully.' });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function returnLoan(req, res) {
  const loanId = Number(req.params.id);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [loans] = await connection.execute(
      `SELECT l.id, l.book_id, l.user_id, l.returned_at
       FROM loans l WHERE l.id = ? FOR UPDATE`,
      [loanId]
    );
    if (!loans.length) throw new AppError('Loan not found.', 404);
    const loan = loans[0];
    const canManage = ['librarian', 'admin', 'owner'].includes(req.user.role);
    if (!canManage && loan.user_id !== req.user.id) throw new AppError('You cannot return this loan.', 403);
    if (loan.returned_at) throw new AppError('Loan is already returned.', 409);

    await connection.execute(
      `UPDATE loans SET returned_at = NOW(), status = 'returned' WHERE id = ?`,
      [loanId]
    );
    await connection.execute(
      `UPDATE books SET available_copies = LEAST(total_copies, available_copies + 1) WHERE id = ?`,
      [loan.book_id]
    );

    await connection.commit();
    res.json({ message: 'Book returned successfully.' });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function renewLoan(req, res) {
  const loanId = Number(req.params.id);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await refreshOverdue(connection);
    const [loans] = await connection.execute(
      `SELECT l.id, l.user_id, l.renewal_count, l.returned_at, l.status, u.role
       FROM loans l JOIN users u ON u.id = l.user_id
       WHERE l.id = ? FOR UPDATE`,
      [loanId]
    );
    if (!loans.length) throw new AppError('Loan not found.', 404);
    const loan = loans[0];
    const canManage = ['librarian', 'admin', 'owner'].includes(req.user.role);
    if (!canManage && loan.user_id !== req.user.id) throw new AppError('You cannot renew this loan.', 403);
    if (loan.returned_at) throw new AppError('Returned loans cannot be renewed.', 409);
    if (loan.status === 'overdue') throw new AppError('Overdue loans must be returned before borrowing again.', 409);
    if (loan.renewal_count >= 2) throw new AppError('Maximum renewal count reached.', 409);

    const rules = LOAN_RULES[loan.role] || LOAN_RULES.student;
    await connection.execute(
      `UPDATE loans
       SET renewal_count = renewal_count + 1,
           due_at = DATE_ADD(due_at, INTERVAL ${rules.days} DAY),
           status = 'active'
       WHERE id = ?`,
      [loanId]
    );
    await connection.commit();
    res.json({ message: 'Loan renewed successfully.' });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { listMyLoans, listAllLoans, borrowBook, returnLoan, renewLoan, refreshOverdue };
