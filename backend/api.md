# FLMS REST API

All protected routes require:

```http
Authorization: Bearer <jwt>
```

## Auth

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Public | Register student/faculty |
| POST | `/api/auth/login` | Public | Login and receive JWT |
| POST | `/api/auth/logout` | Authenticated | Client-side logout acknowledgement |
| GET | `/api/auth/me` | Authenticated | Current user profile |
| POST | `/api/auth/forgot-password` | Public | Generate reset token |
| POST | `/api/auth/reset-password` | Public | Set password with token |

## Catalog

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/books` | Public | Paginated catalog with search/filter |
| GET | `/api/books/:id` | Public | Book details |
| POST | `/api/books` | Librarian/Admin | Add book |
| PUT | `/api/books/:id` | Librarian/Admin | Edit book |
| DELETE | `/api/books/:id` | Librarian/Admin | Soft-delete book |
| POST | `/api/books/bulk/import` | Librarian/Admin | CSV or JSON bulk import |

## Loans

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/loans/mine` | Authenticated | Current user's loans |
| GET | `/api/loans` | Librarian/Admin | All loans |
| POST | `/api/loans/borrow/:bookId` | Student/Faculty | Borrow book atomically |
| POST | `/api/loans/:id/return` | Owner/Librarian/Admin | Return book |
| POST | `/api/loans/:id/renew` | Owner/Librarian/Admin | Renew loan max two times |

## Users and Admin

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/users` | Admin | Paginated users |
| POST | `/api/users` | Admin | Create staff/user |
| PUT | `/api/users/:id` | Admin | Change role/status/profile fields |
| PUT | `/api/users/profile` | Authenticated | Update own profile |
| GET | `/api/dashboard` | Librarian/Admin | Counts and recent loans |
| GET | `/api/meta` | Public | Departments and categories |
