# Phase 4 — Party, specializations, the cave & biomes

Status: **in progress — Slices A–H1 done** (A: 260/260 tests; B: 299/299 tests, post-review-fix;
C: 337/337 tests, post-review-fix; D: 368/368 tests, post-review-amendment; E: 385/385 tests,
post-design-feedback (ally target-selector completion); E2: 424/424 tests (its own phase-record
entry was filled in retroactively during F — see that section); F: 470/470 tests,
post-review-amendment (actionKind scoping, taken-reduction, StatusDef.defaultDuration,
SpeciesCreature.equippedSpells); G: 494/494 tests, post-review-fix (currency banks per kill not
per fight won, a mid-fight-wipe reward-banking regression test, a perk-plumbing regression test,
fail-loud on an unresolved enemy kill); H1: 509/509 tests, real Overgrowth content, zero engine
changes, post-follow-up-fixes (Drone given a real mechanic, traits/spells moved to the central
`traits.ts`/`spells.ts` registries, the player-facing content doc gained exact numbers + a spell
table); lint/format/build green throughout). Built per
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
the relevant earlier slice" discipline: nothing in this roster needed anything not already built
(confirmed while authoring), so this slice is pure content, no engine changes.

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
across 71 files, unchanged) -- this slice touches no engine file at all, only `src/data/`.
`lint` / `format:check` / `build` all clean.

### Player-facing content doc

`.claude/content/overgrowth.md` -- written for a future in-game tooltip/reference, not as a
narrative summary: every trait/spell is one literal sentence with its exact number baked in
("When this creature attacks, it applies Web to its target." / "At the end of every round, this
creature heals its lowest-HP ally for an amount equal to 10% of its own effective Health."),
kept explicitly in sync with the numbers in `traits.ts`/`spells.ts` -- if the two ever disagree,
the source file wins and the doc is stale. Includes the full spell table (missing from the
initial submission, flagged alongside the Drone/file-organization items above).

### Deliberately out of scope for Slice H1 (later slices)

Glimmerdark / Rotcap Hollow real content (H2/H3, including Web's own two-way turn-order-status
sibling at Blindclaws' act-first pole); the Broodmother boss-encounter runner (see the ASSUMPTION
above -- future UI/store wiring); the integration pass and this record's closing section (I).

## Next

Slice H2 — Glimmerdark (floors 11–20): Glowflies, Blindclaws, Resonants, Sparkeaters, Gloomjaws,
Shellbacks; Glow + consume-stacks, turn-order status (Blindclaws' act-first pole, alongside H1's
Web act-last), acted-before-target; boss: Leech Sovereign. Replaces `data/biomes.ts`'s
`BIOMES[1]` slot. See `.claude/briefs/phase-4-implementation-plan.md`.
