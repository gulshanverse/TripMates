# TripMates

TripMates is an India-first travel social discovery platform: find better-fit companions, discover thoughtful group trips, and connect naturally through shared travel experiences.

## First vertical slice

The current build includes a polished public homepage, Rishikesh-first group-trip discovery, trip detail pages with itinerary and save actions, travel-buddy discovery with compatibility signals and private interest actions, responsive mobile navigation, accessible focus states, and server-owned API routes backed by the managed MySQL-compatible database when available.

The product intentionally keeps travel buddies, group-trip participation, and Travel Dates/romantic consent separate. This milestone adds email/password registration and login, secure HttpOnly sessions, profile onboarding/editing, account deletion, organizer trip creation/editing, join-request approval boundaries, capacity checks, and cancellable buddy interests. OAuth is intentionally not faked; a provider can be added when real credentials and callback configuration are available.

## Development

```bash
pnpm install
pnpm dev
```

The app listens on port `3000` by default. `DATABASE_URL` is supplied by the managed project. The server creates the additive first-slice tables if they do not exist. No destructive schema operations are performed.

Useful checks:

```bash
pnpm check
pnpm build
pnpm db:push
pnpm db:seed
```

See `plan.md` for the architecture and design system, and `TODO.md` for requirement traceability.

## Milestone API surface

Authentication uses `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, and `GET /api/auth/me`. Profile updates use `PATCH /api/profile`; account deletion uses `DELETE /api/account`. Sessions are opaque, rotated on login, stored server-side, expire after seven days, and are sent only in `HttpOnly`, `Secure`, `SameSite=Lax` cookies. Passwords are salted and hashed with Node scrypt and are never serialized.

Trip participation uses `POST /api/trips`, `PATCH /api/trips/:tripId`, `POST /api/trips/:tripId/join-requests`, `GET /api/join-requests`, and `PATCH /api/join-requests/:requestId`. Buddy interest supports `POST /api/buddies/:buddyId/interest` and authenticated cancellation with `DELETE /api/buddies/:buddyId/interest`. Migration `0002_auth_profiles_participation.sql` adds the relational model without destructive changes.

When `DATABASE_URL` is unavailable, the existing discovery and new account flows use an explicit session-local fallback for development. The production path should run the additive migration and connect a transactional database before launch.
