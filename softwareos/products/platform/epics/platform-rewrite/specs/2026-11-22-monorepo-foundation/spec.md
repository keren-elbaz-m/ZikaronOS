# Monorepo foundation — two APIs, worker, two Next.js apps, Strapi, he/en

> Epic: ../../epic.md
> Status: in-progress
> Branch: feat/platform-rewrite/monorepo-foundation
> Covers: zikaron-basalon-platform/** (repo MoveoTech/zikaron-basalon-platform): apps/web/**, apps/admin/**, apps/api-public/**, apps/api-admin/**, apps/worker/**, apps/cms/**, apps/e2e/**, packages/**

## Overview

The first spec of the rewrite. It builds the new system's skeleton **locally**, end to end, so every later functional spec has somewhere to land:

- one pnpm + Turborepo monorepo at `zikaron-platform/` inside this hub (no new git repo, nothing deployed);
- **two NestJS backends** (`api-public` for hosts, guests and witnesses; `api-admin` for staff and partner integrations) and a **worker** for background jobs;
- **two Next.js frontends** (`web`, `admin`) that keep the prototype's design (`prototype/zikaron-next`) screen for screen;
- **Strapi 5** (`cms`) as the content source, with **Hebrew and English**: every user-facing string has a bundled translation inside the app, and Strapi can override it per locale;
- shared packages for business rules, contracts, auth, database, UI, i18n and config.

It follows the target architecture in the plan (two APIs + worker on Fargate, Aurora Postgres, jobs in Postgres instead of Lambda/SQS/EventBridge). AWS deployment itself is a later spec (`aws-infra-and-deploy`); here everything runs on localhost with Docker for Postgres, Valkey and Mailpit.

**New decision recorded here:** content is managed in **Strapi 5** (its own Postgres database), and both apps are bilingual (he default/RTL, en/LTR). This adds a sixth deployable (`cms`) to the AWS plan; `aws-infra-and-deploy` must add it (one more Fargate service + an S3 bucket for media).

**Decisions already taken (2026-11-22):** guest registration keeps an account (legacy behaviour, overrides the prototype's account-less form); email via Amazon SES (Mailpit locally); maps via Google Maps (the prototype's Leaflet map stays only as the local fallback when no key is set); witness self-registration is dropped (it is broken today; staff add witnesses).

Shaping note: shaped in one pass from the conversation of 2026-11-22 at the user's request to run without step-by-step approvals; the user's answers stand in for the /shape-spec questions. The global `tech-stack` standard (React 18 + Vite + Express) is a placeholder and is superseded for this customer by the epic's tech plan (Next.js + NestJS).

## Goals & User Stories

- As a **developer**, I run three commands and have the whole new system on localhost, so I can build functional specs on it.
- As a **guest**, I browse salons on a map, open a salon page, sign up or log in, and register 1–3 seats, in Hebrew or English.
- As a **host**, I log in, create a salon through the wizard, and see my host page.
- As **staff**, I log in to the admin, see the dashboard, lists and profiles, and team a witness to a salon from ranked matches.
- As a **content editor**, I change a text in Strapi (in Hebrew or English) and see it on the site within a minute, without a deploy.
- As the **team**, we know that a spike on the public API cannot slow the admin, and that a failed save never sends an email.

## Acceptance Criteria

1. AC1: From `zikaron-platform/`, `docker compose up -d`, `pnpm install`, `pnpm setup:local` (migrate + seed app DB + seed Strapi) and `pnpm dev` start: web on :3100, admin on :3101, api-public on :4100, api-admin on :4101, worker, Strapi on :1338. Postgres is on :5435, Valkey on :6380, Mailpit UI on :8025. (Ports moved on 2026-11-22 to avoid another local project; each is overridable.)
2. AC2: The repo has `apps/{web,admin,api-public,api-admin,worker,cms}` and `packages/{domain,db,contracts,auth,ui,i18n,config}`. `pnpm build`, `pnpm lint`, `pnpm typecheck` and `pnpm test` pass from the root through Turborepo.
3. AC3 **(changed 2026-11-23 — see AC16)**: Every prototype route renders in the new apps with the prototype's design (layout, colours, type, spacing, components): web `/`, `/salons`, `/salons/[id]`, `/host`, `/host/new`, `/guest`; admin `/`, `/salons`, `/salons/[id]`, `/hosts`, `/hosts/[id]`, `/witnesses`, `/witnesses/[id]`, `/guests`, `/teaming` (admin routes drop the `/admin` prefix because admin is its own app).
4. AC4: Both apps are served under `/he/...` (default, `dir="rtl"`) and `/en/...` (`dir="ltr"`) with a language switch in the header. Components contain no hard-coded user-facing strings: all come from `packages/i18n` message files, which are complete for both `he` and `en`.
5. AC5: Strapi 5 has locales `he` (default) and `en` and a localized `message` collection (namespace, key, value). `pnpm setup:local` seeds it from `packages/i18n`. Editing a message in Strapi changes the text in web/admin within 60 seconds. With Strapi stopped, both apps still render fully from the bundled translations, with no error shown to the user.
6. AC6: `api-public` and `api-admin` are separate processes, each with `GET /health`. With `api-public` stopped, admin pages still load and work.
7. AC7: Web supports sign-up and login (email + password) for guest and host roles; admin supports login for staff roles. Sessions are httpOnly cookies with different names and JWT audiences (`web`, `admin`) and different signing secrets. A web session sent to `api-admin` gets 401, and the reverse.
8. AC8: Authorization is deny-by-default: an `api-admin` or `api-public` route with no declared roles returns 403. An automated test enumerates every `api-admin` route against every role and asserts the expected status. Hosts can only change their own salons (ownership check).
9. AC9: A logged-in guest registers 1–3 seats to an open salon. Capacity and "open for guests" are enforced by `packages/domain`. The registration and its outbox event are saved in one transaction; if the save fails, no event exists. The worker delivers the confirmation email, visible in Mailpit.
10. AC10: The admin teaming screen shows matches ranked by `packages/domain` with ✓/✗ reasons (date + slot, language, distance, accessibility, yearly load), using one time-slot rule: morning 08:00–11:59, noon 12:00–16:59, evening 17:00–23:59. Assigning creates the assignment and an outbox event; the worker emails the host. Undo removes the assignment.
11. AC11: The worker relays outbox events to pg-boss queues in Postgres, retries failed jobs and keeps failures in a table the admin can count. A reminders schedule runs every 10 minutes and does nothing (logs "season mode off") when `SEASON_MODE=off`.
12. AC12: Every app validates its environment with zod at startup and exits with a clear message naming the missing variable. No URL has a silent fallback. `.env.example` files document every variable.
13. AC13: Prisma schema in `packages/db` covers the core entities (users and roles, hosts, salons, guests and registrations, witnesses and availability, assignments, salon days, cities, communities, languages, notes, outbox). `pnpm db:reset` recreates and reseeds the database from the prototype's demo data, reproducibly.
14. AC14: The other prototype interactions (notes, editable sections, availability grid, follow-up switches, guest removal, capacity change, CSV export) work against the APIs, not `localStorage`.
16. AC16 (2026-11-23, supersedes the design part of AC3): web and admin match the **current live system's** design, screens and flows (`zikaron-basalon-fe`, `zikaron-basalon-fe-admin`, audit screenshots in `softwareos/audits/2026-11-17-frontend-admin-audit/shots/`): same colours, fonts, header, footer (links, Instagram), accessibility widget, admin yellow header + dark side menu + filter strip, dashboard cards, lists, salon drawer over the map, host onboarding + 5-step wizard, guest onboarding, teaming map/table + sidebar + confirm modal. Built on the new stack (Tailwind, no MUI). Bug fixes already made in the new system are kept; legacy-only screens without a backend in this spec are listed as follow-ups. Witness self-registration stays dropped.
17. AC17 (2026-11-23): staff can link a returning host's existing profile to a user account from the admin host page; the link is recorded and the host then sees their profile and salons on web.
18. AC18 (2026-11-23, changes AC5's Strapi model): Strapi shows **one page (single type) per screen** with Hebrew names and Hebrew field labels instead of the `message` collection; editors never see technical keys; the same override and fallback rules apply.
15. AC15: `zikaron-platform/README.md` explains prerequisites, setup, ports, the workspace map, and how to add a translation or a Strapi message.

## Technical Approach

### Layout

```
zikaron-platform/
├── apps/
│   ├── web/          Next.js App Router · public site · :3000 · next-intl · proxies /api/* → api-public
│   ├── admin/        Next.js App Router · staff app · :3001 · next-intl · proxies /api/* → api-admin
│   ├── api-public/   NestJS · :4000 · public + host + guest endpoints
│   ├── api-admin/    NestJS · :4001 · staff endpoints + /integrations (Easy, Sheet: stubs)
│   ├── worker/       NestJS standalone · outbox relay · pg-boss queues + schedules · email
│   └── cms/          Strapi 5 · :1337 · own DB "zikaron_cms" · i18n he/en · "message" collection
├── packages/
│   ├── config/       tsconfig bases, eslint config, zod env helper (loadEnv)
│   ├── contracts/    zod schemas + inferred types for every endpoint; enums (roles, slots, statuses); phone rule
│   ├── domain/       pure business rules: time slots, capacity, registration rules, teaming score, availability
│   ├── db/           Prisma schema, migrations, client, seed (from prototype demo data), outbox helper
│   ├── auth/         role → capability table, JWT sign/verify (jose), Nest guards/decorators, cookie names
│   ├── ui/           Tailwind v4 tokens + components ported from prototype components/ui.tsx etc.
│   └── i18n/         messages/{he,en}/{common,web,admin}.json, locale config, Strapi message loader + merge
├── docker-compose.yml   postgres:17 (:5433, DBs zikaron_app + zikaron_cms), valkey (:6380), mailpit (:1025/:8025)
├── turbo.json · pnpm-workspace.yaml · .npmrc (node-linker=hoisted, for Strapi) · .env.example
└── README.md
```

Package scope `@zikaron/*`. Node 22 LTS, pnpm 10, TypeScript strict everywhere, ESM where the framework allows.

### Backends

- **NestJS 11**, Fastify adapter optional (Express is fine). Each API: `ConfigModule` via `@zikaron/config` `loadEnv(schema)`, `PrismaService` from `@zikaron/db`, global `AuthGuard` + `RolesGuard` from `@zikaron/auth` that **deny by default** (a route must carry `@Public()` or `@Roles(...)`), zod validation pipe using `@zikaron/contracts` schemas, `GET /health`.
- **api-public** routes: auth (`POST /auth/signup`, `/auth/login`, `/auth/logout`, `GET /auth/me`), salons (`GET /salons` with filters, `GET /salons/:id`, `GET /salons/map` public DTO without host contact details, cache headers `s-maxage=60`), reference data (`GET /reference` cities, salon days, languages), guest (`POST /registrations`, `DELETE /registrations/:id`, `PATCH /registrations/:id` seats, `GET /me/registration`), host (`POST /host/salons`, `GET /host/salons`, `PATCH /host/salons/:id` with ownership check).
- **api-admin** routes: auth (`/auth/login|logout|me`, staff roles only), dashboard KPIs, salons (list/detail/patch, guests list/remove, follow-up flags), hosts (list/detail), witnesses (list/detail/patch, availability grid PUT, status rules), guests (list), teaming (`GET /teaming/queue`, `GET /teaming/salons/:id/matches`, `GET /teaming/witnesses/:id/matches`, `POST /assignments`, `DELETE /assignments/:id`), notes (`GET/POST` on salon/witness), exports (`GET /exports/:entity.csv`, Hebrew headers), search (`GET /search?q=` for ⌘K), jobs (`GET /jobs/failed/count`), `/integrations/easy` and `/integrations/sheet` as authenticated stubs returning 501.
- **Sessions:** JWT (jose, HS256) in httpOnly, `SameSite=Lax`, `Secure` in prod cookies: `zb_web` (aud `web`, secret `WEB_JWT_SECRET`) and `zb_admin` (aud `admin`, secret `ADMIN_JWT_SECRET`). Passwords hashed with argon2id. Mutations require the `X-Requested-With: zikaron` header (CSRF defence alongside SameSite). Login is rate-limited (Valkey).
- **Side effects:** services write domain rows and an `OutboxEvent` row in one Prisma transaction (`@zikaron/db` `withOutbox(tx, event)`). No service calls email/SMS/WhatsApp directly.
- **Worker:** polls the outbox (1 s), enqueues pg-boss jobs (`email.send`, …), marks events dispatched. Email handler renders a template per event code and language and sends with nodemailer: SMTP→Mailpit locally, SES transport when `EMAIL_TRANSPORT=ses`. pg-boss retry 5 with backoff; failures land in `JobFailure`. Schedule `reminders.tick` every 10 minutes; skips when `SEASON_MODE=off`.

### Frontends

- **Next.js** (current stable, App Router), React 19, Tailwind v4, `@zikaron/ui`. Port the prototype page by page, keeping markup and classes; replace `lib/store.tsx` (localStorage) with a typed API client built on `@zikaron/contracts` and TanStack Query; server components fetch through the same client server-side.
- **API access:** each app rewrites `/api/:path*` to its own API (`API_PUBLIC_URL` / `API_ADMIN_URL`), so the browser is same-origin, cookies flow, and no CORS is needed. Same shape as CloudFront path routing in AWS.
- **i18n:** next-intl with `[locale]` segment, locales `he` (default) and `en`, `localePrefix: 'always'`, `<html lang dir>` from the locale. Messages come from `@zikaron/i18n`: **bundled JSON is the source of every string** (so components always have their text), then `loadMessages(locale, namespace)` fetches Strapi `message` entries server-side (`revalidate: 60`, 2 s timeout) and deep-merges them over the bundle. Strapi down → bundle only.
- **Maps:** a `SalonMap` component in `@zikaron/ui` uses Google Maps (`@vis.gl/react-google-maps`) when `NEXT_PUBLIC_GOOGLE_MAPS_KEY` is set, and falls back to the prototype's Leaflet map otherwise (local dev).
- **Prototype deviations kept vs dropped:** keep all UX from the prototype README's table except: guest registration requires an account (sign-up/login step before the seats form); the demo "view as" role switch is removed (real login replaces it).

### CMS

- Strapi 5 in `apps/cms`, Postgres DB `zikaron_cms`, i18n plugin with `he` default and `en`. Collection `message` (localized): `namespace` (enum common|web|admin), `key` (string), `value` (text). Bootstrap grants the public role `find` on `message` (read-only content). A read-only API token is also supported via `STRAPI_TOKEN`.
- `pnpm cms:seed` (part of `setup:local`) upserts every bundled key for both locales, so editors start from the current texts.

### Data

- Prisma schema covering the prototype's `lib/types.ts` plus users/roles, outbox and job failures. Seed converts `prototype/zikaron-next/lib/data.ts` into rows and creates one user per role (passwords in `.env.example` comments, local only).
- Time is stored as `timestamptz`; the domain treats salon times in `Asia/Jerusalem` (open decision on timezone handling stays open; this choice is reversible).

### Testing (production mode, TDD for logic)

- `packages/domain`, `contracts`, `auth`, `i18n`: Vitest, test-first.
- APIs: Nest testing module + supertest against a test database (`zikaron_test`), including the route × role matrix (AC8) and the transaction/outbox test (AC9).
- Worker: outbox relay and email handler tests with Mailpit's API or a fake transport.
- Frontends: Vitest for client utilities; Playwright smoke suite (`pnpm e2e`) that opens every AC3 route in `he` and `en` and runs the guest-registration and teaming flows.

### Execution plan

The work runs as eight phases, one plan file each in `plans/`. Each phase is executed by the project's `tdd-guide` agent without user approval, checks its own work, ticks its tasks in `tasks.md`, and hands over to the next phase. See `tasks.md`.

## Out of Scope

- AWS infrastructure, CDK and deployment (spec `aws-infra-and-deploy`); GitHub Actions workflows run nowhere yet.
- Migrating legacy production data (spec `schema-and-data-migration`); the seed uses prototype demo data only.
- Google sign-in, SMS login, password reset, WhatsApp, Twilio, the Easy feed and the Google Sheet webhook beyond 501 stubs.
- Orthodox mode (open decision).
- Witness self-registration (dropped).
- Full legacy parity of every rule; functional epics own that and build on this skeleton.
- Creating a new git repository, committing, or pushing.
- **Decided (2026-11-23):** a returning host's old profile is linked to their new account by staff in the admin portal (not automatically by email). Built as a follow-up task after the security fixes.
- **Decided (2026-11-23):** every staff role can **view** everything in the admin; edits and exports differ by role (capability table in `packages/auth`, exports split by data type per security finding M8).
- **Deferred (2026-11-23):** limiting non-super admins to their own communities (legacy behaviour) is a separate, later spec.
- **Open question (2026-11-23, undecided):** after staff assign a witness and then undo, the host currently gets two emails ("assigned", then "removed"). Whether an undo within a short window should send nothing is a product decision for the customer; behaviour stays as built until decided.

## Standards Applied

- [global/git-workflow](../../../../../../standards/global/git-workflow.md) — branch name recorded; no commits are made by this run.
- [global/tech-stack](../../../../../../standards/global/tech-stack.md) — superseded for this customer by the epic tech plan (Next.js + NestJS); recorded as a deviation.

## Changelog

| Date | Author | Type | Change | Ref |
|---|---|---|---|---|
| 2026-11-22 | keren-elbaz-m | created | Initial shaping in one pass; adds Strapi 5 + he/en i18n to the target stack | — |
| 2026-11-22 | keren-elbaz-m | change | Local only: no API keys; email via Mailpit, Leaflet map, mocked geocoding (see plans/00-conventions.md) | — |
| 2026-11-23 | keren-elbaz-m | change | Code moved out of the hub to its own repo `MoveoTech/zikaron-basalon-platform` (local: `~/Documents/GitHub/zikaron-basalon-platform`) | — |
| 2026-11-23 | keren-elbaz-m | change | Strapi content model: one page per screen with Hebrew labels (AC18) | T37 |
| 2026-11-23 | keren-elbaz-m | change | Design source changed from the prototype to the current live system (look + screens + flows, incl. footer and accessibility widget): AC16. Returning-host linking by staff: AC17. Security findings fixed (plans/09) | T28, T30–T35 |
| 2026-11-23 | keren-elbaz-m | change | Web rebuilt in the live site's design (AC16): sign-up stores the live onboarding fields (guest city/address, host private/organisation) on `User`, returned as `profile` by api-public `/auth/me` (additive; migration `web_onboarding_profile`) | T31, T32 |
| 2026-11-22 | keren-elbaz-m | change | Ports moved to 3100/3101/4100/4101/1338 and Postgres 5435 (local clash); host salon responses no longer include staff follow-up fields | T11 |
