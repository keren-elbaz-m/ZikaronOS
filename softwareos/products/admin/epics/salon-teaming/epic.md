# Salon Teaming

> Product: ../../mission.md
> Status: planning
> Created: 2026-11-25 · Roles planned: PM, Tech

## Summary

Matching witnesses to salons: map and table views with teaming filters, relevant-candidate lookup by date/time-slot/language/accessibility, distance ranking, the side-by-side assign confirmation and the assign/replace/unassign calls that trigger host notifications.

## Legacy baseline

The as-is behavior this epic must preserve in the rewrite (parity reference, not a spec):

- [salon-teaming.md](../../legacy-baseline/salon-teaming.md)
- [backend-discovery.md](../../../platform/legacy-baseline/backend-discovery.md) §6.5 — eligibility, assignment validation and side effects

## Design reference

UX target from the shared prototype ([design-reference.md](../../../../ecosystem/design-reference.md)), routes `/admin/teaming` in `prototype/zikaron-next`:

- A queue of waiting salons and ranked matches with a score and ✓/✗ reasons (date+slot, language, distance, accessibility, yearly load). Then a confirm dialog, undo in the toast, and auto-advance. The scoring is `matchWitnesses` in `lib/utils.ts:61-86`.
- Where this differs from the legacy baseline, the spec must record the choice as a deliberate deviation (see the design-reference "Behavior the prototype changes" list).

## Documents

- [Product brief](product-brief.md)
- [Tech plan](tech-plan.md)

## Specs

| Spec | Status | Branch |
|---|---|---|
