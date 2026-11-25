# Phase 6 — Web app

Tasks: T18, T19, T20 · ACs: AC3, AC4, AC5, AC7, AC9, AC12, AC14 (web side)

Read first: `prototype/zikaron-next/app/{layout,page}.tsx`, `app/salons/**`, `app/guest/**`, `app/host/**`, `components/site-header.tsx`, `lib/store.tsx`.

## Steps

1. Create `apps/web` (Next.js current stable, App Router, React 19, Tailwind v4 importing `@zikaron/ui/styles.css`, `transpilePackages` for workspace packages).
   - `src/env.ts` with `loadEnv` (`API_PUBLIC_URL`, `STRAPI_URL`, optional `STRAPI_TOKEN`, optional `NEXT_PUBLIC_GOOGLE_MAPS_KEY`); fail the build/start when required vars are missing.
   - `next.config`: rewrites `/api/:path*` → `${API_PUBLIC_URL}/:path*`.
   - next-intl: `middleware.ts` with `locales`/`defaultLocale` from `@zikaron/i18n`, `localePrefix: 'always'`; `app/[locale]/layout.tsx` sets `<html lang dir>` and loads messages with `loadMessages(locale, ['common','web'])`.
   - API client: `src/lib/api.ts` typed by `@zikaron/contracts`, adds `X-Requested-With: zikaron`, `credentials: 'include'`; server components call `API_PUBLIC_URL` directly and forward the `zb_web` cookie. TanStack Query for client state.
2. Port the routes under `app/[locale]/`: `/`, `/salons`, `/salons/[id]`, `/guest`, `/host`, `/host/new`. Keep the prototype's JSX structure and Tailwind classes so the design is identical; swap data from the localStorage store to the API; move every Hebrew string to `packages/i18n/messages/he/web.json` and write `en/web.json`.
   - Header: language switch (he ⇄ en, keeps the current path), login/logout, the user's name. Remove the prototype's "view as" demo switch.
   - Search filters stay in the URL, as in the prototype.
3. Auth and flows:
   - `/[locale]/login` and `/[locale]/signup` (guest or host) using `@zikaron/ui` form primitives and the prototype's form style.
   - Salon page registration: if logged out, the form first asks to log in or sign up (keeps the salon in the return URL), then shows the seats form; success shows the prototype's success state (calendar .ics + share link).
   - `/guest` shows and edits the guest's registration (cancel, change seats).
   - `/host/new` wizard posts to `POST /host/salons`; `/host` reads `GET /host/salons`; capacity change and the checklist call the API.
4. Strapi: with Strapi running, change a `web` message in the Strapi admin and confirm it appears within 60 s; stop Strapi and confirm the page still renders.

## Done when

- `pnpm --filter @zikaron/web build` and `typecheck` pass; `check-messages` passes.
- With the stack running, every route above renders at `/he/...` and `/en/...` with no console errors; a guest can sign up, register 2 seats, and an email appears in Mailpit.
- A screenshot of `/he/salons` and the prototype's `/salons` side by side shows the same design (save both under `zikaron-platform/apps/web/visual-check/`).

## Decisions

