# Phase 4 — Admin API and worker

Tasks: T11, T12, T13 · ACs: AC6, AC7, AC8, AC10, AC11, AC12, AC14 (API side)

Read first: the prototype admin pages (`prototype/zikaron-next/app/admin/**`) and `lib/store.tsx` to list every action the admin UI performs; each one needs an endpoint here.

## Steps

1. `apps/api-admin` (NestJS 11), same skeleton as api-public but with `ADMIN_JWT_SECRET`, `ADMIN_ORIGIN`, cookie `zb_admin`, audience `admin`, staff roles only.
   - Routes in spec → Technical Approach → api-admin. Scope queries by role/community where the prototype or legacy does.
   - Teaming uses `@zikaron/domain` `rankMatches`; `POST /assignments` and `DELETE /assignments/:id` write the outbox (`assignment.created`, `assignment.removed`) in the same transaction.
   - Witness PATCH enforces the domain status rules; availability PUT replaces the grid atomically.
   - Exports stream CSV with UTF-8 BOM and Hebrew headers (as the prototype does).
   - `GET /search?q=` searches salons, witnesses and guests (ILIKE is fine).
   - `/integrations/easy`, `/integrations/sheet`: `@Roles('super_admin')`, return 501 Not Implemented.
2. Authorization matrix test (T12): build the list of routes from Nest's router (DiscoveryService or `app.getHttpAdapter().getInstance()._router`), and for each role (plus anonymous and a `web` token) assert the expected status from a single table in the test. Fails if a new route is added without being listed. Also assert a web-audience cookie → 401 on every protected route.
3. `apps/worker` (Nest standalone application, no HTTP):
   - `loadEnv`: `DATABASE_URL`, `EMAIL_TRANSPORT`, `SMTP_HOST`, `SMTP_PORT`, `EMAIL_FROM`, `SEASON_MODE`.
   - Outbox relay: every 1 s, `SELECT … FOR UPDATE SKIP LOCKED` up to 50 undispatched events, enqueue to pg-boss by type, set `dispatchedAt`. Safe with two workers running.
   - Queues: `email.send` (render template by event code + user locale he/en from `packages/i18n` email messages or a `templates/` folder; nodemailer SMTP → Mailpit, or SES transport via `@aws-sdk/client-sesv2` when `EMAIL_TRANSPORT=ses`).
   - Event → email mapping for: registration.created (guest + host), registration.cancelled (host), salon.created (host), assignment.created (host), assignment.removed (host).
   - Retries: 5 with exponential backoff; on final failure insert `JobFailure`.
   - Schedule `reminders.tick` every 10 minutes (pg-boss `schedule`); when `SEASON_MODE=off` log `season mode off — reminders skipped` and return.
   - Tests: relay dispatches once with two concurrent relays; email handler sends to a fake transport with the right locale; failure path writes `JobFailure`; reminders skip when off.

## Done when

