# Report r1 — 4.5-B2: every pass over the living creatures in turn order

Built to `plan.md` as `plan-handout-r1.md` corrects it. Nothing committed, nothing deleted, no
living doc edited. Evidence is in `phases/4.5/B2/evidence/`.

## Gates

| Gate | Result |
| --- | --- |
| `npm run test` | 1897 passed, 1 skipped, 0 failed (223 files, 1898 tests) |
| `npm run lint` | clean |
| `npm run format:check` | clean |
| `npm run build` | built |
| `npx tsc -b` | clean |
| `npm run docs:check -- citations` | PASS, 637 citations in 454 files |
| `npm run docs:check -- comments` | PASS, 7237 comments and 1684 titles in 421 files |

### Test count, file by file against `main` (1876 tests → 1898, +22; passed 1875 → 1897)

Counted from the JSON reports of a run made before any test was added (only the corpus digest
failed, as the probe found) and a run of the finished tree.

| File | main | branch |
| --- | --- | --- |
| `engine/pass-order.test.ts` (new) | – | 11 |
| `engine/turn-order.test.ts` | 9 | 12 (+3: live parties not the frozen queue, poles, party array out of slot order) |
| `golden-pass-order-{observed,poles,speed-change,web-rolls,non-stacking,fight-start}.test.ts` (new) | – | 1 each (6) |
| `golden-pass-order-live.test.ts` (new) | – | 2 |

Every other file has the same count. Titles, not counts, changed in `death-observed.test.ts` and
`status-timing.test.ts`.

## Golden policy

- **Every existing golden and unit test is unchanged in expectation.** Proof: with only the two
  orders put back (`evidence/reversal.md`), all pre-existing tests and the committed corpus digest
  pass; only the 22 new tests fail. Comment-only edits (headers, plus one test title each in
  `death-observed.test.ts` and `status-timing.test.ts`): `golden-damage-observed-cost`,
  `-damage-observed-lethal`, `-death-observed`, `-grant-during-granted-action`, `-last-gleam`,
  `-resonant-harmonize`, `-rot-sovereign`, `-round-end-interaction`, `-spore-spread`,
  `-status-timing-stun-one-turn`, `-turn-order-status`. No expected value changed. I did not run
  `docs:check -- comment-proof`; the reversal run is the evidence.
- **Seven new hand-derived goldens** through `runGolden`, setup, arithmetic and draws in each
  header. Seeds 9506 and 9507 were checked with an independent standard mulberry32 trace, not
  `rng.ts`. `observed` (1); `poles` (2, no `breakChancePercent`, hand-out item 4); `speed-change`
  (3, hand-out item 1: the first pass fires A, B, C, the next A, C, B); `web-rolls` (4, seed 9506:
  0.423153 then 0.668858); `non-stacking` (5, seed 9507: 0.275722, one draw); `fight-start` (6);
  `live` (7a per item 2; 7b per item 3, built: a creature killed in round 1 by a round-1-only script
  is revived in round 2 by an `on-attack` revive, one inert draw, and fires in round 2's round-end
  pass). One of my hand derivations was wrong at first (B's Defence is 10, not the default 20, in
  `speed-change`); I corrected the derivation by hand, not by pasting output.

## Corpus digest

Regenerated once (`npm run corpus:update`): 97 of 527 rows, exactly the probe: 59 reorders, 38
divergences, the same split per first-differing-event row. Every fight, and fight 185 (win → loss,
1095 → 535 events, first diverging at a Web roll, event 161) on its own line, are in
`evidence/corpus-table.md`. Method: whole event logs on the reversal tree and on the branch, by a
scratch script outside the repo.

## Mechanisms and the test that fails with each removed

Each site put back on party-array order, one at a time (`evidence/mechanism-removal.md`):

