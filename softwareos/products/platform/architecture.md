# Architecture — Platform

> Product: [mission.md](mission.md) · Detail: [legacy-baseline/backend-discovery.md](legacy-baseline/backend-discovery.md) §3–§6, [legacy-baseline/frontend-discovery.md](legacy-baseline/frontend-discovery.md) §3

## Components

| Component | Responsibility |
|---|---|
| `users` app | Custom `User` (email login, `role`, communities), `EmailStatus` reminder flags, SMS `Passcode`, auth/profile views, **EventBridge reminder endpoint** |
| `hosts` app | `Host`, `HostSalon` (one event), `HostSalonTraining`, `HostSalonComments`, `HostSalonContent`; host & salon lists, teaming lists, public map, dashboards, Easy feed |
| `guests` app | `Guest`, `GuestSalon` (one registration per guest; OneToOne); salon-guests CRUD, dashboard |
| `witnesses` app | `Witness` CRM, `WitnessSalon` (availability slot), year comments, team comments; teaming, candidate search, CSV export/import, Google-Sheet webhook |
| `salon` app | `Salon` = the witness↔host-salon **assignment**; `SalonDay` (season days); reference data City/Country/Community/Language |
| `common` | Email (SQS), WhatsApp (TexterChat), templates model, permission matrix + role scoping, pagination, admin import/export |
| Django admin | Super-admin back office (roles, communities, salon days, trainings, templates, season-reset buttons) |
| Public SPA (`zikaron-basalon-fe`) | `/` auth · `/register/*` onboarding · `/site/host/:id/*` host area · `/site/salonSearch/*` map & table · `/site/guest/:id/*` guest area · `/accessibility` |

## Data Flow

1. **Register**: `POST /api/auth/registration/` (role host|guest) → User post_save creates `EmailStatus` (+ `Guest` for guests).
2. **Host onboarding**: `POST /api/hosts/` (status 3) → `POST /api/host_salons/` (status 5) → signals send `hosts_1` email + WhatsApp, and auto-create a `Salon` when no witness is needed.
3. **Guest joins**: `GET /api/host_salons_map/` → `POST /api/salonguests/` → capacity/openness check → approved → `guests_1` email + WhatsApp → counters and `is_open_for_guests` recomputed.
4. **Teaming** (admin product): assign through `POST/PATCH /api/salons/` → `hosts_2a–2e` email + WhatsApp to the host; the host later marks `host_contacted_witness`.
5. **Reminders**: EventBridge → `POST /api/eventbridge_tasks/eventbridge_send_reminders/` → 7 reminder types, 50 per run.
6. **Integrations**: Easy pulls the salon feed (Basic auth); Google Sheet pushes witness intake (encrypted token).

## Environments

- Prod and dev on AWS Elastic Beanstalk `eu-west-3` (env `zikaron-basalon-be-dev` seen); RDS Postgres; FE default API `https://dev.zikaronbasalon.com`, FE URL `https://app.zikaronbasalon.com`.
- Local: `IS_LOCAL=True` is required, or `common/emails.py` raises at import. No docker-compose exists despite the docs.
- Orthodox build: frontend-only (`REACT_APP_ORTHODOX_MODE=true`); the backend has no orthodox logic.

## Gotchas (rewrite-critical)

1. **Logic lives in signals.** Notifications, counters, registration status, `available_for_teaming` and guest denial all fire from Django signals. Map them all to explicit services ([api-permissions-and-notifications.md](legacy-baseline/api-permissions-and-notifications.md)).
2. **Deleting a `Salon` deletes its `HostSalon`**, which cascades and denies its guests. Unassigning a witness is `PATCH witness_salon=null`.
3. **Joining a salon deletes the guest's previous registration during validation** (one salon per guest). Stored guest counters are unreliable; the map recomputes them.
4. **Time-of-day buckets disagree.** Morning starts at 07:00 in some checks and 08:00 in others. All datetimes are naive Jerusalem time. Normalize deliberately and record the decision.
5. **Authorization gaps**: `/api/host_salons/` is unscoped (any host can edit any salon); witness comments and duplicate-validation are open to any user; any user can write cities; `export_communities` is unauthenticated; role conversion mutates data on GET; the public map cache can leak host contact details. **Do not replicate these.** Each fix is a recorded parity waiver.
6. **Front end**: `/site/*` has no route guard. There are two HTTP paths, and only one of them refreshes tokens. Tokens are stored JSON-quoted in `persist:auth`. Google OAuth sends the DRF client secret from the browser. Keys are hard-coded as fallbacks.
7. **Scattered magic windows** (30-day "future", 60/150-day assignment counts, 300-day salon-guests, current-year dashboards) must be preserved.
8. **No tests.** Build parity tests from the baselines before porting each area.
9. **Repo hygiene**: a ~26 MB production DB dump (`latest.dump`) is tracked in the private backend repo, and a Jenkinsfile in the FE has inline credentials. Neither may be carried into the new monorepo.
