# Simulator parity and levels on real content

Scratch scripts outside the repo (a `main` export from `git archive main src`, the branch tree), real default store, `newGame({ seed })` -> spec -> intro -> `descend(1)` -> `descend(2)` (`deepestFloor` set to 1 when floor 1 was not cleared), seeds 1-5, all three specs. Rosters: `main`'s `fightEnemyIds` against the branch's `fightRecords[].enemyParty` ids, over the fights both resolved (the branch's party is stronger after the intro grant and the per-fight level-ups, so floor 2's fight count differs). Levels: the branch's party levels going into each fight.

| Spec | Seed | Floor | main results | branch results | rosters compared | equal |
| --- | --- | --- | --- | --- | --- | --- |
| brute | 1 | 1 | winwinwinwinwinwinwinwinwinwin | winwinwinwinwinwinwinwinwinwin | 10 | true |
| brute | 1 | 2 | loss | winwinwinwinwinwinwinwinwinwinwin | 1 | true |
| brute | 2 | 1 | winwinwinwinwinwinwinwinwinwin | winwinwinwinwinwinwinwinwinwin | 10 | true |
| brute | 2 | 2 | winwinwinwinwinwinwinwinwinwinloss | winwinwinwinwinwinwinwinwinwinwin | 11 | true |
| brute | 3 | 1 | winwinwinwinwinwinwinwinwinwin | winwinwinwinwinwinwinwinwinwin | 10 | true |
| brute | 3 | 2 | winwinwinwinwinwinloss | winwinwinwinwinwinwinwinwinwinwin | 7 | true |
| brute | 4 | 1 | winwinwinwinwinwinwinwinwinwin | winwinwinwinwinwinwinwinwinwin | 10 | true |
| brute | 4 | 2 | winwinwinwinwinwinwinwinwinwinwin | winwinwinwinwinwinwinwinwinwinwin | 11 | true |
| brute | 5 | 1 | winwinwinwinwinwinwinwinwinwin | winwinwinwinwinwinwinwinwinwin | 10 | true |
| brute | 5 | 2 | winwinwinwinwinloss | winwinwinwinloss | 5 | true |
| shieldbarer | 1 | 1 | winwinwinwinwinwinwinwinwinwin | winwinwinwinwinwinwinwinwinwin | 10 | true |
| shieldbarer | 1 | 2 | loss | loss | 1 | true |
| shieldbarer | 2 | 1 | winwinwinwinwinwinwinwinwinwin | winwinwinwinwinwinwinwinwinwin | 10 | true |
| shieldbarer | 2 | 2 | winwinwinwinloss | winwinwinwinloss | 5 | true |
| shieldbarer | 3 | 1 | winwinwinwinwinwinwinwinwinwin | winwinwinwinwinwinwinwinwinwin | 10 | true |
| shieldbarer | 3 | 2 | winwinwinwinloss | winwinwinwinwinwinloss | 5 | true |
| shieldbarer | 4 | 1 | winwinwinwinwinwinwinwinwinwin | winwinwinwinwinwinwinwinwinwin | 10 | true |
| shieldbarer | 4 | 2 | winwinwinwinwinwinwinwinloss | winwinwinwinwinwinwinwinwinwinwin | 9 | true |
| shieldbarer | 5 | 1 | winwinwinwinwinwinwinwinwinwin | winwinwinwinwinwinwinwinwinwin | 10 | true |
| shieldbarer | 5 | 2 | loss | winwinwinloss | 1 | true |
| sorcerer | 1 | 1 | winwinwinwinwinwinwinwinwinwin | winwinwinwinwinwinwinwinwinwin | 10 | true |
| sorcerer | 1 | 2 | loss | winwinwinwinwinloss | 1 | true |
| sorcerer | 2 | 1 | winwinwinwinwinwinwinwinwinwin | winwinwinwinwinwinwinwinwinwin | 10 | true |
| sorcerer | 2 | 2 | winwinloss | winwinwinwinwinwinwinwinwinwinwin | 3 | true |
| sorcerer | 3 | 1 | winwinwinwinwinwinwinwinwinwin | winwinwinwinwinwinwinwinwinwin | 10 | true |
| sorcerer | 3 | 2 | winloss | winloss | 2 | true |
| sorcerer | 4 | 1 | winwinwinwinwinwinwinwinwinwin | winwinwinwinwinwinwinwinwinwin | 10 | true |
| sorcerer | 4 | 2 | winwinloss | winwinwinwinwinwinwinwinwinwinwin | 3 | true |
| sorcerer | 5 | 1 | winwinwinwinwinwinwinwinwinwin | winwinwinwinwinwinwinwinwinwin | 10 | true |
| sorcerer | 5 | 2 | loss | winwinwinwinwinwinloss | 1 | true |

