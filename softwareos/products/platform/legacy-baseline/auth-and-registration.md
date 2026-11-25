# Auth & registration — legacy behavior (zikaron-basalon-fe)

Paths relative to `zikaron-basalon-fe/`.

## Cross-cutting
- Boot: `getAppData()`, `getOriginDetails()` (`Routes.tsx:78-81`); `GoogleOAuthProvider clientId=REACT_APP_GOOGLE_OAUTH2_KEY` (hardcoded fallback, `src/App.tsx:27-31`); token from `localStorage["persist:auth"]` → `setAxiosHeader`.
- Two HTTP paths: sagas use global axios + `addRequestObject` middleware (API_URL + Bearer from persist:auth); apiCalls use `instance` (baseURL API_URL) with interceptors.
- Token storage: redux-persist key `auth` (`persist:auth`), `errorKeys` blacklisted; values JSON-stringified (hence quote stripping). `rememberMe` key unused.
- Auth state: token, refresh_token, id, email, first_name, last_name, role, host, guest, guest_registration_status, errorKeys, confirm_policy, phoneNumber, isShowModal, isChangeRoleThisYear (never set), isFromIL (default true). Login/register/SMS success store `access_token||access`, `refresh_token||refresh`.
- Interceptor (`instance` only): 401 → `POST /api/auth/token/refresh/ {refresh}` → store + retry; failure/no refresh → `localStorage.clear()` + push `/`. 403 → clear + `/`. 450 on `api/host_salons_map` → `{data:[]}`. Saga refresh/verify-token actions (`/api/auth/token/refresh/`, `/api/auth/verify_token/`) exist but are never dispatched.
- Logout: `logout()` + reset host/guest ids + push `/`; reducer keeps only `{confirm_policy:false, token:null, refresh_token:null, errorKeys:[]}`. No backend logout.
- Country: `GET https://ipapi.co/json/?key=REACT_APP_IPAPI_KEY` (no key/error → IL); `isFromIL` used only in salon edit form.
- Orthodox mode (`REACT_APP_ORTHODOX_MODE==="true"`): guest register routes redirect `/`; "register as visitor" hidden; orthodox logo; header logo click disabled, LanguageToggle hidden, welcome image swapped.
- Roles: admin roles `super admin, general admin, global admin, volunteer admin, host admin, testimonials admin` (`usersTypes.tsx:1-8`; enum spells "testimonial admin" — mismatch). `PrivateRoute` (`/admin`): `token && confirm_policy && role ∉ {host,guest,witness}` else logout + redirect `/`. Switchable roles: host, guest.

