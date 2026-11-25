# Roadmap — Platform

> Product: [mission.md](mission.md)
> Drafted: 2026-11-18 from the epic tech plans. Scope decision: **parity + prototype UX**.
> Dates: TBD. The cut-over season is not decided (see [customer/overview.md](../../customer/overview.md#key-dates)).

## Core Features (current state)

The legacy system (`zikaron-basalon-be` + `zikaron-basalon-fe`) is live and is the behavioral reference:

- Accounts: email/password, Google sign-in, SMS passcode login, password reset, host↔guest conversion.
- Hosting: host onboarding (private and 17 org types), the 5-step salon wizard, salon edit and delete with witness locks, and the host salon page.
- Discovery and registration: map and list of salons (Israel-only), salon drawer, 1–3 seat registration, and "my salon" (cancel or change seats).
- Site shell: Hebrew/English, RTL, accessibility widget, GTM, and the yearly **orthodox build**.
- Notifications: the email (SQS → Lambda → SendGrid), WhatsApp (TexterChat) and SMS (Twilio) matrix, and the EventBridge reminder batch.
- Back office in Django admin: staff users, communities, reference data, templates, season resets, the Easy feed, and the Google-Sheet webhook.
- Witness self-registration: **broken** (it overwrites witness id 4).

Full behavior: [legacy-baseline/](legacy-baseline/).

## Phase 1: MVP — parity rewrite and cut-over

Every legacy behavior is reproduced with a test or waived in its spec, built with the [prototype's UX](../../ecosystem/design-reference.md).
Specs are ordered in waves by dependency. Slugs are candidate specs from each epic's tech plan, to be shaped with `/shape-spec`.

**Wave 0 — foundation** (blocks everything, including [admin](../admin/roadmap.md))
- [platform-rewrite](epics/platform-rewrite/epic.md): `monorepo-foundation`, `schema-and-data-migration`, `parity-test-harness`, `aws-infra-and-deploy`
- [authentication-and-accounts](epics/authentication-and-accounts/epic.md): `email-login-and-sessions`, `authorization-and-scoping`
- [notifications-and-reminders](epics/notifications-and-reminders/epic.md): `messaging-core`
- [site-shell-content-and-i18n](epics/site-shell-content-and-i18n/epic.md): `public-layout`, `i18n-he-en`

**Wave 1 — the season flow** (host opens a salon → guests find it and register)
- [back-office-operations](epics/back-office-operations/epic.md): `reference-data-admin` (salon days, trainings, cities and org types feed hosting)
- [salon-hosting](epics/salon-hosting/epic.md): `host-onboarding`, `salon-create-wizard`, `salon-edit-and-delete`, `host-salon-dashboard`
- [salon-discovery-and-guest-registration](epics/salon-discovery-and-guest-registration/epic.md): `salon-search`, `salon-page`, `guest-registration`, `guest-my-salon`
- authentication-and-accounts: `registration-and-role-conversion`, `google-sign-in`, `sms-login-and-password-reset`
- notifications-and-reminders: `notification-matrix` (each functional spec emits its domain events)

**Wave 2 — operations, content and edge cases**
- notifications-and-reminders: `reminder-batch`, `season-reminder-controls`, `email-link-compat`
- back-office-operations: `staff-users-and-communities`, `content-and-email-templates`, `season-operations`, `partner-integrations`
- site-shell-content-and-i18n: `accessibility-and-legal-pages`, `analytics-events`, `orthodox-mode`
- [witness-self-registration](epics/witness-self-registration/epic.md): `witness-interest-form`, `witness-availability-step`, `witness-lead-review`, **or** `retire-witness-self-registration`. Decision pending.

**Cut-over** (after admin Phase 1 is done too)
- platform-rewrite: `cutover-and-rollback`. Rehearsed on staging, outside the pre-Yom-HaShoah window.

### Decisions blocking Phase 1

Details are in each epic's product brief under "Decisions to confirm".

1. **Guest registration without an account** (prototype) or with one (legacy). This reshapes `authentication-and-accounts` and `guest-registration`.
2. **Witness self-registration:** rebuild or drop.
3. **Datetimes:** timezone-aware, or keep naive `Asia/Jerusalem`. Also whether legacy logins stay valid after cut-over.
4. **Map provider** (Google or Leaflet with a non-public tile server) and how distance is measured.
5. **Orthodox mode:** separate deploy (as in legacy) or a runtime flag.
6. **Disabled notifications** and the unseeded templates: port them switched off, or drop them.
7. Stack details still TBD: ORM, monorepo tooling, i18n library, hosting for the Next.js apps. Also confirm what is actually deployed on AWS today.

## Phase 2: Post-Launch

To be determined with the customer. Candidates raised during planning, which are not commitments:

- Any prototype deviation that Phase 1 specs defer instead of adopting.
- Retire the legacy email-link redirects once old messages have expired.
- Cookie consent for GA/GTM, if it isn't required for Phase 1.
- Replace the SQS → Lambda email hop with an API worker, if Phase 1 keeps the hop.
- Easy feed changes (reliable guest counts, no host email), which need the partner's agreement.
