import test from 'node:test';
import assert from 'node:assert/strict';
import { TravelStore } from '../src/server/store';
import { reviewsStore } from '../src/server/reviews';
import { ModerationStore } from '../src/server/moderation';

async function setup() {
  process.env.NODE_ENV = 'test';
  process.env.ALLOW_MEMORY_FALLBACK = 'true';
  const travel = new TravelStore();
  await travel.initialize();
  return travel;
}

async function register(travel: TravelStore, name: string) {
  const result = await travel.register(`${name.toLowerCase()}-${Date.now()}-${Math.random()}@example.com`, 'correct-horse-battery', name);
  assert.ok(result);
  return result;
}

const input = { overallRating: 5, tripExperienceRating: 4, organizerExperienceRating: 5, feedback: 'Thoughtful planning and a welcoming group.' };

test('only an accepted participant of an explicitly completed trip can review once', async () => {
  const travel = await setup();
  const owner = await register(travel, 'Review Owner');
  const guest = await register(travel, 'Eligible Guest');
  const pending = await register(travel, 'Pending Guest');
  const stranger = await register(travel, 'Unrelated Guest');
  const trip = await travel.createTrip(owner, { destinationId: 'rishikesh', title: 'Review eligibility trip', summary: 'A completed trip used to verify review eligibility.', startDate: 'Jan 01', endDate: 'Jan 03', duration: '3 days', budget: 9000, capacity: 4, style: 'Adventure', imageUrl: 'https://example.com/review.jpg' });
  assert.ok(trip);

  const request = await travel.requestJoin(trip.id, guest.id);
  assert.ok('request' in request);
  await travel.updateJoinRequest(request.request.id, owner.id, 'approved');
  const pendingRequest = await travel.requestJoin(trip.id, pending.id);
  assert.ok('request' in pendingRequest);
  assert.equal((await reviewsStore.createReview(guest.id, trip.id, input)).error, 'not_eligible');
  assert.equal((await travel.transitionTrip(trip.id, owner.id, 'ongoing')).status, 'ongoing');
  assert.equal((await travel.transitionTrip(trip.id, owner.id, 'completed')).status, 'completed');

  const eligible = await reviewsStore.createReview(guest.id, trip.id, input);
  assert.ok('review' in eligible);
  assert.equal((await reviewsStore.createReview(guest.id, trip.id, input)).error, 'duplicate');
  assert.equal((await reviewsStore.createReview(stranger.id, trip.id, input)).error, 'not_eligible');
  assert.equal((await reviewsStore.createReview(pending.id, trip.id, input)).error, 'not_eligible');
  assert.equal((await reviewsStore.createReview(owner.id, trip.id, input)).error, 'not_eligible');
});

test('review responses are organizer-owned and reports are duplicate-safe', async () => {
  const travel = await setup();
  const owner = await register(travel, 'Response Owner');
  const guest = await register(travel, 'Response Guest');
  const trip = await travel.createTrip(owner, { destinationId: 'rishikesh', title: 'Response trip', summary: 'A completed trip used to verify response ownership.', startDate: 'Feb 01', endDate: 'Feb 03', duration: '3 days', budget: 9000, capacity: 3, style: 'Culture-led', imageUrl: 'https://example.com/response.jpg' });
  assert.ok(trip);
  const request = await travel.requestJoin(trip.id, guest.id); assert.ok('request' in request);
  await travel.updateJoinRequest(request.request.id, owner.id, 'approved');
  await travel.transitionTrip(trip.id, owner.id, 'ongoing');
  await travel.transitionTrip(trip.id, owner.id, 'completed');
  const created = await reviewsStore.createReview(guest.id, trip.id, input); assert.ok('review' in created);
  const reviewId = created.review.id;
  assert.equal((await reviewsStore.respond(guest.id, reviewId, 'Thanks')).error, 'forbidden');
  assert.equal((await reviewsStore.respond(owner.id, reviewId, 'Thank you for travelling with us.')).ok, true);
  assert.equal((await reviewsStore.report(guest.id, reviewId, 'This is a test report')).ok, true);
  assert.equal((await reviewsStore.report(guest.id, reviewId, 'This is a duplicate')).error, 'duplicate');
});

test('review moderation remains permission-gated through existing RBAC', async () => {
  const moderation = new ModerationStore();
  (moderation as unknown as { roles: Map<string, string> }).roles.set('user', 'user');
  (moderation as unknown as { roles: Map<string, string> }).roles.set('moderator', 'moderator');
  assert.equal(await moderation.can('user', 'reviews.moderate'), false);
  assert.equal(await moderation.can('moderator', 'reviews.moderate'), true);
});
