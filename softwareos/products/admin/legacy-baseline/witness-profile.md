# Admin Witness Profile — legacy behavior (zikaron-basalon-fe-admin)

Base `zikaron-basalon-fe-admin/src/`; WP = `components/Admin/Witnesses/WitnessProfile/`.

> Working tree has an UNCOMMITTED change: `utils/forms/constants.ts:15` regex `/w^\+?(972|0)...$/` (stray `w`) — never matches. Spec = HEAD (bfa647c): `/^\+?(972|0)(\-)?0?(([23489]{1}\d{7})|(7[2-9]{1}\d{7})|[5]{1}\d{8})$/`.

## Shell — `/admin/witnesses/profile/:id` (no role guard)
- Mount: `GET /api/witnesses/:id/witness_comments/`; once languages+cities loaded: `GET /api/witnesses/:id/`, `GET /api/salons/witness_past_salons/?witness=:id` (grouped by YYYY of salon_time), `GET /api/salons/witness_future_salons/?witness=:id` (×2; only assigned copy used), `GET /api/witnesses/:id/salons/` (unused), `GET /api/witnesses/:id/witness_year_comments/`, `GET /api/witnesses/:id/witnesses_availability_salons/`. Clear on unmount.
- Profile reshape: strip first comma of address; `created_at` → DD/MM/YYYY; `witnessLang` lookup (missing id → infinite Loader); drop "No selection" from programs.
- Header: back → `/admin/witnesses/list`; title + name; special_attention_text → warning icon tooltip.
- Layout: Personal, Contact, Accessibility, MoreInfo, SalonsAttended (if year comments or past salons); WitnessAssign, WitnessComments. Standalone WitnessAvailability unused.
- Delete witness: only `super admin`/`global admin` (only role gating on screen); confirm → `DELETE /api/witnesses/:id/` (optimistic list removal) → list.

## Shared edit mechanics
- ProfileCardHeader pencil/save(`form` submit)/cancel (confirm if dirty).
- Edit forms in modal; bug: cancel-action confirm never shows (`useGenericModal` tuple misuse); empty ok/cancel buttons rendered.
- Save = `PATCH /api/witnesses/:id/` partial; success replaces profile (without re-formatting created_at/address); failure → global error; edit mode closes before response (edits lost on failure).

## 1. Personal details
- View: first, last, witness type (holocaust_survivor/generation_2/generation_3/expert/other), phone, mobile (LTR), email (blank if `zikaron@basalon.com`), city, address, apartment (hidden if 0), special attention.
- Edit: names; witness_type select; 2 phone inputs (react-phone-input-2, IL, code locked); email; City + Address Places; apartment (number); special_attention_text (255).
- Validation: first 2–13, last 2–30, regex `/^[A-Za-zא-ת""'׳`״ -]*$/`; email format; city required; phones empty-OK else ISRAELI_PHONE_REGEX; at least one phone filled (>3 digits, not just 972) → `atLeastOneNumber`.
- Submit: phones `+`-prefixed or `""`; drop `*_pre`, cityLat/Lng; Places error → silent return; empty address → confirm, lat/lng from city. Duplicate-name block if `adminReducer.duplicateWitnessNames` (minus self) non-empty → `houstonProblem` modal. Blur duplicate-phone check (`POST /api/witnesses_duplicate_validation/`) is dead code here.
- Payload: first_name, last_name, email, witness_type, phone_number, mobile_number, address, city_name, google_city_id, country, lat, lng, apartment_number, special_attention_text.

## 2. Contact details
- contact_name, contact_relation, contact_phone (`+`), contact_email. No validation.

## 3. Accessibility
- View: stairs yes/no; special_population (hardcoded Hebrew map: Teenagers and children/Soldiers/Companies and organizations); accessibility_need wheelchair/treadmill; can_use_zoom interested/not_interested; languages; special_needs.
- Edit: stairs radio; accessibility_need single checkbox; special_needs (1000); special_population multi; can_use_zoom radio; languages multi (≥1 required).

## 4. More info
- View: country_of_birth, date_of_birth (DD/MM/YYYY), how_brought, created_at, community ("No Community" translated), witness_details_free_text, site_link (link), hosted_before, take_part_in_additional_programs (hardcoded Hebrew map; "Fulfillment routes"→חרדים mismatch), witness_presentation_details (+warning note).
- Edit: country, DOB (max = start of current year, YYYY-MM-DD), created_at/community read-only, how_brought, free text (2000), site_link, hosted_before, programs (Life story / Fulfillment routes / Holiday events / Happy to talk), presentation (2000). No validation.

## 5. Status & assignment (WitnessAssign)
- View: status (`archived` or availability_status); archived reason; did_not_answer → last call `DD/MM/YY, HH:mm`; available_this_year → assign status (assigned / openForAssign / noAvilabilty), count, want_to_participate_amount_salons, availability list; note by status (archived_free_text / not_interested_this_year_free_text / call_again_free_text).
- Assigned salons: day type (yom_shoa / erev_yom_shoa / yomHol), date/time, host link (state.witnessAssaignSalon), assigned by. Unassign (edit mode, confirm) → `PATCH /api/salons/:salonId/ {witness_salon:null}`; in-place splice, no refetch.
- Edit: status select (not_contact_this_year, did_not_answer, available_this_year, not_available_this_year, archived).
  - Any future assigned salon → all status changes blocked (`witnessAssignToSalon` modal).
  - Has availability and new status ≠ available → confirm.
  - archived → `archived=true, availability_status='not_contact_this_year'`; else `archived=false`.
  - Archived reason radio: deceased / physical limitation / not interested / other.
  - did_not_answer: last-call date (≤ today) + time, always sent (ISO).
  - available: want_to_participate_amount_salons 1–9 required; embedded availability editor.
  - Status note max 225.
- Submit: `available_for_teaming = status==='available_this_year'`; if available → validate + bulk availability save (abort if all deleted and none remain: `availabilityDates1/2`) → profile PATCH → refetch profile. Parent refetches availability (and year comments) after 500ms.

## 6. Availability
- Rows: date (salon days only; default today-if-salon-day → default_for_year → first future, 19:00), morning/afternoon/evening checkboxes, remove (existing ids → salons_to_delete). Validation: ≥1 hour per row; no duplicate date.
- Save: `POST /api/witnesses/:id/witnesses_availability_salons/bulk_update_witness_salon_list/ {salons_to_delete:[ids], salons:[{id?, salon_date:'YYYY-MM-DD', can_morning, can_afternoon, can_evening}]}`.

## 7. Team comments
- Add (2000, non-empty) → `POST /api/witnesses/:id/witness_comments/ {comment}` (prepended). List: text, "by {created_by}, DD/MM/YYYY, HH:mm", delete (no confirm, no role check) → `DELETE /api/witnesses/:id/witness_comments/:commentId/`.

## 8. Salons attended by year
- Year tabs = union(comment years, past-salon years) desc (bug: no tabs if zero comments). Default = max salon year.
- Per salon: date, hour, host, assigned by; year summary note.
- Edit: comment (2000) for year → PATCH `/api/witnesses/:id/witness_year_comments/:commentId/ {comment, comment_year, id}` or POST `.../witness_year_comments/ {comment, comment_year}`.

## Gotchas
In-place state mutation; timing-based refetches (5/6/500ms); i18n keys built from raw API values (incl. spaces).
