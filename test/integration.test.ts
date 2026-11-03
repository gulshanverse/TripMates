import test from 'node:test';
import assert from 'node:assert/strict';
import { TravelStore } from '../src/server/store';
import { MessagingStore } from '../src/server/messaging';

async function ready() {
  process.env.NODE_ENV = 'test';
  process.env.ALLOW_MEMORY_FALLBACK = 'true';
  const travel = new TravelStore();
  await travel.initialize();
  return travel;
}

async function register(store: TravelStore, email: string, name: string) {
  const user = await store.register(email, 'correct-horse-battery', name);
  assert.ok(user);
  return user;
}

test('connection request lifecycle is mutual, idempotent, and server-authorized', async () => {
  const store = await ready();
  const alice = await register(store, 'alice@example.com', 'Alice');
  const bob = await register(store, 'bob@example.com', 'Bob');
  assert.equal(await store.expressInterest(bob.id, alice.id), true);
  assert.equal(await store.expressInterest(bob.id, alice.id), true);
  const incoming = (await store.listConnections(bob.id)).find((item) => item.receiverId === bob.id);
  assert.ok(incoming);
  assert.equal((await store.updateConnection(incoming.id, alice.id, 'connected')).error, 'forbidden');
  assert.equal((await store.updateConnection(incoming.id, bob.id, 'connected')).connection?.status, 'connected');
  assert.equal(await store.areConnected(alice.id, bob.id), true);
  assert.equal((await store.listConnections(alice.id)).filter((item) => item.status === 'connected').length, 2);
});

test('trip join request notifications are persisted, deduplicated, and readable', async () => {
  const store = await ready();
  const organizer = await register(store, 'organizer@example.com', 'Organizer');
  const guest = await register(store, 'guest2@example.com', 'Guest');
  const notifications: { userId: string; type: string; key?: string }[] = [];
  store.setNotifier(async (userId, type, _body, _actor, _entity, dedupeKey) => notifications.push({ userId, type, key: dedupeKey }));
  const trip = await store.createTrip(organizer, { destinationId: 'rishikesh', title: 'Notification trip', summary: 'A trip with lifecycle notifications.', startDate: 'Nov 01', endDate: 'Nov 03', duration: '3 days', budget: 9000, capacity: 3, style: 'Adventure', imageUrl: 'https://example.com/trip.jpg' });
  assert.ok(trip);
  const request = await store.requestJoin(trip.id, guest.id);
  assert.ok('request' in request);
  assert.equal(notifications[0]?.type, 'trip_join_request');
  assert.equal((await store.updateJoinRequest(request.request.id, organizer.id, 'approved')).request?.status, 'approved');
  assert.equal(notifications.some((item) => item.userId === guest.id && item.type === 'trip_join_approved'), true);
});

test('connection messaging can require an eligible connection without weakening existing memory tests', async () => {
  const travel = await ready();
  const alice = await register(travel, 'alice2@example.com', 'Alice 2');
  const bob = await register(travel, 'bob2@example.com', 'Bob 2');
  const messaging = new MessagingStore();
  await messaging.initialize();
  messaging.setConnectionAuthorizer((a, b) => travel.areConnected(a, b));
  assert.equal((await messaging.createConversation(alice.id, [bob.id])).error, 'connection_required');
  await travel.expressInterest(bob.id, alice.id);
  const request = (await travel.listConnections(bob.id)).find((item) => item.receiverId === bob.id);
  assert.ok(request);
  await travel.updateConnection(request.id, bob.id, 'connected');
  assert.ok('conversation' in (await messaging.createConversation(alice.id, [bob.id])));
});

test('notification deduplication and read state are enforced', async () => {
  const messaging = new MessagingStore();
  await messaging.initialize();
  await messaging.addNotification('user-a', 'trip_updated', 'Trip updated', 'user-b', 'trip-1', 'trip-updated:trip-1:v1');
  await messaging.addNotification('user-a', 'trip_updated', 'Trip updated', 'user-b', 'trip-1', 'trip-updated:trip-1:v1');
  assert.equal((await messaging.listNotifications('user-a', true)).length, 1);
  await messaging.markNotificationsRead('user-a');
  assert.equal((await messaging.listNotifications('user-a', true)).length, 0);
});
