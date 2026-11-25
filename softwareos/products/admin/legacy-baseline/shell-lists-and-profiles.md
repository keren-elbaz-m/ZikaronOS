# Admin lists, dashboard, add-witness, host & guest profiles — legacy behavior

Source of truth for admin = `zikaron-basalon-fe-admin`. The public `zikaron-basalon-fe` also contains an `/admin/*` copy (reachable only via silentLogin — normal admin login there is rejected with `login.notAdminSystem`). The two copies have DRIFTED (e.g. fe uses 7-digit phone + prefix and hardcoded 2024 date windows; fe-admin uses the Israeli phone regex incl. 07x). Parity target = fe-admin; fe `/admin` is not rebuilt.

## Access
- Roles: super, general, global, volunteer, host, testimonials admin. `/admin` PrivateRoute: token, policy confirmed, role ∉ {host, guest, witness} else logout → `/`. Route-level role checks: none (sidebar-only).
- Init: `GET /api/cities/`, `/api/communities/` (id 1 "No Community" → "ללא קהילה"), `/api/languages/`.
- Sidebar (role-filtered; desktop): dashboard (all); salons, hosts (super/volunteer/general/global/host admin); witness (super/volunteer/general/global/testimonials); addWitness (super/volunteer/general/global); assigns (super/volunteer/general/global); guests (super/general/global); communities/volunteers/setDates/contacts placeholders.
- In-screen gates: community filter + `checkRoleToDisplay` columns → super/general; row checkboxes, CSV export, bulk delete → super admin; delete witness → super/global (fe-admin).
- Header: greeting, logout, LanguageToggle (he/en), logo → `https://app.zikaronbasalon.com/admin`.

## Shared list mechanics
- Filters: dropdown single/multi, date multi-day (`YYYY-MM-DD`), checkbox (`param=true`), `hours` → `available_morning|noon|evening=true`, both is_digital → dropped. Search 500ms → `free_text`. Sort → `order_by` + `reverse`. Searchable city/community dropdowns. "Clean".
- Table: page size 15, react-paginate when >1 page, reset to page 0 on filter/sort change; "presents X out of Y" + "N active filters" when filtered else total. Cell formatting: booleans yes/no; `didnt_complete_registration` inverted; is_digital both/digital/physical; dates `dd-MM-yyyy` / `HH:mm, dd-MM-yyyy`; tooltip truncation; empty → `admin.table.notFound`. Row click → profile with `state.tableNavigationData`.
- Bulk (super admin): "N selected", select-all (fetch all with `pagination=false`), CSV (`DD-MM-YYYY <n> <entity>.csv`, Hebrew headers), delete (no confirm; per-id DELETE).
  - CSV witness: id, first_name, last_name, phone_number, mobile_number, email, city_name, witness_type, hosted_before, archived, available_for_teaming, special_attention_text, availability_status, host_assigned, community, can_use_zoom.
  - CSV salons: id, contact_name, email, city_name, contact_phone, organization, contacted, survivor_needed, witness_assigned, community, special_attention_text, event_time.
  - CSV guests: id, full_name, email, phone. CSV hosts: id, full_name, city, phone, email, is_org, created_at, didnt_complete_registration (inverted), community.

## Dashboard `/admin`
- Filters city (+community for super/general). Calls the 4 `*_dashboard` endpoints on change.
- Boxes: Salons (total; didnt_contacted, waiting_for_witness, digital_salon, not_digital_salon), Hosts (total; is_org, didnt_complete_registration, attend_preperation_evening, was_hosts_before), Guests (total; didnt_finish_registration, pending_approval, approved, without_salon), Witnesses (total; by type; waiting_for_conservation, waiting_for_assignment, waiting_for_contact). Each with "Go to …".

## Lists
- Witnesses `GET /api/witnesses/`: columns id, fullName, city, witness_type, availability_status, hosted_before, can_use_zoom, host_assigned, special_attention_text, community*, take_part_in_additional_programs*. Filters city, witness_type, witness_status, language, availability_date, hours, special_attention, hosted_before, community*, programs (broken source), checkboxes `no_archived` (default on), `can_use_zoom`.
- Hosts `GET /api/hosts/?pagination=true`: id, full_name, city, phone, email, is_org, created_at, recent_account_update, didnt_complete_registration (sortable), community*, is_digital*. Filters has_salon, is_org, is_digital, checkboxes joined_this_year, didnt_complete_registration.
- Guests `GET /api/guests/?pagination=true`: full_name, email, phone, status, salon_name, city, guests_number, didnt_complete_registration, community*. Filters status, city, guests_number, community*, didnt_complete_registration. (Export-all broken — missing return.)
- Salons `GET /api/host_salons_list/`: id, contact_name, city_name, contact_phone, organization, contacted, survivor_needed, witness_assigned, special_attention_text, community*, is_digital*, site_link*. Filters city, availability_date, special_attention, contacted, witness_assigned, contacted_witness, language, is_org, community, is_digital, checkboxes open_requests, first_salon, no_link. Row → host profile.
(* = super/general only)

