# Phase 4 — Party, specializations, the cave & biomes

Status: **shipped — all eleven slices (A–I, H split H1/H2/H3) complete**, 105 files / 610 tests
green at close, `lint`/`format:check`/`build` all clean (A: 260/260 tests; B: 299/299 tests, post-review-fix;
C: 337/337 tests, post-review-fix; D: 368/368 tests, post-review-amendment; E: 385/385 tests,
post-design-feedback (ally target-selector completion); E2: 424/424 tests (its own phase-record
entry was filled in retroactively during F — see that section); F: 470/470 tests,
post-review-amendment (actionKind scoping, taken-reduction, StatusDef.defaultDuration,
SpeciesCreature.equippedSpells); G: 494/494 tests, post-review-fix (currency banks per kill not
per fight won, a mid-fight-wipe reward-banking regression test, a perk-plumbing regression test,
fail-loud on an unresolved enemy kill); H1: 517/517 tests, real Overgrowth content + one small
engine addition (`all-allies-of-species` ResponseTarget), post-PR-#58-review (Queen/Pollenlord/
Ironjaw/Broodwarden/Grovekeep/Dozer redesigned unique per-amplifier, Drone given a real mechanic,
traits/spells moved to the central `traits.ts`/`spells.ts` registries, the player-facing content
doc gained exact numbers + a spell table, and goldens added for all six redesigned amplifiers +
the new ResponseTarget); data-layer carrier reorg (between H1/H2): `traits.ts`/`spells.ts` split
into `traits/`/`spells/` library directories (`core.ts`/`starters.ts`/`overgrowth.ts` +
`index.ts` barrels), `species/starters.ts`/`species/overgrowth.ts` retrofitted to
composition-only — see `phases/phase-4-data-layer-carrier-reorg.md`; H2: **547/547 tests**,
post-PR-#60-review — real Glimmerdark content, **not** engine-primitive-free after all: the
review pass added `acted-before-target`'s non-scripting completion (E1) and `echo-cast`
(E2, Resonant Overtone — `TriggeredDef.stacks`/`echoCast` + `fireHook`'s new `onEchoCast`
callback, reusing the bonus-cast pattern, no new response verb), corrected Blindclaws' Striker
from a bespoke script to a real trait (deleting `ambush-strike` entirely — action-selection is
the scripting layer's job, never a creature-identity trait), reassigned Sparkeaters' affinities
to match the stat each drains, redesigned Sparkeater Voidmaw (max-HP parasite) and all three
Gloomjaws (three distinct verbs, not one shared mechanic), and added five new goldens + four
engine-level `fireHook` unit tests; lint/format/build green throughout); two interstitial slices
landed between H2 and H3, each with its own phase-record file (not folded into this one):
cumulative spell unlock (`phases/phase-4-cumulative-spell-unlock.md`) and percent-HP condition
ticks (`phases/phase-4-percent-hp-condition-ticks.md`); H3: **594/594 tests**, post-PR-#64-review
— real Rotcap Hollow content, four engine bugs + four content revisions (see that section below);
I: **610/610 tests** (595/595 at the original integration-pass submission, then 610/610 after the
PR #65 review folded boss floors into the same slice — see that section below); no new engine
mechanism at the original submission, `isBossFloor`/`bossLevel`/`BiomeData.boss` added at review.
Built per
the approved plan at `.claude/briefs/phase-4-implementation-plan.md` (kept there for the full
slice sequencing, the engine-vocabulary delta table, and the numbered `ASSUMPTION` checklist —
not duplicated here). Eleven slices originally planned (A–I, H split into H1/H2/H3 per biome),
plus one inserted mid-sequence (E2, "content-surfaced engine primitives round 2" — added after a
post-E design pass, landing between E and F); this record grows one section per slice, in the
same style as `phase-3-traits-statuses-effects.md`.

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

### PR review fix: `revive` left stale `defending`/`provoking` on the revived creature (F1)

Caught in review, fixed before merge. `revive`'s death-reset touched `alive`/`currentHp`/
`activeEffects` but not the action-state flags — a creature that died **while defending**
(Defended on an earlier turn, then killed before its own next turn, which is the only place
these flags normally clear) came back still `defending: true`, silently applying Defend's ×0.65
taken-factor to its next incoming hit (or still `provoking`, still redirecting enemy attacks)
for the rest of the fight. Contradicted the brief's own "no ramp preserved" framing of
death-reset. Fix: `revive`'s `updateCreature` patch now also sets `defending: false, provoking:
false`. Regression test added to `resolution.test.ts`'s revive describe block: a creature revived
from a dead-while-defending state is asserted to take **full** damage (undefended formula) on its
next hit, not the reduced defended amount — proven through the real `dealDamage` path, not just a
raw field check. 299/299 tests green after the fix; `lint`/`format:check`/`build` re-verified.

Also fixed in the same pass (review nit, no behavior change): the `deal-damage` response's
`flatAmount` doc comment overstated enforcement (claimed mutual exclusivity with `spellPower`,
which is never actually checked — only `offStat`/`scalingStat`/`flatAmount` are enforced
exclusive, per ASSUMPTION 6). Comment corrected in `effect-types.ts`.

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

## Slice C — Targeting, turn-order & status-immunity primitives

Built and tested against **fixture** traits/statuses only (no `src/data/` content lands here;
real per-species content — Web, Blindclaws, Confusion, Splashing, etc. — is H1–H3/F's job). Every
row tagged `C` in the brief's engine-vocabulary delta table.

### What was built

`src/engine/effect-types.ts` — six new categories:
- Four new permanent-for-fight passive `EffectDef` categories, structurally identical to
  `armor-penetration`/`cross-stat` (never surfaced as a status, gathered read-time, consulted at
  each mechanism's own site): `status-immunity` (`{ statusId }`, Clear Mind/Aggressive/Lucidity),
  `provoke-immunity` (Tunnel Vision, no params), `splashing` and `annihilate` (Proficient
  Warrior's two halves, no params — **interpretation**: modeled as passives per Slice F's
  ASSUMPTION 21 perk-instantiation mechanism, not as runtime status instances, despite
  CONVENTIONS' "New statuses" list naming Splashing informally there).
- Two new **passively-read** `StatusDef` categories (never hook-fired, unlike
  `condition-status`/`damage-modifier` — read directly at their consumer's call site instead):
  `turn-order-status` (`{ statusId, cap, position: 'first' | 'last' }`, Web/Blindclaws) and
  `friendly-fire-status` (`{ statusId, cap, chancePercent }`, Confusion). Both extend
  `ActiveEffect`/`StatusDef`; `hasStatus`, `applyStatus`'s existing-instance lookup, and
  `combat.ts`'s round-end snapshot/decrement/expire sweep were all extended to recognize the two
  new categories alongside the existing pair, so they apply/refresh/stack/decrement/expire on the
  same schedule as any other status and still satisfy `has-status`.

`src/engine/turn-order.ts` — `buildTurnQueue` rewritten to partition living combatants into an
act-first pole / normal group / act-last pole (each internally Speed-sorted with the existing
tie-break), concatenated first→normal→last — the position-beats-raw-Speed mechanism itself is
golden-tested (`golden-turn-order-status`). **ASSUMPTION 9** (both poles active at once → first
wins) is implemented and unit-tested (`turn-order.test.ts`); no golden exercises that specific
edge case. With no `turn-order-status` effects present, both poles are empty and the output is
byte-identical to the pre-Slice-C single-group sort (confirmed: the full prior suite passes
unmodified). **Web's break-free roll was deliberately NOT built** — see
CONVENTIONS' "turn-order status" bullet for why, and the open item for H1.

`src/engine/scripting-types.ts` / `conditions.ts` — `ActedBeforeTargetCondition` (`{ kind:
'acted-before-target' }`) added to the `Condition` union. `evaluateCondition` gains an optional
4th parameter, `ruleTargeting?: TargetSelector` (the interpreter's own call site now passes
`rule.targeting`; the trigger-condition call site in `resolution.ts`'s `fireHook` passes nothing,
so this condition is always false there — a documented, deliberate limitation, consistent with
the existing self/global-scoped `Condition` note). **ASSUMPTION 11** resolved via a new
`peekTargetSelector` (`target-selectors.ts`): RNG-free for every selector kind except
`random-enemy`, which returns `null` instead of drawing (so a rule targeted at `random-enemy`
never satisfies this condition — the condition's own RNG-purity is preserved without special-
casing the interpreter's lookahead loop).

`src/engine/targeting.ts` — `resolveOffensiveTarget` restructured into the three-step override
pipeline: Confusion (`resolveConfusionRedirect`, a new private helper) → Tunnel Vision
(`hasProvokeImmunity`) → Provoke (`resolveProvoke`, the pre-existing logic, unchanged, extracted
to its own function). **ASSUMPTION 12** (Confusion checked before Provoke) is implemented and
unit-tested (`targeting.test.ts`) — a confused actor's roll can redirect to its own side even
with an enemy provoker active; no dedicated Confusion golden exists (`confusion.test.ts` covers
the AOE wiring end-to-end but as a unit test, not a committed `__golden__` fixture pair). New
exported `shouldRedirectAoeToAllies` (the AOE case, **ASSUMPTION 13**: one roll per
AOE instance, wired into `combat.ts`'s `executeCastAoe`) and `adjacentLivingTargets` (**ASSUMPTION
14**: alive-filtered, slot-ordered neighbors — a dead slot-neighbor is skipped in favor of the
next living one). An unconfused/non-provoke-immune actor draws exactly the same RNG as before
(zero extra draws) — confirmed by the full prior suite passing byte-identical.

`src/engine/combat.ts`:
- `executeCastAoe`'s target-side resolution now runs `shouldRedirectAoeToAllies` once per instance
  before freezing the target list, flipping to the caster's own side on a successful roll.
- New `splashTargetIds(actor, mainTargetId, state)` helper, computed from state as it stood
  **before** the main hit lands (so the main target — possibly about to die — is still present in
  the alive-filtered list `adjacentLivingTargets` indexes into). Wired into `executeAttack` only
  — **attacks-only**, per `brute.md`'s "attacks deal 100% of their damage to enemies adjacent to
  the target" (`executeCastSingle` never calls it; see the review-fix note below): loops the
  (possibly annihilate-upgraded) splash set, recomputing the **same** damage formula (same
  offStat/spellPower as the main hit) against each target's own Defence/affinity/pools
  (**ASSUMPTION 15**), re-checking aliveness per splash target (an earlier splash hit's own
  damage-path cascade — e.g. a fixture Retaliate — could kill a later one). No `TriggerFired`, no
  spell status-application on splash hits.

`src/engine/interpreter.ts` — `isActionSuppressed` now skips a `condition-status` suppression
whose `statusId` the creature is immune to (`hasStatusImmunity`, from `effects.ts`) before
checking scope — a Clear-Mind-immune creature carrying Silenced still reads as `has-status:
silenced` (untouched) but casts freely, per "immunity suppresses the effect, not the
application."

`src/engine/effects.ts` — five new read-time helpers, same scan-and-filter shape as the existing
gatherers: `hasStatusImmunity`, `hasProvokeImmunity`, `hasSplashing`, `hasAnnihilate`,
`activeFriendlyFireStatus` (the last excludes an immune bearer's own friendly-fire-status,
so an immune creature's Confusion roll — including its RNG draw — never happens at all, not
merely its outcome). `hasStatus` extended to also match `turn-order-status`/`friendly-fire-status`.

### Tests

337/337 (up from Slice B's 299 — 38 new, post-review-fix). Unit coverage per new primitive across
`effects.test.ts` (the five new checks), `turn-order.test.ts` (position beats raw Speed; both-
poles-at-once resolves first; multiple same-pole members still Speed-sort within their pole),
`conditions.test.ts` (acted-before-target: earlier/later in queue, no-targeting, `random-enemy`
never draws RNG, unresolvable selector), `interpreter.test.ts` (status-immunity vs scoped
suppression: casts freely while immune, still `has-status`, still suppressed without the
matching immunity), `targeting.test.ts` (the full override pipeline: Tunnel Vision, Confusion at
100%/0% chance, Confusion-before-Provoke, a Lucidity-immune actor drawing zero Confusion RNG
while Provoke still applies, a Tunnel-Vision-*and*-confused actor still redirecting via Confusion
— the review-fix regression test, `shouldRedirectAoeToAllies`, `adjacentLivingTargets` incl. the
dead-slot-neighbor-skip case).

Two focused unit-test files exercising full event logs inline (hand-derived arithmetic in
comments, fixture-scoped traits only, but NOT committed `__golden__` fixture pairs):
`splashing.test.ts` (a 3-enemy lineup, Splashing's main hit + two distinctly-recomputed splash
hits proving no-copy; a lone-enemy no-splash case; a 4-enemy Annihilate case hitting all three
others despite non-adjacency; a Cast-produces-no-splash case — the review-fix regression test)
and `confusion.test.ts` (end-to-end `executeCastAoe` wiring proof: a confused caster's AOE
redirects entirely to its own side; an unconfused caster is unaffected).

Two committed `__golden__` full-event-log fixture pairs (hand-derived arithmetic, fixture-scoped
traits/statuses only, added in the post-review pass per design feedback):
`golden-turn-order-status` (an act-first enemy and an act-last player creature reordering around
a Speed-sorted two-member "normal" pole spanning both sides — 4 explicit `resolveTurn` steps,
full round-1 log asserted, including the two on-fight-start `apply-status` firings that plant the
positions) and `golden-splashing` (the 3-enemy-lineup Attack + two-splash-hit scenario, full
event log asserted end-to-end through `createCombat`/`resolveTurn`, not just the isolated unit
assertions `splashing.test.ts` already covered).

Full Phase 1–3 + Slice A/B suite re-verified byte-identical (all pre-existing goldens pass
unmodified) — confirmed the turn-order/targeting-override restructures are additive no-ops absent
the new effect categories. `lint` / `format:check` / `build` all clean.

### PR review fixes (design feedback, actioned before merge)

Three items, caught in design review against a corrected `CONVENTIONS.md` (delivered alongside
the feedback — the brief's own vocabulary table still read the pre-correction shapes and was
explicitly *not* the thing to code against):

1. **Tunnel Vision was bypassing Confusion, not just Provoke.** `resolveOffensiveTarget`'s
   original ordering (`hasProvokeImmunity` check first, short-circuiting straight to
   `resolveNormally`) skipped the Confusion step entirely for a provoke-immune actor — but
   `brute.md` defines Tunnel Vision as bypassing *only* Provoke's redirect. Fixed by reordering to
   Confusion first, then gating the Provoke step (not the whole pipeline) on
   `hasProvokeImmunity`: a confused, provoke-immune actor now still rolls and redirects via
   Confusion. Byte-identical for every non-confused actor (confirmed: full suite unchanged).
   Regression test added: a creature carrying both `provoke-immunity` and a 100%
   `friendly-fire-status` redirects to its own side on a single-target action (parity with the
   pre-existing AOE-side assertion).
2. **Splashing was firing on Cast, not just Attack.** `brute.md` defines Splashing as an
   attacks-only mechanic ("attacks deal 100% of their damage to enemies adjacent to the target"),
   but the original `executeCastSingle` also ran the splash loop. Removed `splashTargetIds` and
   the splash loop from `executeCastSingle` entirely; `executeAttack` is unchanged.
   `SplashingDef`'s doc comment corrected ("single-target Attack/Cast" → "single-target Attack").
   Annihilate rides on Splashing, so no separate fix was needed there. Regression test added: a
   Splashing creature's single-target Cast produces exactly one `DamageDealt` (the main hit), no
   splash.
3. **Golden coverage gap.** The slice had only focused unit tests for the two largest new
   mechanisms (turn-order status, Splashing) — no committed full-event-log golden, unlike every
   other Slice B/C mechanism. Added `golden-turn-order-status` and `golden-splashing` (above).

`npm run test` — 337/337 across 49 files (up from the pre-fix pass's 333/47 — 4 new tests: the two
regression tests above plus the two new golden files). `lint` / `format:check` / `build`
re-verified clean after the fix.

### Notable decisions surfaced during implementation (synced to CONVENTIONS.md)

- The exact category names/shapes for all six new effect primitives (the brief named mechanisms,
  not authoring shapes, matching the pattern from Slice B's `action-instance`).
- Splashing/Annihilate modeled as permanent passive `EffectDef`s, not runtime status instances —
  reasoned from Slice F's own ASSUMPTION 21 (perks are player-level `EffectDef`s, instantiated the
  same way innate traits are), since CONVENTIONS' "New statuses" list names Splashing informally
  there and could be read either way.
- Turn-order-status/friendly-fire-status as a **third read pattern** for `StatusDef`: passively
  read at a dedicated consumer site (`buildTurnQueue`, the targeting pipeline), neither hook-fired
  like `condition-status` nor pool-read-everywhere like `damage-modifier`.
- **Web's break-free roll is explicitly deferred, not built** — the brief's own ASSUMPTION 10
  offered two competing shapes and flagged it for review; building either prematurely risked a 9th
  response kind or a speculative field ahead of H1's real content. **Needs a decision before H1's
  kickoff.**
- `acted-before-target`'s RNG-free `peekTargetSelector` (returns `null`, never draws, for
  `random-enemy`) as the concrete resolution of ASSUMPTION 11's "resolved first, no RNG" framing.

### Deliberately out of scope for Slice C (later slices)

Resource/counter primitives incl. `magnitudeSource`/count-scaling/consume-stacks/cheat-death (D);
the support-spell model (E); specializations/perks/starters/the Unicorn's real content incl.
Splashing/Annihilate/Tunnel Vision's actual perk-tree wiring (F); the Zustand store (G); real
biome content incl. Web/Blindclaws/Confusion's actual status definitions (H1–H3 — **H1 needs the
break-free decision above before authoring Web**); integration (I).

## Slice D — Resource & counter primitives

Built and tested against **fixture** traits/statuses only (no `src/data/` content lands here;
the real Bulwark/Detonator/Last Stand content is Slice F/H1–H2's job — every fixture below is
explicitly labeled "-shaped," not the real data). Every row tagged `D` in the brief's
engine-vocabulary delta table.

### What was built

`src/engine/types.ts`:
- `Creature.defendCount: number` (ASSUMPTION 17) — cumulative for the whole fight, incremented in
  `combat.ts`'s `executeDefend`, never reset. A required field (like `innateTraitIds`/
  `activeEffects` in Phase 3): every raw `Creature` literal across the codebase needed updating
  (`__fixtures__/creatures.ts`'s `makeCreature`, `generation.ts`'s `materializeCreature`,
  `effective-stats.test.ts`'s one bare literal, and all 10 literals in `app/demoFight.ts`).
- `Creature.speciesId?: string` — **own ASSUMPTION, not pinned by the brief**: the
  `living-allies-of-species` count kind needs a static species reference, but no engine
  `Creature` field carried one (species is currently only a `generation.ts`-internal grouping
  concept, never threaded onto the materialized runtime `Creature`). Added as an **optional**
  field (zero migration) and deliberately **left unwired** in `generation.ts` — no Slice D
  golden needs real species data, so threading a real `speciesId` through `materializeCreature`
  is left for whichever slice first authors real species content (H1). Until then,
  `living-allies-of-species` is inert (always 0), which is correct dormant behavior.

`src/engine/effect-types.ts`:
- `CountOf` (the six live "board counts": `living-allies`, `living-allies-of-affinity`,
  `living-allies-of-species`, `enemies-with-status`, `dead-allies`, `self-defend-count`) and
  `MagnitudeSource` (`{ kind: 'flat', value }` | `{ kind: 'count', of, statusId? }` |
  `{ kind: 'consumed-stacks' }`). **Interpretation, not literally shaped by the brief**: a
  `magnitudeSource`, where wired, REPLACES the repetition count a host field's own authored rate
  is already multiplied/exponentiated by (`stacks` in every existing formula), rather than
  replacing the rate/flat-number field itself — this keeps every existing formula *shape*
  unchanged and every Phase 1–3 call site byte-identical when absent (ASSUMPTION 16), while
  letting the substituted count be a live board reading instead of an applied-status's own
  bookkeeping.
- `DamageModifierDef` gains `magnitudeSource?: MagnitudeSource` (Bulwark-shaped): when present,
  `magnitude ** liveCount` ('taken') / `magnitude * liveCount` ('dealt') replaces
  `magnitude ** stacks` / `magnitude * stacks` — the live count stands in for `stacks`, letting a
  status applied ONCE (e.g. at fight-start) keep scaling off live state instead of needing
  repeated re-application.
- The `deal-damage` `EffectResponse` gains `magnitudeSource?: MagnitudeSource`: in flat mode it
  replaces the `stacks` multiplier on `flatAmount`; in offStat/scalingStat (formula) mode it's a
  multiplier on `spellPower` (absent = ×1, a no-op) — the Detonator-shaped
  `magnitudeSource: { kind: 'consumed-stacks' }` scales a burst's spellPower by the just-consumed
  stack count.
- New response kind (+1, → **eight**, "hold the line" per CONVENTIONS):
  `{ kind: 'consume-stacks', statusId, effect: EffectResponse }` — SELF-scoped (no `target` field,
  unlike every other response), reads and clears the firing creature's own `statusId` stacks
  (ASSUMPTION 18: emits `StatusExpired`, not a mere decrement), then executes the wrapped
  `effect` with `{ kind: 'consumed-stacks' }` available to it. 0/absent stacks is a **full no-op**
  (CONVENTIONS: "no status present" and "0 stacks" are the same state) — the wrapped effect never
  fires at all in that case, not fired-with-magnitude-0.
- New passive `EffectDef` category, structurally identical to `ArmorPenetrationDef`/
  `ProvokeImmunityDef` (never a status, gathered read-time, additive across sources): `cheat-death`
  (`{ chancePercent }`, Last Stand).
- **`StatModifierDef` deliberately does NOT gain `magnitudeSource` in this slice** — flagged
  explicitly for review (own inline comment). CONVENTIONS names stat-modifier as an eligible host
  too (Swarmhive Striker), but `getEffectiveStat(creature, stat)` is a pure, state-free function
  called from ~15+ sites across the codebase (`conditions.ts`, `turn-order.ts`,
  `target-selectors.ts`, …), several with no `CombatState` in scope at all — giving it access to
  live board counts would be an invasive signature change to the whole damage-formula/scripting
  pipeline, and no Slice D golden needs a count-scaled *stat*. Deferred to whichever slice first
  authors Swarmhive Striker for real (H1), per this project's "stop and amend the relevant
  earlier slice" discipline.

`src/engine/effects.ts`:
- `resolveCount(bearer, of, state, statusId?)` — the six count readers, all relative to `bearer`'s
  own side/affinity/species, recomputed fresh on every call (never cached). `living-allies`/
  `-of-affinity`/`-of-species` **include** `bearer` itself while alive (matching `targeting.ts`'s
  `livingAlliesOf` convention). `enemies-with-status` throws without a `statusId` (mirrors
  `applyStatus`'s unknown-statusId invariant).
- `resolveMagnitudeCount(bearer, state, source, consumedStacks?)` — resolves a `MagnitudeSource`;
  `'consumed-stacks'` throws if resolved outside a consume-stacks response's own wrapped-effect
  call (no meaning read cold).
- `gatherCheatDeathChance(creature)` — summed `chancePercent` across active `cheat-death`
  passives, additive, clamped to `[0, 100]` (the percent-scale mirror of
  `gatherArmorPenetration`'s `[0, 1]` clamp).
- `gatherDealtMods`/`gatherTakenFactors` **now take `state: CombatState`** (a breaking signature
  change, contained to their two call sites — both already had `state` in scope — plus two test
  call sites in `effects.test.ts`) so a `magnitudeSource`-bearing damage-modifier can resolve a
  live count at read time.

`src/engine/resolution.ts`:
- `HookContext` gains `consumedStacks?: number`, populated ONLY by the new `consume-stacks` case
  before it recurses into `executeResponse` for the wrapped effect — a continuation of the SAME
  trigger firing (no new `TriggerFired`, no extra cascade-depth increment/self-re-entry-guard
  bookkeeping; the outer trigger's own instance already holds that).
- `executeResponse`'s `deal-damage` case resolves `magnitudeSource` once (bearer = the firing
  creature, via `getCreature(state, context.self)`) before the per-target loop, then uses it in
  place of `stacks` (flat mode) or as a `spellPower` multiplier (formula mode) — both provably
  byte-identical when absent.
- `applyDamageAndEmit` gains the cheat-death interception point: at the instant a hit would
  reduce a living target to 0 HP, one seeded RNG roll (drawn ONLY when
  `gatherCheatDeathChance(target) > 0` — an ordinary creature never touches `state.rng` here,
  mirroring `targeting.ts`'s Confusion "draws nothing when inactive" discipline); on success
  `currentHp = 1` exactly (ASSUMPTION 19) and `died` flips to `false`, so the rest of the function
  proceeds through the ordinary non-lethal path unchanged (`DamageDealt.finalDamage` is left
  UNCHANGED — only `remainingHp` reflects 1, matching the existing overkill precedent where
  `finalDamage` already isn't guaranteed to equal the actual HP removed).

`src/engine/creature-lookup.ts`: `updateCreature`'s patch type grows `'defendCount'`.

`src/engine/combat.ts`: `executeDefend` increments `defendCount` (read fresh from post-hook
state, matching the existing `freshActor` re-fetch discipline) alongside setting `defending: true`.

### Tests

368/368 (up from Slice C's 337 — 31 new, incl. the PR #47 review amendment below). Unit coverage
in `effects.test.ts` (all six `CountOf` variants incl. the species-unset-is-0 default and the
enemies-with-status invariant throw, the never-cached/live-recompute case, all three
`MagnitudeSource` kinds incl. the consumed-stacks-outside-context throw, `gatherCheatDeathChance`'s
sum/clamp, a `gatherTakenFactors` case proving a `magnitudeSource` genuinely overrides `stacks`,
and the four `accumulation` cases below) and `resolution.test.ts` (`consume-stacks`'s
read-clear-execute path and its 0-stacks no-op; cheat-death via a directly-stubbed `rng.next()`
covering the success/fail/never-drawn-when-inactive branches).

Four hand-derived (`node -e` calculator) golden pairs, all fixture-scoped:
`golden-defend-count` (pins `accumulation: 'multiplicative'`, the default: a `damage-modifier`
applied ONCE at fight-start whose `magnitude ** liveDefendCount` shrinks the taken factor
round-over-round as the bearer keeps Defending, never clamping, ending in the bearer's death on
round 2 once combined with the ordinary Defend factor); `golden-defend-count-additive-cap` (PR #47
amendment, real Bulwark-shaped — see below); `golden-consume-stacks` (Detonator-shaped: 3
pre-seeded Glow stacks consumed by the very first Attack's `on-attack` hook, bursting
Intelligence-scaled damage BEFORE the attack's own base hit, proving Glow is gone — its own
dealt-mod never contributes to either hit); `golden-cheat-death` (Last Stand-shaped, two rigged
seeds against IDENTICAL parties: SEED 7's first draw succeeds — survives at exactly 1 HP, no
`CreatureDied`, then wins by counter-killing the attacker on its own turn; SEED 1's first draw
fails — dies normally, one hit one round).

Full Phase 1–3 + Slice A–C suite re-verified byte-identical (all pre-existing goldens pass
unmodified) — the `gatherDealtMods`/`gatherTakenFactors` signature change and the
`applyDamageAndEmit`/`deal-damage` magnitudeSource additions are provably additive no-ops absent
the new fields. `lint` / `format:check` / `build` all clean.

### PR #47 review amendment: additive-with-cap accumulation for taken-direction damage-modifiers

Reviewed against the docs on `main` (not the PR's own claims) by a design-review agent, then
actioned before merge. **Correction to this slice's initial submission**: the "notable decision"
below claiming a purely multiplicative `magnitude ** count` makes Bulwark's "cap 80%" legible as
ordinary uncapped exponential decay was **wrong** — `0.95 ** 32 ≈ 0.19` (an 81% reduction) sails
past the cap and keeps climbing toward 100% as `count` grows; the original `golden-defend-count`
fixture only reached ~10% reduction over its two rounds, so the divergence from the real spec
never showed up against green gates. Decided with the design owner and synced to CONVENTIONS'
"Taken-reduction accumulation" bullet: **additive within a source, multiplicative across
sources** — Bulwark's own reduction is `Σ(per-Defend reduction)`, hard-clamped at a per-source
cap, and that single collapsed factor then enters the existing multiplicative `Π(takenFactors)`
pool alongside every other active source (which stay `magnitude ** count`, unchanged).

- `DamageModifierDef` (`effect-types.ts`) gains two fields (ASSUMPTION — ITS field shape, not
  pinned by the design owner, who left it to be proposed): `accumulation?: 'multiplicative' |
  'additive'` (absent/`'multiplicative'` = byte-identical to every pre-amendment read) and
  `reductionCap?: number` (meaningful only for `'additive'`; **distinct from the existing `cap`**,
  which bounds `applyStatus`'s STACK-COUNT re-application ceiling, an unrelated axis a
  `magnitudeSource`-driven source doesn't use). `magnitude` keeps the SAME per-unit-factor meaning
  in both modes (0.95 = "this source's own single-unit factor is ×0.95") — only the combination
  rule differs; `'additive'` derives the per-unit REDUCTION as `(1 - magnitude)`, sums it × the
  live count, and clamps: `factor = 1 - min((1 - magnitude) × count, reductionCap)`.
- `effects.ts`'s new `takenFactorFor(bearer, state, e)` replaces the direct `magnitude **
  damageModifierCount(...)` call inside `gatherTakenFactors` — branches on `accumulation`,
  `gatherDealtMods` untouched (the dealt pool is already additive-across-sources by construction,
  so this axis is taken-only, per the design owner's framing).
- Also fixed the flagged minor nit: `executeResponse`'s `deal-damage` case previously called
  `resolveMagnitudeCount` twice (once each for `flatCount`/`formulaMultiplier`) with identical
  arguments; collapsed to one `count` computed once, feeding whichever mode's branch actually
  reads it.
- **New golden**: `golden-defend-count-additive-cap` — real Bulwark-shaped (magnitude 0.95,
  `reductionCap: 0.8`, matching `specializations/shieldbarer.md`'s "-5% per Defend, cap 80%"
  exactly, unchanged by this decision). `Creature.defendCount` is PRESET to 15 via the fixture
  (standing in for 15 earlier rounds, keeping the fixture small per CONVENTIONS' testing
  discipline) so two more real in-fight Defends reach `count 16` (exactly the cap:
  `0.05 × 16 = 0.8`) then `count 17` (one past it) — both rounds land the IDENTICAL final damage
  (3), proving the clamp actually HOLDS rather than merely being asymptotically close.
  `golden-defend-count` (unchanged data, `accumulation: 'multiplicative'` now stated explicitly)
  is kept as the companion pin for the default mode, per the design owner's "keep a multiplicative
  fixture too" instruction.
- The top-of-file Status summary's Slice C test count reads **337/337** (matching the Slice C
  section's own post-fix number and the B→C→D chain: 299 → 337 → 368, i.e. 337 + 31 = 368). An
  earlier pass in this same PR reverted that header number back to the stale pre-fix 333, worried
  the correction was an improper edit to an otherwise-immutable outcome archive; on a second look,
  333 was simply residue from Slice C's own PR never updating its header to match its body's
  post-review-fix count, and leaving it stale made the record internally inconsistent (the header
  and body disagreeing on Slice C's own final count). Corrected to 337 here, done once, in this
  same PR.

`npm run test` — **368/368** across 55 files (up from the pre-amendment pass's 363/53 — 5 new: 4
unit tests in `effects.test.ts`'s new `accumulation: 'additive'` describe block, plus the one new
golden). `lint` / `format:check` / `build` re-verified clean after the amendment.

### Notable decisions surfaced during implementation (flag for review before Slice E)

- **`magnitudeSource` substitutes for a host's repetition count (`stacks`), not for its rate/flat
  number.** The brief's own wording ("overrides the flat number... computed at read-time
  instead") reads ambiguously between the two; a literal full-value substitution would break
  every existing per-stack formula shape (e.g. `magnitude ** stacks` becoming
  `magnitude ** magnitude` doesn't compose). **Approved as-is in the PR #47 review** — this part
  of the original submission was correct and needed no change.
- **Taken-reduction accumulation is a SEPARATE, orthogonal axis from count-source semantics** (PR
  #47 review amendment, above) — `magnitudeSource` says WHAT the count is; `accumulation` says HOW
  repeated per-unit contributions from that count combine. The original submission's claim that
  multiplicative decay alone made Bulwark's cap legible was wrong and is corrected above.
- **`StatModifierDef` does not get `magnitudeSource` in this slice** (see effect-types.ts's own
  flagged comment above) — Swarmhive Striker (H1) will need `getEffectiveStat` to gain
  `CombatState` access somehow; that design decision is deliberately deferred, not made here.
  **Approved as-is in the PR #47 review.**
- **`Creature.speciesId?: string`** is a new field this slice introduces unprompted (not named by
  the brief) to make `living-allies-of-species` implementable at all. Left unwired in
  `generation.ts` — H1 needs to thread a real value through `materializeCreature` before Swarmhive
  content can use it. **H1 hand-off note from the PR #47 review**: if Swarmhive Striker is
  authored as a `+Attack` STAT buff, H1 must also land the deferred `StatModifierDef`
  `magnitudeSource` host above (both bundled together); if it's a `dealt` `+%dmg`-per-hive-mate
  damage-modifier instead, no further engine change is needed — already fully supported today.
- **`consume-stacks` is SELF-scoped with no `target` field** — every other response names its
  target explicitly; this one always reads/clears the firing creature's OWN stacks, matching the
  self-scoped trigger-condition convention rather than introducing a `ResponseTarget` for "the
  stack-holder." **Approved as-is in the PR #47 review.**
- **Cheat-death's `DamageDealtEvent.finalDamage` is left unchanged, only `remainingHp` moves to
  1** — the brief only pins `remainingHp`; leaving `finalDamage` as the hit's own computed power
  (rather than deriving a "HP actually removed" value) matches the existing, already-accepted
  overkill precedent where the two fields can diverge. **Approved as-is in the PR #47 review.**

### Deliberately out of scope for Slice D (later slices)

The support-spell model (E); specializations/perks/starters/the Unicorn's real content incl. the
real Bulwark/Swarmhive/Detonator/Last Stand data (F/H1–H2, though Bulwark's own numbers are now
directly expressible — see the amendment above) and `StatModifierDef`'s deferred `magnitudeSource`
host (H1, bundled with a real `speciesId` iff Swarmhive is stat-shaped — see the H1 hand-off note
above); the Zustand store (G); real biome content (H1–H3); integration (I).

## Slice E — Support-spell model

Built and tested against **fixture** spells/scripts only (no `src/data/` content lands here; the
real ~50-spell per-affinity seed set, including its heal/buff entries, is H1–H3's job — this slice
only builds and proves the mechanism, per the brief's own "Data" bullet). Every row tagged `E` in
the brief's engine-vocabulary delta table.

### What was built

`src/engine/types.ts`: `Spell` gains three optional fields, all absent-by-default and therefore
byte-identical for every existing spell (`EMBER_LANCE`/`CINDER_NOVA`/`VENOM_BOLT` — confirmed by
the full pre-existing suite passing unmodified):
- `targetSide?: 'enemy' | 'ally'` (default `'enemy'`).
- `payload?: 'damage' | 'heal' | 'stat-modifier'` (default `'damage'`).
- `statModifier?: { stat: Stat; factor: number }` — required (a resolver-invariant throw
  otherwise) iff `payload === 'stat-modifier'`. **ASSUMPTION (own, not literally shaped by the
  brief)**: a stat-modifier payload's magnitude is this authored flat `{stat, factor}` pair, NOT
  derived from `scalingStat`/`spellPower` the way damage/heal are — a permanent-for-fight buff's
  strength is an authored constant (GAME_DESIGN §5's "stat-buff... permanent stat-modifiers"), not
  a scaled hit. A direct consequence: instance-list `powerPercent` scaling (Slice B) does not apply
  to it either — an "additional cast instance" would reapply the SAME full-strength modifier again
  (uncapped/additive-across-sources by design, CONVENTIONS' Unified effect framework §1), not a
  partial-power one.

`src/engine/resolution.ts`: `applyHeal` and `applyStatModifier` (both pre-existing, private,
Regen/triggered-stat-modifier internals) are now `export`ed — a heal/stat-modifier-payload Cast
(`combat.ts`) calls them directly, the same "reuse the response's execution path, not through a
trigger" shape the brief specifies (Cast is the trigger context here, a chosen action; neither
call emits `TriggerFired`). No other change to either function.

`src/engine/combat.ts`:
- New `applyCastPayload(actor, spell, targetId, powerPercent, ...)` — the payload router shared by
  both Cast executors: `'damage'` (default) is the pre-Slice-E `dealDamageWithOffStat` call,
  unchanged; `'heal'` calls `applyHeal` with the SAME `resolveSpellOffStat`-derived magnitude a
  damage spell would compute, just applied as HP restored (so it inherits the existing
  scalingStat/spellPower/`'none'` semantics for free); `'stat-modifier'` calls `applyStatModifier`
  with the spell's own `statModifier` field (throws if absent, mirroring `deal-damage`'s
  mutual-exclusivity invariant style) and `spell.id` as `sourceTraitId` (for
  effect-instance-id/debugging legibility, matching a trait's own id in that role elsewhere).
- `resolveInstanceTarget` gains a `targetSide` parameter (default `'enemy'`, so `executeAttack`'s
  own call site — v1 has no ally-targeting Attack — is untouched): the post-death instance-list
  fallback (ASSUMPTION 31, Slice B) now draws its default target from the ACTOR'S OWN side for an
  ally-targeting Cast instance, mirroring `resolveOffensiveTarget`'s enemy-only contract simply not
  applying to ally casts.
- `executeCastSingle` reads `spell.targetSide` once and threads it into `resolveInstanceTarget`;
  its per-instance body now calls `applyCastPayload` instead of a hardcoded `dealDamageWithOffStat`
  call. `executeCastAoe` branches its per-instance target-party resolution on `targetSide`: `'ally'`
  freezes the caster's own living side UNCONDITIONALLY (no Confusion roll at all — see the
  ASSUMPTION below), `'enemy'` keeps the exact pre-Slice-E Confusion-then-opposing-side logic
  unchanged; both freeze via the same `filter(alive).map(id)` pattern as before (unified into a
  `resolvedParty` local rather than duplicating the freeze line).

`src/engine/scripting-types.ts` / `src/engine/target-selectors.ts` — **the v1 ally target-selector
set, completed (design-feedback addition, folded into this same slice)**. The support-spell model
lets a spell/trait-response target the ally side, but v1 only shipped two ally picks (`self`,
`lowest-hp-ally`) against the enemy side's full five — not enough to actually choose WHICH ally a
buff/heal lands on. Added the one-for-one mirror of the four non-trivial enemy selectors:
`highest-hp-ally`, `highest-attack-ally`, `highest-intelligence-ally`, `random-ally` (11-member
`TargetSelector` union total). All four reuse the EXACT enemy-mirror machinery over
`livingAlliesOf(...)` instead of `livingEnemiesOf(...)` — same `pickExtremum`/shared tie-break for
the three extremums, same seeded-RNG-draw shape for `random-ally`. Implemented in all three
consumer functions: `targetSelectorHasCandidate` (unconditionally true — "ally" always includes
the acting creature, so it's alive by construction), `resolveTargetSelector` (the real resolution),
and `peekTargetSelector` (Slice C's acted-before-target lookahead: the three extremum ally
selectors resolve normally, `random-ally` returns `null` without drawing, exactly like
`random-enemy` — interpreter lookahead must never consume RNG). Each function's `never`-typed
`default` case meant `tsc` pointed at every site needing the four new kinds; no other switch over
`TargetSelector` exists in the engine, so no other file needed a change. **No side-mismatch guard
was added** — a template pairing an enemy selector with an ally-targeting spell (or vice versa)
resolves the selector literally, the same already-tolerated behavior the enemy side has always had
(e.g. a `self` selector on an offensive spell hits self); the Phase 6 authoring UI is the intended
fence (GAME_DESIGN §8), and with the ally set now complete a correctly-authored support spell
always has an on-side selector to use. **The interpreter needed no change at all** — its
ally-cast branch (above) already resolves through `resolveTargetSelector`, so the four new
selectors work through it as-is; support-spells.test.ts's own end-to-end test proves this (below).
Support-specific selectors with no enemy mirror (e.g. `highest-defence-ally` for tank-buffs) are
deliberately **out of scope** — deferred to whichever slice first authors real buff spells that
actually need one (H1–H3/F), so the set follows real content rather than a guess.

`src/engine/interpreter.ts`: `resolveRuleAction`'s single-target Cast branch now checks
`spell.targetSide` before resolving: `'ally'` calls `resolveTargetSelector` directly; `'enemy'`
(default) keeps the pre-Slice-E `resolveOffensiveTarget(...)` wrapping, unchanged. `actionNeedsTargeting`/`isRuleValid`/`targetSelectorHasCandidate` are untouched — a single-target
Cast (either side) already needed a `rule.targeting` selector before this slice, and v1's existing
selector set already partitions by pool via its OWN kind (`self`/`lowest-hp-ally` → ally pool,
the rest → enemy pool via `livingAlliesOf`/`livingEnemiesOf`) — no new `TargetSelector` variant was
needed for this slice's own fixture/golden content.

**ASSUMPTION (own, ASSUMPTION-tagged for review — the one genuine judgment call in this slice)**:
the brief's own text only names Provoke ("Provoke's targeting override does not apply" — a direct
quote from GAME_DESIGN §7) as exempt for ally-targeting actions. This slice bundles Confusion into
the SAME exemption — an ally cast never even reaches `resolveOffensiveTarget` (single-target) or
`shouldRedirectAoeToAllies` (AOE), so neither Provoke NOR Confusion is consulted, and — load-bearing
for RNG-purity — **no RNG is drawn at all** for an ally-targeting cast's targeting step, confirmed
by a dedicated unit test wrapping `state.rng` in a call-counter (`support-spells.test.ts`).
Reasoning: CONVENTIONS' own Confusion description scopes its roll to a bearer's "harmful action, "
and a support cast on one's own side is definitionally never one — bundling both exemptions under
one "this isn't an enemy-targeting offensive action" gate is simpler than special-casing Confusion
to still roll (redirecting an already-ally cast to... the same ally side) for no player-visible
effect. Flagged for explicit sign-off since GAME_DESIGN's own §7 text only literally names Provoke.

### Data (fixture-only, per the brief)

No `src/data/` content lands in this slice. Test-only fixtures: `HEAL_SPELL`/
`HEAL_LOWEST_ALLY_SCRIPT` (`golden-heal-cast.fixture.ts` — a fixture-authored ally-selector script,
since no stock script targets allies) and `BUFF_SPELL` (`golden-buff-cast.fixture.ts`), plus two
inline fixture spells in `support-spells.test.ts`.

### Tests

385/385 (up from Slice D's 368 — 17 new: 4 from the support-spell model's own work below, 13 from
the ally target-selector completion). `support-spells.test.ts` —
targeted unit coverage for the two mechanisms the brief's Tests bullet calls out beyond the
goldens: an ally-targeting single Cast resolves via the ally pool and ignores an active enemy
Provoke entirely (a regression-proving setup: an unbypassed `resolveOffensiveTarget` would have
the provoking foe hijack the target to ITSELF); an ally-targeting AOE Cast freezes the caster's own
living side and draws **zero** RNG even at a rigged 100%-chance Confusion (the call-counter-wrapped
`rng` proves the roll is never consulted, not merely that its outcome wouldn't have mattered).

Two hand-derived (`node -e` calculator) golden pairs, both fixture-scoped:
`golden-heal-cast` (ENEMY→WOUNDED damage first via ordinary combat, establishing a real
below-max-HP ally state without patching `currentHp` post-`createCombat`; HEALER's
`lowest-hp-ally`-scripted Cast then heals WOUNDED, landing exactly at its effective max HP — the
"no overheal" clamp rule falls out naturally rather than needing a separate synthetic case; WOUNDED
then kills the enemy on its own turn to close the fight) and `golden-buff-cast` (an ally-targeting
AOE `stat-modifier` Cast emits `StatModifierApplied` for BOTH living allies in slot order — the
caster itself included, per "ally" always including the acting creature — before ALLY closes the
fight with an ordinary Attack).

**Ally target-selector completion — its own 13 new tests**, all in `target-selectors.test.ts`
except the last: `ALL_SELECTORS`'s existing parameterized candidacy/resolution table grew from 7
to 11 entries (+4 free cases); `highest-hp-ally` tie-broken resolution; `highest-attack-ally`/
`highest-intelligence-ally` compared via `getEffectiveStat` (mirroring the enemy pair's own test);
a dedicated case proving `highest-attack-ally` reads EFFECTIVE Attack (a lower-base ally carrying a
×3 stat-modifier still wins over a higher-base unbuffed one); the shared tie-break on an exact
stat tie, ally-side; `random-ally` resolving to a pool member and advancing `state.rng` by exactly
one draw (mirroring `random-enemy`'s own test); `targetSelectorHasCandidate` never advancing
`state.rng` for `random-ally`; `peekTargetSelector` resolving the three extremum ally selectors
normally; `peekTargetSelector` never drawing RNG for `random-ally`, returning `null`. Plus one
end-to-end test in `support-spells.test.ts`: an ally-targeting single-target stat-modifier Cast
scripted with `highest-attack-ally` (three player creatures of differing Attack) lands its
`StatModifierApplied` on the correct (highest-Attack) ally — proving the interpreter's existing
ally-cast branch needed no change to pick up the four new selectors.

Full Phase 1–3 + Slice A–D suite re-verified byte-identical (all pre-existing goldens pass
unmodified) — confirmed the `Spell`/`resolveInstanceTarget`/Cast-executor/interpreter changes AND
the ally-selector-set completion are additive no-ops: no existing content references the four new
selectors, and the two `TargetSelector`-consuming switches' `never`-typed default cases mean `tsc`
would have caught any missed call site. `lint` / `format:check` / `build` all clean.

### Notable decisions surfaced during implementation (flag for review before Slice F)

- **Confusion bundled into the same ally-cast exemption as Provoke** (the ASSUMPTION above) — the
  brief's own quoted text names only Provoke; needs explicit sign-off since it's a scope
  interpretation, not a literal instruction.
- **`stat-modifier` payload's magnitude is an authored flat `{stat, factor}`, not derived from
  `scalingStat`/`spellPower`** — and is therefore also NOT scaled by instance-list `powerPercent`.
  Neither the brief nor CONVENTIONS pins this explicitly; the alternative (deriving a buff's
  strength from the caster's own Intelligence) had no textual support and would make a permanent
  stat-modifier's authored balance number caster-dependent, which nothing else in the unified
  effect framework does for `stat-modifier` (§1: "params: stat, factor; no per-stat
  special-casing").
- **`applyHeal`/`applyStatModifier` exported as-is, no signature change** — both already took
  exactly the `(sourceId, targetId, amount/factor, state, events)` shape a direct (non-trigger)
  Cast-time call needed; no new wrapper function was needed.
- **Ally target-selector completion, folded into this same slice on design-agent review** — the
  support-spell model shipped with only 2 of the enemy side's 5 selectors mirrored on the ally
  side (`self`/`lowest-hp-ally`), which wasn't enough to actually choose WHICH ally a buff/heal
  targets. This is the **second** time an ally-side gap surfaced late in this slice (first as the
  side-mismatch-guard question the doc-sync pass resolved, now as this real functionality gap) —
  flagged by the design agent as worth a proactive pass over the full ally-targeting/trait-response
  vocabulary before Slice F/H content design starts, to catch any other "enemy has it, ally
  doesn't" asymmetries ahead of implementation rather than mid-slice. Worth doing before Slice F's
  kickoff.

### Deliberately out of scope for Slice E (later slices)

Specializations/perks/starters/the Unicorn's real content, incl. the real per-spec spell loadouts
that will actually USE `targetSide`/`payload` in anger (F); the Zustand store (G); the real
~50-spell per-affinity seed set incl. real heal/buff spells (H1–H3, per GAME_DESIGN §5's "Vitality
is the primary healer/Regen home"); integration (I).

## Slice E2 — content-surfaced engine primitives (round 2)

**Retroactive entry**: this section was never written when Slice E2 merged (PRs `e5040c8`/
`6ea4376`/`8a168be`/`5093d6f` on `main`, "slice e2 code"/"slice e2 more goldens"/"slice e2
docs"/"doc sync") — a gap in this growing record, caught and filled in here by the Slice F pass
(per this project's "verify, don't assert from memory" discipline: the file list and test count
below are read directly from `git show --stat` on those commits and the current `main` test run,
not recalled). Full build spec: `briefs/phase-4-slice-e2-primitives.md`; the shipped mechanism
list is CONVENTIONS' own "Phase 4 systems addenda" / "New primitives / capabilities" sections
(already updated by that slice's own docs commit) — not re-derived from scratch here.

### What was built (per CONVENTIONS' own addenda, cross-referenced against the diff)

- **Source-relative conditions**: the `Condition` subject union gains `'target'` ("the creature
  this effect is resolving against"), threaded through `evaluateCondition`'s new optional
  `resolvingAgainstId` parameter, supplied by `calculateDamage`'s target and `fireHook`'s trigger
  source. A new dealt-pool `EffectDef` category, `conditional-damage-bonus` (`{percent,
  condition}`), consumes it — "+% damage to Weakened/Webbed/Sleeping/low-HP targets" (Cull the
  Weak, Ambusher, Gloomjaws, Sporch's Reaper) as one clean modified hit, not a second
  `on-damage-dealt` follow-up.
- **`chancePercent`** — a probabilistic gate on a triggered effect (`TriggeredDef` and
  `StatusTrigger` both gain it), rolled once per firing, after the depth-cap check, only when
  present (Concussive Blows, Sleeper).
- **`remove-status`** — the response vocabulary's ninth and (per CONVENTIONS) final verb: clears
  a status from a target via the existing `StatusExpired` path. `StatusDef` gains a `polarity:
  'buff' | 'debuff'` field (declared on every status from birth).
- **General `on-action-observed`** — supersedes the never-wired `on-ally-action`/`on-enemy-action`
  pair. Fires per action instance on all living creatures; reacting effects (`TriggeredDef`'s new
  `observationFilter`) filter by `relationship`/`actionKind`/`excludeActor`. Wired into all four
  action executors in `combat.ts` alongside their own actor-self hook call.
- **Web's break-free roll** (deferred from Slice C) — `TurnOrderStatusDef.breakChancePercent`,
  rolled at every creature's turn-start against every Web-bearer (`combat.ts`'s
  `rollWebBreakFree`), not the bearer's own hook.
- **`apply-stat-modifier` gains `magnitudeSource`** (freeze-at-application: resolved once, baked
  into a fixed `finalFactor`) and `Creature.speciesId` is wired through `materializeCreature` for
  real, unblocking `living-allies-of-species`.
- **`heal` gains `scalingStat`/`spellPower`/`magnitudeSource`** (Treants Elder, Necromoss),
  mirroring `deal-damage`'s own magnitude-mode shape.
- **New goldens** (7 pairs): `golden-action-observed`, `golden-chance-percent`,
  `golden-conditional-damage-bonus`, `golden-sleep-wake`, `golden-web-break-free`,
  `golden-heal-scaling-stat`, `golden-heal-scaling-count`. Existing `golden-consume-stacks`/
  `golden-defend-count`/`golden-defend-count-additive-cap`/`golden-turn-order-status` fixtures
  picked up the new required `polarity` field (additive, no behavior change).

### Tests

**424/424** across 63 files on `main` at the start of Slice F (up from Slice E's 385 — 39 new).
`lint`/`format:check`/`build` green.

### Deliberately out of scope for Slice E2 (later slices)

Specializations/perks/starters/the Unicorn (F, this record's own next section); the Zustand store
(G); real biome content (H1–H3); integration (I).

## Slice F — Specializations, perks, starters & the Unicorn

Built per `.claude/briefs/phase-4-implementation-plan.md`'s Slice F section, cross-referenced
against `.claude/specializations/{sorcerer,brute,shieldbarer}.md` and
`.claude/species/species-locked.md`'s "Starter species" section (the docs, not the brief, win on
any numeric disagreement — one such conflict surfaced and is documented below, not silently
resolved). Every Phase-4-functional perk reuses vocabulary already built by Slices A–E2 except two
genuinely new primitives: `bonus-cast` (the Sorcerer starter's own signature ability, flagged
inline and below rather than forced into existing shapes) and — added in the post-submission
review amendment below — `taken-reduction` (Bulwark's real mechanism, the taken-pool mirror of
the already-existing `conditional-damage-bonus`).

### What was built

**`src/engine/effect-types.ts`**:
- `ResponseTarget` gains `{ kind: 'all-allies' }` (ASSUMPTION 22) — the ally-side mirror of
  `all-enemies`, resolved via `livingAlliesOf(self)` (so it always includes the firing creature).
  First consumer: the Shieldbarer starter's team-wide Defence buff.
- A new permanent-for-fight passive `EffectDef` category, **`bonus-cast`** (`{ chancePercent }`)
  — see "New primitive" below.

**`src/engine/effects.ts`**:
- `instantiateCreatureEffects(creature, traits, playerWideEffects?)` — the ASSUMPTION 21
  implementation: appends the supplied perk `EffectDef`s after a creature's own innate-trait
  effects, **player-side only**, with deterministic `${creatureId}#perk#${ordinal}` instance ids.
  This is the ONE function both `createCombat` (fight-assembly) and `revive`'s death-reset now
  call — a revived player creature keeps its perks (permanent/battle-start, unlike in-fight
  ramp), for free, by construction (no special-cased "restore perks" branch anywhere).
  `instantiateTraitEffects` itself is untouched and still exported (existing call sites/tests
  unchanged).
- `activeBonusCast(creature)` — the read-time getter `combat.ts` consults directly.

**`src/engine/types.ts`**: `CombatState` gains `playerWideEffects: readonly EffectDef[]` (so
`revive` can re-derive perks mid-fight); `Creature.activeEffects`'s canonical-order doc comment
updated to `innate-1 → innate-2 → perks → infusions → statuses` (ASSUMPTION 21 — a documented
change to a previously-pinned ordering rule).

**`src/engine/combat.ts`**: `createCombat` gains `partyWidePlayerEffects?: readonly EffectDef[] =
[]` (7th param, additive/optional — every existing call site untouched), threaded into
`instantiateCreatureEffects` and stored on `CombatState.playerWideEffects`.

**NEW PRIMITIVE — `bonus-cast`** (Sorcerer starter: "50% chance on-turn-end to cast a random
equipped spell"). **Not** a 10th `EffectResponse` verb — CONVENTIONS' "hold the line at nine"
pins the response vocabulary specifically, and firing a real Cast needs `combat.ts`'s own
executor functions (`executeCastSingle`/`executeCastAoe`) plus its target-resolution helpers,
which `resolution.ts`'s generic `executeResponse` has no access to (gaining it would mean a
`resolution.ts → combat.ts` import cycle). Instead: a permanent-for-fight passive `EffectDef`
category, consulted **directly** by `combat.ts`'s `resolveTurn` — right after the actor's
ordinary `on-turn-end` hook fires, before the end-of-turn win/loss check — via a new
`maybeFireBonusCast`: rolls `chancePercent` (only when the actor carries the passive), then
picks uniformly among the actor's non-null equipped slots and runs the picked spell through the
EXACT executor a chosen action would (so `on-cast`/`on-action-observed`/payload
routing/instance-list all apply unchanged, for free). A no-op with no equipped spells. Flagged
for design-owner sign-off, same as Slice B's own `action-instance` category was.

**`src/engine/resolution.ts`**: the `revive` case now calls `instantiateCreatureEffects` (was
`instantiateTraitEffects`) so a revived player creature's perks survive death-reset;
`resolveResponseTargets` gains the `all-allies` case (`livingAlliesOf`, imported alongside the
existing `livingEnemiesOf`).

**`src/engine/config.ts`**: no change survives here — an initial `PERK_STATUS_DURATION` constant
was added and then removed in the review amendment below (Bulwark stopped being a status, so the
duration it needed no longer exists either).

**`src/data/statuses.ts`**: no `BULWARK` entry survives here — see the review amendment below.

**`src/data/species/starters.ts`** (new file) — the three starter creatures + the Unicorn, as
`SpeciesCreature`s (so a future Slice G store materializes a starter through the exact same
`materializeCreature` path any spawned enemy uses):
- **Sorcerer starter** (wit, Intelligence 30) — `SORCERER_STARTER_TRAIT` (`bonus-cast`,
  `chancePercent: 50`) + a new signature spell, `ARCANE_BOLT` (wit-affinity, spellPower 0.5,
  the first Wit-affinity spell in the codebase), granted as a permanent extra gem via
  `SORCERER_STARTER.equippedSpells` (review amendment — see below; a 4-slot array, slot 0 filled
  so the stock `always-cast` script can use it immediately, slots 1–3 empty for Phase 8), now
  carried through the REAL `materializeCreature` path, not just present in the raw data.
- **Brute starter** (violence, Attack 30) — `BRUTE_STARTER_TRAIT` (`action-instance`, `attack`,
  `powerPercent: 100` — a direct, content-level exercise of Slice B's instance-list model, no new
  resolver logic).
- **Shieldbarer starter** (endurance, Defence 30) — `SHIELDBARER_STARTER_TRAIT` (`on-provoke` →
  `apply-stat-modifier` at `{kind: 'all-allies'}`, `defence × 1.35` — ASSUMPTION 22, ramping team
  Defence on repeated provokes).
- **The Unicorn** (vitality) — `UNICORN_TRAIT` (`on-attack` → `revive` at `{kind:
  'random-dead-ally'}`, `pct: 0.2`) — the same mechanism Slice B's `golden-revive` fixture
  already proved, now the real shipped creature/trait.
- **ASSUMPTION**: `species-locked.md` left the Brute/Shieldbarer starters' affinity unpinned
  ("ideally distinct"). Resolved via CLAUDE.md's own affinity↔stat soft-mapping
  (Violence↔Attack, Endurance↔Defence) — three distinct affinities across the three starters.
  Exact base stats (10–30 range) and each starter's/the Unicorn's own stubbed `speciesId` and
  `rarity: 'rare'` placeholder are likewise parked-balance ASSUMPTIONs (species-locked.md itself:
  "for now only the starter creature exists").

**`src/data/traits.ts`**: `STOCK_TRAITS` appends the four starter traits (additive, via
`STARTER_TRAITS` imported from `species/starters.ts`) — the existing Phase 3 representative
content is untouched, per the guardrail.

**`src/data/specializations.ts`** (new file) — `PerkDef`/`Specialization` types (ASSUMPTION 20:
`effects: EffectDef[] | ((level: number) => EffectDef[])` for leveled perks),
`validateSpecialization` (throws at **import time** if a spec's `Σ(maxLevel × costPerLevel) !==
1000` — all three specs validated at the bottom of the module), `resolvePerkEffects`/
`resolveSpecializationEffects` (flattens a `{spec, perkSpend}` pair into one `EffectDef[]`, ready
to pass as `createCombat`'s `partyWidePlayerEffects` — the Slice G store's own eventual job).
`SORCERER` (12 perks), `BRUTE` (10), `SHIELDBARER` (10), each transcribed from its own `.md`
table. Every Phase-4-functional perk maps onto an existing primitive (action-instance,
status-immunity, stat-modifier, armor-penetration, cross-stat, cheat-death, grant-action-state,
conditional-damage-bonus, taken-reduction, chancePercent-gated triggered apply-status) **except**:
- **Bulwark** — see the review amendment below; final shape is a genuine permanent passive
  (`taken-reduction`), not a triggered status application.
- **Brute Force / Spell Focus** (unconditional "+1% damage per rank/level") — authored as
  `conditional-damage-bonus` with `condition: {kind: 'always'}`, now correctly scoped via the
  new `actionKind` field (`'attack'`/`'cast'` respectively) — see the review amendment below.
- **Phase-8-inert perks** (ASSUMPTION 24) — Sorcerer's five Mastery perks + Arcane Shields/Arcane
  Versatility/True Wit, Brute's Proficient half of Proficient Warrior, Shieldbarer's Shield
  Specialist — authored as real, full-cost `PerkDef`s (counted toward the 1000-point sum) whose
  `effects` is simply `[]`. There is no engine primitive for "equip gems off-affinity"/"equipment
  Stat Slot benefit" at all yet (the whole forge economy is Phase 8), so `[]` is the honest,
  correct dormant reading, not a stub.

### Doc conflict, flagged not silently resolved

`briefs/phase-4-implementation-plan.md` (both its Slice B vocabulary table and its Slice F prose)
describes the Brute starter's second attack instance as `[100%, 30%]` ("attack again for 30%").
Both content docs — `species/species-locked.md` and `specializations/brute.md` — agree it's
`[100%, 100%]` ("Attack executes twice at 100%"). Built per the two content docs (this slice's
own kickoff instructions: "docs win over anything in the brief if they disagree; flag the
conflict, don't guess"). `BRUTE_STARTER_TRAIT` and its golden use `powerPercent: 100` for the
second instance. **The brief's own prose needs a correction before it's read again.**

### Review amendment (four fixes, applied before merge)

Design review caught four gaps in the initial submission — all additive/default-preserving, all
attributed here to the system each one actually belongs to:

1. **`SpeciesCreature.equippedSpells?` (generation)**: the initial submission left the Sorcerer
   starter's granted gem as a standalone `SORCERER_STARTER_EQUIPPED_SPELLS` constant nothing
   actually wired through `materializeCreature` — a real `materializeCreature(SORCERER_STARTER,
   …)` call returned a caster with three empty gem slots, its `always-cast` script and
   `bonus-cast` trait with nothing to cast. Fixed: `SpeciesCreature` gains an optional
   `equippedSpells` field (a FIXED starter loadout, absent for enemy-spawnable species);
   `materializeCreature`'s fallback order is now `equippedSpells` param → `speciesCreature.
   equippedSpells` → all-null (enemy generation's own explicit-argument path is untouched, so
   `generateFloor`'s rolled loadouts are unaffected). `SORCERER_STARTER_EQUIPPED_SPELLS` was
   folded directly into `SORCERER_STARTER.equippedSpells` (no more unreferenced standalone
   constant). New test: materializes `SORCERER_STARTER` through the real path and asserts slot 0
   is `ARCANE_BOLT`, length 4.
2. **`ConditionalDamageBonusDef.actionKind?` (the damage-formula system)**: Brute Force and Spell
   Focus's "+1% damage per rank/level" folds into the shared `dealtMods` pool inside
   `dealDamageCore`, which has no attack/cast axis — the initial submission's own flagged caveat
   was that each perk's bonus therefore also applied to the OTHER action kind its flavor text
   doesn't name. Fixed properly rather than accepted: `ConditionalDamageBonusDef` gains
   `actionKind?: 'attack' | 'cast' | 'both'` (absent = `'both'`, byte-identical for every
   pre-amendment consumer — none set it), mirroring `CrossStatDef.appliesTo`.
   `gatherConditionalDamageBonus` (resolution.ts) now filters on it, fed the `actionKind` already
   in scope in `dealDamageCore` (the same value `gatherCrossStatContribution` reads one line
   over). Brute Force → `'attack'`, Spell Focus → `'cast'`, Cull the Weak stays unset (`'both'`,
   unaffected). New tests: `actionKind: 'attack'` applies on an Attack and not on a Cast (and the
   mirror for `'cast'`); an unset `actionKind` still applies to both.
3. **`taken-reduction` (the taken-pool system, TAKEN mirror of `conditional-damage-bonus`)**:
   Bulwark's "-5% damage taken per Defend, cap 80%" belongs directly in a perk's own `effects:
   []`, like every other perk — the initial submission instead applied a STATUS via a triggered
   `on-fight-start → apply-status`, which needed a faked-permanent duration
   (`PERK_STATUS_DURATION = ROUND_CAP + 1`) and a real `BULWARK` `data/statuses.ts` entry neither
   of which should have existed for a perk-granted passive. Fixed: a new permanent-passive
   `EffectDef` category, `taken-reduction` (`{magnitude, magnitudeSource?, accumulation?,
   reductionCap?}` — `DamageModifierDef`'s own `taken` shape, minus `statusId`/`polarity`, since
   it's never a status). `gatherTakenFactors` (effects.ts) now reads BOTH `damage-modifier`
   (`taken` direction) and `taken-reduction` entries, reusing the exact same
   `takenFactorFor`/`damageModifierCount` helpers — both generalized to a shared structural
   interface (`TakenReductionSource`) rather than duplicated, so neither's own behavior changed
   (`DamageModifierEffect` always carries `stacks`; `TakenReductionEffect` never does, and
   `e.stacks ?? 1` gives the correct "flat single application" fallback for it). Bulwark's perk
   effects is now `[{category:'taken-reduction', magnitude:0.95, magnitudeSource:{kind:'count',
   of:'self-defend-count'}, accumulation:'additive', reductionCap:0.8}]` — no trigger, no
   `on-fight-start`, no status. The `BULWARK` status and `PERK_STATUS_DURATION` (and its import)
   are both removed outright. New test: a multi-round `resolveFight` trace (the same numbers as
   Slice D's `golden-defend-count-additive-cap`, reauthored as a passive) proving mitigation
   ramps round-over-round and reaches/holds the 80% cap, while asserting NO `StatusApplied`/
   `StatusExpired` event ever appears and `hasStatus(bearer, 'bulwark')` is `false`.
4. **`StatusDef.defaultDuration` (the status system)**: a status's duration was previously only
   ever set at application time (`StatusSpec.duration`, required) — no status declared its own
   "usual" duration, so every producer had to repeat the same number. Fixed: every `StatusDef`
   variant gains a required `defaultDuration: number`; `StatusSpec.duration` becomes **optional**;
   `applyStatus` (resolution.ts) resolves `spec.duration ?? def.defaultDuration` once, up front,
   and uses that resolved value for the new/refreshed `remainingDuration` AND the
   `StatusApplied` event's own `duration` field. Every pre-amendment `StatusSpec`/`appliesStatus`
   in real content and goldens already sets `duration` explicitly, so this is byte-identical
   everywhere already exercised (confirmed: the full pre-existing suite re-passed unmodified).
   `WEAKEN.defaultDuration = 3`; Concussive Blows (Brute) is the first real content to omit its
   own explicit duration, inheriting Weaken's default. The other five stock statuses
   (Poison/Burn/Regen/Stun/Vulnerability) got placeholder `defaultDuration`s matching their own
   existing real-usage durations (never actually read by that content, since it always sets
   `duration` explicitly) — a data-authoring formality, not a design decision; real values land
   "as the roster is authored" per the review's own framing. New tests: an omitted duration
   inherits `defaultDuration`; an explicit duration overrides it.

Mechanical ripple from (4): every `StatusDef` object literal across the test/fixture suite needed
a `defaultDuration` value added (the same kind of required-field ripple Slice D's `defendCount`/
`speciesId` additions caused) — purely additive, no assertion changed. One incidental fix
surfaced along the way: `combat.test.ts`'s `WEB_TEST_STATUS`/`NEVER_BREAKS_STATUS` were typed as
the broad `StatusDef` union and then spread with an extra property (`{...WEB_TEST_STATUS,
breakChancePercent: 0}`) — TypeScript distributes a union-typed spread per member for excess-
property checking, and picked the (non-matching) `ConditionStatusDef` branch to report against
once the four variants' required-field sets grew less trivially distinguishable. Fixed by typing
both as the concrete `TurnOrderStatusDef` instead of the general `StatusDef` union — narrower and
more correct regardless of the trigger.

`npm run test` / `lint` / `format:check` / `build` all re-verified green after this amendment
(470/470, up from the pre-amendment 464 — the new tests listed in each fix above).

### Tests

**463/463 pre-amendment, 470/470 after** (see the review amendment above) across 69 files (up
from 424/424 at the start of this slice — 39 new pre-amendment, +7 more in the amendment): 6 new
files
(`data/specializations.test.ts`, `data/species/starters.test.ts`, and four new golden pairs —
`golden-brute-starter`, `golden-shieldbarer-starter`, `golden-unicorn-starter`,
`golden-sorcerer-starter`), plus additions to `effects.test.ts` (`instantiateCreatureEffects`,
`activeBonusCast`), `resolution.test.ts` (`all-allies` targeting, revive-restores-perks), and
`combat.test.ts` (`bonus-cast`'s hit/miss/no-equipped-spell/AOE branches, via a small
queue-based RNG stub rather than a hunted-for real seed, since these are unit-level branch-
coverage tests, not full-log goldens). All four starter goldens are hand-derived (`node -e`
arithmetic in each fixture's own header comment) against the REAL shipped trait/creature content
(imported from `data/`, not re-declared fixture stand-ins) — matching the plan's own instruction
that these be "a direct, content-level exercise" of already-proven mechanisms, not new ones (true
for three of the four; `golden-sorcerer-starter` is the one exercising the new `bonus-cast`
primitive itself). Full Phase 1–3 + Slice A–E2 suite re-verified byte-identical (every new field
is additive/optional; the seven raw `CombatState` object literals across test files that
predate `createCombat` needed a `playerWideEffects: []` addition, the same mechanical update
Slice B's `traits` field and Slice D's `defendCount`/`speciesId` fields each required). `lint` /
`format:check` / `build` all clean.

### Notable decisions surfaced during implementation (flag for review before Slice G)

- **`bonus-cast` as a new `EffectDef` category, not a response verb** (above) — needs explicit
  sign-off, same as `action-instance` did in Slice B. **Left as-is in review** ("Leave as-is:
  bonus-cast (a passive EffectDef, not a response verb)").
- **The Brute-starter-power doc conflict** (above) — the brief itself needs a correction pass.
  **Left as-is in review** ("Do not touch briefs/phase-4-implementation-plan.md... already
  updated separately").
- ~~Brute Force/Spell Focus's `conditional-damage-bonus` + `{kind:'always'}` cross-action-kind
  leak~~ — **resolved in the review amendment above** (`actionKind` scoping), not merely accepted.
- **Starter/Unicorn affinity, base stats, `speciesId`, `rarity`** — all parked-balance
  ASSUMPTIONs per `species-locked.md`'s own "stubbed" framing; none are load-bearing design
  decisions, all clearly flagged inline in `starters.ts`.
- The scripted-intro-encounter test was **not** built here — it is explicitly a Slice G (store)
  concern per the plan's own note ("may land as part of G instead if sequencing makes more sense
  once implementation starts"); the *content* (the Unicorn, its trait, its revive mechanism) is
  fully built and goldened in this slice.

### Deliberately out of scope for Slice F (later slices)

The Zustand store, `descend()`, the scripted-intro encounter's own store-level handler, spec
swap/refund (G — this slice built the perk *effect* mechanism and the *data*, not the store that
spends/tracks perk points or assigns a starter into a collection); real biome content (H1–H3);
integration (I).

## Slice G — State layer (`src/state/`, first use in the project)

The Zustand store CONVENTIONS' "Generation & the run layer" describes: owns navigation +
ownership only, and *calls* Slice A's pure generation module — it never owns the deterministic
derivation of a floor's contents. In-memory only, no persistence middleware (Phase 5, wholesale,
per the brief's own scope boundary — no `idb` dependency added).

### What was built

New directory `src/state/`:
- `ids.ts` — `InstanceId` (+ `createInstanceId`), the same branded-string pattern as every other
  id space in the project. **ASSUMPTION 25's own disambiguation**: the brief's own
  `collection: Map<CreatureId, Instance[]>` shorthand is read as using "CreatureId" loosely for
  the STATIC creature id an Instance references (`SpeciesCreature.id`, a plain, unbranded
  string) — not the engine's branded `CreatureId` (`src/engine/ids.ts`), which is a transient
  **per-fight** identity, freshly derived by `materializeCreature` every combat and never reused
  for a persistent owned instance. Only `InstanceId` itself is branded, per ASSUMPTION 25's own
  literal text.
- `rewards.ts` — pure, independently-testable run-layer reward/lookup helpers, mirroring the
  engine's own file-per-concern convention (`curves.ts`/`leveling.ts` alongside `combat.ts`):
  - `Instance` (`{id, creatureId, level, xp}`) and `applyXpGain(instance, xpGain)` — banks a flat
    XP gain and resolves any resulting level-ups purely via the existing `xpForNextLevel`
    (Slice A), looping since a single large gain can cascade through multiple levels in one call.
    Level-ups happen **only** here, post-fight — CONVENTIONS: "the engine never sees a mid-fight
    level change."
  - `Currencies` (`{essence, ore, bricks, lifeforce}`) + `ZERO_CURRENCIES`/`addCurrencies` — the
    project's first modeling of these four currencies anywhere in the codebase (ASSUMPTION 26:
    tracked now, unbounded, nothing spends them until Phase 8).
  - `currencyDropForKill(floor)` — a flat, floor-scaled placeholder (parked balance,
    GAME_DESIGN §13), banked per **KILL** — the same treatment as soul%/XP, per GAME_DESIGN §7
    and CONVENTIONS both grouping soul%/XP/currency as banking per kill-event, never held
    pending the fight's outcome. Creature-independent (no rarity skew, unlike soul%): GAME_DESIGN
    §4's "global depth-scaled drop table... independent of which specific creature was defeated"
    clause scopes to recipe drops, not currency generally, but the creature-independence itself
    still holds here — a flat per-kill amount gives both properties at once. (The initial
    submission read this as a currency-vs-kill doc tension and shipped "per fight won" instead;
    corrected in PR review — see the review-fix section below. Named `currencyDropForFightWin`
    at that point.)
  - `perkPointsFor(bossesCleared)` — `bossesCleared.size * 100`, derived, never stored (per the
    brief's own framing).
  - `StaticCreatureRef` + `findStaticCreature(creatureId, standalone, biomes)` — checks a
    standalone list (starters/the Unicorn, which live outside any biome spawn pool by design —
    see `starters.ts`'s own header comment) before falling back to a scan of every biome's
    species pool.
- `store.ts` — `createGameStore(overrides): UseBoundStore<...>` (Zustand `create`, no
  middleware) + the default zero-config singleton `useGameStore = createGameStore()` (real
  `src/data` content wired in). **ASSUMPTION, beyond the brief's literal "store.ts" framing**: a
  dependency-injecting factory rather than a bare module-level `create()` call — necessary for
  testability without a UI (no Phase-4.5-style demo exists yet to exercise this against), and the
  same shape `createCombat`/`generateFloor` already take (explicit registries in, not reaching
  into `src/data` directly). `GameStoreDeps` covers `biomes`/`scripts`/`traits`/`statuses`/
  `specializations`/`standaloneCreatures`/`runSeed`/`createRng` (the generation-RNG factory
  only — combat's own internal RNG always goes through the real `createSeededRng` inside
  `createCombat`, not overridable without an engine change, and not needed since combat's own
  determinism is already proven by the existing engine goldens).
  - **State** (`GameState`): `deepestFloor`, `currentFloor`, `discoveredBiomes`, `atlasPins`,
    `collection` (keyed by the static creature id, per the ids.ts disambiguation above),
    `activeParty` (a fixed 6-slot `(InstanceId | null)[]`), `soulProgress` (0–100 per static
    creature id), `chosenSpec`, `perkSpend`, `bossesCleared`, `currencies`, and — **ASSUMPTION
    27** — `runSeed`/`runCounter` (the RNG stream's seed + an advance counter, NOT a live
    `SeededRng` object, keeping the store a plain serializable-shaped record ready for Phase 5's
    save format; a fresh `SeededRng` is re-derived from `(runSeed, runCounter)` via a private
    `hashRunDraw` — mirroring `biomeForFloor`'s own per-floor re-derivation, ASSUMPTION 4's
    precedent — whenever a draw is needed, rather than threading a stateful object through
    Zustand). Plus `nextInstanceOrdinal` (own addition, not named by the brief): a monotonic
    counter used only to mint unique, deterministic `InstanceId`s (`` `${creatureId}#${ordinal}` ``),
    unrelated to `runCounter`/RNG.
  - **`descend(floor)`** — the integration action. Bounded to `1..deepestFloor+1` (own
    ASSUMPTION: can re-farm any already-cleared floor, or push exactly one floor past the current
    frontier — can't skip ahead; throws `RangeError` otherwise). Resolves the spec's
    `partyWideEffects` (`resolveSpecializationEffects`, Slice F), resolves the floor's biome
    (`biomeForFloor`, Slice A) against the injected `biomes` list, generates the floor
    (`generateFloor`, Slice A) from a freshly-derived generation RNG, builds the resolver-ready
    player `Creature[]` from `activeParty` (`resolvePlayerParty` — filters empty slots and
    re-assigns CONTIGUOUS slot indices 0..k-1, since the engine's tie-break rule expects a dense
    slot space), then runs each fight through `createCombat`/`resolveFight` in sequence. Per
    fight: every `CreatureDied` event is joined back to the generated `enemyParty` by id, the
    static creature is recovered by stripping the engine's own `` `-${side}-${slot}` `` id suffix
    (reliable since both fields are recorded on the dying `Creature` itself — no string-parsing
    guesswork) and looked up via `findStaticCreature`, and soul%/XP are banked immediately
    (CONVENTIONS: "never held pending fight outcome") — **before** checking whether that fight
    was even won. The loop stops (without attempting the floor's remaining fights) at the first
    non-`'win'` result; `deepestFloor` only advances on a full clear. Returns a `FloorOutcome`
    summarizing fight-by-fight results, total soul/XP/currency gained this call, and the
    concatenated event log.
  - **`runScriptedIntro()`** — **ASSUMPTION 23**, built exactly as pinned: NOT a new engine
    mechanism, a fixed 1-enemy fight (the Unicorn, level 1) run through the ordinary resolver;
    regardless of the result, the Unicorn is unconditionally granted into the collection (and the
    first open party slot) if not already owned, via the same `grantCreatureIfUnowned` helper
    `setSpec` uses. The engine has zero awareness this fight is special — the store's own
    post-fight handler doesn't even branch on `finalState.result`.
  - **`setSpec(specId)`** — refunds `perkSpend` (cleared — perk points are derived from
    `bossesCleared`, so "refund" is just clearing spend) and grants the new spec's starter if not
    already owned (**ASSUMPTION 28**: never removes a previously-owned starter — confirmed by a
    swap-back-doesn't-duplicate test).
  - **`travelTo(floor)`** — fast-travel, bounded to `1..deepestFloor` (already-cleared floors
    only, no combat) — a separate, narrower bound than `descend`'s `1..deepestFloor+1`. Returns
    `false` (state unchanged) rather than throwing on an out-of-bounds floor, since this is a
    UI-facing nav action, not an integration boundary.
  - **`recordBossKill(bossId)`** / **`pinBiome(floor, biomeId)`** — own additions, not named by
    the brief's own bullet list, but needed for `bossesCleared`/`atlasPins` (both explicitly
    named STATE fields) to ever become non-empty at all. Both trivial, idempotent-where-it
    matters (`recordBossKill`) Map/Set mutations — no facility-unlock gating for `pinBiome` (the
    Biome Atlas's own "unlocked once all 10 biomes discovered" gate is Phase 8/facilities scope,
    not this slice's).

### Tests

**494/494** (up from Slice F's 470 — 24 new, post-review-fix: +2 over the pre-fix 492 — a
mid-fight-wipe reward-banking regression test and a perk-plumbing regression test, see the
review-fix note below) across 73 files. `rewards.test.ts` — focused unit
coverage per helper, hand-derived (`applyXpGain`'s no-level-up / single-level-up /
multi-level-cascade cases traced by hand against `xpForNextLevel(level) = 100 * level`;
`currencyDropForKill`'s floor-scaling + the `bricks = max(1, floor(floor/10))` cases;
`findStaticCreature`'s standalone-hit / biome-pool-hit / miss branches).

`store.test.ts` — the brief's own named `descend()` integration test, covering every item on its
list, plus `travelTo`/`runScriptedIntro`/`setSpec`/`recordBossKill`/`pinBiome`. Built against a
small custom fixture biome (never `src/engine/__fixtures__/biomes.ts`'s own two-species fixture,
nor real `src/data/biomes.ts` content — H1–H3 still land those as placeholder-shaped/empty) with
a deliberately EXTREME stat gap between a weak "fodder" creature and an overwhelming
"juggernaut," so every win/loss outcome is deterministic **by construction**, not by tuning
close to a threshold: the player's fixture starter one-shots fodder regardless of its rolled
level, and is one-shot BY the juggernaut (faster, so it always acts first) regardless of ITS
rolled level. WHICH creature spawns per fight is controlled the same way `generation.test.ts`
(Slice A) already established — a stubbed `SeededRng` (`deps.createRng` override) returning a
hand-picked value sequence, exploiting `weightedPick`'s known cumulative-weight math (documented
inline: a single-species pool is draw-invariant; the two-creature rarity-weighted draw's exact
threshold, `6/7`, is derived in a comment from `RARITY_DRAW_WEIGHT`). This is the "hand-derived,
arithmetic in comments" discipline, not a generated-then-pasted checkpoint, despite exercising
the full `descend()` integration path. Covers: a full-clear win (banks 3 kills' worth of
soul%/XP/currency, advances `deepestFloor`, discovers the biome); a win-then-loss (keeps fight
1's rewards, stops before fight 3, `deepestFloor` unchanged); the `1..deepestFloor+1` bound
(throws past the frontier); `travelTo`'s separate, narrower bound; `runScriptedIntro` adding the
Unicorn on BOTH a forced win and a forced loss (an overwhelming Unicorn stand-in substituted via
`deps.standaloneCreatures`, same id, proving the store's handler doesn't branch on outcome);
`setSpec`'s refund-without-losing-the-collection + no-duplicate-on-swap-back; `recordBossKill`'s
idempotency.

Full Phase 1–3 + Slice A–F engine suite re-verified byte-identical (this slice touches no
existing engine call site's behavior — see the two additive-only engine changes below).
`lint` / `format:check` / `build` all clean.

### PR review fixes (design-agent review, actioned before merge)

Four items, reviewed against the docs on `main` (not the PR's own claims):

1. **Currency banks per kill, not per fight won.** `rewards.ts`'s `currencyDropForFightWin`
   (below) was renamed `currencyDropForKill`; `store.ts`'s `descend()` moved the currency
   accumulation into the per-`CreatureDied` loop, alongside soul%/XP banking, instead of after
   each fight's win check. GAME_DESIGN §7 and CONVENTIONS both group soul%/XP/currency as
   banking per kill-event, never held pending the fight's outcome — the initial submission's
   "doc tension" framing (below, superseded) misread GAME_DESIGN §4's "independent of which
   specific creature was defeated" as scoping to currency generally, when that clause actually
   scopes to recipe drops; per-kill and creature-independence aren't in tension (a flat per-kill
   amount gives both).
2. **New regression test** (`store.test.ts`, `descend()`): clears floor 1, then `descend(2)`
   (`enemyPartySize(2) = 2`, so a kill and a wipe can land in the SAME fight) with a fodder enemy
   the player kills on round 1 and a slower-but-overwhelming enemy that then one-shots the
   player — proves the fodder kill's soul%/XP/currency bank despite that fight being a loss.
   Floor 1's 1-enemy fights couldn't distinguish per-kill from per-fight-won banking (a win
   always had exactly one kill, a loss always had zero).
3. **New regression test** (`store.test.ts`): proves `resolveSpecializationEffects`'s output
   actually reaches `createCombat`'s `partyWidePlayerEffects`, not just that the wiring compiles
   — an identical fixture fight loses with an empty `perkSpend` and wins once a large
   `stat-modifier` perk is purchased (`perkSpend` set directly via `setState`, since no
   `purchasePerk` action exists — still correctly out of scope).
4. **Fail loud on an unresolved enemy kill.** `descend()`'s reward loop's `!staticRef` branch (a
   dead enemy whose derived static id doesn't resolve to any known static creature) now throws a
   descriptive error instead of `continue`-ing silently — every generated enemy is derived from
   static data by construction, so a miss there means the engine's id format and this store's
   `-${side}-${slot}` suffix-stripping have drifted apart; a future format change should surface
   loudly, not vanish rewards silently. The sibling `!deadEnemy` branch (a player-side death, not
   a reward source) is unchanged, still a plain `continue`.

`npm run test` — **494/494** across 73 files (up from the pre-fix 492 — the two new regression
tests above). `lint` / `format:check` / `build` re-verified clean after the fixes.

### Two small additive engine changes (own ASSUMPTIONs, not pinned by the brief)

Both are new, optional-consumer, parked-balance placeholders in the same family as existing
entries in their files — no existing export's signature changed, no golden-affecting behavior:

- `engine/curves.ts` gains `SOUL_GAIN_PERCENT: Record<RarityTier, number>` (own ASSUMPTION —
  GAME_DESIGN §13 parks "soul-per-kill % per rarity tier" but only `RARITY_DRAW_WEIGHT`, the
  spawn-weight side, existed before this slice). Rarer creatures grant LESS % per GAME_DESIGN
  §5's "slower to complete" framing.
- `engine/leveling.ts` gains `xpAwardForKill(floor: number): number` (own ASSUMPTION — GAME_DESIGN
  never pins a per-kill XP amount at all, only the level-up COST curve `xpForNextLevel`). Scales
  off FLOOR depth rather than the defeated enemy's own level: `materializeCreature` bakes a
  rolled level into `baseStats` and never stores the raw level on the resulting `Creature`, so a
  defeated `Creature` has no level field to read post-hoc at the run layer (this slice's sole
  consumer) — floor is already in scope wherever a kill is processed and is a reasonable
  depth-scaled proxy instead.

### Notable decisions surfaced during implementation (flag for review before H1)

- ~~**The currency-per-kill vs. currency-per-floor doc tension**~~ — **resolved in the PR review
  fixes above**: currency banks per kill (same as soul%/XP), stays creature-independent (a flat
  per-kill amount, no rarity skew) per the corrected reading of GAME_DESIGN §4's "independent of
  which specific creature was defeated" clause (scoped to recipe drops, not currency generally).
  Not merely accepted as the initial submission's "per fight won" call — actually changed.
- **`collection`'s key type** — the brief's own `Map<CreatureId, Instance[]>` shorthand is read
  as the STATIC creature id (a plain string), never the engine's branded per-fight `CreatureId`
  — flagged inline in `ids.ts` and `store.ts`'s `GameState.collection` doc comment.
- **`createGameStore` as a DI factory, not a bare `create()` call** — needed for testability with
  no UI yet to exercise the store against; the default `useGameStore` singleton still exists for
  whenever a UI does land.
- **`descend`'s `1..deepestFloor+1` bound vs. `travelTo`'s `1..deepestFloor`** — two different
  bounds by design (re-farm-or-push-one-deeper vs. already-cleared-only), not an oversight; not
  explicitly spelled out by the brief, which only asked for "fast-travel bounds-checks against
  deepestFloor" as one of `descend()`'s own test items.
- **`recordBossKill`/`pinBiome` as own-addition actions** — the brief names `bossesCleared`/
  `atlasPins` only as STATE, not action entry points; both were added since otherwise those
  fields could never become non-empty except via raw `setState` poking in tests, which felt like
  the wrong place to draw the line for two nearly-trivial mutations.

### Deliberately out of scope for Slice G (later slices)

Real biome content replacing `data/biomes.ts`'s placeholder slots (H1–H3); the integration pass
(I); any UI (`src/ui`/`src/app` — visibility comes from a future Phase-4.5-style demo, per the
brief's own scope boundary); persistence/save-load (Phase 5, wholesale — `runSeed`/`runCounter`
are shaped to be save-ready but nothing serializes them yet); perk-purchase budget/spend
validation (the brief names only `setSpec` as a `perkSpend`-touching action; a `purchasePerk`
action with budget-checking was deliberately NOT built — out of the brief's named scope, and its
exact failure-mode semantics (throw? clamp? no-op?) aren't specified anywhere).

## Slice H1 — The Overgrowth (floors 1–10)

Real `src/data/` content for Biome 1, against `.claude/species/species-locked.md`'s own table --
built entirely on primitives already proven through Slice E2. Per the plan's own "stop and amend
the relevant earlier slice" discipline: nothing in the INITIAL roster needed anything not already
built (confirmed while authoring). **Correction**: this stopped being true once the design-owner
follow-up passes landed (below) -- Swarmhive Queen's redesign needed one small, genuinely new
engine primitive, `{ kind: 'all-allies-of-species' }` (a `ResponseTarget` addition to
`effect-types.ts` + one resolver case in `resolution.ts`). The slice is content-and-one-primitive,
not pure content -- see "Follow-up pass" below for the addition itself and PR #58's own review for
where an earlier draft of this section overstated "zero engine changes."

### What was built

New file `src/data/species/overgrowth.ts`: 6 species x 3 creatures (18 total), following
species-locked.md's own "roles ... enabler / payoff / amplifier" framing uniformly across every
species (common = sets the mechanic up, uncommon = benefits from it, rare = usually both at once)
-- per the locked design principle ("rarity governs spawn-frequency + soul-gain only, NOT power"),
each creature's stat BUDGET stays comparable within its species regardless of rarity. This file is
COMPOSITION ONLY (`Species`/`SpeciesCreature`/`BiomeData` + boss data) -- see the follow-up fix
below for where the actual `Trait`/`Spell` object definitions live and why.

- **Spiders** (Wit lean; Broodwarden stamped Instinct, coverage): Weaver (`on-attack` -> apply
  Web, unconditional), Ambusher (`conditional-damage-bonus`, +40% dealt vs a Webbed target --
  Slice E2's `subject: 'target'` condition, folded straight into the hit), Broodwarden (Webs +
  a second on-attack bonus hit scaled LIVE by the current Webbed-enemy count via
  `deal-damage.magnitudeSource` -- "rewards multiple Webs out" read as a live recompute, not a
  frozen-at-apply one, needing zero new primitive).
- **Swarmhive** (Violence lean; Queen stamped Endurance, coverage): Drone (follow-up fix, below --
  `on-death -> deal-damage(triggering-source, 0.3x Attack)`, a small parting sting;
  species-locked.md calls Drone a "cheap body," but the first draft gave it only a flavor +10%
  Speed stat-modifier with no real mechanic, contradicting "no trait-less filler"), Striker/Queen
  (`on-fight-start -> apply-stat-modifier(self, attack,
  magnitudeSource: living-allies-of-species)` -- the EXACT Slice E2-decided shape CONVENTIONS
  names for this species; `speciesId` is threaded automatically by `generateFloor`'s existing
  `materializeCreature(..., species.id, ...)` call, so no engine change was needed here either).
- **Treants** (Vitality/Endurance lean): Sapling (`on-round-end -> apply-stat-modifier(self,
  health)`, compounding growth), Elder (`on-round-end -> heal(lowest-hp-ally, scalingStat:
  health)` -- the canonical Slice E2 example, now real), Grovekeep (both, smaller individual
  rates).
- **Pollinators** (Wit/Vitality lean): Duster (`on-fight-start -> apply-stat-modifier(all-allies,
  speed)`), Beneficiary (`cross-stat` fromStat speed -> attack, so a Duster-buffed team hits
  harder through it specifically), Pollenlord (both a Speed AND Attack team buff; the biome's
  ONE cast-role creature, `defaultScriptId: 'always-cast'`, exercising `generateFloor`'s real
  spell-loadout roll against real wit-affinity spells for the first time).
- **Snapjaws** (Violence/Endurance lean): Lure (`on-provoke -> grant-action-state(self,
  defending: true)`), Jaws (`on-damage-taken -> deal-damage(triggering-source, 0.6x Attack)`,
  a bigger retaliate than the Phase 3 representative RETALIATE), Ironjaw (both).
- **Lullpollen** (Wit/Instinct lean; Reaper/Dozer stamped Instinct, coverage): Sleeper
  (`on-attack`, `chancePercent: 40` -> apply Sleep), Reaper (`conditional-damage-bonus`, +50%
  dealt vs a Sleeping target), Dozer (both, smaller rates).

10 spells (`OVERGROWTH_SPELLS`), 2 per affinity: THORN_LASH/SNAPPING_BITE (violence, damage),
VINE_SNARE (wit, damage + applies Web -- a second, independent Web producer alongside Spiders'
own traits), POLLEN_CLOUD (wit, AOE + applies Sleep), ROOT_GRASP (endurance, `scalingStat:
'defence'`), BRAMBLE_WARD (endurance, ally-AOE stat-modifier buff), REGROWTH (vitality,
ally-single heal, `scalingStat: 'health'`), WILD_VIGOR (vitality, ally-single stat-modifier buff),
STINGER_SWARM (instinct, damage), HOWLING_INSTINCT (instinct, ally-AOE stat-modifier buff) --
between them exercising every Slice E support-spell-model field (`targetSide`/`payload`/
`statModifier`/`scalingStat`) against real content for the first time.

New statuses (`src/data/statuses.ts`, additive): **WEB** (`turn-order-status`, `position: 'last'`,
`breakChancePercent: 10`, `defaultDuration: 3`, `cap: 1`) and **SLEEP** (`condition-status` with
TWO triggers -- `on-turn-start -> suppress-action` (Stun's own mechanism) plus `on-damage-taken ->
remove-status(self, sleep)` for the wake-up; `defaultDuration: 3`, `cap: 1`). Both are the first
real (non-fixture) consumers of their respective Slice C/E2-built mechanisms.

**The Broodmother** (floor-10 boss, `BROODMOTHER`/`BROODMOTHER_TRAIT`/`BROODMOTHER_ADDS`/
`BROODMOTHER_BOSS_ID`): an elevated `SpeciesCreature`-shaped Instance (never spawn-pool-drawn),
authored as DATA only -- her signature trait reuses the SAME on-attack
`deal-damage.magnitudeSource` trick as Broodwarden above, keyed on `living-allies-of-species`
instead of enemies-with-status(web), so her bonus hit is a LIVE reading of her own living
spiderling-add count ("kill adds to weaken her" -- this is why she does NOT use Swarmhive's
frozen-at-apply `apply-stat-modifier` shape, despite superficially looking like the same
"count-scales off allies" idea). A second effect, `on-round-end` at `chancePercent: 40`, Webs the
whole party. Her adds (`BROODMOTHER_ADDS`) are real Spider-roster members (Weaver + Ambusher),
sharing `SPIDERS_SPECIES_ID` with her by convention (whoever eventually materializes her passes
that same `speciesId` string to both her and her adds -- see the scope-boundary ASSUMPTION below).

`src/data/biomes.ts`: `BIOMES[0]` (floor decade 1, floors 1-10) now returns the real
`OVERGROWTH_BIOME` in place of Slice A's placeholder; slots 2-10 are untouched (still the Slice A
placeholder shape, per the guardrail -- H2/H3 replace slots 2/3 the same way). `data/traits.ts`'s
`STOCK_TRAITS` gains the 18 species traits + `BROODMOTHER_TRAIT` (additive, per the guardrail --
the Phase 3 representative set and Slice F's starter traits are untouched).

### Follow-up fix: where species-authored content lives

Flagged by the design owner on a first look at the initial submission (ahead of this slice's own
formal review), not silently accepted: the initial submission defined all 18 traits and all 10
spells directly INSIDE `data/species/overgrowth.ts`, mirroring Slice F's `starters.ts` (which
defines `ARCANE_BOLT` and its 4 starter traits inline the same way). That's a real, already-shipped
precedent -- but it's also inconsistent with how this SAME slice placed Web/Sleep (correctly, in
the central `data/statuses.ts`, alongside every other status) -- the same *kind* of content (a
definition, referenced by id/object from creature data) ending up in two different homes depending
on which slice touched it. That inconsistency, not merely "a species folder feels like an odd
place for a Spell," is the actual problem.

**Decided: traits/spells/statuses all live in their one central registry file
(`traits.ts`/`spells.ts`/`statuses.ts`), always.** Species files (`starters.ts`,
`overgrowth.ts`, and H2/H3's future `glimmerdark.ts`/`rotcap-hollow.ts`) hold ONLY composition --
`Species`/`SpeciesCreature`/`BiomeData`/boss data -- and reference trait/spell objects imported by
name from the central files, the same way they already reference a status by its id string. Three
reasons, in order of weight:

1. **One place to find "every trait in the game."** Under the old pattern, that question's answer
   was "traits.ts, PLUS every species file that happens to define its own." That gets WORSE, not
   better, as biomes 2-10 each add their own trait/spell pile into their own file -- eventually
   content is scattered across a dozen files with no single list, and "is this trait already
   defined somewhere" becomes a grep across the whole `data/` tree instead of one file.
2. **Removes the one exception instead of adding a second one.** Statuses already followed the
   central-registry rule with zero pushback (nobody suggested Web/Sleep belonged inside
   `overgrowth.ts`). Extending the same rule to traits/spells makes the codebase's OWN rule
   internally consistent, rather than leaving traits/spells as a standing exception content
   authors have to remember.
3. **Matches CLAUDE.md's own directory sketch** ("`data/` creatures, traits, spells, biomes,
   facilities as data") -- read literally, `traits.ts`/`spells.ts` are meant to be the canonical
   homes for that content TYPE; which creature references which trait/spell is a separate,
   compositional concern.

**Scope: fixed going forward (this slice), `starters.ts` deliberately NOT retrofitted in the same
PR.** `starters.ts` already merged in Slice F, and Slice G's store/tests reference its exports by
name -- moving its consts to `traits.ts`/`spells.ts` is a safe, pure reorg (same exported names,
zero behavior change) but it's churn in an already-shipped file that deserves its own small,
focused PR rather than being bundled into H1's content diff. Flagged here as a known, deliberate
follow-up, not an oversight -- do this before H2 lands another species file, so the "two patterns
coexist" window stays as short as possible.

**Mechanical result of this amendment**: `data/traits.ts` gained the 18 Overgrowth trait consts +
`BROODMOTHER_TRAIT` directly (same flat-list-then-`STOCK_TRAITS`-array shape every Phase 3 trait
already uses, not a spread-in import); `data/spells.ts` gained the 10 Overgrowth spell consts
directly (same shape `EMBER_LANCE`/`CINDER_NOVA`/`VENOM_BOLT` already use); `data/species/
overgrowth.ts` shrank to composition only, importing every `Trait`/`Spell` object it references by
name (so `SpeciesCreature.innateTraitIds` can still read `SOME_TRAIT.id` with full type/refactor
safety, not a bare string literal) and still exporting `OVERGROWTH_SPELLS` (a `data/spells.ts`
subset grouped for this biome's own `BiomeData.spellPool`). One test dropped as redundant by
construction (`overgrowth.test.ts`'s "OVERGROWTH_TRAITS are all registered in TRAIT_REGISTRY" --
trivially true now that the trait consts live inside `traits.ts` itself, not appended via import).

### ASSUMPTION (scope boundary, flagged not silently built)

Actually *running* the Broodmother's fight (assembling her + her adds into a hardcoded encounter,
then calling the store's existing `recordBossKill`) is deliberately **not** built in this slice --
no such "boss encounter runner" exists yet for any boss (Slice G's store ships
`recordBossKill`/`bossesCleared` as state only, the same way the Unicorn's own scripted-intro
runner was its own dedicated Slice G store action, not automatic). This slice's own checklist item
only asks to author the boss as an elevated Instance + signature trait(s) + adds; the runner is
future UI/store wiring.

### Tests

**509/509** (up from Slice G's 494 -- 15 net new: the follow-up fix above dropped one
redundant test) across 73 files (up from 71 -- 2 new: a loader/shape test,
`data/species/overgrowth.test.ts` -- every creature's trait reference resolves in
`TRAIT_REGISTRY`, base stats fall in the 10-30 range, the roster is affinity-complete across all
5 affinities, the one cast-role creature has >=1 affinity-matched spell in the pool, every
spell-applied status resolves in `STATUS_REGISTRY`, the Broodmother's adds are real Spider-roster
members -- and one hand-derived golden pair, `golden-overgrowth-web-exploit`, proving the
biome's signature combo (Weaver Webs its target -> Ambusher's real, shipped `conditional-damage-
bonus` trait lands +40% on that same Webbed target, `20.2 -> 28.28 (floored 28)`) end-to-end
through `createCombat`/`resolveFight` against the REAL registered content, now imported from
`traits.ts` per the follow-up fix above (matching the Slice F starter-golden precedent).
`data/biomes.test.ts` updated in place (not a new file) to assert slot 1 is the real, non-empty
Overgrowth biome and slots 2-10 keep the Slice A placeholder shape. Full Phase 1–3 + Slice A–G
suite re-verified byte-identical (confirmed via a clean `git stash -u` baseline run: 494/494
across 71 files, unchanged) -- as of THIS submission, the slice touched no engine file at all,
only `src/data/` (**no longer true of the slice's final state** -- the design-owner follow-up
pass below adds one engine primitive; see that section's own final test count, 517/517, which
supersedes the count in this paragraph). `lint` / `format:check` / `build` all clean at this point
in the slice's history.

### Player-facing content doc

`.claude/content/overgrowth.md` -- written for a future in-game tooltip/reference, not as a
narrative summary: every trait/spell is one literal sentence with its exact number baked in
("When this creature attacks, it applies Web to its target." / "At the end of every round, this
creature heals its lowest-HP ally for an amount equal to 10% of its own effective Health."),
kept explicitly in sync with the numbers in `traits.ts`/`spells.ts` -- if the two ever disagree,
the source file wins and the doc is stale. Includes the full spell table (missing from the
initial submission, flagged alongside the Drone/file-organization items above).

### Follow-up pass: numeric/mechanic adjustments + a new ResponseTarget

Flagged by the design owner after the slice above shipped (still ahead of this slice's own
formal review), addressed in the same working tree before merge:

- **New primitive**: `ResponseTarget` gains `{ kind: 'all-allies-of-species' }`
  (`effect-types.ts`), the species-scoped mirror of `all-allies` -- resolved in
  `resolveResponseTargets` (`resolution.ts`) via `livingAlliesOf(self, state)` further filtered to
  `c.speciesId === self.speciesId` (the same filter `resolveCount`'s `living-allies-of-species`
  count kind already uses, now as a target list). First (and so far only) consumer: Swarmhive
  Queen, below.
- **Mechanic redesigns** (not just numeric retuning) -- EVERY amplifier that previously combined
  its species-mates' effects, in any form (full-power or diluted), now has its own distinct
  mechanic instead. This landed in two passes: the first pass fixed Queen/Pollenlord/Ironjaw (the
  full-power duplicates) and, on a first read, judged Grovekeep/Broodwarden's DILUTED hybrids
  (each half at a reduced rate vs. the dedicated specialist) acceptably different in kind --
  that judgment call was wrong and got corrected on a second follow-up: dilution doesn't change
  that the mechanic is still "do both siblings' jobs," so Grovekeep/Broodwarden (and Dozer, its
  Lullpollen counterpart, missed in the first pass entirely) were redesigned too. Final shapes:
  **Queen** (was frozen-at-fight-start count-scaled self-buff, same shape as Striker at a bigger
  number) is now `on-turn-start -> apply-stat-modifier(all-allies-of-species, attack, +10%)`,
  repeating every round she acts and buffing the whole team, not just herself. **Pollenlord** (was
  two fight-start team buffs, Speed + Attack) is now a single `on-turn-start` Speed buff, repeating
  every round instead of firing once. **Ironjaw** (was Lure's on-provoke-Defend + Jaws'
  on-damage-taken retaliate, both diluted) is now `on-turn-start -> apply-stat-modifier(self,
  defence, +20%)`, a self-ramping wall unrelated to either sibling; its `SpeciesCreature` entry
  (`overgrowth.ts`) dropped `always-provoke` for `always-attack` since its trait no longer needs
  Provoke to fire. **Weaver** changed from `on-attack -> apply-status(triggering-source, web)` to
  `on-turn-start -> apply-status(random-enemy selector, web)` -- decoupled from attacking
  entirely. **Drone**'s on-death strike retargeted from `triggering-source` (its own killer) to a
  `random-enemy` selector. **Broodwarden** (was Weaver's own Web-application + a live count-scaled
  bonus hit) dropped the Web-application half entirely -- it now ONLY lands the count-scaled bonus
  hit (`spellPower` 0.2 -> 0.25, since it lost a whole half of its kit), a pure "payoff of the
  payoff" that depends entirely on its species-mates having done their own jobs. **Grovekeep** (was
  Sapling's self-growth + Elder's single-ally heal, both diluted) is now a single
  `on-fight-start -> apply-stat-modifier(all-allies, health, +15%)` -- a one-time, team-wide effect
  neither sibling does. **Dozer** (Lullpollen, was Sleeper's chance-to-Sleep + Reaper's flat
  conditional bonus, both diluted) mirrors Broodwarden's fix exactly, for Sleep instead of Web: a
  single `on-attack -> deal-damage(triggering-source, scalingStat attack, spellPower 0.25,
  magnitudeSource: count 'enemies-with-status' sleep)`, no Sleep-application, no flat bonus.
- **Numeric retuning** (species-locked.md/CONVENTIONS still satisfied, only the parked-balance
  numbers themselves moved): Striker 10% -> 20% per hive-mate; Sapling 5% -> 10% max-Health/round;
  Elder 10% -> 15% heal; Duster 15% -> 25% team Speed. (Grovekeep's own former 4%/15% hybrid
  numbers are moot -- replaced outright by the redesign above, not retuned.)
- **Spell rebalance** (`spells.ts`): a new damage-spell power-coefficient convention -- a
  single-target damage-only spell ~100% Intelligence, ~80-90% if it also applies a status; an AOE
  damage-only spell ~50%, ~30-40% if it also applies a status. Applied: Thorn Lash/Root
  Grasp/Stinger Swarm (single, no upside) 0.5/0.4/0.45 -> 1.0 each; Vine Snare (single + Web)
  0.3 -> 0.85; Pollen Cloud (AOE + Sleep) 0.25 -> 0.35. Violence's own second entry, Snapping Bite
  (a second plain-damage spell -- flagged: no affinity should carry two), was replaced outright
  by **Weakening Bite** (`payload: 'stat-modifier'`, `-20%` enemy Defence, permanent) rather than
  retuned -- `data/traits.ts`'s guardrail-style additive discipline doesn't apply to a same-slice,
  not-yet-merged spell, so the swap is a straight replacement, not an addition alongside it.
- **Doc pass**: `.claude/content/overgrowth.md` gained an explicit Affinity column on every
  species table (previously only inferrable from `overgrowth.ts`) and replaced "strikes" with
  "attacks" throughout for player-facing consistency; Snapjaws' Lure/Ironjaw wording simplified
  from "enters a defensive stance (as if it had Defended)" to plainly "also Defends" -- confirmed
  `grant-action-state`'s `defending: true` IS the real Defend flag, not a distinct mechanic, so
  the hedge was misleading, not merely verbose.

`npm run test` -- 509/509 unchanged (one golden fixture, `golden-overgrowth-web-exploit`, was
re-derived for Weaver's new on-turn-start/random-enemy shape and Web's own break-free roll now
firing at Ambusher's turn-start once Web exists on the board -- see that fixture's own header
comment for the full two-draw RNG trace). `lint` / `format:check` / `build` all clean.

### PR #58 review (design agent): blockers fixed, phase record reconciled

A real review pass, distinct from the design-owner's own pre-review follow-up notes above. Gates
were already green and the additive invariant already held; two items were flagged as blockers
before merge, both actioned:

1. **Test coverage for `all-allies-of-species`** -- shipped with zero coverage in the follow-up
   pass above. Added: two focused unit tests in `resolution.test.ts` (`all-allies-of-species
   ResponseTarget` describe block) -- applies to every living ally SHARING the firing creature's
   `speciesId`, INCLUDING itself; skips a same-side ally of a different species; skips the dead;
   skips the enemy side entirely, even a same-`speciesId` enemy; is empty (zero
   `StatModifierApplied`) for a bearer with no `speciesId` set. And a new hand-derived golden pair,
   `golden-swarmhive-queen`, against Queen's REAL shipped trait (`SWARMHIVE_QUEEN_TRAIT`,
   `TRAIT_REGISTRY`-sourced, not a fixture stand-in): 5 explicit `resolveTurn` steps across 2
   rounds prove the buff lands on every living Swarmhive ally including Queen herself, skips a
   same-side non-Swarmhive ally, skips an enemy sharing the same `speciesId` string (side-scoped,
   not a bare string match), and COMPOUNDS round over round (`20 -> 22 -> 24.200000000000003`,
   a fresh `StatModifierEffect` appended each firing, not a refreshed one).
2. **Phase record reconciliation** -- this section and the H1 intro paragraph both asserted "zero
   engine changes"/"touches no engine file at all," which the follow-up pass's own addition of
   `all-allies-of-species` (`effect-types.ts` + `resolution.ts`) had already contradicted. Both
   corrected in place (see the H1 intro's own "Correction" note and the Tests section's
   superseded-count note) rather than silently rewritten, per this project's own "verify, don't
   assert from memory" phase-docs-precision discipline.

Also actioned, flagged "optional/recommended/low priority" in the review but done in the same
pass since the six redesigned amplifiers (round 2 above) shipped with ZERO behavioral coverage of
their own: five more hand-derived golden pairs, all against REAL shipped trait content --
`golden-treant-grovekeep` (one-time team-wide +15% max Health at fight-start), `golden-pollinator-
pollenlord` (recurring team +10% Speed, 2 rounds, compounding), `golden-snapjaw-ironjaw`
(recurring self +20% Defence, 2 rounds, compounding, proven SELF-only), `golden-spider-
broodwarden` and `golden-lullpollen-dozer` (the "payoff of the payoff" on-attack bonus hit,
scaled by a LIVE count of 2 Webbed/Sleeping enemies -- proving the multiplication, not just
presence/absence; Web/Sleep themselves set up via a fixture-only `on-fight-start` trait rather
than a raw `activeEffects` preset, since `createCombat` recomputes `activeEffects` from
`innateTraitIds` at fight-start and would silently wipe a raw preset; Dozer's own golden
additionally surfaces Sleep's real wake-on-damage interaction -- the bonus hit itself wakes the
target via `on-damage-taken -> remove-status(self)` before the main hit lands).

**`npm run test` -- 517/517** (up from 509/509 -- 8 new: 2 focused unit tests +
6 golden-pair `it` blocks) across **79 files** (up from 73 -- 6 new golden-pair files; each pair
is a `.fixture.ts` + `.test.ts`, only the latter counts as a vitest file). `lint` / `format:check`
/ `build` all clean. This is the slice's actual final state -- supersedes every earlier count in
this H1 section.

**Captured for a later slice, per the review's own request (not lost, not actioned here):**
- **Broodmother boss-encounter runner contract**: her signature (`Swarm Call`'s
  `living-allies-of-species` count-scaling) only works if the future runner materializes her and
  her spiderling adds (`BROODMOTHER_ADDS`) with the SAME `speciesId` string
  (`SPIDERS_SPECIES_ID`) passed to `materializeCreature`'s explicit `speciesId` parameter for
  both. No data field enforces this today (the boss's own `SpeciesCreature` shape carries no
  `speciesId` -- it's a `materializeCreature` call argument, not stored data), so it is currently
  unenforceable and untested. Whichever future slice builds the boss-runner (or a dedicated
  boss-runner brief, if one lands first) must pass `SPIDERS_SPECIES_ID` explicitly to both calls.
  **Resolved in Slice I** (PR #65 review): `BossEncounter.speciesId` is now real, enforced data
  (`generateFloor`'s boss branch passes it to `materializeCreature` for the boss herself, and each
  add's own speciesId is separately resolved from the biome's `speciesPool`, invariant-checked) --
  see `data/biomes.test.ts`'s "Boss floors" describe block and `golden-broodmother.test.ts` (the
  count-3/count-2 Swarm Call trace this bullet was itself waiting on).
- **`starters.ts` registry retrofit**: move its inline trait/spell consts into
  `traits.ts`/`spells.ts`, closing the two-pattern window this slice's own earlier follow-up
  fixed for `overgrowth.ts` (see "Follow-up fix: where species-authored content lives" above).
  Flagged there as a deliberate, not-yet-done follow-up; the review repeats the same
  recommendation, ideally before H2 lands another species file.

### Deliberately out of scope for Slice H1 (later slices)

Glimmerdark / Rotcap Hollow real content (H2/H3, including Web's own two-way turn-order-status
sibling at Blindclaws' act-first pole); the Broodmother boss-encounter runner (see the ASSUMPTION
above -- future UI/store wiring); the integration pass and this record's closing section (I).

## Slice H2 — Glimmerdark (floors 11–20)

Built against `.claude/species/species-locked.md`'s Biome 2 table, directly into the new
`data/traits/`/`data/spells/` library shape the carrier reorg left in place. **Correction (see
the PR #60 review below):** the initial submission claimed "zero new engine primitives" — that
turned out to be wrong on two counts, both caught in design review, both now built. This section
describes the slice's **final shipped state**; the review subsection documents exactly what
changed from the initial submission and why, per this project's own phase-docs-precision
discipline (state what changed, don't silently rewrite history).

### What was built (final state)

`src/data/traits/glimmerdark.ts` — 18 real per-creature traits + the Leech Sovereign's boss
trait, following the same enabler/payoff/amplifier (common/uncommon/rare) framing H1 used, except
where species-locked.md names one SHARED mechanic instead of a two-role chain (Resonants) or
three DISTINCT verbs toward the same theme (Gloomjaws, post-review):

- **Glowflies** (Wit/Instinct) — Charger (`on-turn-start` → apply a Glow stack to the
  highest-Attack living ally, deterministic selector); Detonator (`on-attack` → the CANONICAL
  `consume-stacks` shape from `effect-types.ts`'s own doc comment: reads/clears its own Glow,
  bursts Intelligence-scaled damage at its target, scaled by the consumed count); Radiant
  (amplifier, Vitality coverage sprinkle — `on-fight-start` → charges the WHOLE team with 2 Glow
  stacks at once, breadth over depth, never combining Charger/Detonator's own halves).
- **Blindclaws** (Instinct) — Setter (`on-turn-start` → grants `grant-act-first` to the
  highest-Attack living ally); **Striker** (payoff — PR #60 review, C1/E1: a real
  `conditional-damage-bonus` on `acted-before-target`, +35% dealt when it would act before its
  target — see the review subsection for why the initial `ambush-strike` script was wrong and
  what it took to make this a real passive trait); Vanguard (amplifier — `on-turn-start` →
  re-grants itself `grant-act-first` every turn, self-sufficient, never needing Setter).
- **Resonants** (Wit) — all three share `on-action-observed` (`relationship: 'ally', actionKind:
  'cast'`), the species-locked.md-confirmed lone real consumer of that system: Chorus (+5%
  Attack, and the biome's one cast-role creature — reinforces its own "caster synergy" identity
  by being a caster itself), Adept (+8% Intelligence), **Overtone** (amplifier — PR #60 review,
  E2: echo-cast, replacing the initial "gain both stats" filler — see the review subsection).
- **Sparkeaters** (Wit/Violence lean; PR #60 review, C2: per-creature affinity now matches the
  stat each drains) — a flat "stat parasite" identity with no enabler/payoff chain: Leech
  (violence, drains 10% Attack per hit, `~free` per species-locked.md's own note — two
  `apply-stat-modifier` responses on one hook), Gorger (endurance, drains 10% Defence),
  **Voidmaw** (rare, Vitality coverage sprinkle — PR #60 review, C3: a max-HP parasite that feeds
  the whole team, replacing the initial "steal both Attack and Defence" — see the review
  subsection).
- **Gloomjaws** (Violence) — PR #60 review, C4: **three DISTINCT verbs**, not one shared mechanic
  at three magnitudes (superseding both the initial submission AND species-locked.md's own
  original "single shared mechanic" framing — the design doc is updated to match, confirmed
  already in this branch's working tree). Stalker (unchanged — `conditional-damage-bonus`, +30%
  dmg below 30% HP, the finisher); **Executioner** (`on-kill` → permanent +15% self Attack, a
  snowball off finishing blows, not a bigger execute number); **Ravager** (unconditional 30%
  `armor-penetration`, its WHOLE identity now — softens healthy targets into the rest of the
  species' execute range, rather than a redundant bigger conditional-damage-bonus stacked on top
  of armor-pen).
- **Shellbacks** (Endurance) — Warden (`on-turn-start` → +10% team Defence, compounding, the
  "Builder"); Brawler (payoff/"attacker" — `stat-remap` slot `attack` ← `defence`, armor-as-weapon
  literally, paired with a correspondingly high-Defence/low-Attack base stat line); Bulwark
  (amplifier — `on-damage-taken` → `deal-damage` with `scalingStat: 'defence'`, the DEFENSIVE
  mirror of Brawler's offensive trick, CONVENTIONS' own named Thorns/Shield Bash example).
- **The Leech Sovereign** (floor-20 boss) — `on-attack` → the exact Sparkeater-Leech shape at
  boss scale (steal 20% Attack per hit, permanent, both directions), deliberately the ONE
  mechanic species-locked.md's own "lean identity (no heavy add layer)" calls for — no
  `_ADDS` export, unlike the Broodmother.

`src/data/spells/glimmerdark.ts` — 10 real spells (two per affinity, mirroring H1's exact
density/pattern: a plain single-target damage spell + a support/debuff spell per affinity, no
affinity carries two plain damage spells). One notable cross-species tie-in: **Beacon Charge**
(Wit, `heal` payload + `appliesStatus: glow`) lets ANY caster charge an ally with Glow, not just
Glowflies — a direct exercise of species-locked.md's own "a spell may apply any status, including
another species' signature one" rule. (Untouched by the review pass — see its own "explicitly
NOT in this PR" scope note re: spell-pool overlap, a separate follow-up brief.)

`src/data/statuses.ts` — two new real statuses, additive alongside the Phase 3/H1 set (same
guardrail as H1): **Glow** (an ordinary `damage-modifier`, direction `'dealt'`, `polarity:
'buff'`, +8%/stack, cap 5, duration 4 — no new StatusDef category needed, "+% damage dealt per
stack while held" IS the dealt pool's existing per-stack additive term) and **grant-act-first**
(a `turn-order-status`, `position: 'first'`, the exact same primitive Web already proved at the
opposite pole — no `breakChancePercent`, unlike Web, since nothing breaks this early per
species-locked.md).

`src/data/biomes.ts` — `BIOMES[1]` (floors 11–20) now the real `GLIMMERDARK_BIOME`, replacing its
Slice A placeholder; slots 3–10 unchanged.

**`src/data/scripts.ts` carries NO Glimmerdark-specific script** — the initial submission's
`ambush-strike` was deleted in review (see below). `STOCK_SCRIPTS` is back to the same 5 generic
templates every prior slice shipped.

### PR #60 design review: two engine additions, four content redesigns, one deletion

Design-owner review of the initial submission. Gates were green and the content was faithful to
the primitives *as understood at submission time*, but review found one load-bearing mistake and
several redesigns needed. Nothing below is speculative — every item was actioned in this same
branch before merge.

**C1 — Blindclaws' Striker: a script is never a creature's identity.** The initial submission
gave Striker a bespoke `ambush-strike` stock script (attack when ahead in turn order, else
Defend) to work around `acted-before-target` only ever evaluating `true` via a scripting rule's
own `ruleTargeting`. This was wrong: **action-selection is the scripting/AI layer's job** — a
player who later owns a Striker and rescripts it would have silently lost the creature's entire
mechanic, since the mechanic WAS the script. Fixed by completing the condition itself instead
(E1, below) so Striker's payoff is a real, permanent `conditional-damage-bonus`
(`actionKind: 'attack'`, `condition: {kind: 'acted-before-target'}`, +35% dealt). The invented
`cross-stat` Speed→Attack filler effect (never in the design) was dropped. `AMBUSH_STRIKE_SCRIPT`
and its test are deleted outright; `blindclaws-striker`'s `defaultScriptId` is back to
`always-attack`.

**E1 — `acted-before-target` completion (required by C1).** `conditions.ts`'s
`acted-before-target` case previously returned `false` unconditionally without `ruleTargeting` —
but `gatherConditionalDamageBonus` (resolution.ts) already passes the CURRENT damage target as
`resolvingAgainstId`, and `evaluateCondition` already resolves that into `resolvingAgainst` (for
the 'target'-subject `hp-percent`/`has-status` conditions). The case just hadn't consulted it.
Completed: `ruleTargeting` still wins when present (scripting path unchanged, RNG-free peek);
falls back to `resolvingAgainst?.id` otherwise. RNG-free either way; churns no existing golden
(Striker is the first and only real consumer). Four new unit tests in `conditions.test.ts`
(falls back correctly, false-via-fallback, `ruleTargeting` still wins when both are present, plus
the pre-existing "false without either" case re-verified unchanged).

**C2 — Sparkeater affinities now match the stat each drains.** Per CLAUDE.md's affinity→stat
soft-mapping (Violence↔Attack, Endurance↔Defence): `sparkeater-leech` wit→violence,
`sparkeater-gorger` violence→endurance; `sparkeater-voidmaw` stays vitality. Side effect: the
biome's affinity spread flattens from the initial submission's lopsided count to a clean 4/4/4/4/2
(Wit/Instinct/Violence/Endurance/Vitality).

**C3 — Sparkeater Voidmaw: a genuinely distinct mechanic, not "both stats."** The initial
`SPARKEATER_VOIDMAW_TRAIT` stole both Attack and Defence — a diluted copy of Leech+Gorger, not a
distinct mechanic (the same mistake the H1 follow-up pass caught and fixed for Overgrowth's
amplifiers). Replaced with a max-HP parasite that feeds the whole team: `on-attack` → steal 10%
max Health from the target (`apply-stat-modifier`, `stat: 'health'`, `factor: 0.9`) — which also
clamps the target's CURRENT hp down if it was above the new max (`resolution.ts`'s existing
post-stat-modifier clamp, `HpClamped`) — **and** raise every living ally's (including its own)
max Health by 5% (`target: {kind: 'all-allies'}`, `factor: 1.05`) — a ceiling raise only, no
auto-heal, same precedent Treant Grovekeep's one-time team +max-HP already established, just
repeating every attack instead of firing once (hence the smaller per-hit number).

**C4 — Gloomjaws: three distinct verbs, not one mechanic at three magnitudes.** The initial
submission gave all three creatures `conditional-damage-bonus` at escalating percent/threshold —
numerically distinct, mechanically identical (the exact anti-pattern the H1 follow-up pass named
and fixed for Overgrowth). Stalker keeps its finisher role unchanged. Executioner is now a
snowball: `on-kill` → permanent `apply-stat-modifier` self Attack ×1.15 (mirrors Grudge's
`on-ally-death` shape, and previews Rotfeeders' own `on-kill`/`on-enemy-death` carrion-snowball
identity, H3) — it pays off from kills, not from a target's HP being low. Ravager is now
UNCONDITIONAL `armor-penetration` at 30% as its whole identity (dropped its own
`conditional-damage-bonus` entirely) — it doesn't hit low-HP targets harder, it gets every target
into low-HP range faster. This contradicts species-locked.md's original "self-contained... single
shared mechanic" framing for this species; **the design doc's own copy of that table row is
already updated in this branch's working tree** to describe the three-verb version (confirmed by
reading `.claude/species/species-locked.md` directly, not assumed) — no further doc edit needed
from this side.

**E2 — Resonant Overtone: echo-cast, not "gain both stats."** Species-locked.md's actual spec:
`on-ally-action (cast) → 10% the caster echo-casts a random one of its own spells` (non-stacking;
echoes are themselves observable). Built per CONVENTIONS' own H2 addenda (`echo-cast` — NOT a
10th response verb; reuses the bonus-cast pattern) and `species-locked.md`'s own Resonants row,
both already present in this branch's working tree at review time:

- `TriggeredDef` (effect-types.ts) gains two new fields: **`stacks?: boolean`** (a GENERAL dedup
  flag — `false` means at most one instance of that exact effect, matched by `sourceTraitId`, is
  even allowed to roll `chancePercent` per firing of a hook; the "claim" happens BEFORE the roll,
  not just on success, so the aggregate chance of firing stays exactly `chancePercent` no matter
  how many creatures carry the same effect — kept general, not echo-cast-specific, though Overtone
  is its only v1 consumer) and **`echoCast?: boolean`** (when true, firing this effect does NOT
  call `executeResponse` at all — `response` becomes a structurally-required but functionally-inert
  placeholder, `{kind: 'grant-action-state', target: {kind: 'self'}}` — instead `fireHook` invokes
  a new caller-supplied `onEchoCast` callback with `(observerId, casterId)`, exempted from the
  self-re-entry guard — `cascade.activeInstances` is deliberately never touched for this branch —
  so a chain can revisit the SAME Overtone instance on a later hop; only `cascade.depth`/
  `MAX_TRIGGER_CASCADE_DEPTH` bounds it).
- `ResolvedHookEffect` gains matching `nonStacking?: boolean` / `echoCast?: boolean` fields (named
  differently from `TriggeredDef`'s own `stacks`/`echoCast` to avoid colliding with
  `ResolvedHookEffect`'s PRE-EXISTING, unrelated `stacks?: number` — a status's live stack count).
  `effects.ts`'s `effectsForHook` threads both through from a `TriggeredEffect`'s own fields;
  status-sourced entries never set either.
- `fireHook` (resolution.ts) gains an 8th, optional parameter, `onEchoCast?: EchoCastExecutor`
  (`(observerId, casterId, state, events, cascade) => CombatState`) — supplied ONLY by combat.ts's
  two `on-action-observed` dispatch sites (`executeCastSingle`/`executeCastAoe`), so `echoCast` is
  inert everywhere else. A `claimedNonStacking` Set, scoped to one `fireHook` call, implements the
  `stacks: false` dedup (claimed right after the depth-cap check, right before the `chancePercent`
  roll — a depth-capped effect never claims a slot either).
- `combat.ts` gains `runEchoCast` (a `maybeFireBonusCast` SIBLING, per CONVENTIONS' own framing):
  draws a uniformly-random equipped gem (may repeat the just-cast spell), then a random valid
  target for its shape/side (`random-enemy`/`random-ally` via `target-selectors.ts`'s existing
  `resolveTargetSelector`, reused rather than duplicated), then runs the real cast through
  `executeCastSingle`/`executeCastAoe` with the AMBIENT `cascade` (never a fresh one, so depth
  keeps accumulating across chained echoes instead of resetting — CONVENTIONS' own explicit
  warning against copying `maybeFireBonusCast`'s `newCascade()` here). A dead-by-resolution caster,
  zero equipped spells, or no valid target all fizzle silently (no event) — same discipline as
  `applyStatusIfAlive`'s corpse guard / Spore's own spread-on-death.
- A new **`EchoCastGranted`** intent event (types.ts) marks an echo distinctly from an ordinary
  `SpellCast` (CONVENTIONS offered either an `echoed: true` marker on `SpellCastEvent` or a
  dedicated event; this project took the dedicated-event route, mirroring `TriggerFired`'s own
  precedent, since `SpellCastEvent`'s shape is shared by every non-echo cast site too).
- `RESONANT_OVERTONE_TRAIT` (traits/glimmerdark.ts): `chancePercent: 10`, `stacks: false`,
  `echoCast: true`, `observationFilter: {relationship: 'ally', actionKind: 'cast'}`.

**ASSUMPTION (own decision, not literally pinned by CONVENTIONS or species-locked.md):** neither
doc specifies the exact plumbing shape (a callback vs. some other mechanism) for how `fireHook`
hands off to `combat.ts`'s cast executors without a `resolution.ts → combat.ts` import cycle —
CONVENTIONS names the MECHANISM ("a `combat.ts` mechanism... invoked at the `on-action-observed`
dispatch... structure it as a sibling of `maybeFireBonusCast`") without pinning the exact
authoring shape, the same "brief names the mechanism, not the shape" pattern every prior slice's
own genuinely-new primitive (`action-instance`, `splashing`, the six Slice C categories, ...) was
built under. The dependency-injected `onEchoCast` callback (threaded through `fireHook`'s own
signature, populated only by combat.ts) is this slice's own proposed shape, chosen because it lets
`fireHook` keep owning the chancePercent/observationFilter/`stacks`-dedup/depth-cap gate generically
(reused, not duplicated) while the actual cast execution — which only combat.ts can reach — happens
exactly once, at exactly the right point in the sequence, with zero double-rolling of RNG.

**Test-coverage note (own decision, flagged not silently resolved):** the review's own suggested
Overtone golden ("a fixture observer at `chancePercent: 100` with a low forced depth so the chain
length is exact and hand-derivable") turns out to be structurally impossible as a FULL
`createCombat`/`resolveTurn` event-log replay — `on-action-observed` (and therefore any echo
chain) fires BEFORE that action instance's OWN damage lands, all the way down the recursion, so no
target can ever die mid-chain to bound it naturally; at `chancePercent: 100` the chain is
genuinely unbounded except by `MAX_TRIGGER_CASCADE_DEPTH` (500), and 500 real events isn't
"hand-derivable." Resolved by splitting the coverage by layer, matching this codebase's own
existing precedent (`resolution.test.ts`'s pre-existing 'loop safety' describe block already
white-boxes `MAX_TRIGGER_CASCADE_DEPTH` the identical way, for `on-damage-taken`): the MECHANISM
(dedup, self-re-entry exemption, depth-cap termination) gets exact, hand-derivable unit-test
coverage directly against `fireHook` with a hand-built `CascadeState` (see Tests, below); the REAL
CONTENT gets its own end-to-end golden at Overtone's real `chancePercent: 10`, seeded so exactly
one echo fires before the chain's own next roll fails naturally — proving the shipped trait works,
not just the primitive.

**Explicitly out of scope for this review pass** (per the review's own instruction): the
Glimmerdark/Overgrowth spell-pool overlap. Every spell (`GLIMMERDARK_SPELLS` included) is
untouched; the cumulative-unlock rework that would remove the duplicates is
`.claude/briefs/phase-4-cumulative-spell-unlock.md`, scheduled between H2 and H3.

### Tests

**547/547** (up from the data-layer-carrier-reorg's 518 — 29 net new across the whole slice,
initial submission + review) across **89 files** (up from 79 — 10 new: `data/species/
glimmerdark.test.ts` + 9 golden `.test.ts` files, each paired with its own `.fixture.ts`;
`data/scripts.test.ts`/`data/biomes.test.ts`/`conditions.test.ts`/`resolution.test.ts` gained new
`it` blocks without becoming new files — `data/scripts.test.ts`'s own `ambush-strike` test was
deleted, not just modified, along with the script it covered).

- `data/species/glimmerdark.test.ts` — the loader/shape test (H1/H2 common checklist item 6):
  6×3 = 18 creatures, unique species/creature ids, positive draw weights, exactly one innate
  trait per creature resolving in `TRAIT_REGISTRY`, every `defaultScriptId` resolving in
  `STOCK_SCRIPTS_BY_ID`, base stats in the 10–30 range, affinity-complete across all 5 affinities
  (4/4/4/4/2 post-C2), exactly one cast-role creature with ≥1 affinity-matched spell, every
  status-applying spell resolving in `STATUS_REGISTRY`, the biome wiring its real pools, and the
  Leech Sovereign's own trait/stat-range checks.
- `data/biomes.test.ts` — slot 2 asserted as the real, non-empty Glimmerdark biome; slots 3–10
  keep the placeholder shape.
- `conditions.test.ts` — E1's four new cases (see above).
- `resolution.test.ts` — a new `'echo-cast'` describe block, four unit tests directly against
  `fireHook` (mirroring the file's own pre-existing 'loop safety' white-box style): `onEchoCast`
  fires with the correct `(observerId, casterId)` and the placeholder response is genuinely never
  executed (proven via an intentionally loud placeholder — `factor: 2` — that would be
  unmistakable if it ran); `stacks: false` dedup — two creatures sharing one effect id yield
  exactly one `onEchoCast` call; the self-re-entry exemption — the SAME effect instance fires
  again on a simulated nested `fireHook` call within the same cascade; and the depth-cap
  termination itself — a cascade pre-seeded 2 hops from `MAX_TRIGGER_CASCADE_DEPTH` yields exactly
  2 `onEchoCast` calls then one `CascadeTruncated`, never blocked by self-re-entry.
- Nine hand-derived `__golden__` pairs, all against REAL shipped content (never fixture
  stand-ins), each proving one species' or the boss's signature mechanic end-to-end through
  `createCombat`/`resolveTurn`:
  - `golden-glowfly-detonator` — Charger charges Detonator (real `highest-attack-ally` pick, real
    stats), Detonator's `on-attack` consumes it for an Intelligence-scaled burst BEFORE its own
    base hit, proving Glow's dealt-mod never contributes to either hit once consumed (same
    invariant the Slice D fixture-shaped `golden-consume-stacks` proved, now against real
    content).
  - `golden-blindclaws-striker` — re-derived post-review for the trait mechanic: round 1's queue
    is frozen before Setter's grant lands, so Striker's attack lands at its base rate; round 2's
    queue reflects the (still-active) grant, so the SAME attack now carries the +35%
    `conditional-damage-bonus` — a damage DELTA, not an attack-vs-Defend behavior change.
  - `golden-resonant-harmonize` — a single cast observed by BOTH the caster itself (Chorus,
    `relationship: 'ally'` includes self) and a separate ally (Adept) in the same firing, proving
    the "ally includes self" rule concretely against real content.
  - `golden-resonant-overtone` — NEW (E2): real content at Overtone's real `chancePercent: 10`
    (SEED 7's exact mulberry32 trace), proving one echo fires, its own re-observation rolls again
    and fails (chain stops at exactly one hop), and — the one genuinely surprising consequence of
    "on-action-observed precedes that instance's own payload" — the echo's own damage lands
    BEFORE the original cast's own damage, even though the original cast was declared first.
  - `golden-gloomjaw-stalker` — two real hits, one round apart (a rigged low-HP `currentHp`
    override doesn't survive `createCombat`'s fight-start reset to effective max HP, confirmed by
    grep — no existing golden does this): no bonus at full HP, +30% once the target's first hit
    drops it below the 30% threshold. (Unchanged by C4 — Stalker's own trait didn't change.)
  - `golden-gloomjaw-executioner` — NEW (C4): two kills, one per round, proving the on-kill
    Attack buff COMPOUNDS (a fresh `StatModifierEffect` appended each kill) — the second kill's
    hit is already bigger purely from the first kill's own buff.
  - `golden-gloomjaw-ravager` — NEW (C4): a single hit against a non-trivial Defence value,
    proving armor-penetration genuinely reduces the DEFENCE fed into the subtractive core (not a
    dealt-pool bonus), at full target HP (well above any execute threshold) so a
    conditional-damage-bonus alone would have contributed nothing here.
  - `golden-sparkeater-voidmaw` — NEW (C3): both halves of the asymmetry in one hit — the
    target's max-HP steal clamps its current HP down (`HpClamped`), the team's max-HP rise
    (`all-allies`, including Voidmaw itself) does NOT auto-heal (no clamp event for a rise).
  - `golden-leech-sovereign` — two hits proving the snowball COMPOUNDS (fresh
    `StatModifierEffect`s appended each firing, folding multiplicatively — never a refreshed
    single instance): the Sovereign's own Attack and its target's both shift further on hit 2
    purely from hit 1's own steal.

Full Phase 1–3 + Slice A–G + H1 + carrier-reorg suite re-verified byte-identical (the full
`npm run test` run above includes every pre-existing test file passing unmodified). `lint` /
`format:check` / `build` all clean, verified after every stage of the review pass, not just once
at the end.

### Deliberately out of scope for Slice H2 (later slices)

Rotcap Hollow real content (H3, including Spore's spread-on-death and Confusion's own real
statuses); the Broodmother/Leech Sovereign boss-encounter runner (still not built by any slice —
Slice G's store only ships `recordBossKill`/`bossesCleared` as state); the integration pass and
this record's closing section (I).

## Slice H3 — Rotcap Hollow (floors 21–30)

Built against `.claude/species/species-locked.md`'s Biome 3 table, directly into the same
`data/traits/`/`data/spells/` library shape H1/H2 established. This section describes the
slice's **final shipped state**, after both a content-review pass and a PR #64 design review
(four real engine bugs + eight content/doc revisions) — see those reviews' own subsections below
for exactly what changed and why, per this project's own phase-docs-precision discipline.

### What was built (final state)

`src/data/traits/rotcap-hollow.ts` — 18 real per-creature traits + the Rot Sovereign's boss
trait, the same enabler/payoff/amplifier (common/uncommon/rare) framing H1/H2 use, except
**Necromoss** (like Glimmerdark's Resonants) shares ONE mechanic across all three creatures,
escalating scope/strength by rarity rather than chaining a two-role trick:

- **Sporecloud** (Wit) — Seeder (`on-attack` → apply Spore to its target); Reaper (`on-attack` →
  a bonus `deal-damage` rider, Intelligence-scaled, magnitude a LIVE `magnitudeSource` count of
  `enemies-with-status: spore` — the exact Broodmother "Swarm Call" shape, never frozen; PR #64
  review fix 4 makes this a true no-op, not a min-1 chip hit, when that count is 0); Bloomer
  (amplifier — `on-fight-start` → Spore the WHOLE enemy line at once, breadth over Seeder's
  per-hit trickle, the Glowfly-Radiant/Swarmhive-Queen pattern).
- **Rotfeeders** (Violence/Vitality) — Scavenger (`on-enemy-death`, an OBSERVER hook — permanent
  +10% self Attack on ANY enemy death, not just its own kills); Ripper (`on-kill` → `heal` in
  `scalingStat` mode, 15% of its own effective Health); **Gorgemaw** (amplifier, Vitality — a
  third, genuinely distinct verb: `on-kill` → heals itself 10% AND permanently raises its own max
  Health 5%, "grows fatter, not just angrier," never a numeric combination of its species-mates'
  own effects).
- **Myconet** (Endurance/Wit) — Warder (`on-ally-death` → +15% Defence to all surviving allies, a
  fresh `StatModifierEffect` per firing); Rotcore (Wit — `on-death` → Poison the whole
  `all-enemies` side); **Gravedigger** (amplifier — `on-ally-death` → heals ITSELF 20% instead of
  buffing the team, a genuinely distinct SELF-sustain reaction).
- **Necromoss** (Wit/Vitality) — the Resonants-shaped "one mechanic, escalating by rarity"
  species: Wisp (`on-turn-start` → `heal` in `scalingStat` mode with `magnitudeSource: {kind:
  'count', of: 'dead-allies'}` — Slice E2's own named Necromoss consumer, exercised for the first
  time against real content); Thicket (the BUFF half of the same idea — `on-ally-death` →
  `apply-stat-modifier`, a FLAT +10% per death, no `magnitudeSource` — PR #64 review fix 5
  simplified this from an earlier draft that scaled the same response's own factor by the live
  dead-ally count); **Hollowroot** (amplifier, Vitality — the same heal as Wisp, targeted at
  `all-allies` instead of `self`; the biome's one cast-role creature, `defaultScriptId:
  'always-cast'` — its `on-turn-start` trigger is unaffected by which action it takes).
- **Hollowkin** (Endurance/Instinct) — Wretch (`on-damage-taken` → Confuse whoever just struck
  it); Marionette (`on-attack` → Confuse whoever it hits); **Puppeteer** (Instinct, payoff, not
  another enabler — a `conditional-damage-bonus` on `has-status(target, confusion)`, +30% dealt,
  the amplifier that profits from Confusion rather than applying it).
- **Sporch** (Violence/Wit) — Igniter (`on-attack` → apply Burn at 2 stacks, potent and
  deliberately non-spreading); Ashborn (`conditional-damage-bonus` on `has-status(target,
  burn)`, +30% dealt — the target-conditional damage-modifier species-locked.md's own table
  flagged this species as needing Slice E2 for); **Cinderlord** (amplifier — `on-kill` → Burn the
  WHOLE remaining `all-enemies` side at an explicit `stacks: 1` — PR #64 review fix 6 — a
  creature-level death-burst, not the Burn STATUS itself gaining a spread trigger; Burn stays
  non-spreading at the status level).
- **The Rot Sovereign** (floor-30 boss) — two death-reactive growth hooks realizing species-
  locked.md's "any creature that dies feeds it" without inventing a new `CountOf`:
  `on-ally-death` (her own adds dying) AND `on-enemy-death` (the PLAYER's own creatures dying ALSO
  feeds her), both a FLAT +10% Attack per death event, the SAME rate either way, no
  `magnitudeSource` on either (PR #64 review fix 5 — replacing an earlier draft's mismatched
  +15%-scaled/+5%-flat split) — plus an unconditional `on-turn-start` → Spore the whole
  `all-enemies` side. `ROT_SOVEREIGN_ADDS` (Sporecloud Seeder + Rotfeeder Scavenger, real roster
  members) follows the Broodmother's own `_ADDS` export precedent.

`src/data/spells/rotcap-hollow.ts` — 5 real spells (one per affinity, per GAME_DESIGN §4's
≥4–5-own-spells-per-biome bar), each introducing a mechanic the inherited biome-1/2 pool doesn't
already carry: **Spore Cyst** (Wit, first spell-authored Spore, `spellPower` 0.45 — PR #64 review
fix 8), **Rasping Chant** (Endurance, first single-target enemy Defence debuff on this affinity),
**Puppet String** (Instinct, first spell-authored Confusion, `spellPower` 0.8 — content review),
**Charnel Feast** (Vitality, first AOE support spell on this affinity), **Withering Bolt**
(Violence, first spell-authored Burn, `spellPower` 0.45 — PR #64 review fix 8). Verified unique
under the dedup guard (`data/spells/index.test.ts`'s `(affinity, targetShape, payload,
spellPower)` key) against all 17 pre-existing spells by hand before picking each `spellPower`.

`src/data/statuses.ts` — two new real statuses, additive alongside the Phase 3/H1/H2 set (same
guardrail as H1/H2): **Spore** (a `ConditionStatusDef` with TWO triggers, the Sleep-established
pattern — an `on-round-end` DoT tick, 4% of the bearer's own effective max HP/stack/round, PLUS
an `on-death` → spread trigger living on the STATUS itself, not a species trait — see the engine
addition below) and **Confusion** (a `FriendlyFireStatusDef`, `chancePercent: 50`,
`defaultDuration: 3` — the primitive itself was built in Slice C; this is its first real
producer/consumer).

`src/data/biomes.ts` — `BIOMES[2]` (floors 21–30) now the real `ROTCAP_HOLLOW_BIOME`, replacing
its Slice A placeholder; slots 4–10 unchanged (renumbered from the prior "slots 3–10" placeholder
range now that this slot is real).

### Engine addition: `random-ally-without-status`

Spore's spread-on-death ("spreads to a living, non-Spored enemy... fizzles if none",
species-locked.md) needs a target selection no existing `TargetSelector`/`ResponseTarget` could
express — "a living ally of the dying bearer that does NOT carry a given status." The
implementation-plan's own ASSUMPTION 30 originally proposed this could land without a new engine
primitive; **that did not hold** — no existing selector can filter by status, so this slice adds
one genuinely new `ResponseTarget` variant, `{ kind: 'random-ally-without-status', statusId:
string }`, the same shape `random-dead-ally` (Slice B) already set precedent for ("an existing
selector kind can't express this specific exclusion"):

- `effect-types.ts` — `ResponseTarget` grows the new variant.
- `resolution.ts` — `resolveResponseTargets` grows a matching case: `livingAlliesOf(self,
  state).filter(c => !hasStatus(c, target.statusId))`, then a random pick via `state.rng` (reused
  from `hasStatus`, `effects.ts`, no new helper needed).
- `statuses.ts` — Spore's spread is a **trigger declared on the STATUS itself** (its own
  `on-death` entry in `SPORE.triggers`), not a species trait — any Spore bearer spreads it on
  death regardless of which creature or spell originally applied the status.
- Read relative to `self` (the dying Spore bearer) — `livingAlliesOf` resolves off `self.side`
  only, never `self.alive`, so this works correctly even when `self` is the just-died creature
  firing its own `on-death` trigger (confirmed by `golden-spore-spread` and
  `golden-spore-spread-dot-kill` below, not just asserted).
- An empty pool returns `[]` from `resolveResponseTargets`. This is a **targeting fizzle, not a
  suppressed trigger**: the owning trigger's `TriggerFired` has already been emitted by `fireHook`
  before `executeResponse` runs, so it still fires — only the response's own consequence (the
  `StatusApplied` that would otherwise follow) is skipped. (An earlier draft of this doc described
  this as a "silent no-op" with "no event" — wrong; corrected per PR #64 review item 13, along
  with the matching wording in `effect-types.ts`'s and `data/statuses.ts`'s own doc comments.)

**Host-relative reading, ratified:** species-locked.md's own wording, "spreads to a living,
non-Spored *enemy*," means another member of the SAME side as the dying bearer — the population
the contagion already infected — not the opposing side relative to the bearer's own engine-`self`.
This matches the biome's own "colonies, spores, decay... spread" mood (a contagion spreading
through the population it's already hit, not jumping to benefit whoever applied it) and is the
design owner's ratified reading, not an open question.

### PR #64 review: four engine bugs, four content revisions

Design-owner review of the PR, driven by a four-case repro file (`pr64-repro.test.ts`,
scratch, never committed) that failed all four cases on the branch as submitted. All eight items
were actioned in this same branch; every engine fix was verified to keep the full pre-review
suite (586 tests at the time) byte-identical before its own new golden was added.

**Engine fixes:**

1. **Spore must spread when its own DoT tick kills the host.** Both of Spore's triggers (the
   `on-round-end` tick and the `on-death` spread) shared the status's single `instanceId` as their
   self-re-entry guard key in `effectsForHook` (`effects.ts`) — the tick's own firing added that
   instanceId to `cascade.activeInstances` and had not yet removed it by the time its own lethal
   damage cascaded into `on-death`, so the guard skipped the spread trigger as if it were trying to
   re-enter ITSELF. Fixed: each `ConditionStatusDef` trigger now gets its own derived guard
   identity, `` `${instanceId}#trigger#${index}` ``, for this guard-only purpose — refresh,
   removal, and the round-end sweep snapshot all still key off the REAL status `instanceId`
   (`ActiveEffect.instanceId`), untouched. Golden: `golden-spore-spread-dot-kill`.
2. **A status born or refreshed mid-sweep must not tick in that same sweep.** `resolveRoundEndSweep`
   (`combat.ts`) fired `on-round-end` unconditionally for every living creature's current
   `activeEffects`, with no check against the sweep's own start-of-sweep snapshot — a status
   applied MID-sweep (e.g. Myconet Rotcore's `on-death` Poison-burst, itself triggered by a DoT
   tick killing Rotcore earlier in the same sweep) would also tick before that sweep finished.
   Fixed: `fireHook` (`resolution.ts`) gains a 9th, optional `statusTriggerGate` parameter,
   supplied only by `resolveRoundEndSweep` — a condition-status's on-round-end trigger now fires
   only if `(creatureId, statusId)` existed in the sweep's own snapshot AND has not been
   (re)applied earlier in that same sweep (a live scan of `events` from the sweep's own start,
   checked fresh at each candidate's own firing point — order-dependent by design, since an early
   `StatusApplied` must gate a LATER creature's tick of that same status within the one sweep
   pass). Trait-sourced (non-status) triggers have no `statusId` and are never gated. The
   pre-existing decrement/expiry gate (`decrementAndExpireSnapshot`'s own snapshot-only iteration)
   was already correct and untouched — this fix only closes the analogous gap on the TICK side.
   Golden: `golden-round-end-mid-sweep-poison`. `golden-round-end-interaction` and `golden-dot`
   (the two prior goldens flagged as most likely affected) re-verified byte-identical.
3. **`triggering-source` never resolves to the firing creature itself.** A DoT tick's
   `deal-damage` response targets `{kind:'self'}` (the bearer damages itself), so
   `applyDamageAndEmit`'s `sourceId === targetId` — `on-damage-taken`'s hook context then has
   `context.source === context.self`, and a retaliatory trait (e.g. Hollowkin Wretch's real
   `on-damage-taken → apply-status(triggering-source, confusion)`) would apply its response to its
   OWN bearer. Fixed: `resolveResponseTargets`'s `triggering-source`/`triggering-ally` cases
   (`resolution.ts`) now return `[]` when `context.source === context.self` — `TriggerFired` still
   fires (already emitted before this resolves), only the response's own effect fizzles.
   `on-damage-taken` itself still fires unconditionally for a DoT tick (Sleep's wake-on-damage
   depends on it) — this fix narrows targeting only, never hook firing. Golden:
   `golden-hollowkin-wretch-self-dot`.
4. **A zero `magnitudeSource` count is a full no-op.** A `deal-damage`/`heal` response whose live
   count resolved to 0 (e.g. Sporecloud Reaper's bonus rider with zero Spored enemies) still went
   through the full damage formula at `spellPower × 0 = 0` — and the formula's own unconditional
   `MAX(1, floor(raw))` clamp still landed a "hit" for 1 damage, since the clamp has no way to know
   the magnitude was meant to be nothing at all. Fixed: both `executeResponse` cases
   (`resolution.ts`) now short-circuit to a full no-op — no `DamageDealt`/`HealApplied`, no
   downstream damage-path hooks — the instant `response.magnitudeSource` is present and its
   resolved count is exactly 0; `TriggerFired` is unaffected (already emitted). Also affects Spider
   Broodwarden and Lullpollen Dozer (H1) at the zero-count edge, though neither's own existing
   golden happened to exercise that edge, so neither needed re-deriving. Golden:
   `golden-sporecloud-reaper-no-spore`.

**Content revisions:**

5. **Per-death stacking, simplified.** Necromoss Thicket and the Rot Sovereign both lose
   `magnitudeSource` from their `on-ally-death`/`on-enemy-death` `apply-stat-modifier` responses,
   replaced with a flat factor per event (Thicket: Defence ×1.10 per ally death; Sovereign: Attack
   ×1.10 on both `on-ally-death` and `on-enemy-death`, the same rate for either side) — the
   compounding still happens naturally, since a repeating `apply-stat-modifier` trigger APPENDS a
   fresh `StatModifierEffect` per firing and the fold is multiplicative (two deaths is ×1.1×1.1 =
   ×1.21, not one bigger scaled jump). See `golden-rot-sovereign` (re-derived) for both hooks
   compounding in one fight.
6. **Cinderlord's Burn stack count.** `stacks: 1` is now written explicitly in the on-kill
   `StatusSpec` rather than relying on the default (also 1) — makes the intent visible at the call
   site. New golden, `golden-sporch-cinderlord-burn-stacks`: a fresh target ends at 1 stack; a
   target already at 2 stacks caps at 3 (Burn's own `cap`) with duration refreshed to 3.
7. **Affinity changes.** Necromoss Hollowroot: `wit` → `vitality` (it's the team healer and the
   biome's only caster, and Vitality is this game's healer affinity — it now rolls
   Regrowth/Wild Vigor/Afterglow/Charnel Feast instead of Wit damage spells). Hollowkin Puppeteer:
   `endurance` → `instinct` (evens out that species' own Endurance/Instinct lean). The biome's
   per-creature affinity tally is now **Wit 6 / Violence 4 / Endurance 3 / Vitality 3 / Instinct
   2** (18 total) — still affinity-complete (all 5 present) and still exactly one cast-role
   creature with ≥1 affinity-matched spell, the loader test's two actual assertions; no test
   pinned either creature's OLD affinity directly, so no test needed updating beyond the loader's
   own tally expectations (which only check set-membership and counts, unaffected).
8. **Spell power for the two DoT-applying spells.** Spore Cyst 0.9 → 0.45, Withering Bolt 0.85 →
   0.45 — the same rule already applied to Puppet String (content review, item above): a spell
   that also applies a status shouldn't lead its band on upfront damage. The reference point is
   Venom Bolt (Instinct), the game's other damage-plus-DoT spell, at 0.4. Neither value collides
   under the dedup guard.

### Tests

**103 files / 594 tests** (up from this slice's own post-content-review state of 95 files / 586
tests — 8 new files, 8 net new tests: two golden fixtures were re-derived in place, not added,
since items 5/10/11 changed their own scenarios rather than adding new ones). Full breakdown of
the `__golden__` suite added or changed by this review (including its own follow-up cleanup
pass):

- `golden-spore-spread` (unchanged) — Sporecloud Seeder's real `on-attack` trait both infects AND
  (against a pre-wounded target) kills in the same hit; Spore's own `on-death` trigger spreads to
  the dying creature's only living, still-healthy ally.
- `golden-spore-spread-filter` (new, review item 9) — a real 2-candidate draw (3 living allies,
  one already Spored, filtered out before the draw) — `Math.floor(state.rng.next() * 2)` at SEED
  1 draws index 1, verified via an independent mulberry32 replica matching `rng.ts` exactly.
- `golden-spore-spread-fizzle` (new, review item 9; cleanup pass moved it to SEED 1 and added a
  trailing `expect(state.rng.next()).toBe(0.6270739405881613)` so the "no RNG draw" claim is
  proven, not just asserted) — every living ally already Spored: `TriggerFired` fires, nothing
  follows it, no RNG draw at all (the empty-pool check returns before ever calling
  `state.rng.next()`).
- `golden-spore-spread-dot-kill` (new, review item 9 / fix 1) — the host dies to its OWN
  round-end DoT tick, not an outside hit; proves fix 1's per-trigger guard identity end to end,
  across a full round-end sweep.
- `golden-hollowkin-wretch` (unchanged) — a chip-only hit provokes Wretch's real retaliatory
  Confusion application (the redirect ROLL itself stays covered generically in `confusion.test.ts`,
  Slice C).
- `golden-hollowkin-wretch-self-dot` (new, fix 3) — Wretch's own Poison tick does not confuse
  itself.
- `golden-necromoss-reclaim` (re-derived, review item 10) — stats changed (50 max HP, 3 dead
  allies, wounded to 5) so BOTH the 5% rate and the dead-ally count actually change the floored
  heal (7, vs. 4 at the old rate or 5 at the old count) — the prior numbers (18 HP, 2 dead allies)
  floored to 1 either way and couldn't have caught a rate regression.
- `golden-sporecloud-reaper-no-spore` (new, fix 4) — Reaper lands exactly one `DamageDealt` (its
  own attack) with zero Spored enemies on the board.
- `golden-round-end-mid-sweep-poison` (new, fix 2) — the dedicated Myconet-Rotcore repro scenario
  as a full 3-round golden: Rotcore's death-Poison does not tick in its own birth sweep, then
  ticks normally starting round 2. Covers the "born mid-sweep" half of fix 2's own gate.
- `golden-round-end-mid-sweep-poison-refresh` (new, cleanup-pass follow-up to fix 2) — the OTHER
  half of the gate's AND condition: E1 already carries 1 Poison stack before the fight; Rotcore's
  death-Poison REFRESHES it to 2 stacks mid-sweep instead of newly applying it, and it still
  doesn't tick that sweep, then ticks for `2 x 3% x 100 = 6` starting round 2.
- `golden-sporch-cinderlord-burn-stacks` (new, fix 6; cleanup pass added `duration: 1` to
  ENEMY_B's pre-applied stacks so Cinderlord's own re-application visibly refreshes it 1 -> 3,
  rather than landing on the same value it already had) — a fresh target ends at 1 Burn stack; a
  target already at 2 stacks caps at 3 with duration refreshed.
- `golden-rot-sovereign` (re-derived, review item 11 / fix 5) — now covers BOTH an add's death
  (`on-ally-death`) and a player creature's death (`on-enemy-death`) in one fight, each a flat
  ×1.10, compounding multiplicatively (22 → 24.200000000000003 → 26.620000000000005, verified via
  an independent `node -e` float calculation, not hand-rounded), alongside her own turn-start
  Spore blanket (which also incidentally re-exercises Spore's own spread-fizzle when the Spored
  WEAK dies with its only living ally already Spored too).

`data/species/rotcap-hollow.test.ts` and `data/biomes.test.ts` are unchanged from the
content-review state (no new assertions needed — the affinity/spell-power changes above don't add
new invariants, they just move within the ones already checked).

**Byte-identity confirmation:** every Phase 1–3 / Slice A–H2 / carrier-reorg / cumulative-spell-
unlock / percent-hp-condition-ticks golden, and this slice's own pre-review
`golden-spore-spread`/`golden-hollowkin-wretch` pair, passed unmodified and untouched throughout
this review — `git status` after all eight fixes shows no changed file outside
`data/{species,spells,statuses,traits}/rotcap-hollow.ts`, `.claude/content/rotcap-hollow.md`, the
four engine files named in the fixes above, and the `__golden__` files listed here. `lint` /
`format:check` / `build` all clean throughout.

### Deliberately out of scope for Slice H3 (later slices)

The boss-encounter RUNNER for any of the three seed bosses (Broodmother/Leech Sovereign/Rot
Sovereign) — still not built by any slice (Slice G's store only ships
`recordBossKill`/`bossesCleared` as state); the integration pass and this record's closing
section (I).

## Slice I — Integration pass

No new engine mechanism, per the brief. Proves the whole phase composes against **real** content
and closes the phase out.

### What was built

**Real biome wiring — already done, verified rather than redone.** The brief's own first bullet
("wire `data/biomes.ts`'s real 3-biome spawn pools into `generation.ts` in place of Slice A's
fixtures") turned out to already be complete: `generation.ts` never held fixture data itself (its
own fixtures live only in its test file, `__fixtures__/biomes.ts`, per Slice A's own design — the
module takes `BiomeData` as an explicit parameter, never importing `src/data` directly); H1/H2/H3
each already replaced their own slot in `data/biomes.ts` (`BIOMES[0..2]`) with real content as
they landed, and `src/state/store.ts`'s `DEFAULT_DEPS.biomes` already pointed at that same real
`BIOMES` export from Slice G onward. Confirmed by grep: no production file under `src/engine` or
`src/state` references `__fixtures__`. The only actual work here was **doc cleanup** — two stale
comments in `store.ts` still described biomes 1–3 as placeholder-shaped (true when Slice G
shipped, false since H3): the file-header comment (now notes `integration.test.ts` as the
deliberate real-content exception to the fixture-based test convention) and `useGameStore`'s own
doc comment (now describes biomes 1–3 as real, playable content and only 4–10 as the remaining
placeholder).

**`src/state/integration.test.ts`** (new file) — the phase's one **generated-then-checkpoint-
verified** integration test, per CONVENTIONS' two-tier golden discipline: run once against the
real, zero-override store (`createGameStore()`, real biomes/specializations/starters, the fixed
default run seed), its actual output inspected, then the assertions pinned to match. Per-mechanism
correctness already rests on Slices A–H3's own focused/hand-derived goldens; this test's job is
only to prove the whole stack composes end to end and stays deterministic. Scenario: `setSpec
('brute')` → `runScriptedIntro()` (the Unicorn joins) → `descend(1)` through real floor 1's
Overgrowth content. The Brute spec was picked deliberately over Sorcerer/Shieldbarer: its
starter's signature trait is a direct, content-level exercise of Slice B's action instance-list
model (Attack resolves as two full-power instances), so this run also re-proves that mechanism
against real content, not just Slice B's own fixture-scoped golden.

Checkpointed facts (all confirmed by an actual run, not hand-traced from the formula):
- Floor outcome: all 3 of floor 1's fights won (`enemyPartySize(1)=1`, `fightCount(1)=3`),
  `cleared`/`deepestFloorAdvanced` both true, `deepestFloor` advances to 1,
  `discoveredBiomes` gains the real Overgrowth biome id.
- Reward banking: 3 kills (Treant Grovekeep — rare, Swarmhive Striker — uncommon, Snapjaw Jaws —
  uncommon), soul% gains matching `SOUL_GAIN_PERCENT` per rarity (2/5/5), `xpBanked=30`
  (`xpAwardForKill(1)=10` × 3), `currencyGained={essence:3,ore:3,bricks:3,lifeforce:3}`.
- Real species-signature mechanics fired, checked by `effectId` against the actual trait
  constants (`TREANT_GROVEKEEP_TRAIT`/`SWARMHIVE_STRIKER_TRAIT`/`SNAPJAW_JAWS_TRAIT`/
  `UNICORN_TRAIT`), not string literals: Grovekeep's team-wide +15% max-Health `on-fight-start`
  amplifier, Striker's count-scaling +20%-per-living-Swarmhive-ally `on-fight-start` payoff
  (Slice D's `magnitudeSource` against real content), Jaws' `on-damage-taken` 60%-Attack
  retaliation, and the Unicorn's `on-attack` → `revive` trigger (Slice B's mechanism against real
  content) — firing 26 times across the floor, resolving into 10 real `Revived` events (the rest
  are documented targeting fizzles, per CONVENTIONS: an empty dead-ally pool is a fizzle, not a
  suppressed trigger — `TriggerFired` still fires either way).
- The two `StatModifierApplied` events land the exact documented factors (Grovekeep ×1.15 on
  Health, Striker ×1.2 on Attack).
- Determinism: an independent second `createGameStore()` run against the same fixed seed produces
  a byte-identical `FloorOutcome` (`toEqual`, not just spot fields).
- **PR #65 review addition**: the Brute's own action instance-list is now asserted directly, not
  just claimed by the header comment — `attacksPerTurn` buckets `AttackDeclared` events by the
  Brute's own `TurnStarted`…`TurnEnded` bracket across all 18 turns she takes on floor 1; 17
  brackets declare exactly 2 (the double-strike), 1 declares exactly 1 (fight 2's second turn,
  where instance 1 alone kills the already-wounded Swarmhive Striker and instance 2 has no living
  target left to fall back to).

### Tests

**105 files / 610 tests** (up from H3's 594/103 — 2 new files, `integration.test.ts` and
`golden-broodmother.test.ts`; the other 4 touched test files gained cases without becoming new
files; 16 new test cases total, see the "Boss floors" subsection below for the exact per-file
split). Full Phase 1–3 + Slice A–H3 suite re-verified: every prior test passes unmodified
alongside the new ones. `lint` / `format:check` / `build` all clean.

### Boss floors (PR #65 review addition, folded into this slice)

*Design-owner call at PR #65 review*: H1/H2/H3 each authored their boss as data (an elevated
`SpeciesCreature` + adds + signature trait) but deliberately deferred the actual **runner** —
nothing materialized a boss on its own floor, so floors 10/20/30 generated ordinary spawn-pool
fights and perk points were unreachable in play. Rather than a twelfth slice, the design owner
folded this into Slice I's own review pass (same PR, same branch) since it's the natural
completion of "prove the whole phase composes against real content" — a boss floor IS real-content
integration, just one Slice I's original scope happened to skip.

**Engine** (`src/engine/generation.ts`, `src/engine/curves.ts`): `FLOORS_PER_BIOME` (replacing the
inline `10` in `biomeForFloor`, behavior-identical — the existing `biomeForFloor` test suite proves
it) and `isBossFloor(floor) = floor % FLOORS_PER_BIOME === 0`, checked at every depth (floor 101+
included, no special case). New `BossEncounter` interface (`{bossId, creature, speciesId, adds}`)
on `BiomeData.boss?`; `Fight` gains `boss?: {bossId, creatureId}`. `generateFloor`'s new boss
branch (checked before the ordinary path): when `isBossFloor(floor) && biome.boss`, returns exactly
ONE `Fight` — the boss materialized at `bossLevel(floor)` (curves.ts, **ASSUMPTION 32**:
`enemyLevelRange(floor).max + BOSS_LEVEL_OFFSET(3)`, parked balance like #1-3) at slot 0, then her
adds (each rolling a level within `enemyLevelRange(floor)` and a loadout via `rollLoadout` — the
SAME per-slot calls an ordinary spawn makes, minus the species/creature draws a fixed add doesn't
need). Each add's `speciesId` is resolved from the biome's own `speciesPool` by a new
`resolveAddSpeciesId` (throws, invariant-checked, if the add isn't actually a member) — never
carried as separate authored data. `fightCount`/`enemyPartySize` are not consulted for a boss
floor, per CONVENTIONS. **Review nit, fixed same-branch**: the boss herself now also rolls a
loadout via `rollLoadout` (she skips only the level roll, since her level is the fixed
`bossLevel(floor)`, not the species/creature draws) — without this, a hypothetical cast-role boss
would spawn with an empty loadout, breaking the "casters always get a spell" coherence rule
(`generateFloor`'s own doc comment). A no-op RNG-wise for all three currently-shipped bosses
(`always-attack`, never cast-role) — confirmed by the full suite passing byte-identical.

**Data** (`src/data/species/{overgrowth,glimmerdark,rotcap-hollow}.ts`): each real biome's `.boss`
now wires its already-shipped boss constants — Broodmother (`speciesId: SPIDERS_SPECIES_ID`,
`adds: BROODMOTHER_ADDS`, sharing her Spider adds' own species per species-locked.md), Leech
Sovereign (`speciesId` is her own id — no natural species, `adds: []`, lean by design), Rot
Sovereign (`speciesId` is her own id; her two adds span TWO different real species, each
independently resolved by `resolveAddSpeciesId`). Each file's old H1/H2/H3 "boss-encounter runner
not built" comment is rewritten to point at this wiring instead of flagging it as a gap.

**Store** (`src/state/store.ts`): `descend()`'s reward loop special-cases a dead enemy whose id
matches `fight.boss.creatureId` — banks XP/currency through the same per-kill path but skips
`findStaticCreature` entirely and grants no soul% (CONVENTIONS: bosses aren't collectable); every
other enemy (including a boss's own adds) is unaffected. A won boss fight now sets a new local
`bossDefeated` and folds it into `bossesCleared` via a new `withBossCleared` helper — extracted so
`recordBossKill` and `descend()` share the exact same idempotent-add logic rather than two
independently-written copies. `FloorOutcome` gains `bossDefeated: string | null`.

**Tests** (10 new files, 16 new cases — none of them touch an existing test):
- `generation.test.ts` (+6, fixture data): a new `FIXTURE_BIOME_WITH_BOSS` (deliberately a
  SEPARATE fixture — `FIXTURE_BIOME` itself stays boss-less, keeping every earlier
  `generateFloor` test byte-identical); floor 10 returns boss@0 + her add, at `bossLevel(10)`,
  the add's speciesId resolved from the pool; floors 9/11 and a boss-less biome at floor 10 stay
  ordinary; floor 110 (>100) is still a boss floor, no special case; an add absent from the pool
  throws.
- `store.test.ts` (+3, fixture data): a boss win (`bossDefeated` set, `bossesCleared` banks it,
  boss XP/currency with no soul%, the add gets soul%), re-clearing leaves `bossesCleared.size`
  unchanged, a boss loss records nothing boss-related but still banks the add's kill.
- `data/biomes.test.ts` (+4, real content): every authored (non-placeholder) biome has a boss;
  every boss add is a real pool member; the Broodmother's `speciesId` matches
  `SPIDERS_SPECIES_ID`; a real `generateFloor(10, OVERGROWTH_BIOME, …)` roster carries that
  speciesId on all three creatures.
- `golden-broodmother.fixture.ts` / `.test.ts` (+1, hand-derived, real `BROODMOTHER_TRAIT`): the
  H1 "boss-encounter runner contract" golden that slice's own doc comment flagged as untested —
  closes it. Two generic adds (not the real Spider Weaver/Ambusher — their own mechanics already
  have H1 goldens; this one's job is Swarm Call's count math) share `SPIDERS_SPECIES_ID` with the
  Broodmother. `TURN_STEPS=5` (`resolveTurn`, not `resolveFight` — mirrors `golden-rot-sovereign`'s
  own technique): Swarm Call fires at count 3 (round 1, all three alive) for 18 bonus damage, an
  add dies to the player striker later that same round, then Swarm Call fires again at count 2
  (round 2) for 12 — the exact count-scaling `magnitudeSource` end-to-end proof H1 deferred. The
  round-end 40% Web roll is independently verified (an `node`-replicated mulberry32 at the chosen
  seed) to fail, so nothing else complicates the trace.
- `state/integration.test.ts` (+1, real content, generated-then-checkpoint-verified): the SAME
  Brute+Unicorn party from the floor-1 case, leveled to 20 (chosen after level 50 was tried and
  rejected — at 50 the party kills every enemy, including the boss, before her own turn ever
  arrives, so Swarm Call never fires; 20 still guarantees a win while letting her act at least
  once) then `deepestFloor` fast-forwarded to 9. Checkpoints one fight, the real roster (Broodmother
  + both real spiderling adds, ids confirmed from the run), Swarm Call firing, `bossDefeated`,
  `bossesCleared`, soul%/XP/currency split between the boss and her adds, `deepestFloor=10`, and
  idempotent re-clearing. The floor-1 case is untouched by this addition.

### Event-log legibility read (the plan's own Verification step, floor 1, default seed)

Per-mechanism correctness already rests on the focused/golden tests above; this is the
"`/verify` a full `descend()` run... and read the event log end-to-end for legibility" step the
brief's own Verification section calls for — recorded here as playtest/balance INPUT (GAME_DESIGN
§13 parks the numbers), not a code change:
- **Fight 1** (Treant Grovekeep, scripted to always-defend): 15 rounds. Every one of the Brute's
  hits lands as a 1-damage chip (45 total across the fight) against the Treant's Defend-boosted
  Defence; the Treant itself never attacks. Grovekeep's own +15% max-Health amplifier raises the
  cap only — no accompanying heal, the established precedent (no status auto-heals a raised cap).
- **Fight 2** (Swarmhive Striker, Attack 33 → 39.6 via her own fight-start count-scaling): hits
  the Brute (20 HP) for 24 — more than her whole HP pool. The Brute dies twice and is revived
  twice by the Unicorn at 4 HP each time. Won in round 2 (per the instance-list note above, its
  second instance never fires — the Striker is already dead).
- **Fight 3** (Snapjaw Jaws): the Brute dies in round 1 itself (a 15-damage main hit plus two
  3-damage Snapback retaliations off her own double-strike). From round 2 on she is revived and
  re-killed every round (8 deaths, 8 `Revived` events total) without ever acting again — she is
  dead at each round's start, so she is simply absent from that round's frozen turn queue
  (CONVENTIONS), and Jaws kills her again before the next round starts. The Unicorn alone finishes
  Jaws off with 1-damage chips over many rounds.
- **Floor 2** (not attempted by this test, but observed while exploring the run): the SAME party
  — still level 1, 30 total XP after floor 1 — loses its very first fight. The floor→level curve's
  gap is already real at floor 2 for a level-1 starter party; nothing here is a bug, it is exactly
  GAME_DESIGN §13's "master difficulty lever" doing its job. Recorded as direct input for the
  Phase 4.5 demo's own balance pass and for playtest, not actioned as a code change in this slice.

### Deliberately out of scope for Slice I (future phases)

Per the brief's own scope boundary, restated: no UI (`src/ui`/`src/app` — Phase 4.5's job), no
persistence (Phase 5), no equipment/gem forge economy/fusion/catch-up leveling (Phase 8), no
scripting/combat UI (Phase 6/7), biomes 4–10 content, behavioral traits.

## Phase 4 close-out

All eleven slices (A–I, H split H1/H2/H3) shipped, plus one inserted mid-sequence (E2), two
interstitial slices between H2/H3 with their own phase-record files (cumulative spell unlock,
percent-HP condition ticks), and boss floors — folded into Slice I at the PR #65 review by a
design-owner call, closing the "boss-encounter runner" gap H1/H2/H3 each deferred. Final state:
**105 test files / 610 tests**, `lint`/`format:check`/`build` all clean. The engine's hook
vocabulary grew from Phase 3's 13 to Slice B's 17 (the four `on-[action]` hooks), then settled at a
final **16** once Slice E2's general `on-action-observed` superseded the never-wired
`on-ally-action`/`on-enemy-action` pair (net −1); the response vocabulary grew from Phase 3's
**four** (`deal-damage`/`apply-status`/`apply-stat-modifier`/`suppress-action` — see
`phases/phase-3-traits-statuses-effects.md`) to Phase 4's **nine** top-level kinds (`revive`/
`grant-action-state`/`consume-stacks` in Slice B/D, `heal` in Slice E, `remove-status` in Slice E2
— see `briefs/phase-4-slice-e2-primitives.md`); and the engine gained the action instance-list model,
armor penetration, cross-stat contribution, count-scaling magnitude sources, consume-stacks,
cheat-death, turn-order statuses, status immunity, the targeting-override pipeline,
splashing/annihilate, the support-spell model, and boss floors (`isBossFloor`/`bossLevel`/
`BiomeData.boss`) — all proven additive to every Phase 1–3 golden throughout. `src/data` gained
three full biomes (54+ real creatures across Overgrowth/Glimmerdark/Rotcap Hollow, their
traits/spells/statuses, and three now-fully-wired bosses — the Broodmother, Leech Sovereign, and
Rot Sovereign are fought on floors 10/20/30 respectively, each a genuine perk-point source in play,
100 points on first clear per GAME_DESIGN §9), three full specialization/perk trees summing to
exactly 1000 points each, and the three starters + the Unicorn. `src/state` became a real
directory for the first time, with an in-memory Zustand store owning
navigation/ownership/`descend()`, including boss-floor reward banking and `bossesCleared`. Not yet
built, by design: any UI, persistence, or the Phase-8-gated economy — see each slice's own "out of
scope" note above for the complete list.
