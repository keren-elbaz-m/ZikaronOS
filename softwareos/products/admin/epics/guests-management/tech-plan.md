# Guests Management — Tech Plan

> Epic: epic.md · Product: ../../mission.md

## Approach

**API.** A `guests` module in `apps/api` serves the admin list and profile:
- `GET /admin/guests`: legacy filter, sort and pagination semantics, `total_no_filters`, role scope from `ScopeService`.
- `GET/PATCH /admin/guests/:id`.
- `GET /admin/guests/:id/registrations`: non-denied, not merged.
- `PATCH /admin/registrations/:id` (`guests_number`) and `DELETE /admin/registrations/:id`.

Registration changes go through the same domain service the public site uses (`platform/salon-discovery-and-guest-registration`), so capacity checks, counters, the open/close recompute and the notifications are emitted from one place. Legacy did this with Django signals.

**apps/admin.** The pages follow the prototype `/admin/guests` (search, filters, CSV, salon link). They use the shared `DataTable` and `FilterBar` from `admin-auth-and-shell`, plus a lean guest page: personal card, registration card with the seat-count select and a cancel confirmation. Forms use react-hook-form with zod schemas from `packages/contracts`, using the shared phone rule.

## Architecture Impact

- **New, apps/api:** admin guests controller (list, detail, update) and registration admin endpoints that call the shared `RegistrationService` (capacity, counters, `is_open_for_guests`, notification events).
- **New, packages/contracts:** guest list filter DTO (shared with export), guest and registration DTOs, phone schema.
- **New, apps/admin:** `/guests` list and `/guests/[id]` profile.
- **Schema:**
  - Guest (one active registration per guest) and GuestSalon, as migrated by `platform-rewrite`.
  - Decide whether the OneToOne guest↔registration becomes one row per season (needed to stop merged salons and to keep history). Coordinate with platform.
- **Infra:** none.

## Risks & Unknowns

- **Dependencies:**
  - `admin-auth-and-shell`: guard, scope, list kit.
  - `dashboard-and-reports`: CSV export.
  - `platform/salon-discovery-and-guest-registration`: shared `RegistrationService` and capacity rules.
  - `platform/notifications-and-reminders`: `hosts_4` and related events.
  - `hosts-and-salons-management` (salon page link target).
- **Legacy side effects to reproduce deliberately, not by accident:**
  - Re-registering deletes the previous registration inside validation.
  - New registrations are created `approved` but increment the *pending* counter.

  Each needs an explicit parity decision in the spec.
- **Guest scope for global admin is a complex non-IL rule** (`guests/views.py:68-73`). Port it with tests before changing anything.
- **`registration_status`** is set only by the frontend, so "didn't finish registration" depends on client behavior. The rewrite needs a server-side definition.
- The prototype has no guest profile, so the UX for the profile page needs a quick design pass.

## Candidate Specs

- `guests-list` — scoped guests list with legacy filters and sort, URL-synced search and filters, salon link, CSV export hook.
- `guest-profile` — guest details with edit (shared phone rule) and the current registration card with approved-only privacy.
- `guest-registration-admin-actions` — admin change of seat count and cancellation through the shared registration service, with capacity, counters and the host notification.
