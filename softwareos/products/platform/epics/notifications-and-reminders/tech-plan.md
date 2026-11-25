# Notifications & Reminders — Tech Plan

> Epic: epic.md · Product: ../../mission.md

## Approach

Build a `notifications` module in `apps/api` (NestJS) that owns delivery and nothing else.
Domain services in other epics (hosting, guest registration, teaming, accounts) emit typed
domain events after their transaction commits, such as `SalonCreated`, `WitnessAssigned`,
`WitnessUnassigned`, `GuestRegistered`, `GuestStatusChanged`, `GuestSeatsChanged`,
`GuestRemoved`, `SalonTimeChanged` and `PasswordResetRequested`. The module maps each event
to recipients and messages through one declarative **notification matrix**: event →
recipient → email `event_code` → WhatsApp template + variables. That matrix is the single
reference both the code and the contract tests are built from.

Emails render the DB template (`{{var}}` placeholders, he/en) inside the base layout and go
on a queue. WhatsApp (TexterChat) and SMS (Twilio) sit behind channel adapters with the
same `send(message)` interface, so tests can swap in fakes.

The reminder batch becomes a `RemindersService.run({ dryRun })`. It runs the 7 legacy
queries in order against a shared budget of 50, flips the one-time flags in the same
transaction as recording the send, and is triggered by the existing EventBridge Scheduler
calling a key-protected endpoint. Every send attempt writes to a `notification_log` row:
event, recipient, channel, code, status sent/skipped/failed, and the reason.

## Architecture Impact

- **New API module** `apps/api/src/notifications/`:
  - the matrix
  - the template renderer
  - channel adapters: SES-or-SQS/SendGrid email, TexterChat, Twilio
  - `RemindersService`
  - a `POST /api/eventbridge_tasks/eventbridge_send_reminders/` endpoint. It keeps the legacy path and the `X-API-Key` check so the existing schedule keeps working at cut-over.
- **Shared package** `packages/contracts`: domain event types, and the event-code and WhatsApp template enums. The other epics import these to emit events.
- **Schema:**
  - `email_message_templates` (event_code, language, subject, content, is_active; unique on code+language)
  - `email_status` (the 5 flags, one-to-one with the user)
  - the per-row flags `guest_salon.host_received_approve_request_email` and `guest.received_register_reminder_email`
  - new: `notification_log`
  - all migrated from the Django tables by [platform-rewrite](../platform-rewrite/epic.md)
- **Delivery:**
  - Keep AWS SQS → Lambda → SendGrid, so the queue gives retry and isolation. Rewrite the Lambda in TypeScript in `apps/` or `packages/`, fixing its secret-loading bug.
  - Or send from an API-side worker queue instead. Choose in spec 1. Both keep SendGrid as the provider.
- **Time handling:** the data is naive `Asia/Jerusalem` time. Every reminder window must be computed in that zone. One shared time helper (owned with platform-rewrite) must not depend on the server's timezone (Gotcha 2).
- **Links:** one URL builder per app (`apps/web`, `apps/admin`) used by every template variable, so route changes stay in one place.
- **Config flags:** `WHATSAPP_ENABLED`, `DRY_RUN`, and a per-event-code enabled switch to hold the disabled legacy notifications.

## Risks & Unknowns

- **Hidden triggers.** Legacy sends from signals on saves made anywhere: admin edits, imports, bulk updates. Every write path in the other epics must emit the right event. A spec-level checklist is needed, plus contract tests on the owning services, not only on this module.
- **The duplicate-send window at cut-over.** If the Django reminders and the new ones overlap, or the flags migrate late, users get double reminders. The EventBridge target must switch atomically with the data migration, and the flags migrate verbatim.
- **Template and copy gaps:** `hosts_2d` and `hosts_2e` have no rows, and the "Mails index" Google Sheet is the only email catalogue (external, TBD access). Templates must be exported from production before migration.
- **Cross-epic dependencies:**
  - Every functional epic must emit domain events: salon-hosting, salon-discovery-and-guest-registration, authentication-and-accounts, admin/salon-teaming, admin/hosts-and-salons-management, admin/guests-management.
  - [platform-rewrite](../platform-rewrite/epic.md) provides the monorepo, data migration, time helper and infra.
  - [back-office-operations](../back-office-operations/epic.md) provides the template editor and the season-reset UI.
- **TexterChat:** the template names are hard-coded and approved in the WhatsApp Business account. Renaming them means re-approval, so they stay verbatim. Rate limits and errors are unknown (TBD).
- **No legacy tests.** The matrix tests are built from code reading, so a staging run against real providers is needed before cut-over.
- **Spike needed:** confirm the deployed Lambda code and the EventBridge schedule from the live AWS account, since the repo copies look stale.

## Candidate Specs

- `messaging-core` — Template renderer (DB templates, he/en, base layout, sender name), email delivery pipeline, TexterChat and Twilio adapters, `notification_log`, missing-template alerting.
- `notification-matrix` — Typed domain events plus the declarative event → message matrix for every legacy trigger, with a contract test per row; the other epics' services emit the events.
- `reminder-batch` — `RemindersService` with the 7 ordered reminders, a shared budget of 50, one-time flags, flag-reset rules, `DRY_RUN`, and the key-protected EventBridge endpoint on the legacy path.
- `season-reminder-controls` — An API to set or clear all reminder flags for the end and start of a season, and per-event-code enable switches (holding the disabled legacy notifications); the UI lives in back-office-operations.
- `email-link-compat` — URL builders for the new routes and redirects from the legacy email link shapes (`/site/host/:id/salon`, `/site/guest/:id/salon`, `/forgotPassword/:token`).
