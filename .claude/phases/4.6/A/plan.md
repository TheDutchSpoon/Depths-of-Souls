# Plan — 4.6-A: Engine hardening

## Revision 1: what changed

Folded from `plan-handout-r1.md` (re-read: `phases/4.6/brief.md#fight-setup-checks-its-input`,
`#the-load-time-checks-close-their-gaps`, `#small-engine-fixes`, `spec/creatures.md#trait-and-gem-slots`,
`spec/creatures.md#equipment`). Everything not named here stands.

1. **Order of work, step 2** now carries the expected guard inventory as an exact list (step 2
   section below); any other failure is a stop-and-ask.
2. **Listed test changes** (new "Listed test changes" section under the Golden policy): the
   registries for the unknown-`scriptId` tests, the two inline statuses drop the flag, the `ECHO`
   fixture gains its claim key, non-fresh creatures move to `setup` / `updateCreature`.
3. **`takenFactorFor`** throws when an additive source has no `reductionCap` (replaces the
   "throw-free narrowing"), with a test on a hand-built state. The cap ASSUMPTION stands.
4. **Golden `initial` proof** compares the **whole `CombatState`** (both parties, `rng`,
   `effectInstanceCounter`, `turnClock`, `round`, the registries) for the three `setup` goldens.
5. **`stacks: false` claim key** is rewritten: `<kind>:<carrierId>#<index>`, stamped where the
   effect is instantiated (`claimKey` on `BaselineEffectEntry` and `TriggeredEffect` for
   `stacks: false` triggers only; built from the index in `flatEffects` for a status), never
   counted at lookup. A keyless non-stacking effect throws. Old ASSUMPTIONS 8, 9 and 10 are
   replaced; three tests are added (one trait twice on one creature, a side effect on two party
   members, a revived carrier).
6. **Comment-only golden edits** narrow to `golden-revive-cap-exclusion` and
   `golden-revive-cap-fizzle`; the round-end golden and the three `setup` goldens change code, so
   their comment edits fall under the golden policy.

Read: `CLAUDE.md`, `workflow/coding-rules.md`, `CONVENTIONS.md`, `A/kickoff.md`, `A/brief.md`,
`phases/4.6/brief.md` (the six sections, `#sequencing-rules`, `#assumptions`), the Known-bug and
rule sections of `spec/combat.md`, `effects.md`, `responses.md` and `statuses.md` that the brief
names, and the code the kickoff lists (`combat.ts`, `effect-types.ts`, `effects.ts`,
`effective-stats.ts`, `resolution.ts`, `data/specializations.ts`, both test-utils, the creature
fixtures, the three goldens and the `setup` precedents). The build reads the rest of each spec
file in full before editing.

One slice, not split into A1/A2: each mechanism is small, and the load-time checks and the
runtime fixes share no code. If the guard inventory (step 2) shows throws beyond the kickoff's
lists, stop and ask, as the kickoff says.

## Order of work

0. **Baseline, before any edit** (branch is clean at `f496e72`): `npm ci`, `npm run test`, record
   the per-file test counts. Write a scratch vitest file outside the repo's committed tree (in the
   scratchpad, never kept) that dumps as JSON, for every golden fixture, its `expectedEvents` and
   `expectedResult`, and for the three `setup`-moved goldens the `createGoldenState(...)` parties.
   This is the "main" side of the golden-policy proof. For the three `setup`-moved goldens the dump
   is the **whole `CombatState`** `createCombat` returns from the old (non-fresh) parties, not just
   the parties. Also grep the three goldens' creatures and traits for `stacks: false` triggers
   (ASSUMPTION K below).
1. **Guards first** (`createCombat` input checks, the two load-time checks, `takenFactorFor`'s
   throw). Nothing else yet.
