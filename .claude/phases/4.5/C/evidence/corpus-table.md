# Corpus attribution, 4.5-C

Method: the whole event log of every one of the 527 corpus fights on four trees, by a scratch script
outside the repo (`buildCorpus` + `createCorpusCombat` + `resolveFight`, JSON-compared):

- **main**: the tree at the kickoff (`e8d0ffd`).
- **stage 1**: the final build, except a dead slot still bumps the turn clock and still rolls the
  Web (inside the same call), and emits no bracket.
- **stage 2**: the final build, except a dead slot still bumps the turn clock (no Web roll).
- **final**: the build.

"main minus dead brackets" is `main`'s log with every `TurnStarted`/`TurnEnded` pair whose creature
was dead when the bracket opened removed (dead = a `CreatureDied` not yet followed by a `Revived`).

| Check | Result |
| --- | --- |
| stage 1 equals main minus dead brackets (a Web `StatusExpired` inside the bracket kept in place) | 527 of 527 |
| stage 2 equals final | 527 of 527 |

So the missing brackets and the missing Web rolls are the whole change, and the missing clock bumps
change nothing.

## The changed fights

`npm run corpus:update` regenerated the digest once: **393 of 527** rows changed (134 unchanged),
exactly the kickoff probe's number. Splitting them by comparing final with main minus the dead
brackets and everything inside them:

| Class | Fights |
| --- | --- |
| brackets only | 319 |
| diverging (a removed Web draw shifts the rest of the fight) | 74 |

Under the stricter reading that keeps a Web `StatusExpired` inside the removed bracket (stage 1's
reading above) the split is 318 / 75: fight 126 is the one fight where the only difference from
main minus brackets is the `StatusExpired` a dead-slot roll produced. The 393 are the same either
way; the probe's 319 / 74 is the first reading.

First differing event of the 74 (main minus dead brackets, then final):

| main | final | Fights |
| --- | --- | --- |
| `AttackDeclared` | `AttackDeclared` | 26 |
| `SpellCast` | `SpellCast` | 20 |
| `StatusExpired` | `TurnEnded` | 11 |
| `TurnEnded` | `StatusExpired` | 6 |
| `RoundStarted` | `TriggerFired` | 3 |
| `TriggerFired` | `TriggerFired` | 2 |
| `DamageDealt` | `DamageDealt` | 2 |
| `TriggerFired` | `RoundStarted` | 1 |
| `StatusExpired` | `StatusExpired` | 1 |
| `Revived` | `Revived` | 1 |
| `DamageDealt` | `TriggerFired` | 1 |

This is the probe's table row for row.

## Result changes

| Fight | Result | Events |
| --- | --- | --- |
| 35 | win → draw | 1651 → 3074 |
| 135 | win → draw | 464 → 1945 |
| 185 | loss → win | 535 → 1160 |
| 457 | win → loss | 967 → 2329 |

The same four as the probe; no other result changed.