## Add witness `/admin/witnesses/addwitness` (single page, 4 cards: Personal, Contact, Accessibility, More info)
- Required: first/last name, city, languages, witness_type, stairs; ≥1 of phone/mobile/contact phone; email formats. Duplicate-phone check on blur (`POST /api/witnesses_duplicate_validation/`) → "Houston" modal blocks. Empty address confirm. `POST /api/witnesses/` → modal "go to profile". Failure: no message (bug). Cancel: confirm → list.

## Witness profile — see admin-witness-profile.md.

## Admin host profile `/admin/hosts/profile/:id`
- `GET /api/hosts/{id}/`; header back, `host.profilePage`, name, org → salon count + "add salon for org" (NewSalon modal, `POST /api/host_salons/` with contact_phone forced +972).
- `GET /api/hosts/{id}/summaries/` → year tabs (window of 5, arrows); preselect from navigation state; no salons → "add salon".
- Personal details: name, phone (admin: WhatsApp web link >1290px else call/chat modal), email, org_name, ID, date_joined. Edit first/last required, phone valid; `PATCH /api/hosts/{id}/`.
- Salon card (accordion; org salons start collapsed): lazy `GET /api/host_salons/{id}/`, witness details, comments. Header: title, date `DD.MM.YYYY | HH:mm`, witness badge; open/close-for-guests toggle (`GET salonguests?salon=` → confirm → PATCH `{evening_public, is_open_for_guests, lat, lng}` (+`max_guests:1` if no requests)); share; Excel/CSV of approved guests (שם/טלפון/כתובת מייל/מספר אורחים, `DD.MM.YYYY guests.csv`).
- Info: org contact/phone/branch; date, hour, first salon, language, city, address/apt/floor/accessibility, survivor_needed, open, max_guests, training, is_digital, site_link, guest comments, team comments.
- Edit (schema: date, event_time, language, city, survivor_needed, training required; org contact name/phone; max_guests 1–999; site_link URL): org fields; date (salon days) + time; first salon (inverted); is_digital; language; city/address; apt; floor (3 digits); accessibility [Elevator, Wheelchair accessibility]; survivor_needed (disabled when witness assigned); open; max_guests + comments_for_guests (1000); site_link (open+digital); team comment (255). Witness-assigned date/time rules as public site (check_time_range). Payload adds `address||'No address'`, apt/floor ??0, date `DD.MM.YYYY`, time `HH:mm`, lat/lng.
- Admin section: volunteer select (`GET /api/communities/{id}/volunteers_list/`; PATCH `{volunteer}`), switches contacted / preparation_evening / special_population (immediate PATCH), special_attention_text (255, 3s success), read-only salon id + sign date, comments (2000; POST/DELETE no confirm).
- Witness details: name (link to witness profile except host admin), phone, city, "communication with client" switch (`PATCH /api/salons/{salon}/ {host_contacted_witness}`), assignment date, free text, link.
- Guest requests: `GET api/salonguests/?salon=`; pending vs approved (denied hidden); available seats = max − approved; Approve (`PATCH {status:'approved'}`; blocked by "noSalonSpace"); Reject/Cancel (confirm → `PATCH {status:'denied'}`). Card: name, phone, email, seats, created_at.
- Delete salon: confirm (with/without witness text) → `DELETE /api/host_salons/{id}/` (optimistic).

## Admin guest profile `/admin/guests/profile/:id`
- `GET /api/guests/{id}/`, `GET /api/salonguests/?guest={id}&denied=false`. Back link, full name.
- Personal: name, "address, city", phone, email; edit first/last/city/phone required + address → `PATCH /api/guests/{id}/`.
- Registered salon (not denied): status sticker pending/approved; host/org name; phone (approved only); day type; `DD.MM | HH:mm`; link + tel (approved); address digits hidden unless approved; map modal; distance; accessibility; free places = max − confirmed − pending; languages; comments. Change guests count 1/2/3 → `PATCH /api/salonguests/{id}/ {guests_number}` (3s success). Cancel → `DELETE /api/salonguests/{id}/`.

## Notable admin bugs (do not replicate)
Open-for-guests toggle only PATCHes earliest-year salons; stale CSV export; shared global approved-guest counter; accessibility default from another salon; current time sent when hour unchanged; wrong modal closed on "can't change time"; assignment date lost after PATCH; broken no-salon cancel; mobile NewSalon cancel no-op; training required on every save; optimistic deletes without rollback; guest phone `++972`; multiple guest salons merged; "undefined" headers.
