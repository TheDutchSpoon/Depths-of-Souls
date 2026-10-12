# Report r1 — Phase 4.5 — Slice A

Built to `plan.md` as `plan-handout-r1.md` corrects it (items 1–7 applied; item 8 taken: one golden
and one `resolution.test.ts` case reverted, not all).

## Gates

All green, run after Duncan deleted `demoFight.ts` and `demoFight.test.ts`: `npm run test` (212 files,
**1851 passed | 1 skipped**), `npm run lint`, `npm run format:check`, `npm run build`, `npx tsc -b`,
`npm run docs:check -- citations` (PASS, 637 citations), `npm run docs:check -- comments` (PASS).

**Test count against `main`** (`main` run in a scratch worktree): 1850 passed | 1 skipped, 212 files.
Net **+1** (1850 → 1851):

| File | main | now |
| --- | --- | --- |
| `data/traits/core.test.ts` | 10 | gone (moved, see below) |
| `engine/__fixtures__/traits.test.ts` | – | 9 = the 8 behaviour tests, one to one, + 1 new `validateTrait` test |
| `data/traits/index.test.ts` | – | 3 = the 2 registry tests moved, + 1 new no-fixture-in-registry test |
| `app/demoFight.test.ts` | 1 | gone |

−10 −1 +9 +3 = +1. Files: −2 +2 (212 both).

## Golden policy: byte-identical

- `git diff main -- src/engine/__corpus__/` is empty; `corpus:update` not run.
- The six golden fixtures' diffs are only the `TRAIT_REGISTRY` import → `FIXTURE_TRAITS_BY_ID`
  import and the `traits` line.
- Compared by import (throwaway script in the scratchpad, not kept): each of the six fixtures
  imported from the `main` worktree and from this tree, export keys enumerated from the module,
  key sets equal, and every export except `traits` deep-equal: `SEED, enemyParty, expectedEvents,
  expectedResult, playerParty, scripts` (+ `statuses` for round-end-interaction and stun).
  `FIXTURE_TRAITS_BY_ID` holds exactly the nine ids, and each deep-equals `main`'s
  `TRAIT_REGISTRY.get(id)`.

## Mechanisms and the test that fails with each removed

(Each break-test was a temporary edit, reverted; `git status` and a full run afterwards are clean.)

| Mechanism | Break | Failing output |
| --- | --- | --- |
| Nine ids only in the fixture registry | `golden-stun` back on `TRAIT_REGISTRY`; `resolution.test.ts` line 226 (`retaliate` loop-safety case) back on `TRAIT_REGISTRY` | `golden-stun.test.ts` and `resolution.test.ts > loop safety > the re-entry guard bounds a mutual-retaliation loop` fail: `resolveBaselineEffects: unknown trait id "reeling" / "retaliate" -- not in the trait registry` |
| No placeholder in game data | `BRUTISH` put back in `STOCK_TRAITS` | `index.test.ts > holds no mechanism-test fixture trait`: `expected true to be false` |
| Acceptance grep | `grep -rnwE "'(brutish\|bloodlust\|swift-striker\|retaliate\|grudge\|reckless\|vengeful\|reeling\|catastrophic-collapse)'\|\b(BRUTISH\|BLOODLUST\|SWIFT_STRIKER\|RETALIATE\|GRUDGE\|RECKLESS\|VENGEFUL\|REELING\|CATASTROPHIC_COLLAPSE)\b" src/data src/state src/app src/ui` | empty output (exit 1) |
| Fixture traits stay validated | Bloodlust's modified stat changed `attack` → `health` (hp-percent condition reads health) | `traits.test.ts > every fixture trait passes the load-time trait validators`: `effect invariant violated: a stat-modifier cannot gate on hp-percent while modifying health (read-cycle)` (and the Bloodlust behaviour test fails too) |
| Registry assembly | `...STARTER_TRAITS` dropped | `index.test.ts > every library grouping (starters/overgrowth) is actually spread into STOCK_TRAITS` fails |
| One adjacency lookup (run after the private copy was deleted from `actions.ts`) | `targeting.ts`'s `adjacentLivingTargets` drops the `after` neighbour | `targeting.test.ts` (3 cases: `expected ['a'] to deeply equal ['a','c']`…) and `golden-splashing.test.ts` (event log one event short) fail. `function adjacentLivingTargets` is defined once, `targeting.ts:148` |
| Stun stays exempt | `STATUS_EXEMPTIONS` emptied | `corpus-coverage.test.ts > every status in STATUS_REGISTRY is applied…`: `statuses never applied: expected ['stun'] to deeply equal []` |
| Stub | not a mechanism | `npm run build` green; `dist` JS contains "Depths of Souls" and no demo strings. `App.tsx` is `<main><h1>Depths of Souls</h1></main>` and imports nothing. I did not take a browser screenshot; the live URL is checked after merge |

## As built, beyond the plan

- `FIXTURE_TRAITS_BY_ID` is exported from `traits.ts` with `FIXTURE_TRAITS`; the module imports only
  the `Trait` type from `../effect-types`.
- `actions.ts` still imports `Creature` (used elsewhere); only `adjacentLivingTargets` joined the
  `./targeting` import.
- The `BaselineEffectEntry` example became `'flickerling-wick-burn-bright'`. The `resolution.ts`
  tick comment now reads "a trait cost carries that label and a self target".
- The other six `TRAIT_REGISTRY` uses in `resolution.test.ts` carry no placeholder id (suite green).
- `CombatDemo.tsx` is byte-unchanged; its comment naming `demoFight.ts` passes `docs:check -- comments`.

## Spec questions

- `CONVENTIONS.md#effect-carriers-live-in-libraries` names `core.ts` for traits; there is no core
  grouping now (the kickoff's decided rewrite).
- `CONVENTIONS.md#mechanism-goldens-vs-content-goldens`: its `**Known bug:**` line about the
  placeholder traits in game data no longer holds.
- `content/overgrowth.md#stun`: still true (Stun stays in `STATUS_REGISTRY`, applied by no shipped
  content); only the `corpus-coverage` reason string changed.
- Not checked by me: any other living-doc text naming `data/traits/core.ts` or `demoFight.ts`
  (grep `.claude/` outside the mailboxes).

## Content changes

None. No creature, trait, spell or status changes behaviour; Regen (3) and Stun (1) default
durations are unchanged, only their comments.

## Rename map

- `src/data/traits/core.ts` → `src/engine/__fixtures__/traits.ts`
- `src/data/traits/core.test.ts` → `src/engine/__fixtures__/traits.test.ts`

## To delete

- `demoFight.ts`, `demoFight.test.ts`: done by Duncan.
- Scratch `main` worktree: `git worktree remove` on
  `C:\Users\dunca\AppData\Local\Temp\claude\c--Users-dunca-MyProjects-Depths-of-Souls\dcba771b-88d1-4d19-b4f1-9a161e582c99\scratchpad\main-wt`
  (it holds a `node_modules` junction to the repo's; remove the junction first, or use
  `git worktree remove --force`), then `git worktree prune`. It is outside the repo tree but
  registered in `.git`.
