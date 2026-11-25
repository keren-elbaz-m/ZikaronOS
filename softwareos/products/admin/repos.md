# Repos — Admin

> Product: [mission.md](mission.md)

| Repo | Role | Tech | Status |
|---|---|---|---|
| `zikaron-basalon-fe-admin` | client | React 16 CRA · TS 4.7 · MUI 4 · redux-saga · react-google-maps · papaparse/react-csv | legacy reference |
| `prototype/zikaron-next` | shared design reference | Next.js 15 · React 19 · Tailwind v4 · localStorage (no backend) | UX reference for `/admin/*`; see [design-reference.md](../../ecosystem/design-reference.md) |
| _new monorepo_ `apps/admin` | monorepo | Next.js · Tailwind v4 · shadcn/ui | planned |

About half of `zikaron-basalon-fe-admin` is leftover public-site code (`/register/*`,
`/site/*`, SMS login) that is never reached from the admin. It is out of scope.

At discovery the working tree had **one uncommitted change**: `src/utils/forms/constants.ts:15`
has a stray `w` in `ISRAELI_PHONE_REGEX`, so no phone can pass validation. The committed
regex (HEAD `bfa647c`) is the parity spec.
