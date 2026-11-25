# Dashboard & Reports — Tech Plan

> Epic: epic.md · Product: ../../mission.md

## Approach

**API.** `apps/api` gets a `reports` module:
- `GET /admin/dashboard`: one scoped call returning all four legacy figure groups, plus the prototype additions (capacity by salon day, witness pipeline, "needs a witness" and "almost full" lists). Each legacy figure is a named query with its own parity test against a migrated data snapshot. The legacy year windows live as named constants in one file.
- **Shared export.** Each list endpoint accepts `format=csv`, with the same filter DTO it uses for paging, plus optional `ids[]`. It streams a UTF-8 BOM CSV with Hebrew headers from a per-entity column map in `packages/contracts`. This replaces client-side react-csv and makes "export all" correct by construction.
- The **witness export** and the **presentation import** (multipart upload, row validation, 200/207/400 summary) are ported as-is, behind the super-admin capability. Cells are escaped against CSV formula injection.

**apps/admin.** The dashboard follows the prototype `/admin` page, using shadcn cards and a small chart. The chart library is TBD. The chart must be accessible, with a data-table fallback. The shared `DataTable` from `admin-auth-and-shell` gets an `ExportMenu` (selected / all filtered) and an `ImportDialog`.

## Architecture Impact

- **New, apps/api:**
  - `reports` module (dashboard queries, export streaming, presentation import)
  - per-entity CSV column maps
  - CSV formula-injection escaping
- **New, packages/contracts:** dashboard DTO, export column definitions, import result DTO (legacy shape).
- **New, apps/admin:** dashboard page, export menu, import dialog with result view and errors CSV.
- **Schema:**
  - None new. The import writes `witness.witness_presentation_details` (≤2000).
  - Dashboard queries need indexes on `host_salon.event_time`, `host_salon.created_at` and the guest/salon status fields. Verify on production-size data.
- **Infra:** large CSV streams need a request timeout that allows them (hosting is TBD).

## Risks & Unknowns

- **Dependencies:**
  - `admin-auth-and-shell`: capability matrix, scope service, `DataTable`.
  - `platform/platform-rewrite`: migrated data, parity snapshot harness.
  - The list epics (guests, hosts-and-salons, witnesses) must expose their filter DTOs for export to reuse.
  - `witnesses-management`: status model for the pipeline.
- **Legacy definitions are irregular and must be reproduced exactly or waived:**
  - hosts filtered by `last_login.year`,
  - city filtered by **name** in hosts/guests dashboards but by **id** in salons,
  - `NO_COMMUNITY_TYPE='1'` vs `'0'` in lists.
- **Year rollover:** "current year" vs season. Dashboards around 1 January behave oddly in legacy. Decide whether to define the season explicitly. This needs a product decision.
- **Prototype pipeline statuses differ from legacy witness statuses.** This depends on the witnesses-management decision.
- **Export size and timeouts** for full-season guest lists. Streaming is needed. Measure.

## Candidate Specs

- `dashboard-kpis-parity` — the four legacy figure groups with city/community filters, role scope and click-through to the lists.
- `dashboard-work-views` — capacity per salon day, witness pipeline, and "needs a witness" and "almost full" lists from the prototype.
- `list-csv-export` — server-side CSV export (selected / all filtered, Hebrew headers, BOM) wired into every admin list's bulk bar.
- `witness-csv-export-import` — super-admin witness CSV export and presentation-paragraph import with per-row results and an errors CSV.
