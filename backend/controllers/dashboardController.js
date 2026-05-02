const pool = require('../config/db');
const { refreshOverdue } = require('./loanController');

async function getDashboard(req, res) {
  await refreshOverdue();
  const [[users], [books], [active], [overdue], [recent]] = await Promise.all([
    pool.execute('SELECT COUNT(*) AS total FROM users'),
    pool.execute('SELECT COUNT(*) AS total, COALESCE(SUM(available_copies), 0) AS availableCopies FROM books WHERE deleted_at IS NULL'),
    pool.execute('SELECT COUNT(*) AS total FROM loans WHERE returned_at IS NULL'),
    pool.execute(`SELECT COUNT(*) AS total FROM loans WHERE returned_at IS NULL AND due_at < NOW()`),
    pool.execute(
      `SELECT l.id, u.name AS userName, b.title, l.borrowed_at AS borrowedAt, l.due_at AS dueAt, l.status
       FROM loans l JOIN users u ON u.id = l.user_id JOIN books b ON b.id = l.book_id
       ORDER BY l.borrowed_at DESC LIMIT 8`
    )
  ]);
  res.json({
    totals: {
      users: users[0].total,
      books: books[0].total,
      availableCopies: Number(books[0].availableCopies),
      activeLoans: active[0].total,
      overdueLoans: overdue[0].total
    },
    recentLoans: recent
  });
}

module.exports = { getDashboard };
