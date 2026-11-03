# Persistence and security hardening audit

## Findings at start of milestone

- Accounts, sessions, profiles, join requests, participant counts, and buddy connections were in-memory only.
- `db:push` applied only `0001_initial.sql` and had no migration ledger.
- Production could start without `DATABASE_URL` and silently report session-local persistence.
- Trip edit and organizer approval authorization compared display names.
- Join approval incremented an in-memory counter without a transaction or durable participant record.
- There was no automated test command or CI workflow.

## Decisions implemented

- MySQL is now the production source of truth for users, profiles, sessions, saved trips, travel connections, join requests, participants, and new organizer-owned trips.
- Memory fallback is opt-in only with `ALLOW_MEMORY_FALLBACK=true` outside production.
- Production startup fails if the database is missing or unreachable.
- Ordered migrations are tracked in `schema_migrations`.
- New trips store `organizer_user_id`; seeded editorial trips remain discoverable but have no editable owner until explicitly backfilled.
- Join approval locks the trip row, performs an atomic capacity update, inserts a participant, and commits as one transaction.
- Email delivery is disabled by default behind a provider-independent configuration boundary.

## Remaining follow-up

A real MySQL integration environment and browser automation environment should be attached to CI to run restart-persistence and browser E2E tests. Email verification/password reset delivery remains disabled until provider credentials and a vetted adapter are configured.
