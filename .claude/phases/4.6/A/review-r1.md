# Review r1 — 4.6-A: Engine hardening

Reviews `report-r1.md`. Branch `4.6-a`, commit `7e9d2e2` ("build"), against `main` at `2d6a08f`
(the merge base). The build answers to `plan.md` as `plan-handout-r2.md` corrects it.

## Verdict: fixes (cleanup only)

The engine changes are correct against the brief's six sections, the golden policy holds exactly,
and every mechanism I removed turned a named test red. What keeps this from approval is four
leftovers of the slice's own changes: two dead exported validators that seven tests still pin, a
comment the claim key made false, a sentence the slice corrected in three fixtures but not nine,
and an error message whose reason fits only two of its seven fields. All four are in
`handout-r1.md`. None changes behaviour.

## Real fixes

None. No behaviour is wrong against the spec.

## Cleanup (all in `handout-r1.md`)

1. **Dead random-selector validators.** `validateEffectList` inlines its own random-selector loop,
   so `validateNoRandomSelectorInResponseTargets` and `validateStatusNoRandomSelectorInResponseTargets`
   have no production caller. Seven assertions (`resolution.test.ts` ×4, `spell-effects.test.ts`
   ×2, `perform-action.test.ts` ×1) pin them. Removing the loop from `validateEffectList` turns
   only two tests red (`load-time-checks.test.ts` "keeps the random-selector message…",
   `status-containers.test.ts` "rejects a trigger inside a status that targets … 'random'"), so the
   live path is pinned, but three copies of one check is the drift the one-validator rule exists to
   stop. The plan said "the individual validators stay exported (tests call some directly)"; it
   didn't foresee that the entry point would stop calling them. Delete both, repoint the seven.
2. **`ResolvedHookEffect.nonStacking`'s comment** still says it is "always undefined for a
   status-sourced entry". The slice builds and tests status claim keys.
3. **"createCombat resets HP/statuses at fight setup"** is corrected in three goldens' `setup`
   comments and left in nine (leftover sweep). Comment-only.
4. **The freshness error** gives "or innate spells would double" as the reason for `alive: false`,
   `defending` and the rest. Name the failing field.

## Scope and labeling

- **`__fixtures__/traits.test.ts` was an unlisted victim** of the `CATASTROPHIC_COLLAPSE` flag and
  the agent went on instead of stopping. That miss was the kickoff's, not the agent's: the kickoff
  said the test "doesn't pin the flag", but it validates the fixture trait directly, so it fails
  with the guard on whatever it pins. The cause is the listed one, the listed change clears it and
  the test is byte-identical, so I accept it. The answer to the report's question: yes, the
  kickoff's list is meant to be exact, and an unlisted throw is still a stop-and-ask.
