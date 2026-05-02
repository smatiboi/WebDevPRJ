require('dotenv').config();

const mysql = require('mysql2/promise');

const OWNERS = [
  {
    name: 'Project Owner',
    email: 'therealsmatiboi@gmail.com',
    passwordHash: '$2a$10$wibHp7jS0rIS5D5QRsANwe4HvrD4kOHCp.5r/Npb28ltVx/r2CKsS',
    departmentId: 1
  },
  {
    name: 'Smati Abdelkahar',
    email: 'threalsmatiboi@gmail.com',
    passwordHash: '$2a$10$wibHp7jS0rIS5D5QRsANwe4HvrD4kOHCp.5r/Npb28ltVx/r2CKsS',
    departmentId: 1
  }
];

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'flms_db'
  });

  await connection.execute(`
    ALTER TABLE users
    MODIFY role ENUM('student', 'faculty', 'librarian', 'admin', 'owner')
    NOT NULL DEFAULT 'student'
  `);

  for (const owner of OWNERS) {
    await connection.execute(
      `INSERT INTO users (name, email, password_hash, role, department_id, status)
       VALUES (?, ?, ?, 'owner', ?, 'active')
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         password_hash = VALUES(password_hash),
         role = 'owner',
         department_id = VALUES(department_id),
         status = 'active'`,
      [owner.name, owner.email, owner.passwordHash, owner.departmentId]
    );
  }

  const [rows] = await connection.execute(
    `SELECT id, name, email, role, status FROM users
     WHERE email IN ('therealsmatiboi@gmail.com', 'threalsmatiboi@gmail.com')
     ORDER BY email`
  );
  console.table(rows);
  await connection.end();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
