# Plan — 4.5-A: placeholders to fixtures, one Splashing lookup, the 3.5 demo retired

Read: `CLAUDE.md`, `workflow/coding-rules.md`, the kickoff, `phases/4.5/A/brief.md`, the named
`phases/4.5/brief.md` sections, and the code the kickoff lists. `CONVENTIONS.md` and the spec files
(`effects.md`, `combat.md`) are read as the kickoff names them; this plan reaches no subsystem the
kickoff doesn't name. No kickoff-versus-docs conflict found.

## Golden policy (from the kickoff)

**Byte-identical.** No golden's `expectedEvents`/`expectedResult` (or other expected export)
changes; `src/engine/__corpus__/corpus-digest.fixture.ts` is untouched; `corpus:update` is not run.
The six placeholder goldens (`conditional-passive`, `conditional-trigger`, `loop-safety`,
`round-end-interaction`, `stun`, `triggered-damage`) change only their `TRAIT_REGISTRY` import and
their `traits` export line. Anything else is a bug. Proof: the changed fixtures' expected exports
are compared against `main` by importing both (`main` in a scratch worktree outside the repo), and
`git diff main -- src/engine/__corpus__/` is empty.

## Approach and changes, by file

### 1. Placeholders to fixtures

- **`src/data/traits/core.ts` → `src/engine/__fixtures__/traits.ts`** (plain `mv`). Rewrite the
  header: the file holds the nine mechanism-test traits, test-only, never registered in game data
  (cites `CONVENTIONS.md#mechanism-goldens-vs-content-goldens`). Consts and bodies unchanged. Add
  `export const FIXTURE_TRAITS_BY_ID: ReadonlyMap<string, Trait>`, built like
  `FIXTURE_SCRIPTS_BY_ID`, from a `FIXTURE_TRAITS` array of the nine. Imports only the `Trait`
  type from `../effect-types`; no `src/data` import.
- **`src/data/traits/core.test.ts` → `src/engine/__fixtures__/traits.test.ts`** (plain `mv`).
  Keeps the eight existing behaviour tests (BRUTISH, BLOODLUST, SWIFT_STRIKER, RETALIATE, GRUDGE,
  VENGEFUL, REELING, CATASTROPHIC_COLLAPSE), one to one. Their `instantiateTraitEffects` helper
  and the three `TRAIT_REGISTRY` reads switch to `FIXTURE_TRAITS_BY_ID`. The two registry-assembly
  tests leave (below). New in this file: a `validateTrait` test over all nine (see mechanisms).
  RECKLESS has no behaviour test today; it is covered by the validate test and `golden-loop-safety`,
  and no new behaviour test is added (scope).
- **`src/data/traits/index.ts`**: drop the `./core` import, the nine names from the import list,
  `export * from './core'`, and the nine `STOCK_TRAITS` entries. Reword the `STOCK_TRAITS` comment on
  `...STARTER_TRAITS` (drop "alongside the representative-and-temporary set above"). `validateTrait`
  and the load-time loop stay.
- **`src/data/traits/index.test.ts` (new)**: the two registry-assembly tests from `core.test.ts`
  ("registers every stock trait by id"; "every library grouping … spread into STOCK_TRAITS"). The
  grouping test drops its `BRUTISH` line and its "core/" wording; nothing else changes. Plus the new
  no-placeholder test (below).
- **Six goldens** (`src/engine/__golden__/golden-{conditional-passive,conditional-trigger,loop-safety,
  round-end-interaction,stun,triggered-damage}.fixture.ts`): replace
  `import { TRAIT_REGISTRY } from '../../data/traits'` with
  `import { FIXTURE_TRAITS_BY_ID } from '../__fixtures__/traits'` and
  `export const traits = TRAIT_REGISTRY` with `= FIXTURE_TRAITS_BY_ID`. Each carries one placeholder
  and no real trait, so the nine-only registry suffices. Header comments naming the trait stay.
- **`src/engine/resolution.test.ts`**: the two `retaliate` loop-safety cases (lines 225, 246) and
  the `grudge` case (377) pass `FIXTURE_TRAITS_BY_ID`. The `TRAIT_REGISTRY` import stays for the six
  other uses (444, 612, 999, 1047, 1667, 1738); I will check each for a placeholder id and, if any
  turns up, merge locally. A missed one throws "unknown trait id" in `resolveBaselineEffects`, so
  the test run finds it.
