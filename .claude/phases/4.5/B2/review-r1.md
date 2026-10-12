# PR review r1 — 4.5-B2: every pass over the living creatures in turn order

Branch `4.5-b2` at `de197d1` (`de197d11b3ef`), against `main` at `f81af3f`. Reviews
`report-r1.md`, built to `plan.md` as `plan-handout-r1.md` corrects it.

## Verdict

**Fixes: cleanup only** (`handout-r1.md`). The engine change is right, complete and well pinned:
one helper, the nine hook calls and the Web roll on it, every old golden unchanged in every export,
the corpus change attributable to order alone, and every mechanism (including the three mutants the
report only argued for) killed by a named test. What's left is four comment, title and evidence
lines, two of which the slice's own comment-only edits made false. A review never approves with
cleanup left in, so this goes one more short round.

## Real fixes

None. No behaviour, test logic or golden expectation needs to change.

## Scope and labeling (all in `handout-r1.md`)

1. **`golden-round-end-interaction.fixture.ts:80` now states a false order.** The edit changed
   `(tie-break order: P1, P2, E1)` to `(turn order: P1, P2, E1)`, but the Speeds are P1 5, P2 20,
   E1 10, so turn order is P2, E1, P1. The golden is unaffected (only P1 carries an `on-round-end`
   trait), which is why every gate stays green; the comment is still wrong.
2. **`golden-death-observed.fixture.ts` places the killer wrong.** Lines 3–4 say every Speed but
   the killer's is equal "so the player side first then the enemy side", but the killer (Speed 30)
   is first in turn order. CASE 2's walk lists the enemy killer K after the player observers. The
   firing order (PA, PB, EE, EY) is right because K carries nothing; the narration of the pass
   isn't.
3. **`pass-order.test.ts:198`'s title, "on-death-observed, the dead creature left out", claims
   what the test can't show.** T carries no observer, so leaving it out by id or not changes
   nothing. The by-id exclusion is pinned by `death-observed.test.ts`'s self-revive test (my
   mutant below), as the report says. The title should claim only the order.
4. **`evidence/reversal.md` omits half of what the run did.** On the finished tree the committed
   corpus fixture is the regenerated one; `corpus-digest.test.ts` can pass under the reversal only
   against `main`'s fixture, and the 22-failure count (no corpus failure) shows `main`'s fixture
   was swapped in. The file says the patch "changes nothing else". It should say the run used
   `main`'s `corpus-digest.fixture.ts`.

## Decide-points

1. **Cleanup round now, or approve and fold the four lines into 4.5-C?** Recommendation: a short
   r2. The workflow doesn't approve with cleanup left (`workflow/pr-review.md#output-in-the-mailbox`),
   and two of the four are false statements this slice introduced into fixtures 4.5-C will read
   (it changes the same turn skeleton). The hand-out is comment, title and evidence edits only; r2
   reruns the gates, the comment proof and the leftover sweep.
2. **The new spec rule (`spec/effects.md#pass-order`) and its wording.** This review moved the
   brief's entry into the spec as one new `###` rule, linked from the four places that restated
   the old order, rather than rewriting each in full. Recommendation: keep it. One home per rule,
   and `stacks: false`, the Web roll and the turn queue each now say only what is theirs. Review the
   diff; the design-intent sentence ("acting first and reacting first are one rule") is the one
   line I'd most want you to check reads as you meant it.

For information, not a decide-point: ties still go to the player side, now as turn order's
tie-break. In the corpus, 187 of 14,394 cross-side pairs (1.3%) start a fight at equal effective
Speed, in 86 of 527 fights. That is the same rule as who acts first on a tie, so it is consistent
with the brief's intent, not a leftover of the old order.

## Verified, and how

All in my own clone (`git clone` + worktrees of `de197d1` and `origin/main`), `npm ci` on each.

- **Gates on the branch:** `test` 1898 tests, 1897 passed, 1 skipped, 0 failed (223 files);
  `lint`, `format:check`, `build`, `npx tsc -b` clean; `docs:check` citations PASS (637 in 454
  files), comments PASS (7237 comments, 1684 titles), budgets 0 over. Matches the report. (The
  sandbox's Node is 22.22.0 against jsdom's `^22.22.2` engine field: an `npm ci` warning only,
  nothing failed.)
- **Test count, file by file** (`vitest --reporter=json`, both trees): `main` 1876 in 215 files,
  branch 1898 in 223. Differences: `pass-order.test.ts` +11, `turn-order.test.ts` 9 → 12, the seven
  new golden tests +8 (`live` has two). Every other file equal. Matches the report's table.
- **Old goldens byte-identical:** every export of all 135 `main` fixtures imported on both trees
  (`import.meta.glob`, Maps serialized) and compared: no export added, removed or changed. Seven
  new fixtures only.
- **Comment-only edits:** `docs:check -- comment-proof origin/main` passes for the eleven edited
  old fixtures and `effect-types.ts`. The two test files fail it only on their changed titles
  (`death-observed.test.ts:122`, `status-timing.test.ts:396`), which I read: titles and one
  comment, no code.
- **Corpus digest:** 97 of 527 rows differ from `main`'s fixture; one result changes, row 185,
  win → loss (1095 → 535 events). Matches the probe and the report.
- **Order alone, by reversal:** with each of the ten sites put back on `main`'s order (party-array
  order at the nine hook calls, `compareBySideSlotId` at the Web roll) by an env-flag scratch copy,
  `main`'s committed corpus fixture passes (2/2) and the branch code without the flag fails it on
  97 fights. Full suite under the reversal: every pre-existing test passes; the failures are the
  19 new site tests (the 3 `turn-order.test.ts` cases call the helper directly, so a site-level
  reversal leaves them green) and the corpus test against the branch fixture.
