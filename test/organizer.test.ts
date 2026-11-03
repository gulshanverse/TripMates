import test from 'node:test';
import assert from 'node:assert/strict';
import { TravelStore } from '../src/server/store';

async function readyStore() {
  process.env.ALLOW_MEMORY_FALLBACK = 'true';
  process.env.NODE_ENV = 'test';
  const store = new TravelStore();
  await store.initialize();
  return store;
}

test('organizer profile onboarding persists without exposing verification evidence', async () => {
  const store = await readyStore();
  const owner = await store.register('organizer-profile@example.com', 'correct-horse-battery', 'Profile Organizer');
  assert.ok(owner);
  const profile = await store.saveOrganizerProfile(owner.id, {
    organizerType: 'individual',
    description: 'I organize small, thoughtful trips with clear plans and local context for curious travelers.',
    contactPreferences: ['TripMates messages'],
    operatingLocation: 'Rishikesh, Uttarakhand',
    specialties: ['Slow travel', 'Local culture'],
    experienceCategories: ['Culture', 'Weekend escapes'],
  });
  assert.equal(profile?.displayName, 'Profile Organizer');
  assert.equal(profile?.operatingLocation, 'Rishikesh, Uttarakhand');
  assert.equal((profile as Record<string, unknown>).submittedNote, undefined);
});

test('organizer dashboard only lists trips owned by the organizer', async () => {
  const store = await readyStore();
  const owner = await store.register('organizer-owner@example.com', 'correct-horse-battery', 'Owner');
  const other = await store.register('organizer-other@example.com', 'correct-horse-battery', 'Other');
  assert.ok(owner && other);
  const owned = await store.createTrip(owner, { destinationId: 'rishikesh', title: 'Owned organizer trip', summary: 'A trip created by the organizer for dashboard coverage.', startDate: 'Dec 01', endDate: 'Dec 03', duration: '3 days', budget: 9000, capacity: 6, style: 'Adventure', imageUrl: 'https://example.com/trip.jpg' });
  await store.createTrip(other, { destinationId: 'rishikesh', title: 'Other organizer trip', summary: 'A different organizer trip for ownership coverage.', startDate: 'Dec 04', endDate: 'Dec 06', duration: '3 days', budget: 9000, capacity: 6, style: 'Adventure', imageUrl: 'https://example.com/trip.jpg' });
  const trips = await store.listOrganizerTrips(owner.id);
  assert.equal(trips.length, 1);
  assert.equal(trips[0]?.id, owned?.id);
});
