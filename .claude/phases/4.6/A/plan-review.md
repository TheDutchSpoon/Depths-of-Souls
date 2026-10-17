# Plan review — 4.6-A: Engine hardening

## Round 1

**Verdict: changes needed.** The design holds up against the code. But step 2's expected inventory
is wrong in a way that would stop the build at its first gate. A forecast run of the planned guards
over today's suite (`phases/4.6/A/evidence/plan-review-guard-forecast.md`) found two classes of throw
the kickoff doesn't list: an unknown `scriptId` in 10 tests (three of them store tests) and
`emitTriggerFired: false` on two test-inline statuses. Each has a mechanical fix that leaves its
assertions unchanged. Pre-approving them (decide-point 1) turns that stop into a listed change.
Everything else the forecast measured matches the kickoff: no slot, id, cap or `revivesUsed`
throws; no `Map`/`Set` write after freezing anywhere in the suite; every shipped perk level passes.

### Plan fixes

1. **Step 2's expected inventory is the forecast's.** It lists:
   - six goldens and three `resolution.test.ts` tests that hold `CATASTROPHIC_COLLAPSE`. Dropping
     the flag clears all nine, and only `golden-round-end-interaction`'s expected log changes;
   - the freshness moves: three goldens, and 10 unit tests across `resolution.test.ts` and
     `combat.test.ts`;
   - decide-point 1's two classes, if approved.

   The inventory still runs, before any test is adjusted, and must match this list exactly.
   Anything else is still a stop-and-ask.
2. **Name what replaces `e.reductionCap ?? 1`** in `takenFactorFor`. "Throw-free type narrowing" is
   not a mechanism. A hand-built test state skips the load-time check (it puts `activeEffects`
   straight onto a creature), so the resolver still meets an uncapped additive source. Recommended:
   a resolver-invariant throw, as `heal` already throws on both `flatAmount` and `scalingStat`, plus
   a test that it throws. The silent `?? 1` is the quiet 100% reduction the check exists to forbid.
3. **The golden `initial` proof compares the whole `CombatState`**, not only the two parties: also
   `rng`, `effectInstanceCounter`, `turnClock`, `round` and the registries. A `setup` that moved
   state correctly but disturbed the counter would pass a party-only check.
4. **The `stacks: false` claim key is stamped at instantiation, not counted at lookup.** The key is
   `<kind>:<carrierId>#<index>`, where kind is `trait`, `side` or `status`, and index is the
   trigger's position in its carrier's own effect list.
   - `resolveBaselineEffects` stamps an optional `claimKey` on the `BaselineEffectEntry` of a
     `stacks: false` trigger only (`trait:<id>#<i>`, `side:perk-<n>#0`, `side:enemy-effect-<n>#0`).
     `withInstance` carries it onto the `TriggeredEffect`, so revive's re-instantiation keeps it.
   - `flatEffects` builds `status:<statusId>#<index>` for a status trigger, from the index it
     already has. Nothing is stored.
   - `effectsForHook` passes the key through, and `fireHook` keys `claimedNonStacking` on it. The
     claim point is unchanged.
   - `TriggeredDef.stacks` and Overtone are unchanged.
   - A non-stacking effect without a key is a resolver-invariant throw. The one hand-built test
     effect that reaches the claim, `actions.test.ts`'s `ECHO` fixture, gains its key.

   Tests, on top of the plan's set:
   - one trait instantiated twice on one creature (a test registry) makes one claim;
   - a side-effect trigger carried by two party members makes one claim;
   - a revived carrier keeps its key.
5. **The comment-only set is only `golden-revive-cap-exclusion` and `golden-revive-cap-fizzle`.**
   `golden-round-end-interaction` changes its expected log, and the three `setup` goldens change
   their inputs. All four fall under the golden policy, not
   `CONVENTIONS.md#comment-only-golden-edits-are-allowed`, so `comment-proof` runs on the two
   revive-cap files only.

### Assumptions

