# PR review r1 — Phase 4.5 — Slice A: placeholders to fixtures, one Splashing lookup, the 3.5 demo retired

Reviews `report-r1.md` against `kickoff.md`, `brief.md`, `plan.md` as `plan-handout-r1.md` corrects
it, the named sections of `phases/4.5/brief.md`, `CONVENTIONS.md#mechanism-goldens-vs-content-goldens`,
`CONVENTIONS.md#effect-carriers-live-in-libraries`, `spec/effects.md#validators`,
`spec/combat.md#adjacency-targeting` and `spec/responses.md#apply-stat-modifier`. Branch `4.5-a` at
`1472a55` ("build"), cloned and run in my own sandbox against `origin/main` at `00e9cb4` (PR #103).

## Verdict: fixes (two text-only edits; the code is right)

Everything the slice moves, deletes and rewires is correct, and every claim in the report
reproduced exactly: the nine traits are out of `src/data` and `TRAIT_REGISTRY`, Splashing runs the
`targeting.ts` export, the built page renders only the stub, and the byte-identical claim holds on
every golden export and the corpus. Each mechanism is caught by the test the PR names. Two strings
are wrong or awkward: one makes a false claim, so it is a real fix.

## Real fix (hand-out r1)

1. **The Stun exemption reason in `corpus-coverage.test.ts` is false.** It now reads "the only
   trait that applies it is a test fixture (the mechanism-test trait that stuns its bearer)". Three
   test traits apply `stun`: `REELING` (`__fixtures__/traits.ts`), `STUNNER_TRAIT`
   (`golden-status-timing-stun-one-turn`) and `SELF_STUN_TRAIT`
   (`golden-status-timing-turnstart-self-stun-once`), and `SELF_STUN_TRAIT` stuns its bearer too; a
   test spell (`self-stun-fixture`, `status-containers.test.ts`) applies it as well. The first half
   ("applied by no shipped spell, perk or trait") is right and is all the exemption needs.

## Labeling (in the same hand-out, since a round runs anyway)

2. **`SplashingDef` doc (`effect-types.ts`):** "The adjacency lookup is
   `spec/combat.md#adjacency-targeting`." says the lookup *is* a doc section. It cites the right
   rule (plan hand-out item 6 asked for exactly this citation); only the sentence needs to say what
   the citation is for.

## Scope and labeling (no action needed)

- **The stub was proved by a `dist` grep, not by rendered text or a screenshot** as the kickoff
  asked. I closed that: `vite preview` of the production build, loaded in Chromium, renders body
  text `"Depths of Souls"`, `#root` is `<main><h1>Depths of Souls</h1></main>`, and the console has
  no errors. The live URL is still checked after merge.
- **The `resolution.ts` tick comment** now says "a trait cost carries that label and a self target"
  instead of naming Catastrophic Collapse. I checked it: `damageSource` defaults to `'dot'`
  (`response.damageSource ?? 'dot'`, two lines above), so any self-targeted trait cost carries the
  label. Accurate.
- **The `BaselineEffectEntry` example** `'flickerling-wick-burn-bright'` is a real id
  (`data/traits/glimmerdark.ts:30`). The **Defensive Stance** comment's citation states what the
  comment says ("permanent for the fight", `spec/responses.md#apply-stat-modifier`). The
  **Regen/Stun** comments describe the `applyStatus` fallback, as the plan hand-out required.
- **`record.md`** is in the mailbox, which is where a slice's record lives
  (`WORKFLOWS.md#what-a-mailbox-keeps`, the folder layout above it). Nothing in the mailbox breaks
  the rule; **To delete:** nothing.
- **CI:** I can't read the PR's check runs from this session. Please glance that CI is green on
  `1472a55`; my local run of every gate is.

## Decide-point

**1. Run a fix round for two strings, or merge and carry them?**
- **Recommendation: run r2.** Both edits are one line each in test or comment text, so the build is
  minutes and the r2 review is mechanical (a two-line diff plus the gates). The alternative, folding
  them into 4.5-B, puts unrelated text edits into a slice whose golden diff is meant to be read line
  by line; and merging with a false statement in a test is exactly the "close enough" Duncan has
  overruled before.
- **If you'd rather merge now:** say so, I mark this review approved, and the two items go into
  4.5-B's kickoff as a "text fixes carried from 4.5-A" note.

## Decisions

- **Verdict: fixes.** Duncan runs the fix round: the coding agent builds `handout-r1.md` and answers
  with `report-r2.md`; review r2 checks the two edits and reruns the gates.

## What I verified, and how

**Gates** (fresh `npm ci`; `vitest` 5.0.3, matching `package-lock.json`): `npm run test` 212 files,
**1851 passed | 1 skipped**; `lint`, `format:check`, `build`, `npx tsc -b` green;
`docs:check -- citations` PASS (637 citations in 435 files); `-- comments` PASS (6977 comments, 1630
titles); `-- budgets` 0 over.

**Tests reconciled file by file** (`vitest --reporter=json` on both trees): `main` 1850 passed |
1 skipped, 212 files. The only files that differ are `data/traits/core.test.ts` 10 → gone,
`app/demoFight.test.ts` 1 → gone, `__fixtures__/traits.test.ts` new with 9, `data/traits/index.test.ts`
new with 3. By title, every `core.test.ts` test reappears unchanged except the grouping test, whose
title lost "core/"; the two new titles are the validate and no-fixture-in-registry tests. Net +1.

**Byte-identical, by import** (a throwaway test in each tree, removed after; `import.meta.glob` over
all 135 `__golden__/*.fixture.ts` plus the 3 `__corpus__` modules, every export canonicalised with
Maps and functions, then deep-compared):
- Key sets equal in all 138 modules. **No `expected*` export changed anywhere.** The corpus modules
  are identical, and `git diff main -- src/engine/__corpus__/` is empty.
- The six named goldens change only `traits`: in each, it holds exactly the nine ids, and each entry
  deep-equals `main`'s `TRAIT_REGISTRY.get(id)`.
- 45 other exports changed, all of them trait registries that carry `TRAIT_REGISTRY` (41 `traits`
  exports and the `traits` field of the sub-fixtures `allyDies`/`gleamDies` in `golden-last-gleam`
  and `aloneAndHurt`/`hurtOthersFull` in `golden-wick-gates`). Each equals `main`'s value with the
  nine removed and nothing else changed, the three that merge a local fixture trait
  (`lullpollen-dozer`, `spider-broodwarden`, `status-snapshot-tick-dead-applier`) included. This is
  the shared-registry move, not an expected-value change.
- `TRAIT_REGISTRY` goes from 70 to 61 entries: exactly the nine removed, the other 61 deep-equal and
  in the same order.
- Text diff of the six fixtures and `resolution.test.ts`: only the import line and the
  `traits`/`registries` line, as claimed.

**Code read against the spec:** `adjacentLivingTargets` is defined once (`targeting.ts:148`);
`actions.ts` imports it and the private copy and its doc are gone. The fixture module imports only
the `Trait` type, so no `__fixtures__` module imports `src/data`. `src/ui` is unchanged and nothing
imports `CombatDemo`. The acceptance grep (the report's command) over `src/data src/state src/app
src/ui` prints nothing. Leftover search for `traits/core`, `demoFight` and the nine names in `src/`
and the living docs: only `CombatDemo.tsx`'s comment (unchanged, by design) and the two
`CONVENTIONS.md` passages this review rewrites.

**Mutations**, each against the full suite, restored after:

| Mechanism | Mutation | Fails |
| --- | --- | --- |
| One adjacency lookup | `targeting.ts` drops the `after` neighbour | `targeting.test.ts` (3), `golden-splashing`, `golden-additional-splashing`, `splashing.test.ts` |
| No fixture trait in game data | a `'brutish'` trait added to `STOCK_TRAITS` | `index.test.ts > holds no mechanism-test fixture trait` only |
| Fixture traits validated | Bloodlust modifies `health` under its `hp-percent` gate | `traits.test.ts` validate test + Bloodlust test, `golden-conditional-passive` |
| Registry assembly | `...STARTER_TRAITS` dropped | `index.test.ts` grouping test, plus 80 others (starter goldens, store, balance CI, digest) |
| Stun stays exempt | `STATUS_EXEMPTIONS` emptied | `corpus-coverage.test.ts` |
| Ids resolve only from the fixture | `golden-stun` back on `TRAIT_REGISTRY` | `golden-stun.test.ts` (unknown trait id) |

**Live behaviour (step 6):** not run. The slice changes no behaviour, and every export and the
corpus digest are byte-identical, so a corpus scan can't find anything `main`'s doesn't.

## Docs edited

- `CONVENTIONS.md#mechanism-goldens-vs-content-goldens`: the `**Known bug:**` line removed (the nine
  traits are out of game data).
- `CONVENTIONS.md#effect-carriers-live-in-libraries`: the trait library has no `core.ts`; the
  spell library keeps its `core.ts` until 4.5-E's review.
- `ROADMAP.md#phase-45--run-loop-demo-interlude`: the demo replaces the live site's stub, not the
  3.5 demo.
