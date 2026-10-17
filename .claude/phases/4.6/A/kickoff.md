# Kickoff — Phase 4.6 — Slice A: Engine hardening

Build ONLY this slice. Standing rules: .claude/workflow/coding-rules.md.

## Read (in addition to the standing list)

- Spec files: `spec/combat.md`, `spec/effects.md`, `spec/responses.md`, `spec/statuses.md`.
- `CONVENTIONS.md#snapshots-are-never-written-to`,
  `CONVENTIONS.md#combatstate-is-plain-data-never-modified-after-being-returned`,
  `CONVENTIONS.md#every-golden-replays-through-one-shared-runner`,
  `CONVENTIONS.md#a-mechanism-at-more-than-one-site-is-tested-at-each-site`.
- The slice brief `phases/4.6/A/brief.md`, and in `phases/4.6/brief.md`: `#slices` (A's row and
  the split table), `#sequencing-rules`, `#assumptions` (the `(A)` item), and the six sections A
  builds: `#fight-setup-checks-its-input`, `#the-load-time-checks-close-their-gaps`,
  `#no-living-creature-at-0-hp`, `#a-zero-count-is-a-no-op-for-every-response`,
  `#small-engine-fixes`, `#the-snapshot-lock-covers-maps-and-sets`. Those sections are the spec
  for this slice. The seven `**Known bug:**` lines `A/brief.md` lists say what `main` does today.
- Code to understand first: `combat.ts` (`createCombat`, `rollWebBreakFree`); `effect-types.ts`
  (`validateTrait`, `validateStatusDef`, `isSnapshotTick`, the `ResponseTarget` union);
  `data/specializations.ts` (`validateSpecialization`, `resolvePerkEffects`); `effects.ts`
  (`resolveBaselineEffects`, `effectsForHook`, `takenFactorFor`, `gatherTakenFactors`);
  `effective-stats.ts` (`effectiveMaxHp`); `resolution.ts` (the `fireHook` observation gates
  ~555-600, the `stacks: false` claim ~640-648, `apply-stat-modifier` ~1102, the zero-count
  guards in `deal-damage` ~908 and `heal` ~1045, `revive` ~1180, `triggering-ally` ~719);
  `test-utils/deep-freeze.ts`, `test-utils/golden-runner.ts` (the `setup` step);
  `__fixtures__/creatures.ts`, `__fixtures__/traits.ts`; `state/store.ts`'s `PARTY_SIZE` and
  `resolvePlayerParty`.
- Goldens this slice touches: `golden-round-end-interaction`, `golden-defend-count-additive-cap`,
  `golden-heal-scaling-count`, `golden-necromoss-reclaim`. Read the setup-based precedent in
  `golden-revive-cap-exclusion` and `golden-wick-gates`.

## Scope

The six brief sections above, nothing else: `createCombat` throws on bad input (unknown
`scriptId`, a non-fresh creature, bad slots or duplicate ids) and validates the side effects it
is given; the load-time checks reject an uncapped additive taken-pool reduction (both shapes:
`taken-reduction` and a `'taken'` `damage-modifier`) and `emitTriggerFired: false` outside a
status tick; effective max Health and a revive both floor at 1; a zero-count
`apply-stat-modifier` is a no-op; the Web roll, `on-action-observed`'s fail-closed and the
`stacks: false` claim are fixed; `triggering-ally` is deleted; the deep-freeze helper locks Maps
and Sets. Not in scope: anything in B–F, including the timing, Defend-count and Health-raise fixes
whose Known bug lines sit next to A's. If the plan comes out too big, split along the pre-agreed
line: **A1** setup and load-time checks, **A2** the runtime fixes and the deep-freeze helper.

## Golden policy

**Byte-identical, with two listed exceptions** (`phases/4.6/A/brief.md`):

1. `golden-round-end-interaction`: the fixture trait `CATASTROPHIC_COLLAPSE` loses
   `emitTriggerFired: false`, so the expected log gains exactly one event, `{ type:
   'TriggerFired', sourceId: P1, hook: 'on-round-end', effectId: 'catastrophic-collapse' }`,
   right before P1's 999 `DamageDealt`. Nothing else in that log moves.
2. `golden-defend-count-additive-cap` (`defendCount: 15`), `golden-heal-scaling-count` and
   `golden-necromoss-reclaim` (dead allies) move that state out of the party and into the
   fixture's `setup` step. **Their expected values stay byte-identical.**

Every other golden and the corpus digest are byte-identical. Unit tests that pass a non-fresh
creature to `createCombat` move that state onto the returned `CombatState` the same way, with
their assertions unchanged. Any throw beyond these lists is a stop-and-ask, never a quiet fix.

