# Topology — One API, Two Frontends

> Customer: zikaron-basalon · Discovered: 2026-11-18 (deep verification pass)
> Repos: `zikaron-basalon-be` (`dev`), `zikaron-basalon-fe` (`dev`), `zikaron-basalon-fe-admin` (`fix/phone-number-witness-regex`)
> Runtime and AWS detail: [platform/legacy-baseline/infrastructure-and-runtime.md](../products/platform/legacy-baseline/infrastructure-and-runtime.md)
> Citations are `file:line` in the named repo. Secret values are never recorded.

One Django API serves two audiences: the **public** (hosts, guests, witnesses) through `fe`, and
**staff** (6 admin roles) through `fe-admin`. There is also an old third client: a full admin UI inside `fe`.
This doc covers how that coupling works today, what it breaks, and which barriers the target
monorepo removes and which it keeps.

## 1. How each frontend reaches the API

| | `fe` (public) | `fe-admin` (staff) |
|---|---|---|
| API base URL | `REACT_APP_API_URL`, **falling back to `https://dev.zikaronbasalon.com`** (`src/utils/constants/api.ts:2-6`) | same fallback (`src/utils/constants/api.ts:2-6`) |
| HTTP client | shared axios instance + redux middleware that prefixes `API_URL` (`store/middleware/auth.middleware.ts:12-30`) | same pattern (`auth.middleware.ts:8-25`) |
| Token storage | localStorage `persist:auth` (redux-persist), tokens **wrapped in literal quotes** (`saga/auth.saga.ts:69-75`) | raw localStorage keys `access_token` / `refresh_token` (`utils/tokenUtils.ts:1-19`) |
| Refresh | only after a 401 (`auth.middleware.ts:43-71`) | before every request when the token has under 5 minutes left, and after a 401 (`:27-37,67-85`) |
| Errors | clears tokens and redirects on 403. Turns HTTP **450** on `host_salons_map` into an empty list (`:76-87`) | clears tokens and redirects on 403 (`:104-109`). Doesn't know about 450 |

Smaller defects in `fe`:
- With no one logged in, `addRequestObject` dispatches the action twice (`auth.middleware.ts:13-14`).
- `apiCalls/hosts.ts:16` reads fe-admin's `access_token` key, which fe never writes. It's a copy-paste leftover.

## 2. Auth: one identity system for both audiences

- **One user table, one token type.** `users.User.role` is a free-text field with 9 values: 6 admin roles plus host, guest and witness (`users/models.py:47-77`). `is_staff` isn't used for API access.
  - One HS256 key signs every token (`settings.py:237-255`), and that key is also `SECRET_KEY`.
  - **A token issued to either app is valid on every endpoint.**
- **Authorization fails open.** `IsUserAccessAllows` allows any request whose view basename is missing from `user_permissions` (`common/utils.py:193-199`). These are missing, so **any logged-in user, guests included**, can call them:
  - `salonsguests`, `host_salons_map`, `host_salon_training`, `host_salons_for_easy_integration`
  - `salonDay`, `cities`, `languages`, `communities`
  - `user_data`, `sms_authentication`, `eventbridge_tasks`
  - `witness_comments`, `witnesses_duplicate_validation`
  - In addition, `WitnessCommentView`'s permission line is commented out (`witnesses/views.py:412`).
- **A host token reaches staff-level salon actions.**
  - **Read and edit:** `HostSalonView` returns `HostSalon.objects.all()` for every role (`hosts/views.py:216-231`), and the permission check covers role only, never ownership (`common/utils.py:210-235`). So **a host can read and PATCH any salon**.
  - **Delete:** DELETE is allowed to Host (`utils.py:81-88`), so a host can delete any salon.
  - **Server error instead of a refusal:** `hosts_salons_list` gives a host a 500, because `get_queryset` has no host branch and returns `None` (`hosts/views.py:401-413`).
- **Staff gating exists only in the clients.** `fe-admin` hides menus and routes by role. The old admin inside `fe` only checks "not host, guest or witness" (`fe/src/components/PrivateRoute.tsx:20-29`). The API is the only real gate, and it is the leaky one above.
- **Secrets and exposure.**
  - The DRF OAuth `client_secret` is built into the public JS bundle (`fe/src/store/saga/auth.saga.ts:66-67`).
  - CORS allows all origins with credentials (`settings.py:220-223`).
  - Swagger is public (`AllowAny`), which **publishes the full staff API map**.
  - Login sets JWT cookies (`users/auth_views.py:22-23`) that no auth class reads.
