# Phase 8 — Verification and docs

Tasks: T24, T25, T26, T27 · ACs: all (AC1–AC15). T28 (security review) and T29 (QA) are run by the orchestrating session after this phase, with the security-reviewer agent and the qa skill.

## Steps

1. From a clean state (`docker compose down -v && docker compose up -d`, delete `node_modules`, `pnpm install`, `pnpm setup:local`), run `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test`. Fix what fails.
2. Playwright (`apps/e2e` or `e2e/` at the root, `pnpm e2e`), against the running stack:
   - every AC3 route in `he` and `en`: status 200, correct `dir`, no console errors, header language switch works;
   - guest flow: sign up → open salon → register 2 seats → confirmation; Mailpit API shows the email (AC9);
   - host flow: log in as host → wizard → new salon appears on `/host`;
   - admin teaming: log in as super_admin → teaming → assign → host email in Mailpit → undo (AC10);
   - Strapi fallback: stop Strapi (or point `STRAPI_URL` at a closed port for the test server) → pages still render bundled text (AC5);
   - isolation: api-public stopped → admin dashboard loads (AC6).
3. Test mapping: make sure every AC1–AC15 has at least one test or a documented manual check, tagged `// covers ACn`. Write `zikaron-platform/TESTING.md` with the AC → test map.
4. `zikaron-platform/README.md` (AC15): prerequisites (Node 22, pnpm 10, Docker), the four setup commands, ports table, workspace map, test users per role, how to add a translation key (he + en + `check-messages`), how to override a text in Strapi, how outbox → worker → Mailpit works, known limits (out-of-scope list from the spec).

## Done when

- All root commands pass from a clean state, and `pnpm e2e` passes.
- `TESTING.md` maps every AC.
- `README.md` lets a new developer start the stack without reading anything else.

## Decisions

## Handover
