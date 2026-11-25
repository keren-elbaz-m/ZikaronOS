# Phase 11 — Admin in the live system's design + returning-host link

Tasks: T33, T34, T35 · ACs: AC16 (admin), AC17, AC4, AC5, AC6, AC10, AC14 · Decision (user, 2026-11-23): **look + screens + flows** of the current live admin.

## Design source (read-only, never modify)

- Live admin code: `../zikaron-basalon-fe-admin/` (symlinked at the hub root). Styles: `src/utils/css/*` (colors, fonts, layout, sizes, input, modal, scrollBar), `src/utils/MuiTheme.ts`, `src/matrielUiStyles.css`, component `*Style.ts`, `src/assets/icons/`, `public/fonts`, `public/locales/{he,en}`.
- Screenshots: `softwareos/audits/2026-11-17-frontend-admin-audit/shots/admin-*.png`, `local-admin-*.png`, `flow-admin-*.png`.
- Behaviour: `softwareos/ecosystem/system-architecture.md` §5, `softwareos/products/admin/legacy-baseline/*.md`.

## Rules

- Same rules as plan 10: new stack (Next.js + Tailwind + `@zikaron/ui`, no MUI), legacy look + screens + flows, keep backend behaviour and fixes, he/en via `admin.json`, Strapi override, test-first for logic, additive API changes only.
- Viewing: every staff role can view every screen (user decision); actions and exports follow `can(role, capability)`.
- Legacy menu items with no backend in this spec (for example communities, volunteers, inquiries, date settings) are **not** built as working screens. Show them in the side menu exactly as legacy only if you can make them clearly inactive with a "coming later" state; otherwise omit them. Record the choice and list them as follow-up specs in Handover.

## Steps

1. Inventory every legacy admin screen and flow and map it to a route; write it under Decisions.
2. Shell: yellow header (logo, greeting, log out, ENG | עב), dark grey side menu with the legacy items and active state, the yellow filter strip with collapse handle, page title area; same on mobile as legacy.
3. Screens: dashboard cards (dark card headers with icon + count, rows, "go to" link), salons list table + filters + action bar (CSV, bulk actions per capability), host list + host profile with salon cards (details, witness, guest requests, admin section with flags/volunteer/notes), witnesses list + add witness form + witness profile cards (contact, personal, accessibility, assign status, availability, attended), guests list + guest profile, teaming (map/table views, sidebar with selected salon/witness, candidates with distance, confirm modal side-by-side, success modal; keep one-click undo as an extra after success), CSV exports.
4. **T34 Returning-host link (AC17):** `POST /hosts/:id/link-user` in api-admin (body: user email; capability `host:update`; refuses if the host already has a user, if the user is not a `host`, or if that user already has a host profile; writes an audit note), contract schema, matrix-test row, integration tests, and a "link to user account" action on the admin host profile. After linking, `host@…`'s web `/host` shows that profile's salons.
5. **T35:** update the admin smoke + visual-check scripts (screenshots vs the legacy screenshots under `apps/admin/visual-check/legacy/`) and the e2e specs for admin; run the full suite.

## Done when

- Every screen in the inventory renders at `/he/...` and `/en/...` with the live admin's look; side-by-side screenshots saved.
- e2e: teaming (assign → host email in Mailpit → undo), every admin interaction from Phase 8's list, AC6 with api-public stopped, and the returning-host link flow pass.
- Root `pnpm lint --force`, `typecheck --force`, `build --force`, `test --force` and `pnpm e2e` pass.

## Decisions

## Handover
