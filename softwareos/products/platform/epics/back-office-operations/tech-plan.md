# Back-office Operations & Integrations — Tech Plan

> Epic: epic.md · Product: ../../mission.md

## Approach

Replace Django admin with a super-admin **"Settings & Season"** area in `apps/admin`, using the
same shell, tables and forms as the rest of the admin. It is backed by a `backoffice` API module in
`apps/api`. It has three parts:

1. **Reference and configuration CRUD:** users and roles, communities, countries, cities, languages, salon days, trainings, salon content and email templates. These are standard list/edit screens on role-guarded REST endpoints, with zod schemas shared through `packages/contracts`.
2. **Season operations:** each legacy reset button or script becomes a named server-side job with `preview` (dry-run count) and `run`. Each runs in batches with a progress and outcome record (who, when, rows changed).
3. **Bulk export/import:** server-generated CSV and Excel with a UTF-8 BOM and the legacy column sets, filtered by event year.

The two inbound integrations get their own `integrations` module:
- the Easy feed (Basic auth, legacy path and response shape, snapshot-tested)
- the Google-Sheet webhook (AES token check, a transactional upsert service reused by
  [witnesses-management](../../../admin/epics/witnesses-management/epic.md) logic where it overlaps)

## Architecture Impact

- **API modules:**
  - `apps/api/src/backoffice/`: users and roles, reference data, salon days, trainings, content, templates, season ops, exports/imports
  - `apps/api/src/integrations/`: Easy, Google Sheet
- **Authorization:** the first API that manages roles and communities, so it depends on the role and scope guards from [authentication-and-accounts](../authentication-and-accounts/epic.md) and route-level guards in [admin-auth-and-shell](../../../admin/epics/admin-auth-and-shell/epic.md). Super admin only, unless a row says otherwise.
- **Schema:**
  - no new domain tables beyond `season_operation_run` (audit)
  - the system-user reference becomes config, not an id literal
  - reference tables (country, city, community, language, salon_day, host_salon_training, host_salon_content, email_message_templates) and the user↔community link migrate as-is through [platform-rewrite](../platform-rewrite/epic.md)
- **Jobs:** season operations run as background jobs (queue TBD with platform-rewrite: in-process worker or SQS). Legacy used background threads inside the web process.
- **Integrations:**
  - Keep the paths `/api/host_salons_for_easy_integration/` and `/api/google_sheet_webhook/`, with the same auth headers (`Authorization: Basic`, `X-Webhook-Token`).
  - Geocoding uses the Google Geocoding API with a server key from env.
- **Admin UI:** new routes under `apps/admin` (for example `/admin/settings/*` and `/admin/season`). They aren't covered by the prototype; reuse its table, filter and editable-section patterns ([design-reference.md](../../../../ecosystem/design-reference.md)).

## Risks & Unknowns

- **Hidden dependence on Django admin.** Staff may use filters, actions or imports that aren't in the code-reading inventory. Walk through the season with a real super admin before shaping the specs (TBD who).
- **The Easy contract is external.** Any field or semantic change (guests_count, host email) needs Easy's agreement. Contact is TBD. Snapshot the live feed before cut-over.
- **The Google Sheet and Apps Script are outside the repo.** The payload shape is known only from the server code. Capture a real payload sample, and confirm who owns the script.
- **Season operations are destructive.** For example, the archive resets every witness. They need preview, confirmation, batching and an audit trail, and a staging dry run on migrated data.
- **Email templates** must be exported from production before migration. The editor must keep `{{var}}` placeholders valid, with server-side validation against the variables each event code allows (shared with [notifications-and-reminders](../notifications-and-reminders/epic.md)).
- **Cross-epic dependencies:**
  - authentication-and-accounts: roles and guards
  - admin-auth-and-shell: the admin shell and route authz
  - notifications-and-reminders: the template data model and reminder-flag API
  - platform-rewrite: migration and the job queue
  - admin/witnesses-management: the witness update rules the webhook reuses
  - salon-hosting: the training and salon-day rules hosts see

## Candidate Specs

- `staff-users-and-communities` — Super-admin screens and API to create staff users, set roles and assign communities, with role-guard tests; replaces Django-admin user management.
- `reference-data-admin` — CRUD for countries, cities (+community), communities (with authenticated export), languages, salon days (one default per year) and host trainings.
- `content-and-email-templates` — Customized-salon content and the he/en email template editor with placeholder validation, on the notifications template model.
- `season-operations` — Preview, confirm and audit jobs: archive witnesses, global availability for non-IL witnesses, ask-to-convert and Igul LeTova resets, reminder-flag reset, and the double-teaming report.
- `partner-integrations` — Easy feed and Google-Sheet witness webhook on the legacy paths, contract-tested, with secrets from env and a configured system user; plus the event-year bulk exports and the confirmed imports.
