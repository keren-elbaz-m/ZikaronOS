# Zikaron BaSalon — upgraded prototype

A clickable prototype of the next version of the public site and the staff admin:
the same season workflow as the legacy apps (host opens a salon → guests register →
staff team a witness → host sees the witness), redesigned and rebuilt on the target
stack. **Demo data only.** State lives in the browser (`localStorage`); there is no backend.

```bash
npm install
npm run dev            # http://localhost:3000
# or: npm run build && npx next start -p 3200
```

Use the **"הדגמה בתור"** switch in the header to move between guest, host and staff,
and the ↺ button to reset the demo data.

## What's different from the legacy apps

| Area | Legacy | Prototype |
|---|---|---|
| Stack | CRA 3 / React 16 / MUI 4 / redux-saga, ~850 KB JS (gz) | Next.js 15 App Router / React 19 / Tailwind v4, ~175–188 KB first load per route |
| Guest registration | Sign up → onboarding → map → drawer → register (4 screens, password required) | One form on the salon page: name, phone, email, seats. Add-to-calendar (.ics) and share link on success |
| Salon page | A drawer over the map; no URL of its own | A real page per salon (`/salons/:id`), shareable |
| Search | Filters reset on reload; map crashes on bad data | Filters live in the URL (shareable searches); invalid coordinates never reach the map; list/map toggle on mobile |
| Host wizard | 5 steps; validation only gates "Next"; server errors flash in a 5-second banner | 4 steps with inline errors on the field, live preview of the salon card, autosaved draft |
| Phone | Browser accepts "possible" numbers, server rejects them | Same strict rule as the server (`libphonenumber-js/max`) with an example in the message |
| Address | Address from any city accepted (e.g. Dimona for Tel Aviv) | Address must match the chosen city |
| Training | Required on every save | Required only for first-time hosts |
| Host page | Tabs; donation popup on arrival | Guests table, seats meter, quick capacity change, witness card, "what's left to do" checklist |
| Teaming | Map/table + sidebar; matches unexplained; several known bugs | Queue of salons waiting, ranked matches with a score and ✓/✗ reasons (date+slot, language, distance, accessibility, yearly load), confirm dialog, one-click undo |
| Time-of-day | 07:00 or 08:00 depending on the code path | One rule: morning 08–12, noon 12–17, evening 17+ |
| Admin dashboard | Counts only | KPIs, per-day capacity chart, witness pipeline, "needs a witness" and "almost full" work lists |
| Admin navigation | Sidebar hidden on mobile; menu-only role gating | Side menu with live counts; ⌘K / Ctrl+K search across salons, witnesses and guests |
| Witnesses | List + long profile of edit modals; edits lost on failed save; duplicate phone checked only after submit | Status tabs, one-click availability grid (days × slots), status rules that block changes while assigned, reverse matching ("salons that fit this witness"), team notes, duplicate phone caught while typing |
| Salon (staff view) | Host profile with accordion per salon; several known bugs | One page: guests (with export/remove), witness, follow-up switches, contacts, team notes |
| Guests | List only | Search, filters, CSV export, link to the salon |
| Salons table | Server paging, sort didn't apply in teaming | Search, filters, sortable columns, CSV export with Hebrew headers |

Not in the prototype: real auth, the backend/API, notifications (email/WhatsApp),
Django-admin back-office screens, i18n (Hebrew only), orthodox mode.
