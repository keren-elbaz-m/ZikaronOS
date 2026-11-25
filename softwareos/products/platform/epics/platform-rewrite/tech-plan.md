# Platform Rewrite (NestJS + Next.js monorepo) — Tech Plan

> Epic: epic.md · Product: ../../mission.md

## Approach

Build one TypeScript monorepo:
- `apps/api` (NestJS)
- `apps/web` (Next.js App Router, public site)
- `apps/admin` (Next.js App Router, staff)
- `packages/contracts` (zod schemas and inferred types for every endpoint)
- `packages/ui` (Tailwind v4 + shadcn/ui, RTL-first, seeded from the prototype's `components/ui.tsx`)
- `packages/i18n` (he/en messages and orthodox overrides)
- `packages/config` (eslint, tsconfig)

The API core provides config/secrets loading, structured logging, the DB module, a role-aware
authorization guard (filled in by `authentication-and-accounts`), an in-process **domain-event
bus** that replaces Django signals, and a scheduled-job entry point for the reminders endpoint.
Data moves through a standalone, re-runnable ETL (`tools/migrate`). It reads a legacy Postgres snapshot,
writes the new schema, and emits a reconciliation report.

Parity is proven by a **contract test harness**. Each scenario is a request plus expected response and
side effects (rows, events, outbound messages captured by fake providers), written from a
legacy-baseline line. The harness runs against the new API in CI, and on demand against a legacy
instance to check that the scenario itself is right.

Infrastructure is code on AWS `eu-west-3` (same region as today). CI/CD runs on GitHub Actions and
keeps the existing gitleaks/TruffleHog scans. Cut-over is a scripted freeze → final migration → DNS
switch → smoke tests, with rollback to legacy (legacy stays read-only but intact until sign-off).

## Architecture Impact

- **New components:** everything in the monorepo. These replace the Django apps
  (`users`, `hosts`, `guests`, `witnesses`, `salon`, `common`), the two CRA SPAs, and the Express static servers.
- **Schema:** new Postgres schema covering the `backend-discovery.md` §4 entities:
  - User, EmailStatus, Passcode
  - Host, HostSalon, HostSalonTraining, HostSalonComments, HostSalonContent
  - Guest, GuestSalon
  - Witness, WitnessSalon, year and team comments
  - Salon (the assignment), SalonDay
  - City, Country, Community, Language
  - EmailMessageTemplate

  Third-party tables (allauth `EmailAddress`, social_django `UserSocialAuth`,
  `ResetPasswordToken`, oauth2_provider, authtoken) are mapped only where auth needs them
  (Google UID link, password hash); the rest are dropped and recorded as waivers.
  Stored guest counters, which are unreliable, are replaced by computed values
  (`architecture.md` gotcha 3). Coordinate with `salon-discovery-and-guest-registration`.
- **Signals → domain events:** every row in the signal and notification tables of
  `api-permissions-and-notifications.md` becomes an explicit event that a service emits. Consumers are
  owned by `notifications-and-reminders`, `salon-hosting`, `salon-teaming`, etc.
- **Infra:**
  - API on AWS (container or EB: TBD) and RDS Postgres (new instance, or the same cluster with a new DB: TBD)
  - the SQS → Lambda → SendGrid email path (fix the Lambda's `get_secret` bug)
  - EventBridge Scheduler pointing at the new reminders endpoint
  - Secrets Manager for every key
  - Next.js hosting: TBD
- **Retired:** CodeBuild buildspecs, Jenkinsfiles, Procfiles, the stale Terragrunt, `latest.dump`.

## Risks & Unknowns

- **Data migration fidelity.** There are 189 Django migrations, including data migrations and hard-coded
  ids (the system user `166434` used by the webhook), plus naive datetimes and multiselect text fields.
  Needs a spike on a sanitized snapshot before the schema is final.
- **Password and session continuity.** Users have Django PBKDF2 hashes and Google-only accounts
  (unusable password plus `UserSocialAuth`). The API must verify Django hashes (and rehash on login).
  Owned with `authentication-and-accounts`; this epic must carry the hash and the social UID over intact.
- **Production data handling.** The snapshot contains real personal data. Use sanitized copies for
  dev and staging, keep access tightly limited, and never commit any dump. Security review required.
- **What's really deployed** (EB env names, the Lambda code, the EventBridge schedule, the TexterChat templates)
  may differ from the repo. Needs a short infra-discovery spike with access to the AWS account (access: TBD).
- **Season window.** Cut-over must land outside the weeks before Yom HaShoah. Date TBD, and every other
  epic's Phase 1 must finish before it.
- **Cross-epic dependency.** Every functional epic depends on `monorepo-foundation` and
  `parity-test-harness`. `authentication-and-accounts` depends on the schema for users. Cut-over
  depends on all Phase 1 specs being done.
- **Undecided stack choices**: ORM, monorepo tooling, Next.js hosting, i18n library. Lock them in the
  first spec, since every later spec inherits them.

## Candidate Specs

- `monorepo-foundation`: scaffold apps and packages, API core (config, logging, DB, event bus, auth-guard
  hook, `/health`), a shared UI kit from the prototype, CI running build/lint/typecheck/test.
- `schema-and-data-migration`: the new Postgres schema plus a re-runnable ETL from a legacy snapshot, with a
  reconciliation report and a datetime decision.
- `parity-test-harness`: the contract-test framework, fake providers (email, WhatsApp, SMS) that capture
  outbound messages, seed fixtures, and an optional run against legacy.
- `aws-infra-and-deploy`: environments as code (API, DB, SQS/Lambda, EventBridge, secrets, web/admin
  hosting) and CI/CD deploys to dev, staging and prod.
- `cutover-and-rollback`: the freeze, final migration, DNS switch, smoke tests and rollback runbook,
  rehearsed on staging, plus a decision on retiring legacy.
