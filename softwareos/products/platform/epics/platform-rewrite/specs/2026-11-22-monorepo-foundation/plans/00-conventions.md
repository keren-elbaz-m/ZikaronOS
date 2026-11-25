# Conventions for every phase

Read this before any phase plan. It is the contract between phases.

## How a phase runs

- Work **autonomously**. Do not ask the user anything. When something is unclear, pick the option closest to the spec and the prototype, and write it under **Decisions** at the bottom of your phase plan.
- Write only inside `zikaron-platform/` and this spec folder (tick boxes in `tasks.md`, append to your plan's **Decisions** and **Handover** sections). Never edit the prototype, the legacy repos, or other hub files.
- **No git operations**: no `git init`, no commits, no branches, no pushes. Do not create a GitHub repo.
- Never put real secrets anywhere. Local-only dev values in `.env.example` are fine (clearly marked `local-dev-only`).
- Test-first for logic (production mode): write the failing test, see it fail, implement, see it pass. Tag tests with `// covers ACn, Tn`.
- A phase is done only when its **Done when** checks pass. If a check fails, fix it; if you cannot after a real attempt, stop, record the failure and the exact error in **Handover**, and leave the task as `[~]`.
- Tick a task `[x]` in `tasks.md` only when it is complete and checked. In-progress is `[~]`.
- Keep each phase's work inside its own folders when possible; when you must touch a shared package, keep changes additive.

## Local only, no external API keys (user decision, 2026-11-22)

Everything must run on localhost with **no API keys and no paid or cloud services**. Where an outside service would be needed, use a local stand-in or a mock behind the same interface, so the real one can be plugged in later by config:

| Outside service | Local stand-in |
|---|---|
| Email (SES) | Mailpit over SMTP. The SES transport may exist in code but is never required or exercised. |
| Google Maps | The prototype's Leaflet map. The Google adapter is optional and only used if a key is ever set. |
| Geocoding | Mock: coordinates from the seeded city (plus a small deterministic offset). No network calls. |
| SMS / WhatsApp | Out of scope. If an interface is needed, a mock that logs the message. |
| AWS (S3, etc.) | Not used. CSV exports stream directly from the API. |

No required env variable may hold an API key. Tests must pass offline once dependencies are installed.

## Workspace

**Moved 2026-11-23:** the code now lives in its own repo, `MoveoTech/zikaron-basalon-platform`, checked out at `~/Documents/GitHub/zikaron-basalon-platform` (next to the legacy repos, outside this hub). Older plan text that says `zikaron-platform/` means that repo root.

- Root: `zikaron-platform/` (inside the hub worktree, untracked by git).
- Package manager: pnpm 10 (`pnpm@10.13.1` in `packageManager`), Node 22. `.npmrc`: `node-linker=hoisted`, `auto-install-peers=true` (Strapi needs hoisting).
- Package scope `@zikaron/*`; internal deps use `workspace:*`.
- TypeScript strict, `noUncheckedIndexedAccess: true`.
- Turborepo tasks: `build`, `dev` (persistent, no cache), `lint`, `typecheck`, `test`, `e2e`.
- Prefer current stable versions at install time. Pin exact versions in package.json (no `^`) so installs are reproducible.

## Ports

**Changed 2026-11-22:** another local project (carasso) holds 3000, 4000, 1337 and 5433 on this machine, so the app ports moved. These are the defaults in every script; each stays overridable with `<APP>_PORT`.

| Service | Port |
|---|---|
| web (Next.js) | 3100 |
| admin (Next.js) | 3101 |
| api-public (Nest) | 4100 |
| api-admin (Nest) | 4101 |
| cms (Strapi) | 1338 |
| Postgres 17 (Docker) | 5433 → 5432 by default. **On this machine use 5435** (`POSTGRES_HOST_PORT=5435`): 5433 is taken by another project. The containers already run on 5435. |
| Valkey (Docker) | 6380 → 6379 |
| Mailpit SMTP / UI | 1025 / 8025 |

## Databases (one Postgres container)

- `zikaron_app` — Prisma schema + pg-boss schema `pgboss`
- `zikaron_cms` — Strapi
- `zikaron_test` — API/worker integration tests (reset per run)
- User/password: `zikaron` / `zikaron` (local-dev-only)

## Environment variables (validated with zod via `@zikaron/config` `loadEnv`)

| Variable | Used by |
|---|---|
| `DATABASE_URL` | db, api-public, api-admin, worker |
| `VALKEY_URL` | api-public, api-admin |
| `WEB_JWT_SECRET`, `ADMIN_JWT_SECRET` (≥32 chars) | api-public, api-admin (each verifies only its own) |
| `WEB_ORIGIN`, `ADMIN_ORIGIN` | APIs (cookie + origin checks) |
| `PORT` | each server |
| `EMAIL_TRANSPORT` (`smtp`\|`ses`), `SMTP_HOST`, `SMTP_PORT`, `EMAIL_FROM` | worker |
| `SEASON_MODE` (`on`\|`off`) | worker |
| `API_PUBLIC_URL` | web (rewrites, server fetch) |
| `API_ADMIN_URL` | admin (rewrites, server fetch) |
| `STRAPI_URL`, `STRAPI_TOKEN` (optional) | web, admin, cms seed |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` (optional) | web, admin |
| Strapi's own: `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `DATABASE_*` | cms |

No variable has a silent default for a URL or secret. Missing → exit with `Missing env: NAME`.

## Roles

`guest`, `host` (web audience); `super_admin`, `general_admin`, `global_admin`, `volunteers_admin`, `hosts_admin`, `testimonies_admin` (admin audience). Menu visibility per role follows the prototype/legacy table in the plan (page "מי רואה מה"). Defined once in `@zikaron/contracts`; capabilities in `@zikaron/auth`.

## Time slots (one rule)

morning 08:00–11:59 · noon 12:00–16:59 · evening 17:00–23:59 (Asia/Jerusalem). Defined once in `@zikaron/domain`.

## Handover

At the end of your phase, append to your plan's **Handover** section: what exists now, commands that pass, anything the next phase must know, and any open issue.
