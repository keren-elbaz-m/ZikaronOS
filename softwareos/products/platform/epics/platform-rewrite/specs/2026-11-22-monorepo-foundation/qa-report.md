# QA Report — Monorepo foundation (two APIs, worker, two Next.js apps, Strapi, he/en)

> Spec: spec.md
> Date: 2026-11-23 · QA by: keren-elbaz-m · Mode: production
> Verdict: FAIL

**Why FAIL:** every acceptance criterion passes and every check is green. The verdict is FAIL only because of a production-mode hygiene rule: the code in `zikaron-platform/` is not under version control, so there is no branch `feat/platform-rewrite/monorepo-foundation` and no PR to review or merge. This was the user's explicit instruction for this stage (build locally, no new repo). It becomes PASS once the code is committed on the spec branch and a PR is opened (see Issues).

## Acceptance Criteria

| AC | Criterion | Result | Evidence |
|---|---|---|---|
| AC1 | Setup commands start every service on the documented ports | pass | Runtime 2026-11-23 on the running `pnpm dev`: api-public :4100 `/health` 200 `{"service":"api-public"}`, api-admin :4101 200 `{"service":"api-admin"}`, Strapi :1338 `/_health` 204, web :3100 200, admin :3101 200, Mailpit :8025 API 200. e2e `01-stack.spec.ts`. |
| AC2 | Workspace layout; root build/lint/typecheck/test pass | pass | e2e `01-stack.spec.ts` "AC2 workspace layout". QA run: lint 27/27, typecheck 27/27, test 26/26 tasks (1119 tests). build 13/13 (Phase 13 run, same code). |
| AC3 | Prototype routes with the prototype's design | pass (superseded) | Design superseded by AC16 by user decision (2026-11-23). Route coverage in e2e `02-web-routes`, `03-admin-routes`. |
| AC4 | `/he` rtl, `/en` ltr, language switch, no hard-coded strings, complete he/en | pass | Runtime: `/he` → `<html lang="he" dir="rtl">`, `/en` → `<html lang="en" dir="ltr">`. e2e `02`/`03` (dir, lang, switch keeps path). `packages/i18n` `check.test.ts` + `check-messages` in lint; `packages/ui` `source-guard.test.ts`. |
| AC5 | Strapi he/en, seeded, edit visible ≤ 60 s, Strapi down → bundle | pass | Runtime: `GET /api/web-salons?locale=en` returns English texts. e2e `08-cms.spec.ts` (edit a page field → `/en` within 65 s, `/he` unchanged), `09-resilience.spec.ts` "Strapi stopped". `packages/i18n` `loader.test.ts`. |
| AC6 | Separate API processes; admin works with api-public stopped | pass | Runtime: distinct `/health` services. e2e `09-resilience.spec.ts` "api-public stopped" (admin pages, CSV, notes work). |
| AC7 | Sign-up/login per app; separate httpOnly cookies, audiences, secrets; cross-audience 401 | pass | Runtime: api-admin `/dashboard` without an admin session → 401. e2e `01-stack.spec.ts` (web token → 401 on api-admin and the reverse, httpOnly, SameSite). `packages/auth` `jwt`/`cookies`/`guards` tests; both APIs' `auth.int.test.ts`. |
| AC8 | Deny by default; route × role matrix; host ownership | pass | api-admin `test/matrix.int.test.ts` (every route × anonymous, web, 6 staff roles); both APIs' `app.int.test.ts` (undecorated route → 403); api-public `host.int.test.ts` (other host → 403). |
| AC9 | Guest registers 1–3 seats; one transaction with outbox; worker email | pass | e2e `04-guest-flow.spec.ts` (register 2 → email in Mailpit → change → cancel; closed → 409; 4 seats → 400). api-public `registrations.int.test.ts` (forced failure → no outbox row; concurrent overbooking). `packages/domain` `capacity.test.ts`. |
| AC10 | Ranked teaming with ✓/✗ reasons, one slot rule; assign → email; undo | pass | e2e `06-teaming.spec.ts` (reasons, ranking, assign → two host emails → undo). `packages/domain` `teaming.test.ts` (golden parity), `slots.test.ts`; api-admin `teaming.int.test.ts`. |
| AC11 | Outbox → pg-boss, retries, failures + count; reminders tick with season mode | pass | worker `relay.int.test.ts`, `email.int.test.ts`, `reminders.test.ts`; api-admin `misc.int.test.ts` (failed-jobs count); worker log "season mode: off". |
| AC12 | zod env validation, clear message, no URL fallback, `.env.example` complete | pass | `packages/config` `env.test.ts`, `env-exit.test.ts`; `env.test.ts` in every app. `.env.example` documents every variable incl. the optional security ones (orchestrator-maintained). |
| AC13 | Prisma schema for core entities; `db:reset` reproducible | pass | User ran `pnpm db:reset` twice on 2026-11-22: identical seed table, all rows `ok`. `packages/db` `seed/convert.test.ts`, `outbox.int.test.ts`; fresh-volume `pnpm setup:local` on 2026-11-23. |
| AC14 | Admin interactions work against the APIs | pass | e2e `07-admin-interactions.spec.ts` (switches, volunteer, capacity, notes, guest removal + email, CSV, availability grid, status rule, editable-section errors). |
| AC15 | README covers setup, ports, map, translations, Strapi | pass | Inspection of `zikaron-platform/README.md` (prerequisites, setup commands, ports, logins, workspace map, editing texts per Strapi page, outbox → worker → Mailpit, security notes, known limits). |
| AC16 | Web and admin match the live system's design, screens and flows | pass | e2e `02-web-routes`, `04-guest-flow`, `05-host-flow`, `03-admin-routes`, `06-teaming`, `07-admin-interactions`; visual-check screenshots next to the live screenshots in `apps/web/visual-check/` and `apps/admin/visual-check/` (incl. `legacy/`). Inventories in plans 10 and 11 Decisions. |
| AC17 | Staff link a returning host's profile to a user account | pass | api-admin `hosts.int.test.ts` "returning-host link" (+ refusals); contracts `host-link.test.ts`; e2e `07b-host-link.spec.ts` end to end. |
| AC18 | One Strapi page per screen with Hebrew names and labels | pass | Runtime: page `web-salons` served per locale; PUT → 405. `packages/i18n` `cms/screens.test.ts`, `cms/strapi.test.ts`; `apps/cms` `pages.test.ts`, `generated.test.ts`; `check-cms-schemas` in lint; e2e `08-cms.spec.ts`. |

