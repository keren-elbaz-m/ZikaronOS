# Admin

> Name: Admin
> Repos: zikaron-basalon-fe-admin
> Discovered: 2026-11-17 by /join-project

## Mission

The staff back office that runs each season. Admins watch a KPI dashboard of salons,
hosts, guests and witnesses, filtered by city and community. They search, filter, export
and (super admins) bulk-delete hosts, salons, guests and witnesses. They maintain the
witness CRM: contact details, accessibility, languages, yearly status and archive,
availability on salon days, team comments and per-year summaries. They work the host
profile: salon cards, guest-request approval within capacity, volunteer assignment, the
contacted / preparation / special-population flags, and staff comments. Above all, they
**team witnesses to salons** from a map or a table, ranked by distance and filtered by
date, time slot, language and accessibility. Every assignment notifies the host.

Access is limited to six admin roles. Role and community decide which menus, columns and
records a user sees.

## Target users

super admin · general admin (Israel) · global admin (abroad) · volunteer admin ·
host admin · testimonials admin. See [customer/team.md](../../customer/team.md).

## Rewrite goal

Rebuild as `apps/admin` (Next.js + Tailwind + shadcn/ui) in the new monorepo, behavior-
identical to [legacy-baseline/](legacy-baseline/). The source of truth is
`zikaron-basalon-fe-admin`, not the drifted `/admin` copy inside `zikaron-basalon-fe`. The
rewrite is also the natural home for the Django-admin-only operations owned by
[platform/back-office-operations](../platform/epics/back-office-operations/epic.md).
Real route-level authorization should replace legacy's sidebar-only gating, recorded as a
parity waiver.

## Repos

See [repos.md](repos.md).
