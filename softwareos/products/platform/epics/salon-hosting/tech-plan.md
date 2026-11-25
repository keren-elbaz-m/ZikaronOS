# Salon Hosting — Tech Plan

> Epic: epic.md · Product: ../../mission.md

## Approach

Build a **`hosts` module** (host profile and onboarding) and a **`host-salons` module** (salon lifecycle) in
`apps/api`. Every rule from `legacy-baseline/hosting.md` and `backend-discovery.md` §6.2 becomes an explicit domain
service with zod schemas shared with `apps/web`.

Every query is scoped by an ownership guard (`host.userId === caller`), with staff access handled separately
by the admin roles. Signals become explicit domain events:
- `SalonCreated` → `hosts_1`, and an auto-assignment when no witness is needed;
- `SalonTimeChanged` → `guests_8`;
- `SalonDeleted` → deny registrations and free the witness;
- `HostRegistrationFinished`.

`apps/web` builds `/host/new` (a 4-step wizard; orthodox variant) and `/host` (salon dashboard) following the
prototype. The draft is autosaved client-side. The salon-day default-date logic and the witness-slot time check
are ported as pure functions, covered by table-driven tests built from the legacy cases.

## Architecture Impact

- **API:**
  - Host profile CRUD (own).
  - Salon CRUD (own), and `check-time-range` for the witness-lock pre-check.
  - Salon guests list and remove (own salons; shared with `registrations`).
  - Trainings list (read-only here).
  - Igul LeTova read and mark (on the user).
- **Data:**
  - `HostSalon` columns carry over. `9999` sentinels become `null`, `stuff_free_text` becomes `staff_note`, and accessibility moves from MultiSelect to an
    array or enum.
  - Host `registration_status` semantics are kept (1/3/5) for dashboards and reminders.
  - The no-training sentinel address (`"אני לא מעוניין…"`) becomes an explicit nullable training plus a flag.
- **Geocoding:** server-side Places/Geocoding to validate that the address is in the city and to set lat/lng. It replaces the legacy
  fallback of "lat/lng → city coords → 1" and the prototype's random jitter. Cities are still created on demand by Google place id.
- **Orthodox:** a deploy-level flag read from config (see `site-shell-content-and-i18n`) controls the shorter
  wizard, the forced-private salons, the hidden tabs and the org type list.
- **Events → notifications:** `hosts_1*`, `guests_8`, the guest-denial cascade, and `volunteer_1` on a host update
  (with legacy's bug of passing a User instead of an email fixed).

## Risks & Unknowns

- **Error-code contract** (`1001`/`1002`/`1003`): the admin app relies on these too. Keep them stable or version them together with `admin`.
- **Time-of-day normalization** (07:00 vs 08:00) changes which time edits are allowed for hosts with an assigned witness.
  The migration must check existing assignments against the new rule and list any that violate it.
- **Geocoding cost and quotas**, and Google Places on the server versus the client autocomplete. Needs a spike together with the
  `salon-discovery` map-provider decision.
- **Cascading delete** must stay transactional: deny guests, send notifications after commit, free the witness.
- **Default-date logic** depends on `SalonDay.day_type` (the legacy default is the invalid literal `1`). The data migration
  must clean it.
- **Dependencies:**
  - `platform-rewrite`: schema, migration, monorepo.
  - `authentication-and-accounts`: host role and user.
  - `notifications-and-reminders`: event consumers.
  - `site-shell-content-and-i18n`: orthodox flag and i18n.
  - `back-office-operations`: managing trainings, salon days and org types.
  - `admin/hosts-and-salons-management`: reuses the salon module and the error codes.

## Candidate Specs

- `host-onboarding` — host profile for private and org hosts (org types, orthodox list), registration status transitions,
  and personal-details edit.
- `salon-create-wizard` — 4-step wizard with salon-day/time rules, the default date, city-matched geocoded address,
  capacity, witness/training/language, the autosaved draft, `comments_for_guests`, and the `hosts_1` and auto-assignment events.
- `salon-edit-and-delete` — owner-scoped edit with witness date/time locks (`1001`/`1002`), the capacity floor (`1003`),
  `guests_8` on a time change, and delete with the guest-denial cascade.
- `host-salon-dashboard` — `/host`: details, approved guests with remove, seats meter, witness card with "contacted
  witness", checklist, share links, the customized-salon link, the Igul LeTova prompt, and multi-salon for orgs.
