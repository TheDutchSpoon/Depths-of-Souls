# Brief: Data-layer carrier reorg (traits/spells → library dirs; composition references by id)

**Status:** planned
**Type:** structural refactor (no new gameplay). Runs before Slice H2 so H2 authors into the new shape.

## Goal

Give effect-carrier content (traits, spells) a single, consistent home and stop composition files
from defining carriers. Today traits are defined in *two* places — `data/traits.ts` (Phase-3 core
+ the 18 Overgrowth traits, inline) and `data/species/starters.ts` (the four starter traits,
inline, spread into `STOCK_TRAITS`) — and spells are similar (`ARCANE_BOLT` lives in
`starters.ts`). That split is the inconsistency this fixes.

The rule (now in `CONVENTIONS.md` → *Project layout → Data layer — carriers vs. composition*):
**carrier definitions live in a library dir per type; composition files only reference them by
id/object; a composition file never defines a carrier.** A trait/spell is not species-owned — it's
a shared registry entry the model grants via `innateTraitIds`/equip and will grant via
gems/equipment, so co-locating a def inside a species file bakes in a false ownership.

## Target layout

```
src/data/
  traits/
    core.ts        # Phase-3 generics: BRUTISH, BLOODLUST, SWIFT_STRIKER, RETALIATE, GRUDGE,
                   #   RECKLESS, VENGEFUL, REELING, CATASTROPHIC_COLLAPSE
    starters.ts    # SORCERER/BRUTE/SHIELDBARER starter traits + UNICORN_TRAIT
    overgrowth.ts  # the 18 Overgrowth creature traits + BROODMOTHER_TRAIT
    index.ts       # STOCK_TRAITS = [...core, ...starters, ...overgrowth]; TRAIT_REGISTRY = Map(...)
  spells/
    core.ts        # EMBER_LANCE, CINDER_NOVA, VENOM_BOLT
    overgrowth.ts  # THORN_LASH, WEAKENING_BITE, VINE_SNARE, POLLEN_CLOUD, ROOT_GRASP, BRAMBLE_WARD,
                   #   REGROWTH, WILD_VIGOR, STINGER_SWARM, HOWLING_INSTINCT, ARCANE_BOLT
    index.ts       # aggregation (see ASSUMPTION A1 re: STOCK_SPELLS / a SPELL_REGISTRY)
  statuses.ts      # UNCHANGED — stays flat (global vocabulary)
  species/
    starters.ts    # composition only — no Trait/Spell defs; refs by id/object
    overgrowth.ts  # composition only — creatures + boss + BiomeData; spellPool groups spells/overgrowth defs
  biomes.ts · scripts.ts · curves.ts  # unchanged
```

## The moves (pure relocation unless noted)

1. **Traits.** Move the Phase-3 trait defs from `traits.ts` into `traits/core.ts`; the four
   starter trait defs from `species/starters.ts` into `traits/starters.ts`; the 18 + boss from
   `traits.ts` into `traits/overgrowth.ts`. `traits/index.ts` assembles `STOCK_TRAITS` and
   `TRAIT_REGISTRY` **under the same exported names**.
2. **Spells.** Move the three Phase-3 spell defs into `spells/core.ts`; the Overgrowth spell defs
   (currently the consts fed into `OVERGROWTH_SPELLS`) into `spells/overgrowth.ts`. `spells/index.ts`
   aggregates.
3. **`ARCANE_BOLT` → normal biome-1 Wit spell** (design decision — was never required to be
   unspawnable). Move its def into `spells/overgrowth.ts` and **add it to `OVERGROWTH_SPELLS`** so
   it enters biome-1's spawn pool. The Sorcerer starter still references it in `equippedSpells`.
   Content consequence: biome-1 Wit now has **three** pool spells (VINE_SNARE, POLLEN_CLOUD,
   ARCANE_BOLT) instead of two — intended.
4. **Composition files become reference-only.** `species/starters.ts` and `species/overgrowth.ts`
   keep their creatures/`BiomeData`/`OVERGROWTH_SPELLS` grouping, but import every trait/spell
   from the library and define none. `OVERGROWTH_SPELLS` (the biome pool selection) stays in the
   biome/species file — it's composition.

## Preserve exactly (this is a move, not a redesign)

- **Exported symbol names and shapes are unchanged**: `STOCK_TRAITS`, `TRAIT_REGISTRY`, every
  individual `*_TRAIT` / spell const, `OVERGROWTH_SPELLS`, `STARTER_TRAITS`, the `SpeciesCreature`
  exports. Only their **file location** changes. Import sites update to the new paths.
- **No engine changes.** `src/engine/` is untouched.
- **Goldens byte-identical.** No effect def changes; `ARCANE_BOLT`'s def is unchanged (only its
  file + pool membership). Golden *fixtures* that import a moved const update their import path only
  — their `expectedEvents` must not change. Prove it: the full prior golden suite stays green with
  no fixture-expectation edits.
- **Gates green**: `test`, `lint`, `format:check`, `build`.

## ASSUMPTIONs (pin before/while coding — collected for review)

- **A1 — `STOCK_SPELLS` may be vestigial.** Generation reads `biome.spellPool`, not `STOCK_SPELLS`.
  Confirm whether anything still consumes `STOCK_SPELLS`. ASSUMPTION: keep it as the aggregated
  spell registry (mirroring `STOCK_TRAITS`) built in `spells/index.ts`, re-adding `ARCANE_BOLT`;
  delete only if genuinely unreferenced. Flag the finding, don't guess.
- **A2 — import-churn strategy for the barrel.** ASSUMPTION: make `data/traits/index.ts` /
  `data/spells/index.ts` the barrels and update import sites to `../traits` / `../spells` (dir
  index resolution), rather than leaving thin `data/traits.ts` re-export shims. Pick whichever
  keeps the tree cleaner; state which.
- **A3 — statuses stay flat.** ASSUMPTION: `data/statuses.ts` is not split into `statuses/`. It's
  global vocabulary, not biome-organized, and small.
- **A4 — biome-pool grouping location.** ASSUMPTION: `OVERGROWTH_SPELLS` (the pool selection) stays
  in `species/overgrowth.ts` (composition), importing the defs from `spells/overgrowth.ts`.

## Tests to update (not silently — call each out)

- Any assertion pinning **biome-1 spell count / "2 per affinity"** must move to accommodate the new
  Wit third (`ARCANE_BOLT`); the loader test's "cast-role has ≥1 affinity-matched spell" and
  affinity-completeness assertions still hold unchanged.
- `species/starters.test.ts` and the sorcerer golden import `ARCANE_BOLT` / starter traits — update
  import paths; expectations unchanged.
- Keep (and lean on) the loader/shape test's "every creature's trait id resolves in
  `TRAIT_REGISTRY`" as the guardrail against an unwired `index.ts` module. Consider adding one
  assertion that each library grouping is actually included in the registry.

## Out of scope

No new gameplay content; no `data/gems/` or `data/equipment/` yet (the layout just leaves room for
them). No trait/spell dedup or shared-const extraction — today it's 1:1 trait→creature and that's
fine; identity stays in data.
