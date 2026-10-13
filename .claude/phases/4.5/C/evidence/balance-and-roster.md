# Balance and matchup roster, 4.5-C

`npm run sim` (40 seeds, three specs), four runs, each in its own tree outside the repo except the
last:

| Run | Engine | Roster and bracket readers |
| --- | --- | --- |
| **before** | `main` (`e8d0ffd`) | `main`'s (`firstRoundEnemyIds`, round-1 brackets) |
| **roster only** | `main` | the build's `balance-sim.ts` and `store.ts` (`fightEnemyIds`), plus a counter that records `main`'s round-1 roster beside each fight's party |
| **brackets** | the build, except a dead slot still rolls the Web (so every fight is `main`'s with its dead brackets removed) | the build's |
| **after** | the build | the build's |

So before → roster only is the roster fix alone; roster only → brackets is the bracket readers
alone (`bossLockStats`' `TurnStarted` count); brackets → after is the removed Web draws.

## CI verdicts

No verdict flipped. Floor 1, first soul and floor 5 PASS for sorcerer, brute and shieldbarer, before
and after.

| Spec | floor-1 clear | first soul median (floor runs) | fights on floor 5+ in first 20 runs |
| --- | --- | --- | --- |
| sorcerer | 100.0% → 100.0% | 3.0 → 3.0 | 40 seeds → 40 seeds |
| brute | 100.0% → 100.0% | 2.0 → 2.0 | 40 seeds → 40 seeds |
| shieldbarer | 100.0% → 100.0% | 3.0 → 3.0 | 35 seeds → 36 seeds |

## Round-cap draw rate

| Spec | before | after |
| --- | --- | --- |
| sorcerer | 5442 / 94845 = 5.7% | 5446 / 94461 = 5.8% |
| brute | 3811 / 142072 = 2.7% | 3782 / 142026 = 2.7% |
| shieldbarer | 8765 / 70581 = 12.4% | 8301 / 67162 = 12.4% |

The brackets run has the before numbers exactly (it is `main`'s fights).

## Boss lock stats

The policy run's boss locked-turn share, and the probe's, per boss row (all-visits and first-visit),
before → brackets → after. Only `bossLockStats` reads a bracket: a boss dead at its slot stopped
counting as an unlocked turn. That alone moves four rows by 0.1 to 0.8 points (brackets column); the
rest of every move is fights diverging at removed Web draws (and, on floor 20 for sorcerer, a
first-visit sample of 1 → 2 seeds).

| Spec, floor, visits | policy lock: before | brackets | after | probe lock: before | brackets | after | policy clear: before → after |
| --- | --- | --- | --- | --- | --- | --- | --- |
| sorcerer 10 first | 52.2 | 52.2 | 47.9 | 76.5 | 76.5 | 69.5 | 67.5 → 62.5 |
| sorcerer 10 all | 48.6 | 48.6 | 47.9 | 64.0 | 64.0 | 64.9 | 89.9 → 90.0 |
| sorcerer 20 first (1 → 2 visits) | 0.0 | 0.0 | 57.7 | 87.5 | 87.5 | 91.4 | 100.0 → 50.0 |
| sorcerer 20 all | 45.0 | 45.0 | 59.8 | 85.4 | 85.4 | 89.1 | 84.8 → 72.7 |
| brute 10 first | 11.4 | 11.4 | 12.3 | 58.0 | 58.0 | 43.6 | 82.5 → 75.0 |
| brute 10 all | 18.0 | **18.1** | 14.0 | 41.4 | **41.5** | 38.5 | 90.2 → 89.3 |
| brute 20 first | 17.6 | 17.6 | 16.6 | 57.9 | 57.9 | 67.8 | 77.5 → 72.5 |
| brute 20 all | 19.9 | 19.9 | 19.7 | 66.2 | 66.2 | 71.7 | 86.0 → 84.9 |
| brute 30 first | 10.4 | **10.5** | 14.5 | 82.4 | **83.2** | 57.0 | 75.7 → 70.3 |
| brute 30 all | 11.0 | **11.1** | 13.9 | 82.8 | **83.5** | 62.8 | 78.7 → 71.2 |
| shieldbarer 10 first | 36.1 | 36.1 | 27.5 | 56.3 | 56.3 | 61.3 | 71.4 → 63.3 |
| shieldbarer 10 all | 22.4 | 22.4 | 23.6 | 62.3 | 62.3 | 64.4 | 78.4 → 79.3 |

Bold: the four rows the bracket readers move. Everything else is the removed Web draws changing
which fights are fought: the rest of the report moves with it (first-wall floors, for example,
sorcerer `f5:10 f6:19 f7:8 f8:1` → `f5:12 f6:16 f7:10`, deepest floor median 13.5 → 14.0). No tuning
was done.

## The matchup table

Floors 1 to 5, rows = fights containing each enemy template. Totals of the `fights` column per
floor (a fight counts once per distinct template):

| Spec, floor | before | roster only | after |
| --- | --- | --- | --- |
| sorcerer 1 | 640 | 850 | 850 |
| brute 1 | 447 | 690 | 680 |
| shieldbarer 1 | 921 | 950 | 980 |
| sorcerer 2 | 1391 | 1415 | 1520 |
| brute 2 | 1400 | 1461 | 1556 |
| sorcerer 3 | 4126 | 4138 | 4318 |
| brute 3 | 3385 | 3440 | 3445 |
| shieldbarer 2, 3 · every spec 4, 5 | unchanged | unchanged | moved only by the removed Web draws |

Floor 1 has one enemy per fight, so its row total is the floor's fight count: the `fights` column
of the compounding table (sorcerer 850, shieldbarer 950). **`main` dropped 210 of the sorcerer's 850
floor-1 fights (24.7%) and 29 of the shieldbarer's 950 from the table; the build counts all of
them.** Roster only has the exact floor-1 totals. Six brute floor-1 rows exist only after the roster
fix (`snapjaw-ironjaw`, `snapjaw-jaws`, `swarmhive-queen`, `treant-elder`, `treant-grovekeep`,
`treant-sapling`): `main` never counted a fight against them. The brackets run's table equals the
roster-only run's row for row, so the bracket removal changes no matchup row.

## The roster proof

Over the simulator's fights on `main`'s engine (the roster-only run: policy runs and boss probes,
310 000 fights), fight by fight, `main`'s `firstRoundEnemyIds` set against the fight's enemy party
(the new roster, `FloorOutcome.fightEnemyIds`):

| Check | Fights |
| --- | --- |
| fights | 310 000 |
| `main`'s set equals the party | 309 246 |
| party strictly larger than `main`'s set | 754 |
| `main`'s set not contained in the party | 0 |
| of the 754: ended in round 1 (no `RoundStarted` 2) and no missing enemy has any `TurnStarted` in the fight | 754 |

On `main` every dequeued round-1 slot got a bracket, dead or not, so an enemy missing from
`main`'s set never reached its slot: each of the 754 fights ended before it. The matchup table shows the ones on
floors 1 to 3 (the extra fights above, floors 4 and 5 gain none); the rest are on floors the table
does not list, or are boss probes (the counter did not split them by floor).
