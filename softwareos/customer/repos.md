# Repos — Zikaron BaSalon

> Discovered: 2026-11-17 by /join-project

Legacy repos are checked out as siblings of this hub in `~/Documents/GitHub/` and
symlinked into the hub root (gitignored), so the hub tracks only `softwareos/` and
`.claude/`. All repos are in the `MoveoTech` GitHub org and are private.

| Repo | Role | Product | Tech | Branch at discovery | Status |
|---|---|---|---|---|---|
| `zikaron-basalon-be` | server | platform | Django 4.2 · DRF · Postgres · AWS EB | `dev` (969 commits) | legacy — reference only |
| `zikaron-basalon-fe` | client | platform | React 16 CRA · MUI 4 · redux-saga | `dev` (1017 commits) | legacy — reference only |
| `zikaron-basalon-fe-admin` | client | admin | React 16 CRA · MUI 4 · redux-saga | `fix/phone-number-witness-regex` (235 commits, 1 uncommitted change) | legacy — reference only |
| `prototype/zikaron-next` | shared design reference | platform + admin | Next.js 15 · React 19 · Tailwind v4 · Leaflet · localStorage | — (in hub, untracked; added 2026-11-18) | clickable prototype — UX reference, not shipped; see [design-reference.md](../ecosystem/design-reference.md) |
| _new monorepo (TBD name)_ | monorepo | platform + admin | NestJS · Next.js · Tailwind · shadcn | — | planned — see `products/platform/epics/platform-rewrite/` |

## Notes

- `zikaron-basalon-fe` also contains an older copy of the admin under `/admin/*`. It has
  drifted from `zikaron-basalon-fe-admin`, which is the source of truth for admin behavior.
- Each legacy repo carries an `agent-os/` folder (official AgentOS specs + standards).
