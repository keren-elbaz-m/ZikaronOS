# Authentication & Accounts — Product Brief

> Epic: epic.md · Product: ../../mission.md

## Goals

Every other flow starts with an account. Hosts open salons and guests register under their
account, staff log into the admin, and the API scopes every request by role and community. The rewrite must
let **every existing user keep logging in the same ways they do today**:
- email and password
- Google
- SMS passcode
- password reset by email

It must also keep registration as host or guest, the yearly role-conversion prompt, and the
privacy-policy gate. And it must close the legacy security gaps instead of copying them.

This epic owns the API's identity layer, used by both `apps/web` and `apps/admin`:
- users, roles, tokens
- the authorization guard and role/community scoping
- the public site's login, register, SMS and forgot-password screens

The admin's login UI and shell are owned by `admin/admin-auth-and-shell` and use the same API.

## User Stories

- As a returning host or guest, I log in with my existing email and password (no reset needed after
  cut-over), and I land on my salon page, or on onboarding if I never finished it.
- As a Google user, I sign in with Google. If my account was created with Google only and I try a password,
  I'm told to use Google or set a password through "forgot password".
- As a user without email access, I log in with a passcode sent by SMS to my phone.
- As a user who forgot my password, I get a reset link by email, set a new password, and log in.
- As a new visitor, I register as a host or as a guest. I accept the terms, and a duplicate email (including one
  that belongs to a Google account) gives me a clear message instead of a second account.
- As last season's guest (or host), at my first login of the new season I'm asked whether to stay a
  guest or become a host this year, and my choice converts my profile.
- As a staff member, at my first login I must accept the privacy policy before entering the admin, and my
  session lasts long enough for a working season (legacy: 365-day refresh for admins).
- As any user, I see and can change only what my role and community allow, enforced by the API
  and not just by hidden menus.

## Success Criteria

- Each login method (email/password, Google, SMS passcode) and each reset path (email, SMS change-password)
  has automated tests that cover the legacy-baseline responses: success, `social_account_only`, wrong
  credentials, unknown phone, invalid or expired code, `email_already_registered`, `google_account_exists`.
- A migrated user with a Django PBKDF2 hash logs in successfully, and the hash is upgraded on first login (test
  using real hash fixtures).
- Token lifetimes: access 1h; refresh 30d rotating for public roles and 365d for admin roles (or the confirmed
  decision below). Refresh rotation and expiry are covered by tests.
- Login routing matches the baseline: host without a profile → host onboarding; host → salon page; guest status 2 →
  guest salon page, else onboarding; admin role on the public site → `login.notAdminSystem`; a pending
  salon selection is registered after login.
- Role conversion (host↔guest) runs through POST endpoints with tests for the profile changes
  (create, delete or transfer) and the `should_ask_to_convert` / `igul_le_tova` flags.
- The authorization guard implements the role matrix and community scoping from
  `api-permissions-and-notifications.md`, with a test per role × resource. Unknown resources are **denied** by default.
- No OAuth client secret in any browser bundle. SMS passcodes expire, are single-use, and are rate-limited.
  Security review signed off (production mode).
- QA passes on the web login, register, SMS and forgot-password screens in Hebrew and English, and in the orthodox build.

## Out of Scope

- The admin login screen, admin shell and the admin's first-login policy screen UI (owned by
  `admin/admin-auth-and-shell`). This epic supplies the API and the policy-acceptance endpoint.
- Host onboarding (profile, org fields) and guest onboarding (city, address) forms. They are owned by
  `salon-hosting` and `salon-discovery-and-guest-registration`. This epic ends once the account exists with its role.
- Witness login and self-registration (`witness-self-registration`).
- Facebook login (dead code in legacy: dropped, recorded waiver).
- Managing roles and communities for staff users (`back-office-operations`).
- Email templates and the delivery pipeline (`notifications-and-reminders`). This epic only triggers the reset email.

## Parity & Deviations

**Must preserve** (`legacy-baseline/auth-and-registration.md`, `api-permissions-and-notifications.md`,
`backend-discovery.md` §5.2, §6.1)
- Login by email (case-insensitive, lowercased on register) and password. The response carries access and refresh.
  Password-login for a Google-only account → `social_account_only`.
- Registration body: email, password, confirmation, role ∈ {host, guest}. Duplicate email → `email_already_registered` or
  `google_account_exists`. Minimum password length 6. No email verification.
- Account creation side effects: an `EmailStatus` row; a `Guest(registration_status=1)` for guests;
  `should_ask_to_convert=false`, `igul_le_tova=true`.
- Password reset by email: reuses an existing token, link `{DOMAIN}/forgotPassword/{token}`, 24h expiry, works for
  Google-only users (it sets their first password), deletes all of the user's tokens on confirm.
- SMS: look up the user by phone, send a 4-digit code with the Twilio message text, verify phone and code → tokens;
  logged-in SMS change-password.
- The profile endpoint (`user_data`) with its fields; the `convert_user_selected`, `igul_le_tova` and
  `mark_igul_le_tova` endpoints.
- Roles: the 6 admin roles plus host, guest, witness. Scoping: super admin sees everything, general admin sees Israel, global admin
  sees non-Israel, volunteer/host/testimonials admins see their communities, a host sees only their own data.
- Orthodox build: guest registration routes redirect to `/`, and "register as visitor" is hidden.
- Guest-to-host onboarding conversion and host-to-guest conversion keep their data effects.

**Adopted deviations (fix, don't replicate — `join-report.md` uncertainty 5)**
- Google sign-in verifies the Google credential **server-side**; the DRF client secret is no longer shipped to the browser.
- SMS passcodes get a TTL and are single-use, with send and verify rate limits (legacy: no expiry, never consumed, no resend cooldown).
- Role conversion moves from state-changing `GET` to `POST`.
- Authorization denies by default. Witness comments and duplicate validation are no longer open to any user;
  the owning epics apply the guard. `/api/host_salons/` is scoped to the owner.
- The reset-password flow after SMS (`/forgotpassword/:uuid` literal push bug) works correctly.
- Admin refresh lifetime is applied consistently on every refresh path. Legacy loses the 365d lifetime
  on `/api/auth/token/refresh/` (`backend-discovery.md` gotcha 21); see the decision below.
- One HTTP client with refresh handling everywhere (legacy has two paths, and only one of them refreshes).
- The role name mismatch (`testimonials admin` vs `testimonial admin`) is normalized to the backend value.

**Decisions to confirm**
- Guest accounts: the prototype registers guests with **no account and no password**
  (`design-reference.md` #6). Adopting that changes this epic: guest login, guest registration, and
  the guest role conversion all change. Keep accounts for Phase 1 (recommended for parity), or adopt the prototype?
- Admin refresh lifetime: is it 365d (intended) or 30d (what actually happens today)?
- Do sessions survive cut-over (accept legacy-signed JWTs for one refresh cycle), or does everyone log in again?
- Password policy: keep a minimum of 6 characters (parity), or strengthen it? A stronger policy only applies to new or changed passwords.
- SMS phone matching under the strict `libphonenumber-js/max` rule (`design-reference.md` #2): existing phones that fail
  strict validation must still be able to log in.
- Visitor-country detection (ipapi.co) is used only in the salon form. Keep it here or move it to `salon-hosting`?