All compared rosters equal: true

## Levels going into each fight (branch, default config incl. intro 10 XP)

| Spec | Seed | Floor | results | XP | levels going in, per fight | levels after the last fight |
| --- | --- | --- | --- | --- | --- | --- |
| brute | 1 | 1 | winwinwinwinwinwinwinwinwinwin | 10 | 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 | 2,2 |
| brute | 1 | 2 | winwinwinwinwinwinwinwinwinwinwin | 44 | 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 | 2,2 |
| brute | 2 | 1 | winwinwinwinwinwinwinwinwinwin | 10 | 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 | 2,2 |
| brute | 2 | 2 | winwinwinwinwinwinwinwinwinwinwin | 44 | 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 | 2,2 |
| brute | 3 | 1 | winwinwinwinwinwinwinwinwinwin | 10 | 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 | 2,2 |
| brute | 3 | 2 | winwinwinwinwinwinwinwinwinwinwin | 44 | 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 | 2,2 |
| brute | 4 | 1 | winwinwinwinwinwinwinwinwinwin | 10 | 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 | 2,2 |
| brute | 4 | 2 | winwinwinwinwinwinwinwinwinwinwin | 44 | 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 | 2,2 |
| brute | 5 | 1 | winwinwinwinwinwinwinwinwinwin | 10 | 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 | 2,2 |
| brute | 5 | 2 | winwinwinwinloss | 16 | 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 | 2,2 |
| shieldbarer | 1 | 1 | winwinwinwinwinwinwinwinwinwin | 10 | 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 | 2,2 |
| shieldbarer | 1 | 2 | loss | 0 | 2,2 | 2,2 |
| shieldbarer | 2 | 1 | winwinwinwinwinwinwinwinwinwin | 10 | 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 | 2,2 |
| shieldbarer | 2 | 2 | winwinwinwinloss | 16 | 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 | 2,2 |
| shieldbarer | 3 | 1 | winwinwinwinwinwinwinwinwinwin | 10 | 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 | 2,2 |
| shieldbarer | 3 | 2 | winwinwinwinwinwinloss | 24 | 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 | 2,2 |
| shieldbarer | 4 | 1 | winwinwinwinwinwinwinwinwinwin | 10 | 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 | 2,2 |
| shieldbarer | 4 | 2 | winwinwinwinwinwinwinwinwinwinwin | 44 | 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 | 2,2 |
| shieldbarer | 5 | 1 | winwinwinwinwinwinwinwinwinwin | 10 | 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 | 2,2 |
| shieldbarer | 5 | 2 | winwinwinloss | 12 | 2,2 ; 2,2 ; 2,2 ; 2,2 | 2,2 |
| sorcerer | 1 | 1 | winwinwinwinwinwinwinwinwinwin | 10 | 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 | 2,2 |
| sorcerer | 1 | 2 | winwinwinwinwinloss | 22 | 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 | 2,2 |
| sorcerer | 2 | 1 | winwinwinwinwinwinwinwinwinwin | 10 | 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 | 2,2 |
| sorcerer | 2 | 2 | winwinwinwinwinwinwinwinwinwinwin | 44 | 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 | 2,2 |
| sorcerer | 3 | 1 | winwinwinwinwinwinwinwinwinwin | 10 | 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 | 2,2 |
| sorcerer | 3 | 2 | winloss | 6 | 2,2 ; 2,2 | 2,2 |
| sorcerer | 4 | 1 | winwinwinwinwinwinwinwinwinwin | 10 | 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 | 2,2 |
| sorcerer | 4 | 2 | winwinwinwinwinwinwinwinwinwinwin | 44 | 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 | 2,2 |
| sorcerer | 5 | 1 | winwinwinwinwinwinwinwinwinwin | 10 | 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 ; 1,1 | 2,2 |
| sorcerer | 5 | 2 | winwinwinwinwinwinloss | 24 | 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 ; 2,2 | 2,2 |
