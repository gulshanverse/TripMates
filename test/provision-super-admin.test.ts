import test from 'node:test';
import assert from 'node:assert/strict';
import { PROVISIONING_CONFIRMATION, validateProvisioningAuthorization } from '../scripts/provision-super-admin';

test('accepts provisioning only with explicit confirmation in the restricted-shell contract', () => {
  assert.deepEqual(
    validateProvisioningAuthorization({
      DATABASE_URL: 'mysql://example',
      SUPER_ADMIN_EMAIL: '  Admin@Example.com ',
      SUPER_ADMIN_PROVISIONING_CONFIRMATION: PROVISIONING_CONFIRMATION,
    }),
    { databaseUrl: 'mysql://example', email: 'admin@example.com' },
  );
});

test('rejects missing confirmation and does not accept the removed secret variable', () => {
  assert.throws(
    () => validateProvisioningAuthorization({ DATABASE_URL: 'mysql://example', SUPER_ADMIN_EMAIL: 'admin@example.com' }),
    /explicit provisioning confirmation/,
  );
  assert.throws(
    () => validateProvisioningAuthorization({
      DATABASE_URL: 'mysql://example',
      SUPER_ADMIN_EMAIL: 'admin@example.com',
      SUPER_ADMIN_PROVISIONING_SECRET: 'anything',
    } as never),
    /explicit provisioning confirmation/,
  );
});
