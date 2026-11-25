# Dashboard & Reports — Product Brief

> Epic: epic.md · Product: ../../mission.md

## Goals

Staff open the admin to answer one question: where does the season stand, and what needs doing
next? Today the dashboard shows four boxes of counts. Staff then have to export CSVs and work in
spreadsheets, and the export tools are unreliable:
- exporting only the loaded rows,
- an inverted "disabled" flag,
- a broken guests export-all,
- arbitrary server errors collapsed into "something went wrong".

This epic rebuilds the KPI dashboard with every legacy count and filter, and adds the prototype's
working views: a per-day capacity chart, the witness pipeline, and "needs a witness" and "almost full"
work lists. It also delivers one reliable export capability for every admin list: CSV with Hebrew
headers, either the selection or the full filtered set. It keeps the super-admin witness CSV export
and the presentation-paragraph CSV import.

## User Stories

- As an admin, I see this season's totals and breakdowns for salons, hosts, guests and witnesses, limited to my role's scope, so I know where we stand.
- As a super or general admin, I filter the dashboard by city and community, so I can review one region or community.
- As an admin, I see capacity against registrations per salon day, so I spot days that are filling up or empty.
- As an admin, I see the witness pipeline (not contacted, no answer, available, not available, archived) and lists of salons that need a witness or are almost full, so I know what to act on today.
- As an admin, I jump from any dashboard figure or list item to the filtered list or record behind it.
- As a super or global admin, I export the selected rows, or all rows matching my filters, from any list to a CSV that opens correctly in Excel with Hebrew headers.
- As a super admin, I download the full witness CSV (server-generated, Hebrew headers) for offline work.
- As a super admin, I upload a CSV of witness presentation paragraphs and see per-row results, including which rows failed and why, and I can download the errors.

## Success Criteria

1. The dashboard returns every legacy figure with the same definitions, scoped by role and community, and filtered by city and community. Parity tests compare it with the legacy endpoints on a migrated data snapshot:
   - Salons: total, didn't contact, waiting for witness, digital, physical.
   - Hosts: total, org, didn't create a salon yet, attended preparation evening, hosted before.
   - Guests: total, didn't finish registration this year, without salon this year, with salon this year, with salon another year, with salon.
   - Witnesses: total, the type breakdown, waiting for conversation, waiting for assignment, waiting for contact.
2. Legacy's scattered year windows are preserved and written down in one place: `event_time >= today-30d`, `created_at.year == current`, hosts by `last_login.year`. Any change is a recorded deviation.
3. The capacity-per-day chart, witness pipeline, "needs a witness" list and "almost full" list (≤2 seats left on open salons) match the underlying list totals for the same scope (tested).
4. Every count is a link to the matching filtered list.
5. Export works on every admin list:
   - "Selected" exports exactly the selected rows.
   - "All" exports the full filtered set (not just the loaded page), including guests.
   - Files are UTF-8 with a BOM, Hebrew headers, and named `DD-MM-YYYY <n> <entity>.csv`.
   - Export is available only to roles allowed in the capability matrix (API-enforced).
6. The witness server export matches the legacy column set and is super-admin only (API-enforced, tested).
7. Presentation import:
   - Accepts the legacy header variants (`id`, and `פסקה למפת סלונים` / `witness_presentation_details`).
   - Enforces ≤2000 characters per paragraph and skips empty rows.
   - Returns the legacy summary shape (200 all succeeded / 207 partial / 400 all failed) and shows per-row errors with "export errors to CSV".
   - Server error messages reach the user.
8. Exports are not cached across filter changes (no stale CSV). Large exports (full witnesses or guests for a season) finish within a target time: TBD.
9. A security review has passed (file upload, CSV formula injection, role checks).

## Out of Scope

- Communities CSV export (`/api/export_communities`, a Django-admin button). Owned by `platform/back-office-operations`, which must also fix its missing auth.
- Django-admin CSV and Excel exports of raw models (also `back-office-operations`).
- Lists themselves (filters, columns, profiles). Owned by guests-management, hosts-and-salons-management and witnesses-management. This epic supplies the export action they plug in.
- Scheduled or emailed reports: TBD (none in legacy).

## Parity & Deviations

**Preserve:**
- The four `*_dashboard` endpoints' figures and definitions ([shell-lists-and-profiles.md](../../legacy-baseline/shell-lists-and-profiles.md) §Dashboard; backend endpoints in [backend-discovery.md](../../../platform/legacy-baseline/backend-discovery.md) §5).
- The dashboard community filter only for super and general admins. Community id 1 means "no community".
- Per-list CSV columns as listed in the baseline (§Shared list mechanics). Select-all export uses the full filtered set.
- The witness server export columns, and the presentation-import rules and response shape.

**Adopted deviations:**
- The prototype dashboard additions: capacity per day, witness pipeline, and the "needs a witness" and "almost full" work lists (design-reference, Route → epic map).
- Fix the legacy export bugs (admin architecture Gotcha 4; admin-discovery G7, G10): exporting only loaded rows, the inverted disabled flag, the broken guests export-all, untranslated errors.
- Bulk action rights: legacy shows the bar to super **and** global admin in code, while the baseline summary says super only. The capability matrix in `admin-auth-and-shell` is the single source, and the chosen rule is recorded there.

**Decisions to confirm:**
- Should the prototype's witness pipeline use the legacy status set (statuses plus `available_for_teaming`, `host_assigned`) or the prototype's five statuses? This decision must stay aligned with `witnesses-management`.
- The definition of "almost full" (≤2 seats in the prototype). Should it also count pending guests?
- Should the redesign keep the dashboard "Go to …" links per box, or replace them with clickable figures?
- Should the legacy client-side CSV move to server-generated CSV for every list? This is recommended for large sets.
