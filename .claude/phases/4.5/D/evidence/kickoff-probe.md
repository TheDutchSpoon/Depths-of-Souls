# Kickoff probe: what the three changes move on `main`

Scratch clone of `6141269` (`main`), outside the repo. A measurement, not the build: the plan
designs the change. Engine, data and state suites (`npx vitest run src/engine src/data src/state`;
`main`: 1411 passed, 1 skipped).

## Variants

Each edits only what it names.

| Variant | Change |
| --- | --- |
| **H** | `evaluateCondition`'s `hp-percent` `lowest`/`highest` pick sorts by `a.currentHp × maxHp(b)` against `b.currentHp × maxHp(a)` (`maxHp` = floored effective Health), ties side → slot → id |
| **T** | the incoming damage's channel rides on `DamageOrigin` `hit`; an `on-damage-taken` candidate marked direct-only is skipped silently (before its condition) unless the damage is direct; Thorns, Snapjaw Jaws, Shellback Bulwark and Hollowkin Wretch are marked |
| **L** | `applyDamageAndEmit` skips the cheat-death roll when the target's `currentHp` before the hit is 1 |
| **ALL** | H + T + L |

## Full suite under ALL

4 failed, 1408 passed, 1 skipped (one of the four is the probe's own dump test). The three
`balance-ci-*` threshold tests and `corpus-coverage.test.ts` stay green.

| Test | Why |
| --- | --- |
| `golden-hollowkin-wretch-self-dot` | the Wretch's Madness Touch now skips its own Poison tick silently: the fizzled `TriggerFired` is gone |
| `golden-status-snapshot-tick-no-retaliation` | Snapback and Madness Touch skip the tick silently: both fizzled `TriggerFired`s are gone |
| `corpus-digest.test.ts` | below |

No golden or unit test distinguishes the HP% pick from the current-HP pick, or pins Thorns
answering indirect damage, or Last Stand rolling at 1 HP. `golden-support-heals-own-lowest-hp-ally`
and `golden-spider-broodwarden` run `support`/`warden` scripts and stay byte-identical: their two
picks agree.

## Corpus digest

49 of 527 fights change; no result changes.

| Variant | Fights | Of which |
| --- | --- | --- |
| H | 6: 35, 148, 208, 230, 437, 458 | all diverge: a `warden` now Provokes (3) or a `support` now casts an ally gem (3) where `main` attacked |
| T | 44 | 30 log-only: `main`'s log minus fizzled retaliator `TriggerFired`s on a tick (548 lines: Madness Touch 530, Shellback Bulwark 13, Snapback 5); 14 diverge |
| L | 2: 520, 521 (`shieldbarer-doomed` variants) | a Shieldbarer at 1 HP no longer survives a lethal hit |
| ALL | 49 | overlaps: 230 (H and T), 520 and 521 (T and L) |

T's 14 diverging fights, by the retaliator at the first difference: Madness Touch 7 (80, 131, 140,
170, 234, 252, 294), Snapback 6 (155, 159, 215, 518, 520, 521), Shellback Bulwark 1 (100).

Thorns alone moves no corpus fight: its 382 firings in the corpus (4 fights) all answer an attack
(146) or a spell (236). The perk is player-side only, and no enemy in those fights deals it
indirect damage. Its change is covered only by the new golden.

## Labels

`DamageDealt.damageSource` can't tell the channels apart: Thorns' own response logs
`damageSource: 'attack'` (fight 520).

## Balance

`npm run sim` (40 seeds, three specs) on `main` and on ALL. No CI verdict flips: floor 1, first
soul and floor 5 PASS for every spec, before and after.

| Spec | floor-1 clear | first soul median (floor runs) | seeds on floor 5+ in first 20 runs | round-cap draws |
| --- | --- | --- | --- | --- |
| sorcerer | 100.0% → 100.0% | 3.0 → 3.0 | 40 → 40 | 5446 / 94461 = 5.8% → 4740 / 86838 = 5.5% |
| brute | 100.0% → 100.0% | 2.0 → 2.0 | 40 → 40 | 3782 / 142026 = 2.7% → 3770 / 142224 = 2.7% |
| shieldbarer | 100.0% → 100.0% | 3.0 → 3.0 | 36 → 36 | 8301 / 67162 = 12.4% → 7730 / 64977 = 11.9% |

The `main` run matches 4.5-C's "after" exactly. The probe doesn't split the moves by change; the
PR's staged builds do.
