# zikaron-basalon-be — Backend Discovery (parity baseline for NestJS rewrite)

Repo: `/Users/kerene/Documents/GitHub/zikaron-basalon-be` (branch `main`, last commit 2026-05-24, ~969 commits, MoveoTech).
All citations are `file:line` relative to the repo root. Env var values were not read (the `.env` file is deny-listed); only names from `zikaronBasalon/settings.py` are listed.

---

## 1. Mission

Zikaron BaSalon ("Remembrance in the Living Room") is a Holocaust-remembrance platform. Around Yom HaShoah each year, private **hosts** (individuals or organizations) open their living rooms — or a digital/Zoom room — for a **salon** (a gathering). Staff and volunteers **match ("team") a witness** — a Holocaust survivor, a 2nd/3rd-generation descendant, an expert, or other speaker — to each salon that wants one. Members of the public register as **guests** and join a salon from a public map. This Django backend is the system of record. It serves the public site (`zikaron-basalon-fe`: host/guest registration, salon map, guest sign-up, host salon management) and the staff admin (`zikaron-basalon-fe-admin`: witness CRM, host/salon lists, teaming, dashboards). It also runs a classic Django Admin (`/admin/`) for super-admin operations, exports, and bulk scripts. It sends transactional and reminder emails (SQS → Lambda → SendGrid) and WhatsApp messages (TexterChat), and exposes integrations for "Easy" (a salon listing feed) and a Google-Sheets webhook (witness intake).

---

## 2. Tech stack

| Area | What | Evidence |
|---|---|---|
| Language/runtime | Python 3.12 (`runtime.txt` = `python-3.12.4`; `.python-version` = pyenv venv `zikaron-basalon-venv-3.12`); EB platform "Python 3.12 running on 64bit Amazon Linux 2023" | `runtime.txt`, `.elasticbeanstalk/config.yml` |
| Framework | Django 4.2.16, Django REST Framework 3.14.0 | `requirements.txt` |
| Auth | `dj-rest-auth[with_social]==6.0.0` (login/register/user/password endpoints, `USE_JWT=True`); `djangorestframework-simplejwt==5.3.0` (JWT, HS256, 1h access / 30d refresh, rotate on refresh); `django-allauth==0.57.0` (account adapter; google + facebook providers installed); `django-oauth-toolkit==2.3.0` + `drf_social_oauth2==2.1.3` + `social_django` (Google OAuth2 token convert flow); `django-rest-passwordreset==1.0.0` (subclassed); `rest_framework.authtoken` installed | `settings.py:70-105,147-155,237-254,261-308` |
| DB | PostgreSQL (`psycopg2==2.9.9`), `ATOMIC_REQUESTS=True`, `CONN_MAX_AGE=0`; tests switch to SQLite file `mydatabase` when `'test' in sys.argv` | `settings.py:159-176` |
| Cache | `LocMemCache` (per-process, not shared across instances) | `settings.py:188-193` |
| Email | SendGrid via SQS + Lambda (`boto3==1.35.82`, `sendgrid==6.11.0`); `EMAIL_BACKEND = sendgrid_backend.SendgridBackend` configured but not used by app code (all mail goes through `send_to_sqs`) | `common/emails.py:21-43`, `settings.py:197-201`, `email-lambda-sqs/lambda_function.py` |
| SMS | Twilio (`twilio==8.11.1`) for 4-digit SMS login passcode | `users/views.py:110-117`, `settings.py:320-325` |
| WhatsApp | TexterChat REST API (`requests`, 3s timeout), gated by `WHATSAPP_ENABLED` | `common/texterchat_client.py`, `settings.py:365-369` |
| Geocoding | Google Geocoding API (only in Google-Sheet webhook), env `GOOGLE_API_KEY` read via `decouple.config` directly | `witnesses/views.py:720-743` |
| Distances | `mpu.haversine_distance` | `hosts/serializer.py:516`, `witnesses/serializer.py:448` |
| Phone fields | `django-phonenumber-field==7.3.0`, `phonenumbers` | models |
| Multi-select | `django-multiselectfield==0.1.12` (monkey-patched to default `max_length=255`) | `settings.py:34-45` |
| Admin import/export | `django-import-export==3.3.0`, `openpyxl` | `*/admin.py`, `common/admin_recources.py` |
| API docs | `drf-yasg==1.21.7` Swagger at `/swagger/` (public) | `zikaronBasalon/urls.py:27-49` |
| CORS | `django-cors-headers`, allow all origins + credentials | `settings.py:220-234` |
| Server | Gunicorn 21.2.0: `--bind :8080 --keep-alive 300 --timeout 300 --workers 3` (CLAUDE.md says 1 sync worker — the Procfile says 3) | `Procfile:1` |
| Hosting | AWS Elastic Beanstalk, region `eu-west-3` (Paris), env `zikaron-basalon-be-dev`; postdeploy hook runs `migrate` + `collectstatic` on leader; custom autoscaling alarms (CPU / RequestCount / NetworkIn/Out) | `.elasticbeanstalk/config.yml`, `.platform/hooks/postdeploy/01_django_migrate.sh`, `.ebextensions/scale-policies.config` |
| AWS services | SQS (email queue), Lambda (email consumer `email-lambda-sqs/`), Secrets Manager (SendGrid key for Lambda), EventBridge Scheduler → Lambda → HTTP POST reminders endpoint, CloudWatch | `docs/eventbridge-reminders.md`, `email-lambda-sqs/lambda_function.py:12-27` |
| IaC | `infrastructure-live/` Terragrunt (develop stage only): network, RDS Postgres 13.7 `db.t3.micro`, Elastic Beanstalk (solution stack "Amazon Linux 2 … Python 3.8" — stale), API Gateway, WAF, KMS, ACM, CloudFront (client), Cognito, Redis, Secrets Manager, CodePipeline/CodeBuild (`cicd`), security groups, access-log bucket. Likely a scaffold that does not match the live EB env | `infrastructure-live/_common/*.hcl`, `infrastructure-live/develop/env.hcl`, `account.hcl` |
| CI/CD | CodeBuild `buildspec.yml` / `buildspec-server.yml` (pip install only, **no tests run**); `buildspec-client.yml` (Node 12 `npm ci && npm run build`, `dist/apps/client` — a leftover frontend buildspec); GitHub Actions `security-scans.yml` (gitleaks + TruffleHog on push/PR to `main`/`dev`); Dependabot | `buildspec*.yml`, `.github/workflows/security-scans.yml`, `.github/dependabot.yml` |
| Legacy cron | `.ebextensions/my_cron.config` installs `*/10 * * * * manage.py once_a_hour_task` on the leader; the command is now inert (all sends and flag saves are commented out) | `.ebextensions/my_cron.config`, `.ebextensions/cron_job.txt`, `users/management/commands/once_a_hour_task.py` |
| Misc libs | `django-extensions`, `whitenoise` (installed, not in middleware), `redis` (unused), `eventlet`/`gevent` (unused), `tqdm` (commands), `langdetect` | `requirements.txt` |

---

## 3. Architecture

## Components

| Django app | Responsibility | Key files |
|---|---|---|
| `zikaronBasalon` | settings, root URLs, WSGI. Includes Py3.12/Django4 compat monkey-patches (`ugettext`, `python_2_unicode_compatible`, `Signal(providing_args)`, `conf.urls.url`) needed by old libs | `settings.py:16-68`, `urls.py:37-50` |
| `middleware.py` (root) | `HealthCheckMiddleware`: `GET /health` → `ok` (before routing) | `middleware.py:3-13` |
| `users` | Custom `User` (email login, role), `EmailStatus` (reminder flags), `Passcode` (SMS), auth views (login, SMS auth, password reset), profile endpoint, **EventBridge reminder endpoint** | `users/*.py` |
| `hosts` | `Host`, `HostSalon` (one salon/event), `HostSalonTraining`, `HostSalonComments` (staff notes), `HostSalonContent` (links); host and salon lists, teaming, map, dashboards, Easy feed | `hosts/*.py` |
| `guests` | `Guest`, `GuestSalon` (guest↔host salon registration); guest list, salon-guests CRUD, dashboard | `guests/*.py` |
| `witnesses` | `Witness` CRM, `WitnessSalon` (witness availability date slot), `WitnessYearComment`, `WitnessComments`; teaming list, relevant host salons, dashboard, CSV export/import, Google-Sheet webhook | `witnesses/*.py` |
| `salon` | `Salon` (assignment record HostSalon↔WitnessSalon), `SalonDay` (event days), reference data `City`, `Country`, `Community`, `Language`; communities CSV export | `salon/*.py` |
| `common` | `EmailSending` (SQS), `NotificationService` (email + WhatsApp), `TexterChatClient`, `EmailMessageTemplate` model, permission classes and role matrix, pagination, CSV/Excel admin actions, `decrypt_token`, `query_by_user_role`, admin event-year filter, import-export resources | `common/*.py` |
| `email-lambda-sqs` | AWS Lambda: consumes SQS records `{subject, html_content, from_email, to_email}` → SendGrid `Mail` | `email-lambda-sqs/lambda_function.py:30-59` |
| `templates/` | `emails/base_email.html` (wrapper for DB templates), legacy per-event HTML (he + `english/`), `reset_password.html` (still file-based), admin change-list templates with custom buttons | `templates/` |
| `notification_events.ts` | TS enum mirroring event codes (a reference for the frontend, not used by Python) | `notification_events.ts` |

**Roles** (`users/models.py:48-68`): `super admin`, `general admin` (Israel scope), `global admin` (non-Israel scope), `volunteer admin`, `host admin`, `testimonials admin` (community-scoped), `host`, `guest`, `witness`. Data-scoping rules (repeated per view, centralized in `common/common_functions.py:7-27`):
- super admin → everything
- general admin → `city__country__country_code='IL'`
- global admin → exclude IL
- volunteer/host/testimonials admin → `city__community__in=user.communities`
- host → own records
- otherwise → none

**Permission classes** (`common/utils.py`):
- `IsUserAccessAllows` (`:182-207`): requires authentication, then checks `user.role` against `user_permissions[view.basename]` (matrix at `:41-179`). It **allows** access when the basename is missing or not in the dict.
- `IsAccessAllowsHostSalon` (`:210-235`): DELETE uses the `hosts` roles; other methods use the `hosts_salons_list` roles.
- `IsAccessAllowsGuestSalon` (`:238-263`): `salon_guests` roles.
- `IsAccessAllowsSalon` (`:266-290`): GET/PATCH by `salons` roles; DELETE super admin only; PUT/POST object-level → false.
- `IsAccessAllowsEasySalonList` (`:292-305`): HTTP Basic auth against `EASY_INTEGRATION_USERNAME/PASSWORD`.
- `IsSuperAdmin` (`:307-321`).
- `HasAPIKeyPermission` (`:323-340`): `X-API-Key == EVENTBRIDGE_API_KEY`. It prints the received key to stdout on failure.

Global DRF defaults: `IsAuthenticated`. Auth classes, in order: OAuth2 (oauth-toolkit), simplejwt `JWTAuthentication`, Session, `drf_social_oauth2` SocialAuthentication (`settings.py:147-155`).

**Middleware order** (`settings.py:107-121`): CORS → Security → Session → Common → CSRF → Auth → allauth AccountMiddleware → Messages → XFrame → social_django exception → OAuth2TokenMiddleware → HealthCheck.

**Custom auth/crypto**
- `users/tokens.py:8-17` `CustomRefreshToken.for_user`: if `"admin" in role.lower()` the refresh token expiry becomes **365 days** (super/general/global/volunteer/host/testimonials admin).
- `users/token_serializers.py`: simplejwt obtain/refresh serializers use `CustomRefreshToken` (wired via `SIMPLE_JWT` settings, `settings.py:252-253`).
- `users/auth_views.py:5-25` `CustomLoginView` (dj-rest-auth LoginView): overrides the response to add `access`/`refresh` from `CustomRefreshToken` and sets JWT cookies (`auth-cookie`, `refresh-cookie`).
- `common/utils.py:491-524` `decrypt_token`: AES-256-CBC, base64 key, IV = first 16 bytes, PKCS7. Used only by the Google-Sheet webhook (`witnesses/views.py:752-765`), which compares the result with `GOOGLE_SHEET_KEY` via `hmac.compare_digest`. There is **no `encrypt_token`** in this repo; the encrypting side lives in the Google Apps Script.

