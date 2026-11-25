# Authentication & Accounts — Tech Plan

> Epic: epic.md · Product: ../../mission.md

## Approach

Add an `auth` module and a `users` module in `apps/api`. It issues JWT access/refresh pairs with role-based
refresh lifetimes and stores refresh-token families so rotation and revocation work. It verifies Django
`pbkdf2_sha256` hashes, transparently rehashing to the new algorithm on success. Google sign-in uses
**server-side ID-token verification**, linked to existing users by the migrated `UserSocialAuth` UID or by email.
SMS passcodes go through Twilio and are hashed, short-lived, single-use and rate-limited. Password reset uses
single-use tokens with a 24h expiry.

A global **authorization guard** reads a declarative role matrix ported from `IsUserAccessAllows`,
denying by default. A **scoping service** ports `query_by_user_role`
(all / Israel / non-Israel / communities / self), and every list/detail repository calls it.

On the web side, `apps/web` gets the login, register, SMS, code-verification, forgot-password and
policy-terms screens in the prototype's visual language (`packages/ui`), with one API client that handles refresh
(TanStack Query plus an interceptor). Tokens are kept in httpOnly cookies set by the API or a Next.js route
handler (decision in the first spec). `apps/admin` reuses the same client and session code from a shared package.

## Architecture Impact

- **API:** new `auth`, `users`, `authorization` modules. Endpoints keep the legacy shapes
  (`/api/auth/login/`, `/api/auth/token/refresh/`, `/api/auth/registration/`, `/api/password_reset/*`,
  `/api/sms_authentication/*`, `/api/user_data/*`) so the parity harness can compare them. `/api/auth/convert-token`
  is replaced by a Google endpoint that takes the ID token and needs no client secret. Role conversion becomes `POST`.
  The allauth/oauth-toolkit/social endpoint surface (`/api/accounts/*`, `/api/auth/revoke-token`, …) is not
  ported (waiver, unused by both frontends).
- **Schema:**
  - `users`: email unique, case-insensitive; the legacy hash is kept as-is; role; flags `confirm_policy`,
    `should_ask_to_convert`, `igul_le_tova`; phone
  - `user_communities`
  - `social_accounts` (provider, uid)
  - `refresh_tokens` (family, expiry, revoked)
  - `password_reset_tokens`
  - `sms_passcodes` (hash, expiry, used_at, attempts)
  - `email_status` (created with the user)

  Migrated by `platform-rewrite/schema-and-data-migration`.
- **Domain events:** `UserRegistered` (consumers create `EmailStatus` and `Guest`), `PasswordResetRequested` (consumed by
  `notifications-and-reminders` for the email), `UserRoleConverted`.
- **Web:** routes `/`, `/register`, `/register/guest`, `/register/createsalon/host`, `/getcodeviasms`,
  `/codeverification`, `/forgotpassword/restoremethod`, `/forgotpassword/:token`, policy-terms pages, and the
  role-conversion modal. Middleware-based route guards replace the unguarded `/site/*`.
- **Infra:** Twilio and Google OAuth credentials in Secrets Manager; the JWT signing key per environment.

## Risks & Unknowns

- **Django hash compatibility.** It must handle `pbkdf2_sha256` with legacy iteration counts, and possibly older
  hashers (`pbkdf2_sha1`, `unusable` `!` prefix). Spike on hash fixtures taken from a sanitized snapshot.
- **Google account linking.** Legacy uses an implicit-flow access token converted by drf-social-oauth2. The new flow verifies an
  ID token, and existing `UserSocialAuth.uid` values must still match (Google `sub`). Verify on real data before cut-over.
- **Cookie vs header tokens.** Cookies for two Next.js apps on different subdomains, plus the API's CORS and
  CSRF setup. Settle this in the first spec.
- **Phone lookup.** Legacy finds the *first* user by phone, so duplicates are possible. Define the behavior
  for duplicates (parity: first match) and document it.
- **Dependencies:**
  - needs `platform-rewrite/monorepo-foundation`, `schema-and-data-migration` and `parity-test-harness`
  - `notifications-and-reminders` owns the reset email template
  - `admin/admin-auth-and-shell` consumes this API
  - `salon-hosting` and `salon-discovery-and-guest-registration` take over after login (onboarding)
- **Open product decision on guest accounts** (prototype #6). It could remove or reshape the guest half of this epic.
  Resolve it before shaping `registration-and-role-conversion`.

## Candidate Specs

- `email-login-and-sessions`:
  - email/password login with Django-hash verification and rehash
  - JWT access and rotating refresh with role-based lifetimes
  - logout, login routing by role and status
  - the public login screen
- `authorization-and-scoping`: a deny-by-default role-matrix guard and role/community scoping service, with a
  role × resource test suite that the other epics reuse.
- `registration-and-role-conversion`:
  - host/guest registration with terms
  - duplicate-email errors
  - account-creation side effects
  - the yearly convert prompt via POST endpoints
  - `user_data` profile, `igul_le_tova` flags
  - the privacy-policy acceptance endpoint
- `google-sign-in`: server-side Google ID-token sign-in and registration, linking by migrated UID or email, and the
  `social_account_only` path.
- `sms-login-and-password-reset`:
  - SMS passcode login (TTL, single-use, rate limits)
  - email reset (social-aware, 24h token)
  - SMS change-password, and the forgot-password screens
