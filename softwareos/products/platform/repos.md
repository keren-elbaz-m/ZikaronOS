# Repos — Platform

> Product: [mission.md](mission.md)

| Repo | Role | Tech | Status |
|---|---|---|---|
| `zikaron-basalon-be` | server | Python 3.12 · Django 4.2 · DRF 3.14 · Postgres · AWS EB | legacy reference |
| `zikaron-basalon-fe` | client | React 16 CRA · TS 4.7 · MUI 4 · redux-saga · i18next | legacy reference |
| `prototype/zikaron-next` | shared design reference | Next.js 15 · React 19 · Tailwind v4 · Leaflet · localStorage (no backend) | UX reference for `/`, `/salons*`, `/guest`, `/host*`; see [design-reference.md](../../ecosystem/design-reference.md) |
| _new monorepo_ `apps/api`, `apps/web` | monorepo | NestJS · Next.js · Tailwind v4 · shadcn/ui | planned |

`zikaron-basalon-fe` contains a stale copy of the admin under `/admin/*`. It is **not**
part of this product's rewrite scope; admin behavior is owned by [admin](../admin/mission.md).
