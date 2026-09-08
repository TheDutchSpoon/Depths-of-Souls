# Phase 4 — Party, specializations, the cave & biomes

Status: **in progress — Slices A–B done** (A: 260/260 tests; B: 298/298 tests; lint/format/build
green throughout). Built per
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
  `enemyPartySize(floor)` (`ENEMY_PARTY_SIZE = 6` as the ceiling it ramps to and clamps at) and
  `RARITY_DRAW_WEIGHT` (new assumption — GAME_DESIGN §13 parks soul-*gain*-per-rarity but never
  pins spawn-*weight*-per-rarity; a descending placeholder, common 6 / uncommon 3 / rare 1).
  **`enemyPartySize` was revised in PR review**: the first draft read the brief's "up to 6 enemy
  slots" as a flat 6 from floor 1; review decided enemy count should scale with depth the same
  way `enemyLevelRange` does (`min(ENEMY_PARTY_SIZE, floor)`, ramping 1→6 and clamping) rather
  than spawning the full slate immediately. Both `curves.ts`/`generation.ts` and the two
  doc-sync files (CONVENTIONS.md, the brief) were updated to match before merge.
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
  - `generateFloor(floor, biome, runRng)` — `fightCount(floor)` fights of `enemyPartySize(floor)`
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

**Docs follow-up — actioned in review**: CONVENTIONS' "Spell affinity & equip-gating" bullet now
notes the predicate is implemented as of Phase 4 Slice A (its first consumer), so a later slice
doesn't assume it predates this work.

### Tests

- `leveling.test.ts` — `scaleStatsToLevel` at level 1 (no-op), the GAME_DESIGN §5 worked
  example (base 20 → level 10 = 65), per-stat rounding (13 × 1.25 = 16.25 → 16; 13 × 1.5 =
  19.5 → 20), independent per-stat scaling; `xpForNextLevel` monotonicity + the placeholder
  formula.
- `curves.test.ts` — `enemyLevelRange` table-driven against the placeholder formula (floors 1,
  9, 10, 25, 100) plus a never-inverts sanity check; `fightCount`'s flat-and-deterministic
  contract; `RARITY_DRAW_WEIGHT`'s descending ordering; `ENEMY_PARTY_SIZE`; `enemyPartySize`
  table-driven (floor 1→1, 3→3, 6→6, 7→6 clamped, 100→6 clamped), a never-exceeds-the-ceiling
  check, and a non-decreasing-with-depth check.
