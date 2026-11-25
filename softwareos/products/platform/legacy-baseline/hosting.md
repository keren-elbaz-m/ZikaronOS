# Hosts area — legacy behavior (zikaron-basalon-fe)

Paths relative to `zikaron-basalon-fe/src/`. `isOrthodoxMode` = `REACT_APP_ORTHODOX_MODE === "true"` (`utils/featureFlags.ts`). Mobile = `useIsMobile()` (≤768px).

## Routes
- `/site/host/:id/salon` → `components/Hosts/index.tsx`; `/site/host/:id/profile` → `components/Hosts/indexProfile.tsx` (`components/Site/index.tsx:15-38`). Both dispatch `getHostProfile(id)` + `getLanguages()` on mount; Loader while `hostProfile` is `{}`.
- Dead code: `Hosts/Header.tsx` (commented out), `Hosts/HostSalon/index.tsx` + `HostSalonCard` (hardcoded `deleteHostSalonById(id, 2024)`), `HostSalonDesktop`, `TopButtons`, `ExcelExportButton`, `SalonOpenForGuestsButton`, `CallOrChatModal`, `IndexPersonalDetails`.
- Admin host profile reuses `HostProfile`, `NewSalon`, `useNewSalonModal`.

## Salon page (`HostProfile/index.tsx`)
- Mount: `GET /api/hosts/{id}/summaries/` → grouped by `YYYY` of `event_time`, ascending per year. Unmount: clear host state.
- Header: "host.salonOf {name}" (org → `org_name`; else first+last) or `host.mySalon`.
- Tabs (hidden while editing; default 1): 1 salonDetails · 2 guests (hidden orthodox) · 3 witness · 4 customizedSalon (hidden orthodox).
- Org "create new salon" button: desktop in tab bar; mobile in header when the org has salons this year.
- Empty state: orthodox/happy image, `host.hostExclamationMark.emptySalon`, `host.dontHaveSalon`, `host.addSalon` button → new-salon modal.
- YearsBar renders nothing; selects latest year (overridable via `location.state`). No past-year browsing UI.
- Bug: `moment` used at `:97,101` without import (navigation-state paths).

## Per-salon card (`HostProfile/HostSalon/index.tsx`)
- Mount: `GET /api/host_salon_training/` filtered to current year. Auto-open when not (org and admin).
- Open: `GET /api/host_salons/{id}/` (normalize language_name, address first comma removed, assignment date `DD.MM.YYYY`); if witness: `GET /api/witnesses/{witnessId}/details_for_host/`; admin: `GET /api/host_salons/{id}/comments/`.
- Edit mode hides all other salon cards. Update = `PATCH /api/host_salons/{id}/`; if `is_open_for_guests` and not editing → "beforeWeContinue" modal. Cancel with touched form → confirm modal.
- Actions: edit, delete, share (share disabled when not open for guests).
- Delete: fetch `GET api/salonguests/?salon={id}` + witness; modal text differs with/without witness (witness → `formFields.deleteSalonWithWitness` with placeholders); confirm → `DELETE /api/host_salons/{id}/`, removed from all year buckets. No toast.
- Mobile: guests tab only when `evening_public && !orthodox`; admin section on every tab. Desktop: tab 1 includes admin "leadingCommunityUse" column.

## Create-salon wizard (`NewSalon` → `SalonDetailsSectionEdit`)
- Full-screen modal; cancel → confirm modal (form always "touched" for new).
- Defaults: `org_branch:"סניף"`, `contact_phone_pre:"054"`, `is_open_for_guests:true`, `evening_public:false`, `is_digital:false` (forced — digital branch unreachable), `easy_permission:true`, `language:1`, `need_Witness:true`, `event_time` → `defaultSalonDate`.
- 5 steps (orthodox: 3 = steps 1,2,5):
  1. When — date (future salon days only) + time; note `host.refreshPageWhenThereIsNoDates`; orgs (non-orthodox) `host.organizationSundayRecommendation`. Gate: event_time and future days exist.
  2. Address — city (Google Places), address, apartment, floor (maxLength 3), accessibility [Elevator, Wheelchair accessibility]. Gate: city/address set and not 'no city'/'no address'.
  3. Open/private switch (inverted value); `host.publicSalonNotFromIL` when not from IL. No gate.
  4. Guests number `max_guests` (maxLength 3); `easy_permission` checkbox only when country=='IL'. Gate: max_guests.
  5. Almost done — `survivor_needed`, `hosted_before` radios; training select (future only, sorted); language; staff comment (maxLength 255). Gate: training + both radios.
