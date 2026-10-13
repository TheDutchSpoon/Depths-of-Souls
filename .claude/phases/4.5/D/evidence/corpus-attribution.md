# 4.5-D corpus attribution, by stages

Corpus: 527 fights. Four throwaway builds, each a `git clone` of the branch base (`cee0d28`) outside
the repo with a junction to `node_modules`, none committed: **HP%** (the HP% change alone),
**retaliation** (the `damageChannel` change and the four retaliators, Last Stand put back),
**Last Stand** (the 1-HP gate alone) and **final** (the working tree). Each resolved every corpus
fight to completion (`buildCorpus` + `createCorpusCombat` + `resolveFight`) and wrote its whole event
logs; the base's logs were compared with each build's. Fight numbers are 0-based corpus positions,
the probe's. The committed digest fixture changes in the same 49 rows (shifted by one line for the
interface header). No fight's result changes in any build.

| Build | Changed fights | Matches the probe |
| --- | --- | --- |
| HP% | 6: 35, 148, 208, 230, 437, 458 | yes |
| retaliation | 44 (30 log-only, 14 diverging) | yes |
| Last Stand | 2: 520, 521 | yes |
| final | 49 = the union | yes, and the set equals the union of the three |

## HP%: all six diverge at the first rule that read the qualifier

| Fight | First difference (event index) | Base → build |
| --- | --- | --- |
| 35 | 498 | `AttackDeclared` → `SpellCast` (a `support` casts an ally gem) |
| 148 | 492 | `AttackDeclared` → `Provoked` (a `warden`) |
| 208 | 496 | `AttackDeclared` → `SpellCast` |
| 230 | 845 | `AttackDeclared` → `Provoked` |
| 437 | 1448 | `AttackDeclared` → `SpellCast` |
| 458 | 507 | `AttackDeclared` → `Provoked` |

Three Provoke, three ally casts, as the probe found.

## Retaliation: 30 log-only

Log-only = the base's log minus fizzled retaliator `TriggerFired`s (`on-damage-taken`, a retaliator's
`effectId`) is the build's log, byte for byte. Removed: **548** lines: Madness Touch 530, Retaliating
Shell 13, Snapback 5, Thorns 0. The fights: 23, 24, 55, 85, 88, 114, 119, 144, 145, 172, 174, 175, 177,
179, 200, 204, 213, 226, 230, 235, 260, 264, 265, 269, 279, 290, 295, 296, 299, 515.

## Retaliation: 14 diverging

First difference after aligning past the fizzled firings, and the last skipped retaliator before it:

| Fight | Base event at the difference | Build | Retaliator |
| --- | --- | --- | --- |
| 80 | `StatusApplied` (event 879) | `DamageDealt` | Madness Touch |
| 131 | `StatusApplied` (87) | `TurnEnded` | Madness Touch |
| 140 | `StatusApplied` (83) | `DamageDealt` | Madness Touch |
| 170 | `StatusApplied` (190) | `DamageDealt` | Madness Touch |
| 234 | `StatusApplied` (302) | `DamageDealt` | Madness Touch |
| 252 | `StatusApplied` (20) | `TurnEnded` | Madness Touch |
| 294 | `StatusApplied` (775) | `DamageDealt` | Madness Touch |
| 155 | `DamageDealt` (253) | `DamageDealt` | Snapback |
| 159 | `DamageDealt` (128) | `DamageDealt` | Snapback |
| 215 | `DamageDealt` (167) | `DamageDealt` | Snapback |
| 518 | `DamageDealt` (103) | `TurnEnded` | Snapback |
| 520 | `DamageDealt` (52) | `TurnEnded` | Snapback |
| 521 | `DamageDealt` (50) | `TurnEnded` | Snapback |
| 100 | `DamageDealt` (266) | `TurnEnded` | Retaliating Shell |

Madness Touch 7, Snapback 6, Retaliating Shell 1: the probe's split. In each, a retaliator that used
to answer a response's or a tick's hit now skips it (a Confusion no longer lands, or an answering hit
no longer happens), and the fight moves from there.

Thorns moves no corpus fight: its answers in the corpus are all to attacks or spells.

## Last Stand: fights 520 and 521

First difference at events 42 and 46, a `DamageDealt` whose `remainingHp` and survival differ: a
Shieldbarer at 1 HP no longer survives a lethal hit.

## Overlaps: 230, 520, 521 each need both of their changes

| Fight | HP% build | retaliation build | Last Stand build | final differs from each single build |
| --- | --- | --- | --- | --- |
| 230 | changed | changed | unchanged | from HP% only: yes; from retaliation only: yes |
| 520 | unchanged | changed | changed | from retaliation only: yes; from Last Stand only: yes |
| 521 | unchanged | changed | changed | from retaliation only: yes; from Last Stand only: yes |

A fight needing both is one whose final log differs from each single-change log. Each of the three
does.
