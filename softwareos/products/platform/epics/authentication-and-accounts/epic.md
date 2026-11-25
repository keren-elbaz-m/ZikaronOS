# Authentication & Accounts

> Product: ../../mission.md
> Status: planning
> Created: 2026-11-25 · Roles planned: PM, Tech

## Summary

The identity layer for both apps: email/password login (existing Django passwords keep working), Google sign-in verified server-side, SMS passcode login, password reset, registration as host or guest, the yearly host↔guest conversion prompt, privacy-policy acceptance, JWT sessions with role-based lifetimes, and a deny-by-default role/community authorization guard. Legacy security gaps (client secret in the browser, non-expiring passcodes, state-changing GETs) are fixed as recorded waivers. Facebook login (dead code) is dropped.

## Legacy baseline

The as-is behavior this epic must preserve in the rewrite (parity reference, not a spec):

- [auth-and-registration.md](../../legacy-baseline/auth-and-registration.md)
- [api-permissions-and-notifications.md](../../legacy-baseline/api-permissions-and-notifications.md)
- [backend-discovery.md](../../legacy-baseline/backend-discovery.md) — data model, API inventory, business rules

## Documents

- [Product brief](product-brief.md)
- [Tech plan](tech-plan.md)

## Specs

| Spec | Status | Branch |
|---|---|---|