- **The toolchain caveat** (no `npm ci`, vitest 5.0.3 / prettier 3.9.9 / vite 8.3.3 against the
  lockfile's 5.0.4 / 3.9.10 / 8.3.4) is settled: my run after `npm ci`, on the lockfile versions,
  is green on every gate with the same counts. The agent read `npm ci` as a deletion; see
  decide-point 3.
- **`store.test.ts`'s comment** "the fixture ones win on a shared id" describes a case that doesn't
  occur (the stock and fixture script ids don't overlap). Harmless; not in the hand-out.
- **Mailbox:** clean. The five evidence files are each cited by a step file; nothing to delete.

## Decide-points

1. **Slot gaps stay legal.** The report built no contiguity rule (`[0, 2]` and `[3]` pass, pinned)
   and asks. *Recommendation: keep gaps legal.* Every reader needs only "array order is slot
   order", which the boundary check now guarantees; the store re-slots densely anyway, so a
   contiguity throw would guard nothing a reader depends on and add a class of input to keep valid
   by hand. I wrote "A gap is legal" into `spec/combat.md#fight-setup`; revert that line if you
   decide otherwise, and the rule becomes a hand-out item.
2. **`spec/effects.md` is at 100% of its budget** (38.9 of 39 KB) after this sync. I kept it under
   by folding the validators section's three duplicate bullets into the new list. Not over, so
   nothing to decide now, but the next slice that adds an effects rule (4.6-C or D) will take it
   over. *Recommendation: let that review decide; a split of the hook and observation half is the
   likely answer, since those rules stand apart from the effect taxonomy.*
3. **`npm ci` versus "never delete files".** The agent skipped `npm ci` because it empties
   `node_modules`, which collides with `coding-rules.md`'s no-deletion rule, and ran the gates on
   stale tools. *Recommendation: say outright that `npm ci` isn't a deletion.* I added that
   sentence to `coding-rules.md`; drop it from the diff if you'd rather keep the rule as it was.

## Verified, and how

All in my own clone (`npm ci` on both trees; Node 22.22.0, which the CI convention allows, against
CI's Node 24). I couldn't see the PR's CI run: the GitHub UI and API are closed to this session.

- **Gates on the branch:** `test`, `lint`, `format:check`, `build`, `tsc -b`, `docs:check`
  citations (747 in 530 files), comments (7692 comments, 2094 titles), budgets (0 over): all green.
- **Test count, file by file** from both trees' JSON reports: `main` 2236 (2235 passed, 1 skipped,
  257 files) → branch 2412 (2411, 1, 261). The only differing files are the report's eight: four
  new (33, 100, 11, 14) and `resolution` 83→94, `effective-stats` 18→23, `combat` 38→39, `effects`
  50→51. Matches the report exactly.
- **Golden policy, by import** (a throwaway test deep-comparing every export of all 145
  `__golden__/*.fixture.ts` on both trees, `undefined`, Maps and Sets encoded):
  - Every `expected*` export is identical except `golden-round-end-interaction`'s
    `expectedEvents`: 31 → 32, and removing index 12, `{ TriggerFired, p1, on-round-end,
    catastrophic-collapse }`, gives `main`'s array; index 13 is P1's 999 `dot` `DamageDealt`.
  - The `traits` registry export moves in the six goldens that hold `CATASTROPHIC_COLLAPSE`
    (content moving, not an expected value).
  - The three `setup` goldens change only their party exports and `setup`. Their
    `createGoldenState` output is a deep-equal whole `CombatState` against `main`'s.
  - Of all 145 initial states, five differ, each by fields only: four echo / non-stacking goldens
    gain `claimKey: 'trait:<id>#0'` on the `stacks: false` effect; the round-end golden loses
    `emitTriggerFired: false`.
  - Corpus digest fixture untouched; its test passes.
- **Comment-only edits:** `comment-proof origin/main` is `OK` for `golden-revive-cap-exclusion`,
  `golden-revive-cap-fizzle`, `__fixtures__/creatures.ts`, `generation.ts`, `golden-runner.ts`.
- **Web draws:** seed 7 from my own mulberry32 gives 0.0117, 0.0620 (then 0.9769), matching the
  test's comment.
- **Mutations: 23 of my own, none survived** (named test files plus `corpus-digest`; tree restored
  after each, `git status` clean). Side effects unvalidated (18 red); status off `validateEffectList`
  (17); perk sweep at level 1 only (1); `on-action-observed` actor check only when filtered (2: the
  unfiltered and no-source tests); claim keyed on `sourceTraitId` (3); claim key without index, trait
  (1) and status (1); status key with the trait kind (1); zero-count stat-modifier guard (2); stale
  Web removal (1); freshness `alive`, `defendCount`, `revivesUsed` (2 each); slot order (2); slot
  upper bound (2); script id (3); unique ids (2); max-Health floor (6); revive floor (1);
  deep-freeze lock (7); `emitTriggerFired` check off (15); cap check accepting 1 (14);
  `takenFactorFor` throw (1). Plus the random-selector loop (cleanup item 1). The agent's own 44
  are in `evidence/mutation-checks.md`.
- **Code read against the brief:** the freshness, script, slot and id checks; one validator on
  every carrier; the perk sweep through `resolvePerkEffects`; the claim key stamped in
  `resolveBaselineEffects` / `flatEffects` and carried through `withInstance` and revive; no
  runtime path creating a keyless trigger (mid-fight only a stat-modifier or a status is
  instantiated, and `flatEffects` keys a status's triggers); the claim still after the skips and
  before the chance roll; `findCreature` finds dead actors, so an actor that died mid-action still
  counts as found; the Web roll's draws unchanged. No UI, data or state import in `src/engine`.
- **Leftover sweep:** `triggering-ally` has no match in `src/` and now none in the living docs;
  `sourceTraitId` as the claim survives nowhere; the "resets revivesUsed" / "never trusts" / "DoT
  convention" / "unclamped" claims are gone from `src/`; "createCombat resets HP/statuses" is
  cleanup item 3.
- **Corpus scan** (525 fights): no living creature at ≤ 0 HP at the end, no `HpClamped` to 0, no
  `StatModifierApplied` with factor 1. The guards are inert on real content, as the brief says.

## Docs edited

Applied in the working tree on `4.6-a`. `docs:check` citations pass; budgets 0 over.

- `spec/combat.md`: `#fight-setup` writes the freshness, `scriptId`, slot and id rules and the side
  effects' validation, Known bug removed; `#aoe-cast` Known bug removed (the boundary check makes
  array order slot order); `#resolution--timing` Known bug replaced by the no-0-HP rule, linking its
  two homes.
- `spec/statuses.md`: `#health-is-a-modifiable-stat` gains the max-Health floor; `#turn-order`'s
  Known bug becomes the rule (effect list taken once, removal reads the bearer fresh).
- `spec/responses.md`: `#fizzles` zero count covers `apply-stat-modifier`, Known bug removed;
  `#response-targets` drops `triggering-ally`; `#revive` restores at least 1 HP.
- `spec/effects.md`: `#validators` rewritten around `validateEffectList` with both new checks, the
  carriers it reaches and the perk sweep; its three duplicate bullets folded in and the Known bug
  removed. `#hook-execution` says the tick is the only exception, enforced at load.
  `#damage-observation` adds the missing actor, Known bug removed. `#stacks-false` states the
  per-definition claim key and that a skipped candidate claims nothing. `#count-scaling` adds
  `apply-stat-modifier`. `#taken-reduction-accumulation` says the cap is required and below 1.
- `CONVENTIONS.md`: `#combatstate-is-plain-data-never-modified-after-being-returned` gains the
  brief's sentence on the registries; `#snapshots-are-never-written-to` says the helper locks Map
  and Set writes, what that means for a shared registry, and that a pre-frozen one is refused;
  `#every-golden-replays-through-one-shared-runner` names dead allies and a preset Defend count as
  `setup` uses.
- `phases/4.6/brief.md`: ASSUMPTION (A) ticked, confirmed as built (`PARTY_SIZE` in
  `engine/config.ts`, the store re-exports it). The six built entries stay as the phase's record of
  intent.
- `workflow/coding-rules.md`: `npm ci` is not a deletion (decide-point 3).
- No content doc: the slice ships no content change (the only content-like change is the test
  fixture `CATASTROPHIC_COLLAPSE`).
