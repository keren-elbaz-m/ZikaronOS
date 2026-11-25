# Hosts & Salons Management — Product Brief

> Epic: epic.md · Product: ../../mission.md

## Goals

Staff spend most of each season on hosts and their salons. They find the salons that need
attention (no contact yet, waiting for a witness, open guest requests, digital with no link),
call the host, fix salon details, manage the guest list, and record what happened. In legacy
this work is split between a salons list, a hosts list and a long host profile with an accordion
per salon, and it carries known bugs: the open-for-guests toggle updates the wrong salons,
deletes are optimistic with no rollback, and exports go stale.

Goals:
- Rebuild the hosts list, the salons list and the admin host/salon profile in `apps/admin`. They
  must reach parity with [shell-lists-and-profiles.md](../../legacy-baseline/shell-lists-and-profiles.md)
  and use the prototype's UX: one staff page per salon, and a host page with history by year.
- Keep every admin rule the API enforces today: role and community scoping, the salon update error
  codes, and the capacity checks.
- Fix the listed admin bugs instead of reproducing them, and record each fix as a deviation.

## User Stories

- As a general / global / volunteer / host admin, I can list the salons in my scope from the last
  30 days onward. I can filter them by city, date, language, contacted, witness status, open requests,
  first salon, org, digital, no link and special attention, and search them, so I can build my call list.
- As a super or general admin, I also see and filter by community, digital and site link.
- As an admin, I can list hosts and filter them by has salon, org, digital, joined this year and
  didn't complete registration, so I can chase hosts who haven't finished signing up.
- As an admin, I can open a host and see their details, their salons by year, and staff comments, and
  edit their name and phone.
- As an admin, I can open one salon and in one place see and edit:
  - its details (date, time, language, city and address, accessibility, capacity, digital link, guest note)
  - its witness
  - its guests
  - the follow-up switches (contacted, preparation evening, special population) and the volunteer
  - team comments
- As an admin, I can approve, deny or remove guest requests within the remaining seats, and export
  the approved guests to CSV.
- As an admin, I can open or close a salon for guests, and the change applies to that salon only.
- As an admin, I can create a salon for an organization host.
- As an authorized admin, I can delete a salon after a confirmation that warns when a witness is assigned.
- As a super admin, I can select rows, bulk-export them to CSV with Hebrew headers, and bulk-delete them
  after a confirmation.

## Success Criteria

- Every behavior in the "Admin host profile", "Lists → Hosts" and "Lists → Salons" sections of the
  baseline has a test, or a waiver recorded in the owning spec.
- List results match legacy for the same filters, role and community across a seeded fixture set. This
  covers both general admin variants: general = IL **or digital** on salons, and IL-only on hosts. It is checked by
  API contract tests.
- Salon update returns the legacy error codes: `1001` (date change with a witness), `1002` (time
  outside the witness slot), `1003` (capacity below registered guests). Turning off `survivor_needed`
  while a witness is assigned is rejected.
- Approving a guest never exceeds `max_guests`. Seats left = max − approved, shown live.
- Open/close for guests updates only the target salon (fixes the earliest-year bug).
- Every delete (salon, comment, bulk) asks for confirmation and rolls back the UI on failure.
- Route-level authorization: a role without access to hosts/salons gets a 403 from the API and a
  not-allowed page in the app. Typing the URL is not enough to get in.
- CSV export reflects the current filters at the time of export and uses the legacy column set and
  Hebrew headers, or the prototype's set if that decision is confirmed.
- The security review passes, and QA signs off against the spec acceptance criteria.

## Out of Scope

- The salon-creation wizard and the host's own salon page on the public site: `platform/salon-hosting`.
- Guests list and guest profile: [guests-management](../guests-management/epic.md).
- Assigning or replacing a witness: [salon-teaming](../salon-teaming/epic.md). This epic only shows the
  assigned witness, the "contacted witness" switch, and links to the witness.
- Managing salon days, trainings, communities and roles: `platform/back-office-operations`.
- Notification content triggered by salon changes (`guests_8`, `hosts_4`, `guests_3`): `platform/notifications-and-reminders`.
  This epic only has to call the domain events that send them.

## Parity & Deviations

**Preserve (from the baseline):**
- List mechanics: filters, free-text search, sort, page size 15, "X out of Y", and new-tab row navigation (or same-tab if changed by decision).
- Role and community scoping exactly as the API does it, including the 30-day lookback on salons.
- Salon edit schema: required fields, max_guests 1–999, floor up to 3 digits, comments up to 1000, team comment up to 255, staff comments up to 2000. The date must be a configured salon day.
- Assigned-witness rules: the date is locked, the time must fit the slot, and survivor_needed is locked.
- Guest request lifecycle (pending / approved / denied, denied hidden) and the capacity block "noSalonSpace".
- The volunteer select is limited to the community's volunteers (non-super admin roles).
- Salon delete also removes the assignment and denies all guests, with their notifications.
- The CSV column sets from the baseline.

**Adopted deviations (fix legacy bugs):**
- The open-for-guests toggle targets the selected salon only. Approved-guest counts are per salon (no module-global counter).
- Deletes ask for confirmation and roll back on failure. The time is sent only when it changed. The assignment date is kept after a PATCH. Training is required only for first-time hosts ([design-reference #4](../../../../ecosystem/design-reference.md)).
- Guest phone is normalized to E.164 (no `++972`). A guest with several salons is no longer merged.
- Route-level authorization replaces sidebar-only gating ([join-report](../../../../join-report.md) uncertainty #5).
- Time-of-day buckets use one rule: 08–12 / 12–17 / 17+ ([design-reference #1](../../../../ecosystem/design-reference.md)).

**Decisions to confirm:**
- One host record per email ([design-reference #9](../../../../ecosystem/design-reference.md)). Legacy is already 1 User : 1 Host. Confirm there is no merge or dedupe work beyond that.
- Who can bulk-export and bulk-delete: the baseline says super admin only, but the admin-discovery code read shows super **or global** admin (`HostList:127`).
- Should guest approval stay manual? Legacy guest registrations are created `approved`, so the pending queue is mostly empty.
- The prototype's single salon page compared with legacy's accordion per salon on the host page: is the host page then a summary that links to each salon?
- Should row clicks keep opening a new tab?
- Should capacity follow the prototype's 2–200 range, or legacy's 1–999 on the admin side?