## Login `/`
- Desktop logo → zikaronbasalon.com (new tab). Title `login.signInTitle`, subtitle `login.signInSubTitle`.
- Change-role modal (`isShowModal && !isChangeRoleThisYear`): host "stay host" → host salon/onboarding + `POST /api/user_data/convert_user_selected/`; "want to be guest" → `/register/guest/onboarding`; guest mirror.
- Fields: email (EmailRegex, required), password (trimmed, required). Submit disabled on errors.
- Submit: `POST /api/auth/login/ {email,password}`. Non-admin → loginSuccess + header. Admin → error `login.notAdminSystem` (public site isn't for admins). Host/guest with `should_ask_to_convert` → role modal; else navigate.
- navigate: host null → `/register/host/onboarding`; host exists → `/site/host/:id/salon` (status 1/2 pushes overridden). Guest status 2 → `/site/guest/:id/salon`, else `/register/guest/onboarding`. Witness: none.
- Errors: `social_account_only` → `login.socialAccountOnly`; `non_field_errors` → `login.emailOrPasswordAreIncorrect`.
- Silent login when token persisted: admin → `/admin`; host/guest → their salon page.
- Pending salon selection after login → `POST /api/salonguests/` then clear.
- Links: forgot → `/forgotpassword/restoremethod`; register → `/register`. No SMS link.
- Google (implicit flow): `POST /api/auth/convert-token {token, backend:"google-oauth2", grant_type:"convert_token", client_id:REACT_APP_DRF_CLIENT_ID, client_secret:REACT_APP_DRF_CLIENT_SECRET}` (client secret shipped to browser — security finding) → store tokens → `GET /api/user_data/` → if no role/host/guest: no role → `/register`; else set role, `PATCH /api/user_data/{id}/`, → onboarding. Else role modal or salon page.
- Facebook login: commented out (appId `862467251712868`), no backend call.

## SMS login
- `/getcodeviasms`: phone (`+value`, ≥8, valid+possible) → `POST /api/sms_authentication/auth/ {phone_number}` → `/codeverification`; error key `status` → `login.phoneNumberIsNotExist`.
- `/codeverification`: shows last 3 digits; code → `POST /api/sms_authentication/auth_with_code/ {phone_number, code}` (+isResetPassword flag from localStorage) → login; reset flow pushes literal `/forgotpassword/:uuid` (bug). 400/401 → `login.invalidCodePleaseTryAgain`. "Send again" resends; no cooldown.

## Forgot password
- `/forgotpassword/restoremethod`: logs out if token; email only (SMS option commented) → `POST /api/password_reset/ {email}` → "sent" panel + resend; 400 → `forgotPassword.errors.userNotExist`.
- `/forgotpassword/:uuid`: password + confirm (match; no complexity) → token in redux ? `POST /api/sms_authentication/change_password/ {new_password, token}` : `POST /api/password_reset/confirm/ {password, token: uuid}`; 400 → `passwordNotValid`. Success modal → `/` after 4000ms. `/forgotpassword/success` mounted.

## Register `/register`
- "Register as host" → `/register/createsalon/host`; "Register as visitor" → `/register/guest` (hidden orthodox). Link to login.

## RegisterForm (shared)
- Logs out on mount if token and no role prop.
- email (regex, required), password (trimmed, `/(\S){6,}/`), password_confirmation (match), policyConfirmation (defaults true, no checkbox — effectively pre-accepted); terms link opens PolicyTerms modal (He/En).
- Submit: email == prefilled redux email → `PATCH /api/user_data/{id}/` → onboarding. Else `POST /api/auth/registration/ {...form, password1, password2, role}` → GTM dataLayer `Want_to_host`/`Want_to_be_hosted` → onboarding (or modal callback). `data.email` error → `register.errors.emailExist`.

## Host registration
- `/register/createsalon/*`: card "welcomeRegisterHost" + RegisterForm role=host + "already registered" link. PrivateOrOrgStep, SalonDetailsStep, VideoStep are dead code.
- `/register/host/onboarding`: first/last (required; 30-char truncation broken), phone (PhoneInput validity), is_org radio, org_type (select of org_types, required if org), org_name (required if org). Submit enabled when valid. Payload `{first_name,last_name,phone,is_org,org_type,org_name,registration_status:2}`. Guest role → `GET /api/guests/{id}/change_guest_to_host/` → `PATCH /api/hosts/{id}/`; else `POST /api/hosts/` (+user) → `/site/host/:id/salon`. Exit → `/`.
- `/createsalonresult`: success, FB share if public, "Go to my profile".

## Guest registration (disabled in orthodox)
- `/register/guest`: title, link to map, RegisterForm role=guest, login link.
- `/register/guest/onboarding`: first/last, phone (+972 clears error), city (Places), address (Places, tooltip). Host role → `GET /api/hosts/{id}/change_host_to_guest/` → `PATCH /api/guests/{id}/`; else `PATCH /api/guests/{id}/ {...form, registration_status:2}` → `/site/guest/:id/salon`; creates pending salon registration. GTM `Guest_Registration_completed`.
- `/registerguestresult`: my profile / map / table buttons.

## Witness self-registration
- `/register/wanttotell`: Interested → `/register/witnessregistration/birth`; No thanks → zikaronbasalon.com.
- Steps register/details/extradetails are stubs; effective Birth → Availability.
- Birth: countryOfBirth, birthDate (required, 1900..today), siteLink, additionalDetails (1000).
- Availability: date + morning/afternoon/evening; max 3, ≥1 slot, unique day, within hardcoded 2024-05-01..2024-05-09.
- End: `PATCH /api/witnesses/4/` (hardcoded id 4!) with birth fields; availabilities not sent. ⇒ Flow is effectively broken in legacy — parity decision needed.

## Policy / terms
- PolicyTerms He/En at `/register/host/policyterms/he|en`.
- PrivacyPolicy He (`/privacy_policy_heb`, `/salon`, `/myProfile`): checkbox + OK → `PATCH /api/user_data/{id}/ {confirm_policy:true}` → `/admin`; Cancel → logout. Admin first-login gate.

## Header
- Desktop: greeting + name + logout (token) or logo + "back to homepage"; contact link; LanguageToggle (hidden orthodox). Mobile: greeting + hamburger with logout.

## Never used
forgotPasswordLogin, refreshTokenRequest, verifyTokenRequest, REGISTER_HOST, USER_PROFILE_*, isChangeRoleThisYear setter, Facebook login.
