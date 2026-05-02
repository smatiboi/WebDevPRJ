USE flms_db;

ALTER TABLE users
  MODIFY role ENUM('student', 'faculty', 'librarian', 'admin', 'owner')
  NOT NULL DEFAULT 'student';

INSERT INTO users (name, email, password_hash, role, department_id, status) VALUES
  ('Project Owner', 'therealsmatiboi@gmail.com', '$2a$10$wibHp7jS0rIS5D5QRsANwe4HvrD4kOHCp.5r/Npb28ltVx/r2CKsS', 'owner', 1, 'active'),
  ('Smati Abdelkahar', 'threalsmatiboi@gmail.com', '$2a$10$wibHp7jS0rIS5D5QRsANwe4HvrD4kOHCp.5r/Npb28ltVx/r2CKsS', 'owner', 1, 'active'),
  ('Project Owner', 'owner@flms.edu', '$2a$10$8s.5Mtk3GSmb6YRgDRhYU.xzi8qJ6VemCjeqG9tfOPTL2VbE2f2sm', 'owner', 1, 'active'),
  ('Admin Amina', 'admin1@flms.edu', '$2a$10$8s.5Mtk3GSmb6YRgDRhYU.xzi8qJ6VemCjeqG9tfOPTL2VbE2f2sm', 'admin', 1, 'active'),
  ('Admin Karim', 'admin2@flms.edu', '$2a$10$8s.5Mtk3GSmb6YRgDRhYU.xzi8qJ6VemCjeqG9tfOPTL2VbE2f2sm', 'admin', 2, 'active'),
  ('Admin Nour', 'admin3@flms.edu', '$2a$10$8s.5Mtk3GSmb6YRgDRhYU.xzi8qJ6VemCjeqG9tfOPTL2VbE2f2sm', 'admin', 3, 'active'),
  ('Admin Yacine', 'admin4@flms.edu', '$2a$10$8s.5Mtk3GSmb6YRgDRhYU.xzi8qJ6VemCjeqG9tfOPTL2VbE2f2sm', 'admin', 4, 'active')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  role = VALUES(role),
  department_id = VALUES(department_id),
  status = VALUES(status);
