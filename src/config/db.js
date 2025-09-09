// billing-workflow-mvp/src/db.js (ESM)
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const password = process.env.DB_PASS ?? process.env.DB_PASSWORD ?? '';

const required = ['DB_HOST','DB_NAME','DB_USER'];
const missing = required.filter(k => !process.env[k]);
if (!password) missing.push('DB_PASS or DB_PASSWORD');
if (missing.length) {
  console.error('❌ Missing env:', missing.join(', '));
  process.exit(2);
}

export const pool = await mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
