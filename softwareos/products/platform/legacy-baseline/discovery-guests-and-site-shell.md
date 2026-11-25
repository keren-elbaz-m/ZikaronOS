# Guest / Salon search / Site shell — legacy behavior (zikaron-basalon-fe)

Paths relative to `zikaron-basalon-fe/src/`.

## Shell & routes
- Routes (`utils/constants/routes.ts:66-88`): `/site/errorpage`, `/site/guest/:id/profile`, `/site/guest/:id/salon`, `/site/salonSearch`, `/site/salonSearch/mapview/:id?`, `/site/salonSearch/mapview`, `/site/salonSearch/table`, `/accessibility` (top-level, outside `/site`).
- `Site` (`components/Site/index.tsx`) at `/site` (`Routes.tsx:161`): Header → Body/Container/Content → lazy routes → Footer. Catch-all → ErrorPage (`Routes.tsx:171`).
- `GoogleMapScript` mounted globally (`Routes.tsx:87`): injects Maps JS `libraries=places&language=${lang}&callback=onMapLoad`; deletes `google.maps` on language change. Fallback API key hardcoded (`GoogleMapScript.tsx:15`, `GoogleMap.tsx:115`) — rewrite must read env only.

## Salon search (`Guests/SalonSearch/index.tsx`)
- Mount: `GET /api/languages/` (skipped if cached), `GET /api/cities/`; if guest logged in: guest profile + guest salon.
- Nested views: `mapview`, `mapview/:id` → SalonSearchMap; `table` → GuestDigitalSalon; `location.state.url` → Redirect (preserving search).
- Entered via `history.push({pathname:'/site/salonSearch', state:{url}})` from guest registration result, GuestSalon "search salon", HostSalon.
- `showPhysicalSalon` only changes table title. No visible map/table switch button (computed, unrendered).

### Filters (shared `Admin/FilterHeader`; all multi-select unless noted)
| key | options | query param |
|---|---|---|
| city | `/api/cities/`, searchable | `city=[ids]` |
| language | languages | `language=[ids]` |
| available_places (single) | 1,2,3 | `available_places` |
| accessibility_searchmap | Elevator, Wheelchair accessibility, Floor zero | `accessibility=[...]` |
| date | salondays (DD-MM-YYYY labels) | `date=[...]` |
| time | morning/noon/evening | `time=[...]` |
| is_digital | true/false | dropped if both selected |
- Free text → `free_text`, 500ms debounce. "Clean" clears.
- Server-side: `GET api/host_salons_map/` with params (+`id` when path ends `/\d+`).
- Client post-filter: drop past `event_time`; physical before digital, then by `distance`.
- URL `?city=` read as comma-separated names/slugs (case-insensitive, `-`≈space) → preselect; selection synced back via `history.replace` (`utils/urlQueryParams.ts`).
- List request failure → redirect `/site/errorpage`.
- Response 450 (outside Israel) → empty list (axios interceptor).

### Table view (`GuestDigitalSalon`)
- Columns: salon_name, event_time (`HH:mm, dd-MM-yyyy`), language_name, city_name, free_space, comments_for_guests, Register button.
- Data source `digitalSalonsList` is only filled when saga flag `digitalSalonTable=true` (free_space = max − pending − confirmed; drop full) — SalonSearch never passes it ⇒ table effectively empty. (Parity decision needed.)
- Register from table: token+guest → `POST /api/salonguests/ {host_salon, guests_number:'1'}` → `/site/guest/:id/profile`; else `showModal(...)` which is a no-op (no ModalProvider).

## Map view
- Markers only for valid lat/lng; clicking selected marker deselects. No clustering; out-of-bounds markers hidden client-side.
- Default center Tel Aviv `32.0631703, 34.768982`, zoom 15 (or guest lat/lng); minZoom 8; no fullscreen; map language = i18n. Marker click recenters. Guest position = home icon. Icons `marker.png` / `centeredSalonMarker.svg`.
- Info window: "salonHeader"+name, `DD.MM.YY • HH:mm`, `city, address, floor X, apartment Y` (9999 hidden), "more details" → drawer.
- Distance via Google DistanceMatrixService (DRIVING); "km" → `ק"מ` in RTL.
- Sidebar: loading; empty → "no salons found" + link `/register/createsalon/host`; list header "{n} salons found"/"Salons around you"; item: "Salon of" salon_name||host_name, date/time, address or "salonIsDigital" or "X km from you", `max_guests\{max − confirmed}` available, "salon info" link.
- Deep link `/site/salonSearch/mapview/:id`: id sent as param; found → auto-select + open drawer; empty → "full salon" modal (`noRoomInSalonModalSubtitle`, "View Available Salons" → push mapview + reload). Closing drawer strips `/:id` via full reload.

