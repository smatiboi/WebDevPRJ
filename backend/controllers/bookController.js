const { parse } = require('csv-parse/sync');
const pool = require('../config/db');
const { AppError } = require('../utils/errors');
const { getPagination, pageMeta } = require('../utils/pagination');

function normalizeTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map((tag) => String(tag).trim()).filter(Boolean);
  return String(tags).split(',').map((tag) => tag.trim()).filter(Boolean);
}

async function attachTags(connection, bookId, tags) {
  const cleanTags = [...new Set(normalizeTags(tags))];
  await connection.execute('DELETE FROM book_tags WHERE book_id = ?', [bookId]);
  for (const tag of cleanTags) {
    await connection.execute('INSERT IGNORE INTO tags (name) VALUES (?)', [tag.toLowerCase()]);
    const [rows] = await connection.execute('SELECT id FROM tags WHERE name = ?', [tag.toLowerCase()]);
    await connection.execute('INSERT IGNORE INTO book_tags (book_id, tag_id) VALUES (?, ?)', [bookId, rows[0].id]);
  }
}

function bookPayload(body) {
  const totalCopies = Number(body.totalCopies ?? body.total_copies ?? 1);
  const availableCopies = Number(body.availableCopies ?? body.available_copies ?? totalCopies);
  return {
    title: body.title,
    author: body.author,
    isbn: body.isbn,
    publisher: body.publisher || null,
    publicationYear: body.publicationYear || body.publication_year || null,
    categoryId: body.categoryId || body.category_id || null,
    format: body.format || 'physical',
    totalCopies,
    availableCopies,
    shelfLocation: body.shelfLocation || body.shelf_location || null,
    description: body.description || null,
    coverImage: body.coverImage || body.cover_image || null,
    tags: body.tags
  };
}

async function listBooks(req, res) {
  const { page, limit, offset } = getPagination(req.query);
  const where = ['b.deleted_at IS NULL'];
  const params = [];
  let relevanceSql = 'b.created_at';
  const relevanceParams = [];

  if (req.query.search) {
    const rawSearch = String(req.query.search).trim();
    const tokens = rawSearch.split(/\s+/).filter(Boolean).slice(0, 6);
    const tokenConditions = tokens.map(() => (
      `(b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ? OR c.name LIKE ?
        OR EXISTS (
          SELECT 1 FROM book_tags sbt
          JOIN tags st ON st.id = sbt.tag_id
          WHERE sbt.book_id = b.id AND st.name LIKE ?
        ))`
    ));
    where.push(`(${tokenConditions.join(' AND ')})`);
    tokens.forEach((token) => {
      const term = `%${token}%`;
      params.push(term, term, term, term, term);
    });

    relevanceSql = `
      CASE
        WHEN b.isbn = ? THEN 100
        WHEN b.title LIKE ? THEN 90
        WHEN b.title LIKE ? THEN 75
        WHEN b.author LIKE ? THEN 55
        WHEN c.name LIKE ? THEN 45
        WHEN EXISTS (
          SELECT 1 FROM book_tags rbt
          JOIN tags rt ON rt.id = rbt.tag_id
          WHERE rbt.book_id = b.id AND rt.name LIKE ?
        ) THEN 40
        ELSE 10
      END`;
    relevanceParams.push(rawSearch, `${rawSearch}%`, `%${rawSearch}%`, `%${rawSearch}%`, `%${rawSearch}%`, `%${rawSearch}%`);
  }
  if (req.query.categoryId) {
    where.push('b.category_id = ?');
    params.push(req.query.categoryId);
  }
  if (req.query.format) {
    where.push('b.format = ?');
    params.push(req.query.format);
  }
  if (req.query.availability === 'available') {
    where.push('b.available_copies > 0');
  }
  if (req.query.yearFrom) {
    where.push('b.publication_year >= ?');
    params.push(req.query.yearFrom);
  }
  if (req.query.yearTo) {
    where.push('b.publication_year <= ?');
    params.push(req.query.yearTo);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;
  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM books b
     LEFT JOIN categories c ON c.id = b.category_id
     ${whereSql}`,
    params
  );
  const [rows] = await pool.execute(
    `SELECT b.id, b.title, b.author, b.isbn, b.publisher, b.publication_year AS publicationYear,
            c.name AS category, b.format, b.total_copies AS totalCopies,
            b.available_copies AS availableCopies, b.shelf_location AS shelfLocation,
            b.description, b.cover_image AS coverImage,
            COALESCE(GROUP_CONCAT(t.name ORDER BY t.name SEPARATOR ', '), '') AS tags
     FROM books b
     LEFT JOIN categories c ON c.id = b.category_id
     LEFT JOIN book_tags bt ON bt.book_id = b.id
     LEFT JOIN tags t ON t.id = bt.tag_id
     ${whereSql}
     GROUP BY b.id
     ORDER BY ${relevanceSql} DESC, b.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, ...relevanceParams, limit, offset]
  );

  res.json({ data: rows, meta: pageMeta(page, limit, countRows[0].total) });
}

