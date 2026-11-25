# Ecosystem — Zikaron BaSalon

> Customer: zikaron-basalon
> Discovered: 2026-11-17 by /join-project
> Product registry: [products.index.yml](products.index.yml) (generated)

Two products share one Django API today: **platform** (the API plus the public site) and
**admin** (the staff back office). The rewrite collapses all three legacy repos into one
monorepo but keeps the two products, so each functional area keeps one owner.

## Map — legacy (today)

```
   Public (hosts · guests · witnesses)              Staff (6 admin roles)
            │                                               │
   ┌────────▼─────────┐                          ┌──────────▼──────────┐
   │ zikaron-basalon-fe│                          │zikaron-basalon-fe-  │
   │ React 16 SPA      │                          │admin  React 16 SPA  │
   │ app.zikaronbasalon│                          │                     │   super admins
   └────────┬─────────┘                          └──────────┬──────────┘        │
            │  REST /api/* (JWT)                            │                   │ /admin/
            └───────────────────┬───────────────────────────┘                   │
                       ┌────────▼───────────────────────────────────────────────▼─┐
                       │ zikaron-basalon-be  Django 4.2 + DRF  (AWS EB eu-west-3)  │
                       │ users · hosts · guests · witnesses · salon · common       │
                       └──┬──────────┬──────────┬──────────┬───────────┬──────────┘
                          │          │          │          │           │
                     RDS Postgres   SQS→Lambda  TexterChat  Twilio   EventBridge→Lambda
                                    →SendGrid   (WhatsApp)  (SMS)    →/eventbridge_tasks
                                                                     Easy feed ← partner
                                                                     Google Sheet → webhook
```

## Map — target (rewrite)

```
            new monorepo
   ┌──────────────────────────────────────────────┐
   │ apps/web    Next.js  (platform: public site)  │
   │ apps/admin  Next.js  (admin: staff back office│
   │             + former Django-admin operations) │
   │ apps/api    NestJS   (platform: API, jobs)    │
   │ packages/*  shared contracts (zod), ui, i18n  │
   └──────────────────────────────────────────────┘
      same external services · migrated Postgres data
```

## Delivery sequence (rewrite)

Both products cut over **together**, in one release. Phase 1 waves come from the product roadmaps
([platform](../products/platform/roadmap.md) · [admin](../products/admin/roadmap.md)):

```
platform W0  foundation · login + authorization · messaging core · public layout + i18n
   │
   ├──► platform W1  reference data · hosting · discovery + registration · notification matrix
   │        └──► platform W2  reminders · back-office ops · orthodox · witness self-reg (decision)
   │
   └──► admin W1  login · role authorization · shell
            └──► admin W2  witnesses · hosts & salons · guests        (in parallel)
                     └──► admin W3  teaming · dashboard + exports · ⌘K search
                                          │
                     all Phase 1 done ────┴──► platform-rewrite/cutover-and-rollback
```

Cross-product contracts the API must implement **once** and both apps reuse:

| Contract | Owner (epic) | Used by |
|---|---|---|
| Role/community scoping guard | platform/authentication-and-accounts (`authorization-and-scoping`) | every admin epic |
| Salon update rules and error codes 1001/1002/1003 | platform/salon-hosting | admin/hosts-and-salons-management |
| Guest registration service (capacity, seats) | platform/salon-discovery-and-guest-registration | admin/guests-management, admin/hosts-and-salons-management |
| Witness `available_for_teaming` service | admin/witnesses-management | admin/salon-teaming |
| Domain events → notification matrix | platform/notifications-and-reminders | every epic that changes salons, guests or witnesses |
| Reference data (salon days, trainings, org types) | platform/back-office-operations | salon-hosting, witnesses-management |

## Design reference

`prototype/zikaron-next` is a clickable Next.js 15 + Tailwind v4 prototype covering the public site
and the staff admin. It has demo data only and no backend. It is **shared** by both products as the
**UX reference** for the rewrite. The legacy baselines remain the **behavioral reference**.
Details, the route → epic map, and the deviations it encodes are in [design-reference.md](design-reference.md).

## Relationships

| Consumer | Depends on | Via |
|---|---|---|
| admin (fe-admin) | platform API | REST `/api/*`, JWT Bearer |
| platform web (fe) | platform API | REST `/api/*`, JWT Bearer; public `host_salons_map` |
| platform API | Postgres | Django ORM |
| platform API | SendGrid | SQS → Lambda |
| platform API | TexterChat, Twilio | HTTPS |
| EventBridge Scheduler | platform API | `POST /api/eventbridge_tasks/eventbridge_send_reminders/` (X-API-Key) |
| Easy (partner) | platform API | `GET /api/host_salons_for_easy_integration/` (Basic auth) |
| Google Apps Script | platform API | `POST /api/google_sheet_webhook/` (encrypted token) |
| Super admins | platform API | Django admin `/admin/` |
| platform rewrite (web) | design reference | UX of `/`, `/salons*`, `/guest`, `/host*` in `prototype/zikaron-next` |
| admin rewrite | design reference | UX of `/admin/*` in `prototype/zikaron-next` |

## Shared services

None as separate products. The only shared repo is the design-reference prototype (`prototype/zikaron-next`, see above). The API is owned by `platform` and consumed by `admin`.
Back-office capabilities that live only in Django admin today are owned by
`platform/back-office-operations`. In the rewrite they will be built inside the admin app.
