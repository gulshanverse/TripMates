import test from 'node:test';
import assert from 'node:assert/strict';
import { TravelStore } from '../src/server/store';

async function user(store: TravelStore, email: string, name: string) {
  const created = await store.register(email, 'correct-horse-battery', name);
  assert.ok(created);
  return created;
}

async function readyStore() {
  process.env.ALLOW_MEMORY_FALLBACK = 'true';
  process.env.NODE_ENV = 'test';
  const store = new TravelStore();
  await store.initialize();
  return store;
}

test('registration hashes and verifies passwords without exposing secrets', async () => {
  const store = await readyStore();
  const created = await user(store, 'hash@example.com', 'Hash Tester');
  assert.equal((created as Record<string, unknown>).passwordHash, undefined);
  assert.ok(await store.authenticate('hash@example.com', 'correct-horse-battery'));
  assert.equal(await store.authenticate('hash@example.com', 'wrong-password'), null);
});

test('sessions validate and revoke', async () => {
  const store = await readyStore();
  const created = await user(store, 'session@example.com', 'Session Tester');
  const token = await store.createSession(created.id);
  assert.equal((await store.getUserBySession(token))?.id, created.id);
  await store.destroySession(token);
  assert.equal(await store.getUserBySession(token), null);
});

test('organizer ownership, duplicate requests, approval, and capacity are enforced', async () => {
  const store = await readyStore();
  const owner = await user(store, 'owner@example.com', 'Trip Owner');
  const guest = await user(store, 'guest@example.com', 'Trip Guest');
  const intruder = await user(store, 'intruder@example.com', 'Trip Intruder');
  const trip = await store.createTrip(owner, { destinationId: 'rishikesh', title: 'Owned trip', summary: 'A properly owned trip for testing.', startDate: 'Nov 01', endDate: 'Nov 03', duration: '3 days', budget: 9000, capacity: 2, style: 'Adventure', imageUrl: 'https://example.com/trip.jpg' });
  assert.ok(trip);
  assert.equal(await store.updateTrip(trip.id, intruder, { title: 'Hijacked' }), null);
  const request = await store.requestJoin(trip.id, guest.id);
  assert.ok('request' in request);
  const duplicate = await store.requestJoin(trip.id, guest.id);
  assert.equal(duplicate.error, 'duplicate');
  assert.equal((await store.updateJoinRequest(request.request.id, intruder.id, 'approved')).error, 'forbidden');
  assert.equal((await store.updateJoinRequest(request.request.id, owner.id, 'approved')).request?.status, 'approved');
  const full = await store.requestJoin(trip.id, intruder.id);
  assert.equal(full.error, 'full');
});

test('approved join requests cannot be approved or rejected a second time', async () => {
  const store = await readyStore();
  const owner = await user(store, 'owner-race@example.com', 'Race Owner');
  const guest = await user(store, 'guest-race@example.com', 'Race Guest');
  const trip = await store.createTrip(owner, { destinationId: 'rishikesh', title: 'Race-safe trip', summary: 'A trip for lifecycle regression coverage.', startDate: 'Nov 01', endDate: 'Nov 03', duration: '3 days', budget: 9000, capacity: 2, style: 'Adventure', imageUrl: 'https://example.com/trip.jpg' });
  assert.ok(trip);
  const request = await store.requestJoin(trip.id, guest.id);
  assert.ok('request' in request);
  assert.equal((await store.updateJoinRequest(request.request.id, owner.id, 'approved')).request?.status, 'approved');
  assert.equal((await store.updateJoinRequest(request.request.id, owner.id, 'rejected')).error, 'not_found');
});

test('structured trips support drafts, guarded lifecycle transitions, and participant cancellation', async () => {
  const store = await readyStore();
  const owner = await user(store, 'lifecycle-owner@example.com', 'Lifecycle Owner');
  const guest = await user(store, 'lifecycle-guest@example.com', 'Lifecycle Guest');
  const trip = await store.createTrip(owner, {
    destinationId: 'rishikesh', title: 'Structured river weekend', summary: 'A detailed trip with a clear meeting point and preparation notes.', startDate: 'Dec 01', endDate: 'Dec 03', duration: '3 days', budget: 12000, capacity: 3, minParticipants: 2, style: 'Adventure', imageUrl: 'https://example.com/trip.jpg', status: 'draft', meetingPoint: 'Rishikesh railway station', includedItems: ['Local guide'], excludedItems: ['Travel to Rishikesh'], requiredEquipment: ['Walking shoes'], itinerary: [{ day: 'Day 1', title: 'Arrive and orient', detail: 'Meet the group and settle in.' }], budgetBreakdown: [{ label: 'Stay', amount: 4000, confirmed: false }], preparationGuidance: 'Bring a reusable bottle.', cancellationPolicy: 'Cancel before departure for organizer review.', participationPolicy: 'Respect the group pace and local guidance.',
  });
  assert.equal(trip?.status, 'draft');
  assert.equal((await store.requestJoin(trip!.id, guest.id)).error, 'unavailable');
  assert.equal((await store.transitionTrip(trip!.id, guest.id, 'published')).error, 'forbidden');
  assert.equal((await store.transitionTrip(trip!.id, owner.id, 'published')).status, 'published');
  assert.equal((await store.transitionTrip(trip!.id, owner.id, 'completed')).error, 'invalid_transition');
  const request = await store.requestJoin(trip!.id, guest.id);
  assert.ok('request' in request);
  assert.equal((await store.updateJoinRequest(request.request.id, owner.id, 'approved')).request?.status, 'approved');
  assert.equal(await store.cancelParticipation(trip!.id, guest.id), true);
  assert.equal((await store.transitionTrip(trip!.id, owner.id, 'cancelled')).status, 'cancelled');
});

test('pending approval is rejected after a trip completes or is cancelled', async () => {
  const store = await readyStore();
  const owner = await user(store, 'closed-owner@example.com', 'Closed Owner');
  const guest = await user(store, 'closed-guest@example.com', 'Closed Guest');
  const completedTrip = await store.createTrip(owner, { destinationId: 'rishikesh', title: 'Completed trip', summary: 'A trip that closes before approval.', startDate: 'Jan 01', endDate: 'Jan 03', duration: '3 days', budget: 9000, capacity: 3, style: 'Adventure', imageUrl: 'https://example.com/completed.jpg' });
  assert.ok(completedTrip);
  const completedRequest = await store.requestJoin(completedTrip.id, guest.id);
  assert.ok('request' in completedRequest);
  assert.equal((await store.transitionTrip(completedTrip.id, owner.id, 'ongoing')).status, 'ongoing');
  assert.equal((await store.transitionTrip(completedTrip.id, owner.id, 'completed')).status, 'completed');
  assert.equal((await store.updateJoinRequest(completedRequest.request.id, owner.id, 'approved')).error, 'unavailable');

  const cancelledTrip = await store.createTrip(owner, { destinationId: 'rishikesh', title: 'Cancelled trip', summary: 'A trip that is cancelled before approval.', startDate: 'Feb 01', endDate: 'Feb 03', duration: '3 days', budget: 9000, capacity: 3, style: 'Adventure', imageUrl: 'https://example.com/cancelled.jpg' });
  assert.ok(cancelledTrip);
  const cancelledRequest = await store.requestJoin(cancelledTrip.id, guest.id);
  assert.ok('request' in cancelledRequest);
  assert.equal((await store.transitionTrip(cancelledTrip.id, owner.id, 'cancelled')).status, 'cancelled');
  assert.equal((await store.updateJoinRequest(cancelledRequest.request.id, owner.id, 'approved')).error, 'unavailable');
});