- **D1 Next.js 16.4.6, next-intl 4.15.3, TanStack Query 5.108.2.** Next 16 is current stable and runs Turbopack for dev and build. Other pins: `react`/`react-dom` 19.3.1 (declared in `apps/web` only, so pnpm nests them in `apps/web/node_modules`; the root keeps React 18 for Strapi), `@types/react` 19.3.0, `lucide-react` 1.77.0, `sonner` 2.0.8, `libphonenumber-js` 1.13.17, and `playwright` 1.65.1 (dev, for the check scripts only).
- **D2 `src/proxy.ts`, not `middleware.ts`.** Next 16 renamed middleware to "proxy". The file is next-intl's `createMiddleware(routing)`. Its matcher skips `/api`, `_next` and files, so `/api/*` reaches the rewrite. Routing comes from `@zikaron/i18n/config` (`localePrefix: "always"`).
- **D3 Env.** `src/env.ts` defines `API_PUBLIC_URL` and `STRAPI_URL` (both required URLs), plus optional `STRAPI_TOKEN` and `NEXT_PUBLIC_GOOGLE_MAPS_KEY`. `next.config.ts` calls `loadEnvOrExit`, so `next build`, `dev` and `start` all stop with `Missing env: …`. Server code reads the same schema through `src/lib/server-env.ts`. Package scripts load `../../.env` with dotenv-cli, like the other apps. The port is `${WEB_PORT:-3100}`.
- **D4 Two React type copies.** The root has `@types/react` 18 (Strapi), so libraries' `.d.ts` files resolved the wrong `ReactNode`. `tsconfig.json` `paths` maps `react` and `react/*` to `apps/web/node_modules/@types/react`. Phase 7 needs the same mapping.
- **D5 Typecheck generates route types first.** Next 16 rewrites `next-env.d.ts` to import `.next/(dev/)types/*`, so `typecheck` is `next typegen && tsc --noEmit`. `next-env.d.ts` is git-ignored, as Next recommends. `agentRules: false` stops `next dev` from writing an `AGENTS.md` into the app.
- **D6 API client (`src/lib/api.ts`, test-first).**
  - One `createApiClient({ baseUrl, fetch?, cookie? })` that parses every response through its `@zikaron/contracts` schema.
  - Requests send `credentials: "include"`, `cache: "no-store"` and `Accept: application/json`. Mutations add `X-Requested-With: zikaron`; JSON bodies add `Content-Type`.
  - Errors become `ApiError(status, code, message, details)`. `code` is the API's code, or `network`, `invalid_response`, `internal_error`, `not_found` or `unknown_error`.
  - The browser uses `browserApi` (`/api`, rewritten to api-public). Server components use `serverApi()` (`API_PUBLIC_URL`), which forwards **only** `zb_web`. `sessionCookieHeader` refuses values that could inject another cookie or header.
  - `errorText(err, t)` maps errors to `common.errors.<code>`. For `registration_rejected` it lists `common.rejections.registration.<reason>` instead.
  - The cookie name is duplicated as `SESSION_COOKIE_NAME`, so the browser bundle never imports `@zikaron/auth` (which pulls in argon2).
- **D7 Session and data flow.**
  - `getSessionUser()` (React `cache`) calls `/auth/me` with the forwarded cookie; a 401 or 403 counts as logged out.
  - Server components fetch the first data (salons, reference, `/me/registration`, `/host/salons`). Client components take it as TanStack Query `initialData`, then mutate through `browserApi` and update or invalidate the cache plus `router.refresh()`.
  - Every page is dynamic, because the layout reads cookies.
- **D8 Guest registration needs an account (spec).**
  - **Logged out:** the salon card shows the seats meter, then "you need an account" with Log in / Create account links. Both carry `returnTo=/salons/<id>&role=guest`.
  - **Return URLs:** `safeReturnTo` (test-first) accepts only same-site paths and strips the locale prefix. It refuses `//`, backslashes, control characters, more than 512 characters, and the auth pages themselves.
  - **Logged in as a guest:** the seats form, with no name, phone or email fields (they come from the account, shown as "Registering as …"). If the guest is registered for another salon, a note says this one replaces it, as the API does.
  - **Logged in as a host:** a short "guest accounts only" note.
  - **Success:** the prototype's success state (calendar `.ics` plus share link), with the full address from `GET /me/registration`.
- **D9 Protected pages redirect server-side.**
  - `/guest` and `/host` → `/login?returnTo=…`.
  - `/host/new` → `/signup?returnTo=/host/new&role=host`, since most new hosts have no account yet.
  - A logged-in user with the wrong role sees an `EmptyState` explaining which account type the page needs.
  - `/login` and `/signup` share one form in the prototype's form style. Sign-up offers guest or host (a `Choice`), name, phone, email and a password (min 10). After either, the user goes to `returnTo`, or else `/host` for hosts and `/salons` for guests.
- **D10 `/salons` filters on the client.** As in the prototype, the page loads `GET /salons/map` (every open salon this season) once. A tested `filterSalons` applies the URL filters, so results update instantly and the map shows them. The rules match api-public's `filterSalons`, plus the prototype's `slot` filter, which `GET /salons` does not have. Free text matches host, organisation and city names (he and en), not street addresses, which are not public; the placeholder says "name or city".
- **D11 Additive contract changes**, made test-first in contracts and the api-public mapper:
  - `salonPublicSchema.wantsWitness`, so the salon page can say "being teamed" vs "the host brings the testimony", as the prototype does.
  - `salonMapItemSchema.witnessName` (nullable), for the card's "Testimony: <name>". The name is already public on the salon page. The full host/staff `salonSchema` omits `witnessName`, because it already has `witnessId`/`witness`, so api-admin is unchanged.
