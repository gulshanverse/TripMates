# TripMates

TripMates is an India-first travel social discovery platform: find better-fit companions, discover thoughtful group trips, and connect naturally through shared travel experiences.

## First vertical slice

The current build includes a polished public homepage, Rishikesh-first group-trip discovery, trip detail pages with itinerary and save actions, travel-buddy discovery with compatibility signals and private interest actions, responsive mobile navigation, accessible focus states, and server-owned API routes backed by the managed MySQL-compatible database when available.

The product intentionally keeps travel buddies, group-trip participation, and Travel Dates/romantic consent separate. Login, onboarding, group join requests, messaging, moderation, and admin workflows are next in the delivery plan.

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
