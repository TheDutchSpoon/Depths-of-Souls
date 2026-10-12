# Plan review — Phase 4.5 — Slice A: placeholders to fixtures, one Splashing lookup, the 3.5 demo retired

## Round 1

I checked `plan.md` against `kickoff.md`, `phases/4.5/A/brief.md`, the named sections of `phases/4.5/brief.md`,
`CONVENTIONS.md`, `spec/effects.md#validators`, `spec/combat.md#adjacency-targeting` and the code on `4.5-a`
(`origin/main` plus the kickoff and plan commits). I re-checked each claim the plan makes about the code:

- `core.test.ts` has 10 tests: 2 registry tests and 8 behaviour tests, with none for RECKLESS.
- The six goldens each carry exactly one placeholder and no real trait. Every one of them exports only
  `SEED`, `playerParty`, `enemyParty`, `scripts`, `traits`, `expectedEvents` and `expectedResult`, plus
  `statuses` in `round-end-interaction` and `stun`.
- In `resolution.test.ts`, the placeholder ids appear only at lines 205, 217, 239, 267 (an `effectId`
  label), 370 and 402. All of them are inside the three named cases.
- The two `adjacentLivingTargets` copies are identical. `actions.ts` already imports from `./targeting`
  (lines 27–33), and `targeting.ts` imports nothing from `actions.ts`.
- Outside `demoFight.ts`, no file under `src/data`, `src/state`, `src/app` or `src/ui` uses a placeholder id
  or const name, apart from the two comments the plan rewords. `CombatDemo.tsx` imports only engine
  modules, so it still compiles once `demoFight.ts` is gone.

### Verdict

**Approved, with the fixes below carried in the hand-out** (none of them needs another review round), unless
Duncan takes **D1** into this slice, in which case it's **changes needed**. The design follows the kickoff. Fixes
1, 3 and 4 correct things the plan gets wrong. The rest are wording and labelling.

### Plan fixes

1. **The byte-identity script compares every export, and also compares the moved trait defs.**
   - Compare every export of each changed fixture except `traits`, by enumerating the module's keys. Don't
     use a hand-written list: today's list happens to match the exports, but a fixed list silently skips an
     export that gets added later.
   - Add a check on the one input that moved. `FIXTURE_TRAITS_BY_ID` has exactly the nine ids, and for each
     id, `FIXTURE_TRAITS_BY_ID.get(id)` deep-equals `TRAIT_REGISTRY.get(id)` imported from the `main`
     worktree. The goldens prove only the fields they exercise. BRUTISH and SWIFT_STRIKER are in no golden
     at all.
2. **Test titles.** `describe('stock traits (representative content)')` becomes false in both of its new
   homes. Retitle it to say what each file pins: the nine mechanism-test fixture traits in `traits.test.ts`,
   and the trait registry in `index.test.ts`. The grouping test's title drops "core/", as the plan says.
   Titles fall under `CONVENTIONS.md#comment-why-not-what`.
3. **`StatPercent` doc (`effect-types.ts:49`): delete `CATASTROPHIC_COLLAPSE`, and don't replace it.** The
   claim is wrong as the plan says: its self-hit is `flatAmount: 999`. But the parenthetical already names
   a real stat-percent reader, the Wick's burn and heal (`data/traits/glimmerdark.ts:40,50`,
   `{ ofStat: 'health', percent: 10 | 20 }`). So there's nothing to pick. Leave "(the Wick's burn and heal)".
4. **The Regen and Stun `defaultDuration` comments (`data/statuses.ts:86,97`) must not call the value
   documentary.** `applyStatus` reads it (`spec.duration ?? def.defaultDuration`, `resolution.ts:1360`)
   whenever an apply-status leaves out its duration. Reword both to say this is the fallback for an
   apply-status that omits `duration`, without naming a source. The values (3 and 1) don't change.
5. **The acceptance grep is pinned in the plan, and Defensive Stance cites the rule.**
   - Write the exact command in the plan: case-sensitive, the nine quoted ids (`'brutish'` … `'catastrophic-collapse'`)
     and the nine const names as whole words, over `src/data src/state src/app src/ui`. The expected output is
     empty.
   - The Defensive Stance comment (`data/specializations.ts:492`) cites `spec/responses.md#apply-stat-modifier`
     (permanent for the fight, so each fire adds one) rather than the fixture. A game-data comment shouldn't
     rest its justification on a test fixture, and the current text contains `GRUDGE`, which the grep matches.
6. **`SplashingDef` doc (`effect-types.ts:743`):** cite `spec/combat.md#adjacency-targeting` for the lookup,
   rather than naming a file. The spec rule already names `adjacentLivingTargets`.
7. **Splashing break-test order.** Break `targeting.ts` only after the private copy is deleted. While the copy
   still exists, `golden-splashing` stays green, and that green result is exactly the problem this slice
   removes. The plan's step 3 already comes after the edits. Say so in the mechanism row.
8. **Optional, the agent's call:** the "nine ids resolve only from the fixture registry" row isn't a
   mechanism. A revert throws "unknown trait id" for the same reason at every site. Reverting one golden and
   one `resolution.test.ts` case shows it. Six plus three reverts add report length and no information.

