# Architecture Map — Who Talks to Whom

> Customer: zikaron-basalon · Written: 2026-11-22
> Built from the code ([infrastructure-and-runtime.md](../products/platform/legacy-baseline/infrastructure-and-runtime.md)), the live AWS account check (its §0),
> public DNS and the public JS bundles. **Live system only.** The rewrite target is in [ecosystem.md](ecosystem.md).
> No AWS account IDs or AWS-generated hostnames appear here. Items still waiting on the inventory script are marked **PENDING**.

## 1. Production at a glance

```
                       DNS: zikaronbasalon.com — registrar Network Solutions, DNS at Wix
                       (admin.zikaronbasalon.com is delegated to Route 53 in AWS)

  PUBLIC USERS (hosts · guests · witnesses)                    STAFF (6 admin roles)
        │ app.zikaronbasalon.com                                  │ admin.zikaronbasalon.com
        ▼                                                         ▼
  ┌────────────────────────────┐                     ┌────────────────────────────┐
  │ CloudFront (+ WAF: managed │                     │ AWS Amplify hosting        │
  │ rules, bot control)        │                     │ (its own CloudFront + WAF: │
  │   └─ S3 prod bucket        │                     │  geo block, managed rules) │
  │      React SPA  (fe)       │                     │   React SPA  (fe-admin)    │
  └─────────────┬──────────────┘                     └─────────────┬──────────────┘
                │  browser JS calls  https://prod.zikaronbasalon.com/api/*  (JWT Bearer)
                └──────────────────────────────┬───────────────────────────┘
                                               ▼
                    ┌──────────────────────────────────────────────────────┐
                    │ EB env  Zikaron-basalon-backend-env   (eu-west-3)    │
                    │ ALB :443 → nginx → gunicorn 3 sync workers           │
                    │ 2–4 × t3.large (fixed at 2: autoscaling never fires) │
                    │ Django 4.2 + DRF  ·  also serves Django admin /admin/│
                    └──┬─────────┬───────────┬────────────┬────────────┬───┘
                       │         │           │            │            │
                       ▼         ▼           ▼            ▼            ▼
                 RDS Postgres  SQS        Twilio      Google        TexterChat
                 13 (owned by  email-sqs- (SMS login  Geocoding     (WhatsApp —
                 the OLD env   queue      codes)      API           OFF in prod)
                 …-be-         │
                 production)   ▼
                            Lambda email-processor ──► SendGrid ──► email inboxes
                               (failures → email-dlq)

  EventBridge Scheduler (every 10 min) ──► Lambda EventBridgeScheduleTargetPython
                                              ──► POST prod API /api/eventbridge_tasks/… (X-API-Key)
  Easy (partner)         ──► GET  prod API /api/host_salons_for_easy_integration/ (Basic auth)
  Google Sheet (Apps Script) ─► POST prod API /api/google_sheet_webhook/ (encrypted token)
  Browsers also call directly: Google Maps JS + Places, Google sign-in, ipapi.co, GTM/GA,
  an accessibility widget (nagich in fe, enable in fe-admin)
```

## 2. Components

| # | Component | What it is | Runs on | Repo / source | Deployed by |
|---|---|---|---|---|---|
| 1 | Public app | React 16 SPA (`fe`) for hosts, guests and witnesses. It still contains an old admin UI under `/admin` | S3 + CloudFront | `zikaron-basalon-fe` | CodePipeline `client-pipeline-prod` (branch `main`) |
| 2 | Admin app | React 16 SPA (`fe-admin`) for staff | AWS Amplify | `zikaron-basalon-fe-admin` | Amplify's own build. **PENDING:** which branch and build spec |
| 3 | API | Django 4.2 + DRF, plus Django admin for super admins | EB `Zikaron-basalon-backend-env` | `zikaron-basalon-be` | CodePipeline `server-pipline-prod` (branch `main`) |
| 4 | Database | RDS Postgres 13, db.t3.medium. Owned by the **old** env `Zikaron-basalon-be-production` | RDS | — | created by EB |
| 5 | Email queue | SQS `email-sqs-queue`, with DLQ `email-dlq` (5 tries, 14-day retention) | SQS | — | by hand |
| 6 | Email sender | Lambda `email-processor` (Python 3.10, 3 s timeout, batch 50) | Lambda | **not in git.** The repo copy (`email-lambda-sqs/`) differs from the deployed one | by hand |
| 7 | Reminder trigger | EventBridge Scheduler `InvokeLambdaSchedule` (every 10 min) → Lambda `EventBridgeScheduleTargetPython` (Python 3.10, 600 s timeout) | Scheduler + Lambda | **not in git** | by hand |
| 8 | Cache invalidation | Lambda `cloudfront-invalidation-develop`. Clears the CloudFront cache after a public-app deploy | Lambda | not in git | by hand / Terragrunt era |
| 9 | Build | CodeBuild `develop-zikaron-server-build` (pip install only, no tests) and `develop-zikaron-client-build` (old image, Node build) | CodeBuild | buildspecs in the repos | — |
| 10 | DNS | Registrar Network Solutions; DNS at Wix; `admin.` delegated to Route 53 | external + Route 53 | — | by hand |
| 11 | Security and audit | WAF (three web ACLs), CloudTrail, GuardDuty, ACM certificates | AWS | — | by hand |

