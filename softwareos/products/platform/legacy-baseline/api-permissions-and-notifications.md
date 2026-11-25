# Backend staff API, Django admin, notifications — legacy behavior (zikaron-basalon-be)

## Roles & permissions
- Roles (`users/models.py:47-67`): super admin, general admin, global admin, volunteer admin, host admin, testimonials admin, host, guest, witness. `User.communities` M2M → Community.
- Default `IsAuthenticated`; auth = OAuth2 → SimpleJWT → Session → social. Access 1h, refresh 30d rotating; admin roles get 365-day refresh (`users/tokens.py`).
- `IsUserAccessAllows` maps `view.basename` → roles (`common/utils.py:41-179`); unknown basename ⇒ allowed for any authenticated user.
| key | roles |
|---|---|
| witnesses | SA GA GlbA VA TA host witness |
| witnesses_availability_salons, witness_year_comments, witnesses_teaming | SA GA GlbA VA TA |
| salons | SA GA GlbA VA TA host |
| hosts, host_salons, hosts_salons_list | SA GA GlbA VA HA host |
| host_salon_comments, hosts_salons_teaming | SA GA GlbA VA HA |
| *_dashboard | all 6 admin roles |
| host_salon_content | 6 admins + host |
| guests | SA GA GlbA VA guest |
| salon_guests | SA GA GlbA VA guest host |
- Scoping (`query_by_user_role`): SA all; GA Israel (`country_code='IL'`); GlbA non-IL; VA/HA/TA by `user.communities`; host own; else none.
- Pagination page_size 15; inconsistent flags: witnesses/hosts paginated by default (`pagination=false` disables); guests/host_salons unpaginated unless `pagination=true`; teaming/host_salons_list/salons any `pagination` value disables.

