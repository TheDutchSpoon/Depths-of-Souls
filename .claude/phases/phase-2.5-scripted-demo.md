# Phase 2.5 (interlude) — Scripted combat demo

Status: **code-complete, locally verified; not yet merged to `main`.** Brief:
`.claude/briefs/phase-2.5-scripted-demo.md`. Implemented on branch `phase-2.5`, branched
from `main` after Phase 2's PR (#16) merged.

## What was built

- `src/app/demoFight.ts` — replaced the two hardcoded 2-creature parties with two real
  5-creature parties (`aldric`/`mira`/`tomas`/`liora`/`wendel` vs. `cave-goblin`/
  `bog-witch`/`stone-troll`/`alpha-wolf`/`sleepy-slime`), one creature per side assigned
  to each of the five stock scripts (`always-attack`, `always-cast`, `always-defend`,
  `always-provoke`, `always-wait`) via `scriptId`. Exports `demoScripts =
  STOCK_SCRIPTS_BY_ID`, imported directly from `src/data/scripts.ts` (real shipped
  content, not redefined locally). Each side's `always-cast` creature (`mira`/
  `bog-witch`) has `CINDER_NOVA` (the 30%-Intelligence AOE spell, from
  `src/data/spells.ts`) equipped in slot 0, so `always-cast` fires a real AOE every
  time it acts.
- `src/ui/CombatDemo.tsx` — added a `scripts: ReadonlyMap<string, Script>` prop, threaded
  into `createCombat`'s 4th argument. No changes needed to `describeEvent`'s rendering
  switch — it already covers every Phase 2 event kind (`SpellCast`, `Defended`,
  `Provoked`, `Waited`) from Phase 2's own compile-compat pass.
- `src/app/App.tsx` — passes `scripts={demoScripts}` through.
- Skipped the brief's optional per-creature script dropdown — the brief explicitly says
  to skip it if it adds real complexity, and it isn't needed to show the interpreter
  running.

## Verification performed

- `npm run lint` / `npm run format:check` / `npm run test` (149/149, unaffected — no
  engine changes) / `npm run build` — all pass.
- **Actually clicked through it in a real browser**, matching the Phase 1.5 pattern: no
  MCP browser tool was connected in this session, but `playwright` itself is just an npm
  package (`npm install --no-save playwright`, so `package.json`/lockfile are untouched)
  with Firefox already cached locally from a prior session
  (`C:\Users\dunca\AppData\Local\ms-playwright\firefox-1532`). Launched the dev server,
  drove it with Playwright + Firefox: clicked "Run fight", confirmed the page renders
  `Result: win` and a full readable event log containing every action kind (`attacks`,
  `casts`, `defends`, `provokes`, `waits` all present as literal substrings, matching
  `describeEvent`'s phrasing); confirmed `mira`'s AOE cast hits all five living enemies
  in one action with visibly varying per-target damage (mixed affinities across the
  roster doing real work); clicked "Run again" and confirmed the rendered log text is
  **byte-identical** to the first run (determinism visible end-to-end through the actual
  UI, not just asserted); zero browser console errors. Screenshots taken before/after the
  click confirmed the DOM actually updates.
- The brief's real acceptance test — confirming this on the live deployed Pages URL —
  still applies after merge, unchanged.

## Next

Phase 3 — Traits as data. See `ROADMAP.md`.
