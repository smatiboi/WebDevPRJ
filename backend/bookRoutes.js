const express = require('express');
const multer = require('multer');
const { asyncHandler } = require('../utils/errors');
const { authenticate, requireRole } = require('../middleware/auth');
const books = require('../controllers/bookController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 * 1024 } });

router.get('/', asyncHandler(books.listBooks));
router.get('/:id', asyncHandler(books.getBook));
router.post('/', authenticate, requireRole('librarian', 'admin'), asyncHandler(books.createBook));
router.put('/:id', authenticate, requireRole('librarian', 'admin'), asyncHandler(books.updateBook));
router.delete('/:id', authenticate, requireRole('librarian', 'admin'), asyncHandler(books.deleteBook));
router.post('/bulk/import', authenticate, requireRole('librarian', 'admin'), upload.single('file'), asyncHandler(books.importBooks));

module.exports = router;
