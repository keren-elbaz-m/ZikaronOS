# Salon Hosting — Product Brief

> Epic: epic.md · Product: ../../mission.md

## Goals

Hosts are the supply side of the movement. Without salons there is nothing for guests to join and nothing to team
a witness to. In legacy, a host:
- goes through a 5-step wizard where validation only gates "Next";
- sees server errors flash in a 5-second banner (or be swallowed);
- must pick a training on every save;
- gets an address accepted even when it's in the wrong city.

The host salon page is a set of tabs with a donation pop-up on arrival.

Goals:
- Rebuild host onboarding, the create/edit salon wizard and the host salon page with **every legacy rule preserved
  or explicitly waived**, in the prototype's UX (`/host/new`, `/host`).
- Validate every rule on the server, and show its error inline on the field.
- Close the authorization gap: a host can read and change **only their own** salons.
- Give hosts a clear "what's left to do" view: guests, seats, witness, training.

## User Stories

- As a new host, I can complete my host profile as a private person or an organization (org name and org type), with a
  valid phone, so I can open a salon.
- As a host, I can create a salon. I pick one of the season's salon days and a time, an address in the chosen city
  (or a digital salon), accessibility, open-to-public or private, capacity, the language, whether I want a witness,
  whether I hosted before, a host training, and a note to staff. My draft is saved if I leave halfway.
- As a host, after creating a salon I can write a note to my guests.
- As a host, I can edit my salon. If a witness is already assigned, I can't change the date, and I can change the time only
  within the witness's available time of day (with a clear explanation).
- As a host, I can't lower capacity below the seats already taken.
- As a host, I can delete my salon after a warning that names the assigned witness and tells me guests will be notified.
- As a host, I can see my approved guests (name, seats, email, phone), remove one, and see a seats meter.
- As a host, I can see my assigned witness's details and mark that I contacted them.
- As a host, I can share my salon's link (WhatsApp, Facebook, email, copy) once it's open for guests.
- As an organization host, I can run several salons in a season and switch between them.
- As a host, I can edit my personal details (name, phone, and org name/type for orgs). Email and host type stay read-only.

## Success Criteria

- Every "Preserve" rule below has a passing API contract test or E2E test, and every waiver is recorded in the owning spec.
- Authorization tests: host A gets 403/404 reading, editing or deleting host B's salon. A host may change only
  `host_contacted_witness` on the assignment (security review sign-off).
- Error-code parity: a date change with a witness → `1001`; a time outside the witness slot → `1002`;
  `max_guests` below the seats taken → `1003`. Each shows inline in the UI.
- Side effects are verified through events:
  - creating a salon sends `hosts_1` (email + WhatsApp);
  - `survivor_needed=false` auto-creates an assignment with no witness;
  - finishing a salon moves the host to registration status 5;
  - an `event_time` change notifies approved guests (`guests_8`);
  - deleting a salon denies its registrations (with guest notifications) and frees the witness.
- The wizard draft survives a reload. Submitting runs the same zod schema on client and server.
- QA sign-off on mobile and desktop, Hebrew and English, and the orthodox variant.

## Out of Scope

- Account creation, login and host↔guest conversion (→ `authentication-and-accounts`).
- Staff-only fields and actions on the host salon (volunteer, contacted/preparation/special-population switches,
  special-attention text, staff comments) (→ `admin/hosts-and-salons-management`).
- Managing trainings, salon days and org types (→ `back-office-operations`).
- Notification templates and delivery (→ `notifications-and-reminders`).
- Teaming a witness to the salon (→ `admin/salon-teaming`).

## Parity & Deviations

**Preserve (legacy baseline):**
- Host onboarding: first and last name, phone, `is_org`; org → `org_type` (the full legacy list; orthodox build: its own
  list) and `org_name` required. Host created → registration status 3; first salon → 5. Only finished hosts appear
  on the map, in teaming and in the Easy feed. Org hosts get Hebrew as their primary language.
- Dates: only future `SalonDay`s. The default date follows the legacy rule (private: today if it's a salon day, else
  the year's default day, else the first future day; orgs: first future `yom_hol` Sunday; after 19:00 → the next
  date; default time 19:00).
- Wizard fields and defaults: `is_open_for_guests` true, `need_witness` true, `easy_permission` true (shown only for
  IL), language Hebrew. Private salons skip the guest-capacity step. Staff note ≤255. `comments_for_guests` ≤1000 is asked after
  creation.
- Orthodox build: a shorter wizard, salons forced private, and the guests and customized-salon tabs hidden.
- Witness lock: date immutable once a witness is assigned. Time must fit the witness slot's time of day, with a
  "can change" / "can't change" check before saving.
- Capacity can't go below the seats taken. When `survivor_needed` is false, an assignment is auto-created with no witness.
- Delete: deny all registrations (guest notifications), free the witness, remove the salon.
- Host salon page: details, approved guests with remove, witness card with "contacted witness", the customized-salon link
  (`builder.zikaronbasalon.com`), share links (`/salons/:id` in the rewrite), the Igul LeTova prompt (not in orthodox mode),
  and an empty state with "add salon".
- The one-salon-per-year limit for private hosts stays **not enforced** (it's commented out in legacy).

**Adopted deviations (recorded as decisions in the owning spec):**
- A host can only access their own salons. Legacy's `/api/host_salons/` is unscoped (join-report Uncertainties #5).
- Server-side validation with inline field errors, replacing `getValues()` submit and swallowed errors (legacy bug).
- Address must match the chosen city, checked with real geocoding (design-reference #3). This fixes legacy accepting
  an address in another city.
- Strict phone validation, E.164 (design-reference #2).
- One time-of-day rule, morning from 08:00 (design-reference #1). Legacy's host check used 07:00 and the admin check used 08:00.
- Autosaved draft, live card preview, seats meter and checklist (prototype UX, additive).
- The `9999` floor/apartment sentinel becomes empty. The `stuff_free_text` typo goes away in the new schema.

**Decisions to confirm:**
1. **Training only for first-time hosts** (design-reference #4). Legacy requires a training on every save. This is a
   product rule change, not a bug fix.
2. **Wizard shape and limits.** 4 steps instead of 5 (design-reference #5); capacity 2–200 instead of 1–999 with 0 meaning
   "unlimited"; time picker 08:00–22:30 instead of 07:00–23:00.
3. **Digital salons.** The data model, map and Easy feed support them, but the legacy wizard forces `is_digital=false`.
   Should hosts be able to create digital salons (with `site_link`)?
4. **Igul LeTova pop-up**: keep it (legacy shows it once on arrival) or move it into the checklist?
5. **Orthodox org types**: the legacy code has 5 entries and the old AgentOS spec says 4. Confirm the list.