- Navigation: step 3 private → skip to 5; back from 5 when private → 3. Labels `host.next` / `formButtons.end`. Progress bar `#FFCB05`.
- yup schema `Hosts/utils.ts:13-107` exists (required: hosted_before, date, event_time, language, survivor_needed, host_salon_training; org: contact_name, phone ≥8; max_guests 1–999; site_link URL) but submit uses `getValues()` — gating is `shouldDisableNextStep`, not yup.
- Payload: address default `''`; apartment/floor default `9999` sentinel; lat/lng → city coords → 1; `event_time` as `DATETIME_FORMAT` with `T`; `contact_name` = org name or first+last; orthodox forces `is_open_for_guests:false`; aborts silently on Places `didNotSelect`/`ZERO_RESULTS`. `dataLayer.push` Category `Registration_completed_Creating_living_room`.
- Bug: staff comment field named `stuff_free_text` (`:1016`).
- Create: `POST /api/host_salons/` `{host, ...data, contact_phone:"+972"+phone.substring(4) | ""}` → refetch list. No error handling.
- Success popup: `host.successNewSalon`/`successEditingSalon` (always isNewSalon=true); `comments_for_guests` textarea (max 1000, required to save) → `PATCH /api/host_salons/{id}/`; "nextTime" closes; both redirect `/site/host/{hostId}/salon`.

## Edit salon
- Same wizard + "Save and close" from any step (gated).
- With witness assigned: date change → `CanNotChangeDateModal` (OK → `https://www.zikaronbasalon.com/צרו-קשר/`). Time change → `POST /api/host_salons/{id}/check_time_range/ {event_time:"HH:mm"}`: unavailable → CanNotChangeTime modal; available → CanChangeTime modal with witness name, confirm submits. Mobile skips "can change" modal on Next.

## Date/time pickers
- Salon days `GET /api/salondays/`. Date picker `dd/MM/yyyy`, future salon days only; empty list → one page reload (localStorage `salonDaysRefreshAttempts`).
- Default date (`store/selectors/adminSelectors.ts:47-140`): private → today if salon day, else first future `default_for_year`, else first future; orgs → first future `yom_hol` Sunday first. After 19:00 today → next date. Time 19:00.
- Time picker 07:00–23:00, 30-min steps.

## Info view (`SalonDetailsSectionInfo.tsx`)
- Time/date `HH:mm , DD.MM.YY`, name, address (floor/apt unless 9999), accessibility, training, guest comment.
- Igul LeTova popup (not orthodox): after 1s `GET /api/user_data/igul_le_tova/`; truthy → modal; OK opens `https://www.igul.org.il/amutot/zikaron/`, sets localStorage `igulLeTova=true`, `POST /api/user_data/mark_igul_le_tova/`; cancel → mark. Next mount with flag → set false + reload.

## Guests tab
- `GET api/salonguests/?salon={id}`; only approved shown (no approve/reject UI). Columns: trash, name, seats, email, WhatsApp+phone. Delete → `DELETE /api/salonguests/{id}/`. Empty state with share button. Multi-salon accordion "Salon n - approved/max". CSV export component never rendered.

## Witness tab
- Assigned (current year): name, type, phone (+972→0), "communication with client" radio → `PATCH /api/salons/{salon}/ {host_contacted_witness}`; city, assignment date, link, free text, presentation.
- None + survivor_needed: `witnessNeededText1-4`, edit link, info-center link (he `zikaronbasalon.com/מרכז-המידע/`, else `/en/speakers/`). None + not needed: `witnessNotNeeded*`.

## Customized salon tab — static copy + link `https://builder.zikaronbasalon.com/` (hidden orthodox).

## Share — `${FE_URL}/site/salonSearch/mapview/{salonId}` (FE_URL default `https://app.zikaronbasalon.com`); WhatsApp/Facebook/Email (quote "משתף סלון") + copy link (1.5s snackbar).

## Admin-only section (admin roles)
- Volunteers of community; switches `contacted`, `preparation_evening`, `special_population` → immediate `PATCH /api/host_salons/{id}/`; volunteer select; `special_attention_text` (255, 3s success); read-only id + sign-up date; comments `POST /api/host_salons/{id}/comments/` (2000) / `DELETE …/comments/{cid}/`.

## Personal details (`/profile`)
- View: name, phone, host type, email; org → org name + org type.
- Edit: first/last (required), phone (`'+'+value`; valid via PhoneInput callback, error cleared for +972), email + host type read-only, org name/type required for orgs. Submit → `PATCH /api/hosts/{id}/`. Touched = >2 fields.

## Errors — saga errors via `handleErrorFromServer`; direct component calls mostly swallow errors.