- **`src/engine/corpus-coverage.test.ts`**: the `stun` exemption stays; only the reason string
  changes: Stun is applied by no shipped spell, perk or trait (the only trait that applied it is a
  test fixture). Keep the entry.
- **Comment rewrites** (each cites the fixture or the rule, never game data):
  - `data/specializations.ts:492` Defensive Stance: "traits.ts's GRUDGE" → the Grudge fixture
    (`src/engine/__fixtures__/traits.ts`).
  - `data/statuses.ts:86` Regen: drop the `demoFight.ts` cite; `:97` Stun: drop the `REELING` cite.
    Reword to say the default is documentary / matches the status's usual duration, without naming a
    source.
  - `engine/resolution.ts:883`: replace `CATASTROPHIC_COLLAPSE` with a plain description (a trait
    cost carries the `'dot'` label and a statusId + self shape).
  - `engine/effect-types.ts`: (a) `StatPercent` doc (~line 49): check the claim first. The
    Catastrophic Collapse cost is `flatAmount: 999`, so it is not a stat-percent reader; the
    example is wrong and I'll replace it with a real one (the Wick's burn and heal already named);
    (b) `BaselineEffectEntry` doc (~1051): `'brutish'` example → a real trait id (a shipped one);
    (c) `SplashingDef` doc (~743): one lookup, in `targeting.ts`, no ROADMAP cite.
  - Left alone: `CombatDemo.tsx` (byte-unchanged, incl. its `demoFight.ts` comment),
    `golden-cost-and-tick-exclusion` header (describes the fixture), the `'brutish'` labels in
    `conditions.test.ts`/`effects.test.ts`, and the other Retaliate look-alikes.

### 2. One Splashing lookup

- **`src/engine/actions.ts`**: delete the private `adjacentLivingTargets` (lines ~451–469) and its
  doc; add `adjacentLivingTargets` to the `./targeting` import (check whether `actions.ts` already
  imports from it). The `splashTargetIds` doc ("look it up before the main hit") stays, with the
  "indexes into" wording kept accurate.
- **`src/engine/targeting.ts`**: unchanged (the export already carries the same doc comment).
  `targeting.ts` imports nothing from `actions.ts`, so no cycle (re-verified when editing).

### 3. Retire the 3.5 demo

- **`src/app/App.tsx`**: renders `<main><h1>Depths of Souls</h1></main>` and imports nothing from
  `./demoFight` or `../ui/CombatDemo`.
- **`src/ui/CombatDemo.tsx`**: byte-unchanged and unused.
- **Duncan deletes** `src/app/demoFight.ts` and `src/app/demoFight.test.ts` (checkpoint below).

## Order and the deletion checkpoint

1. `mv` both files; edit the barrel, new `index.test.ts`, the six goldens, `resolution.test.ts`,
   `corpus-coverage.test.ts`, the comments, `actions.ts`, `App.tsx`.
