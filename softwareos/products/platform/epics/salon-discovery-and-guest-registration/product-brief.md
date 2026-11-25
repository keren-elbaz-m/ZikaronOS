# Salon Discovery & Guest Registration — Product Brief

> Epic: epic.md · Product: ../../mission.md

## Goals

Every season, members of the public have to find a salon near them, understand who is hosting it and
which witness will speak, and take a seat. Today that takes four screens and a password
(sign up → onboarding → map → drawer → register). The search loses its filters on reload. A
salon has no page of its own, only a `/mapview/:id` drawer. The map crashes on bad coordinates.
The table view never receives data.

Goals:
- Rebuild public salon search, the salon details view and guest registration with **every legacy
  behavior preserved or explicitly waived**, in the prototype's UX (`/salons`, `/salons/[id]`, `/guest`).
- Make every search and every salon **shareable by URL**, so hosts and staff can send a link that
  opens the right salon or the right filtered list.
- Keep capacity correct: never overbook, and never show a full salon as open.
- Stop leaking data the public must not see (host contact details in the map cache).

## User Stories

- As a visitor, I can search open salons on a map and a list, and filter by city, language, free seats
  (1–3), accessibility, salon day, time of day, in-person/digital and free text, so I find one that fits me.
- As a visitor, I can open a link that a friend or host sent me (a search or a single salon) and land on
  exactly that view.
- As a visitor, I can open a salon's own page and see the date and time, the address (or "digital"), accessibility,
  language, the host's note to guests and the assigned witness's name, type and presentation paragraph.
- As a guest, I can register 1–3 seats, limited by the seats left, and get a confirmation with
  the host's details, an add-to-calendar file and a share link.
- As a guest, I can see my registration, cancel it (which notifies the host), and edit my profile
  details.
- As a host who opens the search, I see that hosts can't register as guests and get a link to send to
  guests instead.
- As a visitor outside Israel, I get the same result as legacy (an empty map, HTTP 450).

## Success Criteria

- Every behavior listed under "Preserve" below has an automated test (API contract or E2E) that passes
  against the new stack. Every waiver is recorded in the owning spec.
- Filters round-trip through the URL: reloading or sharing a filtered search restores the same results.
- The legacy deep link `/site/salonSearch/mapview/:id` redirects to `/salons/:id`, and a full or closed salon
  shows the "salon is full" state with a link back to available salons.
- Capacity tests: concurrent registrations never push Σ seats above `max_guests`; a salon is open
  iff seats taken < `max_guests` (or `max_guests` is 0/empty, which means unlimited).
- The public map/list response contains no host phone or email, and no address, coordinates, city, floor
  or apartment for non-IL salons (verified by a contract test and the security review).
- Registration and cancellation trigger the same notifications as legacy (`guests_1` + WhatsApp
  `guests_1new` on create; `hosts_4` to the host on cancelling an approved future registration;
  `hosts_5` on a seat change). Verified through the notifications service test doubles.
- QA sign-off on mobile (list/map toggle) and desktop, in Hebrew (RTL) and English.

## Out of Scope

- Account creation, login, password reset and host↔guest role switching (→ `authentication-and-accounts`).
- Email/WhatsApp templates and delivery (→ `notifications-and-reminders`). This epic only emits the events.
- Host-side guest list and removal (→ `salon-hosting`). Staff guest management (→ `admin/guests-management`).
- The Easy partner feed (→ `back-office-operations`).
- The Igul LeTova prompt on the guest page is shared with the host page and owned by `salon-hosting`.

## Parity & Deviations

**Preserve (legacy baseline):**
- Public listing rules: `event_time` date ≥ today, `is_open_for_guests`, `evening_public`, host
  registration finished. Past salons are dropped. Physical salons sort before digital, then by distance.
- Filters: city[], language[], available_places (1/2/3), accessibility (Elevator, Wheelchair, Floor
  zero), date[] (salon days), time[] (morning/noon/evening), is_digital (dropped when both are picked),
  free_text. `?city=` accepts comma-separated names/slugs, case-insensitive, with `-` matching a space.
- Non-IL salons hide address, coordinates, city, apartment and floor. The witness name, type and
  presentation paragraph are public once a witness is assigned.
- Registration: 1–3 seats, at most `min(3, max − taken)`. The salon must be open and public. Status is forced to
  `approved` and the guest is the caller. One active registration per guest.
- A visitor who isn't logged in keeps their seat selection through sign-up, and it is registered automatically after login/onboarding.
- "My salon": card with host contact, the digital `site_link` (shown only here), witness, seats, and cancel
  with confirmation. Profile edit: first/last name, city (required), address, phone, with email read-only.
- Outside Israel → empty result (HTTP 450).

**Adopted deviations (recorded as decisions in the owning spec):**
- Filters live in the URL, and each salon has its own page (`/salons/[id]`). This fixes filters resetting on reload and the drawer having no URL.
- Invalid coordinates are filtered out before reaching the map (design-reference #10).
- One time-of-day rule: morning 08–12, noon 12–17, evening 17+ (design-reference #1).
- Strict phone validation shared by client and server, stored as E.164 (design-reference #2).
- The open flag is computed as `taken < max`, not legacy's `Σ != max` equality, so overbooked salons no longer reopen (`backend-discovery.md` §6.3).
- The public map cache no longer carries host contact details (join-report Uncertainties #5).
- On success: an .ics file and a share link (additive).

**Decisions to confirm:**
1. **Account-less registration.** The prototype registers with name, phone and email and no password.
   Legacy requires an account (a `Guest` is tied to a `User`, and the `guests_9` reminder and the "My salon" page
   depend on it). Options: keep accounts (parity), or go account-less with a magic link to manage or cancel.
   This decides the scope of `authentication-and-accounts`.
2. **Switching salons.** Legacy silently deletes a guest's previous registration when they register
   elsewhere (and notifies the old host). Keep it silent, or confirm "move my seats" first?
3. **Full salons.** Legacy hides them from the public list. The prototype shows them, sorted last. Pick one.
4. **Digital-salon table** (`/site/salonSearch/table`) never receives data in legacy (join-report #2). Drop it, or
   fold digital salons into the main list with the `is_digital` filter?
5. **Map provider and distance.** Legacy uses Google Maps with Distance Matrix driving distance. The prototype uses
   Leaflet and public OSM tiles with straight-line distance (join-report #7). Pick the provider and the distance method.
6. **Geo-blocking.** The 450 response doesn't come from the Django code (most likely edge or WAF). Confirm where it lives
   and whether the rewrite keeps it.
