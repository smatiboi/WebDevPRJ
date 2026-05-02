# Testing Strategy

## Manual Smoke Tests

1. Login as `student@flms.edu` with `Password123!`.
2. Search the catalog and borrow an available book.
3. Confirm the book appears in My Loans and available copies decreased.
4. Try borrowing the same book again and confirm the API rejects it.
5. Renew the loan twice, then confirm a third renewal is rejected.
6. Return the book and confirm available copies increase.
7. Login as `admin@flms.edu` and update a user's role/status.
8. Login as `librarian@flms.edu` and add/edit/import books.

## Automated Tests To Add

- Auth controller tests for login failure, inactive users, and role-limited registration.
- Loan transaction tests using a test MySQL database to prove concurrent borrow requests cannot make `available_copies` negative.
- Catalog API tests for pagination, filters, and import validation.
- Browser tests for login, catalog search, borrow, return, and admin book management.

## Security Improvements

- Replace classroom reset-token display with email delivery.
- Add refresh tokens or short-lived access tokens with server-side revocation.
- Add CSRF protection if cookies are used instead of bearer tokens.
- Add stricter input validation with a schema library such as Zod or Joi.
- Store cover images in controlled object storage instead of trusting arbitrary URLs.
- Add audit logs for admin role changes, deletions, returns, and imports.
