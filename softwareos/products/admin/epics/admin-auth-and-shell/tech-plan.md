# Admin Auth & Shell — Tech Plan

> Epic: epic.md · Product: ../../mission.md

## Approach

`apps/admin` (Next.js App Router) gets an authenticated route group `(staff)/` behind one server-side
guard (middleware plus a layout check). The guard reads the session, requires an admin role and
`confirm_policy`, and checks the route against a single **role → capability matrix**. That matrix lives
in `packages/contracts`, so the same table drives four things:
- the NestJS API guards (`@Roles` / capability decorator plus the community/country scope),
- the Next route guard,
- the menu,
- per-screen gates (columns, bulk actions, export/import).

Auth endpoints are the NestJS equivalents of `auth/login`, `token/refresh`, `password_reset` (+ confirm) and
`user_data` (policy), owned by `platform/authentication-and-accounts`. This epic consumes them from the
admin side and owns the admin login, reset and policy screens.

The shell is built in shadcn/ui and follows the prototype's `admin/layout.tsx`:
- RTL/LTR side menu with live counts from a small `GET /admin/nav-counts` endpoint,
- header with greeting, language toggle and logout,
- ⌘K command palette (shadcn `Command`) backed by a scoped `GET /admin/search?q=` endpoint,
- shared list primitives used by every admin epic: filter bar, URL-synced filters, TanStack Table with server pagination/sort, selection, empty and error states.

## Architecture Impact

- **New, apps/admin:**
  - routes `/login`, `/forgot-password/*`, `/privacy-policy`, `(staff)/layout.tsx`
  - session handling (token storage per security review; refresh on every request path)
  - i18n setup (he default, en)
  - shared list kit (`FilterBar`, `DataTable`, `useListQuery`)
- **New, packages/contracts:** `Role` enum (one testimonials string), the capability matrix, auth DTO and zod schemas, nav-count and search DTOs.
- **New, apps/api:**
  - `RolesGuard`, plus a `ScopeService` porting `query_by_user_role` (super all; general IL; global non-IL; volunteer/host/testimonials by community; general salons = IL **or digital**)
  - `GET /admin/nav-counts`
  - `GET /admin/search` (scoped union over salons, hosts, witnesses, guests)
- **Schema:** none beyond what `platform-rewrite` migrates (`users.role`, `confirm_policy`, `user_communities`).
- **Infra:** cookies need the admin domain and the API domain decided (same site vs cross-site). Hosting is TBD.

## Risks & Unknowns

- **Dependencies:**
  - `platform/platform-rewrite`: monorepo scaffold, migrated users, CI.
  - `platform/authentication-and-accounts`: login, refresh and reset endpoints, token compatibility at cut-over (do legacy refresh tokens keep working?).
  - Every admin epic depends on this one for the guard and the list kit.
- **Scope rules are per view and inconsistent in legacy:** some querysets return `None` for permitted roles, and `salons` is unscoped for admins. Porting them into one `ScopeService` needs an explicit table per resource, with each difference recorded as a deviation.
- **Real route gating changes behavior:** host admin and testimonials admin may lose URLs they can reach today. Confirm the matrix with staff before shipping.
- **Token storage choice** (httpOnly cookie vs header bearer) affects CSRF handling and the public site. Spike it together with `authentication-and-accounts`.
- **Search across four entities** must stay fast and scoped. It may need trigram or Postgres full-text indexes. Measure against production-size data.
- **Translations:** legacy has 899 he vs 849 en keys (62 only in he, 12 only in en). The i18n library is TBD.

## Candidate Specs

- `admin-login-and-session` — login, role refusal, token refresh, full logout, landing on the dashboard.
- `admin-password-reset-and-policy` — forgot/reset password by email and the first-login privacy-policy gate.
- `admin-role-authorization` — shared capability matrix, route guard, API guards and scope service, with the role × route test matrix.
- `admin-shell-and-navigation` — RTL shell, role-filtered side menu (desktop and mobile) with live counts, he/en toggle, shared list kit.
- `admin-quick-search` — ⌘K command palette over scoped salons, hosts, witnesses and guests.