- `pnpm --filter @zikaron/api-admin test` (including the matrix) and `pnpm --filter @zikaron/worker test` pass.
- With `pnpm dev` for api-public, api-admin and worker: registering a guest via `curl` to api-public produces an email in Mailpit (http://localhost:8025) within a few seconds.
- Killing api-public leaves `curl localhost:4001/health` and admin endpoints working (AC6).

## Decisions

- **D1 Ports moved to the new table.** api-public's scripts now default to `${API_PUBLIC_PORT:-4100}` and api-admin's to `${API_ADMIN_PORT:-4101}`. Tests that hard-coded the old app ports were updated: `packages/config` env-exit test (4100), `packages/auth` guards test (origin 3100), api-public `env.test.ts` and `test/helpers.ts` (3100/4100). The compose default for Postgres stays `5433` (00-conventions still names it as the default; this machine overrides it with 5435). No `.env*` file was read or written.
- **D2 Security fix: hosts no longer see staff follow-up fields.** In `@zikaron/contracts` (`salons.ts`):
  - `SALON_STAFF_FIELDS` = `hostContacted`, `attendedPreparation`, `specialPopulation`, `specialAttention`, `volunteer`.
  - `salonHostViewSchema` = `salonSchema` without those fields. `hostSalonSchema` (used by every api-public `/host/salons` response) now extends it.
  - `salonStaffSchema` is the full `salonSchema` (alias, named for intent); every staff schema (`adminSalon*`, `hostDetail`, teaming, dashboard) keeps the fields.
  - Tests: `packages/contracts/src/staff-fields.test.ts` (shape + stripping); api-public `test/host.int.test.ts` "host responses never carry staff follow-up fields", which sets all five fields on the row and checks POST, GET and PATCH responses. It failed against the old schema (`expected … to not have property "hostContacted"`) and passes now.
- **D3 api-admin is a copy of api-public's infrastructure**, as Phase 3 asked: `core/*` (Valkey key prefix `api-admin:`), `common/*`, `configure-app.ts`, `test/global-setup.ts` (same `SEED_LOCK = 727001`). Explicit `@Inject` only, ESM, `tsx` for dev. Three apps now duplicate this; extracting it into a package is left for later (noted in Handover).
- **D4 Every route uses `@Roles(...rolesWith(capability))`.** Exceptions: `/health`, `/auth/login` and `/auth/logout` are `@Public`; `/auth/me` and `/reference` take any staff role. The capability table in `packages/auth` is unchanged.
  - **Integrations use `rolesWith("integration:use")`** (super_admin and general_admin), not the plan's literal `@Roles('super_admin')`. This keeps one source of truth; to restrict them to super_admin, change only `capabilities.ts` and the matrix follows.
  - **Follow-up has its own route.** `PATCH /salons/:id/follow-up` (`salon:followup:update`) is separate from `PATCH /salons/:id` (`salon:update:any`). volunteers_admin may flip follow-up switches and set the volunteer and special-attention fields without being able to edit the salon itself.
  - **Notes.** Delete is `note:create`, plus the author or super_admin only (403 otherwise). Notes support the `salon`, `witness` and `host` subjects, and POST returns 404 if the subject does not exist.
- **D5 api-admin has its own staff-only `GET /reference`.** The admin needs cities, salon days and languages, and must not depend on api-public (AC6).
- **D6 No role or community scoping of lists.** The prototype shows every staff user everything, and the legacy rule is not in the repo. Lists are scoped to the **current season** only. They are unpaginated, and filtering and sorting happen in the client, as in the prototype. Add scoping and pagination when a functional spec defines them.
- **D7 Admin route list:**
  - `GET /health`; `POST /auth/login|logout`; `GET /auth/me`; `GET /reference`; `GET /dashboard`; `GET /counts` (side-menu counts).
  - Salons: `GET /salons`, `GET|PATCH /salons/:id`, `PATCH /salons/:id/follow-up`, `GET /salons/:id/guests`, `DELETE /salons/:id/guests/:registrationId`.
  - Hosts: `GET /hosts`, `GET|PATCH /hosts/:id`.
  - Witnesses: `GET|POST /witnesses`, `GET|PATCH /witnesses/:id`, `PATCH /witnesses/:id/status`, `PUT /witnesses/:id/availability`.
  - `GET /guests`.
  - Teaming: `GET /teaming/queue`, `GET /teaming/salons/:id/matches`, `GET /teaming/witnesses/:id/matches`, `POST /assignments`, `DELETE /assignments/:id`.
  - Notes: `GET|POST /notes/:subject/:subjectId`, `DELETE /notes/:id`.
  - Other: `GET /exports/:entity.csv`, `GET /search?q=`, `GET /jobs/failed/count`, `POST /integrations/easy|sheet` (501 `not_implemented`).
- **D8 Additive contract changes.**
  - `salonFollowUpPatchRequestSchema`.
  - `hostPatchRequestSchema`: phone normalised; `orgName` required when `isOrg`; private hosts get `orgName`/`orgType` cleared.
  - `witnessDetailSchema.assignments`: the witness's assignment ids, so the witness page can undo with `DELETE /assignments/:id`.
- **D9 Writes and error codes.**
  - **Assign.** Salon and witness rows are locked (`FOR UPDATE`). The match is re-scored server-side with `scoreMatch`, then checked with `canAssign`. Refusal is 409 `assignment_rejected` with `reasons`. The assignment and `assignment.created` are saved in one transaction (a forced-failure test proves rollback), and two concurrent assigns give exactly one 201.
  - **Undo** deletes the row and writes `assignment.removed`.
  - **Payloads** (ids only): `assignment.created|removed` = `{assignmentId, salonId, witnessId, hostId, assignedById|removedById}`. A staff guest removal writes `registration.cancelled` with `{…, removedByStaff: true, removedById}`, and the registration is cancelled, not deleted.
  - **Witness rules.** Status changes use `changeWitnessStatus` and grid changes use `setAvailability`, under a row lock. Availability PUT replaces the whole grid in one transaction. Refusal is 409 `witness_change_rejected` with `reasons`. A duplicate phone is 409 `witness_phone_taken`.
  - **Other codes:** 422 `unknown_language|unknown_city|unknown_community|unknown_country`; 404 `salon_not_found|host_not_found|witness_not_found|assignment_not_found|registration_not_found|note_not_found`; 409 `host_email_taken`, `capacity_below_taken`.
  - **Geocoding.** New witnesses and witnesses whose city or address changes are re-located with `mockGeocode`.
- **D10 Exports.**
  - The CSV is streamed (`StreamableFile` over a generator), UTF-8 with BOM, with the prototype's Hebrew headers and labels (`exports/labels.ts`), and a filename of `<entity>-YYYY-MM-DD.csv`.
  - Cells that look like formulas (`= + - @` tab, CR) are prefixed with `'` (CSV injection). Phone numbers and plain numbers stay as they are.
  - Phones are exported in E.164.
- **D11 Search.** Search is case-insensitive `contains` (ILIKE) over salons, hosts, witnesses and active guests, at most 5 per kind. `%`, `_` and `\` in the query are escaped, so they match literally. A query that parses as a phone number also matches the E.164 form. Subtitles carry data (date, city id, seats), not text; the UI translates them.
- **D12 The matrix test (T12) is `apps/api-admin/test/matrix.int.test.ts`.**
  - It has one `ROUTES` table (method, path, `public` | `staff` | capability). The allowed roles are `rolesWith(capability)` limited to admin roles.
  - **Route discovery.** The test reads the routes from Express 5's `router.stack`. It ignores the `/{*splat}` layer that nestjs-pino's middleware registers for every method, and the test-only routes. If a route is added without a row, the test fails.
  - **Who calls each route.** For every route it calls as anonymous, as a web session (in both cookie names), and as each of the 6 staff roles.
  - **Expected results:**
    - Anonymous and web sessions: 401 (public routes must not be 401/403).
    - A denied staff role: 403 `forbidden`.
    - An allowed role: neither 401/403 nor 500.
  - **No side effects.** Calls use ids that do not exist and empty bodies, so allowed roles stop at validation or lookup.
- **D13 Worker = Nest standalone context + pg-boss 12.39.0 + nodemailer 10.6.1** (nodemailer ships its own types).
  - **Logging** uses `pino` directly, because there is no HTTP.
  - **pg-boss** uses schema `pgboss` in `zikaron_app`.
  - **Relay.** Every 1 s (immediately again while batches are full), in one transaction, it:
    1. runs `SELECT … FOR UPDATE SKIP LOCKED LIMIT 50`;
    2. calls `boss.send(..., { db: fromPrisma(tx) })`, so jobs are enqueued inside the same transaction;
    3. sets `dispatchedAt` (and `attempts`).

    Commit or rollback is all-or-nothing, so the hand-over happens exactly once, and two workers are safe (tested with 2 relays × 40 events).
  - **Unknown types.** An unknown event type is parked as a `JobFailure` (queue `outbox.relay`) and marked dispatched, so it cannot block the queue.
- **D14 Email.**
  - **Recipients:** registration.created → guest + host; registration.cancelled → host, plus the guest when `removedByStaff`; salon.created, assignment.created and assignment.removed → host; registration.updated → none.
  - **Addresses.** The guest's address and language come from `User`. The host's address is the salon's contact email; their language comes from `Host.user.locale`, or he if the host has no login.
  - **Templates** are plain text, in he and en, in `apps/worker/src/email/templates.ts`. `packages/i18n` does not exist yet; Phase 5 may move them there. They carry no HTML, and values are kept on one line to prevent header injection.
  - **A missing salon or guest** is skipped and the job completes; it is not retried.
- **D15 Retries.** Each email job gets `retryLimit 5`, `retryDelay 5 s` and exponential backoff. On the last attempt (`retryCount >= retryLimit`), the handler writes `JobFailure` (queue, jobId, eventId, payload, error, attempts) and then rethrows, so pg-boss marks the job failed. This approach was chosen over a dead-letter queue because it keeps the error message.
- **D16 Reminders.** pg-boss runs `schedule("reminders.tick", "*/10 * * * *", { tz: "Asia/Jerusalem" })`. With `SEASON_MODE=off` the handler logs `season mode off — reminders skipped`. With `on` it logs that there are no reminder rules yet, because the functional specs add them.
- **D17 Worker env** is `DATABASE_URL`, `EMAIL_TRANSPORT` (`smtp|ses`), `SMTP_HOST`, `SMTP_PORT`, `EMAIL_FROM`, `SEASON_MODE` (`on|off`), and optionally `AWS_REGION` and `LOG_LEVEL`. `SMTP_*` are required even for `ses`, because 00-conventions lists them for the worker.
  - **SES never needs an API key.** `EMAIL_TRANSPORT=ses` loads the **optional** package `@aws-sdk/client-sesv2` at runtime, using the default AWS credential chain. The package is not installed. Without it the worker exits with `EMAIL_TRANSPORT=ses needs the optional package @aws-sdk/client-sesv2`.
- **D18 Worker tests are isolated.** pg-boss runs in its own schema, `pgboss_test_<tag>`, which is dropped afterwards. The relay is scoped to the test's event ids (`onlyIds`), so it never dispatches events that the api-public and api-admin suites create in the shared `zikaron_test` database.

## Handover