2. **Checkpoint: ask Duncan to delete `src/app/demoFight.ts` and `src/app/demoFight.test.ts`** before
   any gate runs (they import the placeholders from `data/traits`, so `tsc -b` can't pass otherwise).
   I stop and wait; I don't run `tsc`/`build`/the full gate set until Duncan confirms.
3. Run the gates, then the mechanism break-tests, then the byte-identity comparison, then the
   preview screenshot.

## Mechanisms and the test that fails with each removed

| Mechanism | Site | Test that fails without it |
| --- | --- | --- |
| Nine ids resolve only from the fixture registry | each of the six goldens | the golden's own test fails: `resolveBaselineEffects` throws on the unknown id if `traits` goes back to `TRAIT_REGISTRY` (shown once per golden by temporarily restoring the import) |
| Same | `resolution.test.ts` (3 cases) | the three cases throw the same way if reverted |
| Same | `traits.test.ts` | the 8 behaviour tests fail if `FIXTURE_TRAITS_BY_ID` lacks an id |
| No placeholder in game data | `data/traits/index.test.ts` | new test: for every `FIXTURE_TRAITS_BY_ID` id, `TRAIT_REGISTRY.has(id)` is false. Shown failing by putting one fixture trait (e.g. `BRUTISH`) back in `STOCK_TRAITS`. Plus the acceptance grep for the nine ids and const names over `src/data`, `src/state`, `src/app`, `src/ui`, output included |
| Fixture traits stay validated | `traits.test.ts` | new test: `validateTrait` over all nine. Shown failing with one fixture trait broken so a validator throws (e.g. a self-reading stat-modifier condition on Bloodlust, tripping `validateStatModifierConditions`). Restored after |
| Registry assembly | `data/traits/index.test.ts` | the two moved tests: unspread grouping or a registry key mismatch fails them (shown by dropping `...STARTER_TRAITS`) |
| Single adjacency lookup | `actions.ts` + `targeting.ts` | break `targeting.ts` (drop the `after` neighbour): `targeting.test.ts` and `golden-splashing` both fail. Plus grep: `function adjacentLivingTargets` defined once |
| Stun stays exempt | `corpus-coverage.test.ts` | dropping the entry fails the test (the exemption is checked both ways); shown once |
| Stub | `App.tsx` | not a mechanism (no new behaviour); proved by `npm run build` and the built page's rendered text |

All break-tests are temporary edits, reverted, and reported with the failing output.

## Proof the report will carry

- Gates: `npm run test`, `lint`, `format:check`, `build`, `npx tsc -b`, `docs:check -- citations`,
  `docs:check -- comments`.
- Tests reconciled file by file against `main`: `core.test.ts` (10 tests) → `traits.test.ts`
  (8 behaviour + 1 new validate test) and `index.test.ts` (2 moved + 1 new no-placeholder);
  `demoFight.test.ts` removed (count read from `main`). Net delta stated with its parts.
- Byte-identity by import: a scratch worktree of `main` outside the repo; a throwaway script
  (not kept) imports each changed golden fixture's `expectedEvents`, `expectedResult`, `playerParty`,
  `enemyParty`, `scripts`, `statuses`, `SEED` from both trees and deep-equals them. Each changed
  fixture's diff shows only the import and `traits` line. `git diff main -- src/engine/__corpus__/`
  empty. The throwaway script is not left in the repo.
- Rename map (two `mv`s) and **To delete** list confirmed done.
- Spec questions / Content changes: expected "none" except the stale living-doc text (below).
- Living-doc text made stale, to list under **Spec questions** (not edited by me):
  `CONVENTIONS.md#effect-carriers-live-in-libraries` (names `core.ts`) and
  `CONVENTIONS.md#mechanism-goldens-vs-content-goldens` (the `**Known bug:**` line), per the
  kickoff.
- Record to `phases/4.5/A/record.md`.

## Assumptions checklist

- [ ] **ASSUMPTION (4.5-A stub, from the phase brief):** the stub is `<h1>Depths of Souls</h1>` in a
      `<main>`, no controls, no phase id, no other text. Confirming, not correcting, the brief.
- [ ] **ASSUMPTION:** the export is named `FIXTURE_TRAITS_BY_ID`, with a `FIXTURE_TRAITS` array
      beside it (the kickoff's recommendation).
- [ ] **ASSUMPTION:** the new `validateTrait` test lives in `traits.test.ts` and imports
      `validateTrait` from `../../data/traits` (a test may import `data/`; the fixture module itself
      doesn't).
- [ ] **ASSUMPTION:** no new test for RECKLESS's behaviour or for the stub; RECKLESS is covered by
      `golden-loop-safety` and the validate test, the stub by the build and preview check.
- [ ] **ASSUMPTION:** the six `TRAIT_REGISTRY` uses in `resolution.test.ts` other than the three
      named cases (444, 612, 999, 1047, 1667, 1738) carry no placeholder id; the test run confirms it.
- [ ] **ASSUMPTION:** the `StatPercent` doc's `CATASTROPHIC_COLLAPSE` example is wrong (its cost is
      `flatAmount: 999`) and is replaced, not merely reworded. The replacement example is a real
      shipped trait I will pick when editing, and verified against its data.
- [ ] **ASSUMPTION:** the `Regen`/`Stun` `defaultDuration` comments are reworded to drop their
      sources, with no change to the values (3 and 1).
- [ ] **ASSUMPTION:** `CombatDemo.tsx`'s own comment naming `demoFight.ts` stays (the file is
      byte-unchanged), and `docs:check -- comments` doesn't flag it; confirmed when the gate runs.
- [ ] **ASSUMPTION:** the deletion checkpoint comes after all edits and before any gate; I don't
      run `tsc`/`build` until Duncan confirms the two files are gone.
