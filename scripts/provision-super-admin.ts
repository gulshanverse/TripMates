import mysql, { type Connection } from 'mysql2/promise';
import { randomUUID } from 'node:crypto';

export const PROVISIONING_CONFIRMATION = 'PROVISION_SUPER_ADMIN';

type ProvisioningEnvironment = {
  DATABASE_URL?: string;
  SUPER_ADMIN_EMAIL?: string;
  SUPER_ADMIN_PROVISIONING_CONFIRMATION?: string;
};

export function validateProvisioningAuthorization(env: ProvisioningEnvironment) {
  const databaseUrl = env.DATABASE_URL;
  const email = env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const confirmation = env.SUPER_ADMIN_PROVISIONING_CONFIRMATION;

  if (!databaseUrl) throw new Error('DATABASE_URL is required.');
  if (!email || confirmation !== PROVISIONING_CONFIRMATION) {
    throw new Error(
      'SUPER_ADMIN_EMAIL and explicit provisioning confirmation are required; run this only from a restricted deployment or database-maintenance shell.',
    );
  }

  return { databaseUrl, email };
}

export async function provisionSuperAdmin(connection: Connection, email: string) {
  await connection.beginTransaction();
  try {
    const [existing] = await connection.query<any[]>(
      "SELECT id FROM users WHERE role='super_admin' AND deactivated_at IS NULL LIMIT 1 FOR UPDATE",
    );
    if (existing[0]) {
      await connection.rollback();
      return false;
    }

    const [users] = await connection.query<any[]>(
      'SELECT id FROM users WHERE email=? AND deactivated_at IS NULL LIMIT 1 FOR UPDATE',
      [email],
    );
    if (!users[0]) throw new Error('The target account does not exist or is deactivated.');

    const [result] = await connection.query(
      "UPDATE users SET role='super_admin' WHERE id=? AND role<>'super_admin'",
      [users[0].id],
    );
    if (!(result as { affectedRows: number }).affectedRows) throw new Error('The target account could not be provisioned.');

    await connection.query(
      'INSERT INTO admin_audit_logs (id,actor_id,action,target_type,target_id,metadata) VALUES (?,?,?,?,?,?)',
      [randomUUID(), users[0].id, 'first_super_admin_provisioned', 'user', users[0].id, JSON.stringify({ email })],
    );
    await connection.commit();
    return true;
  } catch (error) {
    try { await connection.rollback(); } catch {}
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { databaseUrl, email } = validateProvisioningAuthorization(process.env);
  const connection = await mysql.createConnection(databaseUrl);
  try {
    const provisioned = await provisionSuperAdmin(connection, email);
    console.log(provisioned ? 'Initial super-admin provisioned successfully.' : 'A super-admin already exists; no changes made.');
  } finally {
    await connection.end();
  }
}