### Assumptions

- **4.5-A stub:** confirm. `<main><h1>Depths of Souls</h1></main>` is the brief's assumption as written: no
  controls, no phase id. It's the brief's checklist item, so Duncan ticks it.
- **`FIXTURE_TRAITS_BY_ID` + `FIXTURE_TRAITS`:** confirm. This matches `FIXTURE_SCRIPTS` /
  `FIXTURE_SCRIPTS_BY_ID` (`__fixtures__/scripts.ts:50,59`).
- **`validateTrait` test in `traits.test.ts`, importing from `data/traits`:** confirm. There's precedent:
  `held-statuses.test.ts` imports `STATUS_REGISTRY`, and three engine tests (`damage-observation`,
  `status-containers`, `status-snapshot`) already import `validateTrait` from `data/traits`. The fixture
  module itself stays free of `src/data`. See D1 for the asymmetry behind this.
- **No RECKLESS behaviour test, no stub test:** confirm. That's out of scope. RECKLESS is pinned by
  `golden-loop-safety` and by the validate test.
- **The six other `TRAIT_REGISTRY` uses in `resolution.test.ts` carry no placeholder:** confirm, and the grep
  above already verifies it. You don't need to wait for the test run.
- **`StatPercent` example replaced:** correct, see fix 3. Delete it; don't replace it.
- **Regen/Stun comments reworded, values unchanged:** correct, see fix 4.
- **`CombatDemo.tsx`'s comment naming `demoFight.ts` stays:** confirm. It carries no provenance, and the file
  stays byte-unchanged for 4.5-G1.
- **Deletion checkpoint after all edits, before any gate:** confirm.

### Golden policy

This matches the kickoff: byte-identical; only the import line and the `traits` line change in the six
fixtures; the corpus is untouched; `corpus:update` isn't run. Fix 1 makes the import comparison complete.

### Mechanism → test

The table is right apart from fixes 7 and 8. Each row names a test that fails with its mechanism removed:

- the no-placeholder test (fails when BRUTISH goes back into `STOCK_TRAITS`);
- the validate test (fails when BLOODLUST's modifier is moved to `health`, so its `hp-percent` condition
  reads the stat it gates);
- registry assembly (fails when `...STARTER_TRAITS` is dropped);
- one adjacency lookup (`targeting.test.ts` and `golden-splashing` both fail when the `after` neighbour is
  dropped);
- the Stun exemption (fails when it's dropped, because exemptions are checked both ways).

### Decide-points

**D1 — Should `createCombat` validate the trait registry it's given, the way it already validates statuses?**

- **What's there now.** `createCombat` runs `validateStatusDef` over the status registry it's given
  (`combat.ts:69`). `spec/effects.md#validators` says the reason: "so a test fixture's status is held to the
  same rules". Traits get no such check. `validateTrait` lives in `data/traits/index.ts` and runs only over
  `STOCK_TRAITS` at import. So today no inline test trait is ever validated, for example
  `golden-cost-and-tick-exclusion`'s two traits. This slice adds nine more traits that are validated only
  because the kickoff added a test for them.
- **The general fix.** Move `validateTrait` into `engine/effect-types.ts` next to `validateStatusDef` (it
  only composes engine validators), and have `createCombat` run it over its `traits` registry. Every valid
  fight stays byte-identical, and the cost per fight is trivial.
- **Recommendation: yes, but not in 4.5-A. Put it in 4.5-B's scope.**
  - 4.5-A's job is mechanical. The kickoff's test fully closes the gap A opens, and it is still needed
    either way: BRUTISH and SWIFT_STRIKER never go through `createCombat`.
  - 4.5-B already changes the trait validator for the new hook (`validateObservationFilters` gains
    `on-death-observed`), so it's the natural place to change the validator's home and its call sites.
    Being byte-identical, the change doesn't blur B's golden attribution.
  - One risk carries over to B: an existing test that hands `createCombat` an invalid inline trait would
    start throwing. That would be a latent test bug coming to light, and a stop-and-ask, not a quiet fix.
- **If you'd rather do it in A,** it becomes a fourth piece. The verdict becomes changes needed, and
  `spec/effects.md#validators` gains the trait rule at the PR review.

### Decisions

- **Verdict: approved.** The build reads `plan.md` and `plan-handout-r1.md`. Fixes 1–7 are required;
  fix 8 is left to the agent.
- **4.5-A stub:** ticked as written (`<main><h1>Depths of Souls</h1></main>`, no controls).
- **D1:** yes, in 4.5-B, not 4.5-A. 4.5-A builds the kickoff's `validateTrait` test of the nine fixture traits
  and leaves `validateTrait` in `data/traits/index.ts`. Moving it into the engine and calling it from
  `createCombat` is 4.5-B's (`phases/4.5/brief.md#createcombat-validates-its-trait-registry`).

### Docs edited

- `phases/4.5/brief.md`: new "Decided, not built" item `#createcombat-validates-its-trait-registry` (D1),
  linked from the 4.5-B slice row; the 4.5-A stub assumption ticked.
- `phases/4.5/B/brief.md`: scope and "Done when" carry the D1 item.