- **D12 Things the prototype had that the APIs do not support yet.**
  - The host page's **"Cancel salon"** button is **omitted**, because no endpoint deletes or cancels a host salon. Hosts can still close registration.
  - The witness "I contacted them" box stays local UI state, as in the prototype.
  - `/guest` shows one registration, because the API keeps one active registration per guest. It adds a seats stepper and "Save seats" (`PATCH /registrations/:id`) next to Cancel.
  - The wizard draft stays in `localStorage`: it is UI state, not data. A tested `restoreDraft` keeps only known keys with valid types.
- **D13 Design parity and RTL/LTR.**
  - The JSX structure and Tailwind classes are the prototype's, with logical properties throughout. Arrows flip in LTR with `ltr:-scale-x-100`.
  - Language names show in their own language (reference `name`); cities and salon days show in the page locale.
  - Dates use `Intl` with `timeZone: Asia/Jerusalem`: `he-IL` / `en-GB`.
  - Rubik loads through `next/font/google`, as in the prototype, so `next build` needs network access for the font the first time.
- **D14 Header.** The demo "view as" switch and the reset button are gone. Nav depends on role: hosts get My salon / Open a salon; guests and anonymous visitors get Find a salon / My registrations. The actions are the user's name plus Log out (or Log in) and the language switch. The switch is plain links to `/<other locale><same path><same query>`.
- **D15 Local check scripts are not tests.** `scripts/smoke.ts` and `scripts/visual-check.ts` (Playwright) need the stack running. They are run by hand (`pnpm --filter @zikaron/web smoke|visual-check`) and are not part of `pnpm test`. Playwright 1.65 wants Chromium build 1255; this machine had only 1248 cached, so the scripts accept `PLAYWRIGHT_CHROMIUM_PATH` (the cached headless shell). Nothing was downloaded.
- **D16 Prototype on :3210, not :3200.** Another `next-server` (PID 34608, not started by this phase) already held :3200. The prototype ran unmodified from its own folder (`npx next dev -p 3210`, existing `node_modules`).

## Handover

