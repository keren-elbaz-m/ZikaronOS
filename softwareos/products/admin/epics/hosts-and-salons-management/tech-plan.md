# Hosts & Salons Management — Tech Plan

> Epic: epic.md · Product: ../../mission.md

## Approach

Build the hosts list, the salons list, the host page and the staff salon page in `apps/admin` as
Next.js App Router routes with server-side auth guards. The tables and forms use shadcn/ui, TanStack
Table and TanStack Query, with react-hook-form and zod schemas imported from the shared `contracts`
package. All business rules live in the NestJS API (`apps/api`) hosts/salons modules: scoping, salon
update validation (`1001`/`1002`/`1003`), capacity, and open-for-guests recomputation. The client only
mirrors them for inline errors. The generic legacy list pattern becomes one reusable
`DataTable` + `FilterBar` driven by URL search params, the same way the prototype keeps filters in
the URL. Every other admin list reuses it. Legacy Django signals become explicit domain events
(`SalonUpdated`, `SalonDeleted`, `GuestRequestStatusChanged`), which the notifications epic subscribes to.

## Architecture Impact

- **API (`apps/api`):**
  - Endpoints for host list/detail/summaries, the admin salon list, host salon CRUD, salon guests
    (list/approve/deny/remove) and comments, contract-compatible with the legacy routes so parity
    tests can diff responses.
  - A single role-and-community scoping policy (legacy `query_by_user_role`), enforced on every
    query. This replaces the per-view copies, including the unscoped `/api/host_salons/`.
  - CSV export done server-side so it reflects the current filters, with UTF-8 BOM and Hebrew headers.
- **Admin app (`apps/admin`):**
  - Routes `/admin/salons`, `/admin/salons/[id]`, `/admin/hosts`, `/admin/hosts/[id]`.
  - Shared `DataTable` / `FilterBar` / `EditableSection` / `Notes` components, in `packages/ui` if the public site also needs them.
- **Data:** no new tables beyond the migrated schema, with these points:
  - Salon staff flags (contacted, preparation_evening, special_population, volunteer, special_attention_text) stay on `HostSalon`.
  - Staff comments (`HostSalonComments`) keep their author and timestamp.
  - `is_open_for_guests` stays a derived column, recomputed in one domain service. This fixes the `==` vs `>=` inconsistency, with the choice recorded as a decision.
- **Contracts:** `packages/contracts` gets zod schemas for HostSalon admin update, the list filter params and the guest request status change.
- **Infra:** none specific.

## Risks & Unknowns

- **Dependency:** `platform/platform-rewrite` (monorepo, ORM, migrated schema, parity harness) and
  `admin/admin-auth-and-shell` (session, role guard, shell, filter-bar primitives) must land first.
- **Dependency:** `platform/notifications-and-reminders` owns the emails and WhatsApp messages fired by salon
  date changes, deletes and guest denials. Until it lands, these flows need a stub event bus with test assertions.
- **Dependency:** `platform/salon-hosting` shares the salon update rules. Implement them once in the API
  and have both epics consume them, so host and admin rules don't drift again (legacy 07:00 vs 08:00).
- Scoping has subtle per-entity variants (general admin = IL or digital for salons, IL-only for hosts;
  host/testimonials admin see nothing in salonguests). It needs a fixture-based contract test per role.
  This is the highest-risk area for silent data leaks.
- Magic windows (30-day salon lookback, 300-day salon-guests window) must be preserved and named as constants.
- Legacy `max_guests` 0/null means "unlimited" in capacity checks, but admin edit requires 1–999. Data
  migration must decide how existing 0/null values display.
- The parity of the host-profile per-field UI was summarized, not traced (marked ≈ in admin-discovery.md §3). Spike: read
  `src/components/Hosts/HostProfile/**` line by line before shaping the salon-page spec.

## Candidate Specs

- `admin-salons-list` — the salons table: scoped query, every filter, search, sort, pagination, server CSV export, and super-admin bulk delete with confirmation.
- `admin-hosts-list` — the hosts table: scoped query, filters (has_salon, is_org, digital, joined this year, incomplete registration), export and bulk actions.
- `admin-salon-page` — one staff page per salon: edit details with the legacy validation codes, open/close for guests, follow-up switches, volunteer, team comments, and delete with confirmation.
- `admin-salon-guest-requests` — guests on the salon page: approve, deny or remove within capacity, live seats left, and approved-guests CSV.
- `admin-host-page` — host details, edit name and phone, salons by year (summaries), "add salon for org", and staff notes.
