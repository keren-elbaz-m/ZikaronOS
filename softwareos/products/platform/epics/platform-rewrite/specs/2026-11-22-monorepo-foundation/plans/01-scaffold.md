# Phase 1 — Scaffold

Tasks: T1, T2, T3 · ACs: AC1 (partly), AC2 (partly), AC12

## Steps

1. Create `zikaron-platform/` with:
   - `package.json` (private, `packageManager`, scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `e2e` via `turbo run …`; `db:migrate`, `db:seed`, `db:reset` (filtered to `@zikaron/db`); `cms:seed`; `setup:local` = `db:migrate && db:seed && cms:seed` — `cms:seed` may be a no-op placeholder until Phase 5, printing "cms seed added in phase 5").
   - `pnpm-workspace.yaml` (`apps/*`, `packages/*`), `turbo.json`, `.npmrc`, `.gitignore` (node_modules, .next, dist, .turbo, .env, coverage, apps/cms/.tmp, apps/cms/build, playwright-report, test-results), `.editorconfig`, `.nvmrc` (22).
   - `.env.example` at the root with every variable from 00-conventions (local-dev-only values), and a note that each app reads the root `.env` (use `dotenv-cli` or Turborepo `globalEnv` + `envMode: loose`; pick one and record it).
2. `docker-compose.yml`: `postgres:17` with an init script creating `zikaron_app`, `zikaron_cms`, `zikaron_test`; `valkey/valkey:8`; `axllent/mailpit`. Named volumes, healthchecks.
3. `packages/config`:
   - `tsconfig/base.json`, `tsconfig/nest.json` (decorators + emitDecoratorMetadata), `tsconfig/next.json`, `tsconfig/library.json`.
   - `eslint` flat config export (typescript-eslint, import order); apps extend it.
   - `src/env.ts`: `loadEnv<T>(schema: ZodSchema<T>, source = process.env): T` — throws/exits with `Missing env: A, B` or `Invalid env: NAME (reason)`. Tests first (Vitest): missing var, invalid URL, valid input, no defaults leak.
4. Run `pnpm install`, `docker compose up -d`, and confirm containers are healthy.

## Done when

- `pnpm install` succeeds; `pnpm --filter @zikaron/config test` passes; `pnpm lint` and `pnpm typecheck` pass for what exists.
- `docker compose ps` shows postgres, valkey, mailpit healthy; `psql postgresql://zikaron:zikaron@localhost:5433/zikaron_app -c 'select 1'` works.

## Decisions

- **D1 Env loading: `dotenv-cli`.** Every root script is `dotenv -c -- turbo run …` (and `dotenv -c -- pnpm --filter @zikaron/db …` for `db:*`). `-c` loads `.env` and then `.env.local` overrides. `turbo.json` has `envMode: "loose"` so loaded variables reach every task, and `globalDependencies: [".env"]` so a changed `.env` busts the cache. Why not Turborepo alone: turbo does not read `.env` files.
- **D2 Strapi variables are prefixed `CMS_`** (`CMS_APP_KEYS`, `CMS_ADMIN_JWT_SECRET`, `CMS_DATABASE_*`, …). Strapi's default name `ADMIN_JWT_SECRET` collides with api-admin's `ADMIN_JWT_SECRET`, and Strapi's `DATABASE_URL` collides with Prisma's, because one root `.env` feeds every app. Phase 5's `apps/cms/config/*.ts` must read the `CMS_*` names explicitly.
- **D3 `PORT` is not in the root `.env`.** One value would apply to every app. Each server sets `PORT=<n>` in its own `dev`/`start` script and still validates it with `loadEnv`.
- **D4 Docker host ports can be overridden** with `${POSTGRES_HOST_PORT:-5433}`, `${VALKEY_HOST_PORT:-6380}`, `${MAILPIT_SMTP_HOST_PORT:-1025}` and `${MAILPIT_UI_HOST_PORT:-8025}`. The defaults match 00-conventions. Reason: on this machine :5433 is already held by another project's container (`carasso-marketplace-postgres-medusa-1`), not by Homebrew.
- **D5 TypeScript 6.0.3, not 7.0.x.** typescript-eslint 8.73 requires `<6.1.0` and `@nestjs/cli` pins `~6.0.2`. Other pinned versions: turbo 2.11.13, zod 4.6.7, vitest 5.1.1, vite 8.3.8, eslint 10.15.0, typescript-eslint 8.73.0, eslint-plugin-import-x 4.18.1, @types/node 22.20.5, dotenv-cli 11.1.0. `.npmrc` adds `save-exact=true` and `engine-strict=true`.
- **D6 `@zikaron/config` is ESM** (`"type": "module"`, built with `tsc` to `dist/`). Node 22.12+ `require(esm)` lets CJS consumers such as Nest load it. Verified: both `require('@zikaron/config')` and `import` work.
- **D7 `loadEnv` behaviour:**
  - It throws `EnvValidationError` (with `.missing` and `.invalid`).
  - `loadEnvOrExit` prints only the message and exits with code 1. Use it at app entry points.
  - Empty strings count as unset, so `A=` in `.env` is missing, and an optional variable set to `""` comes back `undefined`.
  - Reasons come from zod and never echo the rejected value.
  - Only keys the schema declares are returned; use `z.object`.
  - Message format: `Missing env: A, B` and/or `Invalid env: C (reason); D (reason)`, on separate lines.