- **Draws, recomputed** with an independent mulberry32 (Python, not `rng.ts`): seed 9506 gives
  0.423153, 0.668858 (`web-rolls`), seed 9507 gives 0.275722 (`non-stacking`), as the headers say.
  `live`'s revive draw is pinned by its test (`rng.position` advanced once).
- **Arithmetic spot-checks:** `observed`, `speed-change` (incl. B's Defence 10 → 14), `poles`,
  `non-stacking`: hits 40 − 10 + 0.4 = 30.4 → 30, stat factors as stated. The three orders each
  golden contrasts (turn order, side → slot → id, party array, frozen queue) recomputed from the
  stated Speeds and poles.
- **Code against the brief:** `orderedLiving` is one partition + one total comparator behind both
  `buildTurnQueue` and `turnOrderIdsOf`; `turnOrderIdsOf` reads the parties, never `turnQueue`.
  Each of the nine calls has `turnOrderIdsOf(<state>)` inline as `fireHook`'s argument; the Web
  roll takes `bearerIds` once before its loop. Every `fireHook(` call in `src/engine` listed: the
  other eleven pass `[actor.id]`, `[target.id]`, `[targetId]` or `dealerIds` (at most one id). No
  other list of both parties feeds a hook or a pool (`findCreature` is a lookup). No import cycle.
- **Mutation, each site and mechanism** (env-flag scratch copy; ran `pass-order`, `turn-order`,
  the seven new goldens, `corpus-digest`, `death-observed`, `status-timing`, and the
  `turn-order-status`, `web-break-free`, `status-timing-web` goldens; 85 tests; unmutated: 0 fail):

  | Mutant | Fails |
  | --- | --- |
  | attack site → party order | 7 (`pass-order` ×3, goldens observed, poles, speed-change, non-stacking) |
  | single cast / AOE cast | `pass-order` single / AOE (+ corpus) |
  | defend / provoke | `pass-order` defend / provoke |
  | `on-damage-observed` | `pass-order`, golden observed (+ corpus) |
  | `on-death-observed` | `pass-order` (+ corpus) |
  | `on-round-end` | `pass-order`, golden live ×2 (+ corpus) |
  | `on-fight-start` | `pass-order`, goldens fight-start, web-rolls (+ corpus) |
  | Web roll → `compareBySideSlotId` | golden web-rolls (+ corpus) |
  | helper reads `state.turnQueue` | 32, incl. goldens fight-start, live ×2, turn-order ×3 |
  | **re-read the order inside `fireHook`'s loop** (not run by the coding agent) | golden speed-change (+ corpus) |
  | **order hoisted to the turn's first pass** (not run) | `pass-order` per-instance, goldens speed-change, poles, `death-observed` order |
  | **pass prefiltered to carriers at every site** (not run) | `pass-order` in-pass grant only |
  | dead creature by `alive` instead of by id | `death-observed` self-revive |
  | tie-break dropped (array order on ties) | `turn-order` ×2 |

  Every mechanism fails its named test. The prefilter and hoist mutants are pinned at the attack
  site only, as the plan review accepted (the inline-argument grep holds the other sites).
- **Live behaviour (corpus scan):** 527 fights resolved; no `TriggerFired` on any of the five
  pass hooks by a creature dead at that point (0). Tie frequency as above.
- **Leftover sweep** (`src/`, `.claude/` minus `phases/` and `archive/`): `livingIdsOf` 0 hits;
  `livingIds` only `resolution.test.ts:2020`, a local list that test hands `fireHook` itself;
  "tie-break order" and "side → slot → id" left only in the spec lines this review rewrote,
  `spec/combat.md#rounds-and-turns` and `spec/scripting.md` (the tie-break itself, still true) and
  `tie-break.ts`. Golden and test narration: items 1–3 above.
- **Balance and runtime:** the three `balance-ci-*` threshold tests pass on both trees in the gate
  run. I didn't rerun `npm run sim` (25 min); the report's before/after shows no verdict flip and
  draw rates within 0.2 points, and the reversal tree it used for "before" reproduces `main`'s
  digest, which I confirmed above.
- **Mailbox:** step files plus six `evidence/` files, each cited by the report. Nothing to delete.

## Docs edited

- `.claude/spec/effects.md#pass-order` (new rule): the brief's entry moved into the spec: every
  pass in turn order, read live once per pass, every living creature, `slot`-based, never cached,
  side → slot → id only as tie-break.
- `.claude/spec/effects.md#hook-execution`: global points iterate every living creature in turn
  order (was "standard tie-break order").
- `.claude/spec/effects.md#action-reactions-actor-self-hooks-or-observation` and
  `#damage-observation`: the three observation passes go in turn order (was "standard tie-break
  order" for `on-death-observed`).
- `.claude/spec/effects.md#stacks-false`: the first carrier in the pass's turn order gets the
  chance, whichever side.
- `.claude/spec/combat.md#turn-queue`: the queue's ordering is turn order, the one ordering, read
  live by every pass.
- `.claude/spec/statuses.md#turn-order`: the turn-order effect is read by turn order, not only
  `buildTurnQueue`; the Web roll goes in turn order, taken once at cleanup start.
- `.claude/phases/4.5/brief.md#every-pass-over-the-living-creatures-goes-in-turn-order`: its
  extremum citation pointed at `#conditions-in-the-engine`; now
  `spec/scripting.md#target-selectors-in-the-engine`. The entry itself stays (built entries are
  kept).

`docs:check -- citations` passes with the edits (650 in 454 files); budgets: `effects.md` 35.2 of
39 KB (90%), `combat.md` 84%, `statuses.md` 83%, none over.