**What exists now (`apps/web`, `@zikaron/web`):**
- **Config:** `next.config.ts` (env check, `/api/:path*` → `API_PUBLIC_URL`, `transpilePackages`, turbopack root), `src/proxy.ts`, `src/i18n/{routing,navigation,request}.ts`, `src/env.ts`.
- **Routes:** `src/app/[locale]/` has `layout` (`<html lang dir>`, Rubik, `NextIntlClientProvider`, TanStack Query plus sonner, header), `page` (home), `salons`, `salons/[id]`, `guest`, `host`, `host/new`, `login`, `signup`, `not-found`, `error`, and a catch-all for a localized 404.
- **Components** (`src/components/`): `site-header`, `salon-search`, `registration-panel`, `guest-registration`, `host-dashboard`, `host-wizard`, `auth-form` / `auth-page`, `app-link` (next-intl `Link` as the kit's `LinkComponent`), `providers`.
- **Libraries** (`src/lib/`, all unit-tested except `server.ts`): `api`, `errors`, `return-url`, `forms` (login, sign-up and wizard rules plus request builders), `salon-filters`, `format` (dates, phone, `.ics`), `reference`, `server` (server-only fetch helpers).
- **Messages:** `packages/i18n/src/messages/{he,en}/web.json` is filled (129 keys per locale, real English) and seeded into Strapi.
- **Visual check:** `visual-check/` has `prototype-salons.png` next to `web-he-salons.png`, plus the home page and salon s1 in both apps, and `web-en-salons.png`.
- **Shared code touched (additive, D11):** `packages/contracts/src/salons.ts`, `apps/api-public/src/salons/salon-mapper.ts`, and their tests.

**Checks run (2026-11-22):**
- **Unit tests:** `pnpm --filter @zikaron/web test`: pass, **100/100**.
  - Test-first record: the six utility suites first ran against stubs, and 90 tests failed on assertions. Then the real code: all green.
  - Lint caught an ICS semicolon-escape bug that the test had masked (both used `"\;"`). The test was fixed first and failed, then the code was fixed and it passed.
- **Package checks:** `pnpm --filter @zikaron/web build` pass (10 routes plus the proxy). `typecheck` and `lint` pass. `check-messages` passes (`he and en messages match`).
- **Root:** `pnpm build` 12/12, `pnpm typecheck` 19/19, `pnpm lint` 19/19, `pnpm test` 19/19, all pass. Totals: config 18, ui 48, cms 21, contracts 75, web 96 (100 after `reference.test.ts`), domain 101, i18n 49, auth 55, db 19, api-public 58, worker 41, api-admin 85.
- **Live stack:** api-public :4100, worker, cms :1338 and web :3100 (`next dev`), each through its own `pnpm --filter … dev`.
  - `curl`: every route returns 200 in he and en (`/`, `/salons`, `/salons/s1`, `/login`, `/signup`). `/guest`, `/host` and `/host/new` redirect (307) to login or sign-up with `returnTo`. An unknown path gives 404. `/api/health` and `/api/salons/map` go through the rewrite. `<html lang="he" dir="rtl">` and `<html lang="en" dir="ltr">`.
  - `pnpm --filter @zikaron/web smoke`: **all checks passed**, with no browser console errors:
    - every public route in he and en, and both redirects;
    - the language switch keeps the path;
    - **guest:** sign-up from the salon page returns to it; register **2 seats**; success state; **confirmation email found in Mailpit** ("You're registered for a Zikaron BaSalon on Monday, 3 May 2027"); `/guest` in both locales; change seats 2 → 1; cancel;
    - **host:** sign-up → 4-step wizard → published → `/he/host`; capacity +1; close registration.
  - **AC5:** `pnpm cms:seed` created the 258 new web messages. Editing en `web.home.title` through Strapi's admin API showed on `/en` within about 6 s (`revalidate: 60`); `/he` was unchanged. With Strapi stopped (my PIDs), `/en`, `/he`, `/en/salons` and `/he/salons/s1` all returned 200 with no error. The edit was reverted with `pnpm cms:seed -- --overwrite` (1 overwritten).
  - **Cleanup:** all processes this phase started were stopped by PID. PID 34608 (:3200) was not started here and was left alone.
- **Coverage (v8, no gate)** on `src/lib`: `api.ts` 98% lines, `forms.ts` 100%, `return-url.ts` 95%, `salon-filters.ts` 100%, `format`, `errors` and `reference` covered. `server.ts` and `server-env.ts` are 0% in unit tests; the live runs above exercise them.

**Phase 7 (admin) must know:**
- **Reuse the patterns:**
  - Copy `src/lib/api.ts` (cookie `zb_admin`, base `/api` → `API_ADMIN_URL`), `errors.ts`, `server.ts` and `return-url.ts`.
  - Copy the `tsconfig.json` `paths` mapping for `react` types (D4) and `typecheck = next typegen && tsc`.
  - Use `agentRules: false`, `src/proxy.ts` and `app-link.tsx`.
  - Declare React 19.3.1 in `apps/admin` only.
- **Fonts:** `next/font/google` needs network access at build time.
- **Contracts:** `salonMapItemSchema` and `salonPublicSchema` gained `witnessName` and `wantsWitness` (public DTOs only; staff `salonSchema` is unchanged).
- **Prototype markup quirk:** the prototype nests `Choice` radio groups inside `Field` (a `<label>`), so the first radio takes the field label as its accessible name. Kept for design parity; consider fixing it in `@zikaron/ui` (T28/a11y).

**New variables (optional; please document in `.env.example`; agents may not edit `.env*`):**
- `WEB_PORT`: web dev/start port, default 3100.
- `PLAYWRIGHT_CHROMIUM_PATH`: only for the local `smoke` and `visual-check` scripts; uses an existing Chromium instead of downloading one.

**Open issues:**
- **Host cannot cancel a salon** (no API, D12). A functional spec should add `DELETE` or a cancel endpoint for `/host/salons/:id` plus an outbox event to notify guests.
- **English logo:** "Zikaron / BaSalon" slightly overflows the 44 px brand square. Shorter `common.app.logoLine*` in en, or a size tweak in `@zikaron/ui` `Logo`, is needed.
- **Mixed-direction titles:** Hebrew host names inside English titles ("…'s salon") render with bidi mixing. Consider wrapping names in `<bdi>` (needs rich-text `t.rich` or a kit change).
- **Smoke-check data:** the smoke runs left test users (`smoke-guest-*`, `smoke-host-*`, `dbg-host-*` @example.com) in `zikaron_app`. Every registration is cancelled and every test salon is closed, so none show on the public site. `pnpm db:reset` (user-only, Prisma's AI guard) removes them.
- **`.env.example`:** document the variables above.
