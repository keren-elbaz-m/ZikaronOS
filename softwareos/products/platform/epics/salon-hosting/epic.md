# Salon Hosting

> Product: ../../mission.md
> Status: planning
> Created: 2026-11-25 · Roles planned: PM, Tech

## Summary

Host onboarding (private or organization), the create/edit salon wizard with salon-day, time and witness-lock rules, and the host salon page (guests, seats, witness, share, checklist). It is rebuilt at parity in the prototype's UX, with server-side validation and owner-only access, which closes legacy's unscoped `/api/host_salons/`. Includes the orthodox variant of the wizard.

## Legacy baseline

The as-is behavior this epic must preserve in the rewrite (parity reference, not a spec):

- [hosting.md](../../legacy-baseline/hosting.md)
- [api-permissions-and-notifications.md](../../legacy-baseline/api-permissions-and-notifications.md)
- [backend-discovery.md](../../legacy-baseline/backend-discovery.md) — data model, API inventory, business rules

## Design reference

UX target from the shared prototype ([design-reference.md](../../../../ecosystem/design-reference.md)), routes `/host`, `/host/new` in `prototype/zikaron-next`:

- 4-step wizard with inline errors, a live card preview and an autosaved draft. Address must match the city, and training is required only for first-time hosts. The host page has a seats meter, ±capacity (never below seats taken), a witness card and a "what's left" checklist.
- Where this differs from the legacy baseline, the spec must record the choice as a deliberate deviation (see the design-reference "Behavior the prototype changes" list).

## Documents

- [Product brief](product-brief.md)
- [Tech plan](tech-plan.md)

## Specs

| Spec | Status | Branch |
|---|---|---|
