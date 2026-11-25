# Third-Party Services — Zikaron BaSalon

> Customer: zikaron-basalon · Discovered: 2026-11-22
> Sources: `zikaron-basalon-be`, `zikaron-basalon-fe`, `zikaron-basalon-fe-admin` (code, read-only), public DNS,
> [infrastructure-and-runtime.md](../products/platform/legacy-baseline/infrastructure-and-runtime.md), [tech-stack.md](tech-stack.md).
> Covers everything **outside AWS** that the system depends on. The customer pays and wants the **lowest possible cost**.
> List prices are as of Nov 2026, from the vendor pages linked in each section. **Actual spend is unknown** until the team
> sends the invoices (see [What we need from the team](#what-we-need-from-the-team)). Secret values are never recorded here.

## Summary

| Service | Used for | Cost model | Main cost driver | Status |
|---|---|---|---|---|
| **Google Maps Platform** | Salon map (public + admin), address/city autocomplete, witness geocoding | Pay-as-you-go per SKU, monthly free cap per SKU | Map loads per page view; **one autocomplete request per keystroke** | live |
| **Twilio** | SMS login passcode | Per SMS segment | Every "send me a code" click; **endpoint is unthrottled** | live |
| **SendGrid** (via SQS → Lambda) | All transactional email (≈18 notification types, reminders, password reset) | Monthly plan by volume + overage | Emails per season; Lambda retries can re-send | live |
| **TexterChat** (WhatsApp) | WhatsApp copies of notifications | Vendor subscription (not public) + Meta per-message fees | Messages per notification | **disabled in prod (intentional)** |
| **ipapi.co** | Country detection on every public-app load | Monthly plan by requests | One lookup **per visit** | live if `REACT_APP_IPAPI_KEY` is set in the build |
| **nagich.co.il** | Accessibility widget on the public app | Subscription (not public) | Flat | live |
| **enable.co.il** | Accessibility widget on the admin app | License (not public) | Flat | live |
| **Google OAuth** | "Sign in with Google" | Free | — | live |
| **Google Analytics 4 (gtag)** | Public-app analytics | Free | — | live |
| **Google Sheets / Apps Script** | Pushes witness intake into the API (webhook) | Free (Google account/Workspace) | Triggers geocoding per imported row | live |
| **Wix** | DNS for `zikaronbasalon.com` (and likely the marketing site) | Wix site plan (subscription) | Flat | live |
| **Network Solutions** | Domain registrar for `zikaronbasalon.com` | Yearly renewal | Flat | live |
| **Google Workspace** (MX records) | Customer's own email domain — not part of the system | Per user | Seats | live, out of scope |
| **GitHub** (`MoveoTech` org) | Source code, security-scan Actions | Org plan (likely Moveo's, not the customer's) | Seats / Actions minutes | live |
| **Easy** (partner) | Pulls the salon feed from our API | None to us (they call us) | — | live |
| **Heroku** | Old hosting (pre-AWS) | — | — | **dead**: only comments, a legacy `LOGIN_REDIRECT_URL` and policy-page links |

## Google Maps Platform

- **What it does:**
  - **Maps JavaScript API (Dynamic Maps):** the salon map on the public app (`fe/src/components/common/GoogleMap/GoogleMap.tsx:114-117`, `GoogleMapScript.tsx:15`) and on the admin app. The admin app loads the Maps script with the Places library on **every admin page load** (`fe-admin/public/index.html:28`), not only on map screens.
  - **Places Autocomplete:** city and address fields in host onboarding, salon edit, guest onboarding/profile and witness forms (`fe/src/components/common/PlacesAutocomplete/Address.tsx:71`, `City.tsx:95`, plus copies in `fe-admin`). `react-places-autocomplete` calls the Autocomplete service **without session tokens**, so **each keystroke is a billable request**. `geocodeByAddress` (`fe/src/components/common/getCityLocation.ts:1`) adds a Geocoding call per selection.
  - **Geocoding API (server):** `update_witness_geocoding` (`be/witnesses/views.py:720-740`, env `GOOGLE_API_KEY`) runs once per witness row imported through the Google Sheet webhook (`:850`). Two one-off management commands also geocode (`users/management/commands/location_fixes.py:21`, `citymigration.py:295`).
- **Keys:** one browser key, **hard-coded** in both frontends as a fallback or inline (`fe/.../GoogleMap.tsx:115`, `GoogleMapScript.tsx:15`, `fe-admin/public/index.html:28`) — the same key in all three places. Env names: `REACT_APP_GOOGLE_MAP_KEY` (fe), `GOOGLE_MAP_KEY` and `GOOGLE_API_KEY` (backend).
- **Pricing** ([Google Maps Platform pricing](https://developers.google.com/maps/billing-and-pricing/pricing), as of Nov 2026): each SKU has a **10,000 free calls/month** cap, then Dynamic Maps **$7.00 / 1,000**, Geocoding **$5.00 / 1,000**, Autocomplete Requests **$2.83 / 1,000** (Autocomplete *session* usage is free).
- **Usage estimate:** not derivable from code; depends on season traffic. The peak is the weeks before Yom HaShoah.
- **Cost / abuse risk:** a key that ships in public JS can be copied and used by anyone unless it is **restricted by HTTP referrer and by API** in Google Cloud. Whether it is restricted is unknown.
- **Saving:** restrict the key (referrers `app.`/`admin.zikaronbasalon.com`, Maps JS + Places + Geocoding only); set **quota caps and a budget alert** in Google Cloud; load the admin Maps script only on map pages; use session tokens (or debounce) for autocomplete; cache geocodes per address. The prototype uses Leaflet + OSM — if the rewrite keeps Google, these savings apply; if it switches, budget for a paid tile provider instead (public OSM tiles are not for production).
- **Where the bill is:** Google Cloud console → Billing → Reports (filter by service "Maps"), and Google Maps Platform → Metrics / Quotas.

## Twilio (SMS)

- **What it does:** sends the SMS login passcode — `POST /api/sms_authentication/` (`be/users/views.py:95-117`, `users/urls.py:12`). It is the only Twilio call in the code. Env names: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`.
- **Cost driver:** one SMS per "send code" request. A code is sent only if the phone belongs to an existing user, but the endpoint is **`AllowAny` with no throttling**, so a script can send unlimited SMS to real users' phones on the customer's bill (and also brute-force the 4-digit code; see infrastructure-and-runtime.md §11 #1).
- **Pricing** ([Twilio SMS pricing — Israel](https://www.twilio.com/en-us/sms/pricing/il), as of Nov 2026): **$0.2575 per outbound SMS segment** to Israel. Plus the monthly cost of the sending phone number (see the Twilio console).
- **Saving:** rate-limit per phone and per IP (e.g. 1 code/minute, 5/hour), add expiry and single use, consider CAPTCHA on "send code". In the rewrite, consider whether SMS login is needed at all, or use WhatsApp/email OTP.
- **Where the bill is:** Twilio console → Monitor → Usage (and Billing → Invoices); Messaging → Logs for volume.

## SendGrid (email)

- **What it does:** every transactional email. The API puts a message on SQS (`be/common/emails.py:29-43`); the `email-processor` Lambda sends it through SendGrid (`be/email-lambda-sqs/lambda_function.py:5-37`, key read from Secrets Manager / env `SENDGRID_API_KEY`). Triggers: the notification matrix in [api-permissions-and-notifications.md](../products/platform/legacy-baseline/api-permissions-and-notifications.md) (`hosts_*`, `guests_*`, `volunteer_1`, about 18 codes), password-reset emails, and the reminder batch.
- **Usage estimate:** the reminder batch sends at most **50 items per run**, every 10 minutes (`be/users/views.py:166`; schedule verified in AWS), so at most ~300 reminder sends/hour. Everything else scales with registrations. Real totals: SendGrid Activity / Stats.
- **Duplicate risk:** the live Lambda has a 3 s timeout with batches of 50 and retries a failed batch up to 5 times — **already-sent emails get re-sent and counted again** (infrastructure-and-runtime.md §0).
- **Pricing** ([Twilio SendGrid Email API pricing](https://www.twilio.com/en-us/pricing/email-api), as of Nov 2026): free trial 100 emails/day for 60 days; **Essentials from $19.95/month**, **Pro from $89.95/month**; volume tiers + overage.
- **Saving:** pick the smallest plan that covers the **peak season month** (or downgrade off-season if the plan allows); fix the Lambda timeout/batch so retries don't re-send.
- **Where the bill is:** SendGrid → Settings → Account Details → Your Products / Billing; Stats → Overview for monthly volume.

## TexterChat (WhatsApp)

- **What it does:** WhatsApp copies of notifications via TexterChat's API (`be/common/texterchat_client.py:7-56`, `common/notifications.py:76`); templates must be approved by WhatsApp (`be/notification_events.ts:109-111`). Env names: `TEXTERCHAT_PROJECT_ID`, `TEXTERCHAT_API_TOKEN`, `TEXTERCHAT_ACCOUNT_ID`, `WHATSAPP_ENABLED`.
- **Status:** `WHATSAPP_ENABLED=False` on the live environment — **intentionally off** (team, 2026-11-22).
- **Pricing:** TexterChat does not publish prices. WhatsApp business messages are also charged **per message by Meta** (per-message pricing since 1 Jul 2025), passed through by the provider.
- **Saving:** while WhatsApp is off, check whether the TexterChat subscription still bills monthly — pause or downgrade it off-season.
- **Where the bill is:** TexterChat account / invoices (ask the account owner); Meta Business Manager → WhatsApp Manager → Insights for message counts.

## ipapi.co (country detection)

- **What it does:** on every public-app load, `Routes.tsx:80` dispatches `getOriginDetails`, which calls `https://ipapi.co/json/?key=…` (`fe/src/store/saga/auth.saga.ts:374-388`, env `REACT_APP_IPAPI_KEY`). With no key it skips the call and assumes Israel.
- **Cost driver:** **one request per visit.** The key is compiled into the public bundle, so it can be reused by others.
- **Pricing** ([ipapi.co pricing](https://ipapi.co/pricing/), as of Nov 2026): paid plans from **$15/month (60,000 requests)**, $25 (150,000), $49 (500,000), $99 (2,000,000); free trial up to 1,000/day for a limited time.
- **Saving:** if the rewrite serves the app (or the API) through CloudFront, CloudFront can forward a `CloudFront-Viewer-Country` header with the visitor's country, so the app wouldn't need ipapi. Dropping it removes this bill entirely.
- **Where the bill is:** ipapi.co → Account / Dashboard (plan and usage).

## Accessibility widgets: nagich.co.il and enable.co.il

- **nagich.co.il** on the public app (`fe/public/index.html:44-64`, script `core/4.4.0/accessibility.js`).
- **enable.co.il** on the admin app (`fe-admin/public/index.html:30`, a per-site license script).
- **Pricing:** neither vendor publishes prices; both are subscriptions/licenses. Two different vendors for one customer is a duplicate cost.
- **Saving:** one vendor for both apps — or, since the rewrite is built accessible from the start (shadcn/Radix, the a11y skills), decide whether an overlay widget is still required (Israeli regulations may require an accessibility statement, not necessarily a widget — confirm with the customer's legal adviser).
- **Where the bill is:** each vendor's customer portal / invoices.

## Free Google services

- **Google OAuth** ("Sign in with Google"): frontend `GoogleOAuthProvider` (`fe/src/App.tsx:27-29`, env `REACT_APP_GOOGLE_OAUTH2_KEY`, client ID hard-coded as fallback), backend `drf-social-oauth2` (`be/zikaronBasalon/settings.py:275-276`). Free.
- **Google Analytics 4** via gtag (`fe/public/index.html:5-10`). Free.
- **Google Sheets / Apps Script** webhook → `POST /api/google_sheet_webhook/` (`be/witnesses/views.py:746+`, env `GOOGLE_SHEET_KEY`, `ENCRYPTION_GOOGLE_SHEET_KEY_B64`). Free, but each imported row can trigger a paid Geocoding call.

## Domain and DNS: Network Solutions + Wix

- `zikaronbasalon.com` is registered at **Network Solutions**; DNS is hosted at **Wix** (NS `ns2/ns3.wixdns.net`). `app.`, `prod.` and `dev.` records live there; only `admin.` is delegated to AWS Route 53. `www` points at the apex; whether the marketing site is a Wix site is not verified.
- **Cost:** yearly domain renewal + the Wix plan (if the marketing site is on Wix, the plan is already paid for that; DNS itself doesn't add cost).
- **Saving / risk:** keep the domain on auto-renew with a valid card — an expired domain takes down every app. Consider moving registration to the same place as DNS to have one renewal.
- **Where the bill is:** Network Solutions → My Account → Domains / Renewals; Wix → Billing & Payments.

## Other

- **Google Workspace:** the MX records point to Google, so the customer's mailboxes are on Workspace. Not part of the system; listed so it isn't mistaken for a system cost.
- **GitHub:** private repos in the `MoveoTech` org; Actions runs gitleaks/TruffleHog (backend only, on a macOS runner — macOS minutes are billed at a higher rate than Linux on private repos). Most likely Moveo's bill, not the customer's.
- **Easy:** partner that pulls `GET /api/host_salons_for_easy_integration/` (Basic auth, env `EASY_INTEGRATION_USERNAME`/`PASSWORD`). No cost to us.
- **Heroku:** dead. Only comments, the `LOGIN_REDIRECT_URL` in `be/zikaronBasalon/settings.py:301`, and links in the policy pages remain. Confirm no Heroku account is still billing.

## What we need from the team

For each service: the **plan name** and the **last 3 months of invoices or usage** (and the peak-season month if possible).

- [ ] **Google Cloud (Maps):** Billing → Reports, filtered to Maps SKUs; Google Maps Platform → Metrics. Also: Credentials → the browser key → is it restricted (referrers + APIs)?
- [ ] **Twilio:** Monitor → Usage; Billing → Invoices; Phone Numbers (monthly number fee).
- [ ] **SendGrid:** plan in Settings → Account Details; Stats → monthly volume.
- [ ] **TexterChat:** subscription and invoices; is it billing while WhatsApp is off?
- [ ] **ipapi.co:** plan and usage in the dashboard (or confirm `REACT_APP_IPAPI_KEY` is not set, i.e. not paying).
- [ ] **nagich.co.il** and **enable.co.il:** contract / yearly price.
- [ ] **Wix:** plan; is the marketing site on Wix?
- [ ] **Network Solutions:** renewal date and price; auto-renew on?
- [ ] **Heroku:** confirm no active account/billing.
- [ ] **GitHub:** confirm Moveo pays, not the customer.

## Cost-reduction opportunities (ranked)

1. **Throttle the SMS endpoint** (and add expiry/single use). Stops unlimited Twilio spend at $0.2575 per SMS — also a live security fix.
2. **Restrict the Google Maps key and add quotas + a budget alert** in Google Cloud. Caps the worst case if the hard-coded key is abused.
3. **Cut Google request volume:** load Maps only on map pages in admin; session tokens/debounce for autocomplete; cache geocodes.
4. **Fix the email Lambda retries** (timeout/batch) so SendGrid isn't paying for duplicate sends; size the SendGrid plan to the peak month.
5. **Drop ipapi.co** — use the free CloudFront country header (rewrite) or remove the key now if the 450 geo block is dead anyway.
6. **One accessibility vendor, or none** (decide with the customer).
7. **Pause TexterChat** while WhatsApp is intentionally off, if it bills monthly.
8. **Confirm Heroku is closed** and GitHub isn't billed to the customer.
