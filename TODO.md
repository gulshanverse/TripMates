# TripMates delivery TODO

## 1. Runtime and project foundation — complete for first slice
- [x] The managed web project has server and database capabilities enabled.
- [x] A TypeScript web runtime listens on the configured port, serves the app, and exposes `/manus-routes.json` with the complete current page route set.
- [x] TypeScript diagnostics are registered before the first application code batch.
- [x] Project metadata includes a durable quoted `logoUrl` literal in `app.config.ts`.

## 2. Public brand and navigation — complete for first slice
- [x] Build a polished, responsive homepage with clear navigation to destination discovery, travel buddies, group trips, Travel Dates, how it works, safety, and account actions.
- [x] Use strong visual hierarchy, consistent spacing, accessible controls, beautiful travel imagery, trustworthy copy, and responsive layouts; avoid a generic admin-dashboard appearance, excessive gradients, random colors, oversized cards, unnecessary animation, and inconsistent component styling.
- [x] Preserve an India-first story and use Rishikesh as the initial pilot destination without hard-coding it as the only supported destination.

## 3. Destination discovery — in progress
- [x] Users can browse seeded destinations, including Rishikesh, with destination media, descriptive copy, and links into trip discovery.
- [ ] The data model supports future Indian and international destinations, INR display, time-zone-aware dates, location-based discovery, and future multi-language readiness.

## 4. Group-trip discovery and detail — in progress
- [x] Users can discover available group trips with destination, travel dates, budget, participant count/limit, organizer, interests, and itinerary highlights.
- [x] Users can open a trip detail view with itinerary, dates, budget, organizer information, participant capacity, trust cues, and clear request-to-join/save actions.
- [x] Trip records support authenticated organizer creation/editing plus join requests and approval/rejection boundaries.
- [x] Participant limits are checked at request and approval time; duplicate pending join requests are prevented.

## 5. Travel buddy discovery — in progress
- [ ] Users can discover people compatible on destinations, dates, budgets, interests, travel preferences, languages, travel styles, and group-size preferences.
- [x] Users can express and cancel interest through a non-romantic pending connection workflow.
- [x] Profiles support photos, travel interests, preferred destinations, budget preferences, travel style, languages, and visibility settings.

## 6. Travel Dates separation — open
- [ ] Travel Dates is an optional separate romantic travel-connection experience.
- [ ] It is adults-only (18+), explicit opt-in, mutually consented, separately preferred/visible, and never automatically converted from a travel connection.
- [ ] Privacy controls, blocking, reporting, and protection against unsolicited sensitive information are available for the experience.

## 7. Server/API foundation — in progress
- [x] Business logic is outside UI components and database access is behind service/repository layers.
- [ ] Read endpoints for destinations, trips, and buddy discovery return validated, paginated domain data.
- [x] Mutations for saving a trip and expressing buddy interest are server-backed, validated, authorization-ready, and idempotent where applicable.
- [x] No placeholder buttons, fake APIs, static-only cards, or simulated interactions are used for delivered functionality.

## 8. Relational data and migrations — in progress
- [ ] The relational model evaluates and separates User, UserProfile, UserPreference, UserVerification, Destination, DestinationMedia, Trip, TripItinerary, TripParticipant, TripJoinRequest, TripCategory, TravelBuddyPreference, TravelInterest, Connection, ConnectionRequest, RomanticPreference, RomanticConnectionConsent, Conversation, ConversationParticipant, Message, Notification, SavedTrip, Report, Block, ModerationAction, Organizer, OrganizerVerification, Review, Role, Permission, RolePermission, UserRole, and AuditLog as required by the approved model.
- [ ] Foreign keys, unique constraints, indexes, deletion behavior, pagination fields, and privacy boundaries are defined; JSON is used only for genuinely flexible data with documented trade-offs.
- [x] Migrations are deterministic, repeatable, additive where possible, and never destructively modify production data.

## 9. Authentication and authorization — in progress
- [x] Email/password authentication is implemented without fake OAuth; OAuth remains gated on real provider credentials.
- [x] Password hashing, opaque expiring sessions, HttpOnly/Secure cookies, rate limiting, protected middleware, profile updates, and account deactivation are implemented.
- [ ] Application sessions use the fixed `webdev_app_session` cookie name, validate the platform JWT using `MANUS_JWT_SECRET` and HS256, check expiry/app ID, and resolve the authenticated identity through application user/permission logic.
- [ ] OAuth state is bound to the initiating browser with a single-use nonce and fixed post-login redirect; logged-out state remains real until authentication succeeds.
- [ ] Protected backend endpoints independently enforce authorization; least-privilege roles cover User, Verified Organizer, Moderator, Support, Admin, and Super Admin as approved.

## 10. Messaging, notifications and safety — open
- [ ] Users can message permitted connections/trip members, receive notifications, and see unread state through server-owned records.
- [ ] Users can block and report people, trips, organizers, and content; sensitive moderation information is not exposed publicly.
- [ ] Administrative actions are recorded in audit logs.

## 11. Admin experience — open
- [ ] A separate secure administrative interface provides analytics, user management, identity verification review, trip moderation, organizer management, reports/complaints, content moderation, blocked/suspended accounts, role/permission management, audit logs, platform configuration, and feature flags where appropriate.
- [ ] Ordinary users cannot access administrative routes or operations.

## 12. Delivery quality — open
- [ ] Validate important user journeys through code inspection, diagnostics, typecheck/build checks, and focused runtime checks; fix confirmed issues rather than documenting avoidable failures.
- [ ] Maintain clean Git history, commit completed work, save checkpoints to the managed canonical remote, and synchronize the finished application back to the requested GitHub repository without committing secrets.
- [ ] Keep documentation current with architecture, setup, migrations, environment variables, and delivered scope.
