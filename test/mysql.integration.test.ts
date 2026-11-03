import test from 'node:test';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import { TravelStore } from '../src/server/store';
import { MessagingStore } from '../src/server/messaging';
import { ModerationStore } from '../src/server/moderation';

const databaseUrl = process.env.DATABASE_URL;
const integration = databaseUrl ? test : test.skip;

integration('persists core journeys and enforces MySQL authorization and capacity', async () => {
  process.env.NODE_ENV = 'test';
  process.env.ALLOW_MEMORY_FALLBACK = 'false';
  const travel = new TravelStore();
  const messaging = new MessagingStore();
  const moderation = new ModerationStore();
  await travel.initialize();
  await messaging.initialize();
  await moderation.initialize();
  travel.setNotifier((userId, type, body, actorId, entityId, dedupeKey) => messaging.addNotification(userId, type, body, actorId, entityId, dedupeKey));
  moderation.setNotifier((userId, type, body, actorId, entityId, dedupeKey) => messaging.addNotification(userId, type, body, actorId, entityId, dedupeKey));
  messaging.setConnectionAuthorizer((a, b) => travel.areConnected(a, b));
  messaging.setRestrictionChecker((userId) => moderation.hasRestriction(userId, 'messaging'));

  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const owner = await travel.register(`mysql-owner-${suffix}@example.com`, 'correct-horse-battery', 'MySQL Owner');
  const guest = await travel.register(`mysql-guest-${suffix}@example.com`, 'correct-horse-battery', 'MySQL Guest');
  const other = await travel.register(`mysql-other-${suffix}@example.com`, 'correct-horse-battery', 'MySQL Other');
  assert.ok(owner && guest && other);

  const session = await travel.createSession(owner.id);
  assert.equal((await travel.getUserBySession(session))?.id, owner.id);
  await travel.updateProfile(owner.id, { age: 29, languages: ['English'], visibility: 'private' });
  assert.equal((await travel.getUserBySession(session))?.profile.age, 29);
  assert.equal((await travel.getUserBySession(session))?.profile.visibility, 'private');

  const trip = await travel.createTrip(owner, { destinationId: 'rishikesh', title: `MySQL acceptance ${suffix}`, summary: 'A persisted trip used by the acceptance suite.', startDate: 'Nov 01', endDate: 'Nov 03', duration: '3 days', budget: 9000, capacity: 2, style: 'Adventure', imageUrl: 'https://example.com/trip.jpg' });
  assert.ok(trip);
  const guestRequest = await travel.requestJoin(trip.id, guest.id);
  const otherRequest = await travel.requestJoin(trip.id, other.id);
  assert.ok('request' in guestRequest && 'request' in otherRequest);
  const approvals = await Promise.all([
    travel.updateJoinRequest(guestRequest.request.id, owner.id, 'approved'),
    travel.updateJoinRequest(otherRequest.request.id, owner.id, 'approved'),
  ]);
  assert.equal(approvals.filter((result) => 'request' in result).length, 1);
  assert.equal(approvals.filter((result) => 'error' in result && result.error === 'full').length, 1);
  assert.equal((await travel.listJoinRequests(guest.id)).some((request) => request.status === 'approved'), true);

  assert.equal(await travel.expressInterest(owner.id, guest.id), true);
  const connection = (await travel.listConnections(owner.id)).find((item) => item.senderId === guest.id && item.receiverId === owner.id);
  assert.ok(connection);
  assert.equal((await travel.updateConnection(connection.id, owner.id, 'connected')).connection?.status, 'connected');
  const conversation = await messaging.createConversation(owner.id, [guest.id]);
  assert.ok('conversation' in conversation);
  const sent = await messaging.sendMessage(conversation.conversation.id, owner.id, 'Persisted hello');
  assert.ok('message' in sent);
  assert.equal((await messaging.listMessages(conversation.conversation.id, guest.id)).messages[0]?.body, 'Persisted hello');
  assert.equal(await messaging.markRead(conversation.conversation.id, guest.id, sent.message.id), true);
  assert.equal((await messaging.listNotifications(guest.id, true)).some((item) => item.type === 'new_message'), true);
  await messaging.block(guest.id, owner.id);
  assert.equal((await messaging.sendMessage(conversation.conversation.id, owner.id, 'Blocked hello')).error, 'forbidden');

  const report = await moderation.submitReport(guest.id, { targetType: 'user', targetId: owner.id, category: 'other', reason: 'Acceptance report' });
  assert.ok('report' in report);
  const adminDb = await mysql.createConnection(databaseUrl);
  try {
    await adminDb.execute('UPDATE users SET role=\'admin\' WHERE id=?', [owner.id]);
  } finally {
    await adminDb.end();
  }
  assert.equal((await moderation.updateReport(owner.id, report.report.id, 'action_taken')).ok, true);
  const sanction = await moderation.imposeSanction(owner.id, guest.id, { type: 'messaging_restriction', reason: 'Acceptance restriction' });
  assert.ok('sanction' in sanction);
  assert.ok('appeal' in (await moderation.submitAppeal(guest.id, sanction.sanction.id, 'Please review this decision')));
  assert.equal((await moderation.submitVerification(guest.id)).status, 'pending');
  assert.equal((await moderation.reviewVerification(owner.id, guest.id, 'verified')).status, 'verified');
  assert.equal((await moderation.auditLog(owner.id)).entries.length > 0, true);
  await Promise.all([travel.close(), messaging.close(), moderation.close()]);
});
