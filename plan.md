# TripMates implementation plan

## Scope and execution approach

TripMates is an India-first travel social discovery platform. The first implementation pass establishes a real, extensible vertical slice rather than a collection of static screens: a polished public landing experience, destination-led discovery, trip discovery/detail interactions, buddy discovery, profile foundations, and server-owned API seams for persistent data. The initial pilot story is Rishikesh, while destinations, trips, preferences, connections, messages, moderation, roles, and admin tools remain modeled as separate modules so later expansion does not conflate travel buddies, group participation, or romantic consent.

The managed project has server and database capabilities enabled. The application will use a TypeScript modular monolith with a React frontend, an Express server, Drizzle ORM over the managed MySQL-compatible database, Zod validation, and a small service/repository boundary. The first pass will ship with deterministic seed data and additive schema/migration files; user-facing mutations such as saving a trip and expressing buddy interest will go through server routes and be structured for database persistence. No credentials are hard-coded, and the app will preserve a path to Manus OAuth application sessions before exposing private features.

### Project structure

- `src/client/`: React entrypoint, route shell, visual system, feature components, client state and API calls.
- `src/server/`: Express bootstrap, API routes, request validation, domain services and repositories.
- `src/shared/`: domain types, schemas and constants shared by client and server.
- `db/`: Drizzle schema, SQL migrations and seed scripts for destinations, trips, profiles and interests.
- `public/`: route manifest, favicon/brand metadata and durable static assets.
- `app.config.ts`: project logo metadata.
- `plan.md` and `TODO.md`: design decisions and requirements traceability.

### Delivery stages

1. Establish the runtime, diagnostics, route manifest, design system and core domain schema.
2. Build the public home/discovery experience with Rishikesh-first content and responsive navigation.
3. Add server-backed discovery endpoints and client interactions for trip saving, buddy interest and trip-detail exploration.
4. Add OAuth-backed sessions, profile editing and visibility controls before private data is exposed.
5. Add group-trip creation/join requests, transactional participant limits, notifications and conversations.
6. Add reporting/blocking, organizer verification, moderation, audit logs and a role-protected admin surface.
7. Expand destinations, SEO/public content, testing, deployment configuration and GitHub synchronization.

## Design direction

### Other candidate styles

- Alpine editorial travel journal — probability 0.06.
- Quiet luxury community atlas — probability 0.08.
- Electric backpacker bulletin — probability 0.05.

### Chosen movement: quiet luxury community atlas

**Design Movement:** Editorial travel atlas meets warm, modern community product: confident typography, tactile surfaces and image-led discovery without looking like a generic dashboard.

**Core Principles:** Make place the hero; make trust visible; keep choices calm and legible; use social proof without gamification noise.

**Color Philosophy:** Deep indigo anchors trust and navigation, mineral cream provides an inviting paper-like base, and a single saffron-coral accent signals action and warmth. Green is reserved for verified/healthy states rather than decoration.

**Layout Paradigm:** A left-anchored editorial rail with asymmetric image-and-copy compositions, a persistent compact navigation layer, and horizontally flowing discovery rows instead of a wall of equal cards.

**Signature Elements:** Atlas-style eyebrow labels, thin contour-line dividers, and compact pill metadata that reads like a field note.

**Interaction Philosophy:** Every action should feel like making a considered travel decision: clear label, immediate feedback, reversible save/undo, and no dark patterns.

**Animation:** Use short 160–220ms fades and small translate transitions for cards and filters; prefer image reveal and underline movement over bouncing or parallax; respect reduced-motion preferences.

**Typography System:** Use a display serif for editorial headlines and a clean sans-serif for UI/body. Headline hierarchy is oversized but tightly measured; metadata is small, uppercase, and tracked.

**Brand Essence:** Travel together, connect naturally — for curious travelers who want better-fit companions and better-organized trips. Personality: warm, discerning, grounded.

**Brand Voice:** Headlines are specific and human: “Find your people for the road ahead.” CTAs are active but low-pressure: “Explore Rishikesh trips” and “See who’s going”.

**Wordmark & Logo:** A compact route-mark symbol made from two offset waypoints joined by a subtle path, paired with a restrained TripMates wordmark.

**Signature Brand Color:** `#F26B5E` saffron-coral, used sparingly for primary actions and meaningful connection moments.

## Key technical decisions and risks

- The managed database is shared by development and publication, so migrations remain additive and seed scripts are idempotent; no destructive reset is used.
- The database contract is MySQL-compatible, so the schema avoids PostgreSQL-only features and keeps geospatial discovery as a future indexed latitude/longitude extension.
- Public discovery can be read without a user session; saves, interests, messaging and private profile details must be session-authorized once OAuth is implemented.
- Travel buddy, group-trip participant, and romantic consent records remain separate domain concepts. A buddy interest never implies romantic consent, and trip participation never implies a connection.
- The first pass will use the managed image-generation/storage path only for planned hero art; avatars and trip imagery should be replaceable through storage-backed media records.
