# Four-Person Team Split

## Person A: Frontend Authentication and Catalog UI

- Owns `frontend/login.html`, `frontend/register.html`, `frontend/forgot-password.html`, `frontend/catalog.html`, `frontend/book.html`.
- Implements form validation, auth messages, catalog search/filter UX, book details, and borrow buttons.
- Coordinates API contracts with Person C for auth and Person D for catalog reads/borrow.

## Person B: Frontend Dashboard and Admin UI

- Owns `frontend/dashboard.html`, `frontend/manage-books.html`, `frontend/users.html`, `frontend/profile.html`.
- Implements admin/librarian workflows: stats, book form, bulk import form, users table, role/status editing, and profile page.
- Coordinates API contracts with Person C for users and Person D for catalog/loan admin endpoints.

## Person C: Backend Authentication and Users API

- Owns `backend/controllers/authController.js`, `backend/controllers/userController.js`, `backend/routes/authRoutes.js`, `backend/routes/userRoutes.js`, and `backend/middleware/auth.js`.
- Implements bcrypt password hashing, JWT login, self-registration restrictions, password reset tokens, RBAC middleware, profile updates, and admin user management.
- Maintains user-related database fields and security rules.

## Person D: Backend Catalog and Borrowing System

- Owns `backend/controllers/bookController.js`, `backend/controllers/loanController.js`, `backend/routes/bookRoutes.js`, `backend/routes/loanRoutes.js`, `database/schema.sql`, and `database/seed.sql`.
- Implements normalized catalog queries, tags, search/filter pagination, CSV/JSON import, transaction-safe borrow/return/renew flows, loan limits, and overdue detection.
- Verifies SQL transactions and inventory consistency under concurrent borrow attempts.
