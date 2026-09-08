# Phase 4 — Party, specializations, the cave & biomes

Status: **in progress — Slice A done** (A: 253/253 tests; lint/format/build green). Built per
the approved plan at `.claude/briefs/phase-4-implementation-plan.md` (kept there for the full
slice sequencing, the engine-vocabulary delta table, and the numbered `ASSUMPTION` checklist —
not duplicated here). Eleven slices total (A–I, H split into H1/H2/H3 per biome); this record
grows one section per slice, in the same style as `phase-3-traits-statuses-effects.md`.

---

## Slice A — Run-layer generation (pure, seeded)

The `src/engine`-sibling generation module from CONVENTIONS' "Generation & the run layer,"
built and tested against small **fixture** biome/species/creature data — zero dependency on
the effect-framework additions (Slices B–E) or the state layer (F/G), so it lands first with no
rework risk.

### What was built

New files under `src/engine/`:
- `leveling.ts` — `scaleStatsToLevel(base, level)` (the already-pinned linear formula,
  `round(base × (1 + 0.25 × (level−1)))`, GAME_DESIGN §5 — this is the first slice any creature
  has a level, so it was fully specified but never implemented before now) and
  `xpForNextLevel(level)` (ASSUMPTION 1: a parked-balance placeholder, `100 × level`).
- `curves.ts` — `enemyLevelRange(floor)` (ASSUMPTION 2: placeholder `{min: floor, max: floor +
  2 + floor(floor/10)}`) and `fightCount(floor)` (ASSUMPTION 3: flat placeholder `3`,
  deterministic, never rolled), plus two additions beyond the brief's own numbered list:
  `ENEMY_PARTY_SIZE = 6` (new assumption — the brief's "up to 6 enemy slots" doesn't pin
  whether enemy count scales with depth; fixed at the full 6v6 slate for now) and
  `RARITY_DRAW_WEIGHT` (new assumption — GAME_DESIGN §13 parks soul-*gain*-per-rarity but never
  pins spawn-*weight*-per-rarity; a descending placeholder, common 6 / uncommon 3 / rare 1).
