import mysql from 'mysql2/promise';
import fs from 'node:fs/promises';
import path from 'node:path';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required to push the TripMates schema.');
const migrationDir = path.resolve('db/migrations');
const files = (await fs.readdir(migrationDir)).filter((file) => file.endsWith('.sql')).sort();
const connection = await mysql.createConnection(url);
try {
  await connection.query(`CREATE TABLE IF NOT EXISTS schema_migrations (filename VARCHAR(255) PRIMARY KEY, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
  for (const filename of files) {
    const [rows] = await connection.query('SELECT filename FROM schema_migrations WHERE filename = ?', [filename]);
    if ((rows as { filename: string }[]).length) continue;
    const sql = await fs.readFile(path.join(migrationDir, filename), 'utf8');
    await connection.beginTransaction();
    try {
      for (const statement of sql.split(/;\s*(?:\r?\n|$)/).map((item) => item.trim()).filter(Boolean)) await connection.query(statement);
      await connection.query('INSERT INTO schema_migrations (filename) VALUES (?)', [filename]);
      await connection.commit(); console.log(`Applied ${filename}`);
    } catch (error) { await connection.rollback(); throw error; }
  }
  console.log('TripMates schema is ready.');
}
finally { await connection.end(); }
