# Witnesses Management — Product Brief

> Epic: epic.md · Product: ../../mission.md

## Goals

Witnesses are the scarcest resource of the season. Staff run a year-round CRM for them:
- recruit and add witnesses without creating duplicates
- call them each year and record the outcome (no answer, available, not available, archived)
- capture which salon days and time slots each one can do, and how many salons they want
- keep contact, accessibility, language and presentation details current

In legacy the witness profile is a stack of edit modals. Edits are lost when a save fails, the
status rules are only partly clear to staff, and the duplicate-phone check only runs at certain moments.

Goals:
- Rebuild the witnesses list, Add Witness and the witness profile in `apps/admin`. They must reach parity with
  [witness-profile.md](../../legacy-baseline/witness-profile.md) and the witness parts of
  [shell-lists-and-profiles.md](../../legacy-baseline/shell-lists-and-profiles.md), and use the prototype's UX:
  - status tabs
  - a days × slots availability grid
  - duplicate phone caught while typing
  - reverse matching
- Keep the availability and status invariants the teaming flow depends on (`available_for_teaming`,
  the yearly limit, no changes while assigned) correct by construction.

## User Stories

- As an admin in scope, I can list witnesses (archived hidden by default) by status tab. I can filter by
  city, type, language, availability date and slot, special attention, hosted before, zoom, programs and
  (super/general) community, and search by name.
- As a super, general, global or volunteer admin, I can add a witness. Required: names, city, languages,
  type, stairs, and at least one phone. I am warned while typing if a phone already belongs to another
  witness, and I can't save a duplicate.
- As an admin, I can view and edit a witness's personal, contact, accessibility and "more info" details,
  and my edit stays open with its values if the save fails.
- As an admin, I can set a witness's yearly status:
  - **archived** needs a reason
  - **did not answer** needs the last call time
  - **available** needs the number of salons wanted (1–9) and at least one availability slot
  - status can't change while the witness has a future assigned salon
- As an admin, I can mark which salon days and slots (morning / noon / evening) a witness can do on
  a grid, with no duplicate dates.
- As an admin, I can see a witness's assigned salons (and unassign one, with confirmation), the salons
  they attended by year, year summaries, and team comments.
- As an admin, I can see "salons that fit this witness" and jump to teaming.
- As a super admin, I can export witnesses to CSV and import presentation paragraphs from CSV, with a
  per-row result report. Both are owned by [admin/dashboard-and-reports](../dashboard-and-reports/epic.md) (`witness-csv-export-import`).
- As a super or global admin, I can delete a witness after confirming.

## Success Criteria

- Every behavior in [witness-profile.md](../../legacy-baseline/witness-profile.md) §1–8 and the witness
  list and Add Witness sections of the shell baseline has a test, or a waiver recorded in the owning spec.
- Phone validation accepts the committed legacy set (landlines 02/03/04/08/09, 07x, 05x mobiles, with an
  optional +972/0 prefix), or the strict libphonenumber rule if confirmed, and stores E.164. The
  uncommitted broken regex is never the reference.
- A duplicate phone (mobile or landline) is detected before save on both create and edit, and the API
  rejects it too.
- Status rules are enforced by the API, not just the UI. Covered by tests:
  - a change is blocked while a future assignment exists
  - archived → `not_contact_this_year` + `archived=true`
  - `want_to_participate_amount_salons` can't go below salons assigned in the last 60 days
  - a slot can't be added beyond the yearly limit
  - a slot date can't be duplicated within 150 days
- `available_for_teaming` matches legacy for the same sequence of edits, checked by a parity test over status, slot and assignment changes.
- A failed save keeps the form open with the user's input and shows the error.
- Team comments can only be read and written by admins in scope (this fixes the open legacy endpoint).
- The security review passes, and QA signs off.

## Out of Scope

- Matching witnesses to salons (teaming queue, ranking, assign): [salon-teaming](../salon-teaming/epic.md). This
  epic shows assignments, unassigns from the profile, and shows "salons that fit" as a read-only list.
- Witness self-registration on the public site: `platform/witness-self-registration`.
- The Google-Sheet intake webhook, the yearly "archive witnesses" reset and the "global availability all"
  job: `platform/back-office-operations`.
- Notifications on unassignment (`cancel_witness`): `platform/notifications-and-reminders`.

## Parity & Deviations

**Preserve:**
- Field set and limits:
  - first name 2–13, last name 2–30, Hebrew/Latin name regex
  - special attention ≤255, free text and presentation ≤2000, special needs ≤1000
  - DOB before the current year
- Witness types (holocaust_survivor, generation_2, generation_3 = "third/fourth generation", expert, other), programs, special populations, accessibility needs, zoom.
- Yearly status set, archive reasons, the "did not answer" last-call time, and the status note ≤225.
- Availability slot model (date + morning/afternoon/evening) and the bulk update semantics. Slot dates are limited to configured salon days.
- Scoping:
  - super: all
  - general: IL
  - global: non-IL
  - volunteer/testimonials: community
  - host: only witnesses assigned to their salons
- Delete restricted to super/global.
- Server CSV export columns and Hebrew headers. Import column aliases (`פסקה למפת סלונים` / `witness_presentation_details`).
- An email of `zikaron@basalon.com` is shown as blank (placeholder email).

**Adopted deviations (fix legacy bugs):**
- Edits stay open until the save succeeds, and the cancel-confirm works.
- No crash on an unknown language id. i18n keys are not built from raw API values.
- Year tabs show when there are past salons even with zero comments.
- The duplicate-phone check runs while typing and on submit, on both create and edit. Legacy edit had it as dead code. This continues the fe-admin AgentOS spec `2026-04-21 witness-duplicate-phone-on-submit`.
- The witness comments endpoint is admin-only and scoped ([join-report](../../../../join-report.md) #5). Comment delete asks for confirmation.
- Phone validation follows the strict server rule ([design-reference #2](../../../../ecosystem/design-reference.md)).
- Time slots follow one rule: 08–12 / 12–17 / 17+ ([design-reference #1](../../../../ecosystem/design-reference.md)).

**Decisions to confirm:**
- Default salons wanted for a new witness: the prototype uses 2, legacy uses 1 (`witnesses/models.py:74`).
- Leaving "available" clears availability. Legacy already deletes future slots in a post_save signal (`witnesses/signals.py:39-46`), and the prototype matches ([design-reference #8](../../../../ecosystem/design-reference.md)). Confirm the side effects that go with it: moving to `not_contact_this_year` writes the status note into the year comment (`:32-37`). Keep that, or make it explicit?
- The duplicate-*name* block on edit: keep it or drop it?
- The status labels in the prototype (not_contacted / no_answer / available / not_available / archived) map 1:1 to legacy values. Confirm the API keeps the legacy enum strings for data compatibility.
- The `programs` filter source is broken in legacy: fix it or drop it?
