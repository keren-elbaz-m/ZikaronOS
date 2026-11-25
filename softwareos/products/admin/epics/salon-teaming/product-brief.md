# Salon Teaming — Product Brief

> Epic: epic.md · Product: ../../mission.md

## Goals

Teaming means matching a witness to every salon that asked for one. It is the core staff job of the
season and the reason the admin exists. Coordinators must answer one question quickly: "who is the
best available witness for this salon?" The legacy map/table/sidebar answers it, but it doesn't
explain its matches and has many bugs:
- salon markers don't load
- witness and salon ids collide on the map
- the loader spins forever on error
- distances go stale or show "null km"
- table sort does nothing
- assigning crashes when no availability matches

Goals:
- Rebuild teaming in `apps/admin` with the prototype's UX: a queue of salons waiting for a witness, and
  ranked candidates, each with its ✓/✗ reasons (date and slot, language, distance, accessibility, yearly load).
  Then a confirm dialog, undo, and auto-advance to the next salon.
- Keep every legacy matching rule and assignment side effect from
  [salon-teaming.md](../../legacy-baseline/salon-teaming.md) and backend-discovery §6.5. Candidate
  eligibility, assignment validation, host notifications and the `available_for_teaming` updates must stay identical.
- Keep a map view for geographic teaming, without the legacy bugs.

## User Stories

- As a super, general, global or volunteer admin, I see a queue of salons in my scope that need a
  witness, from the last 30 days onward, sorted by date. I can filter it by city, date, slot, language,
  accessibility, special population, digital and assigned status, and search it.
- As a coordinator, I pick a salon and see eligible witnesses ranked by fit. Each one shows why it fits
  or doesn't, with distance in km. I can toggle the language and accessibility filters and show
  ineligible witnesses greyed out.
- As a coordinator, I can start from a witness instead and see the salons that fit them.
- As a coordinator, I compare salon and witness side by side in a confirm dialog (name, phone, address,
  accessibility, slot, language, first salon, special population, attention note), then assign.
- After assigning, the host is notified with the witness's details by witness type, and I move to the
  next waiting salon. I can undo right away.
- As a coordinator, I can replace or unassign a witness on a salon, and the host is notified of the cancellation.
- As a coordinator, I can switch to a map of salons and witnesses with status colors and clustering. I
  can select either one from the map.

## Success Criteria

- Candidate lists match legacy for the same salon or witness and the same filters, over a seeded fixture
  set, in both directions (`relevant_witnesses`, `relevant_host_salons`). Covered by API parity tests.
- Assignment is rejected unless the witness slot date equals the salon date and the slot covers the salon
  time. It is rejected if the salon already has a witness, unless this is a replace. Covered by tests.
- On assign:
  - `assignment_time` and `assigned_by` are set
  - the correct `hosts_2a/2b/2c/2d/2e` email + WhatsApp template is emitted by witness type
  - the witness's `available_for_teaming` is recomputed
  On unassign, `cancel_witness` is emitted and `host_didnt_contacted_witness` is reset. Verified by domain-event tests.
- Ranking is deterministic and explained. Every candidate shows its reasons, ineligible ones sort last,
  and distance is never "null km". Missing coordinates are shown as "location inaccurate".
- No legacy teaming bug from the baseline's "Known legacy bugs" list can be reproduced. Each one has a regression test.
- Teaming routes return 403 for host admin and testimonials admin, at the route and in the API (legacy only hid the menu).
- Selecting a salon, scoring and showing candidates takes under TBD ms on a season-sized data set (the target number is TBD with the customer).
- The security review passes, and QA signs off on the full assign → notify → undo → reassign loop.

## Out of Scope

- Editing witness availability and status: [witnesses-management](../witnesses-management/epic.md).
- Editing salon details and the "contacted witness" switch: [hosts-and-salons-management](../hosts-and-salons-management/epic.md).
- Template content and delivery of `hosts_2*` / `cancel_witness`: `platform/notifications-and-reminders`.
- Automatic (unattended) assignment. Staff always confirm.
- `check_double_teaming` and other Django-admin scripts: `platform/back-office-operations`.

## Parity & Deviations

**Preserve:**
- Candidate eligibility (backend-discovery §6.5):
  - role scope
  - `available_for_teaming`
  - an **unassigned** slot on the salon date covering the time bucket
  - stairs/accessibility: if the salon has no elevator and floor ≠ 0, the witness needs `stairs`
  - language filter (default on)
  - digital salons need `can_use_zoom`
  - special-population rule
  - optional city
- Salon queue: survivor needed, host finished registration, event within 30 days back. Witness teaming
  list: non-archived, teamable, `not_contact_this_year` or available with a recent slot.
- Teaming status labels for salons and witnesses (`waiting_for_first_assignment`,
  `waiting_for_more_assignments`, `assigned`, `not_contact_this_year` = "pending retention").
- Assign = PATCH the existing `Salon` or POST a new one. Unassign = PATCH `witness_salon=null`, never DELETE (DELETE removes the host salon).
- The host notification set and its variables on assign and unassign.

**Adopted deviations (fix legacy bugs):**
- All map, sidebar and table bugs in the baseline list are fixed: salon marker details, id collision, cluster matching by id, loader reset on error, null-safe fields, distance labels, working sort, and no crash without matching availability.
- One time-bucket rule (08–12 / 12–17 / 17+) on both the API and client ([design-reference #1](../../../../ecosystem/design-reference.md)). Legacy matched on UTC-converted constants that depended on the server's timezone.
- Explainable ranking, with the prototype's score as the sort key within eligible candidates ([design-reference #7](../../../../ecosystem/design-reference.md)). Eligibility itself stays the legacy rule set above.
- Route-level role gating ([join-report](../../../../join-report.md) #5).

**Decisions to confirm:**
- **Undo semantics.** Legacy assign sends `hosts_2*` immediately and unassign sends `cancel_witness`. Undo would send the host two messages. Options: delay sending for the undo window, or accept both messages.
- **The prototype score compared with legacy eligibility:**
  - the prototype doesn't block on language (legacy filters by it by default)
  - it ignores zoom and special population
  - its "near" threshold is 25 km
  - Confirm that the score only *orders* legacy-eligible candidates, and that greyed "show ineligible" candidates can't be assigned.
- Yearly limit: legacy uses the last 150 days and the prototype uses "this season". Keep 150 days?
- Keep the map view in Phase 1? The prototype has no map, and legacy is map-first.
- Does the witness-first direction ("salons that fit this witness") live here or only on the witness page?
- A legacy quirk: when matching a salon from the witness side, the time check uses *any* slot the witness has, not the slot on that date. Fix it as a deviation, or keep it?
