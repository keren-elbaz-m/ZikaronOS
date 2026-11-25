# Notifications & Reminders

> Product: ../../mission.md
> Status: planning
> Created: 2026-11-25 · Roles planned: PM, Tech

## Summary

Every outbound message, and the reminder schedule. It covers the DB email templates (event code × he/en) sent through SQS → Lambda → SendGrid, WhatsApp through TexterChat, and the Twilio SMS transport. It also covers the full trigger matrix that legacy hides in Django signals (salon created, guest registered/approved/denied/cancelled, seats changed, witness assigned/unassigned, salon time changed) and the 7-step EventBridge reminder batch with its one-time flags. The rewrite turns signals into explicit domain events with a contract test per matrix row and a send log.

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
