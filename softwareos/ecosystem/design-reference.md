# Design Reference — `zikaron-next` prototype

> Customer: zikaron-basalon
> Discovered: 2026-11-18 by /join-project (re-run)
> Location: [`prototype/zikaron-next/`](../../prototype/zikaron-next/README.md) (in this hub, untracked at discovery)
> Used by: [platform](../products/platform/mission.md) · [admin](../products/admin/mission.md)
> Status: shared design reference — not a product, never shipped

## What it is

A clickable, demo-data-only prototype of the rewritten public site and staff admin.
It walks through one season end to end: a host opens a salon, guests register, staff
assign ("team") a witness, and the host sees that witness. It shows the **target stack** and the
**redesigned UX** to product, design and engineering on both products. The legacy-vs-prototype
comparison is in its [README](../../prototype/zikaron-next/README.md).

It is the **UX reference** for the rewrite. The **behavioral reference** is still each
product's `legacy-baseline/`. When the two disagree, the spec must record the choice as a
deliberate deviation (see [Deviations](#behavior-the-prototype-changes-from-legacy) below).

## Tech stack

| | |
|---|---|
| Framework | Next.js 15.5 App Router, React 19.1, TypeScript 5. Every page is a client component |
| Styling | Tailwind v4 (`@tailwindcss/postcss`), `clsx` + `tailwind-merge`, Rubik via `next/font`, `lucide-react`, `sonner` |
| State | One React Context store saved to `localStorage` (`lib/store.tsx`, key `zikaron-prototype-v3`). No backend, no data fetching |
| Maps | `leaflet` + `react-leaflet` with **public OSM tiles**. The target stack says Google Maps, and public OSM tiles are not for production use |
| Validation | Hand-written: `libphonenumber-js/max` for phones, a regex for email. `zod` is installed but **unused** |
| Scripts | `dev`, `build`, `start`, `lint` (eslint 9 + `eslint-config-next`). **No tests** |

## Architecture

- **Routes:** `/`, `/salons`, `/salons/[id]`, `/guest`, `/host`, `/host/new`. The admin pages sit under
  `admin/layout.tsx`: `/admin`, `/admin/{salons,hosts,witnesses}` plus `[id]` pages, `/admin/guests`, `/admin/teaming`.
- **Role switcher** (`components/site-header.tsx`): guest / host / admin, set automatically from the URL
  prefix, with a ↺ button to reset the demo data. **No auth or role gating.**
- **Domain model** (`lib/types.ts`): City, SalonDay, Training, Host, Salon, Registration, Witness
  (status `not_contacted | no_answer | available | not_available | archived`, availability
  grid, maxSalons), Note, Session. Seed data is in `lib/data.ts` (8 cities, 8 salons, 9 witnesses, 2027 dates).
- **Shared logic** (`lib/utils.ts`): `slotOf`, `matchWitnesses`, `salonsForWitness`, phone/email
  checks, .ics generation, CSV export (BOM + Hebrew headers), distance.
- **Gotchas:** Hebrew/RTL only (no i18n, no orthodox mode). New salons get the city's coordinates
  plus random jitter instead of real geocoding. The "address must match city" check only looks for
  other known city names in the text.

## Route → epic map

| Route | Epic |
|---|---|
| `/` (layout, header) | [platform/site-shell-content-and-i18n](../products/platform/epics/site-shell-content-and-i18n/epic.md) |
| `/salons`, `/salons/[id]`, `/guest` | [platform/salon-discovery-and-guest-registration](../products/platform/epics/salon-discovery-and-guest-registration/epic.md) |
| `/host`, `/host/new` | [platform/salon-hosting](../products/platform/epics/salon-hosting/epic.md) |
| `admin/layout.tsx` (shell, ⌘K) | [admin/admin-auth-and-shell](../products/admin/epics/admin-auth-and-shell/epic.md) |
| `/admin` | [admin/dashboard-and-reports](../products/admin/epics/dashboard-and-reports/epic.md) |
| `/admin/salons[/id]`, `/admin/hosts[/id]` | [admin/hosts-and-salons-management](../products/admin/epics/hosts-and-salons-management/epic.md) |
| `/admin/witnesses[/id]` | [admin/witnesses-management](../products/admin/epics/witnesses-management/epic.md) |
| `/admin/guests` | [admin/guests-management](../products/admin/epics/guests-management/epic.md) |
| `/admin/teaming` | [admin/salon-teaming](../products/admin/epics/salon-teaming/epic.md) |

**Not covered by the prototype:** `platform/authentication-and-accounts`, `back-office-operations`,
`notifications-and-reminders`, `witness-self-registration`. `platform-rewrite` uses the
prototype only as a stack sanity check.

## Behavior the prototype changes from legacy

Each item below is a candidate **deliberate deviation**. A spec that adopts one must record it
as a decision; a spec that keeps legacy behavior must say so. Paths are relative to `prototype/zikaron-next/`.

1. **Time-of-day buckets:** morning 08–12, noon 12–17, evening 17+, and no slot before 08 (`lib/utils.ts:12-18`). Legacy uses 07 or 08 depending on the code path.
2. **Phone:** strict `isValidPhoneNumber(…, "IL")` (`libphonenumber-js/max`), stored as E.164 (`lib/utils.ts:32-36`). This matches the server rule; the legacy client accepted "possible" numbers.
3. **Address must match the chosen city** (`app/host/new/page.tsx:61-63`).
4. **Training required only for first-time hosts** (`app/host/new/page.tsx:69`). Legacy required it on every save.
5. **Host wizard:** 4 steps instead of 5, capacity 2–200, times 08:00–22:30 in 30-minute steps, and capacity can't drop below seats already taken (`app/host/new/page.tsx:15,48,65`; `app/host/page.tsx:68`).
6. **Guest registration:** no account and no password, at most 3 seats per registration, one form on a shareable salon page, with .ics and share on success (`app/salons/[id]/page.tsx:35,110-111`).
7. **Teaming score** (`lib/utils.ts:61-86`):
   - Points: date+slot 50, language 20, accessibility 10, distance up to 20 (digital salons get the full 20), and −100 at the yearly limit.
   - "Near" means under 25 km.
   - A witness is **blocked** if they aren't `available`, aren't free for that slot, the accessibility doesn't fit, or they're at `maxSalons`.
8. **Witness status rules** (`app/admin/witnesses/[id]/page.tsx:309-323`):
   - Status can't leave `available` while the witness has assignments.
   - Leaving `available` clears availability.
   - `archived` needs a reason, and `no_answer` needs the last contact time.
   - The status note is at most 225 characters.
   - `maxSalons` can't be set below the current number of assignments.
   - New witnesses start as `not_contacted` with `maxSalons` 2.
9. **One host record per email**, and returning hosts keep their history (`lib/store.tsx:69`).
10. **Undo after teaming** (`app/admin/teaming/page.tsx:38`). Invalid coordinates never reach the map (`components/salon-map.tsx:32`).

## Do not carry over

- Client-only enforcement: re-specify every rule above as shared zod schemas that the API enforces.
- Jitter geocoding, `localStorage` persistence, and public OSM tiles.
- The demo role switcher in place of real auth and role gating (see `platform/authentication-and-accounts`, `admin/admin-auth-and-shell`).
