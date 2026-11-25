# Phase 9 — Security fixes from the T28 review

> Task: T28 (security review findings). Runs autonomously and test-first, with no user approval (user decision).
> Read `00-conventions.md` first. Tests are tagged `// covers T28, <finding-id>`.
> T28 stays unticked: the orchestrator re-runs the review.

## Findings to fix

| ID | Finding | Fix |
|---|---|---|
| H1 | Rate-limit IP spoofing: Next rewrites forward a client `X-Forwarded-For` unchanged, and `trust proxy: "loopback"` makes `req.ip` attacker-controlled | `trust proxy` from `TRUST_PROXY_HOPS` (default 0). The Next proxy strips `X-Forwarded-For`/`X-Real-IP` on `/api/*`, keeping only the entries added by trusted hops. Three login counters in one Valkey MULTI: email+IP, IP, and email (with backoff) |
| H2 | Host profile takeover: `claimHost` links an unclaimed host profile by an unverified wizard email | Never auto-claim by email. A user with no host profile gets a new one; existing profiles are left untouched |
| H3 | Unguarded seed | Seed and `db:reset` refuse `NODE_ENV=production` or a non-local `DATABASE_URL` unless `ALLOW_DEMO_SEED=1`. Seed never resets the password of an existing user that is not a demo login |
| M4 | No session revocation | `User.sessionVersion`, `sv` claim, checked in `SessionGuard` (cached about 60 s in Valkey). Bumped by logout-everywhere and by any role change. Admin TTL 12 h, web 30 days |
| M5 | `Secure` cookie depends on optional `NODE_ENV` | `secure` comes from the origin protocol. Start-up is refused if an https origin would give a non-secure cookie |
| M6 | No security headers | CSP and friends in the web and admin `headers()`. `helmet()` in both APIs |
| M7 | Signup abuse | Per-IP signup limit (the same Valkey mechanism), which also counts the `email_taken` path |
| M8 | `export:run` is too broad | Split it into `export:salons|guests|hosts|witnesses`, update the matrix and the admin UI, and log each export |
| M9 | Vulnerable Strapi transitive deps | `pnpm.overrides`, keeping only those that leave Strapi working |
| L10 | `safeReturnTo` accepts `/.//evil.com` | Re-check for `//` and `/\` after normalisation |
| L11 | Strapi hardening | `allow_register: false`, drop Public `auth.*` permissions, `min(32)` on CMS secrets in production |
| L12 | Query strings in request logs | pino `serializers.req` without the query string |
| L13 | Emails in `JobFailure.error` and worker logs | Redact email addresses |
| LH | Docker ports bound to all interfaces | Bind them to `127.0.0.1` |

## WIP checkpoint

(updated after each finding)

- [x] L10: web and admin `return-url.test.ts`, "safeReturnTo after normalisation (T28 L10)". Red: 4 cases returned `//evil.com`. Green: 33/33 (web) and 31/31 (admin).
- [x] H3: `packages/db/src/seed/guard.test.ts` (unit) and `guard.int.test.ts` (the CLI entry points plus a real `seed()` on zikaron_test). Red: the import was missing, the CLI tried to connect, and a temporary revert showed the password was reset. Green: db 38/38.
- [x] M4 and M5: auth `jwt.test.ts`, `cookies.test.ts`, `guards.test.ts` ("SessionGuard with session state (revocation)"). api-public `auth.int.test.ts` ("session revocation (T28 M4)", "cookie Secure flag (T28 M5)"). api-admin `auth.int.test.ts` (same). Migration `20261123070925_session_version` adds the column and the role-change trigger. Red: 10 auth unit tests and 4 guard tests failed on assertions, and api-public failed on assertions. Green: auth 85/85.
- [x] H1 (API side) and M7: auth `login-limits.test.ts` (red: missing functions). api-public `auth.int.test.ts` "client IP and login limits (T28 H1)" and "sign-up limits (T28 M7)". api-admin "TRUST_PROXY_HOPS=0 …". Green: api-public 72/72, api-admin 100/100. The Next proxy part and the e2e test are still to do.
- [x] H2: api-public `host.int.test.ts` "a second account using a returning host's email …". Migration `20261123070954_host_email_not_unique`. The api-admin staff PATCH keeps 409 through an explicit check (the existing `hosts.int.test.ts` covers it).
- [x] M8: auth `capabilities.test.ts` "export capabilities (T28 M8)" (red: 6 failed). api-admin `matrix.int.test.ts` now has 4 export rows plus logout-everywhere, and `misc.int.test.ts` has "export permissions per entity …" and "each export is logged …". The admin UI `can(...)` checks are updated.
- [x] H1 (Next side): web and admin `src/lib/forwarded.test.ts` (red: the module was missing; 7/7 each). `src/proxy.ts` now runs on `/api/*` too.
- [x] M6: web and admin `src/lib/security-headers.test.ts` (red: the module was missing; 7/7 each), wired into `next.config.ts` `headers()`. Helmet: api-public and api-admin `test/logging.int.test.ts` "helmet: security headers …".
- [x] L12: api-public and api-admin `src/common/logging.test.ts` (red: the module was missing) and `test/logging.int.test.ts` "the request log has the path but not the query string". Green: api-public 76/76, api-admin 104/104.
- [x] L13: worker `src/redact.test.ts` and `test/email.int.test.ts` "an SMTP error naming the recipient …". Red: an assertion showed the address in `JobFailure.error`. Green: worker 48/48.
- [x] L11: cms `test/plans.test.ts` "users-permissions hardening (T28 L11)" and `test/env.test.ts` "cmsEnvSchema in production (T28 L11)". Red: 8 failed. Green: 31/31. Checked live on `strapi develop`: register, login and forgot-password give 403, the Public role has only `api::message.message.find`, and `allow_register` is false.
- [x] M9: overrides are in the root `package.json`. High findings went from 12 to 1 (zod 3 under koa-body; see Decisions). Strapi `build`, `develop` (`/_health` 204) and `cms:seed` (1576 unchanged) all work.
- [x] LH: `docker-compose.yml` binds every port to 127.0.0.1. `docker compose up -d --wait` brought all three containers back healthy, and the data was kept (15 users, 8 salons). Covered by the e2e "every Docker port is bound to 127.0.0.1".
- [x] e2e `tests/10-security.spec.ts` (H1 through the rewrite, M6 headers with no CSP errors, M8 buttons, LH). The e2e cleanup also clears the Valkey rate-limit keys.
- [ ] Root `lint|typecheck|build|test --force` and `pnpm e2e`.

