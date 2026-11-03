import mysql from 'mysql2/promise';
import fs from 'node:fs/promises';
import path from 'node:path';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required to push the TripMates schema.');
const sql = await fs.readFile(path.resolve('db/migrations/0001_initial.sql'), 'utf8');
const statements = sql.split(/;\s*(?:\r?\n|$)/).map((statement) => statement.trim()).filter(Boolean);
const connection = await mysql.createConnection(url);
try { for (const statement of statements) await connection.query(statement); console.log('TripMates schema is ready.'); }
finally { await connection.end(); }
