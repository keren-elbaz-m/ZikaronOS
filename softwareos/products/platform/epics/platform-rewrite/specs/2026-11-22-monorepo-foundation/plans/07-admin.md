# Phase 7 — Admin app

Tasks: T21, T22, T23 · ACs: AC3, AC4, AC5, AC6, AC7, AC10, AC12, AC14

Read first: `prototype/zikaron-next/app/admin/**` (layout, every page), `components/notes.tsx`, `components/editable-section.tsx`, `lib/store.tsx`.

## Steps

1. Create `apps/admin` the same way as `apps/web` (Phase 6 step 1), with `API_ADMIN_URL`, rewrites `/api/:path*` → api-admin, cookie `zb_admin`, messages `['common','admin']`.
   - `/[locale]/login` for staff; every other route requires a session (redirect to login).
   - Layout from the prototype admin layout: side menu with live counts (from api-admin), menu items shown per role (from `@zikaron/auth` capabilities), ⌘K / Ctrl+K search calling `GET /search`.
2. Port the routes under `app/[locale]/` without the `/admin` prefix: `/` (dashboard), `/salons`, `/salons/[id]`, `/hosts`, `/hosts/[id]`, `/witnesses`, `/witnesses/[id]`, `/guests`, `/teaming`. Keep JSX and classes; move strings to `packages/i18n/messages/{he,en}/admin.json`.
3. Wire every interaction to api-admin (T23): notes, editable sections (PATCH), witness availability grid (PUT), witness status (domain rules surface as inline errors), follow-up switches, guest removal, capacity change, teaming assign + confirm dialog + one-click undo, CSV exports (download from `/api/exports/...`). Nothing stays in `localStorage` except UI preferences.
4. Strapi: same check as Phase 6 for an `admin` message.

## Done when

- `pnpm --filter @zikaron/admin build` and `typecheck` pass; `check-messages` passes.
- With the stack running, every route above renders at `/he/...` and `/en/...`; a `super_admin` can team a witness to a salon and the host email appears in Mailpit; undo removes it.
- With api-public stopped, admin still works (AC6).
- Side-by-side screenshots of `/he/teaming` vs prototype `/admin/teaming` saved under `apps/admin/visual-check/`.

## Decisions

## Handover