## Traps

**Fight setup**
- **Reproduce the old state exactly** when moving a non-fresh creature into `setup` or an
  `updateCreature` after `createCombat`. `createCombat` overwrote `currentHp` with effective max
  for every input creature, dead ones included. So a moved dead ally is `{ alive: false }` with
  `currentHp` left at max, **not** `currentHp: 0` as the revive-cap goldens use. The copied pattern
  is the wrong one here. `defendCount` passed through untouched, so it stays 15.
- **Don't check `currentHp`** for freshness: `createCombat` sets it. The fields are the brief's
  list: `baselineEffects`, `activeEffects`, `alive: false`, `defending`, `provoking`, non-zero
  `defendCount`, non-zero `revivesUsed`.
- **The `revivesUsed: 0` reset becomes unreachable** once a non-zero value throws. The
  `createCombat` doc comment ("never trusts those fields") and `__fixtures__/creatures.ts`'s
  comments on `baselineEffects` / `revivesUsed` ("always-reset-to-0 rule") go stale. Rewrite
  them, or `docs:check -- comments` and the next reader both suffer.
- **Slots: unique, within 0–5, ascending in array order. Not contiguous.** The store happens to
  re-slot densely (`resolvePlayerParty`), but the brief doesn't require it. Adding a contiguity
  rule is a new decision; raise it under Spec questions, don't build it.
- **The boundary check is the fix for the five array-order readers** (`actions.ts:446`, `:682`,
  `targeting.ts:11`, `:20`, `:152`). Don't also rewrite them to sort by slot: that's a second
  mechanism for one guarantee.
- **The party-size bound** is the brief's `ASSUMPTION (A)`: an engine constant in
  `engine/config.ts` that `store.ts`'s `PARTY_SIZE` then reads. Confirm or correct it in the
  plan's checklist.
- **`scriptId`:** `null` stays valid. An omitted `scripts` registry is empty, so any non-null
  `scriptId` throws then.

**Load-time checks**
- **One effect-list validator for every carrier.** `validateSpecialization` repeats
  `validateTrait`'s six calls by hand. A seventh check added to one list and not the other is the
  bug class L13 came from. The two new checks must reach traits, perks (at import and the side
  effects `createCombat` is given) **and statuses**: an additive taken `damage-modifier` usually
  lives in a status, and a status's non-tick trigger can carry the flag too.
- **"Validated at the level bought"** is met by validating `createCombat`'s side effects, which
  arrive resolved at their level. Whether the import check also sweeps every level `1..maxLevel`
  is the plan's call: mark it `ASSUMPTION`. My recommendation is yes: it's cheap, and a bad level
  then fails at import, not at fight setup.
- **`emitTriggerFired: false` is legal only where `isSnapshotTick(response)`** is true. Read it off
  the response, not the carrier type.
- **`reductionCap` "below 1":** `?? 1` in `takenFactorFor` becomes unreachable for an additive
  source. Its comment ("default 1 -- unclamped -- if somehow omitted", `effects.ts:283`) goes
  stale.
- **`CATASTROPHIC_COLLAPSE`'s `damageSource: 'dot'` stays.** It's a label on the `DamageDealt` the
  golden pins; "tidying" it moves a second event. Only the flag and the comments that call the
  hit DoT-like (the fixture's and the golden header's "matches DoT convention") change.

**Runtime fixes**
- **Max Health floor: one home.** Floor in `effectiveMaxHp`, which the clamp, the HP% read and
  fight-start HP all go through. Not in `getEffectiveStat`: goldens read
  `getEffectiveStat(…, 'health')` raw for heal amounts.
- **Revive floor:** `max(1, round(baselineMaxHp × pct))`. The cap and RNG logic around it stay as
  they are.
- **Zero-count `apply-stat-modifier`:** return before the target loop, mirroring the `deal-damage`
  and `heal` guards (`if (response.magnitudeSource && count === 0)`). `TriggerFired` is already
  out (`fireHook` emits it), and that's the fizzle shape (`spec/responses.md#fizzles`); don't
  suppress it.
- **Web roll: keep the draw count.** The bearer list and each bearer's effect list are taken once
  (`spec/statuses.md#turn-order`). Only the `activeEffects` the removal filters from is read
  fresh (`getCreature(working, bearerId)`). Re-reading the effect list mid-loop changes which
  effects roll, and so the RNG stream.
- **`on-action-observed` fails closed with or without a filter.** Today the actor lookup sits
  inside `if (effect.observationFilter)`. A fix placed there leaves unfiltered observers firing,
  and the spec says "filter or not" (`spec/effects.md#damage-observation`).
