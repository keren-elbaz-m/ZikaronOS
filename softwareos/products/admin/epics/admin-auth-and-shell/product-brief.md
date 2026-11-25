# Admin Auth & Shell — Product Brief

> Epic: epic.md · Product: ../../mission.md

## Goals

Staff need a safe way into the back office, and a frame that shows each of the six admin roles
only what that role may do. In legacy the gate is weak. Access is checked only in the sidebar, so any
admin can open any `/admin/*` URL. The mobile menu ignores roles. Logout leaves the tokens in the
browser. Some requests skip token refresh.

This epic rebuilds login, password reset, the first-login privacy-policy gate and the session in
`apps/admin`. It also rebuilds the header, sidebar and he/en RTL switch. It keeps the legacy behavior
staff rely on, adds real route-level authorization, and adopts the prototype's shell: a side menu
with live work counts and a ⌘K / Ctrl+K quick search. Every other admin epic builds on it.

## User Stories

- As a staff member, I log in with my email and password and land on the dashboard, so I can start work.
- As a first-time staff user, I must accept the privacy policy before I see any data, so the organization stays compliant.
- As a staff member who forgot my password, I reset it by email and set a new one, so I don't need a super admin to help.
- As a host, guest or witness who tries to log in here, I am told this system is for staff only, so I go to the public site instead.
- As an admin of any role, I see only the menu items, columns and actions my role allows, on desktop and mobile alike.
- As an admin of any role, opening a page my role may not use (by URL or link) shows a "no access" state, and the API refuses its data.
- As a staff member, my session stays alive while I work and ends fully when I log out, with no tokens left in the browser.
- As a staff member, I switch between Hebrew and English and the layout direction follows, so English-speaking (global) staff can work.
- As a staff member, I press ⌘K / Ctrl+K and jump to any salon, host, witness or guest within my scope, so I don't have to dig through lists.
- As a staff member, the side menu shows live counts of what needs attention (salons waiting for a witness, witnesses to call), so I know where to go.

## Success Criteria

1. Login with a valid admin role (super, general, global, volunteer, host or testimonials admin) succeeds. A wrong password shows the "email or password incorrect" message. A non-admin role is refused with the "not an admin" message. Each case has an e2e test.
2. A user with `confirm_policy=false` is redirected to the policy page, cannot reach any `/admin/*` route until they accept, and accepting persists `confirm_policy=true`.
3. Password reset works by email end to end. Request: an unknown email gets the "user does not exist" message. Confirm: password and confirmation must match, and a minimum of 6 characters is enforced server-side. Expired or invalid tokens show an error.
4. A route × role matrix test covers every admin route for all six roles plus an unauthenticated user. The menu, the page guard and the API all agree. No route is reachable by URL alone. Both `testimonial admin` and `testimonials admin` are handled consistently (one canonical value).
5. Logout clears every token and cached user datum. A reload after logout lands on login.
6. An expired access token is refreshed transparently on every request path. A failed refresh logs the user out. Refresh lifetimes match legacy (admin 365 days, access 1 hour) unless a waiver in the spec says otherwise.
7. The he/en toggle switches language and direction on every admin page. Every visible string comes from translations, with no missing keys in either language (checked by a test).
8. ⌘K / Ctrl+K search returns only records inside the user's role and community scope (API-enforced, tested), and is fully keyboard operable.
9. Menu counts match the corresponding list totals for the same user scope.
10. A security review has passed for the auth flows, the token storage choice and the authorization matrix.

## Out of Scope

- Public-site login, registration, Google sign-in and SMS login (owned by `platform/authentication-and-accounts`). SMS login and the leftover host↔guest role-change modal are dead code in the admin and are not rebuilt.
- Managing users, roles and communities (lives in Django admin today; owned by `platform/back-office-operations`).
- The legacy sidebar placeholders (communities, volunteers, contacts, set dates) that all link to `/admin`. Their real screens belong to `platform/back-office-operations`.
- Audit logging of staff actions: TBD (none in legacy).

## Parity & Deviations

**Preserve (legacy baseline):**
- Email + password login (`POST /api/auth/login/`). Only the six admin roles may enter.
- First-login policy gate: `PATCH /api/user_data/{id}/ {confirm_policy:true}`, with a logout button on the policy page.
- Forgot password by email (`/api/password_reset/` + confirm). Phone reset is not offered in admin (commented out in legacy).
- Role → menu matrix as in [shell-lists-and-profiles.md](../../legacy-baseline/shell-lists-and-profiles.md) §Access. Per-screen gates: community filter and role columns for super/general(/global); bulk actions for super/global; witness server export/import for super admin only.
- Header: greeting, logout, he/en toggle. Hebrew is the default language.
- Init data: cities, communities (id 1 shown as "ללא קהילה"), languages.

**Adopted deviations (recorded as parity waivers):**
- Real route-level and API-level authorization instead of sidebar-only gating (join-report Uncertainties #5, "sidebar-only admin gating"; admin architecture Gotcha 1).
- The mobile menu filters by role (legacy G5 bug).
- Logout clears the tokens (legacy G3 bug). Every request goes through refresh handling (legacy G2 bug).
- One canonical testimonials-admin role string (legacy G4 bug).
- Cities, communities and languages are no longer cached in `localStorage` forever (legacy G11 bug).
- Prototype shell: side menu with live counts, and the ⌘K quick search (new capability; design-reference "Route → epic map").

**Decisions to confirm:**
- Should "Remember me" do anything? In legacy it only sets a flag.
- Token storage: httpOnly cookies (the legacy API already sets `auth-cookie`/`refresh-cookie`) or memory + refresh cookie. This needs security review sign-off.
- Should the admin refresh lifetime stay at 365 days? It is long for staff accounts. Legacy also has a bug: dj-rest-auth's rotating refresh falls back to 30 days.
- Which entities ⌘K covers for host admin and testimonials admin, whose scope is narrower.
- Language toggle: keep he/en, with English needed by global admin. The prototype is Hebrew-only.
