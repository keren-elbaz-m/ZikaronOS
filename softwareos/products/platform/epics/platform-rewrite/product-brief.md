# Platform Rewrite (NestJS + Next.js monorepo) — Product Brief

> Epic: epic.md · Product: ../../mission.md

## Goals

The legacy system is three repos on an aging stack: Django 4.2, and two React 16 CRA apps on MUI 4.
It has no meaningful tests, logic hidden in Django signals, hard-coded secrets, and stale
infrastructure code. Every season it carries the whole program: hosts, guests, witnesses and staff.
The goal of the engagement is to rebuild it on a modern stack **with identical functionality**,
built in the prototype's UX (`ecosystem/design-reference.md`).

This epic owns the **shared foundation** that every functional epic builds on, and the move from
the old system to the new one:

- one monorepo (`apps/api` NestJS, `apps/web` and `apps/admin` Next.js, `packages/*`) with CI that
  enforces build, lint, typecheck and tests from day one;
- a new Postgres schema and a **lossless, repeatable migration** of production data;
- a **parity test harness**, so "identical functionality" is proven by tests rather than claimed;
- AWS infrastructure and deploy pipelines with no secrets in code;
- a **cut-over** with a rollback path, landing outside the season window.

Functional behavior (auth, hosting, guests, teaming, notifications…) is owned by the other epics.
This epic delivers the rails they run on.

## User Stories

- As a developer, I can clone one repo, run one install and one dev command, and have the API, the
  public site and the admin running locally against a seeded database.
- As a developer, every PR runs build, lint, typecheck and tests in CI, so a red check blocks merge.
- As a developer, I import request/response schemas from a shared contracts package, so the API,
  web and admin can't drift apart.
- As a developer working on a functional epic, I can write a parity test from a legacy-baseline
  behavior and run it against the new API, and optionally against the legacy API, to prove they match.
- As the tech lead, I can run the data migration from a production snapshot as many times as I need, and get
  a reconciliation report (row counts and checksums per entity) that shows nothing was lost.
- As ops, I can deploy dev/staging/prod from CI with secrets in AWS Secrets Manager, never in code.
- As the customer, cut-over happens outside the season window, users keep their accounts and
  data, and there is a tested rollback plan if something goes wrong.

## Success Criteria

- The monorepo builds from a clean clone. CI runs build, lint, typecheck and unit tests on every PR,
  and a failing check blocks merge.
- `packages/contracts` (zod) is the only source of API request/response types. The API validates
  against it, and web and admin consume it.
- The schema covers every legacy entity in `legacy-baseline/backend-discovery.md` §4 (or records a
  waiver for each dropped table, e.g. allauth/oauth-toolkit internals).
- The migration runs end-to-end on a sanitized production snapshot. The reconciliation report shows
  matching row counts for every entity and matching key fields on sampled rows, and
  re-running it is idempotent.
- The parity harness runs in CI. Each functional epic's specs add their baseline scenarios to it.
- Dev, staging and prod environments are deployable from CI. Gitleaks/TruffleHog scans pass. No
  secret, key or DB dump is in git (`latest.dump` and the Jenkinsfile credentials are not carried over).
- A cut-over runbook (freeze, final migration, DNS switch, smoke tests, rollback) is rehearsed on
  staging at least once before production.
- A security review is done for infra, secrets handling and the data migration (production mode).

## Out of Scope

- Functional behavior of any area. That belongs to the functional epics, which own their parity specs.
- Redesigning the data model beyond what the functional epics require (no speculative refactors).
- The marketing site `zikaronbasalon.com`.
- Changing external providers (SendGrid, TexterChat, Twilio, Google stay).
- Retiring the legacy AWS resources after cut-over: TBD, decide in the cut-over spec.

## Parity & Deviations

**Must preserve**
- All production data, including users' ability to log in with their existing passwords (Django
  PBKDF2 hashes) and Google accounts. Coordinate with `authentication-and-accounts`.
- Naive `Asia/Jerusalem` datetime semantics as seen by users (salon times, reminder windows).
- The scattered "year" windows (30-day future, 60/150-day assignment counts, 300-day salon-guests,
  current-year dashboards). The schema and query layer must make them expressible.
- Inbound integrations keep working through cut-over: the Easy feed URL and Basic auth, the Google-Sheet
  webhook token, and the EventBridge reminders endpoint with its API key (owned by `back-office-operations`
  and `notifications-and-reminders`, but their URLs and credentials are a cut-over concern here).
- `GET /health`.

**Adopted deviations (recorded waivers)**
- No secrets in frontend bundles or CI files (`join-report.md` repo hygiene; `architecture.md` gotcha 6, 9).
- `DJANGO_DEBUG`-style defaults and `ALLOWED_HOSTS=['*']`/CORS-all are not replicated. Use explicit
  origins per environment (`backend-discovery.md` gotcha 24).
- Business logic moves from signals to explicit domain services/events (`architecture.md` gotcha 1).
  The user-visible effects stay the same; only the mechanism changes.

**Decisions to confirm**
- Store datetimes as `timestamptz` and convert at the edges, or keep naive local time? Users must see the same values either way.
- Do legacy JWTs stay valid across cut-over, or does everyone log in again once?
- The target season for cut-over and the freeze window: TBD.
- Hosting for the Next.js apps (Amplify, ECS, Vercel…), ORM (Prisma or TypeORM), monorepo tooling: TBD.
- What is actually deployed today: confirm the live EB/Lambda/EventBridge setup vs the stale Terragrunt (`join-report.md` uncertainty 10).