- **`stacks: false` key = the effect's definition, never its instance id.** Instance ids differ
  per creature, so keying on them splits the claim across carriers. Two Overtones would each roll
  again, which is exactly what the rule exists to stop. The key must name the carrier kind
  (status vs trait vs side-effect slot, so a trait id equal to a status id no longer collides)
  and the effect's position within its carrier (so two triggers in one trait are two claims).
  `ResolvedHookEffect` carries no position today; how it gets one is the plan's choice
  (`ASSUMPTION`). The claim stays before the chance roll, and after the skip
  (`damage-channel.test.ts:295`).
- **`triggering-ally`:** the union member, its `resolution.ts` case and any fixture or test that
  names it. The exhaustive switches and `tsc` find the rest.

**Deep-freeze**
- **Install the throwing `set`/`delete`/`clear` (Map) and `add`/`delete`/`clear` (Set) before
  `Object.freeze`**: a frozen object takes no new properties. Make them non-enumerable own
  properties, so `toEqual` on a frozen Map is unaffected.
- **The early `if (Object.isFrozen(value)) return value`** would skip a Map someone froze
  earlier. Nothing freezes registries today; keep it that way or handle it.
- **Shared registries get locked for the rest of their test file.** The golden runner freezes
  `state.statuses` / `.scripts`, which are often the module-level `STATUS_REGISTRY`,
  `FIXTURE_SCRIPTS_BY_ID` and so on. Today's writers copy first
  (`status-containers.test.ts:114`, `balance-sim.ts:281`). A test that writes into a shared
  registry after a golden ran would now throw: stop-and-ask, as for any guard.
- The helper's header says the Map gap "is a non-issue"; rewrite it.

## Must stay green

All gates in `coding-rules.md`. Every golden's expected values except the one listed
`TriggerFired`; the corpus digest fixture untouched; the CI balance verdicts test; the existing
`stacks: false` tests (`actions.test.ts:403`, `damage-channel.test.ts:295`,
`death-observed.test.ts`) and the Overtone echo test (`perform-action.test.ts:228`); the
revive-cap goldens; the fixture-registry test (`__fixtures__/traits.test.ts`), which doesn't pin
the flag; the store and simulator suites (the store builds fresh input, so a throw there is a
real bug, not a test to adjust).

## The PR must prove

- **An inventory of every throw the new guards cause**, from running the suite with each guard
  on before any test is adjusted. It matches the listed goldens and unit tests exactly, or the
  slice stopped and asked.
- **Golden policy, by importing the fixtures** (not by reading diffs): every expected value
  byte-identical except `golden-round-end-interaction`, whose expected array differs from
  `main`'s by exactly the one listed event at the listed index. The three `setup`-moved goldens'
  expected arrays are identical to `main`'s, and their `initial` state equals what `main`'s
  `createCombat` produced from the old parties. The corpus digest fixture is unchanged.
- **Each moved unit test** listed, with its assertions unchanged.
- **A test that fails with its mechanism removed, at each site**: every guard kind (unknown
  `scriptId`; each freshness field; duplicate slot, out-of-range slot, out-of-order array,
  duplicate id); side-effect validation (a bad perk at a level above 1); both load-time checks on
  each carrier they reach (trait, perk, side effect, status; both taken shapes); the max-Health
  floor and the revive floor (a `pct` that rounds to 0); the zero-count stat-modifier (no
  `StatModifierApplied`, `TriggerFired` still present); the Web roll (two break-free statuses on
  one bearer, both breaking in one cleanup, hand-derived draws); `on-action-observed` with an
  actor that can't be found, filtered and unfiltered; `stacks: false` (two triggers in one trait
  both fire; a trait id equal to a status id both fire; one claim still shared across
  creatures); deep-freeze (a `Map` and a `Set` write each throw).
- **`triggering-ally` gone:** no match in `src/`.
- **Spec questions:** the seven Known bug lines `A/brief.md` lists, each as built, and every
  living-doc line the slice makes stale (e.g. `spec/responses.md#response-targets` still lists
  `triggering-ally`).

## Docs edited at kickoff

- `phases/4.6/brief.md`: A's golden policy now carries its two listed exceptions; the load-time
  cap check covers both taken-pool shapes; `CATASTROPHIC_COLLAPSE` loses its flag
  (`#the-load-time-checks-close-their-gaps`); non-fresh test and golden inputs move to `setup` /
  `updateCreature` with the three goldens named (`#fight-setup-checks-its-input`).
- `phases/4.6/A/brief.md`: golden policy and "Done when" match the exceptions.