**Signals** (registered in each app's `apps.py.ready`): see §6 for full behavior. Summary:
- `users/signals.py`: User pre/post_save (create EmailStatus, auto-create Guest, propagate full name to host salons); `reset_password_token_created` → reset email.
- `hosts/signals.py`: Host post_save (step 3, phone sync, flags); HostSalon pre/post_save (finish registration, Salon auto-create, primary language, hosts_1 email+WA, guests_8 on time change, open/close for guests); HostSalon pre_delete (deny guests).
- `guests/signals.py`: Guest post_save (phone sync); GuestSalon pre/post_save/post_delete (counters, guests_1/2/3/4, hosts_4/5, WA, open/close).
- `witnesses/signals.py`: Witness pre/post_save (year comment, delete future availability, available_for_teaming); WitnessSalon post_save/post_delete (available_for_teaming).
- `salon/signals.py`: Salon pre/post_save (hosts_2a–2e + WA on witness assignment, cancel_witness + WA on unassign, reminder-flag sync, assignment_time, available_for_teaming); post_delete (free the witness, **delete the HostSalon**).

**Management commands** (operator scripts; most are one-time migrations):
- Active/ops:
  - `once_a_hour_task` (legacy cron, inert)
  - `email_status` (sets all EmailStatus flags and `GuestSalon.host_received_approve_request_email` to True for end-of-season "stop spamming")
  - `should_ask_to_convert` (sets the flag True for all hosts/guests)
  - `igul_le_tova` (sets the flag True for all hosts/guests)
  - `witnesses/archive_witnesses` (yearly reset: every non-archived witness → `not_contact_this_year`, `want_to_participate_amount_salons=1`, `available_for_teaming=False`)
  - `witnesses/global_availability_all` (for non-IL or city-less witnesses: create WitnessSalon all-day slots for every SalonDay of the latest year, set `available_this_year`, `want…=3`, `available_for_teaming=True`)
  - `witnesses/special_to_comments` (copy `special_attention_text` into `WitnessComments`)
  - `witnesses/comments_migration` (WitnessYearComment → WitnessComments)
  - `common/populate_email_templates` (upserts `EmailMessageTemplate` rows)
  - `reset_host_salon_guests` (zero the counters, recompute `is_open_for_guests`)
  - `open_all_dates_in_year` (QA)
  - `check_double_teaming`, `print_witnesses_contact_details`, `fix_users_without_guest_instance`, `create_user_object_for_witness`
- Migrations (historical): `usermigration`, `hostsmigration`, `witnessmigration`, `citymigration`, `countrymigration`, `migratecities`, `commentsmigration`, `emaillanguagecreator`, `location_fixes`, `corona`, `temp`, `rest_users_selection`, `witness_availability`, `useremailstatus`, `idan_update_all_witnesses_to_leshimor`
- Fake data: `fakedataloading`, `deletefakedata`, `create_fake_hosts`, `create_fake_guests`, `create_witnesses_test`
- Django-admin buttons run several of these in background threads (see §6.10).

**Scheduled jobs**
1. **EventBridge reminders** (active): EventBridge Scheduler → Lambda → `POST /api/eventbridge_tasks/eventbridge_send_reminders/` with `X-API-Key`. The docs say `rate(20 minutes)` (`docs/eventbridge-reminders.md:9`); CLAUDE.md says every 10 minutes. The schedule itself lives in AWS, not in the repo. `BATCH_LIMIT = 50`, `DRY_RUN = False` (`users/views.py:166-167`); CLAUDE.md wrongly says 80. Full logic in §6.8.
2. **EB cron** `*/10` → `once_a_hour_task` (`.ebextensions/cron_job.txt`). Only logs; no side effects.

**Email Lambda** (`email-lambda-sqs/lambda_function.py`): reads env `SENDGRID_SECRET_NAME` and `AWS_REGION`, iterates `event['Records']`, sends via SendGrid, and re-raises on failure (SQS retry). **Bug:** `get_secret()` takes no argument but is called as `get_secret(secret_name)` (`:12` vs `:36`), so the committed version would raise a `TypeError`. The deployed Lambda probably differs from the repo.

**Settings / env var names** (`settings.py`, `common/emails.py`, `witnesses/views.py`, Lambda):
- Django/DB: `SECRET_KEY`, `DJANGO_DEBUG` (default True!), `DB_NAME`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PW`
- AWS/email: `IS_LOCAL`, `NODE_ENV`, `AWS_REGION`, `EMAIL_QUEUE_URL`, `SENDGRID_API_KEY`
- Integrations: `EVENTBRIDGE_API_KEY`, `DOMAIN` (frontend base URL used in email links, default `http://localhost:3000/`), `SOCIAL_AUTH_GOOGLE_OAUTH2_KEY`, `SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `EASY_INTEGRATION_USERNAME`, `EASY_INTEGRATION_PASSWORD`, `GOOGLE_SHEET_KEY`, `ENCRYPTION_GOOGLE_SHEET_KEY_B64`, `GOOGLE_API_KEY`
- WhatsApp: `TEXTERCHAT_PROJECT_ID`, `TEXTERCHAT_API_TOKEN`, `TEXTERCHAT_ACCOUNT_ID`, `WHATSAPP_ENABLED`
- Lambda: `SENDGRID_SECRET_NAME`, `AWS_REGION`, plus the Secrets Manager secret `SENDGRID_API_KEY`
- Constants: `SMS_AUTH_CODE_LEN=4`, `TIME_ZONE='Asia/Jerusalem'`, `USE_TZ=False`, `SITE_ID=1`, `DATA_UPLOAD_MAX_NUMBER_FIELDS=100000`, min password length 6, `ACCOUNT_EMAIL_VERIFICATION='none'`, `LOGIN_REDIRECT_URL` (old Heroku URL)

## Data Flow

1. **Registration**: FE → `POST /api/auth/registration/` (email, password1/2, role ∈ {host, guest}) → allauth adapter lowercases the email, sets role → User `post_save` creates `EmailStatus` (+ `Guest` if role=guest).
2. **Host onboarding**: `POST /api/hosts/` (user id, names, phone, is_org, org fields) → Host `post_save` sets `registration_status=3` and copies the phone to the User. Then `POST /api/host_salons/` → HostSalon `post_save`:
   - `registration_status=5`
   - `contact_name` = full name (non-org)
   - primary_language from the salon language
   - reset the training/event reminder flags
   - auto-create a `Salon` if no witness is needed
   - send the `hosts_1` email + WhatsApp (training/digital variants)
3. **Guest joins**: public map `GET /api/host_salons_map/` → guest `POST /api/salonguests/` (host_salon, guests_number) → validate capacity/openness → GuestSalon created `approved` → `guests_1` email + WhatsApp → counters update → `is_open_for_guests` recomputed. Host is notified later by the reminder job (`hosts_3`).
4. **Teaming (staff)**:
   - Staff browse `GET /api/host_salons_teaming/` and `/api/witnesses_teaming/`.
   - Candidate lists: `GET /api/host_salons/{id}/relevant_witnesses/` or `GET /api/witnesses/{id}/relevant_host_salons/`.
   - Assign: `PATCH /api/salons/{id}/` (set `witness_salon`), or `POST /api/salons/` (host_salon + witness_salon).
   - Salon `post_save` sends `hosts_2a/2b/2c/2d/2e` (email + WhatsApp) with witness contact details and updates the witness's `available_for_teaming`.
   - The host later marks `host_contacted_witness` via `PATCH /api/salons/{id}/` (host may patch only this field).
5. **Notifications**: `EmailSending.send_email_from_db(event_code)` loads `EmailMessageTemplate(event_code, lang, is_active)`, replaces `{{var}}`, wraps in `templates/emails/base_email.html`, then `send_to_sqs` → SQS → Lambda → SendGrid. A missing template means a silent skip with a console warning (`common/emails.py:106-109`). WhatsApp: `NotificationService.send_notification` → `TexterChatClient.send_template` (`POST https://{TEXTERCHAT_PROJECT_ID}.texterchat.com/server/api/v2/whatsapp/templates/send`). The phone comes from `user.host.phone` or `user.guest.phone`.
6. **Reminders**: EventBridge → endpoint → 7 reminder types (§6.8).
7. **Integrations in**: Easy pulls `GET /api/host_salons_for_easy_integration/` (Basic auth). Google Sheet posts witness intake to `POST /api/google_sheet_webhook/` (encrypted token header).

## Environments

- **Local**: `IS_LOCAL=True` makes `send_to_sqs` a no-op print. If `IS_LOCAL` is False and `AWS_REGION`/`EMAIL_QUEUE_URL` are missing, **module import raises `ValueError`** (`common/emails.py:21-25`), so the app won't boot. CLAUDE.md mentions a docker-compose with Postgres on 5433 + pgAdmin 5050, but **no docker-compose file exists in the repo**. `latest.dump` is a ~26 MB production pg dump that is **tracked in git** (`git ls-files` lists it). `.gitignore`'s last line is the malformed `.envlatest.dump` (missing newline), so **neither `.env` nor `latest.dump` is actually ignored**. `.env` is currently untracked, but it is one `git add .` away from being committed.
- **Tests**: `python manage.py test` → SQLite `mydatabase` (`settings.py:172-176`).
- **AWS EB `zikaron-basalon-be-dev`** (eu-west-3), deploys from `main` (`.elasticbeanstalk/config.yml`). CLAUDE.md describes 3 EC2 instances behind an ALB. `NODE_ENV` default `develop` is read but unused in Python logic. No separate prod config is visible in-repo; the `DOMAIN` env decides which frontend URL appears in emails.
- **Terragrunt** only defines a `develop` stage and appears out of sync with the real EB env (Python 3.8 stack, Cognito, Redis not used by code).

## Gotchas

1. **Naive datetimes**: `USE_TZ=False`, `TIME_ZONE='Asia/Jerusalem'`. All DB datetimes are naive local time. Code calls `make_aware` before `localtime` (`users/views.py:294-296`, `hosts/signals.py:166-168`).
2. **Inconsistent time-of-day buckets**:
   - morning = 07:00–11:59 in `common/utils.py:481-488` and `HostSalonSerializerForHost._is_time_compatible` (`hosts/serializer.py:748-755`)
   - morning = 08:00–11:59 in `HostSalonSerializer._is_time_compatible` (`hosts/serializer.py:347-354`), the filter backends (`hosts/filter_backends.py:27-32`) and `relevant_host_salons` (`witnesses/views.py:161-166`)
   - `common/utils.py:350-363` builds `MORNING_START_TIME` etc. via `datetime.combine(...).astimezone(UTC)` on a **naive** datetime, so the value depends on the server's OS timezone (UTC on EB, so effectively no shift). These are used by `relevant_witnesses` (`hosts/views.py:299-308`) and `SalonSerializer.validate` (`salon/serializer.py:103-143`).
   - The rewrite must reproduce or deliberately normalize these.
3. **Deleting a `Salon` deletes its `HostSalon`** (`salon/models.py:92-100` and `salon/signals.py:199-201`), which cascades GuestSalons (pre_delete marks them denied first). To unassign a witness, PATCH `witness_salon=null`; do not DELETE (super admin only).
4. **GuestSalon counters**:
   - On create (status defaults to `approved`), the code increments **`invites_pending_count`**, not confirmed (`guests/signals.py:70`).
   - Approved→denied decrements confirmed in post_save, then `instance.delete()` triggers post_delete, which (since status is now `denied`) does not decrement again. Approved deletions via DELETE decrement confirmed in post_delete.
   - The map's `invites_confirmed_count` is **recomputed** as the sum of `guests_number` (`hosts/serializer.py:498-500`) and pending is hard-coded 0 (`:494-496`). The stored counters are unreliable and the map ignores them, but the Easy feed's `guests_count` uses the stored counters (`hosts/serializer.py:578-579`).
5. **`SalonGuestsSerializer.validate` deletes the guest's existing GuestSalon as a side effect during validation** (`guests/serializer.py:235-237`). `GuestSalon.guest` is OneToOne, so a guest can be in one salon at a time and re-registering moves them. The create-time capacity check uses a count computed **before** the delete (`:211,214` vs `:239-241`).
6. **Map cache leak risk**: `HostSalonMapView.list` sets `should_cache=False` for authenticated users, then sets it back to `True` when the only params are city/date or none (`hosts/views.py:487-502`). An admin's response, which includes `host_phone`/`host_email`, can be cached under the public key and served to anonymous users for 300s (LocMem, per process). Caching only happens on non-paginated responses.
7. **HostSalonView has no per-role queryset scoping** (`hosts/views.py:216-231`). Any host can list, retrieve, PATCH or DELETE any HostSalon (DELETE allowed for the `hosts` roles, which include `host`). The only filter is `?host=`. The FE presumably passes `?host=<own id>`.
8. **WitnessCommentView has no permission class** beyond the default `IsAuthenticated` (`witnesses/views.py:411-423`), so any logged-in user (guest/host) can read or write witness comments by witness id. `WitnessDuplicateValidation` is also any-authenticated.
9. **CitiesView is a full `ModelViewSet` with `IsAuthenticatedOrReadOnly`** (`salon/views.py:81-118`), so any authenticated user can create, update or delete cities. `ExportCommutitiesAsCsv` is a plain Django `View` with **no auth** (`salon/views.py:277-305`).
10. **State-changing GETs**: `GET /api/hosts/{id}/change_host_to_guest/` and `GET /api/guests/{id}/change_guest_to_host/` (`hosts/views.py:189-203`, `guests/views.py:114-127`) mutate role and delete/recreate profiles.
11. **`SalonDayView.queryset` is evaluated at import time** (`salon/views.py:182`), so the `date >= today` filter is frozen at process start.
12. **`WitnessView.salons` compares with `'AVAILABLE_THIS_YEAR'`** (uppercase literal) while the stored value is `available_this_year`, so it **always returns `[]`** (`witnesses/views.py:145-148`).
13. **`HostSalonContentFilterSerializer.type` is required** (`hosts/serializer.py:1029`), so `GET /api/host_salon_content/` without `?type=` returns 400.
14. **hosts/signals pre_save never sets `_language` or `_host_salon_training`** (`hosts/signals.py:58-69` vs `:224-225`). On every HostSalon update, `primary_language` is recomputed, and `host_received_training_email` resets to False whenever a training is set. That re-arms the hosts_9 reminder after every edit; hosts_9 sends are currently disabled anyway.
15. **Host post_save always overwrites `user.phone = host.phone`** (even with None) (`hosts/signals.py:52-55`). Guest post_save does the same (`guests/signals.py:38-41`). `User.save` pushes the user phone into each host salon's `contact_phone` when it matched the previous phone or was empty (`users/models.py:107-120`).
16. **Disabled notifications still in code**:
    - `guests_6` and `hosts_9` reminders only flip flags (`users/views.py:251-276,300-324`)
    - `send_email_guests_7`, `send_email_volunteer_1..4` return immediately (`common/emails.py:533,571,579,592,605`)
    - Many legacy "e-mail sending N" blocks are commented out
17. **Missing DB templates silently skip email**. `populate_email_templates` does not seed `hosts_2d`/`hosts_2e` (`common/management/commands/populate_email_templates.py` event codes list). `reset_password` still uses a file template (`common/emails.py:130-138`).
18. **WhatsApp template names are hard-coded strings**, some with odd suffixes (`…new`, `…neww`). The salon-created WA uses the same template `hosts_with_host_salon_registration_not_digital_salonnew` for all 4 variants, with 1 or 2 vars (`hosts/signals.py:141,161,189,213`).
19. **`guests_8` email passes `guest_user.id` (a User id) as the URL id**, where other guest emails pass `guest.id` (`hosts/signals.py:314`).
20. **Google-Sheet webhook**:
    - hard-codes `User.objects.get(id=166434)` as the "system user" for comment authorship (`witnesses/views.py:915`), and stores the User object into a CharField (str(user) = email)
    - sets a non-field `witness.is_available_this_year` (`:856`)
    - logs "Webhook Started on Dev Server"
21. **`CustomTokenRefreshSerializer` (admin 365-day refresh) applies only to simplejwt's own refresh view.** `/api/auth/token/refresh/` (dj-rest-auth) uses `CookieTokenRefreshSerializer`, which extends simplejwt's base `TokenRefreshSerializer` (site-packages `dj_rest_auth/jwt_auth.py:7,74,99`). Rotated refresh tokens there use the default 30-day lifetime.
22. **Facebook**: the allauth provider is installed, but no social-core Facebook backend is in `AUTHENTICATION_BACKENDS` (`settings.py:261-267`). Only Google OAuth2 is effectively supported via `convert-token`.
23. **"Orthodox mode" does not exist in this backend.** There are no orthodox/haredi fields or logic (grep). Org types include religious categories only (`hosts/choices.py:80-81,100`). If the frontend has an orthodox mode, it's FE-only.
24. **`DJANGO_DEBUG` defaults to True** and `ALLOWED_HOSTS=['*']` (`settings.py:12-14`).
25. **"Year" windows are scattered magic numbers**: 30-day lookback for "future" salons, 60/150-day windows for counting witness assignments, 300-day window for salon-guests, `created_at__year=current_year` for dashboards. These must be preserved.
26. **`test` detection** (`'test' in sys.argv`) switches the DB to SQLite. `salon/tests.py` imports `Witness` from `salon.models` and would fail.
27. **Docs drift**: `BATCH_LIMIT` is 50 (code), CLAUDE.md says 80. Schedule: docs say 20 minutes, CLAUDE.md says 10. Gunicorn: Procfile has 3 workers, docs say 1.

---

## 4. Data model

DB table names are given where `db_table` is set. All PKs are `AutoField` int (`DEFAULT_AUTO_FIELD`) except `Country`.

### users (`users/models.py`)

**User** (`AbstractUser`, `username=None`, `USERNAME_FIELD='email'`) — `:44-120`

| Field | Type / constraints |
|---|---|
| email | EmailField **unique** |
| role | Char(255) choices: super admin, general admin, global admin, volunteer admin, host admin, testimonials admin, host, guest, witness |
| active | bool default True (separate from `is_active`) |
| communities | M2M → `salon.Community` (`related_name=user_communities`) |
| primary_language | Char(7) `Hebrew`/`English`, default Hebrew |
| recent_account_update | Date null |
| should_ask_to_convert | bool default True (set False on create by signal) |
| igul_le_tova | bool default True |
| confirm_policy | bool default False |
| phone | PhoneNumberField null |
| + AbstractUser | first_name, last_name, password, is_staff, is_superuser, is_active, last_login, date_joined |

- Property `full_name` = `"first last"`.
- `save()` syncs host salons' `contact_phone` (§3 Gotcha 15).
- Admin `UserForm.clean`: communities are allowed only for volunteer/host/testimonials/super admin (`users/admin.py:28-46`).

**EmailStatus** (OneToOne User `email_status`, CASCADE) — `:123-131`: `host_didnt_contacted_witness`, `host_not_completed`, `guest_received_notification`, `host_received_training_email`, `host_received_event_reminder_email` (all bool, default False). "True" means "already sent / don't send".

**Passcode** — `:134-137`: user FK (`passcodes`), `code` PositiveInt default `random_code()` (4 digits), `created_at`. No expiry is enforced.

Third-party tables in use: allauth `EmailAddress`, social_django `UserSocialAuth`, oauth2_provider tokens, `django_rest_passwordreset.ResetPasswordToken`, `authtoken`, `django_site`.

### common (`common/models.py`)

**EmailMessageTemplate** (`email_message_templates`): `event_code` Char(50); `language` `he`/`en` default he; `subject` Text; `content` Text (both use `{{var}}` placeholders); `is_active`; `created_at`; `updated_at`. **unique_together (event_code, language)**, with an index on the same.

### hosts (`hosts/models.py`, choices in `hosts/choices.py`)

**Host** (`hosts`)

| Field | Notes |
|---|---|
| user | OneToOne User `host`, CASCADE |
| is_org | bool |
| org_name | Char(255) |
| org_type | Char(100) choices `ORGANIZTION_TYPES` (~38 values, e.g. "Formal education", "IDF", "Company or office", "Non-profit or social organization", "Religious or synagouge and yeshiva organization", "Seminary", "Yeshiva", "Other"… `hosts/choices.py:103-145`) |
| phone | PhoneNumber null |
| active | bool True |
| created_at | Date auto |
| registration_status | SmallInt 1..5 (`FIRST_STEP=1 … FOURTH_STEP=4, FINISH_REGISTRATION=5`), default 1 |

**HostSalonTraining** (`host_salon_training`): `event_time` DateTime null; `address` Char(255); `house_number` PosSmallInt 0; `city` FK City null. Method `full_address()`. The sentinel address `"אני לא מעוניין להשתתף בהדרכת מארחים"` ("I don't want to attend host training") means "no training" (`hosts/signals.py:13`).

**HostSalon** (`host_salons`) — one gathering/event

| Field | Notes |
|---|---|
| host | FK Host `host_salons`, CASCADE |
| created_at | Date auto |
| contact_name | Char(255) (auto = user full name for non-org) |
| contact_phone | PhoneNumber null |
| org_branch | Char(255) |
| event_time | DateTime **required** (naive local) |
| hosted_before | bool |
| language | FK `salon.Language` null |
| city | FK City null, indexed |
| address | Char(255) |
| lng, lat | Decimal(20,15) default 0 |
| apartment_number | PosSmallInt default 0 (9999 = "-") |
| house_number | PosSmallInt 0 |
| floor | SmallInt 0 (9999 = "-") |
| easy_permission | bool ("easy and Waze permission") — include in the Easy feed |
| accessibility | MultiSelect {`Elevator`, `Wheelchair accessibility`} |
| survivor_needed | bool True (wants a witness) |
| is_open_for_guests | bool True (computed by signals) |
| evening_public | bool True (public listing) |
| max_guests | PosSmallInt null default 0 (0/None = unlimited in capacity checks) |
| stuff_free_text | Text(2000) |
| invites_pending_count, invites_confirmed_count | Int |
| is_digital | bool |
| contacted | bool (staff contacted host) |
| preparation_evening | bool |
| special_attention | bool |
| special_attention_text | Char(255) |
| special_population | bool |
| site_link | Char(256) null (Zoom/site link) |
| comments_for_guests | Text(2000) |
| volunteer | FK User SET_NULL, limited to admin roles except super |
| host_salon_training | FK HostSalonTraining null |

Index `hostsalon_main_filter_idx (event_time, is_open_for_guests, evening_public, host)`.

**HostSalonComments** (`host_salon_comments`): host_salon FK (`host_salon_comment`); `created_at` (auto_now); `comment` Text(2000); `created_by` Char (full name).

**HostSalonContent** (`host_salon_contents`): `headline` Text(20); `description`; `link` URL; host_salon FK (`host_salon_contents`); `type` ∈ {Testimony, Sharing, Discussion}. **unique_together (link, host_salon)**.

### guests (`guests/models.py`)

**Guest** (`guests`): user OneToOne `guest`; `phone`; `active`; `created_at`; `city` FK null; `address`; `lng`/`lat`; `registration_status` ∈ {1, 2} (2 = finished); `received_register_reminder_email` bool.

**GuestSalon** (no db_table → `guests_guestsalon`)

| Field | Notes |
|---|---|
| guest | **OneToOne** Guest `guest_salons` (one registration per guest, ever, until deleted) |
| host_salon | FK HostSalon `guest_salons` |
| status | Char(10) default `approved`; values `approved`/`pending`/`denied` (constants only, no `choices=`) |
| guests_number | Int 1..3 (validators) |
| created_at | Date |
| host_received_approve_request_email | bool |

### witnesses (`witnesses/models.py`, choices `witnesses/choices.py`)

**Witness** (`witnesses`)

| Field | Notes |
|---|---|
| user | OneToOne User `witness_user` null |
| languages | M2M Language |
| city | FK City PROTECT null |
| first_name, last_name | Char(255) |
| address | Char |
| lng/lat | Decimal |
| apartment_number | PosSmallInt null |
| house_number | Int null |
| special_attention_text | Char(255) |
| witness_type | `holocaust_survivor`, `generation_2`, `generation_3`, `expert`, `other` (migration 0041 merged `generation_3_4` → `generation_3`) |
| email | Email |
| phone_number | Char(100) (landline, free text) |
| mobile_number | PhoneNumber |
| stairs | bool **required** (can climb stairs) |
| accessibility_need | {wheelchair, treadmill} |
| special_needs | Char(1000) |
| special_population | MultiSelect {Teenagers and children, Soldiers, Companies and organizations, No selection} default No selection |
| special_population_text | |
| created_at / updated_at | Date auto_now_add (updated_at never auto-updates) |
| availability_status | `not_contact_this_year` (default) / `did_not_answer` / `available_this_year` / `not_available_this_year` |
| available_for_teaming | bool (derived by signals) |
| last_call_date | Date |
| call_again_free_text, not_interested_this_year_free_text | |
| archived | bool |
| archived_reason | deceased / physical limitation / not interested / other (default other) |
| archived_free_text | |
| contact_name / phone / relation / email | relative or contact person |
| unsuccessful_contact_date | DateTime |
| hosted_before | bool |
| how_brought | |
| witness_details_free_text | Char(2000) |
| site_link | |
| country_of_birth | |
| date_of_birth | |
| want_to_participate_amount_salons | PosSmallInt 1..9 default 1 |
| witness_inside_information | |
| created_by | Char (full name) |
| volunteer | FK User admin roles (not super), validated in `clean()` |
| can_use_zoom | bool |
| take_part_in_additional_programs | MultiSelect {Life story, Fulfillment routes, Holiday events, Happy to talk, No selection} |
| witness_presentation_details | Char(2000) (paragraph shown on the public map) |

`save()` (`:101-119`):
- archived toggled off → reset `archived_reason=other` and `archived_free_text`
- archived toggled on → `availability_status=not_contact_this_year`
- leaving `not_available_this_year` clears `not_interested_this_year_free_text`
- leaving `did_not_answer` clears `call_again_free_text`

**WitnessSalon** (`witness_salons`) — an availability slot: witness FK `witness_salons`; `salon_date` Date; `can_morning` / `can_afternoon` / `can_evening` bools. "Assigned" = has a reverse `salon` (OneToOne from Salon).

**WitnessYearComment** (`witness_year_comments`): witness FK; `comment_year` 2000..(year at import time — the validator max is frozen at process start); `comment` Text(1500).

**WitnessComments** (`witness_comments`): witness FK `witness_comment`; `created_at`; `comment` Text(2000); `created_by` Char.

### salon (`salon/models.py`)

| Model | Fields / rules |
|---|---|
| **Country** | `country_code` Char(2) **PK**, `name` |
| **Community** (`community`) | `name` unique. `NO_COMMUNITY_TYPE='1'` sentinel used in dashboard filters |
| **City** | `name`; `google_id` **unique** (Google Places id); `country` FK PROTECT; `community` FK PROTECT null. `save()` ensures a "No Community" row exists and assigns it when community is null (`:38-44`). Cities are created on the fly from `{city_name, google_city_id, country}` in host salon/guest/witness payloads via `salon/utils.create_or_update_city` (get_or_create by google_id) |
| **Language** (`languages`) | `name` unique ("Hebrew"/"עברית" used to detect the Hebrew primary language) |
| **Salon** | `host_salon` OneToOne HostSalon `salon` CASCADE; `witness_salon` OneToOne WitnessSalon `salon` null; `assignment_time` Date auto_now_add (reset by signal on assignment); `host_contacted_witness` bool; `assigned_by` Char (full name of assigning admin, '' when unassigned). `clean()`: host and witness dates must match. `delete()`: witness `available_for_teaming=True`, then **deletes the host_salon** |
| **SalonDay** | `date` unique; `default_for_year` bool (one per year, enforced in `clean()`, called from `save()`); `day_type` ∈ {erev_yom_shoa, yom_shoa, yom_hol} (default `1` — invalid literal) |

### Relationship summary

- `User 1–1 Host 1–N HostSalon 1–1 Salon 0..1–1 WitnessSalon N–1 Witness (0..1–1 User)`
- `User 1–1 Guest 1–1 GuestSalon N–1 HostSalon`
- `HostSalon N–1 City N–1 Country`, `City N–1 Community M–N User(admins)`
- `HostSalon N–1 Language`, `Witness M–N Language`
- `HostSalon N–1 HostSalonTraining N–1 City`

---

## 5. API inventory

All under `/api/` unless noted. Auth header `Authorization: Bearer <access>`. "Router" = DRF `SimpleRouter` (paths need a trailing slash). Default pagination class `PostPagePagination` (page_size 15, `?page=`); most list views toggle pagination with `?pagination=` (semantics differ per view — noted). "Scope" refers to the role scoping in §3.

### 5.1 Infrastructure

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/health` | none | middleware returns `ok` |
| GET | `/swagger/` | none | drf-yasg UI |
| * | `/admin/` | Django staff session | Django Admin (§6.10) |
| static | `/static/` | — | `staticfiles_urlpatterns` |

### 5.2 Authentication & account (users app + third-party)

| Method | Path | View | Auth | Caller | Behavior |
|---|---|---|---|---|---|
| POST | `/api/auth/login/` | `CustomLoginView` (`users/auth_views.py`) | none | all | email+password. `CustomLoginSerializer` (`users/serializers.py:49-67`): if the user has an unusable password and a `google-oauth2` social auth → 400 `{"error":"social_account_only","message":…}`. The response adds `access`, `refresh` (admin refresh = 365d) and sets the `auth-cookie`/`refresh-cookie` cookies |
| POST | `/api/auth/logout/` | dj-rest-auth | — | all | clears cookies |
| GET/PUT/PATCH | `/api/auth/user/` | dj-rest-auth `UserDetailsView` w/ `CustomUserDetailsSerializer` | JWT | all | fields id, first_name, last_name, role, email, host{…}, guest{id,registration_status}, recent_account_update, confirm_policy, should_ask_to_convert, igul_le_tova, witness_user{…} |
| POST | `/api/auth/password/change/` | dj-rest-auth | JWT | all | |
| POST | `/api/auth/password/reset/`, `/api/auth/password/reset/confirm/` | dj-rest-auth (allauth) | none | — | stock; the FE uses `/api/password_reset/` instead |
| POST | `/api/auth/token/verify/`, `/api/auth/token/refresh/` | dj-rest-auth simplejwt | none | all | refresh rotates (see Gotcha 21) |
| POST | `/api/auth/verify_token/` | simplejwt `TokenVerifyView` | none | all | |
| POST | `/api/auth/registration/` | dj-rest-auth `RegisterView` + `CustomRegisterSerializer` | none | public | body: email, password1, password2, role ∈ {host, guest}. Duplicate email (case-insensitive) → 400 `{"error":"google_account_exists"…}` if that user has Google auth, else `{"error":"email_already_registered"…}` (`users/serializers.py:21-37`). Returns JWT. Email verification `none` |
| POST | `/api/auth/registration/verify-email/`, `resend-email/` | dj-rest-auth | none | — | unused (verification off) |
| POST | `/api/auth/convert-token` | drf_social_oauth2 `ConvertTokenView` | OAuth client_id | public | **Google login/register**: exchanges a Google access token (`backend=google-oauth2`) for an oauth-toolkit token (24h access / 7d refresh, `settings.py:279-286`). The user is created by social pipeline with an unusable password (role must be set later by FE) — *not verified in code beyond the defaults* |
| POST | `/api/auth/token`, `/api/auth/revoke-token`, `/api/auth/invalidate-sessions`, `/api/auth/invalidate-refresh-tokens`, `/api/auth/disconnect-backend`, `/api/auth/authorize`, `/api/auth/login/<backend>/`, `/api/auth/complete/<backend>/` | drf_social_oauth2 / social_django | varies | — | oauth-toolkit + social endpoints |
| * | `/api/accounts/…` | allauth.urls | — | — | allauth HTML views (login/signup/social) |
| POST | `/api/password_reset/` | `SocialAwareResetPasswordRequestToken` (`users/password_reset_views.py:35-76`) | none | public | `{email}` → 400 if no active user (case-insensitive). Reuses an existing token or creates one, then fires `reset_password_token_created` → reset email with link `{DOMAIN}/forgotPassword/{token}`. Works for Google-only users (sets their first password) |
| POST | `/api/password_reset/confirm/` | `SocialAwareResetPasswordConfirm` (`:79-123`) | none | public | `{token,password}` → 404 `notfound`/`expired`, validates the password (min 6), sets it, deletes all of the user's tokens. Expiry = `DJANGO_REST_MULTITOKENAUTH_RESET_TOKEN_EXPIRY_TIME` (library default 24h; the settings line `:309` is a no-op annotation) |
| POST | `/api/sms_authentication/auth/` | `PhoneAutenticationView.auth` (`users/views.py:91-118`) | none | witness/any | `{phone_number}` → finds the first User by `phone` (400 `phone number does not exists`), deletes old passcodes, creates a 4-digit code, sends SMS via Twilio `"Your Zikaron Basalon passcode is N."` |
| POST | `/api/sms_authentication/auth_with_code/` | `:120-141` | none | | `{phone_number, code}` → 401 `Authentication failed`, or `{token, refresh, user}`. The passcode is **not** deleted after use and has no TTL |
| POST | `/api/sms_authentication/change_password/` | `:143-162` | JWT | all | `{new_password}` validated, then set |
| GET | `/api/user_data/` | `UserProfileView.list` | JWT | all | returns `[self]` with `CustomUserDetailsSerializer` |
| PUT/PATCH | `/api/user_data/{id}/` | UpdateModelMixin | JWT | self | queryset is only self |
| POST | `/api/user_data/convert_user_selected/` | `:53-59` | JWT | host/guest | sets `should_ask_to_convert=False` |
| GET | `/api/user_data/igul_le_tova/` | `:62-69` | JWT | host/guest | returns `{"igul_le_tova": bool}` |
| POST | `/api/user_data/mark_igul_le_tova/` | `:71-76` | JWT | host/guest | sets `igul_le_tova=False` |
| POST | `/api/eventbridge_tasks/eventbridge_send_reminders/` | `EventBridgeView` (`users/views.py:170-455`) | `X-API-Key` | AWS Lambda | runs the reminder batch (§6.8). Response `{message, dry_run, batch_limit, total_eligible, total_processed, total_time_seconds, types:{code:{eligible,processed,time}}}`. Returns 500 `{error}` on exception |

### 5.3 Hosts & host salons (`hosts/urls.py`)

| Method | Path | View | Permission | Caller | Behavior / filters |
|---|---|---|---|---|---|
| GET | `/api/hosts/` | `HostView.list` (`hosts/views.py:75-161`) | `IsUserAccessAllows['hosts']` (super, general, global, volunteer, host admin, host) | admin, host | Scope: super all; general = has a salon in IL; global = excludes IL; volunteer/host admin = salon city in communities; host = self. Ordered `-created_at`. Filters (`HostsFilter` `hosts/filter_backends.py:37-103`): `has_salon`, `didnt_complete_registration` (status<5), `joined_this_year`, `is_org`, `is_digital`, `free_text` (first/last/community/email), `order_by` (any field; `didnt_complete_registration`→registration_status), `reverse`. Annotates `is_digital` ∈ {'', 'True', 'False', 'digital_and_phys'}. Paginated unless `pagination=false`; adds `total_results` (unfiltered count). Serializer `HostListSerializer` (id, email, created_at, user, full_name, first/last, is_org, is_digital, org_name, org_type, phone, active, host_salons(count), community, city (first salon's), didnt_complete_registration, recent_account_update) |
| POST | `/api/hosts/` | `HostView.create` | same | host (onboarding) | body incl. `user` (id), first_name, last_name, phone (required), is_org, org_name, org_type… Updates the User's names first, then creates the Host |
| GET/PUT/PATCH | `/api/hosts/{id}/` | `HostSerializer` | same | host/admin | `phone` on read = `user.phone` |
| DELETE | `/api/hosts/{id}/` | `perform_destroy` | super admin only, else 403 | admin | |
| GET | `/api/hosts/{id}/summaries/` | `:182-187` | same | host | host salons with `event_time.year >= current year`: id, event_time, contact_name, witness_id, is_open_for_guests, evening_public, site_link |
| GET | `/api/hosts/{id}/change_host_to_guest/` | `:189-203` | same | admin | atomic: role→guest, delete Host (cascades salons), delete/recreate Guest; returns Guest |
| GET | `/api/host_salons/` | `HostSalonView` (`:211-381`) | `IsAccessAllowsHostSalon` (`hosts_salons_list` roles; DELETE `hosts` roles) | host, admin | **no role scoping**; filter `?host=<id>`; ordered by event_time. Paginated (`RelevantPagination` 15) **only** if `pagination=true`. Serializer: `HostSalonSerializerForHost` for role host, else `HostSalonSerializer` (adds `witness_full_name`, `witness_type` when assigned; city_name, google_city_id) |
| POST | `/api/host_salons/` | | same | host | creates a salon (accepts `city_name`, `google_city_id`, `country` → City get_or_create). Triggers the HostSalon post_save chain (§6.2) |
| GET/PUT/PATCH/DELETE | `/api/host_salons/{id}/` | | same | host/admin | update validation codes 1001/1002/1003 (§6.2) |
| GET | `/api/host_salons/{id}/relevant_witnesses/` | `:253-352` | same (effective results only for admins; host → none) | admin | candidate witnesses for teaming (§6.5). Query: `filter_accessibility` (default true), `filter_language` (default true), `city` (multi). Paginated if `pagination=true`, else a list. Serializer `WitnessTeamingDetailedSerializer` with `distance` (km) |
| POST | `/api/host_salons/{id}/check_time_range/` | `:354-381` | same | host | body `{event_time:"HH:MM"}` → `{is_available: bool}` vs the assigned witness's slot (07:00 morning bucket); true if no witness. 400 on a bad format |
| GET | `/api/host_salons_teaming/` | `HostsSalonsTeamingView` (`:597-663`) | `IsUserAccessAllows['hosts_salons_teaming']` (super, general, global, volunteer, host admin) | admin | salons with `event_time >= today-30d`, `survivor_needed=True`, host registration finished; scoped. Filters (`HostsSalonsTeamingFilter`): city, community, is_digital, salon_assigned (single bool), availability_date[], availability_hour{morning,noon,evening}, language[], accessibility, special_population, free_text (contact/address/org/id), order_by=contact_name, reverse. Paginated **unless** `pagination` is present/truthy (inverted semantics). Adds `total_no_filters` |
| GET | `/api/host_salons_teaming/{id}/` | | same | admin | `HostsSalonsDetailedTeamingSerializer` (contact_phone fallback to user phone, is_assigned, distance) |
| GET | `/api/host_salons_map/` | `HostSalonMapView` (`:437-564`) | `IsAuthenticatedOrReadOnly` (**public**) | public, guest | upcoming (`event_time >= today`), `is_open_for_guests`, `evening_public`, host finished registration. Filters (`HostsSalonsMapFilter` `hosts/filter_backends.py:106-186`): city[], id, language[], available_places (max−confirmed−pending ≥ N), accessibility (Elevator/Wheelchair/Floor zero), is_digital, is_link_exists (true → digital, false → physical), date, time{morning,noon,evening}, free_text. Non-IL salons have address/lat/lng/city/apartment/floor stripped. `host_phone`/`host_email` only for super/general/global admin. `distance` from the guest's lat/lng. `day_type` from SalonDay. 5-minute LocMem cache (Gotcha 6). Paginated only with `pagination=true` (adds `total_no_filters`) |
| GET | `/api/host_salons_list/` | `HostSalonsListView` (`:383-434`) | `IsUserAccessAllows['hosts_salons_list']` | admin | salons `event_time >= today-30d`; scoped (general = IL **or digital**). Host role → `None` queryset (error). Filters (`HostsSalonsListFilter` `:205-339`): open_requests (has pending guest), city[], availability_date[], witness_assigned{do_not_need_witness, waiting_for_witness, witness_assigned}, contacted_witness, language[], contacted, first_salon (hosted_before=False), is_org, org_type, is_digital, no_link (digital & site_link null), community[] ('0' includes null community), special_attention, free_text (contact name/phone, user phone, address, org, email, special text), order_by {id, contact_name, city, organization, contacted, survivor_needed, witness_assigned, community}, reverse. Paginated unless `pagination` truthy. `SalonsSerializer` |
| POST/PUT/PATCH/DELETE | `/api/host_salons_list/…` | ModelViewSet | same | admin | writes via `SalonsSerializer` (email source `host.user.email` is writable — unusual) |
| GET/POST | `/api/host_salons/{host_salon_id}/comments/` | `HostSalonCommentsView` (`:666-691`) | `IsUserAccessAllows['host_salon_comments']` (admins except testimonials) | admin | staff notes, newest first; `created_by` = commenter full name. Scoped. Full CRUD on `/{id}/` |
| GET | `/api/host_salons_dashboard/` | `HostSalonsDashboardView` (`:694-746`) | `['hosts_salons_dashboard']` | admin | salons `event_time >= today-30d` and `created_at.year == current`; scoped; filters city[] (ids), community[] ('1' = no community). Returns `{total_salons, didnt_contacted, waiting_for_witness, digital_salon, not_digital_salon}` |
| GET | `/api/hosts_dashboard/` | `HostDashboardView` (`:749-807`) | `['hosts_dashboard']` | admin | hosts `active` with `last_login.year == current`; scoped; city[] by **name**, community[]. Returns `{total_hosts, total_is_org, total_didnt_create_salon_yet (status<4), total_attend_preperation_evening, total_was_hosts_before (created ≤ last year)}` |
| GET | `/api/host_salon_training/` | `HostSalonTrainingView` (`:810-813`) | `IsAccessAllowsHostSalon` | host | all trainings `{id, full_address, date, time}` (no future filter) |
| CRUD | `/api/host_salon_content/` | `HostSalonContentView` (`:816-842`) | `['host_salon_content']` | host, admin | scoped (host = own salons). Filters `type` (**required**), `host_salon`. Fields headline (≤20), description, link, host_salon, type |
| GET | `/api/host_salons_for_easy_integration/` | `HostSalonListForEasyIntegration` (`:566-594`) | HTTP Basic (Easy creds) | Easy (external) | upcoming, open, public, finished, `easy_permission=True`, IL only; map filters apply. Fields id, event_time, salon_name, lat/lng, is_organization, city_name, address, language_name, floor/apartment ('-' for 9999), guests_count (pending+confirmed stored), max_guests, is_digital, site_link, accessibility, comments_for_guests, `link = DOMAIN + "site/salonSearch/mapview/{id}"`, email (host) |

### 5.4 Guests (`guests/urls.py`)

| Method | Path | View | Permission | Caller | Behavior |
|---|---|---|---|---|---|
| GET | `/api/guests/` | `GuestView` (`guests/views.py:40-127`) | `['guests']` (super, general, global, volunteer, guest) | admin, guest | Scope: super all; general = guest city IL, no city, or salon in IL; global = complex non-IL rule (`:68-73`); volunteer = guest city community; guest = self. Filters (`GuestsFilter`): status ∈ {approved_this_year, none_this_year, total_approved}, didnt_complete_registration, guests_number, city (salon city id), community (salon city community id), free_text (salon contact/email/first/last), order_by {status, salon_name, city, guests_number, community, first_name, didnt_complete_registration, or raw}, reverse. Paginated only if `pagination=true`; adds `total_no_filters` |
| POST | `/api/guests/` | `perform_create(user=request.user)` | | guest | (Guest is normally auto-created by the User signal) |
| GET/PUT/PATCH | `/api/guests/{id}/` | `GuestSerializer` | | guest | first/last/phone required on PUT; city via city_name/google_city_id/country; on update forces `city = City.objects.first()` if null before applying (`guests/serializer.py:96-101`). Output: status/guests_number/salon_name (first word of contact_name)/community from the GuestSalon |
| DELETE | `/api/guests/{id}/` | | super admin only | | |
| GET | `/api/guests/{id}/change_guest_to_host/` | `:114-127` | | admin | role→host, delete Guest (and existing Host), create Host |
| GET | `/api/salonguests/` | `SalonGuestsView` (`:132-203`) | `IsAccessAllowsGuestSalon` (super, general, global, volunteer, guest, host) | host, guest, admin | GuestSalons created in the last 300 days; scope: super/general all; host = own salons' guests; guest = own; global non-IL; volunteer community; host/testimonials admin none. Filters `salon` (host_salon id), `guest`. If `guest` is in the query → `SalonGuestSerializer` (rich salon details for the guest's "my salon" page: address, lat/lng, accessibility, salon_time, languages, max_guests, floor, apartment, counts, is_org, org_name, host_name, salon_phone, is_digital, host_email, day_type, is_open_for_guests, site_link, comments_for_guests, country, salon_witness_name/type); else `SalonGuestsSerializer` (id, host_salon, guest, status, guests_number, created_at, email, name, phone, comments_for_guests). No pagination class set (default none) |
| POST | `/api/salonguests/` | `perform_create` | | guest | body `{host_salon, guests_number}` → saved with `status='approved'`, guest = request.user's Guest. Validation §6.3 |
| PATCH | `/api/salonguests/{id}/` | | | host (status), guest (guests_number) | role-restricted field edits (§6.3) |
| DELETE | `/api/salonguests/{id}/` | | | guest/host/admin | triggers post_delete (hosts_4 email if approved & future) |
| GET | `/api/guests_dashboard/` | `GuestDashboardView` (`:206-274`) | `['guests_dashboard']` (admins) | admin | `{total_guests, total_didnt_finish_registration_this_year, total_without_salon_this_year, total_with_salon_this_year, total_with_salon_other_year, total_with_salon}` with this-year definitions at `:252-266`; city[] by name, community[] |

### 5.5 Witnesses (`witnesses/urls.py`)

| Method | Path | View | Permission | Caller | Behavior |
|---|---|---|---|---|---|
| GET | `/api/witnesses/` | `WitnessView` (`witnesses/views.py:55-289`) | `['witnesses']` (super, general, global, volunteer, testimonials, host, witness) | admin; host | Scope: super all; general IL; global non-IL; volunteer/testimonials community; **host = witnesses assigned to the host's salons**; others none. Filters (`WitnessFilter` `witnesses/filter_backends.py:21-167`): no_archived, can_use_zoom, witness_status (statuses + `host_assigned` this year; including `available_this_year` also requires available_for_teaming), free_text, city[], witness_type[], language[], not_interested_this_year, special_attention, community[], hosted_before, host_assigned_this_year, availability_date[], available_morning/noon/evening, take_part_in_additional_programs, order_by {id, first_name, city, hosted_before, host_assigned, community}, reverse. Paginated by default; `pagination=false` disables; adds `total_no_filters`. `WitnessListSerializer` (availability_status shows `archived` if archived; host_assigned) |
| POST/PUT/PATCH | `/api/witnesses/`, `/{id}/` | `WitnessSerializer` | same | admin | `created_by` = creator full name; city via the city_name trio; volunteer must be a non-super admin role; on update `want_to_participate_amount_salons` can't go below assigned salons in the last 60 days |
| DELETE | `/api/witnesses/{id}/` | | super or global admin only | admin | |
| GET | `/api/witnesses/{id}/salons/` | `:140-150` | | — | always `[]` (Gotcha 12) |
| GET | `/api/witnesses/{id}/details_for_host/` | `:152-157` | same | host | id, full_name, phone_number, mobile_number, city_name, witness_details_free_text, witness_type, site_link, witness_presentation_details |
| GET | `/api/witnesses/{id}/relevant_host_salons/` | `:159-281` | same | admin | candidate salons (§6.5). Query: `filter_accessibility`, `filter_language` (default true), city[], `pagination` (presence → paginated, with `total_results`). `HostsSalonsDetailedTeamingSerializer` with distance |
| GET | `/api/witnesses/take_part_in_additional_programs/` | `:283-289` | same | admin | `[{name}]` choice labels |
| GET | `/api/witnesses_teaming/` | `WitnessTeamingView` (`:292-354`) | `['witnesses_teaming']` (super, general, global, volunteer, testimonials) | admin | non-archived, available_for_teaming, and (not_contact_this_year OR available_this_year with a slot date > today-30); scoped; `-id`. Filters (`WitnessTeamingFilter`): city[], witness_status{not_contact_this_year, assigned, waiting_for_first_assignment, waiting_for_more_assignments}, availability_date[], availability_hour, language[], accessibility[] (accessibility_need), special_population[], free_text, order_by=first_name, reverse. Paginated unless `pagination` truthy. `teaming_status` computed (§6.5) |
| GET | `/api/witnesses_teaming/{id}/` | | same | admin | detailed with future unassigned slots and phone (mobile E.164 or landline) |
| CRUD | `/api/witnesses/{witness_id}/witnesses_availability_salons/` | `WitnessSalonView` (`:357-395`) | `['witnesses_availability_salons']` (admins except host admin) | admin | **unassigned** slots with `salon_date > today-30`. Create validation §6.4 |
| POST | `/api/witnesses/{witness_id}/witnesses_availability_salons/bulk_update_witness_salon_list/` | `:371-395` | same | admin | body `{salons_to_delete:[ids], salons:[{id?,salon_date,can_*}]}`: delete listed, update by id (partial), create others; returns the refreshed list |
| CRUD | `/api/witnesses/{witness_id}/witness_year_comments/` | `WitnessYearCommentView` | `['witness_year_comments']` | admin | |
| CRUD | `/api/witnesses/{witness_id}/witness_comments/` | `WitnessCommentView` | **IsAuthenticated only** | admin | newest first; created_by = full name |
| POST | `/api/witnesses_duplicate_validation/` | `WitnessDuplicateValidation` (`:426-441`) | IsAuthenticated | admin | `{phone_number (E.164), phone_type ∈ {mobile_number, phone_number}}` → 400 `{names:[…]}` if any witness has it, else 200 `null` |
| GET | `/api/witnesses_dashboard/` | `WitnessesDashboardView` (`:444-499`) | `['witnesses_dashboard']` | admin | non-archived, scoped; `{total_witnesses, total_holocaust_survivors, total_generation_2, total_generation_3, total_experts, total_other, total_waiting_for_conservation (not_contact), total_waiting_for_assignment (available & available_for_teaming), total_waiting_for_contact (did_not_answer)}` |
| GET | `/api/export_witnesses` (no trailing slash) | `ExportWitnessesAsCsv` (`:504-568`) | super admin | admin | UTF-8-BOM CSV of non-archived witnesses with Hebrew headers (id, first/last name, type (Hebrew label), landline, mobile, email, city, address, apartment, languages, country of birth, DOB, site link, details, `פסקה למפת סלונים` ("paragraph for the salon map", = presentation details)) |
| POST | `/api/import_witnesses_presentation_details/` | `ImportWitnessesPresentationDetails` (`:571-718`) | super admin | admin | multipart `file` (.csv, UTF-8). Needs an `id`/`ID`/`Id` column and a `פסקה למפת סלונים`/`witness_presentation_details`/`Witness Presentation Details` column; ≤2000 chars. Response summary + per-row results; 200 all OK / 207 partial / 400 all failed |
| POST | `/api/google_sheet_webhook/` | `GoogleSheetWebhookView` (`:745-933`) | `X-Webhook-Token` AES-encrypted shared secret | Google Apps Script | witness intake upsert by phone (§6.6). Responses: 401 UNAUTHORIZED/INVALID_TOKEN, 400 NO_PHONE_PROVIDED/DUPLICATE_PHONE_FOUND, 404 WITNESS_NOT_FOUND, 200 `{status:"success", warnings:[CITY_NOT_FOUND]}` |

### 5.6 Salon / reference data (`salon/urls.py`)

| Method | Path | View | Permission | Caller | Behavior |
|---|---|---|---|---|---|
| GET | `/api/salons/` | `SalonsView` (`salon/views.py:31-78`) | `IsAccessAllowsSalon` (`salons` roles: super, general, global, volunteer, testimonials, host) | admin, host | host = own salons; others **all** (no geo scoping). Filter `witness`. Unpaginated in practice (no pagination_class) |
| POST | `/api/salons/` | `SalonSerializer` | has_permission only (object-level not checked on create) | admin | create an assignment (host_salon, witness_salon); `assigned_by` = creator name; date/time validation (§6.5) |
| GET/PATCH | `/api/salons/{id}/` | | GET/PATCH roles | admin, host | host may PATCH only `{host_contacted_witness}` (exactly 1 key). PATCH `witness_salon` (set/null) = assign/unassign; `assigned_by` set or cleared |
| PUT | `/api/salons/{id}/` | | object-level denies PUT | — | 403 |
| DELETE | `/api/salons/{id}/` | | super admin | admin | **deletes the HostSalon too** |
| GET | `/api/salons/witness_past_salons/?witness=` / `witness_future_salons/?witness=` | `:44-61` | same | admin | by `witness_salon.salon_date` < / ≥ now |
| CRUD | `/api/cities/` | `CitiesView` | IsAuthenticatedOrReadOnly | public, admin | volunteer/testimonials admin → community cities. `free_text` icontains (replaces the base queryset!). Super admin `local=true/false` → IL / non-IL |
| GET | `/api/languages/` | `LanguagesView` | public read | all | `{id,name}` |
| CRUD | `/api/communities/` | `CommunityView` | IsAuthenticated; queryset raises 403 for non-admins | admin | super all; general = communities with IL cities; global = non-IL; volunteer/host/testimonials = own |
| GET | `/api/communities/{id}/volunteers_list/` | `:168-172` | same | admin | users in the community `{id, full_name}` |
| GET | `/api/salondays/` | `SalonDayView` | public read | all | SalonDays with `date >= (process start date)`; `{id,date,day_type,default_for_year}` |
| GET | `/api/salondays/default-day/{yyyy}/` | `:183-193` | public | all | the default day for a year or 404 `{error}` |
| GET | `/api/export_communities` | `ExportCommutitiesAsCsv` | **none** | Django admin button | CSV: one column per community name, rows = city names |

---

## 6. Business rules

### 6.1 Accounts & roles
- Self-registration is limited to `host` or `guest` (`users/serializers.py:19`). Admin roles are assigned only via Django Admin.
- Emails are matched case-insensitively. The adapter lowercases on save (`users/adapter.py:8-23`). Duplicate signup returns machine-readable error codes (`google_account_exists`, `email_already_registered`).
- Password login for a Google-only account → `social_account_only`. Such users can set a password through `/api/password_reset/` (spec `agent-os/specs/2026-04-15-1530-google-auth-account-merging/`).
- On user creation (`users/signals.py:25-47`): create `EmailStatus`; if role=guest create `Guest(registration_status=1)`; force `should_ask_to_convert=False`, `igul_le_tova=True`. On update: a guest without a Guest gets one; for a non-org host, a full-name change updates all of the host's salons' `contact_name`.
- Admin JWT refresh lifetime is 365 days; others 30 days; access 1h.
- `should_ask_to_convert` / `igul_le_tova` are UI prompt flags. A yearly admin button resets them to True for all hosts and guests; endpoints let the user dismiss them. `should_ask_to_convert` likely prompts a past guest/host to convert role for the new season — inferred from the name and the `change_*` endpoints. `igul_le_tova` ("Igul LeTova", the name of a rounding-up donation program) — FE prompt.
- Role conversion host↔guest via the `change_host_to_guest` / `change_guest_to_host` GET actions (destructive: deleting a Host cascades its salons).

### 6.2 Host onboarding & salon lifecycle
- **Registration steps**:
  - `Host.registration_status` 1 → set to **3** when the Host is created (`hosts/signals.py:33-34`), with `host_not_completed=True` (stops the hosts_6b reminder).
  - Creating a HostSalon while status ≤3 → **5 FINISH_REGISTRATION** (`hosts/signals.py:88-91`).
  - Only finished hosts appear on the map, in teaming, and in the Easy feed.
  - If the host is an org, `primary_language='Hebrew'` (`:30-32`).
- **Salon creation side effects** (`hosts/signals.py:72-215`):
  - user `primary_language` = Hebrew if the salon language is "Hebrew"/"עברית", else English
  - if `survivor_needed=False` → auto-create a `Salon` with no witness (counts as "assigned/not needed")
  - non-org → `contact_name` = user full name
  - if `contact_phone` is set and neither host nor user has a phone → copy it to both
  - `recent_account_update = now`
  - reset `host_received_event_reminder_email` and `host_received_training_email` to False
  - send `hosts_1` email + WhatsApp — see 6.7
- **Salon update rules** (admin `HostSalonSerializer.validate/update` `hosts/serializer.py:244-378`; host `HostSalonSerializerForHost.validate` `:758-799`):
  - With an assigned witness, the **date cannot change** → error code `1001`.
  - New time must fit the witness slot's morning/afternoon/evening → `1002`. Host variant checks only if the time actually changed and uses a 07:00 morning start; admin variant 08:00.
  - `max_guests` < sum of registered `guests_number` → `1003` (admin) / `{"max_guests": …}` (host).
  - Admin: cannot set `survivor_needed=false` while a witness is assigned.
  - Host serializer: `event_time` required.
- **Post-update side effects**:
  - `site_link` changed → `guests_7` to approved guests (currently disabled).
  - `survivor_needed` flipped to False with no Salon → create a Salon.
  - `max_guests` changed → `is_open_for_guests = (registered != max_guests)`.
  - `event_time` changed → for each approved guest send the `guests_8` email + WhatsApp `guests_8_neww` (vars: guest first name, host full name, `dd/mm/YYYY HH:MM`).
- **Deletion**: pre_delete marks all guest registrations `denied` (`hosts/signals.py:339-343`) → GuestSalon post_save (approved→denied) sends the WhatsApp `guests_cancel`, the guests_3 email (if this year) and deletes the registration. Then cascade.
- A non-org one-salon-per-year limit exists only as commented code (`hosts/serializer.py:801-806`). **Not enforced.**

### 6.3 Guest registration & capacity
- One active registration per guest (`GuestSalon.guest` OneToOne). Registering again **deletes the previous registration during validation** (`guests/serializer.py:235-237`), which fires post_delete (hosts_4 to the old host if approved & future).
- **Create** (`guests/serializer.py:207-257`, `guests/views.py:195-203`):
  - salon must be `is_open_for_guests` and `evening_public`, else `{"host_salon":"This salon is not open for guests."}`
  - capacity: if `max_guests` is truthy and `guests_number + Σ registered guests_number > max_guests` → `{"guest":"There are not enough room…"}`
  - status forced to `approved` (no host approval step in the current flow; `pending` exists for legacy/admin edits)
  - `guests_number` 1..3
- **Update**: changing `guests_number` re-checks capacity. A guest cannot set `status` (`{"Permission Denied": "Guest can only update the max_guests field."}`). A host cannot set `guests_number`.
- **Counters and open flag** (`guests/signals.py`):
  - create: `invites_pending_count += n`
  - guests_number change: delta applied to confirmed (approved) or pending (pending), and the `hosts_5` email to the host
  - status transitions:
    - denied→approved: confirmed += n, `guests_2` email
    - denied→pending: pending −= n
    - approved→denied: confirmed −= n, WhatsApp `guests_cancel`, then **delete** the GuestSalon
    - approved→pending: confirmed −= n, pending += n
    - any approved→X: the `guests_3` email is sent only if the salon is this calendar year
    - pending→denied: pending −= n, `guests_4` email, **delete**
    - pending→approved: pending −= n, confirmed += n, `guests_2` email
  - After every save: `is_open_for_guests = (Σ guests_number != max_guests)`. Note: equality, not ≥, so overbooked salons reopen. post_delete uses `>=`.
- **Delete** (post_delete `guests/signals.py:235-281`): if approved and the event is in the future → `hosts_4` email to the host, confirmed −= n. If pending → pending −= n. Recompute open (≥). Reset the guest's `guest_received_notification=False`.
- On create: guest `primary_language` from the salon language; `guests_1` email (day, date, time, address, host email & phone, host display = org_name or full name) + WhatsApp `guests_1new` (first name, host name, host email, host phone); reset `guest_received_notification=False`.
- Guest profile: `registration_status` 1 → 2 is set by the FE via PATCH (no server logic). Dashboard "finished" = 2.

### 6.4 Witness CRM & availability
- **Availability slots** (`WitnessSalon`): date + morning/afternoon/evening flags. Create validation (`witnesses/serializer.py:291-316`):
  - reject if assigned future salons (`salon_date > today`) ≥ `want_to_participate_amount_salons` ("does not want participate in more salons this year")
  - reject a duplicate date within the last 150 days ("This date already exists…")
- `available_for_teaming` derivation (signals):
  - slot created → True (`witnesses/signals.py:67-71`)
  - slot deleted → True iff unassigned slots exist with date > today-150 (`:74-83`)
  - Witness save with a changed `want_to_participate_amount_salons` → True if status is `available_this_year` and assigned (150d) < wanted. Else `available_for_teaming` is **set False** when the max did not change (`:48-64`; the nested condition is effectively always true when reached)
  - Salon assignment/unassignment recomputes it (6.5)
- Status change side effects (`witnesses/signals.py:31-46`):
  - → `not_contact_this_year`: upsert `WitnessYearComment(year=now)` with `not_interested_this_year_free_text`
  - leaving `available_this_year`: on commit, delete all slots with `salon_date >= today`
- Model `save()` field resets: see §4 Witness.
- Update validation: `want_to_participate_amount_salons` must be ≥ salons assigned in the last 60 days.
- `volunteer` must be an admin role but not super admin.
- **Duplicate-phone checks**: `POST /api/witnesses_duplicate_validation/` (exact match on `mobile_number` or `phone_number`, returns names; FE warns before saving). The Google-Sheet webhook refuses when more than one witness matches either phone (`DUPLICATE_PHONE_FOUND`). There is no DB uniqueness on phones.
- **Yearly reset**: admin button "archive witnesses" (`archive_witnesses` command) sets every non-archived witness to `not_contact_this_year`, `want=1`, `available_for_teaming=False`. "Global availability all" opens all SalonDays of the latest year for non-IL witnesses.

### 6.5 Matching witnesses ↔ host salons ("teaming")
- **Relevant witnesses for a salon** (`hosts/views.py:253-352`):
  - role scope (super/general IL/global non-IL/volunteer community; others none)
  - `available_for_teaming=True`
  - has an **unassigned** slot on the salon's date
  - slot covers the salon's time bucket (UTC-converted constants)
  - if `filter_accessibility` and the salon has no Elevator and floor≠0 → witness `stairs=True`
  - if `filter_language` → witness speaks the salon language
  - digital salon → `can_use_zoom=True`
  - optional city[]
  - distance (km) from the salon
- **Relevant salons for a witness** (`witnesses/views.py:159-281`):
  - salons `event_time >= today-30`, finished hosts, `survivor_needed=True`, role-scoped
  - date ∈ the witness's unassigned slot dates and salon unassigned
  - time within any bucket the witness has *on any slot* (not per date)
  - accessibility (if the witness can't do stairs: Elevator, floor 0, or floor 9999)
  - language (icontains any witness language)
  - special population (salon.special_population=False always OK; True only if the witness selected a population)
  - non-zoom witness → non-digital salons
- **Assignment validation** (`salon/serializer.py:85-144`): date equality between host event and witness slot; time bucket must be allowed by the slot (`'salon': 'Host and witness salon time must be the same time'`). The model `Salon.clean` also checks the date.
- **On assignment** (`salon/signals.py:75-128`):
  - email by witness type: survivor → `hosts_2a`, gen2 → `hosts_2b`, gen3 → `hosts_2e`, expert → `hosts_2c`, other → `hosts_2d`
  - variables: witness name, phones, email, contact person name/phone/email/relation, host salon URL
  - WhatsApp templates `hosts_2anew` / `hosts_2b` / `hosts_2e` / `hosts_2cnew` / `hosts_2dnew` with 7 vars (LRM-prefixed phones)
  - `assignment_time = today`
  - witness `available_for_teaming = (assigned in last 150d < wanted)`
  - finally, if the witness has no unassigned slots (150d) → False
- **On unassignment** (`:129-162`): `cancel_witness` email + WhatsApp `cancel_witness`; recompute `available_for_teaming` for the previous witness; reset the host's `host_didnt_contacted_witness=False`.
- **Reminder flag sync**: Salon create resets `host_didnt_contacted_witness` to False; `host_contacted_witness=True` sets it True (`salon/signals.py:36-48`).
- **Teaming status labels**:
  - salons: `waiting_for_first_assignment` if no Salon, or survivor needed with no witness; else `assigned` (`hosts/serializer.py:605-612`)
  - witnesses: `not_contact_this_year`; other non-available statuses pass through; else by count of assigned slots in the last 30 days vs wanted → `waiting_for_first_assignment` / `assigned` (==) / `waiting_for_more_assignments` (<) (`witnesses/serializer.py:367-382`)

### 6.6 Google-Sheet witness intake (`witnesses/views.py:745-933`)
- Authenticate: decrypt the `X-Webhook-Token` header with `ENCRYPTION_GOOGLE_SHEET_KEY_B64` and compare to `GOOGLE_SHEET_KEY`.
- Find the witness by `phone_1`/`phone_2` against `mobile_number` or `phone_number`. If none match → 404 (no creation). If several match → 400 with names/ids.
- Fill empty phone slots with new numbers.
- Overwrite non-empty values for: first_name, last_name, email, country_of_birth, witness_type, not_interested_this_year_free_text, special_population, accessibility_need. Set date_of_birth.
- City by exact case-insensitive name; if found, update the address and geocode via Google (Israel). Else warn `CITY_NOT_FOUND`.
- `stairs = bool(data.stairs)`.
- `is_available_this_year`:
  - false → `not_available_this_year`, not teamable
  - true → `available_this_year`, teamable, `want_to_participate_amount_salons`, **delete all future slots**, then upsert slots from `availability_dates[{date, answer}]`, where the Hebrew answer text contains "שעות הבוקר" (morning hours) / "שעות הצהריים" (afternoon hours) / "שעות הערב" (evening hours)
- apartment_number; append `special_needs_new` to `special_needs` (≤1000); set languages from `language_ids`.
- Create `WitnessComments` "question - answer" for each non-empty answer, authored by user 166434 or the first superuser.
- Runs in a single transaction.

### 6.7 Notifications matrix (event → channel → template)

Email = DB template by `event_code` + language (`he` if `primary_language` is Hebrew), wrapped in `base_email.html`, from `זיכרון בסלון <info@zikaronbasalon.com>` (Hebrew) or `Zikaron Basalon <info@zikaronbasalon.com>` (`common/utils.py:18-23`). Links:
- host: `{DOMAIN}/site/host/{host.id}/salon`
- guest: `{DOMAIN}/site/guest/{guest.id}/salon`
- reset: `{DOMAIN}/forgotPassword/{token}`

WhatsApp = TexterChat template (language he/en), sent only if `WHATSAPP_ENABLED` and the user's host/guest profile has a phone (normalized to 972…).

| Trigger | Recipient | Email code | WhatsApp template (vars) | Source |
|---|---|---|---|---|
| HostSalon created with a training FK (4 variants: training yes/no × digital yes/no) | host | `hosts_1` (first_name, host_salon_url, + training time/address if training) | `hosts_with_host_salon_registration_not_digital_salonnew` ({1: full name} or {1: full name, 2: training dd/mm/YYYY HH:MM}) | `hosts/signals.py:117-215` |
| HostSalon created with **no** training FK | — | none | none | `:120-121` (early return) |
| Witness assigned (by type) | host | `hosts_2a` / `2b` / `2e` / `2c` / `2d` | `hosts_2anew` / `hosts_2b` / `hosts_2e` / `hosts_2cnew` / `hosts_2dnew` (7 vars) | `salon/signals.py:66-114` |
| Witness unassigned | host | `cancel_witness` | `cancel_witness` (first name, witness name) | `salon/signals.py:129-145` |
| Guest registered | guest | `guests_1` | `guests_1new` (4 vars) | `guests/signals.py:72-99` |
| Guest → approved (from pending/denied) | guest | `guests_2` | — | `guests/signals.py:131-141,190-205` |
| Guest approved → denied/pending (this year) | guest | `guests_3` | `guests_cancel` (approved→denied only) | `:144-177` |
| Guest pending → denied | guest | `guests_4` | — | `:178-189` |
| Guest number changed | host | `hosts_5` (old/new numbers) | — | `:107-122` |
| Approved guest removed (future event) | host | `hosts_4` | — | `:245-252` |
| Salon event_time changed | approved guests | `guests_8` | `guests_8_neww` (3 vars) | `hosts/signals.py:305-336` |
| Salon site_link set/changed | approved guests | `guests_7` (**disabled**) | — | `hosts/signals.py:247-256`, `common/emails.py:533` |
| Host profile updated & has salons | community volunteer admins + super admin | `volunteer_1` (**disabled**) | — | `hosts/signals.py:39-50` |
| Password reset requested | user | file `reset_password.html` (subject "שינוי סיסמא - זיכרון בסלון" (he: "Password change") / "Zikaron BaSalon - Reset Password") | — | `users/signals.py:74-81` |
| SMS login | user | — (Twilio SMS) | — | `users/views.py:110-117` |
| Reminders | see 6.8 | | | |

### 6.8 Scheduled reminders (EventBridge endpoint, `users/views.py:170-455`)
- One run processes the types **in this order** with a **shared budget of 50**. `eligible` is always counted. `DRY_RUN` logs only. Each send flips a one-time flag. Datetimes are naive "now".

| # | Code | Eligibility query | Action | Flag |
|---|---|---|---|---|
| 1 | `hosts_7` | HostSalon `survivor_needed`, Salon `host_contacted_witness=False`, `event_time > now`, `assignment_time < now−2d`, witness assigned, host flag False | email `hosts_7` + WhatsApp `hosts_7` {1: first name} (one per salon) | `EmailStatus.host_didnt_contacted_witness` |
| 2 | `guests_6` | salons with event in (now, now+2d]; approved GuestSalons created before event−2d; guest flag False | **flag only** (email/WA commented out) | `EmailStatus.guest_received_notification` |
| 3 | `hosts_9` | HostSalon with training `event_time` in [now, now+1d], host flag False | **flag only** (email/WA `hosts_9neww` commented) | `EmailStatus.host_received_training_email` |
| 4 | `hosts_6b` | User role=host, `date_joined < now−1d`, no Host row, flag False | email `hosts_6b` | `EmailStatus.host_not_completed` |
| 5 | `hosts_10` | HostSalon `event_time` in [now, now+5d], host flag False | email `hosts_10` | `EmailStatus.host_received_event_reminder_email` |
| 6 | `hosts_3` | GuestSalon approved, flag False, future event | email `hosts_3` to the host (guest full name) | `GuestSalon.host_received_approve_request_email` |
| 7 | `guests_9` | Guest with no GuestSalon, joined this calendar year and before now−2d, flag False | email `guests_9` | `Guest.received_register_reminder_email` |

- Flag resets that re-arm reminders:
  - new HostSalon → hosts_10 / hosts_9 flags
  - training changed → hosts_9
  - Salon created / witness unassigned → hosts_7
  - GuestSalon created/deleted → guests_6
- End-of-season "email status" admin button sets all flags True (stops reminders).

### 6.9 Public map & Easy feed rules
- Listed salons: `event_time.date >= today`, `is_open_for_guests`, `evening_public`, host finished.
- Non-IL salons hide address, coordinates, city, apartment and floor.
- Host contact appears only for super/general/global admins.
- Easy feed: additionally `easy_permission` and IL only.
- Witness name/type/presentation paragraph are exposed publicly once assigned.

### 6.10 Django-Admin-only operations (staff rely on these)

| Model admin | Capabilities |
|---|---|
| **User** (`users/admin.py:56-191`) | list_filter role/primary_language; search email/name; 1000/page; Passcode inline; actions **CSV Export**, **Excel Export** (all model fields); custom buttons **"run should_ask_to_convert"** and **"igul-le-tova"** (background thread → reset flags to True for all hosts/guests); add-user form with role/communities/primary_language |
| **EmailStatus** (`:196-251`) | list/filter flags; button **"user-email-statuses"** → `email_status` command: set **all** reminder flags True (EmailStatus 5 flags + `GuestSalon.host_received_approve_request_email`) |
| EmailAddress / OAuth RefreshToken / ResetPasswordToken / UserSocialAuth | "safe" admins tolerant of orphaned users (read-only-ish) |
| **EmailMessageTemplate** (`common/admin.py`) | edit email subject/body per event_code & language; filters language/is_active/event_code |
| **Host** (`hosts/admin.py:13-51`) | import-export action admin; export via `HostResource` (id, host_email, first/last, phone, is_org, org_name, active, created_at); filters active/is_org/registration_status |
| **HostSalon** (`:54-116`) | import-export; `HostSalonResource` export (id, host_email, event_time, is_digital, hosted_before, training, created_at, evening_public, city name, address, house, floor, lng, lat, easy_permission, special_attention(+text), max_guests, special_population, org_branch, contact name/phone, accessibility, volunteer, site_link, is_open_for_guests, stuff_free_text); filters **event year**, hosted_before, is_open_for_guests, survivor_needed, host is_org, is_digital, preparation_evening, training, easy_permission; read-only counters, max_guests, is_digital |
| HostSalonTraining | CSV export; filter city — **trainings are managed only here** (no API create) |
| HostSalonContent / HostSalonComments | CSV export / autocomplete |
| **Guest** (`guests/admin.py:17-45`) | CSV export; filters active, registration_status, guest salon status, country |
| **GuestSalon** (`:48-204`) | CSV export; **Export Guests Hosts Salons CSV/Excel** (guest name/phone/email, host name, host phone (salon contact or host), host email, salon date dd/mm/YYYY, time); filters status, **Salon Year** |
| **Witness** (`witnesses/admin.py:40-134`) | import-export with `WitnessResource`; filters witness_type, has slots (null filter), availability_status, accessibility_need, archived, available_for_teaming; buttons **"archive-witnesses"** (yearly reset, background) and **"migrate-comments"** (`special_to_comments`, synchronous) |
| **WitnessSalon** (`:138-185`) | filters can_*; button **"global-availability-all"** (open all latest-year SalonDays for non-IL witnesses) |
| WitnessYearComment / WitnessComments | default admin |
| **Salon** (`salon/admin.py:17-55`) | CSV/Excel export; filters **salon year**, assigned_by, host_contacted_witness; autocomplete host/witness salon |
| City / Country / Language | CRUD (City filters country/community) |
| **Community** (`:71-76`) | users inline (volunteer↔community membership); **"Export All"** button → `/api/export_communities` |
| **SalonDay** (`:79-92`) | manage event days, `day_type`, `default_for_year` (one per year enforced in model) |

The **event-year filter** (`common/admin_filters.py`) builds year choices from distinct years of the date field.

---

## 7. Dependencies

### External services
- **AWS**: SQS (`EMAIL_QUEUE_URL`), Lambda (email consumer; EventBridge trigger Lambda — code not in repo), EventBridge Scheduler, Secrets Manager (`SENDGRID_API_KEY` secret), Elastic Beanstalk/EC2/ALB/CloudWatch, RDS Postgres.
- **SendGrid** (via Lambda).
- **TexterChat** WhatsApp API (`https://{project}.texterchat.com/server/api/v2/whatsapp/templates/send`, Bearer token, payload `{templateName, to, body[], language, whitespaceAbsentParameters:true}`).
- **Twilio** SMS.
- **Google**: OAuth2 (login), Places IDs (`City.google_id`, from the FE autocomplete), Geocoding API (webhook), Google Sheets/Apps Script (webhook caller), Google Sheet "Mails index" (`common/emails.py:46-49` — the email catalogue, external doc).
- **Easy** (external partner consuming the salon feed via Basic auth). "easy and Waze permission".

### Internal consumers
- `zikaron-basalon-fe` (public site): auth/registration/Google, `user_data`, hosts, host_salons, host_salon_training, host_salon_content, host_salons_map, salonguests, guests, salons (host_contacted_witness), witnesses/{id}/details_for_host, cities, languages, salondays, password_reset.
- `zikaron-basalon-fe-admin` (staff): hosts, host_salons_list, host_salons_teaming, relevant_witnesses / relevant_host_salons, salons, witnesses + sub-resources, witnesses_teaming, dashboards, communities, comments, exports/imports, witnesses_duplicate_validation.
- Django Admin (super admins).
- Lambda (EventBridge).
- Google Apps Script.

---

## 8. Tests & CI

| Location | Tests | Coverage |
|---|---|---|
| `hosts/tests/tests.py` | 5 (`HostsTestCase`): create host; permission + result checks for the host salons dashboard and hosts dashboard | dashboards only |
| `guests/tests/tests.py` | 2: credentials + results for… the witnesses dashboard (misnamed) | dashboard |
| `witnesses/tests/tests.py` | 2: credentials + results for the guest dashboard (misnamed) | dashboard |
| `salon/tests.py` | 1: salon deletion frees the witness — **broken** (imports `Witness` from `salon.models`; invalid model construction) | — |
| `users/tests.py` | none | — |

- No tests cover signals, notifications, capacity, teaming, auth flows, reminders or the webhook.
- Tests run on SQLite and require `IS_LOCAL=True` (otherwise `common/emails.py` raises at import).
- CI: `.github/workflows/security-scans.yml` (gitleaks on macOS runner + TruffleHog verified-only) on push/PR to `main`/`dev`. Dependabot config present. CodeBuild buildspecs install deps but **run no tests**. EB postdeploy runs migrations (189 migration files across apps; includes the data migrations `users/0025_recreate_superadmin_users` creating `admin@zikaronbasalon.org` and `system@zikaronbasalon.org` super admins, and `witnesses/0041_consolidate_generation_types`).

**Parity recommendation**: since there are almost no behavioral tests, build the NestJS contract tests from §5/§6 (especially the signal side effects and notification matrix).

---

## 9. Candidate epics

| Slug | Summary | Backend modules / endpoints owned |
|---|---|---|
| `authentication-and-accounts` | Email/password + Google sign-in, registration with role, JWT (role-based lifetimes), SMS passcode login, password reset (incl. Google-only accounts), profile & UI prompt flags, role conversion | `users/` (models User/Passcode, adapter, serializers, auth_views, tokens, token_serializers, password_reset_views, signals user create); `/api/auth/*`, `/api/accounts/*`, `/api/password_reset/*`, `/api/sms_authentication/*`, `/api/user_data/*`, `hosts/{id}/change_host_to_guest`, `guests/{id}/change_guest_to_host` |
| `salon-hosting` | Host profile onboarding (registration steps), creating/editing salons (physical/digital, accessibility, capacity, training choice, links/content), time/date guards vs. the assigned witness, host's view of the assigned witness and contacted flag | `hosts/` (Host, HostSalon, HostSalonTraining, HostSalonContent, signals); `/api/hosts/*`, `/api/host_salons/*` (CRUD, `check_time_range`), `/api/host_salon_training/`, `/api/host_salon_content/`, `/api/salons/{id}` (host PATCH), `/api/witnesses/{id}/details_for_host/`, `/api/hosts/{id}/summaries/` |
| `guest-registration` | Public salon map/search, guest profile, joining/leaving a salon, capacity & open/closed logic, host managing guest list/status | `guests/` (Guest, GuestSalon, signals); `/api/host_salons_map/`, `/api/salonguests/*`, `/api/guests/*`, reference `/api/cities/`, `/api/languages/`, `/api/salondays/*` |
| `witness-management` | Witness CRM (profile, status, archive, comments, year comments), availability slots, duplicate-phone validation, Google-Sheet intake webhook, CSV export/import of presentation paragraphs, yearly reset scripts | `witnesses/` (models, signals, webhook, export/import); `/api/witnesses/*` (+ sub-resources), `/api/witnesses_duplicate_validation/`, `/api/google_sheet_webhook/`, `/api/export_witnesses`, `/api/import_witnesses_presentation_details/` |
| `witness-salon-matching` | Teaming lists and candidate search in both directions, assignment/unassignment with date/time validation, witness capacity (`available_for_teaming`), teaming statuses | `salon.Salon` + `salon/signals.py`; `/api/host_salons_teaming/*`, `/api/witnesses_teaming/*`, `/api/host_salons/{id}/relevant_witnesses/`, `/api/witnesses/{id}/relevant_host_salons/`, `/api/salons/*` (admin) |
| `notifications-and-reminders` | Email (DB templates → SQS → Lambda → SendGrid), WhatsApp (TexterChat), event→template matrix, EventBridge reminder batch with one-time flags, Twilio SMS | `common/emails.py`, `common/notifications.py`, `common/texterchat_client.py`, `common/models.EmailMessageTemplate`, `users.EmailStatus`, `/api/eventbridge_tasks/eventbridge_send_reminders/`, `email-lambda-sqs/`, `populate_email_templates` |
| `admin-dashboards-and-reports` | Staff list views with scoped filters, dashboards (salons/hosts/guests/witnesses), communities & volunteers, staff comments on salons, exports | `/api/host_salons_list/*`, `/api/host_salons/{id}/comments/`, `/api/*_dashboard/`, `/api/communities/*`, `/api/export_communities`, `common/common_functions.query_by_user_role`, `common/utils` permission matrix |
| `django-admin-operations` | Super-admin back office: user/role/community management, email-template editing, season reset buttons (email flags, ask-to-convert, igul-le-tova, archive witnesses, global availability), SalonDay/training management, CSV/Excel/import-export, Easy partner feed | all `*/admin.py`, `common/admin_recources.py`, `common/admin_filters.py`, `templates/admin/*`, management commands; `/api/host_salons_for_easy_integration/` (or fold into guest-registration) |
