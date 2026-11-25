# Tech Stack — Admin

> Product: [mission.md](mission.md) · Evidence: [legacy-baseline/admin-discovery.md](legacy-baseline/admin-discovery.md) §2

## Legacy (`zikaron-basalon-fe-admin`)

- CRA 3.2, React 16.13, TS 4.7 (strict off), MUI 4 (Table, Snackbar, Tooltip) + styled-components 4 + jss-rtl.
- redux + redux-saga + redux-persist + reselect; react-router 5; axios 0.19 + qs (`arrayFormat: repeat`), with proactive JWT refresh within 5 min of expiry.
- react-hook-form 3 + yup; i18next 18 (`public/locales/{he,en}`, default `he`).
- react-google-maps 9 (MarkerClusterer, InfoBox, MarkerWithLabel), Places autocomplete; the Maps key is **inline in `public/index.html`**.
- react-csv (export), papaparse (import pre-processing), react-paginate, react-modal, react-tabs, react-phone-input-2, moment + date-fns.
- Served by an Express static server (`server.js`, `Procfile`); env `REACT_APP_API_URL` only.

## Target

- Next.js App Router, React 19, Tailwind v4 + shadcn/ui (data tables, dialogs, RTL), TanStack Query + TanStack Table, react-hook-form + zod from the shared `contracts` package, Google Maps with clustering (key from env), server-side auth guard per route and role.
