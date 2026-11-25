# Hosts & Salons Management

> Product: ../../mission.md
> Status: planning
> Created: 2026-11-25 · Roles planned: PM, Tech

## Summary

Hosts list, salons list (rich filters, community/role-gated columns), and the admin host profile: personal details, per-year salon cards, admin-created org salons, open/close for guests, guest-request approval/denial with seat limits, volunteer assignment, contacted/preparation/special-population flags, team comments and salon deletion.

## Legacy baseline

The as-is behavior this epic must preserve in the rewrite (parity reference, not a spec):

- [shell-lists-and-profiles.md](../../legacy-baseline/shell-lists-and-profiles.md)
- [backend-discovery.md](../../../platform/legacy-baseline/backend-discovery.md) §6.2–6.3 — salon update rules, error codes, capacity

## Design reference

UX target from the shared prototype ([design-reference.md](../../../../ecosystem/design-reference.md)), routes `/admin/salons`, `/admin/salons/[id]`, `/admin/hosts`, `/admin/hosts/[id]` in `prototype/zikaron-next`:

- One staff page per salon: guests (remove, CSV), witness, follow-up switches, contacts and team notes. Host page shows new vs returning hosts and history by year. One host record per email. Salons table has search, filters, sortable columns and CSV export with Hebrew headers.
- Where this differs from the legacy baseline, the spec must record the choice as a deliberate deviation (see the design-reference "Behavior the prototype changes" list).

## Documents

- [Product brief](product-brief.md)
- [Tech plan](tech-plan.md)

## Specs

| Spec | Status | Branch |
|---|---|---|
