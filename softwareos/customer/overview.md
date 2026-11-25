# Zikaron BaSalon — Overview

> Customer: zikaron-basalon
> Discovered: 2026-11-17 by /join-project

## Business

**Zikaron BaSalon** ("Remembrance in the Living Room", זיכרון בסלון) is a Holocaust-remembrance
movement. Each year around Yom HaShoah, private **hosts** — individuals and organizations,
in Israel and abroad — open their living rooms (or a digital room) for a **salon**: an
intimate gathering where a **witness** (a Holocaust survivor, a 2nd/3rd-generation
descendant, an expert or another speaker) tells their story. Members of the public find
salons on a map and register as **guests**. Staff and community volunteers recruit
witnesses, track them year to year, and **match ("team") witnesses to salons**.

Once a year the platform also ships an **orthodox build** ("זיכרון בבית") with its own
branding and copy, and with public guest registration switched off.

Public site: `app.zikaronbasalon.com` · marketing site: `zikaronbasalon.com` (not in scope).
Supported by the Claims Conference, EVZ and the German Ministry of Finance (footer logos).

## Goals & Engagement

Moveo built and maintains the platform: a Django API, a public React site and a staff admin
React app (see [repos.md](repos.md)).

**Current engagement goal (stated by the team, 2026-11-17): rewrite the whole system on a
modern stack while keeping functionality identical.**

- Target stack: **NestJS** API (replacing Django), **Next.js (App Router) + Tailwind v4 +
  shadcn/ui** for both the public site and the admin, all in **one new monorepo**.
- The legacy repos stay untouched as the behavioral reference until cut-over.
- "Identical functionality" is measured against the per-product **legacy baselines**
  (`products/<product>/legacy-baseline/`). Every rewrite spec must name the baseline
  behavior it preserves, and any deliberate deviation (a legacy bug we choose not to
  replicate, dead code we drop) must be recorded as a decision in that spec.

## Success Measures

- Parity: every behavior in the legacy baselines is either reproduced (with a test) or
  explicitly waived in a spec.
- Data: a lossless migration of the production Postgres data into the new schema.
- Zero-downtime cut-over before the next season's registration opens.
- TBD — confirm with the customer (e.g. season KPIs, performance targets).

## Key Dates

- The system is seasonal: activity peaks in the weeks before Yom HaShoah (salon days are
  configured per year in `SalonDay`). The cut-over must land outside that window.
- TBD — rewrite milestones and the target season for cut-over.
