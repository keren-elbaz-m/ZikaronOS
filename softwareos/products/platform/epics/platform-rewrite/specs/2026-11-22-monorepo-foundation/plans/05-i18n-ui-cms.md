# Phase 5 — i18n, UI kit and CMS

Tasks: T14, T15, T16, T17 · ACs: AC4, AC5, AC3 (shared components)

Read first: `prototype/zikaron-next/app/globals.css`, `components/*.tsx`, `app/layout.tsx`.

## Steps

1. `packages/i18n` (test-first for the loader):
   - `config.ts`: `locales = ['he','en']`, `defaultLocale = 'he'`, `dirOf(locale)`.
   - `messages/he/common.json`, `messages/en/common.json` (header, footer, buttons, errors, statuses, roles, slots). Phases 6 and 7 add `web.json` and `admin.json`. English is a real translation, not a copy of the Hebrew.
   - `loadMessages(locale, namespaces, { strapiUrl, token, fetchImpl })`: returns bundled messages deep-merged with Strapi `message` entries for that locale and namespaces (`GET /api/messages?locale=he&filters[namespace][$in]=…&pagination[pageSize]=1000`). Server-side only, `next: { revalidate: 60 }`, 2-second timeout, on any error returns the bundle and logs one warning. Keys are dotted paths (`home.hero.title`).
   - A `check-messages` script that fails if `he` and `en` have different key sets; wire it into `pnpm lint`.
   - Tests: merge precedence, Strapi timeout → bundle, missing locale entry → bundle, key-parity check.
2. `packages/ui`:
   - Move the prototype's design tokens and base styles from `globals.css` into `packages/ui/styles.css` (Tailwind v4 `@theme`). Keep values identical.
   - Port `components/ui.tsx` primitives, `salon-card.tsx`, `notes.tsx`, `editable-section.tsx`, and the header shell from `site-header.tsx` as presentational components. **No hard-coded text**: every label comes in as a prop or via `useTranslations` from next-intl (accept a `t` prop if simpler).
   - Make direction-aware: use logical properties (`ms-`, `me-`, `ps-`, `pe-`, `start`, `end`) so the same component works in RTL and LTR.
   - `SalonMap`: Google Maps via `@vis.gl/react-google-maps` when `NEXT_PUBLIC_GOOGLE_MAPS_KEY` is set; otherwise the prototype's Leaflet map (`salon-map.tsx`), dynamically imported, client-only.
   - Exports via `package.json` `exports`; consumed by Next with `transpilePackages`.
3. `apps/cms` (Strapi 5, TypeScript):
   - Create with the official CLI non-interactively (`npx create-strapi@latest apps/cms --typescript --no-run --skip-cloud --dbclient=postgres …` or equivalent flags at install time); use the workspace's pnpm. Database `zikaron_cms` on :5433.
   - Enable i18n with locales `he` (default) and `en` (in bootstrap: create locales if missing, set default).
   - Content type `message` (collection, localized): `namespace` enumeration (common, web, admin), `key` string required, `value` text required. Unique per (namespace, key, locale) enforced in a lifecycle hook.
   - Bootstrap: grant the Public role `find` on `message` only.
   - Port 1337; env from the root `.env` (`APP_KEYS`, salts, `DATABASE_*`).
4. `cms:seed` (in `packages/i18n/scripts/seed-strapi.ts` or `apps/cms/scripts`): upsert every bundled key for both locales through Strapi's REST API with an admin-created API token, or through `strapi.documents` in a Strapi script context. Idempotent. Replace the Phase 1 placeholder in the root `setup:local`.

## Done when

- `pnpm --filter @zikaron/i18n test` passes; `check-messages` passes.
- `pnpm --filter @zikaron/cms dev` starts on :1337; `pnpm cms:seed` runs twice without duplicates; `curl 'localhost:1337/api/messages?locale=en&pagination[pageSize]=5'` returns English entries without auth.
- `pnpm --filter @zikaron/ui typecheck` passes.

## Decisions

## Handover