| # | Plan ASSUMPTION | Call |
| --- | --- | --- |
| 1 | (A) `PARTY_SIZE = 6` in `engine/config.ts`, re-exported by `store.ts` | **Confirm.** The store's own slot check (`store.ts:641`) then reads the engine's bound too. |
| 2 | Non-integer or NaN slot is out of range; ascending order only; no contiguity rule | **Confirm.** The contiguity rule stays a Spec question. |
| 3 | Slot and id checks on both sides, before the per-creature checks | **Confirm.** |
| 4 | One `validateEffectList(defs, label, 'status' \| 'permanent')`, messages byte-identical | **Confirm.** The status path keeps its own random-selector context (`status "<id>"'s "<hook>" trigger's response`) and its category, `on-round-end` and potency checks outside the shared list. |
| 5 | Import sweeps every perk level `1..maxLevel` | **Confirm.** The forecast swept every shipped perk at every level: none throws. |
| 6 | Additive cap must be a number `< 1`; negatives allowed; not for multiplicative or dealt | **Confirm.** That is the brief's rule. A lower bound would be a new rule, and no content comes near one. |
| 7 | `Spell.effects` not covered by the `emitTriggerFired` check | **Confirm.** A spell's effects emit no `TriggerFired`, and `validateSpellEffects` already rejects `flatAmount`. |
| 8 | `stacks: false` key = `status:<id>#<pos>` / `effect:<sourceTraitId>#<pos>`, derived at lookup, no stored field | **Correct:** stamped at instantiation (plan fix 4). |
| 9 | The same trait twice on one creature gets two claims | **Correct:** one claim, since both copies stamp the same key (plan fix 4). Phase 8 infused traits instantiate under their own trait id (`spec/creatures.md#equipment`). |
| 10 | Trait vs side-effect slot told apart by the `perk-<n>` / `enemy-effect-<n>` label | **Correct:** the kind is stamped (`side:`) where the effect is instantiated, not read off the label. |
| 11 | `deepFreeze` throws on a Map/Set frozen before it | **Confirm.** The forecast saw no write after freezing in the whole suite. |
| 12 | Comment-only golden header edits, checked with `comment-proof` | **Correct** to the two files in plan fix 5. |
| 13 | One slice, no A1/A2 split | **Confirm.** The mechanisms are small and independent. With decide-point 1 settled, step 2 has no predictable stop left. |

The plan changes nothing in the brief's Assumptions checklist. It confirms (A).

**Golden policy:** matches the kickoff, both listed exceptions included.

**Mechanism → test, at every site:** complete except plan fixes 2 and 4. The Web test pins the
draw count, and the `on-action-observed` tests cover both branches. The `stacks: false` set covers
both collision kinds and the cross-creature claim. Every load-time check row runs on every carrier
it reaches.

### Decide-points

1. **Pre-approve the two unlisted throw classes?** The kickoff says a store throw is a real bug,
   not a test to adjust. Here it isn't: production's `DEFAULT_REGISTRIES.scripts` holds `striker`.
   The store test's `makeDeps` passes only `FIXTURE_SCRIPTS_BY_ID`, so the real Unicorn has
   silently run the implicit fallback in those three tests. Fixes, each tried green in a scratch
   clone:
   - **unknown `scriptId`:** each test gets the registry its creatures name.
     - `combat.test.ts` instance-list: `FIXTURE_SCRIPTS_BY_ID` in place of `new Map()`.
     - `starters.test.ts`: the role scripts, plus `ALWAYS_CAST_SCRIPT`.
     - `store.test.ts`: `makeDeps` merges `STOCK_SCRIPTS_BY_ID` with `FIXTURE_SCRIPTS_BY_ID`.
   - **inline statuses:** `test-regen` (`resolution.test.ts`) and `single` (`status-containers.test.ts`)
     drop `emitTriggerFired: false`. Neither asserts on `TriggerFired`.

   **Recommend: yes.** Each failure is the guard doing its job on a test that broke the rule, and
   the fix restores the test's evident intent. Leaving it as a stop-and-ask would cost a round trip
   for a decision already in hand. The cost: the store's intro tests now run the Unicorn's real
   role script. Their assertions don't read the fight's course, and the file stays green.
