# Phase 1.5 (interlude) — Tooling + engine demo harness

Status: **both deliverables code-complete and locally verified; not yet merged to
`main`.** Brief: `.claude/briefs/phase-1.5-tooling-and-demo.md`.

## Deliverable A — Dependabot

**Branch `dependabot`**: added `.github/dependabot.yml` covering `npm` and
`github-actions` ecosystems, weekly cadence, minor+patch grouped per ecosystem, majors
left ungrouped (individual PRs), no auto-merge. Matches the brief exactly.

**Found and fixed a real, recurring problem while verifying** (not part of the brief,
discovered during it): this machine has `core.autocrlf=true` and the repo had no
`.gitattributes`, so switching branches silently flipped the Phase 1 engine files from
LF to CRLF, which made `format:check` fail on all 24 of them even though nothing had
actually changed. Added **`.gitattributes`** (`* text=auto eol=lf`) to normalize line
endings regardless of any machine's local `core.autocrlf` setting, then renormalized —
confirmed via `git diff` that this produced zero real content changes, just fixed the
symptom at its root so it can't recur on the next branch switch (this machine's or
anyone else's).

**Branch `bump-eslint`**: once Dependabot's first PRs came in, four of them turned out
to be a coupled cluster that cannot merge independently — `eslint-plugin-react-hooks@7`
is the version that actually adds ESLint 10 support; merging `eslint@10` alone fails
with an `ERESOLVE` peer conflict against `eslint-plugin-react-hooks@5`. Dependabot
groups by update-type (minor/patch), not by dependency relationship, so it had no way
to know these were coupled — this needed human (and then agent) judgment on top of the
automation. Combined all five into one branch and verified together:
- `eslint` `^9.0.0` → `^10.6.0`
- `eslint-plugin-react-hooks` `^5.0.0` → `^7.1.1` (the enabler)
- `eslint-config-prettier` `^9.0.0` → `^10.1.8`
- `eslint-plugin-react-refresh` `^0.4.0` → `^0.5.3`
- `globals` `^15.0.0` → `^17.7.0`
- `npm install` resolved with **zero peer conflicts**, everything dedupes to
  `eslint@10.6.0`; `@eslint/js` and `typescript-eslint` needed no changes.

**Verification (both branches)**: `lint`, `format:check`, `test` (63/63), `build` all
pass.

## Deliverable B — Engine demo harness

**Branch `demo`**. New files:
- `src/app/demoFight.ts` — two hardcoded 2-creature parties (using the engine's real
  `Creature` type directly, **not** the test-only `__fixtures__` helpers, per the
  brief's explicit guardrail) and a fixed seed.
- `src/ui/CombatDemo.tsx` — takes `playerParty`/`enemyParty`/`seed` as props (doesn't
  import the fight data itself, so it stays a generic engine consumer, not coupled to
  this one hardcoded fight); a Run fight/Run again button calling `createCombat` →
  `resolveFight`; renders the event log as plain readable text. Commented at the top as
  an explicit throwaway that Phase 7 replaces.
- `src/app/App.tsx` updated to render `CombatDemo` in place of the Phase 0 tick counter.

**Guardrails respected**: `src/engine/` gained no React/DOM/UI dependency — the demo is
purely a consumer, importing `createCombat`/`resolveFight`/types and nothing more.

**Verification — actually run, not just built green**:
- `lint`, `format:check`, `test` (63/63), `build` all pass.
- Launched the dev server and drove it with Playwright + Firefox (matching the
  Phase 0/0.5 verification pattern): clicked "Run fight", confirmed a full readable
  event log renders (fight start → rounds → attacks/damage/deaths → fight end);
  confirmed **default targeting correctly re-picks the next living slot** after a kill
  (Aldric switches from the dead Cave Goblin to Bog Rat mid-fight, live, not just in a
  unit test); confirmed **determinism is visible end-to-end through the UI** — clicking
  "Run again" produces a byte-identical log; zero console errors.

**Left deliberately undone**: `src/ui/TickCounter.tsx` and `src/state/store.ts` are now
dead code (nothing imports them since the demo replaced the tick counter). Not deleted
— per working agreement, file deletion is left to the user.

## Next

Once these three branches (`dependabot`, `bump-eslint`, `demo`) are merged: Phase 2 —
actions, spells & the scripting interpreter. See `ROADMAP.md`.
