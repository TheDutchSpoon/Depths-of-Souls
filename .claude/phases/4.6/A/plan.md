# Plan — 4.6-A: Engine hardening

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
   This is the "main" side of the golden-policy proof.
1. **Guards first** (`createCombat` input checks, the two load-time checks). Nothing else yet.
2. **Inventory**: run `npm run test` with the guards on, before adjusting any test. Write every
   failing test to `evidence/guard-inventory.md`. It must equal the kickoff's lists exactly:
   `CATASTROPHIC_COLLAPSE` through the round-end golden and the other goldens whose registry holds
   it, the three `setup`-moved goldens, and unit tests that pass a non-fresh creature to
   `createCombat`. Anything else (for example a test that builds two creatures with
   `makeCreature`'s default slot 0, or a duplicate default id across the sides, or a test that
   passes `scriptId` without a `scripts` registry) is a **stop-and-ask**, not a quiet fix.
3. Move the listed state (goldens' `setup`, unit tests' `updateCreature`), fix the one fixture
   trait, re-run.
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
  Fixes `effects.ts` `takenFactorFor`: `e.reductionCap ?? 1` becomes unreachable for an additive
  source, so it becomes plain `e.reductionCap` with a throw-free type narrowing (the comment
  "default 1 -- unclamped -- if somehow omitted" is rewritten).
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
- **`stacks: false` claims per effect**:
  - `ResolvedHookEffect` gains a required `claimKey: string` (replaces nothing; `nonStacking`
    stays the flag). `effectsForHook` builds it while iterating `flatEffects`: carrier =
    `status:<statusId>` for a status-borne effect, else `effect:<sourceTraitId>`; position = the
    number of earlier flat effects with the same carrier (counted for **every** effect, triggered
    or not, so the index is stable); `claimKey = <carrier>#<position>`.
  - `fireHook`'s `claimedNonStacking` keys on `effect.claimKey`. The claim stays **after** the
    `damageChannel` skip and the condition, **before** the chance roll.
  - Side-effect slots are `perk-<n>` / `enemy-effect-<n>`: positional by ordinal already, so one
    per creature of the side, shared across creatures as today.
  - **ASSUMPTION (how the position is obtained, the kickoff's open choice):** derived from the
    creature's effect order at lookup time, **no new field on `ActiveEffect` or
    `BaselineEffectEntry`**. The alternative, a stored `claimKey` on every instantiated effect,
    changes the shape of `activeEffects` and so every `toEqual` on one and the three goldens'
    `initial` equality. **ASSUMPTION (consequence):** a creature carrying the *same* trait twice
    would get two claims, not one (impossible today: fusion is unbuilt and a pair of one creature
    can't fuse, `spec/creatures.md#fusion`). **ASSUMPTION:** "trait vs side-effect slot" is told
    apart by the `perk-<n>` / `enemy-effect-<n>` label, not by a separate prefix; a trait whose id
    matches that form is not guarded against.
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
- Golden header comments that say `createCombat` resets `revivesUsed` or HP-as-input
  (`golden-revive-cap-exclusion`, `golden-revive-cap-fizzle`, `golden-necromoss-reclaim`,
  `golden-heal-scaling-count`, `golden-defend-count-additive-cap`, `golden-round-end-interaction`).
  **ASSUMPTION:** these are comment-only edits to golden fixtures, allowed by
  `CONVENTIONS.md#comment-only-golden-edits-are-allowed`; the report lists each file and
  `npm run docs:check -- comment-proof` is run on the comment-only ones. The three `setup`-moved
  goldens change code too, so they fall under the golden policy, not that rule.

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
     the one event at the one index; the three goldens' `createGoldenState(...).playerParty` /
     `enemyParty` deep-equal main's `createCombat` output from the old parties (run once with the
     old parties in the scratch file, before the edit). The corpus digest fixture is untouched and
     its test passes without `corpus:update`.
- Unit tests that pass a non-fresh creature move that state onto the returned `CombatState` with
  `updateCreature`, assertions unchanged; the list comes from the step-2 inventory and the report
  names each one.

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

**`stacks: false`** (`stacks-false-claims.test.ts`), at each site:
- two `stacks: false` triggers in one trait (positions 0 and 1) on one hook: **both** fire;
- a trait id equal to a status id, each carrying a `stacks: false` trigger on the same hook:
  **both** fire;
- one trait's trigger carried by two creatures: **one** claim, the second never rolls (RNG
  position pins it), and it is shared across sides;
- a status-borne `stacks: false` trigger (status position 0 vs 1);
- the claim point is still before the chance roll and after the `damageChannel` skip: the existing
  `damage-channel.test.ts:295`, `actions.test.ts:403`, `death-observed.test.ts` and
  `perform-action.test.ts:228` stay green unchanged.

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
- [ ] **ASSUMPTION:** `stacks: false` key = `status:<id>#<pos>` or `effect:<sourceTraitId>#<pos>`,
      position derived from effect order at lookup time, with **no stored field** added.
- [ ] **ASSUMPTION:** the same trait carried twice by one creature would get two claims
      (unreachable today).
- [ ] **ASSUMPTION:** trait vs side-effect slot is distinguished by the `perk-<n>` /
      `enemy-effect-<n>` label convention only.
- [ ] **ASSUMPTION:** `deepFreeze` throws on a Map/Set frozen before it, instead of skipping it.
- [ ] **ASSUMPTION:** comment-only edits to golden fixture headers that now state a false rule are
      allowed and checked with `docs:check -- comment-proof`.
- [ ] **ASSUMPTION:** A stays one slice (no A1/A2 split) unless the step-2 inventory exceeds the
      kickoff's lists, in which case I stop and ask.
