# Site Shell, Content & i18n

> Product: ../../mission.md
> Status: planning
> Created: 2026-11-25 · Roles planned: PM, Tech

## Summary

The public frame: header, footer, logos, contact/terms/privacy links, error pages, Hebrew-first RTL with English, the accessibility statement and nagich widget, and the GTM/GA4 events. It also owns the annual orthodox build ("זיכרון בבית" branding, copy overrides, hidden guest flows) as one switch that every other epic reads.

## Legacy baseline

The as-is behavior this epic must preserve in the rewrite (parity reference, not a spec):

- [discovery-guests-and-site-shell.md](../../legacy-baseline/discovery-guests-and-site-shell.md)
- [auth-and-registration.md](../../legacy-baseline/auth-and-registration.md)

## Design reference

UX target from the shared prototype ([design-reference.md](../../../../ecosystem/design-reference.md)), routes `/` (root layout, per-role header) in `prototype/zikaron-next`:

- RTL root layout with Rubik and per-role header nav. Hebrew only, with no i18n or orthodox mode, so the i18n and orthodox scope comes from the legacy baseline alone.
- Where this differs from the legacy baseline, the spec must record the choice as a deliberate deviation (see the design-reference "Behavior the prototype changes" list).

## Documents

- [Product brief](product-brief.md)
- [Tech plan](tech-plan.md)

## Specs

| Spec | Status | Branch |
|---|---|---|
