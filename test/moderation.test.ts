import test from 'node:test';
import assert from 'node:assert/strict';
import { ModerationStore } from '../src/server/moderation';

test('reports validate targets, prevent duplicates, and stay private', async () => {
  process.env.NODE_ENV = 'test'; process.env.ALLOW_MEMORY_FALLBACK = 'true';
  const store = new ModerationStore(); await store.initialize();
  const first = await store.submitReport('reporter', { targetType: 'user', targetId: 'target', category: 'harassment', reason: 'Repeated unwanted contact' });
  assert.ok('report' in first);
  const duplicate = await store.submitReport('reporter', { targetType: 'user', targetId: 'target', category: 'harassment', reason: 'Repeated unwanted contact' });
  assert.equal(duplicate.error, 'duplicate');
  assert.equal((await store.getReport('other-user', first.report.id)).error, 'forbidden');
  assert.equal((await store.getReport('reporter', first.report.id)).report?.reporterId, 'reporter');
});

test('moderation permissions, sanctions, appeals, verification, and audit trail are enforced', async () => {
  const store = new ModerationStore(); await store.initialize();
  (store as unknown as { roles: Map<string, string> }).roles.set('moderator', 'moderator');
  (store as unknown as { roles: Map<string, string> }).roles.set('admin', 'admin');
  assert.equal(await store.can('moderator', 'reports.read'), true);
  assert.equal(await store.can('moderator', 'admin.roles.manage'), false);
  const sanction = await store.imposeSanction('moderator', 'reported-user', { type: 'messaging_restriction', reason: 'Unsafe communication pattern' });
  assert.ok('sanction' in sanction);
  assert.equal(await store.hasRestriction('reported-user', 'messaging'), true);
  const appeal = await store.submitAppeal('reported-user', sanction.sanction.id, 'I would like this decision reviewed with additional context.');
  assert.ok('appeal' in appeal);
  assert.equal((await store.reviewAppeal('moderator', appeal.appeal.id, 'approved')).ok, true);
  assert.equal((await store.submitVerification('reported-user', 'I organize local day trips.')).status, 'pending');
  assert.equal((await store.reviewVerification('admin', 'reported-user', 'verified')).status, 'verified');
  assert.equal((await store.auditLog('admin')).entries.length >= 2, true);
});


test('moderation mutations do not report false success', async () => {
  const store = new ModerationStore(); await store.initialize();
  (store as unknown as { roles: Map<string, string> }).roles.set('moderator-2', 'moderator');
  assert.equal(await store.assignReport('moderator-2', 'missing-report', 'moderator-2'), false);
  assert.equal((await store.submitAppeal('unrelated-user', 'missing-sanction', 'This appeal should not be accepted because the sanction is absent.')).error, 'not_found');
  assert.equal((await store.reviewVerification('moderator-2', 'missing-user', 'verified')).error, 'forbidden');
});