## Endpoints (all under `/api/`)
- Auth: `auth/login/` (POST; returns access+refresh, sets cookies), `auth/token/refresh/`, `auth/registration/`, `auth/convert-token` (social), `user_data/` (GET own, PATCH own), `user_data/convert_user_selected/`, `user_data/igul_le_tova/`, `user_data/mark_igul_le_tova/`, `password_reset/` (+`confirm/`; social-aware), `sms_authentication/auth/` (Twilio SMS passcode), `sms_authentication/auth_with_code/` (no expiry, code not consumed), `sms_authentication/change_password/`.
- Reference: `cities/` (anon GET; VA/TA scoped; `free_text` drops scoping; `local` SA), `communities/` (+`{id}/volunteers_list/`), `languages/`, `salondays/` (+`default-day/{yyyy}/`; queryset date frozen at process start — bug).
- Witnesses: `witnesses/` CRUD (DELETE SA/GlbA; `WitnessFilter`: no_archived, can_use_zoom, witness_status[], free_text, city[], witness_type[], language[], community[], not_interested_this_year, special_attention, hosted_before, host_assigned_this_year, availability_date[], available_morning/noon/evening, take_part_in_additional_programs[], order_by ∈ {id, first_name, city, hosted_before, host_assigned, community}, reverse; adds total_no_filters); `{id}/salons/` (uppercase status literal — always []); `{id}/details_for_host/`; `{id}/relevant_host_salons/`; `take_part_in_additional_programs/`; `{wid}/witness_comments/` (any authenticated user!); `{wid}/witness_year_comments/`; `{wid}/witnesses_availability_salons/` (+`bulk_update_witness_salon_list/`); `witnesses_teaming/`; `witnesses_duplicate_validation/` (POST `{phone_number, phone_type}` → 400 `{names:[...]}` or 200 empty); `witnesses_dashboard/`; `export_witnesses` (SA; CSV UTF-8 BOM `witnesses_export.csv`; columns id, שם פרטי, שם משפחה, סוג העד, טלפון נייח, טלפון נייד, אימייל, עיר, כתובת, מספר דירה, שפת עדות, ארץ לידה, תאריך לידה, קישור לאתר/סרטון, פרטים נוספים על העד, פסקה למפת סלונים); `import_witnesses_presentation_details/` (SA; multipart `file`; id col id/ID/Id + presentation col פסקה למפת סלונים|witness_presentation_details|Witness Presentation Details; ≤2000 chars; response summary/successful_updates/failed_updates; 200/207/400).
- Hosts: `hosts/` CRUD (DELETE SA; TA none; HostsFilter: has_salon, didnt_complete_registration, joined_this_year, is_org, is_digital, free_text, order_by, reverse; total_results); `{id}/summaries/`; `{id}/change_host_to_guest/` (deletes Host → cascades).
- Host salons: `host_salons/` CRUD (NO role scoping — any allowed role incl. host can edit any salon); `{id}/relevant_witnesses/`; `{id}/check_time_range/`; `{hsid}/comments/`; `host_salons_list/` (filters: open_requests, city[], availability_date[], witness_assigned, contacted_witness, language[], contacted, first_salon, is_org, org_type, is_digital, no_link, community[], special_attention, free_text, order_by, reverse); `host_salons_teaming/`; `host_salons_map/` (public; future+open+public+finished; non-IL address stripped; 5-min anon cache; filters id, is_digital, is_link_exists, city[], language[], available_places, accessibility, date, time, free_text); `host_salon_training/`; `host_salons_dashboard/`; `hosts_dashboard/`.
- Salons (assignment): `salons/` (GET/POST/PATCH; DELETE SA; host may PATCH only `host_contacted_witness`; validates witness/host date-time compatibility; sets `assigned_by`); `salons/witness_future_salons/?witness=`, `salons/witness_past_salons/?witness=`.
- Guests: `salonguests/` (last 300 days; create forces `status='approved'` and guest = caller); `guests/` CRUD (GuestsFilter: status, didnt_complete_registration, guests_number, city, community, free_text, order_by, reverse); `guests/{id}/change_guest_to_host/`; `guests_dashboard/`.
- EventBridge: `eventbridge_tasks/eventbridge_send_reminders/` (X-API-Key; BATCH_LIMIT 50): hosts_7 (host didn't contact witness 2+ days → email+WhatsApp), guests_6 (disabled), hosts_9 (disabled), hosts_6b (registration incomplete 1 day), hosts_10 (event within 5 days), hosts_3 (approved guest notice), guests_9 (guest no salon 2 days).
- `export_communities` — plain Django view, NO auth (security gap).

## Dashboards (GET; filters `city`, `community` — '1' = no community)
- witnesses: total_witnesses, total_holocaust_survivors, total_generation_2, total_generation_3, total_experts, total_other, total_waiting_for_conservation, total_waiting_for_assignment, total_waiting_for_contact.
- host_salons: total_salons, didnt_contacted, waiting_for_witness, digital_salon, not_digital_salon.
- hosts: total_hosts, total_is_org, total_didnt_create_salon_yet, total_attend_preperation_evening, total_was_hosts_before.
- guests: total_guests, total_didnt_finish_registration_this_year, total_without_salon_this_year, total_with_salon_this_year, total_with_salon_other_year, total_with_salon.

## Django-admin-only capabilities (must exist in the rewrite's admin)
- Users: roles + community assignment (no API!), CSV/Excel export, buttons run-should-ask-to-convert, igul-le-tova.
- EmailStatus flags + "user-email-statuses" button.
- EmailMessageTemplate: subject/body per event_code × language (he/en) with `{{var}}` placeholders.
- Country, Language, City (+community), Community (+admin users inline, export), SalonDay (date, day_type, default_for_year — API read-only), HostSalonTraining (managed only here), HostSalonContent.
- Salon (assignment) list with year filter + export; Witness import/export + buttons archive-witnesses (yearly reset), migrate-comments; WitnessSalon + global-availability-all; Host/HostSalon import/export; Guest/GuestSalon exports incl. "Guests Hosts Salons" CSV/Excel.
- Commands: reset_host_salon_guests, check_double_teaming (daily, heroku-scheduler), populate_email_templates.

## Messaging infrastructure
- Email: `EmailSending.send_email_from_db(event_code)` → DB template → `templates/emails/base_email.html` → AWS SQS → Lambda (`email-lambda-sqs/`) → SendGrid. Missing template ⇒ nothing sent.
- WhatsApp: TexterChat (`common/texterchat_client.py`). SMS: Twilio (login passcode only).

## Notification triggers (signals)
| Action | Notification |
|---|---|
| Assign witness (salons POST/PATCH witness_salon) | host email by witness type hosts_2a/2b/2e/2c/2d + WhatsApp; sets assignment_time; recalcs available_for_teaming. Witness not notified |
| Unassign witness | host email + WhatsApp `cancel_witness` |
| DELETE salon | witness available_for_teaming=True; deletes HostSalon |
| Delete HostSalon | all GuestSalons → denied (triggers guest notifications) |
| GuestSalon status | pending→approved / denied→approved: guests_2; approved→denied: WhatsApp guests_cancel + guests_3 (this year) then row deleted; approved→pending: guests_3; pending→denied: guests_4 then deleted |
| guests_number change | hosts_5 to host |
| Create GuestSalon | guests_1 email + WhatsApp guests_1new |
| DELETE salonguest (approved, future) | hosts_4 to host |
| HostSalon event_time change | guest_8 email + WhatsApp guests_8_neww to approved guests |
| HostSalon site_link change | guests_7 to approved guests |
| Create HostSalon | hosts_1 variants + WhatsApp |
| Update Host with salons | volunteer_1 to community volunteer admins + first super admin (bug: passes User not email) |
| password_reset | reset email (file template) |
| SMS auth | Twilio passcode |
| Witness availability_status change | year comment upsert; leaving available deletes future open dates; recalcs available_for_teaming |

## Security/behavior gaps
host_salons unscoped; witness_comments + duplicate_validation open to any user; salons unscoped for admins; querysets return None for some permitted roles; cities free_text drops scoping; export_communities unauthenticated; no API for roles/communities/salon days/trainings/email templates.
