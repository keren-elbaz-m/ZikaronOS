# Guests Management

> Product: ../../mission.md
> Status: planning
> Created: 2026-11-25 · Roles planned: PM, Tech

## Summary

The scoped guests list (search, status, salon city, seat count, community, "didn't finish registration", sort, CSV) and the admin guest profile. The profile shows personal details, the current salon registration with approved-only privacy, seat-count changes within capacity, and cancellation that notifies the host. Built in the prototype's UX, with a link through to the guest's salon.

## Legacy baseline

The as-is behavior this epic must preserve in the rewrite (parity reference, not a spec):

- [shell-lists-and-profiles.md](../../legacy-baseline/shell-lists-and-profiles.md)

## Design reference

UX target from the shared prototype ([design-reference.md](../../../../ecosystem/design-reference.md)), routes `/admin/guests` in `prototype/zikaron-next`:

- Search, filters, CSV export, and a link to the salon.
- Where this differs from the legacy baseline, the spec must record the choice as a deliberate deviation (see the design-reference "Behavior the prototype changes" list).

## Documents

- [Product brief](product-brief.md)
- [Tech plan](tech-plan.md)

## Specs

| Spec | Status | Branch |
|---|---|---|
