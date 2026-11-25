# Back-office Operations & Integrations — Product Brief

> Epic: epic.md · Product: ../../mission.md

## Goals

Super admins run each season through Django admin (`/admin/`). That is where they assign staff
roles and communities, maintain cities and languages, set the season's salon days, create host
trainings, edit email copy, run the yearly resets, and pull the bulk exports. None of this has
an API, so the rewrite has no Django admin to fall back on. These screens must exist before
cut-over, or the season can't be opened.

Two external systems also depend on the platform, and both must keep working unchanged:
- the **Easy** partner pulls the public salon feed
- a **Google Sheet** pushes witness intake answers

The goals:
- Rebuild every Django-admin capability that staff rely on as screens in `apps/admin`, backed by
  role-checked API endpoints. Nothing should need a database console or a developer.
- Keep the Easy feed and the Google-Sheet webhook contracts byte-compatible, so neither partner has
  to change anything at cut-over.
- Turn the yearly reset scripts into named, confirmable, auditable season operations.
- Fix the legacy security gaps in this area instead of carrying them over.

## User Stories

- As a **super admin**, I can create staff users, set their role, and assign volunteer, host and testimonials admins to communities. Today this is possible only in Django admin.
- As a **super admin**, I can maintain countries, cities (with their community), communities and languages. Ordinary users can no longer write cities.
- As a **super admin**, I can manage each year's salon days, choose the year's default day (one per year), and create and edit host trainings (date, place, online).
- As a **super admin**, I can manage customized-salon content and edit each email template's subject and body, in Hebrew and English, with the available `{{variables}}` shown.
- As a **super admin**, at the start of a season I can run the season operations, each with a preview count, a confirmation and a logged result:
  - archive witnesses (the yearly status reset)
  - open all dates for non-Israeli witnesses
  - reset the ask-to-convert and Igul LeTova prompts
  - reset or stop reminder flags
- As a **super admin**, I can export users, hosts, salons, assignments, guests, the "guests × hosts × salons" sheet and communities to CSV or Excel, filtered by event year. I can import hosts, salons and witnesses where Django admin allowed it today.
- As **Easy (partner)**, I keep pulling `GET /api/host_salons_for_easy_integration/` with the same credentials, filters and response fields.
- As the **witness-intake Google Sheet**, I keep posting to `POST /api/google_sheet_webhook/` with the same encrypted token and payload. Matching witnesses are updated, and the answers become team comments.

## Success Criteria

- Every row of [backend-discovery.md §6.10](../../legacy-baseline/backend-discovery.md) maps to an
  admin screen, an API endpoint or a recorded waiver. QA walks the list and signs off each row.
- All new endpoints are restricted to the right role (super admin unless a row says otherwise). An
  authorization test proves that host, guest and the other admin roles get 403.
- The Easy feed returns the same JSON field set and filters as legacy for a fixed dataset
  (snapshot/contract test). It accepts only valid Basic-auth credentials.
- The webhook passes contract tests for each [§6.6](../../legacy-baseline/backend-discovery.md)
  rule: token check, phone match (404 when none matches, 400 when several do), field overwrite
  rules, city plus geocode, availability rebuild, comment creation, and single transaction.
- Each season operation has a dry-run count, requires confirmation, is idempotent, and writes an
  audit entry (who, when, how many rows).
- Exports open in Excel with Hebrew intact (UTF-8 BOM) and contain the legacy columns.
- `export_communities` requires authentication. No secret (Easy password, webhook key, Google API
  key) is in source.
- The production mode gates pass: tests, a security review (this epic adds privileged endpoints and two inbound integrations), and QA.

## Parity & Deviations

**Preserve:**
- Role and community rules: communities apply only to volunteer, host and testimonials admins (plus super admin) (`users/admin.py:28-46`).
- One default salon day per year. A training has a date, place and online flag. Content and template records are kept per language.
- What the yearly witness archive does: every non-archived witness not already `did_not_contact_this_year` becomes that status, with `want_to_participate_amount_salons=1` and not teamable (`witnesses/management/commands/archive_witnesses.py:12-38`).
- Global availability for non-Israeli witnesses, the ask-to-convert and Igul LeTova resets, and the email-status "stop all reminders" switch.
- The export column sets and the event-year filters.
- The Easy feed:
  - which salons it lists: future, open, public, host finished, `easy_permission`, Israel only
  - its serializer fields: id, event_time, salon_name, coordinates, org flag, city, address, language, floor, apartment, guests_count from the stored counters, max_guests, is_digital, site_link and more (`hosts/serializer.py:522-560`)
  - its Basic-auth check
- The webhook rules in §6.6.

**Adopted deviations** (recorded parity waivers):
- `export_communities` requires a super-admin session (join-report Uncertainty #5).
- City writes are restricted to staff (Uncertainty #5).
- The webhook gets a configured "system user" instead of the hard-coded user `166434`. It no longer stores a User object into a text field, and it drops the non-field `is_available_this_year` write and the "Dev Server" log ([backend-discovery](../../legacy-baseline/backend-discovery.md) Gotcha 20).
- The salon-days list is computed per request; legacy froze it at process start (Gotcha 11).
- The `check_double_teaming` script, which flagged assignments whose witness date ≠ salon date, becomes a validation in admin/salon-teaming plus a report here. It is no longer a print-only cron.
- Credential comparisons use constant-time checks.

**Decisions to confirm:**
1. The `reset_host_salon_guests` script zeroes the guest counters and recomputes `is_open_for_guests` with a bug: it adds the confirmed count to itself. Is it still run? Recommendation: drop it once counters are derived (see salon-discovery).
2. The Easy feed's `guests_count` comes from the unreliable stored counters (Gotcha 4), and the feed exposes the host's email. Should both stay byte-compatible, or should guests_count be fixed? This needs Easy's agreement.
3. Imports (hosts, salons, witnesses via django-import-export): which ones do staff actually use? Port only those. TBD with the customer.
4. One-off migration commands (`*migration.py`, `corona.py`, `fakedataloading.py`, `idan_update_…`) are dead. Confirm they can be dropped.
5. Who runs the season operations, and when? (A season-opening checklist owner: TBD.)

## Out of Scope

- The everyday admin lists, profiles, dashboards and the witness CSV export/import. These belong to the admin product: [dashboard-and-reports](../../../admin/epics/dashboard-and-reports/epic.md), [witnesses-management](../../../admin/epics/witnesses-management/epic.md), [hosts-and-salons-management](../../../admin/epics/hosts-and-salons-management/epic.md).
- Sending and scheduling messages, which belong to [notifications-and-reminders](../notifications-and-reminders/epic.md). This epic only provides the template editor and the reset buttons.
- The admin login, shell and route guards, which belong to [admin/admin-auth-and-shell](../../../admin/epics/admin-auth-and-shell/epic.md).
- New partner integrations, and changes to the Easy or Google-Sheet contracts.
