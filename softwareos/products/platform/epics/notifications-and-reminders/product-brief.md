# Notifications & Reminders — Product Brief

> Epic: epic.md · Product: ../../mission.md

## Goals

Every host, guest and staff member learns about the events that matter to them: a salon is
created, a guest registers or is cancelled, a witness is assigned or removed, the salon time
changes, or an event is coming up. Messages go by email and WhatsApp, in Hebrew or English,
exactly as they do today. In legacy this logic hides in Django signals and has no tests. A
missing template silently drops the email, and nobody can see what was sent.

The goals:
- Reproduce the legacy notification matrix and the 7-step reminder batch message for message,
  in the same order and with the same one-time flags. Hosts and guests must notice no change
  at cut-over except the link targets.
- Make every send explicit, testable and observable. Each send traces to a domain event, is
  logged with its outcome, and alerts when a template is missing rather than skipping quietly.
- Keep the editable DB templates (event code × he/en) so staff can keep changing the copy
  without a deploy.

## User Stories

- As a **host**, when I create a salon I get the `hosts_1` email and WhatsApp for my variant (training yes/no × digital yes/no), so I know my salon is live and when my training is.
- As a **host**, when staff assign or remove my witness I get the message for that witness type (`hosts_2a/2b/2c/2d/2e`) or `cancel_witness`, so I can contact them or plan around the change.
- As a **host**, I'm told when a guest joins, changes their seat count (`hosts_5`) or cancels a future event (`hosts_4`), so my guest list stays accurate.
- As a **guest**, I get confirmation when I register (`guests_1`), when I'm approved, cancelled or denied (`guests_2/3/4`), and when the salon time changes (`guests_8`), so I always know whether and when I'm going.
- As a **host who hasn't contacted the assigned witness after 2 days**, I get a nudge (`hosts_7`) by email and WhatsApp.
- As a **host who signed up but never finished**, or a guest who registered but never joined a salon, I get one reminder (`hosts_6b`, `guests_9`).
- As a **host with an event within 5 days**, I get one reminder (`hosts_10`).
- As a **super admin**, I can stop all reminders at the end of a season (the "email statuses" reset) and turn them back on for the next season.
- As a **developer or on-call engineer**, I can see for any user which messages were sent, skipped or failed, and why.

## Success Criteria

- A contract test exists for every row of the legacy notification matrix
  ([backend-discovery.md §6.7](../../legacy-baseline/backend-discovery.md)). For each, it asserts the
  recipient, channel, event code or WhatsApp template, variables and language selection.
- For a seeded dataset, the reminder batch selects the same recipients as the legacy queries
  (§6.8), in the same order, within the shared budget of 50. It flips the same flags, and a second
  run sends nothing.
- Each flag-reset rule (new salon, training change, assignment created or removed, guest salon
  created or deleted) has a test proving it re-arms only its own reminder.
- A missing or inactive template produces a logged, alerting failure, not a silent skip, and the
  domain operation that triggered it still succeeds.
- Email links resolve to the new apps' routes. Legacy link shapes (`/site/host/{id}/salon`,
  `/site/guest/{id}/salon`, `/forgotPassword/{token}`) either redirect, or are waived in a recorded decision.
- No secret (SendGrid, TexterChat, Twilio, EventBridge API key) is in source or the client. The
  reminder endpoint rejects calls without a valid key.
- The production mode gates pass: unit and contract tests, a security review, and QA sign-off on real
  inboxes and WhatsApp numbers in a staging environment.

## Parity & Deviations

**Preserve** (from [api-permissions-and-notifications.md](../../legacy-baseline/api-permissions-and-notifications.md) and backend-discovery §6.7–§6.8):
- Template lookup by `event_code` + language: `he` when `primary_language` is Hebrew, otherwise `en`. The body is wrapped in the base email layout and sent from `זיכרון בסלון` or `Zikaron Basalon <info@zikaronbasalon.com>`.
- WhatsApp is sent only when enabled and the host or guest profile has a phone, normalized to `972…`. The TexterChat template names and variables stay as they are, including the odd `…new` and `…neww` names and the shared `hosts_1` template.
- The full trigger matrix: `hosts_1` variants (none when the salon has no training), `hosts_2a–2e` by witness type, `cancel_witness`, `guests_1/2/3/4`, `hosts_4`, `hosts_5`, `guests_8` and the password-reset email. Witnesses are never notified.
- The reminder batch: types in order `hosts_7 → guests_6 → hosts_9 → hosts_6b → hosts_10 → hosts_3 → guests_9`, a shared budget of 50, one-time flags ("true = already sent"), `DRY_RUN`, and the eligibility windows (2 days, 1 day, 5 days, this calendar year).
- The flag-reset rules, and the end-of-season "set all flags true" switch.

**Adopted deviations** (recorded parity waivers):
- `guests_8` passes a User id where every other guest link passes a Guest id ([backend-discovery](../../legacy-baseline/backend-discovery.md) Gotcha 19). Fix it so the link opens the guest's salon.
- `volunteer_1` passes a User object instead of an email (Gotcha 16, [api-permissions-and-notifications.md](../../legacy-baseline/api-permissions-and-notifications.md)). Fix it if the notification is enabled.
- A missing template alerts rather than skipping silently (Gotcha 17).
- The password-reset email moves from a file template to a DB template (`reset_password` × he/en) so staff can edit it.
- Signals become explicit domain events raised by the owning services, so the triggers become visible and testable ([architecture.md](../../architecture.md) Gotcha 1).
- The email Lambda's `get_secret` signature bug is not carried over ([dependencies.md](../../dependencies.md)).

**Decisions to confirm:**
1. Disabled notifications (`guests_6`, `hosts_9`, `guests_7`, `volunteer_1`): port them as disabled, or drop them? This is join-report Uncertainty #6. Recommendation: port the flags, but keep sends off behind config.
2. The `hosts_2d` and `hosts_2e` templates were never seeded, so they send nothing today. Seed them with new copy (the customer writes it), or keep them empty?
3. Should legacy email links redirect to the new routes, or should all in-flight emails be considered expired at cut-over?
4. Reminder cadence: docs say 10 or 20 minutes, and the real EventBridge schedule lives only in AWS. Confirm it from the live AWS account.
5. Should the rewrite keep the SQS → Lambda → SendGrid hop, or send from the API worker? This doesn't change behavior, but see the Tech plan.

## Out of Scope

- The screen where staff edit email templates and press the season-reset button. That belongs to [back-office-operations](../back-office-operations/epic.md); this epic provides the API and the data.
- The SMS login and passcode flow itself, which belongs to [authentication-and-accounts](../authentication-and-accounts/epic.md). This epic provides only the Twilio transport.
- New notification types, new channels (push, in-app), and witness-facing notifications. These are Phase 2 candidates.
- Changing message copy: the existing DB templates migrate as they are.
