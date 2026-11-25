# Platform Rewrite (NestJS + Next.js monorepo)

> Product: ../../mission.md
> Status: planning
> Created: 2026-11-25 · Roles planned: PM, Tech

## Summary

The shared foundation every functional epic builds on: one monorepo (NestJS `apps/api`, Next.js `apps/web` and `apps/admin`, shared zod contracts and UI kit) with CI from day one, a new Postgres schema with a lossless and re-runnable migration of production data, a parity test harness that proves "identical functionality", AWS infrastructure without secrets in code, and a rehearsed cut-over with rollback outside the season window. Functional behavior is owned by the other epics.

## Legacy baseline

The as-is behavior this epic must preserve in the rewrite (parity reference, not a spec):

- [api-permissions-and-notifications.md](../../legacy-baseline/api-permissions-and-notifications.md)
- [backend-discovery.md](../../legacy-baseline/backend-discovery.md) — data model, API inventory, business rules

## Documents

- [Product brief](product-brief.md)
- [Tech plan](tech-plan.md)

## Specs

| Spec | Status | Branch |
|---|---|---|
