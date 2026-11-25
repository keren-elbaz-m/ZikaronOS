# Join Report — Zikaron BaSalon

> Generated: 2026-11-17 by /join-project
> Hub: `ZikaronOS` (this repo). The legacy repos are symlinked into the hub root and gitignored.

## Taxonomy

**Customer:** `zikaron-basalon`

| Product | Repos | Epics |
|---|---|---|
| `platform` | zikaron-basalon-be, zikaron-basalon-fe | 8 |
| `admin` | zikaron-basalon-fe-admin | 6 |

Shared services: none. `admin` consumes the `platform` API.

The first proposal was a single product. At the gate the user chose to **split into
`platform` + `admin`**. The planned NestJS + Next.js monorepo will serve both products
(`apps/api` + `apps/web` → platform, `apps/admin` → admin).

## Mode

**`production`**, chosen by the user up front, before discovery, together with the rewrite
decisions (Next.js + Tailwind/shadcn, a NestJS backend, one new monorepo).

Context found during the scan:
- CI: GitHub Actions security scans (gitleaks, TruffleHog) in the backend; CodeBuild/Jenkins builds in all three repos. **No CI runs tests.**
- Tests: 5 backend test files covering dashboards only, one of them broken; 0 frontend tests.
- Deploy: AWS Elastic Beanstalk + Terragrunt (stale), Procfiles, buildspecs.
- Released: no `v*` tags; ~970 / ~1,020 / 235 commits.

Consequence: every spec will demand unit tests, a security review and full QA. For a
behavior-parity rewrite, that is how "identical functionality" gets proven.

## Counts

**2 products · 14 epics · 0 specs.** 17 index files generated and validated as YAML.

## Rewrite context (how this OS is organized for parity)

- `products/<product>/legacy-baseline/` holds the **as-is behavior** of the legacy system:
  routes, forms, validation, endpoints, permissions, notifications and known bugs, with
  `file:line` citations into the legacy repos. It is a reference, not a spec.
- Each epic's `epic.md` links the baseline files it must preserve.
- Each rewrite spec (`/shape-spec`) should state which baseline behaviors it covers, and
  record every deliberate deviation (a legacy bug or security gap not replicated, dead
  code dropped) as a decision in the spec.
- `platform/platform-rewrite` owns the shared foundation: monorepo, data migration, auth
  compatibility, parity test harness, infra and cut-over.

## Inferred vs. TBD

**Confidently inferred** from code: mission, roles and scoping, the full API inventory,
data model, business rules, the notification matrix, reminder jobs, Django-admin-only
operations, the frontend route and form behavior, and infra and third parties.

**TBD for a human:**
- `customer/team.md`: PM, customer-side owner, team.
- `customer/overview.md`: success measures, rewrite milestones, target cut-over season.
- Both `roadmap.md` files (run `/plan-product` as PM).
- Target-stack details: ORM (Prisma or TypeORM), monorepo tooling, i18n library, hosting for Next.js.

## Uncertainties and decisions needed

1. **Witness self-registration** (`/register/wanttotell`) is broken in legacy: stub steps, hard-coded 2024 dates, and it PATCHes witness id `4`. Rebuild it properly or drop it? See `platform/witness-self-registration`.
2. **Guest table view** (`/site/salonSearch/table`) never receives data in legacy. Keep, fix or drop?
3. **`/admin` inside `zikaron-basalon-fe`** is a drifted copy. It was treated as out of scope, and `fe-admin` is the admin source of truth. Confirm.
4. **Time-of-day buckets** (morning starts at 07:00 in some places, 08:00 in others) and naive Jerusalem datetimes: pick one rule for the rewrite.
5. **Security gaps** to fix rather than replicate (each one is a parity waiver): unscoped `/api/host_salons/`, open witness comments, city writes by any user, unauthenticated `export_communities`, state-changing GETs, the map cache leaking host contact details, the DRF client secret in the browser, and sidebar-only admin gating.
6. **Disabled notifications** still in code (`guests_6`, `hosts_9`, `guests_7`, `volunteer_1`) and templates that were never seeded (`hosts_2d`, `hosts_2e`): port them as disabled, or drop them?
7. The **Terragrunt** setup looks stale compared with the live Elastic Beanstalk environment. Confirm what is actually deployed before planning infra.

## Repo hygiene findings (action needed in the legacy repos — not changed by this run)

- `zikaron-basalon-be`: the ~26 MB production DB dump `latest.dump` is **tracked in git** (private repo). It contains real personal data and should be purged from history. The `.env` file is correctly ignored.
- `zikaron-basalon-fe` and `zikaron-basalon-fe-admin`: the `JenkinsFile` contains **inline credentials**; Google Maps/OAuth keys are hard-coded as fallbacks or inline. Rotate them and move them to env.
- `zikaron-basalon-fe-admin`: an **uncommitted change** on branch `fix/phone-number-witness-regex` adds a stray `w` to `ISRAELI_PHONE_REGEX`, which breaks every phone validation. Don't commit it as-is.

## AgentOS

AgentOS was detected in all three legacy repos and **not migrated** (the user chose to skip,
which leaves the legacy repos untouched):
- `zikaron-basalon-be/agent-os`: 1 spec (2026-04-15 google-auth-account-merging)
- `zikaron-basalon-fe/agent-os`: 2 specs (2026-05-26 orthodox-mode-ui-toggle, 2026-05-27 hide-guests-customized-salon-orthodox)
- `zikaron-basalon-fe-admin/agent-os`: 1 spec (2026-04-21 witness-duplicate-phone-on-submit)

Carry them over later with `/migrate-agent-os` (it deletes the source folder when it finishes).

## Next steps

1. `/plan-product` as PM for `platform` and `admin`: roadmap, cut-over milestones, success measures.
2. `/plan-epic` for `platform/platform-rewrite` (Tech) to lock the monorepo, ORM, data-migration and parity-test approach.
3. `/shape-spec` per functional epic, starting with `authentication-and-accounts` (everything depends on it).
4. `/discover-standards` once the new monorepo exists; `/refresh-indexes` after any manual edits.
5. `/go-production --revert` if you want lighter gates while scaffolding.
