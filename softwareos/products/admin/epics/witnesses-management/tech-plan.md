# Witnesses Management — Tech Plan

> Epic: epic.md · Product: ../../mission.md

## Approach

Build `/admin/witnesses` (status tabs + `DataTable`), an add-witness form, and `/admin/witnesses/[id]`
(editable sections, an availability grid, assignments, year history and notes) in `apps/admin`. They
reuse the shared list and form primitives from [admin-auth-and-shell](../admin-auth-and-shell/epic.md)
and [hosts-and-salons-management](../hosts-and-salons-management/epic.md).

The core of the epic is a NestJS `witnesses` domain service that owns every invariant, replacing
legacy Django signals and scattered serializer checks:
- status transitions
- availability slot CRUD (bulk update)
- the yearly salon limit
- the derived `available_for_teaming` flag

The service recomputes `available_for_teaming` in one function, called after any status, slot or
assignment change, and emits `WitnessAvailabilityChanged`. Teaming then reads one consistent flag.
Validation schemas (names, phones, limits) live in `packages/contracts` and are shared by the client
(inline errors, duplicate check while typing via a debounced query) and the API (authoritative).

## Architecture Impact

- **API (`apps/api`):**
  - Witnesses module: list with filters and scoping, detail, create/patch, delete (super/global).
  - Duplicate-phone validation, admin-only.
  - Availability `bulk_update`.
  - Comments and year comments (admin-only, scoped).
  - Past and future salons. The witness CSV export and presentation import are owned by [admin/dashboard-and-reports](../dashboard-and-reports/epic.md).
  - "Salons that fit this witness" (reuses the teaming candidate query from [salon-teaming](../salon-teaming/epic.md)).
- **Admin app:**
  - Routes `/admin/witnesses`, `/admin/witnesses/new`, `/admin/witnesses/[id]`.
  - Components for the availability grid (salon days × 3 slots) and the status editor (conditional fields per status).
- **Data:**
  - `Witness`, `WitnessSalon` (slot), `WitnessComments`, `WitnessYearComment` migrated as-is.
  - Consider a non-unique index on `phone_number` / `mobile_number` for the duplicate lookup. Legacy has no DB uniqueness, so keep it non-unique.
  - The legacy `comment_year` max is frozen at import time. Compute it per request.
- **Contracts:** zod schemas for Witness create/update, status change (discriminated union per status), the availability bulk payload, and the import report.
- **Geo:** address and city via Google Places (key from env). On an empty address, take lat/lng from the city, as in legacy.

## Risks & Unknowns

- **Dependency:** `platform/platform-rewrite` (schema, parity harness), `admin/admin-auth-and-shell`
  (guards, shell, list primitives), and the salon days reference data from `platform/back-office-operations`.
- **Dependency:** [salon-teaming](../salon-teaming/epic.md) shares the candidate query and the
  `available_for_teaming` logic. Build the domain service here first, and have teaming consume it.
- `available_for_teaming` in legacy is spread across 4 signal handlers, and one branch is "effectively
  always true" (backend-discovery §6.4). Spike: write a characterization test suite against the legacy
  API (status × slots × assignments) before reimplementing it, then decide which quirks to keep.
- Magic windows (30 / 60 / 150 days) must keep their meaning across a year boundary. Name them as constants and test them around Yom HaShoah dates.
- The Google-Sheet webhook (back-office) writes the same fields. Both paths must go through the same domain service.
- Large lists: the witness CSV export and "select all" fetch every row. Stream the export server-side.
- The per-field UI of the witness profile was summarized, not traced (marked ≈ in admin-discovery.md §3). [witness-profile.md](../../legacy-baseline/witness-profile.md) is detailed, but verify §3–4 hardcoded Hebrew maps (special population, programs, "Fulfillment routes" → חרדים) before porting labels.

## Candidate Specs

- `witness-list` — status tabs, scoped list, filters and search, client CSV of selection, super-admin server export, and delete with confirmation.
- `witness-create` — add-witness form with shared validation, a duplicate-phone check while typing and on submit, and redirect to the profile.
- `witness-profile-details` — view and edit personal, contact, accessibility and more-info sections with safe save (no lost edits), plus team comments.
- `witness-status-and-availability` — status editor with all transition rules, the availability grid with bulk update, the yearly limit, and the `available_for_teaming` domain service.
- `witness-history-and-import` — assigned / past salons by year with year summaries, unassign with confirmation, and "salons that fit". (The slug is kept, but the presentation CSV import belongs to `dashboard-and-reports/witness-csv-export-import`.)
