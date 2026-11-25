# Witnesses Management

> Product: ../../mission.md
> Status: planning
> Created: 2026-11-25 · Roles planned: PM, Tech

## Summary

Witnesses list and filters, Add Witness (Israeli phone rules incl. 07x, at-least-one-phone, duplicate-phone check), and the witness profile: personal/contact/accessibility/more-info cards, yearly status and archive flow, availability dates, assigned salons, team comments, year summaries, and super/global-admin deletion.

## Legacy baseline

The as-is behavior this epic must preserve in the rewrite (parity reference, not a spec):

- [witness-profile.md](../../legacy-baseline/witness-profile.md)
- [shell-lists-and-profiles.md](../../legacy-baseline/shell-lists-and-profiles.md)

## Design reference

UX target from the shared prototype ([design-reference.md](../../../../ecosystem/design-reference.md)), routes `/admin/witnesses`, `/admin/witnesses/[id]` in `prototype/zikaron-next`:

- Status tabs, duplicate phone caught while typing, a days × slots availability grid, reverse matching ("salons that fit this witness"), team notes, and status rules that block changes while assigned.
- Where this differs from the legacy baseline, the spec must record the choice as a deliberate deviation (see the design-reference "Behavior the prototype changes" list).

## Documents

- [Product brief](product-brief.md)
- [Tech plan](tech-plan.md)

## Specs

| Spec | Status | Branch |
|---|---|---|