2. **Inventory**: run `npm run test` with every guard on, before adjusting any test. Write every
   failing test to `evidence/guard-inventory.md`. The failures must **equal this list exactly**;
   anything else (a slot, id, `revivesUsed`, additive-cap or perk-level throw, a test building two
   creatures with `makeCreature`'s default slot 0, ...) is a **stop-and-ask**, not a quiet fix.
   - **`CATASTROPHIC_COLLAPSE` in the registry** (`emitTriggerFired: false` off a tick):
     goldens `golden-round-end-interaction`, `golden-conditional-passive`,
     `golden-conditional-trigger`, `golden-loop-safety`, `golden-stun`, `golden-triggered-damage`;
     in `resolution.test.ts` the two "loop safety" tests and "apply-stat-modifier re-stacking
     (unique instance ids)". Dropping the flag clears all nine; only
     `golden-round-end-interaction`'s expected log changes.
   - **Test-inline statuses with the flag off a tick:** `test-regen` in `resolution.test.ts`
     ("heal response (Regen) > emits HealApplied clamped …") and `single` in
     `status-containers.test.ts` ("deal-damage, flat mode … is a COST").
   - **Non-fresh creatures:** goldens `golden-defend-count-additive-cap`,
     `golden-heal-scaling-count`, `golden-necromoss-reclaim`; `resolution.test.ts`: heal scaling
     (count), revive response ×3, all-allies, all-allies-of-species, revive cap; `combat.test.ts`:
     taken-reduction passive (Bulwark as a perk), Provoke > redirects a single-target attack,
     turn-start cleanup > skips cleanup … own turn-start hook.
   - **Unknown `scriptId`:** `combat.test.ts` "action instance-list composition" (5 tests);
     `data/species/starters.test.ts` "Sorcerer starter loadout" (2 tests); `state/store.test.ts`:
     "runScriptedIntro() > adds the Unicorn on a win", "… on a loss too …", and "the scripted
     intro grants XP > every active-party creature gets the grant …".
3. Move the listed state (goldens' `setup`, unit tests' `updateCreature`), apply the listed test
   changes (next section but one: "Listed test changes"), fix the one fixture trait, re-run.
4. Runtime fixes (floors, zero count, Web, `on-action-observed`, `stacks: false`,
   `triggering-ally`), then the deep-freeze helper (last: it can surface registry writes in other
   tests, which is also a stop-and-ask).
5. Stale comments, new tests, gates.

## Approach and module changes, by file

### Fight setup checks its input (`brief.md#fight-setup-checks-its-input`)

- **`engine/config.ts`**: `export const PARTY_SIZE = 6`, with a citation of
  `spec/combat.md#automatic-6v6`. **ASSUMPTION (A, confirms the brief's):** the bound is an engine
  constant here, and `state/store.ts` imports it and re-exports it
  (`export { PARTY_SIZE }`) so `balance-sim.ts` and the tests that import `PARTY_SIZE` from
  `store` don't change.
- **`engine/combat.ts` `createCombat`**, after the existing "both parties non-empty" check, before
  any instantiation:
  - **script ids**: every creature on both sides has `scriptId === null` or a `scriptId` in
    `scripts` (an omitted registry is empty, so any non-null id throws). Names the creature and
    the id.
  - **slots, per side**: each `slot` is an integer in `0..PARTY_SIZE-1`, and slots are strictly
    ascending in array order. Three distinct messages: out of range, duplicate, out of order.
    **ASSUMPTION:** a non-integer slot (1.5, NaN) is "out of range". **ASSUMPTION:** no contiguity
    rule (the kickoff's trap: a gap like `[0, 2]` passes; I raise contiguity under Spec questions
    and do not build it).
  - **ids**: no two creatures share an id across both sides.
  - Order: the existing side-mismatch and freshness throws stay where they are in `instantiate`;
    the new whole-input checks run first, so a bad input reports its first structural fault.
- **Freshness** (inside `instantiate`, extending the existing throw): `alive === false`,
  `defending`, `provoking`, `defendCount !== 0`, `revivesUsed !== 0`, besides non-empty
  `baselineEffects` / `activeEffects`. **`currentHp` is not checked** (kickoff trap: `createCombat`
  sets it). The `revivesUsed: 0` line in `withEffects` is deleted (unreachable once non-zero
  throws; the spread already carries 0, so the returned state is identical).
- **Side effects validated**: `createCombat` runs `validateEffectList(player.effects ?? [], …)`
  and the same for `enemy.effects`, with the permanent-carrier set (below). This is the "validated
  at the level bought" half: the perks arrive resolved at their level.
- Doc comment on `createCombat` rewritten (drops "never trusts those fields", "RESETS
  `revivesUsed`"; states what throws). Stale comment fixes outside it are listed under
  "Comments that go stale".

### The load-time checks close their gaps (`brief.md#the-load-time-checks-close-their-gaps`)

- **`engine/effect-types.ts`**: one entry point, `validateEffectList(defs, label, carrier)`,
  where `carrier` is `'status' | 'permanent'` (permanent = trait, perk, side effect).
  - Every carrier: random-selector response targets, observation filters, damage channels, and the
    two new checks.
  - `'permanent'` only: stat-modifier read-cycle, `breakChancePercent`, `snapshot-potency`
    (legal inside a status, so they stay out of the status path; this is the existing split, now in
    one place).
  - Existing error messages stay **byte-identical** (tests match them); `label` only feeds the new
    ones and the contexts that already take one.
  - `validateTrait`, `validateStatusDef` (after its status-only bans and `validateStatusPotency`),
    `validateSpecialization` and `createCombat`'s side effects all call it. The six hand-repeated
    calls in `validateSpecialization` go; the individual validators stay exported (tests call
    some directly).
- **New check 1 — additive taken cap**: a `taken-reduction`, or a `damage-modifier` with
  `direction: 'taken'`, whose `accumulation === 'additive'` must carry a `reductionCap` that is a
  number `< 1`. **ASSUMPTION:** negative caps are not rejected (the brief says "below 1", nothing
  more); NaN is rejected (`!(cap < 1)`). Not applied to `'multiplicative'` or to `dealt` modifiers.
  Fixes `effects.ts` `takenFactorFor`: `e.reductionCap ?? 1` is replaced by a resolver-invariant
  throw when an additive source has no `reductionCap`, in the style of `heal`'s throw on both
  `flatAmount` and `scalingStat` (a hand-built test state reaches the resolver without the
  load-time check). The comment "default 1 -- unclamped -- if somehow omitted" is rewritten. A
  test builds that state by hand and asserts the throw (`effects.test.ts`).
- **New check 2 — `emitTriggerFired: false`** is legal only where `isSnapshotTick(response)`.
  Read off the response (`deal-damage` / `heal` with the `snapshot-potency` marker), not the
  carrier type. **ASSUMPTION:** `Spell.effects` is out of scope (a spell's effects never emit
  `TriggerFired`, and `validateSpellEffects` already rejects `flatAmount`).
- **`data/specializations.ts` `validateSpecialization`**: calls `validateEffectList` per perk.
  **ASSUMPTION (the kickoff's recommendation, confirmed):** a leveled perk is swept over every
  level `1..maxLevel`, not just level 1, so a bad level fails at import. The old "level 1 is
  representative" comment goes. If the sweep throws on shipped content, stop and ask.
- **`__fixtures__/traits.ts`**: `CATASTROPHIC_COLLAPSE` loses `emitTriggerFired: false` on its
  first effect; `damageSource: 'dot'` **stays**. Its doc comment and
  `golden-round-end-interaction.fixture.ts`'s two "matches DoT convention" comments change.
- **`golden-round-end-interaction.fixture.ts`** expected log gains exactly
  `{ type: 'TriggerFired', sourceId: P1, hook: 'on-round-end', effectId: 'catastrophic-collapse' }`
  immediately before P1's 999 `DamageDealt`, nothing else moves.

### No living creature at 0 HP (`brief.md#no-living-creature-at-0-hp`)

- **`effective-stats.ts` `effectiveMaxHp`**: `Math.max(1, Math.floor(getEffectiveStat(…,
  'health')))`. One home; `getEffectiveStat` is untouched (goldens read it raw for heal amounts).
  The clamp, the HP% read and fight-start HP all go through this function, so they follow. Its
  doc comment says "never below 1".
- **`resolution.ts` `revive`**: `currentHp = Math.max(1, Math.round(baselineMaxHp * response.pct))`.
  The cap, the RNG pool and the death-reset around it are unchanged.

### A zero count is a no-op (`brief.md#a-zero-count-is-a-no-op-for-every-response`)

- **`resolution.ts` `apply-stat-modifier`**: after `count` is resolved, before the target loop,
  `if (response.magnitudeSource && count === 0) return { state }`, mirroring `deal-damage` and
  `heal`. `fireHook` has already emitted `TriggerFired`; it is not suppressed
  (`spec/responses.md#fizzles`).

### Small engine fixes (`brief.md#small-engine-fixes`)

- **Web roll** (`combat.ts` `rollWebBreakFree`): the bearer list (`turnOrderIdsOf`) and each
  bearer's `flatEffects` list stay taken once, so the **draw count and order are unchanged**. Only
  the removal reads fresh: `activeEffects: getCreature(working, bearerId).activeEffects.filter(…)`.
  The born-this-turn `instance` lookup keeps reading `current` (nothing between the two reads can
  change it).
- **`on-action-observed` fails closed** (`resolution.ts` `fireHook`): the actor lookup moves out of
  `if (effect.observationFilter)`; `if (!actor) continue` comes first, filter or not. The
  `excludeActor` / relationship checks then use a known `actor` (the `actor &&` guards go).
- **`stacks: false` claims per definition**: the key is the trigger's definition, stamped where
  the effect is instantiated, never counted at lookup: `<kind>:<carrierId>#<index>`.
  - **Trait and side effects** (`effects.ts` `resolveBaselineEffects`): a `stacks: false` trigger's
    `BaselineEffectEntry` gets an optional `claimKey`: `trait:<traitId>#<i>` (`i` = the trigger's
    position in `trait.effects`), `side:<sideLabel>-<n>#0` (so `side:perk-<n>#0`,
    `side:enemy-effect-<n>#0`). Kind comes from where the entry is built, never from parsing the
    `perk-<n>` label. Entries without `stacks: false` carry no new field.
  - `instantiateEffectDefs` / `withInstance` carry `claimKey` onto the `TriggeredEffect` (new
    optional field on that type; spread only when present, so no `claimKey: undefined` appears on
    other effects). Revive's re-instantiation reads `baselineEffects`, so the key survives a revive.
  - **Status effects**: `flatEffects` builds `status:<statusId>#<index>` from the `index` it already
    has in `e.effects.forEach`. Nothing is stored on the status.
  - `ResolvedHookEffect` gains optional `claimKey`; `effectsForHook` passes it through. `fireHook`'s
    `claimedNonStacking` keys on it. The claim stays after the `damageChannel` skip, the
    observation filters, the condition and the depth-cap check, and **before** the chance roll. The
    set stays per `fireHook` call.
  - A `nonStacking` effect with no `claimKey` reaching the claim is a resolver-invariant throw,
    never a fallback to `sourceTraitId`. Only a hand-built test effect can lack one: today the
    `ECHO` fixture in `actions.test.ts` (listed test changes).
  - `TriggeredDef.stacks` and all content stay as they are.
  - Consequences: a creature carrying one trait twice (`innateTraitIds: [T, T]`) makes one claim
    (same key); a side-effect trigger carried by two party members is one claim (same `side:` key).
- **`triggering-ally` deleted**: the `ResponseTarget` member, the `case` in `resolveResponseTargets`
  (the shared `triggering-source` branch stays), and any test or fixture that names it. After this,
  `grep -rn triggering-ally src` is empty. `spec/responses.md:49` still lists it: Spec question.

### The snapshot lock covers Maps and Sets (`brief.md#the-snapshot-lock-covers-maps-and-sets`)

- **`test-utils/deep-freeze.ts`**: for a `Map`, define non-enumerable own `set`, `delete`, `clear`
  that throw `TypeError`; for a `Set`, `add`, `delete`, `clear`. Defined **before**
  `Object.freeze` (a frozen object takes no new properties), non-enumerable so `toEqual` on a
  frozen Map is unaffected. Entries are still deep-frozen. Header comment rewritten (the Map gap is
  no longer "a non-issue").
- **ASSUMPTION (the early `Object.isFrozen` return):** a Map/Set someone `Object.freeze`d earlier
  can't be locked afterwards. Instead of skipping it silently, `deepFreeze` throws a clear error
  for a frozen Map/Set that lacks the lock. Nothing freezes registries today, so no existing test
  hits it.
- Expected fallout: a test that writes into a shared module-level registry after a golden ran now
  throws. That is a stop-and-ask, not a fix (kickoff).

## Comments that go stale (rewritten, no provenance)

- `combat.ts`: `createCombat` doc comment and the fight-start comment ("reset revivesUsed"),
  `rollWebBreakFree` doc if it still implies one read.
- `__fixtures__/creatures.ts`: the `baselineEffects` / `revivesUsed` override comments
  ("always-reset-to-0 rule") become "a test building a post-setup creature directly".
- `generation.ts:206-208`: "createCombat ALWAYS recomputes … resets `revivesUsed`".
- `effects.ts`: the `takenFactorFor` cap comment; the `stacks` comment above `claimedNonStacking`.
- `effect-types.ts`: `TriggeredDef.stacks` ("matched by `sourceTraitId`"), `ResolvedHookEffect`,
  `ResponseTarget`.
- Golden header comments that say `createCombat` resets `revivesUsed` or HP-as-input:
  - **comment-only edits** (`golden-revive-cap-exclusion`, `golden-revive-cap-fizzle`):
    **ASSUMPTION:** allowed by `CONVENTIONS.md#comment-only-golden-edits-are-allowed`; the report
    lists each file and `npm run docs:check -- comment-proof` is run on both.
  - `golden-round-end-interaction` and the three `setup` goldens (`golden-necromoss-reclaim`,
    `golden-heal-scaling-count`, `golden-defend-count-additive-cap`) change code, so their comment
    edits fall under the golden policy, not that rule.

## Golden policy (restated from the kickoff)

**Byte-identical, with two listed exceptions.**

1. `golden-round-end-interaction`: `CATASTROPHIC_COLLAPSE` loses its flag; the expected log gains
   exactly one `TriggerFired` (P1, `on-round-end`, `catastrophic-collapse`) right before P1's 999
   `DamageDealt`. Nothing else moves.
2. `golden-defend-count-additive-cap` (`defendCount: 15`), `golden-heal-scaling-count` (one dead
   ally) and `golden-necromoss-reclaim` (three dead allies) move that state from the party into the
   fixture's `setup`. Their expected values stay identical.
   - Reproduce the old state exactly: the creature is built **fresh** in the party; `setup`
     applies `{ alive: false }` with `currentHp` **left at effective max** (not 0, unlike the
     revive-cap goldens), and `{ defendCount: 15 }` for the first.
   - `golden-necromoss-reclaim` already has a `setup` (WISP's 5 HP): the dead-ally updates are
     added to it, WISP's update kept. `golden-heal-scaling-count` and
     `golden-defend-count-additive-cap` get a new exported `setup`.
   - **Proof**: against the step-0 dump, imported not diffed: every `expectedEvents` and
     `expectedResult` deep-equal main's except the round-end golden, whose array differs by exactly
     the one event at the one index; for the three goldens, `createGoldenState(...)` deep-equals
     main's `createCombat` output from the old parties as a **whole `CombatState`**: both parties,
     `rng`, `effectInstanceCounter`, `turnClock`, `round` and the registries (the old-parties dump
     is taken once in step 0, before any edit). The corpus digest fixture is untouched and its test
     passes without `corpus:update`.
- Unit tests that pass a non-fresh creature move that state onto the returned `CombatState` with
  `updateCreature`, assertions unchanged; the list is the step-2 inventory and the report names
  each one.

### Listed test changes

Each keeps the test's assertions byte-identical.

- **Unknown `scriptId`:** each test gets the registry its creatures name.
  - `combat.test.ts` instance-list: `scripts: FIXTURE_SCRIPTS_BY_ID` in place of `new Map()` (both
    `createCombat` sites).
  - `starters.test.ts`: a registry holding `STOCK_SCRIPTS_BY_ID`'s role scripts, plus
    `ALWAYS_CAST_SCRIPT` in the fused-creature test.
  - `store.test.ts`: `makeDeps`'s default `scripts` is `STOCK_SCRIPTS_BY_ID` merged with
    `FIXTURE_SCRIPTS_BY_ID`.
- **Inline statuses:** `test-regen` and `single` drop `emitTriggerFired: false`.
- **A hand-built non-stacking effect gets its claim key:** the `ECHO` fixture in `actions.test.ts`
  ("an echo is gated by the CASTER, never the bearer") gains `claimKey: 'trait:echo-fixture#0'`,
  for both of its tests.
- **Non-fresh creatures:** `setup` / `updateCreature`, as above.

## Mechanism → the test that fails with it removed, at every site

New test files: `create-combat-input.test.ts`, `load-time-checks.test.ts`,
`stacks-false-claims.test.ts` (all `src/engine/`), `test-utils/deep-freeze.test.ts`. The rest go
into the existing file for their subject. No provenance in titles. "Removed" = the guard or fix
deleted in a scratch copy; the report shows each test red.

**Fight setup (`create-combat-input.test.ts`)**

| Mechanism | Test (fails with it removed) |
| --- | --- |
| unknown `scriptId` | a creature with `scriptId: 'nope'` throws; `null` passes; an omitted registry makes any non-null id throw |
| freshness, one per field | one test per field: `alive: false`, `defending`, `provoking`, `defendCount: 1`, `revivesUsed: 1`, non-empty `baselineEffects`, non-empty `activeEffects` each throw; a fresh creature with `currentHp` below max passes |
| duplicate slot | two creatures on one side with slot 0 |
| out-of-range slot | slot `-1`, `6`, `1.5` |
| out-of-order array | slots `[1, 0]` |
| gap allowed | slots `[0, 2]` pass (pins that contiguity is not a rule) |
| duplicate id | same id on both sides, and twice on one side |
| both sides | the slot and id checks are run on the **enemy** side too (an enemy-side duplicate slot throws) |
| side effects validated | a bad effect in `player.effects` and one in `enemy.effects` each throw (one test per side) |
| level above 1 | a leveled perk whose level-3 output is bad: `validateSpecialization` throws at import (`load-time-checks.test.ts`); fails if the sweep stops at level 1 |

**Load-time checks (`load-time-checks.test.ts`)**: a table, each row run on **every carrier it
reaches** — trait (`validateTrait`), perk (`validateSpecialization`), side effect (`createCombat`
`player.effects`, then `enemy.effects`), status (`validateStatusDef` and the `createCombat`
registry) — so deleting the call at one site turns exactly that row red.

| Mechanism | Rows |
| --- | --- |
| additive cap | `taken-reduction` additive without a cap throws; with cap `1` throws; with `0.8` passes. Same three for a `'taken'` `damage-modifier` additive (inside a status for the status carrier). `'multiplicative'` and a `'dealt'` modifier without a cap pass |
| `emitTriggerFired: false` | on a plain trait / perk / side-effect trigger throws; on a status trigger that is **not** a snapshot tick throws; on a real tick (snapshot-potency `deal-damage` and `heal`, in a status with `potency`) passes; `emitTriggerFired: true` passes |
| single entry point | the existing validator tests (`status-containers.test.ts`, data tests) pass unchanged: pins that the status and permanent paths kept their split (stat-modifier, break chance, snapshot-potency) |
| resolver cap invariant | `takenFactorFor` on a hand-built state with an additive source and no `reductionCap` throws (`effects.test.ts`); fails with the throw removed |
| `CATASTROPHIC_COLLAPSE` | the round-end golden (expected log gains the event); `__fixtures__/traits.test.ts` still passes |

**Floors**: `effective-stats.test.ts`: a Health modifier ×0 (base 20) gives `effectiveMaxHp` 1, not 0,
and `hpPercentSatisfied` / the clamp (`clampedHp`) follow. Resolution test: a Health `apply-stat-modifier`
to ×0 clamps `currentHp` to 1 with `HpClamped.newHp: 1`, the creature stays alive. Fight-start HP
(`createCombat` on a ×0-Health creature) is 1. Revive: `pct` 0.01 on a max of 20 gives `Revived.currentHp: 1`
and a creature with `alive: true, currentHp: 1`; `pct` 0.2 on 20 still gives 4 (the floor doesn't
touch the normal case). Fails with the `effectiveMaxHp` floor removed (first three) or the revive
floor removed (last two) independently.

**Zero-count stat modifier** (`resolution.test.ts`): a trigger whose `apply-stat-modifier` counts
`dead-allies` with none dead: events contain `TriggerFired`, **no** `StatModifierApplied`, no
`HpClamped`, and the stat is unchanged. A companion with one dead ally still emits it (the guard is
not over-wide). A Health-lowering variant proves no downstream clamp event.

**Web roll** (`combat.test.ts`, Web section): a bearer with two distinct break-free statuses, both
breaking in one cleanup. Both are gone afterwards and two `StatusExpired` events are emitted, in
effect order. Hand-derived: seed and its first two mulberry32 draws computed with an independent
`node -e` calculator, both under the 50% threshold, chosen so the unfixed code restores the first
status. A second assertion pins the **draw count** (exactly two draws; RNG position advanced by 2,
via `test-utils/rng-draw-count.ts`), so a fix that re-reads the effect list mid-loop fails.

**`on-action-observed` fails closed** (`resolution.test.ts`): `fireHook('on-action-observed', …)`
with `observed` set and a `source` id that isn't in the state: an observer **with** a filter and one
**without** each stay silent (two tests, one per branch). A real actor still fires both (guards
against over-closing). Existing action-observed goldens stay green.

**`stacks: false`** (`stacks-false-claims.test.ts`). Each test fails with the key reverted to
`sourceTraitId`, or, where noted, to a counted position:
- two `stacks: false` triggers in one trait (positions 0 and 1) on one hook: **both** fire;
- a trait id equal to a status id, each with a `stacks: false` trigger on the same hook: **both**
  fire;
- one trait's trigger carried by two creatures: **one** claim, shared across sides; the second
  never rolls, pinned by RNG position;
- status-borne `stacks: false` triggers at positions 0 and 1: two claims;
- one trait instantiated twice on one creature (a test registry, `innateTraitIds: [T, T]`): **one**
  claim; fails with a counted position;
- a side-effect trigger carried by two party members: **one** claim;
- a revived carrier keeps its key: still one claim after a revive (fails if `instantiateEffectDefs`
  drops `claimKey`);
- a `nonStacking` effect with no `claimKey` throws at the claim (fails with a `sourceTraitId`
  fallback).
- the claim point is still before the chance roll and after the `damageChannel` skip: the existing
  `damage-channel.test.ts:295`, `actions.test.ts:403` (with the `ECHO` key), `death-observed.test.ts`
  and `perform-action.test.ts:228`, and the goldens `golden-echo-chain-truncated`,
  `golden-echo-provoke-redirects` and `golden-pass-order-non-stacking`, stay green unchanged.

**`triggering-ally`**: no test can fail on its absence; the proof is `tsc -b` (the exhaustive
`switch` over `ResponseTarget`) and `grep -rn triggering-ally src` empty, shown in the report.

**Deep-freeze** (`test-utils/deep-freeze.test.ts`): `set`, `delete`, `clear` on a frozen `Map` each
throw; `add`, `delete`, `clear` on a frozen `Set` each throw; both when nested in a plain object
and in an array; a frozen Map still `toEqual`s an equal unfrozen Map; reads (`get`, `has`,
iteration) still work; a Map/Set frozen beforehand throws the explicit error. And one engine-level
case: `deepFreeze(createCombat(...))` then `state.scripts.set(...)` throws. Fails with the
install step removed. Every golden also replays through the runner, which now locks `scripts` and
`statuses`.

## Gates

`npm run test`, `npm run lint`, `npm run format:check`, `npm run build`, `npx tsc -b`,
`npm run docs:check -- citations`, `npm run docs:check -- comments`. Test count reconciled file by
file against the step-0 baseline (new files and added tests listed; moved tests net zero).

## Report (`report-r1.md`) will carry

The guard inventory, the golden-policy proof, the moved-test list, each mechanism's red test, the
corpus digest result, and:

- **Spec questions**: the seven Known-bug lines as built (`combat.md#fight-setup`,
  `#aoe-cast`, `#resolution--timing`; `effects.md#validators`, `#damage-observation`;
  `statuses.md#turn-order`; `responses.md#fizzles`); `spec/responses.md#response-targets` still
  lists `triggering-ally`; `spec/effects.md#stacks-false` says "matched by `sourceTraitId`" and
  must say per-effect claim; whether slots must be contiguous; the two floors; the sentence for
  `CONVENTIONS.md#combatstate-is-plain-data-never-modified-after-being-returned`.
- **Content changes**: none shipped. Test fixture `CATASTROPHIC_COLLAPSE` only.
- **To delete**: nothing expected.

## Assumptions checklist

- [ ] **ASSUMPTION (A):** `PARTY_SIZE = 6` lives in `engine/config.ts`; `store.ts` imports and
      re-exports it so existing importers are unchanged.
- [ ] **ASSUMPTION:** a non-integer or NaN slot counts as out of range; strictly ascending order
      is the only ordering rule; no contiguity rule (raised as a Spec question).
- [ ] **ASSUMPTION:** the slot and id checks apply to both sides, and run before the per-creature
      side/freshness checks.
- [ ] **ASSUMPTION:** one `validateEffectList(defs, label, 'status' | 'permanent')` entry point;
      existing error messages are kept byte-identical.
- [ ] **ASSUMPTION:** the import check sweeps every perk level `1..maxLevel` (the kickoff's
      recommendation).
- [ ] **ASSUMPTION:** the cap check requires an additive source's `reductionCap` to be a number
      `< 1`; negative caps are not rejected; it does not apply to multiplicative or dealt modifiers.
- [ ] **ASSUMPTION:** `Spell.effects` is not covered by the `emitTriggerFired` check.
- [ ] **ASSUMPTION (K):** none of the three `setup`-moved goldens carries a `stacks: false`
      trigger, so the stamped `claimKey` does not change their `initial` `CombatState` (checked by
      grep in step 0; if one does, stop and ask). Likewise any existing `toEqual` on
      `baselineEffects` / `activeEffects` of a `stacks: false` carrier would show in the step-4 run
      as a stop-and-ask.
- [ ] **ASSUMPTION:** `takenFactorFor` throws (resolver invariant) on an additive source without a
      `reductionCap`; the cap rule itself is unchanged (number `< 1`, negatives not rejected).
- [ ] **ASSUMPTION:** `deepFreeze` throws on a Map/Set frozen before it, instead of skipping it.
- [ ] **ASSUMPTION:** comment-only edits to golden fixture headers that now state a false rule are
      allowed and checked with `docs:check -- comment-proof`.
- [ ] **ASSUMPTION:** A stays one slice (no A1/A2 split) unless the step-2 inventory exceeds the
      kickoff's lists, in which case I stop and ask.
