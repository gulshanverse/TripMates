import mysql from 'mysql2/promise';
import { randomUUID } from 'node:crypto';

const databaseUrl = process.env.DATABASE_URL;
const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
const secret = process.env.SUPER_ADMIN_PROVISIONING_SECRET;
const confirmation = process.env.SUPER_ADMIN_PROVISIONING_CONFIRMATION;

if (!databaseUrl) throw new Error('DATABASE_URL is required.');
if (!email || !secret || confirmation !== 'PROVISION_SUPER_ADMIN') {
  throw new Error('SUPER_ADMIN_EMAIL, SUPER_ADMIN_PROVISIONING_SECRET, and explicit provisioning confirmation are required.');
}

const connection = await mysql.createConnection(databaseUrl);
try {
  await connection.beginTransaction();
  const [existing] = await connection.query<any[]>('SELECT id FROM users WHERE role=\'super_admin\' AND deactivated_at IS NULL LIMIT 1 FOR UPDATE');
  if (existing[0]) {
    await connection.rollback();
    console.log('A super-admin already exists; no changes made.');
    process.exit(0);
  }

  const [users] = await connection.query<any[]>('SELECT id FROM users WHERE email=? AND deactivated_at IS NULL LIMIT 1 FOR UPDATE', [email]);
  if (!users[0]) throw new Error('The target account does not exist or is deactivated.');

  const [result] = await connection.query('UPDATE users SET role=\'super_admin\' WHERE id=? AND role<>\'super_admin\'', [users[0].id]);
  if (!(result as { affectedRows: number }).affectedRows) throw new Error('The target account could not be provisioned.');

  await connection.query(
    'INSERT INTO admin_audit_logs (id,actor_id,action,target_type,target_id,metadata) VALUES (?,?,?,?,?,?)',
    [randomUUID(), users[0].id, 'first_super_admin_provisioned', 'user', users[0].id, JSON.stringify({ email })],
  );
  await connection.commit();
  console.log('Initial super-admin provisioned successfully.');
} catch (error) {
  try { await connection.rollback(); } catch {}
  throw error;
} finally {
  await connection.end();
}

void secret;
