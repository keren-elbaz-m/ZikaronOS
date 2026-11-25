# Witness Self-Registration — Product Brief

> Epic: epic.md · Product: ../../mission.md

## Goals

**Top decision to confirm first: rebuild this flow properly, or drop it.**

The legacy public flow "I want to tell" (`/register/wanttotell` → birth details → availability) does not work:
- three of its steps are stubs;
- availability is limited to hard-coded 2024 dates;
- the availability it collects is never sent;
- on submit it PATCHes **witness id 4** (`/api/witnesses/4/`) with the birth fields, so every submission overwrites the
  same real record.

There is nothing to keep at parity. Today, witness intake actually happens in two other ways:
- staff create witnesses in the admin (`admin/witnesses-management`);
- a Google Form → Sheet → webhook updates **existing** witnesses matched by phone. It returns 404 for unknown phones, so it never
  creates one (`back-office-operations`).

**Option A — Rebuild (planned below).** Let a survivor, descendant, expert or other speaker (or someone on their behalf)
tell the movement they want to speak, on the public site. Their details and season availability land in the
witness CRM as a **new lead for staff to verify**, never directly in teaming.

**Option B — Drop.** Remove the route and keep intake admin-only plus the Google Form. `/register/wanttotell` redirects to
the main site's witness information page. This is one small spec (`retire-witness-self-registration`).

Goals (Option A):
- A working public intake that creates a witness lead, so no existing record is ever modified from the public site.
- Availability collected against the **season's real salon days**, not hard-coded dates.
- A safe public endpoint: rate-limited and bot-protected, with no data leaking about existing witnesses.

## User Stories

- As a potential witness, I can say I'm interested (or decline and go back to the main site) from a page that explains
  what being a witness means.
- As a potential witness, or a relative or contact person registering for them, I can enter name, phone(s), email, witness
  type, country and date of birth, city, languages, whether I can climb stairs, a site or video link, and up to 1,000 characters
  about myself.
- As a potential witness, I can mark which of this season's salon days I'm free (morning / afternoon / evening).
- As a potential witness, I get a confirmation that the team will contact me.
- As staff, I see new website registrations flagged in the witnesses list. I'm warned when the phone matches an existing
  witness, and I can verify, merge or archive the lead before it can be teamed.

## Success Criteria

- No public request can modify an existing witness. A contract test shows that submitting the form only ever creates a new lead
  (security review sign-off).
- Availability options come from the current `SalonDay`s. Validation matches the legacy rules (≤3 dates, ≥1 slot per date,
  unique dates; birth date between 1900 and today; free text ≤1,000).
- A duplicate phone doesn't block submission and doesn't reveal any existing witness's details publicly. Staff see the match in the admin.
- Self-registered witnesses are **not** teamable (`available_for_teaming=false`) until staff verify them (E2E across web → admin).
- Abuse controls: a rate limit and bot protection on the endpoint. They are tested and documented.
- QA sign-off in Hebrew and English. The flow is hidden or kept per decision in the orthodox build.

## Out of Scope

- A witness login or self-service profile. Legacy has a `witness` role but no witness-facing area.
- The Google Sheet webhook (→ `back-office-operations`).
- Staff witness CRM, availability grid and teaming (→ `admin/witnesses-management`, `admin/salon-teaming`).
- Notifying the witness about assignments. Legacy never notifies witnesses.

## Parity & Deviations

**Preserve (legacy intent, since the legacy behavior is broken):**
- Entry page: "Interested" → the form; "No thanks" → `zikaronbasalon.com`.
- Birth details: country of birth, birth date (required, 1900..today), site link, additional details (≤1000).
- Availability: up to 3 dates, at least one time slot per date, no duplicate dates.

**Adopted deviations (recorded as decisions in the owning spec):**
- Create a new witness lead instead of PATCHing witness `4` (a legacy data-corrupting bug).
- Dates come from `SalonDay` instead of the hard-coded 2024-05-01..09.
- Availability is actually saved. Legacy drops it.
- The stub steps (register / details / extradetails) become one real form with contact, type, languages, city and accessibility.
- The duplicate-phone check runs server-side and shows names only to staff. Legacy's duplicate endpoint is open to any user and
  returns names (join-report Uncertainties #5).

**Decisions to confirm:**
1. **Rebuild (A) or drop (B).** Who owns witness intake: the public site, staff only, or the Google Form?
2. If rebuilt: **lead status**. Add a new status ("new from website") or reuse `not_contact_this_year` with a source flag?
3. If rebuilt: should staff be **notified** of each new lead (email to testimonials/volunteer admins of the city's community)?
4. If rebuilt: shown in the **orthodox build**?
5. If rebuilt: is consent text needed for storing date of birth and personal history (legal/privacy; TBD)?
