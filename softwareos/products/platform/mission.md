# Platform

> Name: Platform
> Repos: zikaron-basalon-be, zikaron-basalon-fe
> Discovered: 2026-11-17 by /join-project

## Mission

The Zikaron BaSalon platform is the system of record and the public face of the
movement. Hosts sign up as private people or organizations and open a salon on one of
the season's salon days, in person or digitally. They choose a time, an address,
accessibility, capacity, language, whether they want a witness, and a host training.
Members of the public find open salons on a map of Israel (or abroad), see the salon and
its witness, register 1–3 guests, and manage or cancel their registration. Witnesses
assigned by staff appear on the host's salon page. Behind it, a Django API enforces
capacity, salon-day and witness-time rules, and sends every email, WhatsApp and SMS
message. It also runs the reminder schedule and feeds partners (Easy).

## Target users

- **Hosts**: private and organizational (17 org types), Israeli and international.
- **Guests**: the public, mostly Israeli; the map is blocked outside Israel (HTTP 450).
- **Witnesses**: survivors and speakers. Their self-registration flow is broken in legacy;
  staff do intake through the admin product.
- **Staff**: consume this API through the [admin](../admin/mission.md) product and Django admin.

## Rewrite goal

Rebuild this product as `apps/api` (NestJS) and `apps/web` (Next.js) in the new monorepo,
**behavior-identical** to the legacy baselines in [legacy-baseline/](legacy-baseline/).
Known legacy bugs and dead code are listed in the baselines. Each one must be either
reproduced or explicitly waived in the owning spec, never silently changed.

## Repos

See [repos.md](repos.md).
