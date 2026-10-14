# PR review, round 1 — 4.5-D: HP% qualifiers, retaliation answers only direct damage, Last Stand never rolls at 1 HP

Reviewed: branch `4.5-d` at `4adb1ff` ("build"), against `main` at `6141269` (PR #107's merge).
Inputs: `kickoff.md`, `plan.md`, `plan-review.md`, `plan-handout-r2.md`, `report-r1.md`, the
evidence files, and the living docs on the branch.

## Verdict: fixes

The three changes are right against the brief and the spec, the golden policy holds exactly, and
every mechanism the kickoff lists fails its named test. One mechanism is pinned only by the corpus
digest (fix 1), and there are five cleanup items. Hand-out: `phases/4.5/D/handout-r1.md`.

## Real fixes

1. **`compareHpPercent`'s denominator is unpinned.** With `compareHpPercent` reading base Health
   (`baseStats.health`) instead of `effectiveMaxHp`, the test-1 golden, both `conditions.test.ts`
   cases and every other named test stay green; only the corpus digest fails. The kickoff's HP%
   trap is exactly this ("`maxHp` being the same floored effective Health `hpPercentSatisfied`
   divides by: one source for both"), and a mechanism caught only by the digest is unpinned
   (`workflow/pr-review.md#5-mutation-check-do-the-tests-pin-what-they-claim`). Every new case uses
   creatures with no Health modifier, where base, effective and floored effective Health agree. The
   unfloored reading (`getEffectiveStat` without the floor) is unpinned the same way. Fix:
   two `conditions.test.ts` cases where the denominator decides the pick (hand-out item 1).

## Cleanup (all in the hand-out)

2. **One validator case passes without asserting.** The status row of the sweep returns early on
   `on-round-end` (a status rejects that hook for its own reason first), so it is a green test
   that checks nothing: removing `validateDamageChannels` from `validateStatusDef` fails 14 status
   cases, not 15. `evidence/mechanism-removal.md`'s "every status case in the sweep" inherits it.
3. **Five new citations point at `spec/effects.md#hooks`**, which says nothing about
   `damageChannel`. This review wrote the rule into its own heading,
   `spec/effects.md#damagechannel` (beside `chancePercent` and `stacks: false`, the other trigger
   fields), so the five move there: `resolution.ts` (the `on-damage-taken` skip),
   `effect-types.ts` (`TriggeredDef.damageChannel`), `damage-channel.test.ts` and
   `retaliation.data.test.ts` headers, and `golden-retaliation-direct-only.fixture.ts` header.
   The hook-vocabulary comment in `effect-types.ts` keeps `#hooks`.
4. **A stale location in a comment the slice made wrong:** `effective-stats.test.ts` says
   "(effects.ts's effectiveMaxHp)"; `effectiveMaxHp` is now defined in `effective-stats.ts`.
5. **`golden-retaliation-direct-only`'s header** says it is re-derived "when a retaliator or Poison
   is retuned", but the fixture holds Poison at 20% (`holdPotency`), so a Poison retune never moves
   it. Only a retaliator retune does.
6. **`golden-hp-percent-lowest-picks-by-percent`'s header** claims "No RNG is drawn", and its test
   doesn't check it. `golden-retaliation-direct-only` asserts the same claim; this one should too.

## Scope and labeling

- **Not reopened:** `compareByKey` now has no production caller (only `tie-break.test.ts`), because
  `plan-handout-r1.md` item 2 kept it and its tests byte-identical. `damage-channel.test.ts` sits
  one letter from `damage-channels.test.ts` (the plan fixed the name; the report offers a rename).
  Both are approved plan choices, and neither is wrong.
- **Content folded from the code:** the four retaliators' numbers are unchanged (Snapback 0.6 ×
  Attack, Retaliating Shell 0.5 × Defence, Thorns 0.15 × Defence, Madness Touch Confusion), checked
  against `src/data`. The Thorns and Last Stand entries already read as built; their `**Known
  bug:**` lines are removed.

## Decide-points

1. **A retaliator still fires and fizzles on its own Confusion-redirected attack.** The corpus scan
   shows 62 such firings (Madness Touch 60, Retaliating Shell 2): a Confused retaliator attacks
   itself, the hit is direct (the channel follows the action,
   `spec/combat.md#the-damage-channel-in-the-engine`), so `'direct'` matches, and `triggering-source`
   resolves to nothing because the source is the firing creature. It emits one `TriggerFired` and
   nothing else. **Recommendation: keep it.** It is the general rule
   (`spec/responses.md#triggering-source-is-never-the-firing-creature`) doing its job, it changes no
   outcome, and skipping it silently would need a "source is self" filter on the retaliator, a
   special case for log noise. I wrote it into `spec/responses.md` so it is described, not
   discovered. If you want those firings gone, it is a new slice's filter, not this one's.
2. **Where `damageChannel`'s rule lives.** The brief asked for it "beside the observation filters"
   (`spec/effects.md#damage-observation`); the code cites `#hooks`. **Recommendation: its own
   `### damageChannel` heading after `### stacks: false`**, as written: it is a trigger field like
   `chancePercent` and `stacks: false`, each of which has one, and it isn't an observation filter
   (it sits on a self hook, not an observation hook). `#validators` and the Design half's
   retaliation bullet link to it. The cost is fix 3's five citation moves.

## Verified, and how

- **Gates** (own clone, `npm ci`, Node 22.22.0, Vitest 5.0.3 as the lockfile pins): `npm run
  test` 1981 passed, 1 skipped, 0 failed, 228 files, 1982 tests (the report's numbers); lint,
  `format:check`, `build`, `tsc -b` clean; `docs:check` citations PASS (664 → 671 after this
  review's edits), comments PASS (7411 comments, 1732 titles), budgets 0 over. The three
  `balance-ci-*` tests, `corpus-coverage.test.ts` (7) and the digest (2) are green in that run.
- **Test count, file by file** (JSON reporter on both trees): `main` 1908 tests in 226 files. Only
  these differ: `damage-channel.test.ts` +67, `retaliation.data.test.ts` +2, the two new golden
  tests +1 each, `conditions.test.ts` 27 → 29, `resolution.test.ts` 80 → 83, the two deleted golden
  tests −1 each: +74, as reported. 67 = 45 validator sweep + 1 `createCombat` + 2 accepted + 19
  retaliation rows (one sweep case vacuous, fix 2).
- **Goldens:** imported every `__golden__/*.fixture.ts` on both trees and deep-compared every
  export (functions by source text, Maps and Sets by entries). 144 fixtures each side: the two
  deleted, the two new, and 42 changed fixtures whose changed exports are only `traits` (and
  `golden-last-gleam`'s `allyDies`/`gleamDies`, `golden-wick-gates`'s `hurtOthersFull`/
  `aloneAndHurt`, sub-fixtures carrying the registry). With `damageChannel: 'direct'` stripped,
  every one equals `main`'s: exactly the three trait entries move, no `expected*` value. The one
  edited old fixture, `golden-status-snapshot-tick-kill-on-death`, passes `comment-proof`.
  `golden-hollowkin-wretch`, `golden-support-heals-own-lowest-hp-ally` and
  `golden-spider-broodwarden` are unchanged.
- **New goldens, by hand:** `golden-retaliation-direct-only` recomputed line by line (40.5 → 40;
  Snapback 24 − 4 = 20; Shell 5 − 4 = 1; Thorns 1.5 − 4 → 1; 20.4 → 20; A's Snapback 30 − 2 = 28;
  Poison floor(50 × 20 / 100) = 10, tick 10 − 2 = 8); `golden-hp-percent-lowest-picks-by-percent`'s
  80%/30% pick (the warden is in its own ally pool: `livingAlliesOf` includes the actor). Neither
  draws RNG, so there is no mulberry32 sequence to recompute.
- **Corpus digest:** 49 of 527 rows differ from `main`'s fixture, no result changes, and the set is
  exactly the union of `evidence/corpus-attribution.md`'s lists (6 HP%, 30 log-only, 14
  diverging, 2 Last Stand, with 230, 520 and 521 in two).
- **Mutation check** (each alone in a scratch worktree; the named tests plus the digest):

  | Mutant | Fails |
  | --- | --- |
  | HP% pick by current HP | test-1 golden, both `conditions.test.ts` cases, digest |
  | `'desc'` ignored in `pickExtremumBy` | `conditions.test.ts` `highest`, selector and tie-break tests, digest |
  | `compareHpPercent` on base Health | **digest only** (fix 1) |
  | `fireHook` ignores `damageChannel` | 9 `damage-channel.test.ts` rows, golden 3, digest |
  | every `hit` direct | 5 rows, all in the indirect-hit block (its variants, two-direct, chance, `stacks`), golden 3, digest |
  | field dropped in `effectsForHook` | 9 rows, golden 3, digest |
  | `validateDamageChannels` a no-op | all 45 sweep cases |
  | not run in `validateStatusDef` | 14 status cases (fix 2) |
  | Thorns loses the field | data test, golden 3 (digest green, as the report says) |
  | Madness Touch loses the field | data test, golden 3, digest |
  | no 1-HP gate | the 1-HP and heal cases, digest |
  | gate on HP after the hit | the 2-HP, heal and old survival cases, digest |
  | gate at `> 2` | the 2-HP and heal cases |
  | a tick offers its applier as source | tick row (`indirect`, no field), `golden-status-snapshot-tick-kill-on-death` |
  | `triggering-source` may be the firing creature | cost row (`indirect`, no field) |

  The last two are the deleted goldens' rules: each fails the test the evidence names.
- **Corpus scan** (all 527 fights on the branch, event logs): 4415 retaliator `on-damage-taken`
  firings. Every one follows a direct hit (2529 after `AttackDeclared`, 940 after `SpellCast`, 884
  on an attack or spell whose own triggers fired first) or the creature's own Confusion-redirected
  attack (62, decide-point 1). None after a tick or a response's hit. 5 Last Stand saves, none at 1
  HP; 6 bearers die from 1 HP.
- **Plan hand-out r2:** the goldens were deleted at the step with the failure recorded
  (`evidence/deleted-goldens-fail.md`); every rule they pinned is named against a test that now
  fails with it (reproduced above); the cost row runs through a real `on-turn-start` trait; the data
  test finds Sleep in the collector's output.
- **Code against the spec:** the skip sits in `fireHook`'s filter block before the condition, the
  roll and the `stacks: false` claim; the channel comes from `dealDamageCore`'s `channel`, never
  `damageSource`; the cheat-death gate reads `target.currentHp` before the hit and before the draw,
  through one constant. `src/engine` imports nothing from UI, data or state.
- **Leftover sweep** over `src/` and the living docs: the deleted goldens' names (no hits), the
  moved `DamageChannel` and `effectiveMaxHp` (one stale comment, fix 4), and the corrected claims
  ("whenever it takes damage", "retaliation never answers a tick", "would kill the creature"):
  each remaining hit is either still true or edited below.

## Decisions

Duncan agreed with both recommendations:

1. A retaliator's fire-and-fizzle on its own Confusion-redirected attack stays; it is described in
   `spec/responses.md#triggering-source-is-never-the-firing-creature`.
2. `damageChannel`'s rule lives under its own heading, `spec/effects.md#damagechannel`; the hand-out
   moves the five citations there.

## To delete

Nothing: the mailbox holds only step files and `evidence/`
(`WORKFLOWS.md#what-a-mailbox-keeps`).

## Docs edited

- `spec/scripting.md#conditions-in-the-engine`: removed the `**Known bug:**` line; added how
  `lowest`/`highest` order (`compareHpPercent`, one denominator, the unobservable tie-break).
- `spec/effects.md#traits`: the retaliation bullet now states the rule as built (an attack or a
  spell only) and its intent, linking `#damagechannel`.
- `spec/effects.md#validators`: the `damageChannel` rejection on every carrier.
- `spec/effects.md#damage-observation`: `DamageOrigin`'s `hit` carries `channel`.
- `spec/effects.md#damagechannel` (new heading): the field, the carried incoming channel, the
  skip's placement and fail-closed default, the retaliator data rule, its golden.
- `spec/effects.md#cheat-death`: no roll at 1 HP, its intent and the stateless edge,
  `CHEAT_DEATH_SURVIVAL_HP`.
- `spec/responses.md#triggering-source-is-never-the-firing-creature`: the fizzles are what a
  trigger without the field does; retaliators skip; the Confusion self-hit case.
- `spec/combat.md#the-damage-channel-in-the-engine`: the channel travels with a `hit`;
  `DamageChannel`'s home.
- `specializations/shieldbarer.md#thorns`, `#last-stand`: removed both `**Known bug:**` lines.
- `content/overgrowth.md#snapjaw-jaws`, `content/glimmerdark.md#shellback-bulwark`,
  `content/rotcap-hollow.md#hollowkin-wretch`: answer an attack or a spell only.
- `content/enemy-behaviour.md#role-scripts`: the warden's and support's rule 1 name the most
  wounded ally by HP% (rule 2's "weakest enemy" is still current HP).

`spec/effects.md` is at 96% of its budget after these edits (37.3 of 39 KB): under, but the next
slice that adds to it will likely need a condense.
