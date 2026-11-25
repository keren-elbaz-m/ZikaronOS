# Salon Discovery & Guest Registration

> Product: ../../mission.md
> Status: planning
> Created: 2026-11-25 · Roles planned: PM, Tech

## Summary

Public salon search (list and map, filters kept in the URL), a shareable page per salon, registering 1–3 seats within capacity, and the guest's "My salon" page with cancel and profile edit. It is rebuilt at parity with the legacy map, drawer and guest area, in the prototype's UX. Public data is limited to what the legacy listing rules expose, minus the leaked host contact details. Blocked outside Israel (HTTP 450), as in legacy.

## Legacy baseline

The as-is behavior this epic must preserve in the rewrite (parity reference, not a spec):

- [discovery-guests-and-site-shell.md](../../legacy-baseline/discovery-guests-and-site-shell.md)
- [api-permissions-and-notifications.md](../../legacy-baseline/api-permissions-and-notifications.md)
- [backend-discovery.md](../../legacy-baseline/backend-discovery.md) — data model, API inventory, business rules

## Design reference

UX target from the shared prototype ([design-reference.md](../../../../ecosystem/design-reference.md)), routes `/salons`, `/salons/[id]`, `/guest` in `prototype/zikaron-next`:

- Filters live in the URL (shareable searches) and full salons sort last. Each salon has its own page with a one-form registration (no account, at most 3 seats), and success offers .ics and a share link. `/guest` lists and cancels my registrations.
- Where this differs from the legacy baseline, the spec must record the choice as a deliberate deviation (see the design-reference "Behavior the prototype changes" list).

## Documents

- [Product brief](product-brief.md)
- [Tech plan](tech-plan.md)

## Specs

| Spec | Status | Branch |
|---|---|---|
