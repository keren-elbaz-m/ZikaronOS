# Salon Discovery & Guest Registration — Tech Plan

> Epic: epic.md · Product: ../../mission.md

## Approach

Build a public **`salons` read module** and a **`registrations` module** in `apps/api` (NestJS). Their
request and response contracts are zod schemas in `packages/*`, shared with `apps/web`.

`apps/web` renders `/salons` (list and map, with filters parsed from and written to search params),
`/salons/[id]` (server-rendered, so links unfurl and are shareable) and `/guest` (my registration and profile),
following the prototype's layout.

Registration is a single transactional command. It locks the host salon row, re-checks openness and capacity,
replaces any previous registration for the guest, recomputes the open flag and seat counters, and
emits domain events (`GuestRegistered`, `GuestRegistrationCancelled`, `GuestSeatsChanged`). Those events replace
the Django signals, and the notifications module consumes them.

Parity is proven by contract tests that replay legacy `host_salons_map` and `salonguests` cases
(from `legacy-baseline/backend-discovery.md` §5.3–5.4, §6.3, §6.9) against the new API before the UI is built.

## Architecture Impact

- **API:** `GET /salons` (public, cacheable, field-whitelisted DTO with no host contact; non-IL fields stripped
  server-side), `GET /salons/:id`, `POST/PATCH/DELETE /registrations`, `GET/PATCH /guests/me`. Names are TBD by the
  `platform-rewrite` API conventions. The legacy endpoint shapes do not need to survive (all clients are rewritten),
  but the Easy feed does (`back-office-operations`).
- **Data:**
  - `GuestSalon` stays one-active-per-guest (unique constraint).
  - Stored `invites_*_count` counters are either replaced by computed seats-taken (a query or a view) or kept and
    updated inside the transaction. Decide in the first spec. Legacy counters are unreliable, so the migration
    must recompute them.
  - The `9999` floor/apartment sentinel becomes `null`.
- **Caching:** the legacy 5-minute anonymous map cache is replaced by HTTP caching (or ISR) of the public DTO.
  The DTO never contains private fields, so a cache can't leak them.
- **Web:** URL-state filters (one parse/serialize helper with legacy `?city=` slug compatibility), the map
  component (provider TBD), a redirect from `/site/salonSearch/mapview/:id` and `/site/salonSearch*`, and .ics generation.
- **Geo:** the IL-only behavior (450) has to be reproduced at the edge or in middleware. The source is not in the repo.
- **Events → notifications:** `guests_1`/`guests_1new`, `hosts_4`, `hosts_5` are wired through
  `notifications-and-reminders`.

## Risks & Unknowns

- **Account-less vs account-based registration** (product brief decision 1) changes the data model, the auth
  dependency and the reminders. This blocks `guest-registration`, so settle it first.
- **Race conditions on the last seats.** Legacy has no locking. The new command must use row locks or serializable
  isolation, and needs a concurrency test.
- **Map provider** (Google vs Leaflet/OSM) and the distance method. Public OSM tiles can't go to production. Google
  Distance Matrix costs money per call. A spike is needed before `salon-search`.
- **Time zone:** legacy stores naive Jerusalem datetimes. The time-of-day filter and the "future" checks must use
  `Asia/Jerusalem` explicitly. This depends on the `platform-rewrite` data-migration decision.
- **Geo-block source unknown** (450). Confirm with whoever operates prod infra.
- **Dependencies:**
  - `platform-rewrite`: monorepo, ORM, migrated City/Language/SalonDay data, API conventions.
  - `authentication-and-accounts`: guest accounts and the pending selection through sign-up.
  - `notifications-and-reminders`: event consumers.
  - `site-shell-content-and-i18n`: layout and i18n.
  - `salon-hosting`: creates the salons listed here.

## Candidate Specs

- `salon-search` — public `/salons` list and map with URL filters (incl. legacy `?city=` slugs), the listing rules,
  non-IL stripping, the safe public DTO and caching, and the geo-block.
- `salon-page` — shareable `/salons/[id]` with details, witness paragraph and the full/closed state, plus a redirect from the legacy `mapview/:id` deep links.
- `guest-registration` — register 1–3 seats in a transactional capacity check with the one-active-registration rule, the pending selection through
  sign-up, the confirmation with .ics and share, and the `guests_1` events.
- `guest-my-salon` — `/guest`: my registration (incl. the digital link), cancel (`hosts_4`), change seats (`hosts_5`) and
  profile edit with Places-validated city/address.
