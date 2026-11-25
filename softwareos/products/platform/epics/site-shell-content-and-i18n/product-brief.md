# Site Shell, Content & i18n — Product Brief

> Epic: epic.md · Product: ../../mission.md

## Goals

The public site's frame carries everything around the flows:
- the header and footer, the sponsors' logos, and the legal and accessibility pages;
- Hebrew-first RTL with English;
- the analytics events the team reports on;
- once a year, the **orthodox build** ("זיכרון בבית") with its own branding and copy, and with guest flows switched off.

The prototype has none of this beyond an RTL layout, so the scope comes from the legacy baseline.

Goals:
- Rebuild the public layout, language switching, the legal/accessibility content, error pages and analytics events at
  **parity**, in the prototype's visual language.
- Make the orthodox variant a **single, documented switch**. Other epics read it instead of scattering checks.
- Fix the small legacy defects (the accessibility mail link has no `mailto:`, the privacy page is unreachable, ~22 English keys are missing).

## User Stories

- As a visitor, I see a header with the logo, contact link and language toggle. When I'm logged in, it greets me, gives me
  my role's navigation, and lets me log out.
- As a visitor, I can switch between Hebrew (RTL, default) and English (LTR). My choice is remembered.
- As a visitor, I can reach the contact page, the main site, the terms (He/En), the accessibility statement, and the movement's
  Facebook and Instagram from the footer. I can see the supporting organizations' logos.
- As a visitor with a disability, I can use the accessibility widget and read the accessibility statement, including a
  working email link to the accessibility coordinator.
- As a visitor who hits a broken link or an error, I see a friendly page that sends me home according to my role.
- As the movement's team, we get the same analytics events as today (want to host, want to be hosted, guest
  registration completed, salon created), so season reports stay comparable.
- As the movement's team, we can switch on the orthodox build for its season: "זיכרון בבית" branding, colors, logo,
  favicon and title, the Hebrew copy overrides, no language toggle, and no guest registration.

## Success Criteria

- Every page renders correctly in he (RTL) and en (LTR), and the language persists across visits (E2E).
- Translation parity: every key the legacy `he` and `en` files use exists in the new catalogs, and the missing
  English keys are filled in (or explicitly listed as Hebrew-only).
- The four legacy `dataLayer` events fire with the same names and categories at the same moments. This is verified by an E2E
  test that asserts on `window.dataLayer`.
- With the orthodox flag on, E2E confirms: guest registration routes redirect home, the language toggle is hidden, the logo is not a
  link, orthodox branding and copy are shown, and the host wizard runs its orthodox variant.
- The accessibility statement is reachable from every page, its email link works, and the widget loads with the same
  settings as legacy. An automated a11y check (axe) on the shell shows no critical issues.
- Error pages: unknown routes → 404, render errors → error boundary page, and "home" follows the role rules.

## Out of Scope

- The marketing site `zikaronbasalon.com` (not in scope for the customer).
- The admin app's shell (→ `admin/admin-auth-and-shell`).
- The content of the flows themselves (search, hosting, auth). Those epics own their screens and fire the analytics events
  through this epic's helper.
- The non-functional legacy `ContactForm` stub: dropped (never rendered).

## Parity & Deviations

**Preserve (legacy baseline):**
- Header: greeting, name and logout when logged in; otherwise the logo and "back to homepage". Contact link and language toggle. A mobile
  hamburger with logout.
- Footer: contact (he/en URLs), main site, terms modal (He/En), accessibility, Facebook group/page, Instagram,
  logos (Moveo, Claims Conference, EVZ, Ministry of Finance) and the sponsor line.
- i18n: `he` is the default and fallback, `en` the second language, chosen manually (no browser detection) and persisted. The orthodox Hebrew
  overrides are merged over `he`.
- `/accessibility` Hebrew statement and the nagich.co.il widget with the same configuration.
- Error page: error-boundary message vs "page not found". Home goes to the guest salon, host salon, `/admin` or `/` by role.
- Analytics: GA4/GTM; `App_Registration` (`Want_to_host` / `Want_to_be_hosted`), `Guest_Registration_completed`,
  `Registration_completed_Creating_living_room`.
- SEO basics: title "זיכרון בסלון" (orthodox: "זיכרון בבית"), the meta description and the manifest.
- Orthodox build: title, favicon, colors (orange `#ED764C` instead of pink), logo, a non-clickable header logo, hidden
  toggle, hidden "register as visitor", and guest routes redirected.

**Adopted deviations (recorded as decisions in the owning spec):**
- The accessibility email link gets a `mailto:` (legacy bug).
- The Google Maps key comes only from env. The hard-coded fallback keys are removed (join-report repo hygiene).
- The orthodox switch is one config value read through a single helper (the legacy intent of `featureFlags.ts`). The
  backend needs no orthodox logic. The `ORTHODOX_ORG_TYPES_ENABLED` named in the old AgentOS spec is not read anywhere in the backend code.

**Decisions to confirm:**
1. **Privacy policy page**: the public privacy modal has no trigger in legacy. Link it from the footer, or keep it for admins only?
2. **Orthodox delivery**: a separate deploy or build of the same app (as in legacy), or a runtime flag on one deploy? Is a separate domain needed?
3. **Typography and brand**: the prototype uses Rubik. Confirm it matches the brand, or name the font.
4. **Consent**: legacy loads GA4/GTM with no cookie consent. Keep that, or add consent? (Legal/product call; TBD.)
