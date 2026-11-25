# Quick-wins plan — legacy public site (zikaron-basalon-fe)

> Source: [audit](index.html) · Created: 2026-11-17
> Status: **proposed, not applied.** The changes touch `zikaron-basalon-fe`, which is outside this hub; apply only after approval.
> Branch to use: `fix/audit-quick-wins` from `dev`. Nothing pushed.
> **Out of scope:** anything WhatsApp-related (TexterChat, `WHATSAPP_ENABLED`, WA templates) stays untouched.

All paths are relative to `zikaron-basalon-fe/src/`.

## 1. Fail-safe sagas — "one failed request freezes the app"

**Problem.** 9 catch blocks do `const { data } = e.response;`. On a network error or CORS failure, `e.response` is `undefined`, so the catch block itself throws. redux-saga then cancels the root saga ("Tasks cancelled due to error…"), and every page waits forever.

| File | Lines |
|---|---|
| `store/saga/admin.saga.ts` | 67, 86, 113, 133 |
| `store/saga/auth.saga.ts` | 53, 127, 223 |
| `store/saga/guest.saga.ts` | 51 |
| `components/common/ErrorHandler/sagaSetErrorHelperFn.ts` | 4 (`const { data } = error?.response;` still throws when `response` is undefined) |

**Change.**
- `sagaSetErrorHelperFn`: `const data = error?.response?.data ?? { network: ["Network error"] };`.
- Each listed catch: `const data = e?.response?.data;`, and treat a missing response as a network error.
- `store/saga/index.ts`: switch the root `fork(...)` list to `spawn` with a restart wrapper, so a crash in one saga can't cancel the others.
- `setErrorString.ts`: add a `"Network error"` case with a translated message (he/en).

**Verify.** Stop the API and load `/site/salonSearch/mapview`. Expected: a red "network error" banner and no frozen spinner. Restart the API and use the same page: it recovers without a reload.

## 2. Salon map crash and double Google Maps load

**Problem.** The public map sometimes ends on the error page (`InvalidValueError: not a LatLng … lat: not a number`) or on an endless spinner. Google warns that the Maps JS API is included more than once.

**Causes found in code** (to confirm in the browser before the fix):
- Maps JS is loaded twice: globally by `components/common/GoogleMap/GoogleMapScript.tsx` (Helmet `<script …&callback=onMapLoad>`, which also does `delete google.maps` on language change) **and** by `GoogleMapReact bootstrapURLKeys` in `components/common/GoogleMap/GoogleMap.tsx:113`. Deleting `google.maps` under a live map can leave google-map-react with a broken namespace.
- `GoogleMap.tsx` `visibleMarkers` returns **unfiltered** markers until the first `onChange` sets bounds, so markers with missing or invalid `lat`/`lng` reach `<Marker lat lng>` on first render.
- `mapCenter.zoom: 100` is outside Google's range.

**Change.**
- Load Maps once: keep `GoogleMapScript` as the single loader. Pass google-map-react `googleMapLoader={() => waitForGoogleMaps()}` (resolve `window.google.maps` once `onMapLoad` fires) instead of `bootstrapURLKeys`. Stop deleting `google.maps`, and re-create the map on language change instead.
- Always filter invalid coordinates: `if (!markers) return []; const valid = markers.filter(m => isValidCoordinate(+m.lat) && isValidLng(+m.lng)); if (!mapBounds) return valid;`. Coerce `+marker.lat` / `+marker.lng` when rendering.
- Clamp the zoom to 15 to 18.
- Remove the hard-coded fallback API key (`"AIza…"`) in both files and read `REACT_APP_GOOGLE_MAP_KEY` only. Fail loudly in dev if it's missing.

**Verify.** Load the map with an empty salon list, then with one salon, and switch the language he↔en three times. Expected: no console `InvalidValueError`, no "included multiple times" warning, the "no salons" panel shows when the list is empty, and tiles render.

## 3. Host onboarding phone — "the form says valid, the server says no"

**Problem.** `react-phone-input-2` plus the form accept any *possible* number. The backend (`phonenumbers.is_valid_number`) rejects numbers in unallocated ranges, e.g. `+972541234567`. `createHost` (`store/saga/hosts.saga.ts:99-120`) only fires the global 5-second banner, so the field stays green. The input also keeps a leading 0 after +972.

**Change.**
- `components/Auth/Register/RegisterHost/Onboarding/OnboardingForm.tsx`: validate with `isValidPhoneNumber` from `libphonenumber-js` (full metadata, same rule as the backend) before submit, and strip a leading `0` after `+972`.
- Pass a callback to `createHost` and, on a 400 with `phone`, call `setError('phone', 'server', t('errorHandler.general.invalidPhone'))` so the error sits on the field. Keep the banner as a fallback.
- Apply the same normalization to guest onboarding (`RegisterGuest/Onboarding/OnboardingForm.tsx`) and the host personal-details edit form.

**Verify.** `054-123-4567` shows an inline error before submitting. `052-612-3456` creates the host. `+972 054…` is normalized to `+972 54…`.

## 4. Stale season dates in the wizard copy

**Problem.** `refreshPageWhenThereIsNoDates` is hard-coded: "…between April 12-19" (`public/locales/en/translation.json:488`, `he/translation.json:471`). The real days come from `/api/salondays/`.

**Change.** Interpolate from the salon days already in the store: `t('host.refreshPageWhenThereIsNoDates', { from, to })`, with `from`/`to` being the first and last future `SalonDay` (`DD.MM`). Update both locale files (and the orthodox overrides if the key exists there).

**Verify.** With salon days 24–25.11 configured, step 1 reads "24.11–25.11".

## Not in this batch (recorded for later)

- Address not restricted to the chosen city (also needs a backend check). Next batch.
- Admin token refresh 401 right after login (`zikaron-basalon-fe-admin`, `auth.middleware.ts`). Next batch, admin repo.
- The "email sent to host" message shown regardless of delivery. Needs a backend signal; later.
- Donation popup timing, guest-count "+" button, duplicate fetch on "My salon". UX batch.
- WhatsApp: **excluded by request.**
