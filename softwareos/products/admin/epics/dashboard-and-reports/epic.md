# Dashboard & Reports

> Product: ../../mission.md
> Status: planning
> Created: 2026-11-25 · Roles planned: PM, Tech

## Summary

The season KPI dashboard: every legacy salons, hosts, guests and witnesses figure, scoped by role and filtered by city and community. It adds the prototype's capacity-per-day chart, witness pipeline, and "needs a witness" and "almost full" work lists. It also owns export for every admin list (server CSV with Hebrew headers, selected or all filtered), the super-admin witness CSV export and the witness presentation-paragraph CSV import.

## Legacy baseline

The as-is behavior this epic must preserve in the rewrite (parity reference, not a spec):

- [shell-lists-and-profiles.md](../../legacy-baseline/shell-lists-and-profiles.md)

## Design reference

UX target from the shared prototype ([design-reference.md](../../../../ecosystem/design-reference.md)), routes `/admin` in `prototype/zikaron-next`:

- KPIs, a per-day capacity chart, the witness pipeline, and "needs a witness" and "almost full" (≤2 seats left) work lists.
- Where this differs from the legacy baseline, the spec must record the choice as a deliberate deviation (see the design-reference "Behavior the prototype changes" list).

## Documents

- [Product brief](product-brief.md)
- [Tech plan](tech-plan.md)

## Specs

| Spec | Status | Branch |
|---|---|---|