2. **`stacks: false` position: derived at lookup (the plan) or stored on the effect?** Derived
   counts earlier same-carrier effects. That's stable today: a trait's effects are never removed,
   only appended after, and a status's effects are indexed per instance. Stored means a new field
   on every instantiated effect, which changes `activeEffects`' shape under every `toEqual` and the
   golden `initial` proof. Derived fails in one case only: one creature carrying the same trait
   twice gets a second claim. Phase 8's fusion is the only way to reach that. It already refuses
   two instances of the same creature, because "two identical innate traits are no trade-off", but
   not two different creatures that share a trait.

   **Recommend: confirm derived, and add one rule to `spec/creatures.md#fusion`: two parents that
   share an innate trait can't fuse.** It has the same rationale as the same-creature rule, keeps a
   creature's traits distinct, and leaves the claim key correct without a stored field. Today only
   the Sorcerer starter's trait is carried by two creatures, one of them a test fixture.

### Decisions

- **Decide-point 1:** yes. Both classes are listed changes, with the fixes given above.
- **Decide-points 2 and 3:** the claim key is the trigger's definition, stamped at instantiation
  (plan fix 4).
  - **Not counted at lookup:** counting gives a second claim once Phase 8 lets one creature carry
    a trait twice.
  - **Not an explicit `stackKey` in content:** that adds cross-trait groups no content needs, and
    two rules to police: mixed chances in one group, and one key on two hooks.
  - The options are compared in `evidence/stacks-false-second-look.md`. An explicit key can still
    be layered on later, as an override of the stamped one.
  - **Verified** in a scratch clone at `73cc126`:
    - with A built and today's suite run, every golden and 2,233 tests pass unchanged;
    - the only failures were two tests whose hand-built `ECHO` effect has no key, which led to the
      invariant throw above;
    - new tests pass on A: two triggers in one trait both fire; a trait and a status sharing an id
      both fire; one trait on two creatures is one claim; one creature with the same trait twice
      is one claim;
    - on today's `sourceTraitId` key, the first two fail.
  - Phase 8's infused traits instantiate under their own trait id (`spec/creatures.md#equipment`).
  - No fusion rule: `spec/creatures.md#trait-and-gem-slots` states that no two creature templates
    share a trait.

### Docs edited

- `phases/4.6/brief.md#fight-setup-checks-its-input`: the unknown-`scriptId` tests and their fix
  are listed.
- `phases/4.6/brief.md#the-load-time-checks-close-their-gaps`: the two test-inline statuses are
  listed.
- `phases/4.6/brief.md#small-engine-fixes`: `stacks: false` claims per definition, with a key
  stamped at instantiation.
- `spec/creatures.md#equipment`: an infused trait instantiates under its own trait id, so one
  trait carried twice is one claim.
- `spec/creatures.md#trait-and-gem-slots`: a creature's innate trait is its own; no two creature
  templates share one, so a creature's innate traits never repeat.

## Round 2

**Verdict: approved, with three plan fixes carried by the hand-out** (decide-point 1). The fold-in
is faithful: all six round-1 items are in the plan as handed out, and nothing outside them moved.
The plan's new ASSUMPTION K holds (checked below). One real gap remains, and the round-1 claim key
causes it: the only test that pins "a skipped candidate claims no slot" becomes vacuous.

### Plan fixes

1. **Re-pin "a skipped candidate claims no slot" where the new key can still observe it.**
   `damage-channel.test.ts:295` pins the order with two `stacks: false` triggers in one trait. On
   today's `sourceTraitId` key they share a claim, so a skip placed after the claim would starve
   the second trigger. With the stamped key they are `trait:two-effects#0` and `#1`: two claims.
   The test stays green whether the skip runs before or after the claim.
   - The `damageChannel` order is now **unobservable**, not just untested. Two candidates share a
     key only if they share a definition, and in one `fireHook` call they then share a
     `damageChannel` and the incoming channel. So they are skipped together or not at all. The
     depth-cap check is in the same position, since `cascade.depth` is per call.
   - Two skips stay observable, because they read the carrier: the **observation filter**
     (relationship to the actor) and the **condition** (live self). No existing test pins either
     one against the claim. `death-observed.test.ts:147` and `resolution.test.ts:2386` pin one
     claim across carriers, but neither skips a candidate.
   - Add to `stacks-false-claims.test.ts`, each with one trait carried by two creatures and the
     first in pass order skipped:
     - skipped by its `condition`: the second carrier still fires;
     - skipped by its `observationFilter` relationship: the second carrier still fires.

     Each fails with the claim moved above that skip.
   - `damage-channel.test.ts:295`: assertions unchanged. Its title and comment now say what it
     pins: within one trait, each channel-gated trigger answers only its own channel. That
     comment goes in "Comments that go stale".