async function getBook(req, res) {
  const [rows] = await pool.execute(
    `SELECT b.id, b.title, b.author, b.isbn, b.publisher, b.publication_year AS publicationYear,
            b.category_id AS categoryId, c.name AS category, b.format,
            b.total_copies AS totalCopies, b.available_copies AS availableCopies,
            b.shelf_location AS shelfLocation, b.description, b.cover_image AS coverImage,
            COALESCE(GROUP_CONCAT(t.name ORDER BY t.name SEPARATOR ', '), '') AS tags
     FROM books b
     LEFT JOIN categories c ON c.id = b.category_id
     LEFT JOIN book_tags bt ON bt.book_id = b.id
     LEFT JOIN tags t ON t.id = bt.tag_id
     WHERE b.id = ? AND b.deleted_at IS NULL
     GROUP BY b.id`,
    [req.params.id]
  );
  if (!rows.length) throw new AppError('Book not found.', 404);
  res.json({ book: rows[0] });
}

async function createBook(req, res) {
  const book = bookPayload(req.body);
  if (!book.title || !book.author || !book.isbn) {
    throw new AppError('Title, author, and ISBN are required.', 400);
  }
  if (book.availableCopies > book.totalCopies) {
    throw new AppError('Available copies cannot exceed total copies.', 400);
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(
      `INSERT INTO books
       (title, author, isbn, publisher, publication_year, category_id, format,
        total_copies, available_copies, shelf_location, description, cover_image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        book.title, book.author, book.isbn, book.publisher, book.publicationYear,
        book.categoryId, book.format, book.totalCopies, book.availableCopies,
        book.shelfLocation, book.description, book.coverImage
      ]
    );
    await attachTags(connection, result.insertId, book.tags);
    await connection.commit();
    res.status(201).json({ id: result.insertId, message: 'Book created.' });
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') throw new AppError('ISBN already exists.', 409);
    throw error;
  } finally {
    connection.release();
  }
}

async function updateBook(req, res) {
  const book = bookPayload(req.body);
  if (!book.title || !book.author || !book.isbn) throw new AppError('Title, author, and ISBN are required.', 400);
  if (book.availableCopies > book.totalCopies) throw new AppError('Available copies cannot exceed total copies.', 400);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(
      `UPDATE books SET title = ?, author = ?, isbn = ?, publisher = ?, publication_year = ?,
       category_id = ?, format = ?, total_copies = ?, available_copies = ?,
       shelf_location = ?, description = ?, cover_image = ?
       WHERE id = ? AND deleted_at IS NULL`,
      [
        book.title, book.author, book.isbn, book.publisher, book.publicationYear,
        book.categoryId, book.format, book.totalCopies, book.availableCopies,
        book.shelfLocation, book.description, book.coverImage, req.params.id
      ]
    );
    if (!result.affectedRows) throw new AppError('Book not found.', 404);
    await attachTags(connection, req.params.id, book.tags);
    await connection.commit();
    res.json({ message: 'Book updated.' });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function deleteBook(req, res) {
  const [active] = await pool.execute(
    'SELECT COUNT(*) AS total FROM loans WHERE book_id = ? AND returned_at IS NULL',
    [req.params.id]
  );
  if (active[0].total > 0) throw new AppError('Cannot delete a book with active loans.', 409);

  const [result] = await pool.execute('UPDATE books SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
  if (!result.affectedRows) throw new AppError('Book not found.', 404);
  res.json({ message: 'Book deleted.' });
}

async function importBooks(req, res) {
  let records;
  if (req.file) {
    records = parse(req.file.buffer, { columns: true, skip_empty_lines: true, trim: true });
  } else if (Array.isArray(req.body.books)) {
    records = req.body.books;
  } else {
    throw new AppError('Upload a CSV file or send { books: [...] } JSON.', 400);
  }

  const connection = await pool.getConnection();
  let inserted = 0;
  try {
    await connection.beginTransaction();
    for (const row of records) {
      const book = bookPayload(row);
      if (!book.title || !book.author || !book.isbn) continue;
      const [result] = await connection.execute(
        `INSERT INTO books
         (title, author, isbn, publisher, publication_year, category_id, format,
          total_copies, available_copies, shelf_location, description, cover_image)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          title = VALUES(title), author = VALUES(author), publisher = VALUES(publisher),
          publication_year = VALUES(publication_year), category_id = VALUES(category_id),
          format = VALUES(format), total_copies = VALUES(total_copies),
          available_copies = VALUES(available_copies), shelf_location = VALUES(shelf_location),
          description = VALUES(description), cover_image = VALUES(cover_image), deleted_at = NULL`,
        [
          book.title, book.author, book.isbn, book.publisher, book.publicationYear,
          book.categoryId, book.format, book.totalCopies, book.availableCopies,
          book.shelfLocation, book.description, book.coverImage
        ]
      );
      const bookId = result.insertId || (await connection.execute('SELECT id FROM books WHERE isbn = ?', [book.isbn]))[0][0].id;
      await attachTags(connection, bookId, book.tags);
      inserted += 1;
    }
    await connection.commit();
    res.json({ message: 'Import completed.', imported: inserted });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { listBooks, getBook, createBook, updateBook, deleteBook, importBooks };
