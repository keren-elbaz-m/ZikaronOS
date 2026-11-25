# Back-office Operations & Integrations

> Product: ../../mission.md
> Status: planning
> Created: 2026-11-25 · Roles planned: PM, Tech

## Summary

Everything super admins do today only in Django admin, rebuilt as role-guarded screens in `apps/admin` on a `backoffice` API:
- staff users, roles and communities
- countries, cities, languages and salon days
- host trainings, customized-salon content and email templates
- the yearly season operations (witness archive, global availability, prompt and reminder-flag resets)
- the bulk CSV/Excel exports and imports

It also owns the two inbound integrations, which must stay contract-compatible: the Easy partner salon feed (Basic auth) and the Google-Sheet witness-intake webhook (AES-encrypted token).

## Legacy baseline

The as-is behavior this epic must preserve in the rewrite (parity reference, not a spec):

- [api-permissions-and-notifications.md](../../legacy-baseline/api-permissions-and-notifications.md)
- [backend-discovery.md](../../legacy-baseline/backend-discovery.md) — §6.6, §6.9, §6.10

## Documents

- [Product brief](product-brief.md)
- [Tech plan](tech-plan.md)

## Specs

| Spec | Status | Branch |
|---|---|---|