| Mechanism | Fails |
| --- | --- |
| `on-action-observed`, attack | `pass-order` attack, in-pass status grant, per-instance Speed read; goldens observed, poles, speed-change, non-stacking |
| `on-action-observed`, single cast / AOE cast / defend / provoke | `pass-order` single-target cast / AOE cast / defend / provoke (1 each) |
| `on-damage-observed` | `pass-order` on-damage-observed; golden observed |
| `on-death-observed` | `pass-order` on-death-observed |
| `on-fight-start` | `pass-order` on-fight-start; goldens fight-start, web-rolls |
| `on-round-end` | `pass-order` on-round-end; golden live (both) |
| Web roll | golden web-rolls |
| Helper reads `state.turnQueue` | 11: `turn-order` (3), `pass-order` (2), goldens fight-start, live (2), poles, speed-change, web-rolls |
| Not prefiltered to carriers | `pass-order` in-pass status grant (via the attack site removal; not mutated separately) |
| Party array out of slot order | `turn-order` case |

Held by construction, no assertable behaviour (hand-out item 5): the Web roll's order taken once at
cleanup start (one `const bearerIds`, `evidence/one-helper-grep.md`), and each creature's pole and
Speed read once. The by-id exclusion of the dead creature is pinned by the existing
`death-observed.test.ts` self-revive test, which passes unchanged.

Not run as source mutants: re-reading the order inside a pass, hoisting it to the action's start, and
prefiltering the pass to carriers. Golden 3 (first pass A, B, C; second A, C, B) and the two
`pass-order` tests are built to fail under them; I claim that from their construction, not from a run.

## One helper

`evidence/one-helper-grep.md`: no `livingIdsOf` left (deleted, not repurposed); nine calls inline
`turnOrderIdsOf(<state>)` as `fireHook`'s second argument; one `const bearerIds` in the Web roll;
`combat.ts` no longer sorts bearers or imports `compareBySideSlotId`. `buildTurnQueue` and the
helper share one private `orderedLiving`, so the round-start queue and the passes use one comparator.

## Balance and runtime

`evidence/balance-and-runtime.md`. No CI verdict flips for sorcerer, brute or shieldbarer (floor 1:
100% all; first soul 3.0 / 2.0 / 3.0; floor 5: 40 / 40 / 37 → 35 of 40 seeds, PASS). Round-cap draw
rate 5.9% → 5.7%, 2.7% → 2.7%, 12.4% → 12.4%. Simulator 1093.9 s → 1515.1 s (+39%); CI threshold
tests about +40–45%; corpus resolution about +15–20% (the probe measured about +60%).
Deviation from the plan: "before" was run on the reversal tree, not a clean checkout, to leave the
index alone. It reproduces `main`'s corpus digest, so it is `main`'s behaviour.

## Assumptions

1–3 and 5–9 held (1: no import cycle, tsc and build clean; 7: a scratch script outside the repo
worked). 4 became hand-out item 3 and was built. 9: the stale-text grep found only the comments
listed under Golden policy; the local variable `livingIds` in `resolution.test.ts:2020` builds its
own list and is unrelated.

## Spec questions

Living-doc text this change makes stale (not edited):

- `spec/effects.md:205` (`#hook-execution`, global points "in the standard tie-break order") and
  `:305` (`#damage-observation`, the `on-death-observed` pass "in the standard tie-break order").
- `spec/effects.md:271` and `:283` (`#action-reactions-actor-self-hooks-or-observation`,
  `#damage-observation`): "every living creature" stays true; the order is now turn order.
- `spec/effects.md:356` (`#stacks-false`): the carrier that gets the chance is the one earlier in
  turn order.
- `spec/combat.md:187` (`#turn-queue`): the ordering is shared and also read fresh per pass.
- `spec/statuses.md:252` (`#turn-order`): the Web roll is "over living bearers in side → slot → id
  order"; it is turn order, taken once at cleanup start.
- `spec/scripting.md:145` (`#target-selectors-in-the-engine`) is the extremum tie-break and stays.
- `phases/4.5/B/record.md` mentions the shared `livingIdsOf`; it is gone (records are immutable, so
  nothing to edit).

## Content changes

None. No creature, trait, spell, status or number changed.

## To delete

Nothing.