- `generation.ts` — the module itself:
  - `Species`/`SpeciesCreature`/`BiomeData` — the static content **shapes** Slice A ships (real
    content is H1–H3's job). `SpeciesCreature` carries affinity/baseStats/defaultScriptId/
    innateTraitIds/rarity; `Species` adds a `weight` field per ASSUMPTION 5 (explicit,
    data-driven, defaults to equal within a biome when content doesn't skew it).
  - `canEquip(spell, affinity)` — CONVENTIONS' "Spell affinity & equip-gating" predicate,
    implemented for the first time (see the cross-cutting change below).
  - `biomeForFloor(floor, biomes, atlasPins, runSeed)` — the fixed 1–100 decade sequence
    (`biomes[floor((floor−1)/10)]`) plus, for floor 101+, ASSUMPTION 4's fresh
    `createSeededRng(hash(runSeed, floor))` per floor (re-derived, not advanced from a running
    stream, so a re-visit is stable without persisting past draws). Atlas pins override either
    branch. **Interpretation beyond the brief's own `(floor, atlasPins, runSeed)` shorthand**:
    the ordered biome list is an explicit parameter rather than an implicit
    `src/data/biomes.ts` import, since real per-biome ids are authored names, not numbered
    slots — this keeps the function engine-pure/fixture-testable, the same way `createCombat`
    takes `scripts`/`traits`/`statuses` as explicit registries rather than reaching into
    `src/data` itself.
  - `materializeCreature(speciesCreature, level, side, slot, equippedSpells?)` — pure,
    RNG-free. Bakes `scaleStatsToLevel` into `baseStats`; derives a deterministic id
    (`${speciesCreatureId}-${side}-${slot}`); copies affinity/`defaultScriptId`→`scriptId`/
    innateTraitIds; `currentHp` is a placeholder equal to `baseStats.health` — `createCombat`
    still owns the real fight-start init, so a materialized creature never bypasses it.
  - `generateFloor(floor, biome, runRng)` — `fightCount(floor)` fights of `ENEMY_PARTY_SIZE`
    enemies each: per slot, a weighted species draw, a rarity-weighted within-species creature
    draw (`RARITY_DRAW_WEIGHT`), a level draw from `enemyLevelRange(floor)`, then
    `materializeCreature`. A cast-role creature (ASSUMPTION, read narrowly per the brief's own
    parenthetical as `defaultScriptId === 'always-cast'`) is rolled exactly one
    affinity-matched spell into gem slot 0 via `canEquip`; everyone else spawns with all-null
    gem slots. `runRng` is the caller's persistent run-RNG stream (mutated by reference, per
    CONVENTIONS) — re-descending re-rolls creatures while `biomeForFloor` keeps the biome fixed.
  - Internal `weightedPick` helper — cumulative-weight draw over the pool's own authored order
    (never re-sorted; this is a random pick, not an extremum selection, so the shared
    side/slot/id tie-break doesn't apply).
- `ids.ts` — `BiomeId` (+ `createBiomeId`), the same branded-string pattern as `CreatureId`.

New content under `src/data/`:
- `biomes.ts` — the Slice A **placeholder shape** H1–H3's own checklist text refers to as "the
  Slice-A placeholder": 10 fixed slots (`biome-1`…`biome-10`, GAME_DESIGN §4's decade cadence),
  each with empty `speciesPool`/`spellPool`. Not called for verbatim by Slice A's own bullet
  list, but implied by later slices' "replacing that slot's Slice-A placeholder" language — a
  bridging file so H1 has something concrete to edit rather than creating it from scratch.
  `BIOMES_BY_ID` indexes it by id.

New test-only fixtures:
- `src/engine/__fixtures__/biomes.ts` — a two-species fixture biome (`FIXTURE_BIOME`: brawlers
  with a common/rare pair, casters with one wit-affinity creature, a two-spell pool where only
  one spell matches the caster's affinity) plus `FIXTURE_BIOME_SEQUENCE` (10 distinct
  otherwise-empty biomes, for `biomeForFloor`'s sequence tests only).

### Cross-cutting change: `Spell.affinity`

`Spell` gained a required `affinity: Affinity` field. CONVENTIONS already documented
`canEquip(spell, creature) = spell.affinity === creature.affinity` as a foundational rule, but
it was never actually implemented — no prior phase needed per-creature spell gating. Slice A's
cast-role loadout roll is the first real consumer, so the field was added here rather than
deferred. **Purely additive**: the damage affinity cycle stays keyed on the *caster's* affinity
(CONVENTIONS, unchanged), so no golden output changed — confirmed by the full pre-existing
suite passing byte-identical. Updated the 6 existing `Spell` literals: `data/spells.ts`
(`EMBER_LANCE`/`CINDER_NOVA` → violence, `VENOM_BOLT` → instinct — flavor picks, mechanically
inert), `combat.test.ts`, `interpreter.test.ts`, `golden-aoe-cast.fixture.ts`.

**Docs follow-up flagged, not yet actioned**: CONVENTIONS' "Spell affinity & equip-gating"
section reads as pre-existing infrastructure; it should note the predicate is actually
implemented as of Phase 4 Slice A, so a future slice doesn't assume it predates this work.

### Tests

- `leveling.test.ts` — `scaleStatsToLevel` at level 1 (no-op), the GAME_DESIGN §5 worked
  example (base 20 → level 10 = 65), per-stat rounding (13 × 1.25 = 16.25 → 16; 13 × 1.5 =
  19.5 → 20), independent per-stat scaling; `xpForNextLevel` monotonicity + the placeholder
  formula.
- `curves.test.ts` — `enemyLevelRange` table-driven against the placeholder formula (floors 1,
  9, 10, 25, 100) plus a never-inverts sanity check; `fightCount`'s flat-and-deterministic
  contract; `RARITY_DRAW_WEIGHT`'s descending ordering; `ENEMY_PARTY_SIZE`.
- `generation.test.ts` — `canEquip` table-driven; `materializeCreature`'s purity, level-baking,
  id derivation, field copying, HP placeholder, and default/supplied `equippedSpells`;
  `biomeForFloor`'s fixed 1–100 sequence (table-driven across all 10 decades), atlas-pin
  overrides on both branches, the floor-101+ per-floor re-derivation proven **stable regardless
  of call order** (drawing unrelated floors first doesn't perturb a later re-draw of the same
  floor — the concrete test of ASSUMPTION 4's "not an advancing stream" claim), and the
  invariant-violation throw for missing biome data; `generateFloor`'s fight-count/party-size
  shape, real-seed determinism (two independent `createSeededRng(42)` runs deep-equal), level
  bounds, and **two full hand-derived constant-RNG traces** — a `{ next: () => V }` stub makes
  every weighted pick and level roll pure arithmetic instead of a random outcome, so the
  *entire* generated floor (all fights, all slots) becomes predictable and independently
  verifiable by hand (documented inline: `V = 0.3` resolves to the common non-caster at level 1
  everywhere; `V = 0.9` resolves to the caster at level 3, loaded with its one affinity-matched
  spell, everywhere).
- `data/biomes.test.ts` — the 10-slot shape, unique ids, empty-pool validity, `BIOMES_BY_ID`
  indexing.

### Verification performed

- `npm run test` — **253/253** pass across 39 files (+46 over Phase 3.5's 207: exactly the new
  test count in `leveling.test.ts`/`curves.test.ts`/`generation.test.ts`/`biomes.test.ts`). All
  prior goldens pass byte-identical — the `Spell.affinity` addition touches no formula and no
  event shape.
- `npm run lint` / `npm run format:check` / `npm run build` — clean.

### Deliberately out of scope for Slice A (later slices)

Response vocab/on-action hooks/formula extensions (Slice B); targeting/turn-order/status
immunity (C); resource/counter primitives (D); the support-spell model (E); specializations,
perks, starters, the Unicorn (F); the Zustand store and `descend()` (G); real Biome 1–3 content
(H1–H3, which replace `biomes.ts`'s `biome-1`/`biome-2`/`biome-3` placeholder slots and
`generation.ts`'s fixture-shaped species with real `src/data/species/*.ts` content); the
integration pass and this record's closing section (I).

## Next

Slice B — response vocab, on-action hooks & formula extensions. See
`.claude/briefs/phase-4-implementation-plan.md`.
