# Site Shell, Content & i18n — Tech Plan

> Epic: epic.md · Product: ../../mission.md

## Approach

Build the `apps/web` root layout in the Next.js App Router: header, footer, an error boundary (`error.tsx`) and
`not-found.tsx`, with `dir`/`lang` set from the active locale. The i18n library is still TBD (e.g. next-intl).

Port the legacy `public/locales/{he,en}/translation.json` key structure so flows can be migrated screen by screen.
The orthodox overrides are layered over `he` at load time. Put the translations, the orthodox config helper and the
analytics helper in shared packages (`packages/i18n`, `packages/config` or similar), so `apps/admin` can reuse what it needs.

A single `isOrthodox()` reads deploy config. Every epic that changes behavior in orthodox mode calls it.

Analytics is a thin typed wrapper over `dataLayer.push`, with the four legacy events as a closed union type.
GTM/GA4 and the nagich widget load through `next/script`, with ids from env.

## Architecture Impact

- **Web:**
  - Root layout, header (role-aware nav from the auth session), footer, and the `/accessibility`, terms (He/En) and privacy pages.
  - Error and 404 pages.
  - Locale switch persisted in a cookie, so the server renders the correct `dir`. Legacy used `localStorage`, which only
    works client-side.
- **Packages:** translation catalogs and types (missing-key checks in CI), the orthodox config and theme tokens (the
  Tailwind theme switches primary pink ↔ orange), and analytics event types.
- **Assets:** logos, orthodox logo and favicons, sponsor logos.
- **API:** none. No backend orthodox logic.
- **Infra:** if orthodox stays a separate deploy, the CI/CD in `platform-rewrite` needs a second web target with its own env.

## Risks & Unknowns

- **Picking the i18n library and routing.** Locale in the URL (`/en/...`) vs cookie-only changes every link and SEO. Decide
  this in the first spec. Legacy has no locale in its URLs.
- **Key migration.** The legacy catalog has ~1,060 leaves in one namespace. Porting it wholesale brings over dead keys,
  and porting per screen risks gaps. Plan: import everything, then flag keys that are never used in CI.
- **Orthodox delivery model** (build-time vs runtime) is still undecided (product brief decision 2), and it affects caching and hosting.
- **Third-party scripts** (nagich, GTM) and CSP: the nagich script uses SRI. A Content-Security-Policy has to allow these explicitly.
- **Dependencies:**
  - `platform-rewrite`: monorepo, CI and hosting.
  - `authentication-and-accounts`: the session is needed for the role-aware header and the error-page "home".
  - Every public epic uses the layout, i18n, orthodox helper and analytics helper, so this epic should land early.

## Candidate Specs

- `public-layout` — root layout, role-aware header, footer with links and sponsor logos, error-boundary and 404 pages, and SEO
  metadata and manifest.
- `i18n-he-en` — he/en catalogs ported from legacy, RTL/LTR switching, persisted choice, missing-key CI check, and the
  ~22 missing English keys filled in.
- `accessibility-and-legal-pages` — the `/accessibility` statement (with the mailto fix), the nagich widget, terms (He/En) and the privacy page.
- `analytics-events` — GTM/GA4 loading and the typed `dataLayer` helper with the four legacy events at parity.
- `orthodox-mode` — the deploy-level switch: theme tokens, branding assets and title, the translation overrides, hidden toggle,
  guest-route redirects, and a documented helper for the other epics.