## Checks Run

- build: `pnpm build --force` — pass, 13/13 (Phase 13 run on 2026-11-23; code unchanged since; not re-run during QA to avoid clobbering the running dev servers' `.next`)
- lint: `pnpm lint` — pass, 27/27 (includes `check-messages`, `check-cms-schemas`)
- typecheck: `pnpm typecheck` — pass, 27/27
- tests: `pnpm test` — pass, 26/26 tasks, 1119 tests passed, 0 failed (results replayed from Turborepo's cache of the identical Phase 13 `--force` run)
- e2e: `pnpm e2e` — pass, 129/129 (Phase 13 run on 2026-11-23; needs the dev ports free, so not re-run while the user's stack is up)
- runtime: health, locale/dir, cross-audience 401, Strapi page read-only — pass (see AC1, AC4, AC7, AC18)

## Issues Found

| # | Severity | Issue | Route |
|---|---|---|---|
| 1 | med | Code is not under version control: no spec branch, no PR, no review record (`> Reviewed:`), so production-mode hygiene fails. By the user's instruction for this stage. | Decide where the code lives (new repo or a branch), commit on `feat/platform-rewrite/monorepo-foundation`, run `/code-review`, open the PR with the pr skill, then re-run QA. |

## Notes

- Open product decisions (not defects): email after assign + undo; cut-over date; orthodox mode; timezone handling; disabled notifications; geo block; who may bulk-delete; signup limits for shared networks; admin accessibility widget licence (enable.co.il); a real privacy policy text.
- Follow-up specs recorded in plans 10–13: back-office operations (imports, staff users, communities, volunteers, inquiries, date settings, season jobs, email templates), community scoping, host salon cancel API, host profile merge, CSP nonces, Strapi upgrade once Node ≥ 22.19, further Strapi editing changes (user, 2026-11-23).
- `pnpm db:reset` is blocked for AI agents by Prisma; it must be run by a human.
- Security: two reviews; second verdict PASS; its follow-ups N1–N7 fixed in Phase 13 (T36).