- **Admin session length.** Login issues a 365-day refresh token to any role containing "admin" (`users/tokens.py:8-17`). The dj-rest-auth 6.0.0 refresh view reissues a normal 30-day token. Because fe-admin refreshes ahead of expiry on every request, **admins effectively have 30-day sliding sessions**. The feature needed paired commits in two repos: be `f5204bb3` and fe-admin `3403d5c` / `a939634` (2026-01-18/19).

## 3. API surface split

The 5 `urls.py` files contain **43 routes** (29 router prefixes and 14 path or auth routes). Each was grepped in both apps:

| Used by | Count | Examples |
|---|---|---|
| both apps | 19 | salons, witnesses, hosts, host_salons, guests, salonguests, user_data, sms_authentication, login, refresh, register, reset |
| staff app only | 13 | salondays, cities, communities, the 4 dashboards, witness year comments, duplicate validation, the 2 `*_teaming` routes, export_witnesses, import_presentation |
| public app only | 2 | `convert-token`, `verify_token` |
| server-to-server | 3 | eventbridge_tasks, Easy feed, google_sheet_webhook |
| no literal caller | 6 | host_salon_content, export_communities, password_reset/confirm, auth/password/change, auth/user, auth/logout |

Two caveats on the counts:
- "Both" is inflated, because each app carries the other's leftover code.
- Some paths are built by string concatenation (`${hostSalonUrl}_teaming/` in `fe-admin/store/apiCalls/hosts.ts:72`), so a grep can't prove an endpoint is dead. **That fragility is itself a contract problem.**

**One view, two audiences.** Each of these views branches on role inside `get_queryset` or `get_serializer_class`: `HostSalonView` (`hosts/views.py:233-238`), `GuestView` (`guests/views.py:46-80`), `SalonGuestsView` (`:159-190`), `WitnessView` (`witnesses/views.py:71-105`) and `HostView` (`hosts/views.py:105-135`).

**Over-exposure in practice: the map cache leak is still live.**
- `HostsSalonsMapSerializer` includes `host_phone` and `host_email` because staff need them on the teaming map (`hosts/serializer.py:404-406`).
- The April 2026 fix (`a23a3114`) strips them for non-admins (`:472-482`).
- But the cache bypass is broken. `should_cache=False` for logged-in users (`hosts/views.py:487-488`) is set back to `True` two lines later when the only parameters are city or date (`:490-492`).
- So **an admin's response, contact details included, is cached for 300 s under the same key that anonymous visitors read** (`:475-477`).
- The cache is per worker, so whether a visitor sees leaked data depends on which worker serves them.

## 4. Shared rules, copied and drifted

- **Code drift.** 442 TypeScript files sit at the same path in both frontends. Ignoring formatting, only **151 are identical and 291 differ**. The most drift is in `components/common` (70), `components/Auth` (68), `components/Admin` (55) and `store` (49). Every `interfaces/` file differs.
- **Phone validation has 3 different rules:**
  - `fe` rejects 07x numbers (`src/utils/forms/constants.ts:16-17`).
  - `fe-admin` HEAD accepts `7[2-9]\d{7}`, but its working tree has a stray `w` that breaks every check (`:15`).
  - The backend uses libphonenumber `PhoneNumberField` (`users/serializers.py:96,100`).
- **Morning start time** disagrees even inside the backend:
  - 08:00: `hosts/filter_backends.py:27`, `witnesses/views.py:161`, `hosts/serializer.py:348`.
  - 07:00: `hosts/serializer.py:749`, `common/utils.py:482`.
  - Only `common/utils.py:356` converts to UTC.
  - Both frontends hard-code 08:00.
- **Roles are defined three times:** `users.User` constants, `common.utils.UserRules` (`:29-38`, mixed casing), and each frontend's `UserTypes`.
- **Witness statuses** live in backend choices and in fe-admin constants (`witnessProfileList.ts:14`), with no shared schema.

## 5. Deploy coupling

- **No API versioning.** Swagger says `v1`, but every path is unversioned `/api/...`.
- **Migrations run after the new code.** They run in the EB postdeploy hook, on the leader only. During every deploy, new code serves **both** apps before its schema exists.
- **Three independent pipelines, nothing coordinating them.** Each repo builds and deploys on its own, so nothing tests the API together with the two clients.
- **Branches don't line up.** be and fe use `dev`, fe-admin uses `development`.
- **Staging is dead.** `origin/staging` is far behind `main`: be 306 commits, fe 432, fe-admin 161.
- **Diverging cadences.** The last `main` updates were be 2026-05-24, fe 2026-08-02 and fe-admin 2026-08-16. From May to October 2026 the backend had 7 commits, fe 18 and fe-admin 7, so the frontends keep shipping against a backend that has mostly stopped moving.
- **Breaking changes need paired commits across repos.** Example: the 365-day admin refresh token (§2).