## Decisions

- **D1 How tests and migrations ran.**
  - Tests ran only through the project's own scripts: root `pnpm test --filter=<pkg>` and `pnpm --filter <pkg> …`. Running `dotenv -e ../../.env` directly was blocked as reading `.env`, so it was not retried.
  - New migrations were created with `prisma migrate dev --create-only`, using the local URL from 00-conventions (`zikaron:zikaron@localhost:5435/zikaron_app`). They were applied with `pnpm db:migrate` (`migrate deploy`). `migrate reset` was never run.
- **D2 H1: one `TRUST_PROXY_HOPS` for all four servers.** It counts the reverse proxies in front of the Next apps (CDN, load balancer). Default 0.
  - **APIs.** Express `trust proxy` is set to that number; 0 means `false`, so `req.ip` is the socket address.
  - **Next `src/proxy.ts`.** It now also runs on `/api/*`. It drops `X-Real-IP` and `Forwarded`, and keeps only the last N `X-Forwarded-For` entries.
  - **Why one number fits both.** Next's rewrite proxy (httpxy, no `xfwd`) forwards headers without adding its own hop, so the API trusts exactly the hops Next kept.
  - **Deployment condition.** With N > 0, the APIs must not be reachable directly. This is recorded in the README.
  - Next 16's proxy cannot see the socket address, so the Next side only strips headers; the API decides the IP.
- **D3 H1: the three login counters.**
  - **Limits.** 10 per email and IP and 50 per IP, each per 10 minutes. Per email, whatever the IP: 20 free per hour, then a backoff of 30 s that doubles up to 15 min.
  - **One MULTI.** It runs INCR plus `EXPIRE NX` on each counter and reads the TTL of the email's block key.
  - **The block key** is set after the MULTI (`SET EX`). Not being atomic with the counters is harmless.
  - **Refused attempts still count.** The fixed one-hour window means the per-email limit is never a permanent lock.
  - **Keys** live under each app's Valkey prefix, so they are per audience. All three fail closed with 503.
