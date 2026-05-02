const express = require('express');
const { asyncHandler } = require('../utils/errors');
const { authenticate, requireRole } = require('../middleware/auth');
const loans = require('../controllers/loanController');

const router = express.Router();

router.use(authenticate);
router.get('/mine', asyncHandler(loans.listMyLoans));
router.get('/', requireRole('librarian', 'admin'), asyncHandler(loans.listAllLoans));
router.post('/borrow/:bookId', asyncHandler(loans.borrowBook));
router.post('/:id/return', asyncHandler(loans.returnLoan));
router.post('/:id/renew', asyncHandler(loans.renewLoan));

module.exports = router;