2. **Gates** add `npm run docs:check -- comment-proof` on `golden-revive-cap-exclusion` and
   `golden-revive-cap-fizzle`. The plan names this check in "Comments that go stale" but leaves it
   out of the gate list.
3. **Report, Spec questions:** the `effectiveMaxHp` floor also reaches the Additional at
   `resolution.ts:258` (`calculateAdditional(attacker.level, effectiveMaxHp(target))`). That's
   correct under one home, and no content reaches a max below 1. Name it, so the PR review writes
   the floor where `spec/combat.md` defines the Additional too.

Wording only, not a fix: step 0 still says it dumps "the `createGoldenState(...)` parties" one
sentence before it says "whole `CombatState`", and calls the branch "clean at `f496e72`". The
whole-state sentence governs.

### Assumptions

| # | Plan ASSUMPTION | Call |
| --- | --- | --- |
| 1 | (A) `PARTY_SIZE = 6` in `engine/config.ts`, re-exported by `store.ts` | **Confirm** (as round 1). |
| 2 | Non-integer/NaN slot out of range; ascending only; no contiguity | **Confirm.** |
| 3 | Slot and id checks on both sides, first | **Confirm.** |
| 4 | One `validateEffectList`, messages byte-identical | **Confirm.** `createCombat` already validates the status and trait registries (`combat.ts:68`, `:72`), so the status row has its two sites. |
| 5 | Perk sweep `1..maxLevel` | **Confirm.** |
| 6 | Additive cap a number `< 1`; negatives allowed; NaN rejected | **Confirm.** |
| 7 | `Spell.effects` out of the `emitTriggerFired` check | **Confirm.** |
| K | No `stacks: false` trigger in the three `setup` goldens, so `claimKey` leaves their `initial` alone | **Confirm.** Their traits are `bulwark-additive-fixture` and its status, `necromoss-fixture`, and `NECROMOSS_WISP_TRAIT`; the only content `stacks: false` is Overtone (`glimmerdark.ts:249`). The corpus digest hashes events only (`corpus-digest.test.ts:digestFight`), so a stamped field can't move it. |
| 8 | `takenFactorFor` throws on an additive source without a cap | **Confirm** (round-1 hand-out item 3). |
| 9 | `deepFreeze` throws on a Map/Set frozen before it | **Confirm.** |
| 10 | Comment-only header edits on the two revive-cap goldens, with `comment-proof` | **Confirm**, and plan fix 2 puts the check in the gates. |
| 11 | One slice | **Confirm.** |

The plan still changes nothing in the brief's Assumptions checklist.

**Golden policy:** matches the kickoff.

**Mechanism → test, at every site:** complete except plan fix 1. The status claim key's site is
`flatEffects`, which is where a status's effects get their instance ids, so "stamped at
instantiation" holds there too.

### Decide-points

1. **Approve this round with the three fixes in the hand-out, or send it back for round 3?**
   **Recommend: approve.** The fixes are two small tests, one retitled test, one gate line and one
   report line. None of them changes a mechanism, an ASSUMPTION or the golden policy, and the
   hand-out wins over `plan.md` at build time. A round 3 would only re-check a fold-in this small,
   and the workflow treats a third round as a sign the slice needs a design pass, which it doesn't.

### Decisions

- **Decide-point 1:** approved. The three plan fixes go to the build in `plan-handout-r2.md`,
  which wins over `plan.md` where they differ.

### Docs edited

- None. The fixes are tests, a gate line and a report line, so no living-doc rule changes.
