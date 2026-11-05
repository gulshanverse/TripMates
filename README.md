# TripMates : Smart Travel & Dating System 

TripMates is an India-first travel social discovery platform: find better-fit companions, discover thoughtful group trips, and connect naturally through shared travel experiences.

## First vertical slice

The current build includes a polished public homepage, Rishikesh-first group-trip discovery, trip detail pages with itinerary and save actions, travel-buddy discovery with compatibility signals and private interest actions, responsive mobile navigation, accessible focus states, and server-owned API routes backed by the managed MySQL-compatible database when available.

The product intentionally keeps travel buddies, group-trip participation, and Travel Dates/romantic consent separate. This milestone adds email/password registration and login, secure HttpOnly sessions, profile onboarding/editing, account deletion, organizer trip creation/editing, join-request approval boundaries, capacity checks, and cancellable buddy interests. OAuth is intentionally not faked; a provider can be added when real credentials and callback configuration are available.

The persistence hardening pass makes MySQL the production source of truth for accounts, profiles, sessions, user-created trips, join requests, participants, saved trips, and travel connections. Production startup fails explicitly when `DATABASE_URL` is missing or unreachable. The in-memory path is available only when `ALLOW_MEMORY_FALLBACK=true` outside production, for isolated tests.

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
pnpm test
pnpm db:push
pnpm db:seed
```

`pnpm db:push` applies all ordered SQL migrations exactly once through the `schema_migrations` table. Configure a real email provider before enabling verification or reset delivery; `EMAIL_PROVIDER=disabled` is the safe default and no tokens are exposed by the application.

### First super-admin provisioning

The application never promotes an account during ordinary startup and exposes no public super-admin creation endpoint. Run `pnpm provision:super-admin` only from a separately authorized, restricted deployment or database-maintenance shell with `DATABASE_URL`, `SUPER_ADMIN_EMAIL`, and `SUPER_ADMIN_PROVISIONING_CONFIRMATION=PROVISION_SUPER_ADMIN` set. Authorization is provided by access to that restricted shell and the explicit confirmation; there is no misleading application-level secret that can be entered by an ordinary administrator. The command is transactional, idempotent, refuses to replace an existing super-admin, verifies that the target account exists and is active, records an audit event, and never logs credentials. Emergency recovery requires a separately authorized database-maintenance window and must preserve the same audit trail; ordinary administrators cannot self-promote.

## Messaging and notifications

Migration `0004_messaging_notifications.sql` adds conversations, participants, messages, read states, notifications, and blocks. A conversation is created only by an authenticated participant; duplicate participant rows are rejected by the composite primary key. Connection conversations are intended for mutually accepted travel connections, while trip conversations remain a separate kind. No conversation is created for Travel Dates or romantic consent.

The API includes `POST /api/conversations`, `GET /api/conversations`, `GET/POST /api/conversations/:id/messages`, `POST /api/conversations/:id/read`, `GET /api/conversations/:id/events`, `GET /api/notifications`, `POST /api/notifications/read`, and `POST /api/users/:id/block`. Every conversation and message read/send operation checks backend participant membership. Messages are persisted before the response is returned. Server-Sent Events are used instead of WebSockets because the current Express deployment has no WebSocket adapter; SSE reconnects through the browser's `EventSource` behavior and message IDs prevent duplicate client rendering.

See `plan.md` for the architecture and design system, and `TODO.md` for requirement traceability.

## Milestone API surface

Authentication uses `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, and `GET /api/auth/me`. Profile updates use `PATCH /api/profile`; account deletion uses `DELETE /api/account`. Sessions are opaque, rotated on login, stored server-side, expire after seven days, and are sent only in `HttpOnly`, `Secure`, `SameSite=Lax` cookies. Passwords are salted and hashed with Node scrypt and are never serialized.

Trip participation uses `POST /api/trips`, `PATCH /api/trips/:tripId`, `POST /api/trips/:tripId/join-requests`, `GET /api/join-requests`, and `PATCH /api/join-requests/:requestId`. Buddy interest supports `POST /api/buddies/:buddyId/interest` and authenticated cancellation with `DELETE /api/buddies/:buddyId/interest`. Migration `0002_auth_profiles_participation.sql` adds the relational model without destructive changes.

When `DATABASE_URL` is unavailable, the existing discovery and new account flows use an explicit session-local fallback for development. The production path should run the additive migration and connect a transactional database before launch.
