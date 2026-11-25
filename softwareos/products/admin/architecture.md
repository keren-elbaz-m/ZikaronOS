# Architecture — Admin

> Product: [mission.md](mission.md) · Detail: [legacy-baseline/admin-discovery.md](legacy-baseline/admin-discovery.md) §3, [legacy-baseline/shell-lists-and-profiles.md](legacy-baseline/shell-lists-and-profiles.md)

## Components

| Area | Routes |
|---|---|
| Auth & policy gate | `/` login, `/forgotpassword/*`, `/privacy_policy_heb` (first-login confirmation) |
| Shell | `/admin`: header, role-filtered sidebar (desktop only), lazy sub-routes |
| Dashboard | `/admin` |
| Witnesses | `/admin/witnesses/list`, `/admin/witnesses/profile/:id`, `/admin/witnesses/addwitness` |
| Hosts & salons | `/admin/hosts/list`, `/admin/hosts/profile/:id`, `/admin/salons` |
| Guests | `/admin/guests/list`, `/admin/guests/profile/:id` |
| Salon teaming | `/admin/salonteaming/mapview`, `/admin/salonteaming/tableview` |

The generic list pattern is shared by all lists: `FilterHeader` (filters, search,
checkboxes) → `useFilterRequest` (query params) → paginated DRF list (page size 15) →
`FilterTable` (sort, select, CSV export, bulk delete). Host and guest profiles reuse
components shared with the public site (`components/Hosts/**`, `components/Guests/**`).

## Data Flow

- All data comes from the platform API (`REACT_APP_API_URL`). On init it loads cities, communities and languages.
- Auth: JWT in `persist:auth`. The axios `instance` refreshes proactively and on 401, and clears storage on 403. Saga "request" actions use raw axios with no refresh.
- Exports are client-side CSV (react-csv) from a `pagination=false` fetch. The witness CSV export and presentation-details import are server-side and super-admin only.

## Environments

API base from `REACT_APP_API_URL` (falls back to a hard-coded dev host). `FE_URL` is hard-coded.

## Gotchas

1. **Role gating is UI-only.** Routes are reachable by any admin role; only sidebar items and some columns and actions are hidden. The API scopes data by role and community.
2. Role-string mismatch: `testimonials admin` vs `testimonial admin`.
3. **Teaming bugs**: clicking a salon marker on the map doesn't load its details; witness and salon ids collide on the map; the loader spins forever on error; distance labels go stale or show "null km". See [salon-teaming.md](legacy-baseline/salon-teaming.md).
4. **Bulk delete** has no confirmation; "select all" delete is a no-op; guests export-all is broken.
5. **Witness profile**: edits close before the save returns (lost on failure); i18n keys are built from raw API values.
6. **Host profile**: the open-for-guests toggle only PATCHes earliest-year salons; a module-global approved-guest counter; and more ([shell-lists-and-profiles.md](legacy-baseline/shell-lists-and-profiles.md)).
7. No tests. A Jenkinsfile with inline credentials and three coexisting deploy configs.
