# Data-layer carrier reorg

Status: **done.**

A structural refactor between Slice H1 and Slice H2 (per the brief: "runs before Slice H2 so H2
authors into the new shape"). No new gameplay logic; implements CONVENTIONS' "Data layer —
carriers vs. composition" rule. See `.claude/briefs/data-layer-carrier-reorg.md` for the full
spec this executed against.

## What was built

- **`data/traits/`** — `core.ts` (the 9 Phase-3 generic traits), `starters.ts` (the 4 starter/
  Unicorn traits, including `STARTER_TRAITS`), `overgrowth.ts` (the 18 Overgrowth creature traits
  + `BROODMOTHER_TRAIT`), `index.ts` (barrel: `export *` from all three, plus the assembled
  `STOCK_TRAITS`/`TRAIT_REGISTRY`, same names, same order as before).
- **`data/spells/`** — `core.ts` (EMBER_LANCE/CINDER_NOVA/VENOM_BOLT), `overgrowth.ts` (the 10
  original Overgrowth spells **+ `ARCANE_BOLT`**, moved in unchanged), `index.ts` (barrel).
- **`data/species/starters.ts`** and **`data/species/overgrowth.ts`** are now composition-only —
  they import carriers from `../traits`/`../spells` and reference them by id/object; neither
  defines a Trait or Spell anymore.
- **`data/traits.ts`, `data/spells.ts`, `data/traits.test.ts` deleted** — content fully
  relocated. (The old flat files could not coexist with the new directories: a stray
  `data/traits.ts` would have shadowed `data/traits/index.ts` in module resolution and silently
  kept the pre-reorg behavior. Deleted directly, by explicit user sign-off, superseding the
  standing "never delete files" instruction for exactly these three files.)
- **`data/traits.test.ts` relocated to `data/traits/core.test.ts`**, not named by the brief but
  necessary since its subject file is gone. Same assertions, import paths updated, plus one added
  guardrail test (brief's "consider adding" suggestion): a representative const from each of
  core/starters/overgrowth is asserted present in `STOCK_TRAITS`, to catch an unwired barrel.

## The one intended behavior change

`ARCANE_BOLT` moved from being defined inline in `species/starters.ts` (unreachable from any
spawn pool) to `spells/overgrowth.ts`, and was added to `OVERGROWTH_SPELLS`. Biome-1 Wit now has
**three** pool spells (VINE_SNARE, POLLEN_CLOUD, ARCANE_BOLT) instead of two. The def itself
(id/name/targetShape/spellPower/affinity) is byte-identical; the Sorcerer starter's fixed slot-0
loadout still references the same const. No existing test asserted an exact biome-1 spell count
or "2 per affinity," so nothing needed updating there — verified by grep before assuming so.

## Decisions made (both confirmed with the user before coding)

- **`STOCK_SPELLS` deleted, not recreated.** A1's finding: zero code imports it anywhere
  (`generateFloor`/`materializeCreature` read `biome.spellPool` exclusively); only doc comments
  and the brief mentioned it. Met the brief's own "delete if genuinely unreferenced" bar.
- **Barrel = directory-index resolution, not a re-export shim (A2).** `data/traits/index.ts` and
  `data/spells/index.ts` use `export * from './core'` etc. Because `'../data/traits'` already
  resolves to the directory's `index.ts`, nearly every pre-existing import site (`TRAIT_REGISTRY`,
  individual trait/spell consts imported from the old flat files) needed **zero** path edits. The
  only sites that changed are the ones that imported a carrier const from `species/starters.ts`,
  which no longer defines any: 4 golden fixtures (`golden-brute-starter`,
  `golden-shieldbarer-starter`, `golden-sorcerer-starter`, `golden-unicorn-starter`) and
  `species/starters.test.ts`.
- **A3/A4 confirmed as stated**: `statuses.ts` stays flat; `OVERGROWTH_SPELLS` (the pool
  selection) stays in `species/overgrowth.ts` as composition.

## Verification

All four gates green, in order: `npm run test` (518 passed, 0 failed, no golden
`expectedEvents` touched — every golden edit was an import-path line only), `npm run lint`
(clean), `npm run format:check` (clean), `npm run build` (`tsc -b && vite build`, succeeded).

## Next

Slice H2 — Glimmerdark (floors 11–20), authoring directly into the new `traits/`/`spells/`
library shape. See `.claude/phases/phase-4-party-specializations-cave-biomes.md`'s own "Next" and
`.claude/briefs/phase-4-implementation-plan.md`.
