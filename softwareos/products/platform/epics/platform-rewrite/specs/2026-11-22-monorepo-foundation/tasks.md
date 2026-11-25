# Tasks — Monorepo foundation

> Epic: platform-rewrite
> Spec: 2026-11-22-monorepo-foundation
> Branch: feat/platform-rewrite/monorepo-foundation
> Repo: https://github.com/MoveoTech/zikaron-basalon-platform
> Reviewed: 2026-11-23 APPROVE WITH COMMENTS
> SecurityReviewed: 2026-11-23 APPROVE WITH COMMENTS
> Test mode: tdd (logic) · production mode
> Execution: phases run in order by the tdd-guide agent, no user approval between phases (plans/01–08)

## Phase 1 — Scaffold (plans/01-scaffold.md)

- [ ] T1 Create `zikaron-platform/` with pnpm workspace, Turborepo, `.npmrc`, root scripts, `.gitignore`, `.env.example`
- [ ] T2 `docker-compose.yml`: Postgres 17 (:5433, DBs zikaron_app, zikaron_cms, zikaron_test), Valkey (:6380), Mailpit (:1025/:8025)
- [ ] T3 `packages/config`: tsconfig bases, shared eslint config, `loadEnv(schema)` zod helper with tests

## Phase 2 — Shared logic and data (plans/02-domain-and-data.md)

- [ ] T4 `packages/contracts`: enums, phone rule, zod schemas for every endpoint in spec Technical Approach
- [ ] T5 `packages/domain`: time slots, capacity + registration rules, teaming score with reasons, availability rules (test-first)
- [ ] T6 `packages/db`: Prisma schema, first migration, client export, `withOutbox` helper
- [ ] T7 `packages/db` seed from `prototype/zikaron-next/lib/data.ts` + one user per role; `db:reset`

## Phase 3 — Auth and public API (plans/03-auth-and-api-public.md)

- [ ] T8 `packages/auth`: roles → capabilities table, jose JWT sign/verify per audience, cookie names, Nest guards (`@Public`, `@Roles`, deny by default), ownership helper
- [ ] T9 `apps/api-public`: Nest app, env, health, auth routes, salons + map + reference, registrations, host salons
- [ ] T10 Integration tests for api-public (auth, capacity, ownership, outbox in one transaction)

## Phase 4 — Admin API and worker (plans/04-api-admin-and-worker.md)

- [ ] T11 `apps/api-admin`: Nest app, env, health, staff auth, dashboard, salons, hosts, witnesses, guests, teaming, assignments, notes, exports, search, jobs count, integration stubs
- [ ] T12 Route × role authorization matrix test for api-admin (AC8) and cross-audience 401 test (AC7)
- [ ] T13 `apps/worker`: outbox relay → pg-boss, email handler (Mailpit/SES transports), retries + `JobFailure`, reminders schedule with `SEASON_MODE`

## Phase 5 — i18n, UI kit and CMS (plans/05-i18n-ui-cms.md)

- [ ] T14 `packages/i18n`: locale config, he/en message files (common), `loadMessages` with Strapi merge + timeout fallback (test-first)
- [ ] T15 `packages/ui`: port prototype tokens (`globals.css`) and components (`ui.tsx`, `salon-card`, `site-header` shell, `notes`, `editable-section`), `SalonMap` with Google/Leaflet fallback
- [ ] T16 `apps/cms`: Strapi 5 on zikaron_cms, locales he (default) + en, localized `message` collection, public read permission in bootstrap
- [ ] T17 `cms:seed` script that upserts all bundled messages into Strapi for both locales

## Phase 6 — Web app (plans/06-web.md)

- [ ] T18 `apps/web` Next.js with next-intl `[locale]`, rewrites to api-public, env validation, header with language switch
- [ ] T19 Port web routes `/`, `/salons`, `/salons/[id]`, `/guest`, `/host`, `/host/new` with identical design, strings in `messages/*/web.json` (he + en)
- [ ] T20 Auth screens (sign up, log in) and guest registration with account; host wizard creates a salon through the API

## Phase 7 — Admin app (plans/07-admin.md)

- [ ] T21 `apps/admin` Next.js with next-intl, rewrites to api-admin, staff login, layout with side menu + counts + ⌘K search
- [ ] T22 Port admin routes (dashboard, salons, salon detail, hosts, host detail, witnesses, witness detail, guests, teaming) with identical design, strings in `messages/*/admin.json`
- [ ] T23 Wire every prototype interaction to api-admin (notes, editable sections, availability grid, follow-up switches, guest removal, assign/undo, CSV export)

## Phase 8 — Verification and docs (plans/08-verification.md)

- [ ] T24 Root checks green: `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test`
- [ ] T25 Playwright smoke suite `pnpm e2e`: every AC3 route in he + en, guest registration flow, teaming flow, Strapi-down fallback
- [ ] T26 `zikaron-platform/README.md` (AC15)

## Phase 9 — Security fixes (plans/09-security-fixes.md)

- [x] T30 Fix security findings H1–H3, M4–M9, L10–L13 with tests

## Phase 10 — Web in the live system's design (plans/10-web-legacy-design.md)

- [ ] T31 `packages/ui` legacy design tokens + components (header, footer, buttons, inputs, drawer, modal, accessibility widget)
- [ ] T32 Web screens and flows as in the live site (login, registration + onboarding, map + list + salon drawer, guest "my salon", host onboarding + 5-step wizard + host salon page), he/en

## Phase 11 — Admin in the live system's design + returning-host link (plans/11-admin-legacy-design.md)

- [ ] T33 Admin shell as in the live admin (yellow header, dark side menu, filter strip) and screens (dashboard cards, salons, hosts, host profile, witnesses, add witness, witness profile, teaming map/table + sidebar + confirm, guests), he/en
- [ ] T34 Returning-host link: api-admin endpoint + admin host-page action + test (AC17)
- [ ] T35 Update e2e + visual checks for AC16/AC17; root checks green

## Phase 12 — Strapi: one page per screen (plans/12-cms-pages.md)

- [ ] T37 Per-screen Strapi single types with Hebrew names and field labels; loader, seed, migration from `message`; docs (AC18)

## Phase 13 — Re-review follow-ups

- [ ] T36 Fix re-review findings N1 (concurrent login backoff), N2 (refuse TRUST_PROXY_HOPS=0 in production), N3 (proxy matcher case/dot paths), N4 (session-state cache race), N5 (CMS short-secret opt-out local only), N6 (host email check in transaction), N7 (seed links only to seed-created users), plus an e2e test with hops > 0

## Verification

- [ ] T27 Write and run unit + integration tests mapped to AC1–AC15 (testing skill)
- [x] T28 Security review of auth, sessions, cookies, CSRF, authorization guards, Strapi permissions and env handling (security-reviewer agent)
- [ ] T29 Run QA against acceptance criteria (qa skill)
