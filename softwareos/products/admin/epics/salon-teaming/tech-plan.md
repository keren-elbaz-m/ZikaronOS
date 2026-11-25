# Salon Teaming — Tech Plan

> Epic: epic.md · Product: ../../mission.md

## Approach

Build the matching logic as a NestJS `teaming` module with two parts:
- A **candidate query** in SQL that applies the legacy eligibility rules. It is role-scoped and
  computes distance in the database.
- A **scorer** that turns each candidate into a score plus ✓/✗ reasons, ported from the prototype's
  `matchWitnesses` (`prototype/zikaron-next/lib/utils.ts:61-86`) and adjusted to the legacy rules.

Both directions (salon → witnesses and witness → salons) share the same rule functions, so they
can't disagree. Assign, replace and unassign go through one `AssignmentService` in a transaction:
1. validate the date and slot
2. write the `Salon` row
3. recompute `available_for_teaming` via the witnesses domain service
4. emit `WitnessAssigned` / `WitnessUnassigned` events, which the notifications module turns into `hosts_2*` / `cancel_witness`

Undo is an unassign of the same assignment, guarded by an id and a short window.

The admin UI at `/admin/teaming` has a queue (URL state `?salon=`), a ranked candidate panel, a confirm
dialog and an optional map tab. It uses Google Maps with marker clustering (key from env) and namespaced
marker ids (`salon:<id>` / `witness:<id>`).

## Architecture Impact

- **API:**
  - Endpoints: teaming salons list + detail, teaming witnesses list + detail, candidates for a salon,
    candidates for a witness, and assignments (assign / replace / unassign).
  - Contract-compatible with the legacy `host_salons_teaming`, `witnesses_teaming`, `relevant_*` and
    `salons` endpoints, so the parity harness can diff them. The new endpoints add `score` and `reasons[]`.
  - Normalize the inverted `pagination` semantics.
- **Domain events:** `WitnessAssigned` / `WitnessUnassigned`, consumed by `platform/notifications-and-reminders` and by the dashboard counters.
- **Data:**
  - The `Salon` assignment row is unchanged (`host_salon` 1:1, `witness_salon` 1:1 nullable, `assignment_time`, `assigned_by`, `host_contacted_witness`).
  - Add DB uniqueness on `witness_salon` if the migrated data allows it, to prevent double teaming.
  - Distance: PostGIS or a Haversine SQL expression (decide in `platform/platform-rewrite`).
- **Time buckets:** one shared `slotOf` in `packages/contracts`, using naive Asia/Jerusalem local time. No UTC conversion.
- **Admin app:** routes `/admin/teaming` (queue) and `/admin/teaming/map`, with candidate card, reasons list, confirm dialog, and a toast with undo.

## Risks & Unknowns

- **Dependency:** [witnesses-management](../witnesses-management/epic.md) must deliver the
  `available_for_teaming` domain service and the slot model first. Teaming consumes them.
- **Dependency:** `platform/notifications-and-reminders` must deliver the `hosts_2*` / `cancel_witness`
  senders. Undo needs a decision on delaying or cancelling the send (see product brief).
- **Dependency:** `admin/admin-auth-and-shell` (guards, shell) and `platform/platform-rewrite` (schema, parity harness, distance strategy).
- Legacy eligibility has asymmetric quirks: the witness → salon time check uses any slot, and the
  salon-side stairs check differs from the witness side (floor 9999 counts as OK). Spike: characterization
  tests against the legacy API for both directions before porting, then record each quirk as kept or fixed.
- Concurrency: two coordinators assigning the same witness or salon at once. Legacy has no guard. Use a
  transaction with a uniqueness or row lock, and return a clear conflict error.
- Performance: scoring every witness for every queue click. Fetch the candidate set in one query and score it in memory. Verify on a full-season data set.
- Moving the time buckets off the server timezone changes which matches qualify. Confirm the 08:00 rule
  with the customer (it overlaps `platform/salon-hosting`'s 07:00 check).

## Candidate Specs

- `teaming-candidate-engine` — API candidate queries (both directions) with legacy eligibility, distance, score and reasons. Parity tests against the legacy `relevant_*` endpoints.
- `teaming-assign-and-undo` — the assignment service (assign / replace / unassign / undo) with validation, the `available_for_teaming` recompute, domain events and a concurrency guard.
- `teaming-queue-ui` — the `/admin/teaming` queue, filters, ranked candidate panel with reasons, confirm dialog, toast undo and auto-advance.
- `teaming-map-view` — the map tab with salons and witnesses, status colors, clustering, proximity list, and selection into the same candidate panel.
