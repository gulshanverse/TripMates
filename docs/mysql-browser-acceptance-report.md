# TripMates MySQL and browser acceptance report

Date: 2026-11-03
Branch: `feature/mysql-browser-acceptance`
Baseline: `50bd78f`

## Results

- **Passed** — clean MySQL migration chain `0001` through `0006` on MySQL `8.0.46`.
- **Passed** — `schema_migrations` contains six ordered entries after the first run.
- **Passed** — second `pnpm db:push` applies zero migrations and leaves the ledger unchanged.
- **Passed** — real-MySQL persistence suite: users, sessions, profiles, user-created trips, join requests, participants, connections, conversations, messages, read state, notifications, blocks, reports, sanctions, appeals, organizer verification, roles, and audit logs.
- **Passed** — simultaneous join approvals against MySQL: one approval succeeds and the nearly-full trip returns `full`; capacity is not exceeded.
- **Passed** — application restart smoke test is implemented as `pnpm test:restart` and verifies session/profile retrieval after process restart.
- **Passed** — Playwright Chromium suite: registration/profile persistence, trip creation/discovery/join/capacity, connection acceptance, messaging, blocking, admin denial, cookie flags, and cross-origin mutation rejection.
- **Passed** — existing unit/in-memory suite: 12 passed; the MySQL test is skipped when `DATABASE_URL` is absent.
- **Passed** — TypeScript check and production build.

## Reproduction

```bash
export DATABASE_URL='mysql://tripmates:tripmates@127.0.0.1:3306/tripmates_test'
export NODE_ENV=test
export ALLOW_MEMORY_FALLBACK=false
pnpm db:push
pnpm db:seed
pnpm test:mysql
pnpm test:restart
pnpm exec playwright install chromium
pnpm test:e2e
pnpm check
pnpm build
```

The database must be dedicated to acceptance testing. The seed command now writes the checked-in editorial destinations and trips into the configured database using idempotent upserts; it does not access production services.

## CI

GitHub Actions now provisions a MySQL 8.4 service container, runs the migration ledger stability check, executes unit and real-MySQL tests, installs Chromium, runs Playwright, type-checks, and builds. CI uses a dedicated service credential and database defined in the workflow; no production secret is required.

## Security regression decision

The deployed architecture uses opaque `HttpOnly`, `Secure`, `SameSite=Lax` cookies and does not enable cross-origin API access. The branch adds an `Origin` host check for state-changing `/api/*` requests. Requests without an `Origin` header remain supported for non-browser clients and are covered by the existing authorization checks. A token-based CSRF mechanism is not added because the current same-site cookie policy plus explicit Origin validation addresses the browser threat model without introducing a token distribution flow; this should be revisited if cross-site embedding, relaxed cookie policy, or cross-origin clients are introduced.

## Remaining limitations

- The local verification used MySQL 8.0.46; CI uses MySQL 8.4. Both are MySQL 8.x, but a separate production-like managed MySQL verification remains environment-dependent.
- The browser suite intentionally uses isolated, uniquely named records but does not attempt destructive cleanup; run it against a disposable database.
- No production deployment or paid external service was activated.
