# Trip operations experience

Migration `0008_trip_operations.sql` adds structured trip planning fields without changing or deleting the `0001`–`0007` model. Existing seeded trips remain published; newly created trips default to published for backward compatibility, while the API accepts `status: "draft"` for organizer drafts.

## Lifecycle

The server enforces `draft → published → full → ongoing → completed`. `published → ongoing` is allowed for organizer-controlled operational updates, and `cancelled` is a separate controlled transition from draft, published, full, or ongoing. Completion is never inferred from dates. MySQL lifecycle transitions and approvals use row locks; participant cancellation decrements the real count and reopens a full trip.

## API additions

- `POST /api/trips` accepts itinerary, meeting point, budget breakdown entries with `confirmed`, inclusions/exclusions, equipment, preparation, cancellation and participation policies, `minParticipants`, and draft/published status.
- `PATCH /api/trips/:tripId` updates structured fields for the owning organizer and notifies participants.
- `PATCH /api/trips/:tripId/status` performs an authorized lifecycle transition.
- `DELETE /api/trips/:tripId/participation` lets an accepted participant cancel their place.
- Existing join-request APIs continue to use transactional capacity protection and now reject drafts, completed trips, and cancelled trips.

## Reviews gap

Reviews are intentionally not implemented in this milestone. The current model has no reliable organizer-controlled completion evidence or immutable eligibility event tying a participant to a completed trip. Adding a review endpoint now would weaken the requirement that only eligible participants of completed trips may review. The gap is documented rather than bypassed; ratings remain based only on existing stored data, with no fabricated testimonials or scores.

Private verification records and participant identities are not included in public trip responses. Organizer-facing request data remains restricted to authenticated organizer endpoints.
