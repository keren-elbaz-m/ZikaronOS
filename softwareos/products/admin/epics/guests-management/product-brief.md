# Guests Management — Product Brief

> Epic: epic.md · Product: ../../mission.md

## Goals

Staff need to find any guest quickly, see where they are registered, and fix their registration
when a guest calls: change the seat count, or cancel. The legacy guests list and guest profile do this,
with problems:
- "export all" is broken,
- a guest phone can be saved as `++972`,
- several of a guest's salons get merged into one card,
- phone, address and salon details are scattered.

This epic rebuilds the guests list and the admin guest profile with full legacy behavior, in the
prototype's UX: search, filters, CSV export, and a direct link to the guest's salon.

## User Stories

- As a super, general or global admin, I search guests by name, email, phone or salon contact, and filter by registration status, salon city, seat count, community and "didn't finish registration", so I find the guest I'm looking for.
- As an admin, I sort the list by status, salon, city, seats, community or name, and page through it, so I can work a long list.
- As an admin, I open a guest and see their personal details and their current salon registration: status, host or organization, date and time, address (shown in full only when approved), accessibility, free seats, languages and the host's comments.
- As an admin, I edit a guest's name, phone, city and address, so their record is correct.
- As an admin, I change a guest's seat count (1–3) within the salon's capacity, so I can handle a phone request.
- As an admin, I cancel a guest's registration after confirming, and the host is notified as in legacy, so the seat is released.
- As an admin, I jump from a guest to their salon (and from there to the host), so I can follow up.
- As an allowed admin, I export the selected guests, or all guests matching my filters, to CSV.

## Success Criteria

1. The list returns the same guests, scoped per role, as legacy `GET /api/guests/` for the same filters and sort. A parity test runs on a migrated snapshot:
   - super: all guests,
   - general: IL, or no city, or salon in IL,
   - global: non-IL,
   - volunteer: community.
2. Every legacy filter and sort works, with these values:
   - status: `approved_this_year`, `none_this_year`, `total_approved`,
   - city: the salon city,
   - guests_number: 1/2/3,
   - community,
   - `didnt_complete_registration`,
   - free text.

   Filter state lives in the URL. Role-gated filters and columns appear only for the roles in the capability matrix.
3. The guest profile shows the legacy fields and the legacy approved-only privacy rules: phone, link and full address are visible only when the registration is approved. Free seats = max − confirmed − pending.
4. Changing the seat count enforces capacity server-side, and the existing registration counts toward its own capacity. Cancelling requires a confirmation, releases the seats, recomputes whether the salon is open, and triggers the legacy host notification (`hosts_4` when approved and in the future). Each behavior has an API test.
5. Phone edits are validated with the shared Israeli/E.164 rule and stored once as E.164 (never `++972`).
6. A guest with registrations in more than one season sees each salon on its own; nothing is merged. Only the current, non-denied registration can be edited.
7. CSV export (via `dashboard-and-reports`) works for both "selected" and "all filtered", with columns id, full name, email and phone, plus whatever the confirmed column set adds.
8. A security review has passed: guest personal data is exposed only to permitted roles, and no unscoped access is possible by id.

## Out of Scope

- Guests registering, changing or cancelling their own registration on the public site (owned by `platform/salon-discovery-and-guest-registration`).
- Hosts approving or rejecting guest requests on the salon (owned by `hosts-and-salons-management`).
- Deleting guest accounts. Legacy offers it only via the API to super admin, with no admin UI. TBD whether the rewrite exposes it.
- Guest notifications content and templates (owned by `platform/notifications-and-reminders`).
- Moving a guest to another salon from the admin: TBD (not in legacy).

## Parity & Deviations

**Preserve:**
- List columns, filters, sort, page size and the role gates in [shell-lists-and-profiles.md](../../legacy-baseline/shell-lists-and-profiles.md) §Lists, Guests and §Admin guest profile.
- Endpoints `GET/PATCH /api/guests/{id}/`, `GET /api/salonguests/?guest=&denied=false`, `PATCH/DELETE /api/salonguests/{id}/` (backend rules in [backend-discovery.md](../../../platform/legacy-baseline/backend-discovery.md) §5.4 and §6.3).
- One active registration per guest. The guest list is visible to super, general and global admin (menu); the API also permits volunteer admin.

**Adopted deviations:**
- Fix "export all" for guests (admin-discovery G6/G7).
- Fix the guest phone `++972` bug and the merging of several guest salons ([shell-lists-and-profiles.md](../../legacy-baseline/shell-lists-and-profiles.md), "Notable admin bugs").
- Strict phone validation with `libphonenumber-js` (design-reference #2).
- Prototype UX: search-first list, filters kept in the URL, a link to the salon (design-reference, Route → epic map).
- The guest profile is reached from the list and from quick search (⌘K, `admin-auth-and-shell`).

**Decisions to confirm:**
- **Keep the guest profile page?** The prototype has no guest profile; its guest rows link to the salon, and guests are managed there. Recommended: keep a lean guest page for parity (seat changes and cancel come from guest calls).
- Should the volunteer admin see the guests list? The API allows it, but the legacy menu hides it.
- Should the guest profile show the host's phone and email only when the registration is approved, as in legacy?
- The 300-day lookback that legacy applies to salon-guest queries: keep it, or define it by season?
- Prototype limits: at most 3 seats per registration (same as legacy 1/2/3). No change needed; recorded for completeness (design-reference #6).