## 6. The third client: an old admin copy inside `fe`

- **Size:** about **14,300 lines** under `fe/src/components/Admin/**`, lazy-loaded, with the full `/admin/*` route table (`fe/src/utils/constants/routes.ts:5-28`).
- **Reachable in production:** `<PrivateRoute path="/admin">` is live (`fe/src/components/Routes.tsx:54,162`). Any admin who logs in on the public app gets the old UI.
- **Calls the API differently from fe-admin:** quote-wrapped tokens, refresh only after a 401, no witness export or presentation import, and its own copy of the 08:00 teaming logic.
- **Branches confirm the split:** `dev-with-old-admin`, `dev-with-old-admin-2`, `dev-new-admin`.

## 7. Barriers of this structure, ranked

| # | Barrier | Consequence today | What the target monorepo does |
|---|---|---|---|
| 1 | **One identity and token system with fail-open authorization**: one signing key, no audience separation, missing ownership checks, the map cache leak, a client secret in the bundle, open CORS, public Swagger | Any public account can read, edit or delete any salon and read staff-only data. Anonymous visitors can get host contact details | NestJS **deny-by-default guards** with a role-to-capability table in `packages/contracts`, **ownership checks in services**, separate **public vs staff DTOs**, no cached authenticated responses, CORS limited to two origins, Swagger behind staff auth ([authentication-and-accounts](../products/platform/epics/authentication-and-accounts/epic.md), [admin-auth-and-shell](../products/admin/epics/admin-auth-and-shell/epic.md)) |
| 2 | **Contracts copied by hand**: 291 drifted files, 3 phone rules, 07 vs 08, roles defined three times | The same input is valid in one app and rejected in another, and every fix has to be made 2–3 times | `packages/contracts` (zod schemas, enums, time-slot and phone rules) and `packages/ui`, used by api, web and admin |
| 3 | **Deploy and release coupling without a contract**: no versioning, migrations after code, 3 pipelines, no staging, paired commits | An API change can break the other app unnoticed, and nothing tests the pair together | **One PR changes the API and both apps atomically.** Contract tests in CI. Migrations **before** code (expand → contract). A real staging environment ([platform-rewrite](../products/platform/epics/platform-rewrite/epic.md)) |
| 4 | **Shared runtime capacity**: public and staff traffic share 3 sync workers per instance, a per-worker cache, a new DB connection per request, and broken autoscaling | In the pre-Yom-HaShoah peak, staff teaming slows as public load grows, and each worker has a differently stale cache | Async Node runtime, a shared cache, a connection pool, background jobs for messaging and exports, working autoscaling, and edge-cached public reads |
| 5 | **Unclear ownership, dead code**: the reachable old admin in `fe`, public leftovers in `fe-admin`, 6 endpoints with no visible caller, server-to-server routes mixed into the app API | Nobody can say what is safe to delete. Security fixes have to reach three clients | **One app per audience.** A separate `integrations` module for EventBridge, Easy and the Sheet webhook. Unused endpoints are dropped by explicit waiver |
| 6 | **Configuration lives only in the console**: the dev-API fallback, `REACT_APP_*` set in CodeBuild, hand-made admin hosting | A misconfigured build silently talks to the dev API, and environments can't be reproduced | Typed env validation at build and boot with **no URL fallbacks**, and all environments in IaC |

### Barriers that remain in the target

The monorepo removes the duplication and the release skew. These risks stay and must be designed for:

1. **One API still serves two audiences.** Role branching moves into NestJS. Security still depends on the guard and on **ownership tests** for every endpoint, salons above all. The parity test harness should include an "every endpoint × every role" authorization matrix.
2. **Auth across two Next.js apps.** If tokens move to httpOnly cookies:
   - web and admin need **separate cookie names or subdomains** and an **audience claim**, so a staff session isn't valid on web and the reverse;
   - CSRF protection is needed;
   - CORS must be limited to the two known origins.
   - Decision owner: admin-auth-and-shell, together with the authentication epic.
3. **A new network hop.** Next.js server components and route handlers calling the API add server-to-server latency and need a service credential or forwarded user token. Server rendering also changes the browser-side caching legacy relied on.
4. **Shared blast radius.** One API deploy still takes down both apps. Zero-downtime needs expand → contract migrations, independent app deploys, and feature flags for cut-over.
5. **Shared capacity.** Unless the public read paths (the map and salon pages) are cached at the edge or scaled separately, a seasonal spike still competes with staff work on the same API instances.
6. **Two apps, one release train.** The monorepo couples the release cadences. A hotfix to `apps/web` must not need an `apps/admin` deploy, so the pipelines need per-app build and deploy triggers.
