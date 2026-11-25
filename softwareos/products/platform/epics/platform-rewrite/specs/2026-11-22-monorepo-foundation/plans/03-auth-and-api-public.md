# Phase 3 — Auth package and public API

Tasks: T8, T9, T10 · ACs: AC6, AC7, AC8 (public side), AC9, AC12

## Steps

1. `packages/auth` (test-first):
   - `capabilities.ts`: role → capability list (e.g. `salon:read:any`, `salon:update:own`, `witness:update`, `export:run`, `bulk:delete`); `can(role, capability)`.
   - `jwt.ts`: `signSession({ sub, role }, { audience, secret, ttl })`, `verifySession(token, { audience, secret })` with jose HS256; rejects wrong audience/secret/expired.
   - `cookies.ts`: names `zb_web`, `zb_admin`; options (httpOnly, SameSite=Lax, Secure when `NODE_ENV=production`, path `/`, maxAge 30 days).
   - `nest/`: `@Public()`, `@Roles(...roles)`, `@CurrentUser()`, `SessionGuard` (reads the app's cookie, verifies with the app's audience/secret), `RolesGuard` (**deny if the route has neither `@Public` nor `@Roles`**), `CsrfGuard` (mutating methods require `X-Requested-With: zikaron`), `assertOwner(entityOwnerId, user)`.
   - Password hashing helpers with argon2id.
2. `apps/api-public` (NestJS 11):
   - `main.ts`: `loadEnv` with `DATABASE_URL`, `VALKEY_URL`, `WEB_JWT_SECRET`, `WEB_ORIGIN`, `PORT`; cookie-parser; global guards (Session → Roles → Csrf); zod validation pipe; structured logging (pino); `GET /health` (`@Public`).
   - Modules and routes as listed in spec → Technical Approach → api-public. All writes that cause notifications use `prisma.$transaction` + `withOutbox` (`registration.created`, `registration.cancelled`, `salon.created`).
   - `GET /salons/map` and `GET /salons` are `@Public`, return the public DTO (no host phone/email) and set `Cache-Control: public, s-maxage=60`.
   - Login rate limit: 10 attempts / 10 minutes per email+IP in Valkey → 429.
   - Business rules come from `@zikaron/domain`; never re-implement them in the controller.
3. Tests (Nest testing module + supertest, DB `zikaron_test`, migrate + seed per run):
   - signup/login/logout/me; wrong password; rate limit.
   - registration: success, full salon, closed salon, 0/4 seats, replaces previous registration; **outbox row exists after success and none after a forced failure** (AC9).
   - host can patch own salon, gets 403 on another host's salon (AC8).
   - a route without decorators → 403 (add a test-only route in the testing module).
   - an `admin`-audience token → 401 (AC7).

## Done when

- `pnpm --filter @zikaron/auth test` and `pnpm --filter @zikaron/api-public test` pass.
- `pnpm --filter @zikaron/api-public dev` starts on :4000; `curl localhost:4000/health` → ok; `curl localhost:4000/salons/map` returns seeded salons without contact fields.
- Starting without `WEB_JWT_SECRET` exits with `Missing env: WEB_JWT_SECRET`.

## Decisions

## Handover