## Details drawer & registration (`SalonSearchLeftDrawerBar`)
- Side panel, not overlay-dismissable; desktop 50% (max 640px), mobile 100%; left in RTL, right in LTR.
- Physical: date/hour `DD.MM.YYYY , HH:mm`, address, accessibility (Elevator/Wheelchair/"floor 0"/none), language, host note + "The witness {{name}}, {{type}} will be hosted in {{host}}'s salon" + `witness_presentation_details`.
- Digital: type, date/hour, language, comments. Link shown only on guest "My salon" page.
- Host viewer: note with link `${FE_URL}/register/guest` + disabled Register.
- Guest/anon: guests stepper 1..min(3, max − pending − confirmed); "Maximum number of guests" message when >2.
- Register: disabled while submitting or no space. Token → `POST /api/salonguests/ {host_salon, guests_number}` → success popup. No token → save pending selection → `/register/guest`; auto-registered after login or after guest onboarding, then cleared. Error → global handler + inline error.
- Success popup: "You have successfully registered for the salon!", `host.moreDetails` (IL) / `host.moreDetailsSalonNoIL`, "Back to my salon" → `/site/guest/:guestId/salon`. 480px / 350px mobile.
- Dead: RegisterSalonModals, LoginModal, RegisterModal, already-registered modals, SelectedSalonDetails, FilterHeaderMobile. No private-salon code handling.

## Guest "My salon" (`/site/guest/:id/salon`)
- `GET /api/guests/:id/` + `GET /api/salonguests/?guest=:id&denied=false` (merged). Host role → logout; `guest_registration_status===1` → onboarding.
- No salon or denied: image, "It's time to look for a Salon!", "Search salon" → map view.
- Card: "Salon of" org_name|host_name, date/time, host name/phone/email; digital → `site_link` or "not published"; physical → address w/ floor/apt (non-IL → `host.moreDetailsSalonNoIL`); accessibility, languages, host note, guests_number, witness name+type.
- Cancel: confirm ("Clicking Cancel will update the host on cancellation"; "Cancel arrival"/"Don't delete") → `DELETE /api/salonguests/:id/`, optimistic clear.
- Igul LeTova modal (same as host; not orthodox; only if guest has salon).

## Guest profile (`/site/guest/:id/profile`)
- Same fetch/redirects. View: name, phone (LTR), `address, city`|city|`-`, email, "Edit details".
- Edit (RHF onChange + yup): first/last required, city_name required, phone (`+` prefix, must be valid), email read-only, City + Address autocompletes. Blocked on Places `didNotSelect`/`ZERO_RESULTS`. `PATCH /api/guests/:id/`. Cancel-confirm when >2 fields touched.

## Places autocomplete
- City: `types:['(cities)']`; on select geocode → `city_name`, `google_city_id`, cityLat/Lng, `country` (IL heuristic: last component short name length > 2); clears address.
- Address: biased to city latLng radius 100; stores `formatted_address`, lat/lng `toPrecision(9)`.
- Errors: typed-not-selected → `autocompleteNoValueChosen`; `ZERO_RESULTS` → `autocompleteNoResultsFound`.

## Share modal — see fe-hosts.md (used only from host pages).

## Error page
- `errorBoundaryMessage` when state==='errorBoundary', else "page not found". Home: guest → guest salon; host → host salon; admin → `/admin`; else `/`. Back → `history.goBack()`.

## Accessibility
- `/accessibility`: static Hebrew statement (intro, widget "נגיש בקליק" features, third-party policies, coordinator contact, no public reception). Mail link missing `mailto:` (bug).
- nagich.co.il widget in `public/index.html:38-71` (Left, HE, #F5D367/#000, 65%/15%, scale 0.5/0.4, icon 11 circle, `js.nagich.co.il/core/4.4.0/accessibility.js` with SRI).

## Footer / language
- Footer: contact (`zikaronbasalon.com/צרו-קשר/` | `/en/contact/`), main site, Terms modal (He/En), Accessibility → `/accessibility`, Facebook group/page, Instagram, logos (Moveo, Claims Conference, EVZ, Ministry of Finance) + "supported by the claims conference sponsored by the BMF". Privacy modal has no trigger.
- LanguageToggle "עב"/"ENG" → `i18n.changeLanguage` + `localStorage.language`. i18n default `he`, whitelist en/he, `/locales/{{lng}}/translation.json`; orthodox merges `translation.orthodox.overrides.json` into he.
- ContactForm is a non-functional stub, never rendered.

## Endpoints
GET `/api/languages/` · GET `/api/cities/` · GET `/api/salondays/` · GET `api/host_salons_map/` · GET/PATCH `/api/guests/:id/` · GET `/api/salonguests/?guest=&denied=false` · POST `/api/salonguests/` · DELETE/PATCH `/api/salonguests/:id/` · GET `/api/user_data/igul_le_tova/` · POST `/api/user_data/mark_igul_le_tova/`.
