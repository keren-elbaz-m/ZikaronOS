# Admin Auth & Shell

> Product: ../../mission.md
> Status: planning
> Created: 2026-11-25 · Roles planned: PM, Tech

## Summary

Staff login, email password reset, the first-login privacy-policy gate and a session that refreshes and fully logs out. Also the RTL admin shell: a role-filtered side menu (desktop and mobile) with live work counts, a he/en toggle, a ⌘K quick search, and the shared list kit the other admin epics use. Replaces legacy's sidebar-only gating with one role → capability matrix enforced by the menu, the route guard and the API.

## Legacy baseline

The as-is behavior this epic must preserve in the rewrite (parity reference, not a spec):

- [shell-lists-and-profiles.md](../../legacy-baseline/shell-lists-and-profiles.md)

## Design reference

UX target from the shared prototype ([design-reference.md](../../../../ecosystem/design-reference.md)), routes `admin/layout.tsx` in `prototype/zikaron-next`:

- Side nav with live counts and a ⌘K / Ctrl+K palette searching salons, hosts, witnesses and guests. **No auth or role gating** (demo role switcher only).
- Where this differs from the legacy baseline, the spec must record the choice as a deliberate deviation (see the design-reference "Behavior the prototype changes" list).

## Documents

- [Product brief](product-brief.md)
- [Tech plan](tech-plan.md)

## Specs

| Spec | Status | Branch |
|---|---|---|
