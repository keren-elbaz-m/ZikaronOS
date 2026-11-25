# Witness Self-Registration — Tech Plan

> Epic: epic.md · Product: ../../mission.md

## Approach

This plan covers **Option A (rebuild)** from the product brief. If Option B (drop) is chosen, this plan reduces to
`retire-witness-self-registration`: a redirect from `/register/wanttotell` and the removal of all public witness writes.

The design is a public, unauthenticated `POST` in `apps/api` (a `witness-intake` module) that accepts one zod-validated
payload. That payload covers contact, type, birth details, city (Google place id → `City` created on demand, as legacy does),
languages, stairs and accessibility, free text, and availability slots on current `SalonDay`s. In one transaction it creates:
- a new `Witness` with a source flag (`self_registered`) and a lead status, never teamable;
- its `WitnessSalon` slots;
- a `WitnessComments` entry recording the submission.

It never updates an existing row. Duplicate detection runs in the same transaction, using the same phone normalization as
`admin/witnesses-management`. Its result is stored on the lead for staff, and it is never returned to the caller.

`apps/web` renders a short multi-step form (`/witness/register`, with a redirect from `/register/wanttotell`), built on the
shared form components and i18n.

## Architecture Impact

- **API:** a new public endpoint with rate limiting (per IP/phone) and bot protection (provider TBD). The witnesses module
  gains a `source` field and a lead/verify transition that staff use from the admin.
- **Data:**
  - `Witness.source` (or equivalent) and possibly a new availability status. The latter is a schema decision shared with
    `admin/witnesses-management` and the data migration.
  - Slot creation must **not** set `available_for_teaming=true` for unverified leads. That diverges from the legacy signal,
    and the divergence is recorded as a decision.
- **Admin:** a "new from website" filter/badge and a verify/merge/archive action in the witnesses list. Owned with or by
  `admin/witnesses-management`.
- **Notifications (optional):** a staff alert on a new lead, through `notifications-and-reminders`, if decision 3 is yes.

## Risks & Unknowns

- **Product decision pending** (rebuild vs drop). Nothing should be built before it's made.
- **Public PII endpoint**: date of birth, phones and personal history. It needs a security review, rate limiting, bot protection,
  and log redaction. Retention and consent are TBD with the customer.
- **Duplicates and merges**: there is no DB uniqueness on phones in legacy. Merging a lead into an existing witness is a staff
  operation whose rules (which fields win) must be specified.
- **Teamability rule**: legacy's derived `available_for_teaming` logic lives in signals. The rewrite's explicit service has to
  include the "unverified lead" case, or teaming will pick up unverified witnesses.
- **Dependencies:**
  - `platform-rewrite`: schema, monorepo.
  - `admin/witnesses-management`: statuses, duplicate rules, the verify UI.
  - `site-shell-content-and-i18n`: layout, i18n, orthodox helper.
  - `notifications-and-reminders`: the optional staff alert.

## Candidate Specs

- `witness-interest-form` — public intro + form (contact, type, birth details, city, languages, accessibility, free text)
  creating an unverified witness lead, with rate limiting, bot protection and a server-side duplicate flag.
- `witness-availability-step` — availability on the current season's `SalonDay`s (≤3 dates, slots per date), saved as
  non-teamable slots.
- `witness-lead-review` — admin side: "new from website" filter and badge, duplicate warning, and verify/merge/archive that makes
  the witness teamable. May move to `admin/witnesses-management`.
- `retire-witness-self-registration` — **Option B only**: redirect `/register/wanttotell` and remove the public write path.
