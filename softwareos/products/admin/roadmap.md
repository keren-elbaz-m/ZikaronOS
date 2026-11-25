# Roadmap — Admin

> Product: [mission.md](mission.md)
> Drafted: 2026-11-18 from the epic tech plans. Scope decision: **parity + prototype UX**.
> Dates: TBD. Admin cuts over together with [platform](../platform/roadmap.md).

## Core Features (current state)

The legacy `zikaron-basalon-fe-admin` is live and is the behavioral reference:

- Login for 6 admin roles, with role- and community-scoped menus. The gating is sidebar-only.
- KPI dashboard filtered by city and community.
- Lists of hosts, salons, guests and witnesses: search, filters, CSV export, and bulk delete for super admins.
- Host profile: salon cards, guest-request approval within capacity, volunteer, follow-up flags and comments.
- Witness CRM: contact details, languages, accessibility, yearly status and archive, availability, comments and year summaries.
- **Salon teaming:** map and table, candidates ranked by distance and filtered by date, slot, language and accessibility, and assign/replace/unassign with a host notification.

Full behavior: [legacy-baseline/](legacy-baseline/).

## Phase 1: MVP — parity rewrite in the prototype's UX

Every legacy behavior is reproduced with a test or waived, in the [prototype's UX](../../ecosystem/design-reference.md).
Real route-level authorization replaces sidebar-only gating, and is recorded as a waiver.
Phase 1 starts once platform Wave 0 (foundation, login, authorization, messaging core) is done.

**Wave 1 — shell and access**
- [admin-auth-and-shell](epics/admin-auth-and-shell/epic.md): `admin-login-and-session`, `admin-role-authorization`, `admin-shell-and-navigation`, `admin-password-reset-and-policy`

**Wave 2 — the records** (these can run in parallel)
- [witnesses-management](epics/witnesses-management/epic.md): `witness-list`, `witness-create`, `witness-profile-details`, `witness-status-and-availability`
- [hosts-and-salons-management](epics/hosts-and-salons-management/epic.md): `admin-salons-list`, `admin-hosts-list`, `admin-salon-page`, `admin-salon-guest-requests`, `admin-host-page`
- [guests-management](epics/guests-management/epic.md): `guests-list`, `guest-profile`, `guest-registration-admin-actions`

**Wave 3 — teaming, reports and search**
- [salon-teaming](epics/salon-teaming/epic.md): `teaming-candidate-engine`, `teaming-assign-and-undo`, `teaming-queue-ui`, then `teaming-map-view`. Legacy has a map, so under parity it ships in Phase 1 unless a spec waives it.
- witnesses-management: `witness-history` (includes "salons that fit")
- [dashboard-and-reports](epics/dashboard-and-reports/epic.md): `dashboard-kpis-parity`, `list-csv-export`, `witness-csv-export-import`, `dashboard-work-views`
- admin-auth-and-shell: `admin-quick-search`

The admin app is also where Django-admin operations move. Those specs are owned by
[platform/back-office-operations](../platform/epics/back-office-operations/epic.md) (platform Wave 2).

### Decisions blocking Phase 1

Details are in each epic's product brief.

1. **Route-by-role table:** real route checks take away URLs that host admin and testimonials admin can reach today.
2. **Token storage** (httpOnly cookie or bearer token) and whether admins keep the 365-day refresh token. Both need a security review.
3. **Who may bulk-export and bulk-delete:** super admin only (the baseline) or super and global admin (what the code does).
4. **Teaming:** does the prototype's score only *order* candidates that pass the legacy rules? Also how undo interacts with the host notification, and whether the 150-day yearly-limit window stays.
5. **Witness statuses:** legacy values or the prototype's five, and how many salons a new witness wants by default (legacy 1, prototype 2).
6. **Capacity range** for staff edits: legacy 1–999 or the prototype's 2–200.
7. **English for global admins** (the prototype is Hebrew-only).

## Phase 2: Post-Launch

To be determined with the customer. Candidates raised during planning, which are not commitments:

- Prototype extras that Phase 1 specs defer (for example parts of the dashboard work views or the ⌘K search).
- Registrations as one row per season, so a guest's salons stop being merged. This needs agreement with platform.
- Defining the season explicitly instead of using the calendar year in dashboards and lookbacks.
