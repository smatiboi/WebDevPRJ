const pool = require('../config/db');

async function getMeta(req, res) {
  const [departments] = await pool.execute('SELECT id, name, code FROM departments ORDER BY name');
  const [categories] = await pool.execute('SELECT id, name FROM categories ORDER BY name');
  res.json({ departments, categories });
}

module.exports = { getMeta };
