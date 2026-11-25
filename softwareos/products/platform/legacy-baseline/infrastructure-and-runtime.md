# Legacy Infrastructure, Runtime & Delivery

> Product: [mission.md](../mission.md) · Discovered: 2026-11-18 (deep verification pass)
> Sources: `zikaron-basalon-be` (branch `dev`), `zikaron-basalon-fe` (`dev`), `zikaron-basalon-fe-admin`, plus their git history.
> Citations are `file:line` in the named repo. **No AWS console or CLI access was available.** Anything that only
> the live account can confirm is marked **UNVERIFIED**, and is collected in the [checklist at the end](#verify-in-the-aws-console).
> Secret *values* were never read or recorded. Only the names and locations of secrets are given.

## 1. The picture

```
 Browser (public)                     Browser (staff)
   │  app.zikaronbasalon.com             │  admin host: not in code (UNVERIFIED)
   ▼                                     ▼
 CloudFront + S3  ◄─ CodePipeline     ? + S3  ◄─ hand-made pipeline (not in IaC)
 (fe build/)        (Terragrunt cicd)   (fe-admin build/)
   │                                     │
   └──────────── HTTPS /api/* (JWT Bearer) ─────────────┐
                                                        ▼
                       ALB (EB-managed, eu-west-3)   health: GET /health
                                │  nginx (EB default config: ~60 s proxy timeout, 1 MB body; UNVERIFIED)
                                ▼
           EC2 instance(s), Amazon Linux 2023, Python 3.12
             gunicorn :8080 · 3 SYNC workers · timeout 300 · keep-alive 300
             Django 4.2 + DRF · ATOMIC_REQUESTS · CONN_MAX_AGE=0 · LocMem cache per worker
             leader only: postdeploy migrate+collectstatic · cron every 10 min (no-op)
                                │
      ┌──────────────┬──────────┼────────────────┬─────────────────┬─────────────┐
      ▼              ▼          ▼                ▼                 ▼             ▼
  RDS Postgres   SQS queue   TexterChat     Twilio SMS      Google Geocoding  Secrets
  (new conn per  → Lambda    (WhatsApp,     (no timeout)    (5 s timeout)     Manager
   request)      → SendGrid  3–10 s timeout)                                  (Lambda only)

  EventBridge Scheduler (every 20 min per docs; UNVERIFIED) → undocumented Lambda
    → POST /api/eventbridge_tasks/eventbridge_send_reminders/ (X-API-Key)
  Easy (partner) → GET /api/host_salons_for_easy_integration/ (Basic auth)
  Google Apps Script → POST /api/google_sheet_webhook/ (encrypted token)
```

## 2. Compute: Elastic Beanstalk

| Item | Value | Evidence |
|---|---|---|
| EB app / region | `zikaron-basalon-be`, `eu-west-3` (Paris) | `.elasticbeanstalk/config.yml:10,14` |
| Platform | "Python 3.12 running on 64bit Amazon Linux 2023" | `config.yml:13` |
| Environments in the repo | only `zikaron-basalon-be-dev`, mapped to branch `main` | `config.yml:2-7`. This is EB CLI local config, not the pipeline. Which environment is prod: **UNVERIFIED** |
| Load balancer | ALB (`AWSEBV2LoadBalancer` refs) | `.ebextensions/scale-policies.config` |
| Health check | `/health` returns "ok" from middleware, without touching the DB | `middleware.py:9-11`. It is **last** in `MIDDLEWARE` (`settings.py:120`), so CORS, session and auth middleware run first |
| Instance count | CLAUDE.md says 3; Terragrunt says min 1 / max 2 | `infrastructure-live/develop/server/elastic-beanstalk/terragrunt.hcl:19-20`. Live: **UNVERIFIED** |
| `runtime.txt` 3.12.4 | Heroku leftover, ignored by EB | the minor version comes from the EB platform version |
| SSH key pair | `zikaron-test-key` | `config.yml` |

**`.ebextensions/`**
- `01_packages.config`: installs `postgresql-devel` with dnf.
- `python.config`: sets only `WSGIPath: zikaronBasalon.wsgi:application`. No env vars, no `container_commands`.
- `my_cron.config` + `cron_job.txt`: on the **leader only**, writes `/etc/cron.d/cron_job`, which runs `manage.py once_a_hour_task` **every 10 minutes**.
  - The command is **inert**: every send and `save()` is commented out (`users/management/commands/once_a_hour_task.py:69-72`). It still runs about 7 full-table queries per run.
  - "Leader" exists only at deploy time. If that instance is replaced, the cron disappears. An instance-protection fix was added in `16dc29ca` and reverted in `b4b1abb3` (2024-04-28).
  - `export $(cat env | xargs)` breaks on env values that contain spaces.
- `scale-policies.config`: disables EB's default alarm actions and adds custom +2 / −1 instance policies. **Most of the alarms cannot work:**
  - The CPU and network alarms use `Namespace: AWS/ApplicationELB` with `CPUUtilization`, `NetworkIn` and `NetworkOut` (`:47-48,135-136,178`). Those are EC2 metrics and don't exist under ALB, so the alarms get no data.
  - `Period: 10` on standard-resolution (60 s) metrics.
  - The low-side alarms run scale-down on `InsufficientDataActions` (`:56-57,80-81`). The broken alarms therefore keep pushing toward minimum capacity.
  - Only the `RequestCountPerTarget` alarms (`:92,111`) can work.
  - **Net effect:** autoscaling very likely sits at the minimum. Live alarm state: **UNVERIFIED**.

**`.platform/`**
- Only `hooks/postdeploy/01_django_migrate.sh`. On the leader it runs `migrate --noinput` then `collectstatic --noinput`. Other instances just echo.
- This runs **after** the new code is already serving. New code can hit the old schema, and a failed migration does not roll back the deploy.
- There are no nginx overrides, so EB defaults apply.

**No `.ebignore`:** `eb deploy` bundles the git HEAD, and the CodeBuild artifact is the whole repo (`buildspec-server.yml:13-14`). Both include the tracked **`latest.dump` production database dump** (~26 MB, real personal data). It is very likely present on every instance under `/var/app/current/` (UNVERIFIED).

## 3. Process model: gunicorn

`Procfile:1`: `gunicorn --bind :8080 --keep-alive 300 --timeout 300 --workers 3 zikaronBasalon.wsgi:application`

- **Sync workers.** There is no `-k` flag, so each instance handles at most **3 concurrent requests**. `gevent`, `eventlet` and `greenlet` are pinned in `requirements.txt` but unused.
- The worker count went from 1 to 3 in `770d7fe6` (2026-03-26). `docs/eventbridge-reminders.md` still says 1.
- **No `--max-requests`**, so workers live until the next deploy. Anything frozen at import time stays stale, for example the `SalonDayView.queryset` (`salon/views.py:182`).
- **The 300 s timeout does nothing.** nginx and the ALB in front cut the request at about 60 s (EB defaults, UNVERIFIED). The client gets a 504 while the worker keeps running for up to 300 s, holding one of only 3 slots.
- No ASGI (`asgi.py` is absent).

## 4. Django configuration

There is one settings module, `zikaronBasalon/settings.py`, read through `python-decouple`. There are no per-environment modules. Env values come from EB environment properties.

| Setting | Value | Consequence |
|---|---|---|
| `DEBUG` | `config('DJANGO_DEBUG', default=True)` **with no `cast=bool`** (`:12`) | Any non-empty string, including `"False"`, is truthy. Production is very likely running with **DEBUG on** (UNVERIFIED): tracebacks and settings shown on errors. `urls.py:50` serves static files only when DEBUG is on, which suggests the setup depends on it |
| `ALLOWED_HOSTS` | `['*']` (`:14`) | No Host-header protection |
| CORS | `CORS_ALLOW_ALL_ORIGINS` (set twice) + `CORS_ORIGIN_ALLOW_ALL` + `CORS_ALLOW_CREDENTIALS=True` (`:220-234`) | Any origin is reflected, with credentials allowed |
| Security headers | No `SECURE_PROXY_SSL_HEADER`, no HSTS, no SSL redirect, no secure cookies, no `CSRF_TRUSTED_ORIGINS` | Behind the ALB, `request.is_secure()` is False. Django-admin POSTs over HTTPS may fail the Origin check (UNVERIFIED) |
| `SECRET_KEY` | from env, no fallback (`:11`) | It is **also the JWT signing key** (`:244`), so rotating it logs everyone out |
| DRF | `IsAuthenticated` by default; auth = OAuth2 + simplejwt + Session + Social (`:147-155`) | **No default pagination and no throttling.** Password reset explicitly sets `throttle_classes = ()` (`users/password_reset_views.py:41,85`) |
| SimpleJWT | access 1 h, refresh 30 d, rotating, **no blacklist**, HS256 (`:237-254`) | Admins get 365 d at login (`users/tokens.py:14-15`), but the dj-rest-auth refresh view reissues a 30 d token, so admins effectively have 30-day sliding sessions |
| OAuth toolkit | separate tokens: 24 h access / 7 d refresh (`:279-286`) | Two token systems side by side |
| Database | Postgres, `ATOMIC_REQUESTS=True`, `CONN_MAX_AGE=0`, no `sslmode` (`:159-170`) | **A new connection on every request.** Every request is one transaction, and that includes the external calls in §5 |
| Time | `TIME_ZONE='Asia/Jerusalem'`, `USE_TZ=False` (`:211-212`) | All datetimes are naive. Morning starts at 07:00 in some code paths and 08:00 in others |
| Cache | `LocMemCache` (`:188-193`) | **Each gunicorn worker on each instance has its own cache.** Redis is pinned and provisioned by Terragrunt, but unused |
| Static | `STATIC_ROOT='static'` (relative); whitenoise installed but not in `MIDDLEWARE` | Relies on EB's default `/static` mapping (UNVERIFIED) |
| Logging | the `LOGGING` dict is commented out (`:335-360`) | `print` mixed with `logging`, to stdout, then to EB/CloudWatch logs (UNVERIFIED) |
| Email | `EMAIL_BACKEND` = SendGrid (`:197`) | Not actually used: mail goes through SQS (`common/emails.py:29-43`) |
| Silent bugs | `DJANGO_REST_MULTITOKENAUTH_RESET_TOKEN_EXPIRY_TIME: 1` is a type annotation, not an assignment (`:309`), so the reset token lives 24 h. `LOGIN_REDIRECT_URL` points to a Heroku app (`:301`) | — |
| Monkey patches | Django 2-era shims for `ugettext`, `conf.urls.url`, `Signal(providing_args)` and multiselect `max_length` (`:16-68`) | Hide deprecations; upgrade debt |

**Middleware order** (`settings.py:107-121`): Cors → Security → Session → Common → Csrf → Auth → allauth Account → Messages → XFrame → social_django → oauth2 OAuth2Token → HealthCheck.
**There is no country or IP logic in the backend.** The public app treats HTTP **450** on `host_salons_map` as "outside Israel" (`fe/src/store/middleware/auth.middleware.ts:76-87`). Something in front of Django (WAF, CloudFront or ALB rule) must produce that 450. **UNVERIFIED.**

**Environment variable names** the app reads (values not recorded):
- `SECRET_KEY`, `DJANGO_DEBUG`
- `DB_NAME`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PW`
- `SENDGRID_API_KEY`, `IS_LOCAL`, `NODE_ENV`, `AWS_REGION`, `EMAIL_QUEUE_URL`, `EVENTBRIDGE_API_KEY`
- `SOCIAL_AUTH_GOOGLE_OAUTH2_KEY`, `SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET`, `DOMAIN`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- `EASY_INTEGRATION_USERNAME`, `EASY_INTEGRATION_PASSWORD`
- `GOOGLE_SHEET_KEY`, `ENCRYPTION_GOOGLE_SHEET_KEY_B64`
- `TEXTERCHAT_PROJECT_ID`, `TEXTERCHAT_API_TOKEN`, `TEXTERCHAT_ACCOUNT_ID`, `WHATSAPP_ENABLED`
- `GOOGLE_API_KEY` (read directly in `witnesses/views.py:722`)

## 5. Work done inside requests (and why it hurts)

- **20 signal receivers** in `salon`, `witnesses`, `users`, `hosts` and `guests` `signals.py` do I/O **synchronously, inside the request's `ATOMIC_REQUESTS` transaction**. They call SQS `send_message` (`common/emails.py:40`, a boto3 client with no timeout, `:23`), TexterChat (`common/notifications.py:76`, 3 s timeout), Twilio (`users/views.py:110`, **no timeout**) and Google geocoding (`witnesses/views.py:732`, 5 s timeout). Only one receiver uses `transaction.on_commit` (`witnesses/signals.py:46`).
  - **Ghost messages:** if the request later rolls back, the email or WhatsApp has already been sent.
  - Row locks are held while a third party is slow.
  - A slow third party ties up one of 3 workers.
  - An SQS error turns into an HTTP 500 for the user.
- **Django-admin actions spawn raw threads** inside a gunicorn worker for the season jobs: archive, global availability, `should_ask_to_convert`, Igul LeTova, email status (`witnesses/admin.py:113,176`; `users/admin.py:162,183,242`). They run with no transaction and no tracking, and **die silently** on a deploy or worker restart.
- **Reminder batch.** EventBridge Scheduler triggers an undocumented Lambda, which calls `POST /api/eventbridge_tasks/eventbridge_send_reminders/` (`users/views.py:169-176`).
  - Each run handles up to `BATCH_LIMIT=50` messages and sends WhatsApp inline at about 1 s each, so one run holds a worker for about 50–60 s. That is right at the ALB/nginx cut-off.
  - The whole batch is one transaction. A failure late in the run rolls back the "sent" flags after the messages went out, so **the next run sends them again**.
  - The schedule is 20 min per `docs/eventbridge-reminders.md:22` and 10 min per CLAUDE.md:90. **UNVERIFIED.**
  - That Lambda's code is not in any repo.
- **EventBridge key check** (`common/utils.py:327`): `api_key == settings.EVENTBRIDGE_API_KEY`.
  - If the env var is unset, both sides are `None` and **a request without the header passes**.
  - The comparison isn't constant-time.
  - A failed attempt **prints the received key** to the logs (`:333-336`).

## 6. Email pipeline (SQS → Lambda → SendGrid)

- **Producer** (`common/emails.py:29-43`): sends `{subject, html_content, from_email, to_email}` as JSON to `EMAIL_QUEUE_URL`.
  - When `IS_LOCAL` is false and `AWS_REGION` or `EMAIL_QUEUE_URL` is missing, **module import raises `ValueError`** (`:21-25`), so the app won't boot.
- **Consumer** (`email-lambda-sqs/lambda_function.py`): sends one SendGrid `Mail` per record. On any error it logs and re-raises (`:53-58`), so the **whole batch is retried** and the emails that already succeeded are re-sent.
- **The repo copy can't run.** `get_secret()` takes no parameters (`:12`) but is called as `get_secret(secret_name)` (`:36`), which is a TypeError on every invoke. It also uses a hard-coded secret name instead of the env var (`:13`). **The deployed Lambda therefore differs from the repo and isn't version-controlled.**
- Deployed by hand (it was added in `b1ebec50`, 2024-12-22, and is not in IaC or any buildspec). DLQ, `maxReceiveCount`, batch size and visibility timeout: **UNVERIFIED**.

## 7. Build & deploy

| App | Hosting | Pipeline | Trigger | Evidence |
|---|---|---|---|---|
| Backend | Elastic Beanstalk | CodePipeline → CodeBuild `buildspec-server.yml` (only `pip install`; artifact = the whole repo, including the dump) → EB | push to the pipeline branch (confirmed by the empty "create new build" commits `8387f61a`, `37327390`) | `infrastructure-live/account.hcl:6`. `buildspec.yml:18` only *echoes* "Running tests" |
| Public `fe` | S3 + CloudFront | CodePipeline → `buildspec-client.yml` (**Node 12**, `npm ci && npm run build`, artifact `build/`) | push | Terragrunt `_common/cicd.hcl:46-48,77-78`; `account.hcl:12`. Live: UNVERIFIED |
| Admin `fe-admin` | S3 (+ CloudFront?) | identical `buildspec-client.yml`, **but not in Terragrunt**, so it was created by hand | UNVERIFIED | only `client_repository_name = zikaron-basalon-fe` is in IaC |

**Dead artifacts that mislead readers:**
- **JenkinsFile** (both frontends, identical): `node:8-alpine`, tests gated off, copies `./dist` (CRA builds to `build/`), and releases only from `master`, which doesn't exist. It also has **inline `NPM_TOKEN` and `GIT_CREDENTIALS` literals** (`:5-6,110`). These must be rotated.
- **Frontend `Procfile` + `server.js`** (Express on `PORT||5000`): Heroku leftovers, not in the `build/` artifact.
- **Backend `buildspec-client.yml`**: an Nx template path (`dist/apps/client`) required by the cicd module's template. The backend has no `package.json`.
- **semantic-release scripts**: there is no config and no `master` branch, so **no release has ever been tagged** (0 tags in all three repos).

**Build-time config**
- The buildspecs set no env vars. `REACT_APP_*` values must come from the CodeBuild project settings in the console (UNVERIFIED).
  - fe reads `API_URL`, `FE_URL`, `DRF_CLIENT_ID`, `DRF_CLIENT_SECRET`, `GOOGLE_MAP_KEY`, `GOOGLE_OAUTH`, `IPAPI_KEY` and `ORTHODOX_MODE` (all with the `REACT_APP_` prefix).
  - fe-admin reads only `REACT_APP_API_URL`.
- **If `REACT_APP_API_URL` is missing, both apps silently fall back to `https://dev.zikaronbasalon.com`** (`fe/src/utils/constants/api.ts:2-6`, `fe-admin/src/utils/constants/api.ts:1-5`). A misconfigured production build would talk to the dev API.
- `REACT_APP_DRF_CLIENT_SECRET` is compiled into the public JS bundle (`fe/src/store/saga/auth.saga.ts:66-67`).

**Branches and environments**

| Repo | `main` last commit | dev branch | `staging` |
|---|---|---|---|
| be | 2026-05-24 | `dev` | last 2025-01-12, **306 commits behind** |
| fe | 2026-08-02 | `dev` | last 2024-03-20, **432 behind** |
| fe-admin | 2026-08-16 | `development` | last 2024-03-20, **161 behind** |

- The likely mapping is `dev`/`development` → dev and `main` → prod (UNVERIFIED). **There is no working staging.**
- Merges are done by hand, with backup branches (`main-copy-before-merge-17-04-2024`, …).

**CI:** GitHub Actions `security-scans.yml` exists in the backend only. It runs gitleaks (macOS runner, Homebrew installed via `curl | bash`) and TruffleHog `@main` on push and PR to `main` and `dev`. Dependabot is configured in the backend. **No pipeline in any repo runs tests or a build check.**

## 8. Infrastructure as code (`infrastructure-live/`, Terragrunt)

- **History:** 4 commits, all between 2022-12-17 and 2022-12-20 (`98f75dbb` plus three commits named "a"). It has **never been touched since**.
- **Scope:** only the `develop` stage, branch `main`. State lives in S3 `zikaron-eu-west-3-terraform-s3` with the DynamoDB lock `terraform-app-lock-table` (`terragrunt.hcl:20-31`).
- **Modules:** pinned to Moveo's `terraform-aws-rest-api-architecture` **v0.16.3** (`develop/versions.hcl:2`). They provision:
  - VPC: 2 AZs, public and private subnets
  - security groups
  - **RDS Postgres 13.7 `db.t3.micro`** (`_common/rds.hcl:38-39`)
  - ElastiCache Redis (**unused** by the app)
  - Secrets Manager `secrets/<stage>`
  - KMS
  - **EB "Amazon Linux 2 v3.4.2 running Python 3.8"** (`_common/elastic-beanstalk.hcl:48`), whereas the live platform is AL2023 / Python 3.12
  - API Gateway (unused)
  - WAF (CloudFront scope)
  - ACM in `us-east-1` with `domain_name = null`
  - CloudFront
  - Cognito (**unused**; callback `localhost:3000`)
  - CI/CD
  - an access-log bucket
- **Not in IaC:**
  - a prod or staging stage
  - Route 53 / DNS
  - SQS
  - the email Lambda and the reminder-trigger Lambda
  - EventBridge Scheduler
  - the admin frontend's hosting and pipeline
- **Verdict:** this is a 2022 template bootstrap that has drifted. It **cannot rebuild the live system**. The live system was mostly built and changed by hand in the console.

## 9. Hostnames

| Hostname | Serves | Hosting | Evidence |
|---|---|---|---|
| `app.zikaronbasalon.com` | public app (`fe`) | S3 + CloudFront (UNVERIFIED) | `fe/src/utils/constants/api.ts:7` |
| `dev.zikaronbasalon.com` | dev API; also the fallback API for **both** frontends | EB (UNVERIFIED) | `api.ts:6`, fe-admin `api.ts:5` |
| production API host | — | **not in code**, env only (UNVERIFIED) | — |
| admin app host | — | **not in code** (UNVERIFIED) | — |
| `www.zikaronbasalon.com`, `zikaronbasalon.org` | marketing site (out of scope) | — | frontend links |
| `*.herokuapp.com` (`zikaron-be(-prod)`, `zikaronbasalon`, `zikaron-fe`) | dead (Heroku era) | — | `api.ts:4-5` comments, `settings.py:301` |

Email links use `settings.DOMAIN` from env (`common/emails.py:10`).

## 10. Dependencies & tests

- **Versions:** Django 4.2.16, DRF 3.14.0.
- **Pins that look outdated or vulnerable** (confirm with `pip-audit`):
  - gunicorn 21.2.0 (request-smuggling fixes are in 22.x)
  - DRF 3.14.0 (a browsable-API XSS was fixed in 3.15.2)
  - cryptography 42.0.5
  - Jinja2 3.1.2
  - sqlparse 0.4.4
  - PyJWT 2.8.0
  - dj-rest-auth 6.0.0
- **Unused weight:** eventlet, gevent, redis, whitenoise, Cython, jedi, ipython-genutils, drf-extensions, the Facebook provider.
- **Tests:**
  - 491 lines covering dashboards only, plus an empty users test file and a broken `salon` test.
  - Tests switch to SQLite when `'test' in sys.argv` (`settings.py:172`), so they never exercise Postgres behavior.
  - Nothing runs them.

## 11. Proven problems, ranked

| # | Problem | Severity | Evidence | Rewrite owner |
|---|---|---|---|---|
| 1 | **SMS login can be brute-forced.** `AllowAny`, a 4-digit code, no expiry check, the code isn't deleted after use, no throttling. Admins logging in this way get a 365 d refresh token. Sending a code is also unthrottled, so it can be abused to run up Twilio costs | **critical, live** | `users/views.py:121-131`, `SMS_AUTH_CODE_LEN=4` | platform/authentication-and-accounts |
| 2 | **DEBUG is truthy in production**, with `ALLOWED_HOSTS=*` and CORS open to any origin with credentials | **critical, live** | `settings.py:12,14,220-234` | platform-rewrite |
| 3 | **Authorization fails open:** endpoints missing from the role table are open to any logged-in user; `host_salons` has no ownership check; the map cache leaks host contact details to anonymous users (the April 2026 fix doesn't work) | **critical, live** | see [ecosystem/topology.md](../../../ecosystem/topology.md) §2–3 | authentication-and-accounts, salon-hosting, salon-discovery |
| 4 | **The EventBridge key check passes** when the key isn't configured, and logs the received key | high | `common/utils.py:327-336` | notifications-and-reminders |
| 5 | **Secrets and personal data in repos and artifacts:** `latest.dump` is in git and in every deploy bundle; Jenkins tokens are inline; the DRF client secret is in the public bundle | high | §2, §7 | platform-rewrite (rotation and purge happen outside the rewrite) |
| 6 | **External calls inside DB transactions**, causing ghost messages and duplicate reminders; the email Lambda resends whole batches | high | §5, §6 | notifications-and-reminders |
| 7 | **Only 3 sync workers per instance**, slow third parties called inline, and a 60 s proxy cut-off in front of a 300 s timeout (504s while the work keeps running) | high (seasonal peak) | §3, §5 | platform-rewrite |
| 8 | **Autoscaling alarms are mostly broken** (wrong namespace, 10 s periods, scale-down on missing data) | high (seasonal peak) | §2 | platform-rewrite/aws-infra-and-deploy |
| 9 | **Migrations run after the code is live**, with no rollback, no staging and no tests in any pipeline | high | §2, §7 | platform-rewrite |
| 10 | **The IaC can't rebuild the system**; the email and reminder Lambdas aren't versioned; admin hosting was made by hand | medium | §6, §8 | platform-rewrite/aws-infra-and-deploy |
| 11 | **The dev-API fallback** in both frontend builds | medium | §7 | platform-rewrite (typed env, no fallbacks) |
| 12 | **Per-process LocMem cache** (inconsistent across workers and instances), and a new DB connection per request with no SSL mode set | medium | §4 | platform-rewrite |
| 13 | **Admin-action threads are lost on restart**; the leader-only cron is a no-op and disappears when the leader is replaced | medium | §2, §5 | back-office-operations/season-operations |
| 14 | **Outdated dependencies, monkey patches, no logging config**, and docs that contradict each other (workers 1 vs 3, schedule 10 vs 20 min, instances 3 vs 1–2) | low | §3, §4, §10 | platform-rewrite |

Items 1–3 are **live production risks today**, independent of the rewrite. See join-report.md "Repo hygiene / live findings".

## Verify in the AWS console

These items decide parts of the cut-over plan and could not be checked from code:

1. **Environments:** the list of EB environments and which one is prod; instance type; min and max instance counts; the ALB listeners, HTTPS certificate and idle timeout.
2. **EB environment properties:** whether `DJANGO_DEBUG` is set, and to what. Whether `EVENTBRIDGE_API_KEY` is set.
3. **Scaling alarms:** the state of the `scale-policies.config` alarms (INSUFFICIENT_DATA?).
4. **Bundle contents:** whether `/var/app/current/latest.dump` exists on the instances.
5. **Hostnames:** the production API hostname and the admin hostname (Route 53 / CloudFront); how admin is hosted and what its pipeline is.
6. **The HTTP 450 block:** where it comes from (WAF rule? CloudFront function?).
7. **Reminders:** the EventBridge Scheduler rate and the code of the reminder-trigger Lambda.
8. **Email Lambda:** the deployed code, and the SQS queue's DLQ, `maxReceiveCount`, batch size and visibility timeout.
9. **Database:** RDS engine version, instance class, Multi-AZ, backups and point-in-time recovery, and the parameter group (connection limits).
10. **Build config:** the `REACT_APP_*` environment variables on each CodeBuild project.
11. **Logging:** where logs go (CloudWatch log groups, retention).