## 3. Connections — who talks to whom

Direction is caller → callee. "Sync" means the caller waits for the reply inside a user's request.

### Users and frontends

| # | From | To | How | Auth | Purpose |
|---|---|---|---|---|---|
| C1 | Public user's browser | CloudFront → S3 (public app) | HTTPS GET of static files | none | load the SPA |
| C2 | Staff browser | Amplify (admin app) | HTTPS GET of static files | none (WAF geo block) | load the SPA |
| C3 | Public app (browser) | API `prod.zikaronbasalon.com/api/*` | REST, JSON | JWT Bearer (localStorage `persist:auth`) | everything: auth, salons, registrations, map |
| C4 | Admin app (browser) | **same** API | REST, JSON | JWT Bearer (localStorage `access_token`) | dashboards, lists, teaming, CRM |
| C5 | Public app | Google Maps JS + Places | HTTPS from the browser | API key compiled into the bundle | the map and address autocomplete |
| C6 | Public app | Google sign-in, then API `convert-token` | OAuth popup, then REST | Google token + DRF client ID/**secret in the bundle** | Google login |
| C7 | Public app | ipapi.co | HTTPS from the browser | key in the bundle (if set) | detect the visitor's country |
| C8 | Both apps | GTM / GA, accessibility widget | script tags | — | analytics, accessibility |
| C9 | Super admins | Django admin `/admin/` on the API | HTML forms | Django session | back-office operations |

### API outbound (all synchronous, inside the request's DB transaction)

| # | From | To | How | Auth | Purpose |
|---|---|---|---|---|---|
| C10 | API | RDS Postgres | TCP 5432, a new connection per request | `DB_*` env vars | all data |
| C11 | API | SQS `email-sqs-queue` | boto3 `send_message` | the EC2 instance role | queue every email (one JSON message per email) |
| C12 | API | Twilio | HTTPS REST | account SID + token (env) | SMS login codes, SMS password reset |
| C13 | API | TexterChat | HTTPS REST | API token (env) | WhatsApp. **Off in production on purpose** (`WHATSAPP_ENABLED=False`) |
| C14 | API | Google Geocoding | HTTPS REST | `GOOGLE_API_KEY` (env) | coordinates for witness addresses |

### Asynchronous and server-to-server

| # | From | To | How | Auth | Purpose |
|---|---|---|---|---|---|
| C15 | SQS `email-sqs-queue` | Lambda `email-processor` | event source mapping, batch 50 | IAM | trigger email sending |
| C16 | Lambda `email-processor` | SendGrid | HTTPS API | SendGrid key. The repo copy reads it from Secrets Manager; **PENDING** for the deployed code | send the email |
| C17 | SQS | `email-dlq` | redrive after 5 failed receives | — | park emails that keep failing |
| C18 | EventBridge Scheduler (every 10 min, UTC) | Lambda `EventBridgeScheduleTargetPython` | invoke | IAM | start the reminder run |
| C19 | Lambda `EventBridgeScheduleTargetPython` | API `POST /api/eventbridge_tasks/eventbridge_send_reminders/` | HTTPS | `X-API-Key` (set in every environment) | send up to 50 reminders per run, which then go out through C11 / C13 |
| C20 | Easy (partner) | API `GET /api/host_salons_for_easy_integration/` | HTTPS pull | Basic auth | partner salon feed |
| C21 | Google Apps Script (a Google Sheet) | API `POST /api/google_sheet_webhook/` | HTTPS push | encrypted token | witness intake from a sheet |

### Delivery (code → running system)

| # | From | To | Trigger | Notes |
|---|---|---|---|---|
| D1 | GitHub `zikaron-basalon-be` `main` | CodePipeline → CodeBuild → EB `Zikaron-basalon-backend-env` | push | migrations run *after* the new code is live; the bundle includes `latest.dump` |
| D2 | GitHub `zikaron-basalon-be` `dev` | same → EB `Zikaron-basalon-be-dev` | push | |
| D3 | GitHub `zikaron-basalon-be` `staging` | same → EB `Zikaron-basalon-be-env-prod` | push | **broken:** that environment doesn't exist |
| D4 | GitHub `zikaron-basalon-fe` `main` / `dev` / `staging` | CodePipeline → CodeBuild → S3 (prod / dev / staging bucket) → Lambda cache invalidation | push | the staging CloudFront distribution is disabled |
| D5 | GitHub `zikaron-basalon-fe-admin` | Amplify build → Amplify hosting | push (PENDING: which branch) | build settings live only in the Amplify console |
| D6 | GitHub `zikaron-basalon-be` | GitHub Actions: gitleaks + TruffleHog | push / PR to `main`, `dev` | the only CI; no tests run anywhere |

### DNS

| Name | Points to | Verified |
|---|---|---|
| `app.zikaronbasalon.com`, `www.app.…` | CloudFront → S3 (public app) | yes |
| `admin.zikaronbasalon.com`, `development.admin.…` | Amplify's CloudFront (admin app) | yes |
| `prod.zikaronbasalon.com` | EB `Zikaron-basalon-backend-env` | yes |
| `dev.zikaronbasalon.com` | EB `Zikaron-basalon-be-dev`. It is also the **fallback** API in both apps if a build lacks its URL | yes |
| `www.zikaronbasalon.com` | marketing site (Wix, out of scope) | links only |

## 4. Environments

| | Production | Dev | Staging |
|---|---|---|---|
| Public app | `app.zikaronbasalon.com` (CloudFront + S3) | S3 + CloudFront, no custom domain | disabled distribution |
| Admin app | `admin.zikaronbasalon.com` (Amplify) | `development.admin.…` points at the same Amplify distribution (PENDING: separate branch?) | — |
| API | `Zikaron-basalon-backend-env` (Py 3.12, t3.large × 2) | `Zikaron-basalon-be-dev` (Py 3.12, t3.small) | **none** (the pipeline targets a missing environment) |
| Database | Postgres 13, owned by `…-be-production` | Postgres 17, owned by `…-be-development` | — |
| Reminders | every 10 min → prod Lambda | every 5 min → `Dev-EventBridgeScheduleTargetPython` | — |
| Email | `email-sqs-queue` → `email-processor` | PENDING: same queue or a separate one | — |

**Leftovers kept on purpose for now (team decision 2026-11-22):**
- `Zikaron-basalon-be-production` and `Zikaron-basalon-be-development`. **Don't terminate these: they own the live databases.**
- `Zikaron-basalon-be-prod-new` and `infra-develop-zikaron` (dead).
- An unused Postgres 13 instance, and a Postgres 17 "green" copy of the prod DB.
- Two unexplained S3 buckets.

## 5. Key journeys across the components

1. **Guest registers for a salon**
   - The browser loads the public app (C1), then the map data (C3 → `host_salons_map`, cached 300 s per worker) and the Google map (C5).
   - Registration: `POST /api/salonguests/` (C3). Inside that request, a Django signal queues the email (C11), and would send WhatsApp (C13) if it were on.
   - `email-processor` picks up the email (C15) and SendGrid delivers it (C16).
2. **Host opens a salon:** `POST /api/hosts/` then `POST /api/host_salons/` (C3). Signals queue the host's emails (C11). Geocoding is used for witnesses only (C14).
3. **Staff assign a witness:** the admin app calls the `*_teaming` routes and `POST/PATCH /api/salons/` (C4). A signal queues the host notification (C11).
4. **Reminders:** every 10 minutes C18 → C19 → the API selects up to 50 due reminders → C11 for each. One run can hold a gunicorn worker for about a minute.
5. **SMS login:** the public app calls `sms_authentication` (C3), and the API sends the code through Twilio (C12) inside the request.
6. **Partner and intake:** Easy pulls the salon feed (C20). The Google Sheet pushes witness rows (C21).

## 6. Weak links in this wiring

| Link | Problem | Detail |
|---|---|---|
| C3 + C4 | One API and one token type for both audiences; authorization fails open | [topology.md](topology.md) §2 |
| C10 | The live API uses a database owned by a *different*, unused EB environment | infrastructure-and-runtime.md §0 |
| C11–C14 | External calls inside DB transactions and inside the user's request | infrastructure-and-runtime.md §5 |
| C15–C16 | 3 s timeout for 50 emails, so whole batches retry and duplicates go out | §0 Messaging |
| C5–C7 | Keys and the OAuth client secret ship in the public bundle | [third-party-services.md](../customer/third-party-services.md) |
| C19 | One reminder run blocks a worker for about 60 s, which is the ALB timeout | infrastructure-and-runtime.md §5 |
| D1 | Migrations run after the code is live, a personal-data dump ships in every bundle, and there's no staging | §2, §7 |
| Lambdas 6–8, Amplify build | Not in git or IaC; they exist only in the console | §0 |
| Live API logs | `Zikaron-basalon-backend-env` streams only its health log to CloudWatch, not its nginx or app logs. Debugging production needs the instance logs | log groups, §0 |

## 7. Open questions

1. **Blocking visitors outside Israel (HTTP 450):** the public app handles a 450 that nothing returns. Should the rewrite keep an outside-Israel block? *Parked by the team; record a decision before shaping `salon-search`.*
2. **PENDING from the inventory script** (`audits/2026-11-22-aws-readonly-check/aws-deep-inventory.sh`):
   - the code of both reminder Lambdas and the deployed email Lambda (what they call, and where their keys come from);
   - Amplify's source branch and build spec, and whether `development.admin` is a separate branch;
   - whether dev has its own email queue;
   - each database's deletion policy (what terminating the old environments would actually do) and who can reach port 5432;
   - the status of the Postgres 17 "green" copy.
