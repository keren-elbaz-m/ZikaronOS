# Admin Salon Teaming (witness ↔ salon matching) — legacy behavior (zikaron-basalon-fe-admin)

Paths relative to `src/`.

## Routing & gating
- `/admin/salonteaming` → redirect to map; `/admin/salonteaming/mapview`, `/admin/salonteaming/tableview` (exact).
- `/admin` guarded by PrivateRoute (token, policy confirmed, not host/guest/witness). Sidebar item `assigns` (link → table, extra → map) visible only for super/volunteer/general/global admin — menu-only gating; URL reachable by any admin.

## Layout
- FilterHeader → PageBody (Map or Table + Sidebar + floating toggle) → assign modals.
- Toggle: on map label `list` → table; on table label `map` → map; clears both lists first.

## Filters (sent identically to both witness & salon endpoints; arrays as repeated keys)
| key | options | default |
|---|---|---|
| salon_assigned | true/false | active, `false` |
| witness_status | waiting_for_first_assignment, waiting_for_more_assignments, not_contact_this_year ("needToContact"), assigned | active, first two |
| city | city ids | — |
| availability_date | date picker → YYYY-MM-DD | — |
| availability_hour | morning/noon/evening | — |
| language | ids | — |
| accessibility | names | — |
| special_population | names | — |
| is_digital (single) | true/false | — |
- Search → `free_text`. Clear resets to defaults. Table sorting UI has no effect (sortBy never sent).

## Data
- Map: `GET /api/witnesses_teaming/` then `GET /api/host_salons_teaming/` (sequential) with `pagination:false`; strip first comma of witness address.
- Table: only active tab endpoint; paginated `{results,count,next,previous,total_no_filters}`; page size 15; header "presents X out of Y" when filtered else total_no_filters. Default tab witness.
- Witness columns: id, full_name (sortable), address (city+address), teaming_status. Salon columns: id, contact_name (sortable), address, is_digital (Digital/Physical/both), teaming_status.
- teaming_status: not_contact_this_year ("Pending retention"), waiting_for_first_assignment, waiting_for_more_assignments, assigned. Selecting assigned/not_contact → no detail fetch (assigned → name/address/"is assigned"; not_contact → "didn't speak with witness" error).

## Map
- Markers = witnesses + host salons, icons by status (salon: only assigned/waiting_first have icons). Color key: green assigned, red not assigned, yellow waiting more.
- Maps key hard-coded in `public/index.html:28` (`language=he`) — rewrite: env.
- Zoom 12; center desktop `32.109333,34.855499`, mobile `32.087434,34.786223`; POIs hidden; render in-bounds only; marker 48×63 active / 32×42; labels at zoom ≥12.
- Clustering gridSize 15, min 2; <15 zoom click zooms; ≥15 opens "optionsInProximity" list (salon/witness suffix) → select.
- Map click clears selection.

## Selection → sidebar
- Witness: `GET /api/witnesses_teaming/{id}/` + `GET /api/witnesses/{id}/relevant_host_salons/?filter_accessibility&filter_language` (parallel); options sorted by distance asc, nulls last.
- Salon: `GET /api/host_salons_teaming/{id}/` + `GET /api/host_salons/{id}/relevant_witnesses/?filter_accessibility&filter_language`.
- Client availability filter: salon event date ∈ witness availability dates AND slot matches (morning 08:00–11:59, noon 12:00–16:59, evening 17:00–23:59; before 08:00 matches none).
- Sidebar: loader; "choose to start" / no results / salons_not_found / witnesses_not_found / not_contact errors; details card (contacted check "hostLeaderContact"; collapsible); "moveToProfile" (new tab); option search (750ms, by name); count header; accessibility + language filter toggles (default on; toggling refetches); option cards (name, address, distance `km`/`ק״מ`, contacted check; expanded details + goToProfile + Assign). Client-side "show more" page 15.
- Witness details: name, phone, address (+"inaccurate location" when no address), stairs/accessibility_need, availability (collapsible ≥3), languages, first salon, special population, type, attention note, zoom. Salon details: contact name, phone, address, accessibility+floor, `DD.MM.YYYY | HH:mm`, language, first salon, special population, digital, organization, attention note.

## Assign
1. Assign on option → confirmation modal `AssignHostWitness` (no overlay close): title assignHostAndWitness, subtitle successfulAssignment + emailSentAfterValidation; two columns × 9 rows (name, phone, address, accessibility, dueIn, language, firstSalon, special population, attention note); witness dueIn = availability matching salon date.
2. host salon already has `salon_id` → `PATCH api/salons/{salon_id}/ {witness_salon}`; else `POST api/salons/ {host_salon, witness_salon}` (witness_salon = matched WitnessSalon availability id).
3. Result modal: success (successfulAssignment, emailSent) / error (somthingWentWrong, tryAgain); buttons backToAssignmentPage, goToHostProfile (`/hosts/profile/{host}`).
4. Closing result → reset selection → list refetch.
- Backend side effect: host gets assignment email/WhatsApp by witness type (see backend-admin-api.md §4).

## Known legacy bugs (do not replicate unless decided)
Salon marker click on map doesn't load details ('hostSalon' vs 'salons'); string spread into query params; witness/salon id collision on map; cluster list matched by name; loading never reset on error; null-unsafe address/languages; stale distances / "null km" / double "km"; show-more off-by-one; assign crash when no matching availability; server-side "load more" dead and mis-wired; table sort no-op.
