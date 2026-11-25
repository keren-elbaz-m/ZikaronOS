# Phase 10 — Web in the live system's design

Tasks: T31, T32 · ACs: AC16 (web), AC4, AC5, AC9, AC14 · Decision (user, 2026-11-23): **look + screens + flows** of the current live site, including footer, links, Instagram icon and the accessibility widget.

## Design source (read-only, never modify)

- Live site code: `../zikaron-basalon-fe/` (symlinked at the hub root as `zikaron-basalon-fe`). Styles: `src/utils/css/*`, `src/utils/MuiTheme.ts`, `src/matrielUiStyles.css`, `src/theme.ts`, each component's `*Style.ts`; fonts in `public/fonts`; images/icons in `public/` and `src/assets` (if present); texts in `public/locales/{he,en}/translation.json`.
- Screenshots: `softwareos/audits/2026-11-17-frontend-admin-audit/shots/fe-*.png`, `flow-guest-*.png`, `flow-host-*.png`, `prod-salon-map.png`.
- Behaviour reference: `softwareos/ecosystem/system-architecture.md` §4 and `softwareos/products/platform/legacy-baseline/*.md`.

## Rules

- **Same look and same screens/flows as the live site**, rebuilt on the new stack: Next.js + Tailwind + `@zikaron/ui`. **No MUI, no styled-components, no redux.** Copy colours, font sizes, spacing, borders, shadows, icons and layout from the legacy styles and screenshots. Copy assets (fonts, logo, icons) into the new repo; that is allowed.
- Keep everything the backend already does and the fixes already made (strict phone rule, address must match the city, one time-slot rule, account-based registration, security headers, sessions, `safeReturnTo`, he/en). Keep he/en via `packages/i18n` (move/replace strings in `web.json`; reuse the legacy Hebrew and English texts where they exist). Keep the Strapi override.
- Witness self-registration stays dropped (no "want to tell" flow). Orthodox mode stays out of scope.
- Where the legacy flow needs data the API lacks (for example guest onboarding fields such as city/address, host onboarding fields, the wizard's video step), add it **additively** to contracts + api-public + Prisma (new migration with `migrate dev --create-only` + `migrate deploy`; never `migrate reset`), test-first.
- The prototype's extra screens that have no legacy equivalent (for example the standalone `/salons/[id]` page) may stay as deep links, but the main flow must be the legacy one (salon drawer over the map). Record what you keep in Decisions.
- Accessibility widget: legacy loads the nagich.co.il script. Include it as on the live site (script tag in the layout, same position), allow it in the CSP (`script-src`/`connect-src`/`img-src` for its domains only), and make the page work if the script fails to load (local/offline).
- Footer: same links as live (contact, Zikaron BaSalon site, terms, accessibility statement, Instagram). External links open in a new tab with `rel="noopener noreferrer"`.

## Steps

1. Inventory: list every legacy web screen and flow (routes table in system-architecture §4) and map each to a new route; write it under Decisions.
2. `packages/ui`: replace the prototype tokens with the legacy design tokens and build the legacy components (header, footer, buttons, inputs, selects, counters, drawer, modal, cards, map pins, accessibility widget loader). Keep components text-free and direction-aware (logical properties). Keep the old prototype components only if still used; otherwise remove them.
3. Rebuild the web screens and flows: login (email/password, SMS UI only if the API supports it — otherwise omit and record), forgot password (UI only if supported — otherwise omit and record), registration (choose host/guest) + onboarding steps, map + list + filters + salon drawer + seats counter + register + "registered" popup, guest "my salon", host onboarding, host 5-step salon wizard + success, host salon page (cards/tabs as live), accessibility statement, privacy/terms pages, 404.
4. Update the web smoke + visual-check scripts: screenshots of each new screen next to the matching legacy screenshot under `apps/web/visual-check/legacy/`.
5. Update unit tests and the e2e specs that touch web so they follow the new flows.

## Done when

- Every screen in the inventory renders at `/he/...` and `/en/...` with the live site's look; side-by-side screenshots saved.
- Guest flow (signup → onboarding → map → drawer → register seats → email in Mailpit → my salon) and host flow (signup → onboarding → wizard → salon page) pass in e2e.
- Root `pnpm lint --force`, `typecheck --force`, `build --force`, `test --force` and `pnpm e2e` pass.

## Decisions

## Handover
