# Phase 4 — Party, specializations, the cave & biomes

Status: **in progress — Slices A–E done** (A: 260/260 tests; B: 299/299 tests, post-review-fix;
C: 337/337 tests, post-review-fix; D: 368/368 tests, post-review-amendment; E: 372/372 tests;
lint/format/build green throughout). Built per
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

372/372 (up from Slice D's 368 — 4 new: 2 unit tests, 2 golden pairs). `support-spells.test.ts` —
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

Full Phase 1–3 + Slice A–D suite re-verified byte-identical (all pre-existing goldens pass
unmodified) — confirmed the `Spell`/`resolveInstanceTarget`/Cast-executor/interpreter changes are
additive no-ops absent the three new optional fields. `lint` / `format:check` / `build` all clean.

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

### Deliberately out of scope for Slice E (later slices)

Specializations/perks/starters/the Unicorn's real content, incl. the real per-spec spell loadouts
that will actually USE `targetSide`/`payload` in anger (F); the Zustand store (G); the real
~50-spell per-affinity seed set incl. real heal/buff spells (H1–H3, per GAME_DESIGN §5's "Vitality
is the primary healer/Regen home"); integration (I).

## Next

Slice F — specializations, perks, starters & the Unicorn (`data/specializations.ts`, the
player-level perk-effect instantiation model, the three starter creatures, the scripted-intro
encounter). See `.claude/briefs/phase-4-implementation-plan.md`.
