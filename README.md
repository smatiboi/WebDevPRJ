# WebDevPRJ
The repository for the Web Development project (Where the magic happens... braindead magic yes)



# Faculty Library Management System

Faculty Library Management System is a web app for managing library users, books, and borrowing activity in a faculty library. The project uses a vanilla HTML/CSS/JavaScript frontend, an Express API, and a MySQL database.

## Features

- User registration, login, logout, password reset token flow, JWT authentication, and bcrypt password hashing.
- Student, faculty, librarian, admin, and owner roles.
- Admin tools for changing user roles and activating or deactivating accounts.
- Book catalog search by title, author, and ISBN, with filters for category, format, availability, and year.
- Paginated list APIs.
- Librarian/admin tools to add, edit, soft-delete, and bulk import books with CSV or JSON.
- Borrow, return, and renew flows with transaction-safe database updates.
- Loan rules for students and faculty, including active-loan limits and due dates.
- Duplicate active-loan prevention for the same user and book.
- Overdue detection and dashboard summaries.
- Responsive library-focused interface.

## Project Structure

```text
frontend/                 Pages, styles, and browser-side JavaScript
backend/                  Express API, routes, controllers, middleware
database/                 MySQL schema, seed data, and upgrade scripts
docs/                     API notes, testing plan, and team split
scripts/                  Project utility scripts
tests/                    Node test files
package.json
.env.example
```

## Database

Created the database from the SQL files in this order:

```sql
SOURCE database/schema.sql;
SOURCE database/seed.sql;
```

Main relationships:

- `users.department_id -> departments.id`
- `books.category_id -> categories.id`
- `book_tags.book_id -> books.id`
- `book_tags.tag_id -> tags.id`
- `loans.user_id -> users.id`
- `loans.book_id -> books.id`
- `password_resets.user_id -> users.id`

Seed accounts are included in `database/seed.sql` for admin, owner, librarian, student, and faculty testing.

## Environment

Copy `.env.example` to `.env`, then adjust the values for your local MySQL setup:

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=8h
FRONTEND_ORIGIN=http://localhost:3000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=flms_db
```

## Running The Project

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

For development with auto-restart:

```bash
npm run dev
```

## Frontend And API

The frontend calls the backend through `fetch()` helpers in `frontend/assets/js/app.js`.

Example API calls:

```js
api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
api('/books?page=1&limit=12');
api('/loans/borrow/1', { method: 'POST', body: '{}' });
```

The login token is stored in `localStorage` as `flms_token` and sent with requests as:

```text
Authorization: Bearer <token>
```

## Borrowing Logic

Borrowing, returning, and renewing books are handled with MySQL transactions in `backend/controllers/loanController.js`. The transaction locks the needed user and book rows, checks account status and loan rules, updates the loan record, updates available copies, and rolls back if anything fails.

## Documentation

- API map: [docs/api.md](docs/api.md)
- Testing notes: [docs/testing-strategy.md](docs/testing-strategy.md)

!!NOTE!!: Some crewmates faced issues with their PCs or and githubs, those 2 crewmates are Noureddine (kusabimaru360) and Younes (dxkm919-glitch), faced with such problem, their work is uploaded by the other 2 of the same section, Adim (backend contributer responsible for uploading Younes files) and Abdelkahar (frontend contributer responsible for uploading Noureddine files)
