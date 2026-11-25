# Zikaron BaSalon — Tech Stack

> Discovered: 2026-11-17 by /join-project. Two columns: **legacy** (what runs today) and
> **target** (the rewrite). Product-level detail: `products/<product>/tech-stack.md`.

## Frontend

| | Legacy | Target |
|---|---|---|
| Framework | React 16 SPA, CRA `react-scripts 3.2`, TypeScript 4.7 (strict off) | Next.js (App Router), React 19, TypeScript strict |
| UI | MUI v4 + styled-components 4 + jss-rtl | Tailwind CSS v4 + shadcn/ui (RTL-first) |
| State / data | redux + redux-saga + redux-persist, axios | TanStack Query (server state), minimal client state |
| Forms | react-hook-form v3 + yup | react-hook-form + zod (schemas shared with the API) |
| i18n | i18next, `public/locales/{he,en}`, Hebrew default + orthodox overrides | TBD (e.g. next-intl), same he/en keys + orthodox overrides |
| Maps | Google Maps JS (google-map-react, react-google-maps, Places autocomplete) | Google Maps JS (key from env only) |
| Serving | Express static server (`server.js`), AWS CodeBuild | Next.js on AWS (TBD) |

**Prototype check (2026-11-18):** `prototype/zikaron-next` already runs the target frontend
(Next.js 15.5, React 19, Tailwind v4) at ~175–188 KB first load per route, compared with ~850 KB gzipped for legacy.
It differs from the target in three ways that the rewrite must settle: it uses **Leaflet with public OSM tiles**
(the target says Google Maps), it does not use shadcn/ui, and it does not use zod (installed but unused). See
[design-reference.md](../ecosystem/design-reference.md).

## Backend

| | Legacy | Target |
|---|---|---|
| Framework | Python 3.12, Django 4.2, DRF 3.14 | Node, NestJS, TypeScript |
| Auth | dj-rest-auth + simplejwt (1h access / 30d refresh; 365d for admins), allauth, Google convert-token (drf-social-oauth2), Twilio SMS passcode, django-rest-passwordreset | JWT access/refresh with compatible lifetimes; Google sign-in; SMS passcode; password reset |
| Business logic | Django signals drive notifications, counters and status changes | Explicit domain services/events (no hidden signals) |
| Back office | Django admin (`/admin/`) | Moves into the new admin app (see `platform/back-office-operations`) |

## Data

- PostgreSQL (RDS). Naive datetimes in `Asia/Jerusalem` (`USE_TZ=False`).
- Target: same Postgres data, migrated to a new schema (ORM TBD: Prisma or TypeORM).

## Infrastructure

- AWS `eu-west-3`: Elastic Beanstalk (API, gunicorn ×3), RDS Postgres, SQS → Lambda → SendGrid
  (email), EventBridge Scheduler → reminders endpoint, Secrets Manager, CloudWatch.
- Terragrunt in `zikaron-basalon-be/infrastructure-live/` looks stale (develop only, Python 3.8 stack).
- CI: GitHub Actions security scans (gitleaks, TruffleHog); CodeBuild builds run **no tests**.

## Third-party services

Full report with cost drivers, list prices and savings: [third-party-services.md](third-party-services.md).

Google (OAuth, Maps/Places, Geocoding, Sheets webhook), SendGrid, TexterChat (WhatsApp),
Twilio (SMS), ipapi.co (country detection), nagich.co.il (accessibility widget), GTM,
Easy (partner salon feed).

## Conventions

- Hebrew-first, RTL; English secondary.
- Phone numbers stored E.164 (`+972…`); Israeli validation accepts 07x prefixes.
- Known modernization debt: no tests anywhere, secrets/keys hard-coded in frontend
  sources and a Jenkinsfile, a production DB dump tracked in the backend repo.
