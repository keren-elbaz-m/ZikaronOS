# Phase 12 — Strapi: one page per screen

Task: T37 · ACs: AC5 (changed), AC18 · Decision (user, 2026-11-23): content editors get **one Strapi page per screen**, with clear Hebrew names, instead of one long `message` collection with technical keys.

## Target experience

- Strapi Content Manager → **Single Types** lists one entry per screen, grouped and named in Hebrew, e.g. `אתר · מציאת סלון`, `אתר · אשף פתיחת סלון`, `אתר · כותרת ותחתית`, `ניהול · דשבורד`, `ניהול · שיבוצים`, `כללי · כפתורים והודעות`.
- Each page shows that screen's texts as fields with **Hebrew labels** that say what the text is and where it appears (e.g. "כותרת העמוד", "כפתור הרשמה"), and a description showing the default text.
- The locale switcher (he / en) works per page, as before.
- An editor never sees dotted keys or namespaces.

## Approach

1. **Screen map** (`packages/i18n/src/cms/screens.ts`): every screen page: `uid` (ascii kebab, e.g. `web-salons`), Hebrew + English display name, namespace, and the key prefixes it owns. Every bundled key in `common`, `web` and `admin` belongs to exactly one page (a test enforces full coverage and no overlap). Emails stay bundle-only (unchanged).
2. **Field naming**: a field per leaf key, attribute name = the key path below the page prefix with `__` between segments (only `[A-Za-z0-9_]`, ≤ 60 chars; a test enforces it). Field type `text` (long texts) or `string`. Labels: a Hebrew label map (`packages/i18n/src/cms/labels.he.ts`) written for every field — clear, short, describes purpose and place; English labels optional. Description = the default Hebrew text (truncated).
3. **Schema generation** (`pnpm cms:generate`): writes `apps/cms/src/api/<uid>/content-types/<uid>/schema.json` (single type, localized, `draftAndPublish: false`) plus routes/controllers/services exposing **only `find`**. A `check-cms-schemas` step in `pnpm lint` fails when the generated schemas are out of sync with the bundle (so a new key forces a regenerate).
4. **Admin layout**: in the CMS bootstrap, write the Content Manager configuration for each page (field labels, descriptions, edit layout in a readable order, list hidden) so the labels show without manual setup. Keep it idempotent.
5. **Permissions**: bootstrap grants the Public role `find` on each page only; removes everything else (keep the Phase 9 hardening: registration off, no public auth routes).
6. **Loader**: `loadMessages` reads the pages for the requested namespaces (`GET /api/<uid>?locale=…`, parallel, 2 s total timeout, `revalidate: 60`), maps fields back to dotted keys and merges with the same safety rules (only existing string leaves, empty ignored, Strapi down → bundle, one warning). Tests first.
7. **Seed and migration**: `pnpm cms:seed` fills every page for he and en from the bundle, keeps editors' changes, `--overwrite` resets. A one-time migration step copies any edited values from the old `message` collection into the pages, then the `message` collection, its routes and permissions are removed.
8. **Docs**: update `apps/cms/README.md` and the root README "Editing texts" section (with the screen list), and TESTING.md.

## Done when

- Strapi shows one single type per screen with Hebrew names and Hebrew field labels; no `message` collection remains.
- Editing a field on a page (he or en) changes the right text in web/admin within ~60 s; Strapi down → bundled texts.
- `cms:generate` + `check-cms-schemas` + coverage tests pass; `cms:seed` is idempotent; public API is read-only per page.
- Root `pnpm lint --force`, `typecheck --force`, `build --force`, `test --force` and `pnpm e2e` pass (update the AC5 e2e to edit a page field).

## Decisions

## Handover
