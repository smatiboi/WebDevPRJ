USE flms_db;

INSERT INTO departments (name, code) VALUES
  ('Computer Science', 'CS'),
  ('Information Systems', 'IS'),
  ('Electrical Engineering', 'EE'),
  ('Business Administration', 'BUS')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO categories (name) VALUES
  ('Programming'),
  ('Databases'),
  ('Networks'),
  ('Artificial Intelligence'),
  ('Research Methods'),
  ('Management')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO tags (name) VALUES
  ('web'), ('sql'), ('algorithms'), ('security'), ('machine-learning'), ('academic')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO users (name, email, password_hash, role, department_id, status) VALUES
  ('Project Owner', 'therealsmatiboi@gmail.com', '$2a$10$wibHp7jS0rIS5D5QRsANwe4HvrD4kOHCp.5r/Npb28ltVx/r2CKsS', 'owner', 1, 'active'),
  ('Smati Abdelkahar', 'threalsmatiboi@gmail.com', '$2a$10$wibHp7jS0rIS5D5QRsANwe4HvrD4kOHCp.5r/Npb28ltVx/r2CKsS', 'owner', 1, 'active'),
  ('Project Owner', 'owner@flms.edu', '$2a$10$8s.5Mtk3GSmb6YRgDRhYU.xzi8qJ6VemCjeqG9tfOPTL2VbE2f2sm', 'owner', 1, 'active'),
  ('Admin User', 'admin@flms.edu', '$2a$10$8s.5Mtk3GSmb6YRgDRhYU.xzi8qJ6VemCjeqG9tfOPTL2VbE2f2sm', 'admin', 1, 'active'),
  ('Admin Amina', 'admin1@flms.edu', '$2a$10$8s.5Mtk3GSmb6YRgDRhYU.xzi8qJ6VemCjeqG9tfOPTL2VbE2f2sm', 'admin', 1, 'active'),
  ('Admin Karim', 'admin2@flms.edu', '$2a$10$8s.5Mtk3GSmb6YRgDRhYU.xzi8qJ6VemCjeqG9tfOPTL2VbE2f2sm', 'admin', 2, 'active'),
  ('Admin Nour', 'admin3@flms.edu', '$2a$10$8s.5Mtk3GSmb6YRgDRhYU.xzi8qJ6VemCjeqG9tfOPTL2VbE2f2sm', 'admin', 3, 'active'),
  ('Admin Yacine', 'admin4@flms.edu', '$2a$10$8s.5Mtk3GSmb6YRgDRhYU.xzi8qJ6VemCjeqG9tfOPTL2VbE2f2sm', 'admin', 4, 'active'),
  ('Lina Librarian', 'librarian@flms.edu', '$2a$10$8s.5Mtk3GSmb6YRgDRhYU.xzi8qJ6VemCjeqG9tfOPTL2VbE2f2sm', 'librarian', 1, 'active'),
  ('Sara Student', 'student@flms.edu', '$2a$10$8s.5Mtk3GSmb6YRgDRhYU.xzi8qJ6VemCjeqG9tfOPTL2VbE2f2sm', 'student', 1, 'active'),
  ('Fadil Faculty', 'faculty@flms.edu', '$2a$10$8s.5Mtk3GSmb6YRgDRhYU.xzi8qJ6VemCjeqG9tfOPTL2VbE2f2sm', 'faculty', 2, 'active')
ON DUPLICATE KEY UPDATE name = VALUES(name), role = VALUES(role), status = VALUES(status);

INSERT INTO books
  (title, author, isbn, publisher, publication_year, category_id, format, total_copies, available_copies, shelf_location, description, cover_image)
VALUES
  ('Clean Code', 'Robert C. Martin', '9780132350884', 'Prentice Hall', 2008, 1, 'physical', 6, 6, 'A1-CS-02', 'Practical guidance for writing maintainable software.', 'https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg'),
  ('Database System Concepts', 'Abraham Silberschatz', '9780073523323', 'McGraw-Hill', 2010, 2, 'physical', 5, 5, 'B2-DB-01', 'A complete introduction to database design, SQL, and transaction processing.', 'https://covers.openlibrary.org/b/isbn/9780073523323-L.jpg'),
  ('Computer Networking: A Top-Down Approach', 'James F. Kurose', '9780133594140', 'Pearson', 2016, 3, 'physical', 4, 4, 'C3-NET-04', 'Networking principles from application layer to link layer.', 'https://covers.openlibrary.org/b/isbn/9780133594140-L.jpg'),
  ('Artificial Intelligence: A Modern Approach', 'Stuart Russell and Peter Norvig', '9780136042594', 'Pearson', 2020, 4, 'digital', 20, 20, 'DIG-AI-01', 'Foundational AI concepts and modern techniques.', 'https://covers.openlibrary.org/b/isbn/9780136042594-L.jpg'),
  ('Research Design', 'John W. Creswell', '9781506386706', 'SAGE', 2018, 5, 'physical', 3, 3, 'R1-MET-02', 'Qualitative, quantitative, and mixed methods research design.', 'https://covers.openlibrary.org/b/isbn/9781506386706-L.jpg')
ON DUPLICATE KEY UPDATE title = VALUES(title), available_copies = VALUES(available_copies);

INSERT IGNORE INTO book_tags (book_id, tag_id)
SELECT b.id, t.id FROM books b JOIN tags t
WHERE (b.isbn = '9780132350884' AND t.name IN ('web', 'algorithms'))
   OR (b.isbn = '9780073523323' AND t.name IN ('sql', 'academic'))
   OR (b.isbn = '9780133594140' AND t.name IN ('security', 'academic'))
   OR (b.isbn = '9780136042594' AND t.name IN ('machine-learning', 'academic'));