- `generation.test.ts` — `canEquip` table-driven; `materializeCreature`'s purity, level-baking,
  id derivation, field copying, HP placeholder, and default/supplied `equippedSpells`;
  `biomeForFloor`'s fixed 1–100 sequence (table-driven across all 10 decades), atlas-pin
  overrides on both branches, the floor-101+ per-floor re-derivation proven **stable regardless
  of call order** (drawing unrelated floors first doesn't perturb a later re-draw of the same
  floor — the concrete test of ASSUMPTION 4's "not an advancing stream" claim), and the
  invariant-violation throw for missing biome data; `generateFloor`'s fight-count/party-size
  shape (now `enemyPartySize(floor)`, not the flat ceiling), real-seed determinism (two
  independent `createSeededRng(42)` runs deep-equal), level bounds, and **two full hand-derived
  constant-RNG traces at floor 6** (the shallowest floor where `enemyPartySize` reaches the full
  6-slot ceiling, so every slot per fight is still exercised) — a `{ next: () => V }` stub makes
  every weighted pick and level roll pure arithmetic instead of a random outcome, so the *entire*
  generated floor (all fights, all slots) becomes predictable and independently verifiable by
  hand (documented inline: `V = 0.3` resolves to the common non-caster at level 6 everywhere;
  `V = 0.9` resolves to the caster at level 8, loaded with its one affinity-matched spell,
  everywhere).
- `data/biomes.test.ts` — the 10-slot shape, unique ids, empty-pool validity, `BIOMES_BY_ID`
  indexing.

### PR review amendment: `enemyPartySize` replaces the flat `ENEMY_PARTY_SIZE` in `generateFloor`

Reviewed and decided before merge: enemy count should **scale with depth** (`enemyPartySize(floor)
= min(ENEMY_PARTY_SIZE, floor)`, ramping 1→6 and clamping) rather than every fight spawning the
full 6-slot slate starting at floor 1 — the same treatment `enemyLevelRange` already gets.
`ENEMY_PARTY_SIZE` stays exported as the ceiling the curve clamps to; `generateFloor`'s slot loop
now bounds on `enemyPartySize(floor)`. The two hand-derived `generateFloor` constant-RNG traces
moved from floor 1 (which now yields only 1 enemy per fight) to floor 6 (the shallowest floor at
the full ceiling), re-deriving their expected stats at the new level roll (level 6/8 instead of
1/3) so every slot stays exercised. `curves.test.ts` gained the `enemyPartySize` coverage above.
Both doc-sync files were updated in the same pass: CONVENTIONS' "Generation & the run layer"
bullet list gained an `enemyPartySize(floor)` entry, and the brief's module map / Slice A prose /
engine-vocabulary delta table were corrected to match (`curves.ts` was also confirmed correctly
placed under `src/engine/`, not `src/data/` — the brief's module map had listed it under `data/`
by mistake; only the doc needed fixing).

### Verification performed

- `npm run test` — **260/260** pass across 39 files (+53 over Phase 3.5's 207: the
  `leveling.test.ts`/`curves.test.ts`/`generation.test.ts`/`biomes.test.ts` additions, including
  the post-review `enemyPartySize` cases). All prior goldens pass byte-identical — the
  `Spell.affinity` addition touches no formula and no event shape.
- `npm run lint` / `npm run format:check` / `npm run build` — clean.

### Deliberately out of scope for Slice A (later slices)

Response vocab/on-action hooks/formula extensions (Slice B); targeting/turn-order/status
immunity (C); resource/counter primitives (D); the support-spell model (E); specializations,
perks, starters, the Unicorn (F); the Zustand store and `descend()` (G); real Biome 1–3 content
(H1–H3, which replace `biomes.ts`'s `biome-1`/`biome-2`/`biome-3` placeholder slots and
`generation.ts`'s fixture-shaped species with real `src/data/species/*.ts` content); the
integration pass and this record's closing section (I).

## Slice B — Response vocab, on-action hooks & formula extensions

The single largest engine slice per the brief — every row in the vocabulary table tagged `B`.
Built and tested against **fixture** traits/spells only (no `src/data/` content lands here; real
per-species content is H1–H3's job).

### What was built

`src/engine/effect-types.ts`:
- `Hook` grows from 13 to **17**: `on-attack`, `on-cast`, `on-defend`, `on-provoke` (`on-wait`
  omitted, per CONVENTIONS).
- `ResponseTarget` gains `{ kind: 'random-dead-ally' }` (ASSUMPTION 7 — v1 `TargetSelector`s are
  alive-only, so `revive` needs its own dead-pool resolution path).
- `EffectResponse`'s `deal-damage` variant gains `scalingStat?: Stat` (an arbitrary stat read
  directly via `getEffectiveStat`, no remap resolution — mutually exclusive with
  `offStat`/`flatAmount`; **ASSUMPTION 6**: setting more than one throws a resolver-invariant
  error). `suppress-action` gains `scope?: 'all' | 'attack' | 'cast'` (undeclared = `'all'`,
  byte-identical to pre-Slice-B). Two new response kinds: `revive` (`{ target, pct }` — dead-only,
  death-reset baseline + `pct` of that baseline's max HP) and `grant-action-state` (`{ target,
  defending?, provoking? }` — reuses Defend/Provoke's existing flags/math verbatim).
- Two new passive `EffectDef` categories, structurally identical to `stat-modifier`
  (permanent-for-fight, additive across stacked sources, never surfaced as a status):
  `armor-penetration` (`{ percent }`) and `cross-stat` (`{ fromStat, percentPerRank, appliesTo }`).
- A third new passive category, **`action-instance`** (`{ actionKind, powerPercent }`) — the
  action instance-list model's own gather primitive. **Not literally shaped by the brief** (its
  prose specified the resolver mechanism but not an authoring shape); this is the decision that
  fills that gap, now also mirrored in CONVENTIONS' "Action instance-list" bullet for Slice F's
  Echo/Flurry/Brute-starter perks to build against unchanged.

`src/engine/damage.ts`: `calculateDamage` gains `armorPenetrationPercent`/`crossStatBonus`
(both optional, default 0 — `effectiveDefence = defence × (1 − pen)`,
`effectiveOffStat = offStat + crossStatBonus`, the chip floor scales off the same
`effectiveOffStat`). Both provably additive: default 0 reproduces the pre-Slice-B formula exactly.

`src/engine/effects.ts`: `gatherArmorPenetration`, `gatherCrossStatContribution(creature,
actionKind)`, `gatherExtraInstances(creature, actionKind)` — three read-time gatherers, same
scan-and-filter shape as `gatherDealtMods`/`gatherTakenFactors`.

`src/engine/resolution.ts`:
- `dealDamage` (existing, remap-aware Attack/Cast path) now also gathers + applies armor-pen and
  cross-stat from the attacker. New `dealDamageWithScalingStat` (the `scalingStat` response mode)
  and `dealDamageWithOffStat` (an exported entry point taking a pre-resolved `offStat` number —
  `combat.ts`'s Cast executors use this for `Spell.scalingStat`) share a private `dealDamageCore`.
- `executeResponse` grows `revive` (resets `activeEffects` to a fresh
  `instantiateTraitEffects(target, state.traits)` — see the `CombatState.traits` addition below —
  then `currentHp = round(baselineMaxHp × pct)`, emits a new `Revived` event) and
  `grant-action-state` (sets only the requested flag(s) true). `deal-damage`'s three magnitude
  modes (`offStat`/`scalingStat`/`flatAmount`) are checked mutually exclusive up front (ASSUMPTION
  6). `suppress-action`'s returned `suppressed` boolean is now `(scope ?? 'all') === 'all'` — a
  one-line, backward-compatible change.
- `resolveResponseTargets` grows the `random-dead-ally` case (a seeded RNG draw among the firing
  creature's own dead side-members).

`src/engine/combat.ts`:
- **The action instance-list model.** `buildInstanceList(actor, actionKind)` = `[100,
  ...gatherExtraInstances(actor, actionKind)]`, assembled once before any instance resolves.
  `executeAttack`/`executeCastSingle` run this list, each entry a genuine action instance: its own
  intent event (`AttackDeclared`/`SpellCast`), its own `on-attack`/`on-cast` hook firing (before
  that instance's damage), its own `dealDamage` call at `basePower × (powerPercent / 100)`.
  `executeCastAoe` re-freezes its own living-enemies target set **per instance** (no single target
  to preserve). `resolveInstanceTarget` implements **ASSUMPTION 31**: instance 2+ targets the same
  resolved target as instance 1 unless it died, falling back to the normal default-target
  selection. `executeDefend`/`executeProvoke` fire `on-defend`/`on-provoke` once each (always
  single-instance in v1) between their intent event and the state-flag change.
- `createCombat` now stores its `traits` registry on the returned `CombatState` (a new
  `CombatState.traits` field) — needed by `revive`'s death-reset, which must re-instantiate a
  target's `innateTraitIds` **mid-fight**; nothing before this slice needed the registry past
  fight-start. Every test file that builds a bare `CombatState` object literal (not via
  `createCombat`) picked up the new required field.
- `Spell.scalingStat` (`types.ts`, new optional field, `Stat | 'none'`) is resolved by a new
  `resolveSpellOffStat` helper: absent → the pre-Slice-B remap-aware Intelligence lookup
  (byte-identical); an explicit `Stat` → read directly via `getEffectiveStat` (no remap, mirroring
  the response's `scalingStat`); `'none'` → `offStat = 0` (flat/Int-independent — always
  chip-floor-only through the same formula; not exercised by any v1 content, a forward reference
  for Slice E's non-damage payloads).

`src/engine/interpreter.ts`: a new `isActionSuppressed(creature, kind)` — a pure scan of
`creature.activeEffects` for a present `suppress-action` response whose scope covers `kind` —
gates `isRuleActionValid` (Cast/Attack rules) **and** the implicit fallback (an ASSUMPTION not
spelled out by the brief: an Attack-scoped suppression must also block the fallback's
unconditional Attack, or Pacified would be trivially bypassed by an empty/no-matching script).
Stun's existing whole-turn-skip mechanism (the hook-fired `suppressed` flag in `resolveTurn`) is
untouched — the two mechanisms are independent, per CONVENTIONS' now-updated "scoped
suppress-action" bullet.

### Tests

Unit coverage per new primitive: `damage.test.ts` (armor-pen 0%/50%/100%, cross-stat 0/nonzero),
`effects.test.ts` (the three new gatherers), `resolution.test.ts` (scalingStat, the mutual-
exclusivity throw, `grant-action-state`, `revive` — including the no-dead-allies no-op case —
and both suppress-action scope branches), `interpreter.test.ts` (Cast-scoped and Attack-scoped
suppression gating a rule and the implicit fallback), `combat.test.ts` (instance-list composition:
base-only / +extra-instance / +partial-power / both together confirmed linear; per-instance
`on-attack` firing; the three `Spell.scalingStat` branches).

Six new goldens (all hand-derived, independent `node -e` arithmetic in each fixture's header
comment): `golden-on-action-hooks` (all four new hooks across a 4-round scripted fight, driven via
8 explicit `resolveTurn` steps rather than `resolveFight` since the target never dies),
`golden-attack-instance-list` (a `[100, 30]` two-instance Brute-starter-shaped attack, an on-attack
trait proving the hook fires per instance), `golden-revive` (a Unicorn-shaped dead-ally revive
mid-round, no special turn-queue handling — the revived creature still takes its own queued turn
if reached), `golden-armor-penetration`, `golden-cross-stat-contribution`,
`golden-scoped-suppression` (a Silenced-shaped creature's Cast rule is skipped, its Attack rule —
lower in the same script — still fires, no `SpellCast` ever emitted).

**Full Phase 1–3 + Slice A suite re-verified byte-identical**: 298/298 tests pass (up from
Slice A's 260 — 38 new: 6 golden pairs = 12 files, plus unit additions across 5 existing test
files), including every pre-existing golden fixture unmodified. `lint` / `format:check` / `build`
all clean.

### Notable decisions surfaced during implementation (synced to CONVENTIONS.md)

- The `action-instance` `EffectDef` shape (above) — the brief named the mechanism, not its
  authoring shape.
- The scoped-suppress-action two-path split (hook-fired `'all'` vs interpreter-scanned
  `'attack'`/`'cast'`) — the brief said "in interpreter.ts, not resolution.ts" but didn't spell out
  how that coexists with Stun's existing mechanism.
- `CombatState` gains a `traits` registry field (previously consulted only at `createCombat` time,
  now needed mid-fight by `revive`).
- A new `Revived` consequence event (shape not pinned by the brief; follows the existing
  "every consequence gets a matching event" discipline, mirroring `HealApplied`).
- `resolveSpellOffStat`'s `'none'` semantics (`offStat = 0`) — the brief said "flat (Int-
  independent)" without pinning the concrete value; not exercised by any v1 content either way.

### Deliberately out of scope for Slice B (later slices)

Targeting/turn-order/status-immunity primitives (C); resource/counter primitives incl.
`magnitudeSource`/count-scaling/consume-stacks/cheat-death (D); the support-spell model's
`targetSide`/`payload` fields (E — `Spell.scalingStat` landed here in B per the vocabulary table,
but ally-targeting/heal/stat-modifier payloads are E's own work); specializations/perks/starters/
the Unicorn's real content (F — this slice only built and proved the `revive`/`grant-action-state`
*mechanisms* against fixtures); the Zustand store (G); real biome content (H1–H3); integration (I).

## Next

Slice C — targeting, turn-order & status-immunity primitives. See
`.claude/briefs/phase-4-implementation-plan.md`.