- **D4 M7: sign-up limits.** 30 sign-ups per IP per hour, counted before the handler runs. The `email_taken` path has its own counter, 10 per IP per hour; beyond it the answer is 429 `too_many_attempts` instead of 409, so the UX for normal users is unchanged. Both fail closed with 503.
- **D5 H2: no claim by email.**
  - The wizard uses the user's own profile, or creates a new one. It never links an existing profile by email.
  - **Schema change.** `Host.email` is no longer unique (`@@index([email])` instead), so a new profile can share an email with an unclaimed returning host. Migration: `20261123070954_host_email_not_unique`.
  - **409s.**
    - The wizard no longer returns `host_email_taken`.
    - The rare race of two first salons for one user is 409 `conflict`.
    - The api-admin staff `PATCH /hosts/:id` keeps 409 `host_email_taken` through an explicit check, because a staff edit should not create duplicates.
- **D6 M4: session versions.**
  - **The `sv` claim is required.** Tokens without it, issued before this change, are rejected, so each user logs in once more after the deploy.
  - **Guard check.** `SessionGuard` compares `{ role, sessionVersion, disabled }` through the app's `SESSION_STATE` provider. `checkSessionState: true` is set in both APIs.
  - **Provider lookup.** The guard finds the provider through `ModuleRef.get(…, { strict: false })`, because Prisma and Valkey live in each app's module. With checks on but no provider, it fails with 500 instead of running unchecked.
  - **Cache.** State is cached in Valkey under `sess:<userId>` for 60 s, per app prefix. If Valkey is down, it reads Postgres.
  - **Bumps.**
    - `POST /auth/logout-everywhere` (on both APIs) bumps the version and clears the cache, so the effect is immediate.
    - A role change is caught by a Postgres trigger (`BEFORE UPDATE OF role`), whoever makes it, and takes effect within the 60 s cache.
  - **`disabled`.** There is no `disabled` column. A deleted user counts as revoked, and the interface already accepts `disabled` for later.
  - **Lifetimes.** Admin sessions last 12 h and web sessions 30 days, for both the JWT `exp` and the cookie `Max-Age`.
  - **Test isolation.** The api-admin matrix uses throwaway staff users, so logout-everywhere in the table cannot revoke the seeded accounts that other test files use in parallel.
- **D7 M5: Secure cookies.**
  - `sessionCookieOptions({ audience, origin })` sets `secure` to whether the origin's protocol is `https:`.
  - `assertSessionCookiePolicy` runs in `configureApp`. The app refuses to start if an https origin would get a non-Secure cookie, or if `NODE_ENV=production` has a non-local http origin.
- **D8 M6: security headers.**
  - **CSP shape.** The CSP keeps `'unsafe-inline'` for scripts and styles. The App Router streams inline bootstrap scripts, and a nonce would need a per-request value from the proxy, which makes every page dynamic. Everything else is `'self'`, and the policy has `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'` and `form-action 'self'`.
  - **Allowed outside hosts.** Images may come from `data:`, `blob:` and `https://*.tile.openstreetmap.org`. Google Maps hosts are added only when a key is set.
  - **Dev only.** `next dev` adds `'unsafe-eval'` and `ws:`.
  - **Other headers.** HSTS is sent; browsers ignore it over http. `Permissions-Policy` turns off camera, microphone, geolocation, payment and usb, and keeps `clipboard-write=(self)` for the copy-link buttons.
  - **APIs.** They use `helmet` 8.3.0 with a JSON-only CSP (`default-src 'none'; frame-ancestors 'none'`) and `Referrer-Policy: no-referrer`.
  - **Nonce follow-up.** A nonce-based CSP is a possible later improvement.
- **D9 M8: exports.**
  - **Routes.** There are four routes (`/exports/{salons,guests,hosts,witnesses}.csv`), each with one capability, replacing `:entity.csv`. The matrix stays route × role, and an unknown entity is now 404 instead of 400.
  - **Who may export.**
    - super_admin, general_admin and global_admin: all four. global_admin owns salons, hosts and witnesses in the capability table.
    - hosts_admin: salons, guests and hosts.
    - testimonies_admin: witnesses.
    - volunteers_admin: none.
  - **Audit log.** Each export logs `{ event: "export", userId, entity, salonId }` at info level through the Nest Logger, with ids only.
