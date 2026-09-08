import fs from 'node:fs/promises';
import { pool } from '../src/app.js';

try {
  const schema = await fs.readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
  await pool.query(schema);
  console.log('SHINEX database migration completed.');
} finally {
  await pool.end();
}