- **D8 Shared ESLint config is a function**, `config({ tsconfigRootDir, ignores? })`, exported at `@zikaron/config/eslint`. It uses typescript-eslint `recommendedTypeChecked` with `projectService`, `import-x/order` (where `@zikaron/**` is the internal group), `consistent-type-imports`, and turns off type-checking for `.js` files. Each workspace's `eslint.config.js` is: `import { config } from "@zikaron/config/eslint"; export default config({ tsconfigRootDir: import.meta.dirname });`.
- **D9 tsconfig bases** live at `@zikaron/config/tsconfig/{base,library,nest,next}.json`.
  - `base`: NodeNext, strict, `noUncheckedIndexedAccess`.
  - `library`: adds `verbatimModuleSyntax`.
  - `nest`: decorators and metadata, no declarations.
  - `next`: Bundler resolution, `jsx: preserve`, `noEmit`.

## Handover

**What exists (`zikaron-platform/`):**
- Root files: `package.json` (all scripts from the plan; `cms:seed` prints "cms seed added in phase 5"), `pnpm-workspace.yaml`, `turbo.json`, `.npmrc`, `.gitignore`, `.editorconfig`, `.nvmrc`, `.env.example` (every variable from 00-conventions plus `TEST_DATABASE_URL`, the compose host ports and the `CMS_*` group), `pnpm-lock.yaml`.
- `docker-compose.yml` (compose project `zikaron-platform`) and `docker/postgres/init/01-create-databases.sql`, which creates `zikaron_cms` and `zikaron_test`.
- `apps/` is empty (`.gitkeep` only).
- `packages/config`:
  - `tsconfig/*`, `eslint/index.js`
  - `src/env.ts` (`loadEnv`, `loadEnvOrExit`, `EnvValidationError`)
  - `src/env.test.ts`, `src/env-exit.test.ts` (18 tests)

**Checks run (2026-11-22):**
- `pnpm install`: pass
- `pnpm --filter @zikaron/config test`: pass, 18/18
- Root `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`: all pass (1 package)
- `POSTGRES_HOST_PORT=5435 docker compose up -d`, then `docker compose ps`: postgres, valkey and mailpit all `healthy`
- `psql postgresql://zikaron:zikaron@localhost:5435/{zikaron_app,zikaron_cms,zikaron_test} -c 'select 1'`: pass
- `valkey-cli ping`: PONG
- Mailpit UI :8025: HTTP 200; SMTP :1025: open
- **Deviation:** the literal check on `localhost:5433` could not target our container, because :5433 belongs to another project's Postgres on this machine. The compose default is still 5433; verification ran on 5435.

**Next phase must know:**
- **No `.env` file was created.** A permission rule blocks agents from reading or writing `.env*`, so the user must run `cp .env.example .env`. On this machine they also need `POSTGRES_HOST_PORT=5435` and `:5435` in `DATABASE_URL`, `TEST_DATABASE_URL` and `CMS_DATABASE_PORT`, unless they stop the carasso container. Until then, pass variables inline, for example `POSTGRES_HOST_PORT=5435 docker compose up -d` and `DATABASE_URL=postgresql://zikaron:zikaron@localhost:5435/zikaron_app pnpm db:migrate`. The containers are running on 5435 now.
- **New packages:**
  - Add a `build` script (tsc to `dist`, `exports` pointing at `dist`), plus `lint`, `typecheck` and `test`.
  - `devDependencies` need `@zikaron/config: workspace:*`, `eslint`, `typescript` and `vitest`, at the pinned versions in D5.
  - Extend `@zikaron/config/tsconfig/library.json`.
  - Turbo's `lint`, `typecheck` and `test` depend on `^build`.
- Env schemas use zod 4 APIs (`z.url()`, `z.enum`). Call `loadEnvOrExit(schema)` at process start.
- `packages/db` must expose `db:migrate`, `db:seed` and `db:reset`; the root scripts already filter to `@zikaron/db`.
- The shell profile's pyenv rehash lock makes each new shell wait about 60 s. Long chains of separate shell calls can hit the 120 s tool timeout, so give longer timeouts or batch commands.

**Open issues:** none blocking. Coverage on `packages/config/src/env.ts`: 100% of statements, lines and functions; 86% of branches. The uncovered branches are the `(root)` path for non-object schemas and deduplication of repeated issues on one key.
