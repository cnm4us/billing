// scripts/test-db.js
import { pool } from '../src/config/db.js';

try {
  // Avoid aliasing to "current_user" (use whoami/user_conn instead)
  const [[meta]] = await pool.query(
    'SELECT VERSION() AS version, USER() AS user_conn, DATABASE() AS db'
  );
  console.table([meta]);

  const conn = await pool.getConnection();
  await conn.ping();
  conn.release();

  const [tables] = await pool.query('SHOW TABLES');
  console.log(`Tables (${tables.length}):`, tables.slice(0, 5));

  console.log('✅ DB connection looks good.');
  process.exit(0);
} catch (err) {
  console.error('❌ DB check failed:', err.code || err.name, '-', err.message);
  process.exit(1);
}
