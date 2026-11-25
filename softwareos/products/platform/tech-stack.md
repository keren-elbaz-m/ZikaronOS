# Tech Stack — Platform

> Product: [mission.md](mission.md) · Full evidence: [legacy-baseline/backend-discovery.md](legacy-baseline/backend-discovery.md) §2, [legacy-baseline/frontend-discovery.md](legacy-baseline/frontend-discovery.md) §2

## Legacy — backend (`zikaron-basalon-be`)

- Python 3.12.4, Django 4.2.16, DRF 3.14, PostgreSQL (psycopg2), `ATOMIC_REQUESTS=True`, naive datetimes (`TIME_ZONE='Asia/Jerusalem'`, `USE_TZ=False`).
- Auth: dj-rest-auth 6 (JWT), simplejwt 5.3 (HS256, 1h access / 30d refresh rotating; 365d for admin roles), allauth 0.57, django-oauth-toolkit + drf-social-oauth2 (Google `convert-token`), django-rest-passwordreset, Twilio SMS passcodes (4 digits).
- Messaging: DB email templates → SQS → Lambda (`email-lambda-sqs/`) → SendGrid; TexterChat WhatsApp (`WHATSAPP_ENABLED`); Twilio SMS.
- Misc: django-phonenumber-field, django-multiselectfield, django-import-export + openpyxl, drf-yasg (`/swagger/`), django-cors-headers (all origins), LocMemCache, `mpu` haversine distances.
- Runtime: gunicorn 3 workers on AWS Elastic Beanstalk (`eu-west-3`); postdeploy `migrate` + `collectstatic`; `GET /health`.
- Jobs: EventBridge Scheduler → Lambda → reminders endpoint; EB cron `once_a_hour_task` (inert).

## Legacy — frontend (`zikaron-basalon-fe`)

- CRA 3.2, React 16.14, TS 4.7 (strict off), MUI 4 + styled-components 4 + jss-rtl, redux + redux-saga + redux-persist, react-router 5, axios 0.19 + qs, react-hook-form 3 + yup, i18next 18 (he/en, orthodox overrides), moment + date-fns, Google Maps/Places, @react-oauth/google, react-share, react-csv.
- Served by an Express static server (`server.js`, `Procfile`), built in AWS CodeBuild (Node 12).
- Env: `REACT_APP_API_URL`, `REACT_APP_FE_URL`, `REACT_APP_GOOGLE_MAP_KEY`, `REACT_APP_GOOGLE_OAUTH2_KEY`, `REACT_APP_DRF_CLIENT_ID`, `REACT_APP_DRF_CLIENT_SECRET`, `REACT_APP_IPAPI_KEY`, `REACT_APP_ORTHODOX_MODE`.

## Target

- **API**: NestJS (TypeScript), Postgres (ORM TBD: Prisma/TypeORM), explicit domain events instead of Django signals, the same external providers (SendGrid, TexterChat, Twilio, Google).
- **Web**: Next.js App Router, React 19, Tailwind v4 + shadcn/ui, TanStack Query, react-hook-form + zod, RTL-first i18n (he/en + orthodox overrides as a build/runtime flag).
- **Monorepo**: pnpm + Turborepo (TBD), shared `contracts` package (zod schemas/types) used by api, web and admin.
- **Testing**: contract/parity tests against the legacy API behavior (none exist today).