- **D10 M9: overrides.**
  - **Kept:** `undici@6→6.29.1` (works on Node 22.15), `nodemailer@<10.0.6→10.6.1`, `markdown-it@14→14.3.3`, `zod@>=4.0.0 <4.6.6→4.6.7`, `vite@6→6.4.6`, `effect@3→3.22.5` (via Prisma), `webpack-dev-middleware@6→7.4.6`.
  - **Could not be applied:** `zod@3` (3.25.76, used by `koa-body` and `koa-session` inside Strapi). Overriding it to zod 4 crashed `strapi build` with `zod_1.default.function(...).args is not a function` in koa-session. No patched zod 3 exists, so this is the one high finding left.
- **D11 L11: Strapi.**
  - The bootstrap sets users-permissions `advanced.allow_register = false` and deletes every Public `plugin::users-permissions.auth.*` permission. The first live boot removed 8.
  - **Production secrets.** With `NODE_ENV=production`, every `CMS_*` secret, salt and app key must be at least 32 characters.
  - **Opt-out.** `strapi start` always sets `NODE_ENV=production`, and the local `.env` CMS values are shorter; the validator named them without printing values. So `CMS_ALLOW_SHORT_SECRETS=1` is an explicit local-only opt-out, and the e2e stack sets it for its own Strapi only.
- **D12 L12.** The pino `serializers.req` drops `query` and cuts `url` at `?` or `#`, in both APIs. The exception filter already logged only stacks.
- **D13 L13.** `redactEmails` replaces anything shaped like an address with `[email]`. It is applied to `JobFailure.error` (email jobs and parked relay events) and to every worker log line: `startJobs` wraps its logger, and the module's pino logger is wrapped.
- **D14 H3: seed guard.**
  - **Where it runs.** In `prisma/seed.ts` (`db:seed`), and in `scripts/seed-guard.ts`, which runs before `prisma migrate reset` in `db:reset`.
  - **Not guarded:** the library `seed()` function used by the test global setups, which pass `TEST_DATABASE_URL`.
  - **Allowed hosts:** `localhost`, `127.0.0.1` and `::1`. Only the value `ALLOW_DEMO_SEED=1` opts out.
  - **Existing accounts.** Only the `@zikaron.local` demo logins are reset on update. Any other seed email is create-only, so its password, role and profile are kept.
- **D15 The e2e cleanup clears local rate-limit state.** It deletes `api-*:rl:*` and `api-*:sess:*` in the local Valkey before and after the suite, so repeated runs within an hour stay under the per-IP and per-email limits. The new spec is `08b-security`, which runs before `09-resilience` because that spec stops api-public.
- **D16 TDD record (honest).**
  - Seen red on assertions first: the auth package tests, the api-public integration tests, the H3 integration test, L10, L11, the L13 integration test and the M8 capability test.
  - Seen red only on a missing module: the new `lib`/`common` unit modules (forwarded, security-headers, logging, redact).
  - Written before the implementation but first run after it, so only seen green: the api-admin integration tests and the L12/helmet integration tests. They mirror api-public tests that were seen red.
- **D17 User decisions, 2026-11-23 (passed on by the orchestrator).** The implementation already matches all four:
  1. **Viewing stays as built.** Every staff role can view everything in the admin. Menus and read routes are not restricted by role, and the `STAFF_READ` capabilities are unchanged.
  2. **The M8 export split goes ahead as specified.** `export:salons|guests|hosts|witnesses` are granted by data owner, and super_admin and general_admin get all four (see D9 for global_admin).
  3. **Community scoping is deferred** to a later spec. It is not added here.
  4. **Returning hosts will be linked to their old profile by staff in the admin portal.** That feature comes after this work. For H2 this phase only ensures that no auto-claim by email happens (D5); no linking UI or API was added.
- **D18 `@zikaron/db#lint` now runs after `@zikaron/db#build` in `turbo.json`, as typecheck already did.** Under `--force`, `db#lint` raced `db#build`'s `prisma generate` and failed with "type could not be resolved" in the existing `src/outbox.int.test.ts`. The ordering fixes it.

## Handover
