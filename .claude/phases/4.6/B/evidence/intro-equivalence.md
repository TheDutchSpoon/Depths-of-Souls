# 4.6-B: intro equivalence, `main` against this branch

Made from a scratch copy of `main` (`git archive main`) and a scratch copy of this working tree, one script on both (not kept). Per spec x seed 1-20: `newGame`, `setSpec`, `runScriptedIntro`, then `descend(1)`; every `Map`/`Set` serialized, functions dropped.

- Cases: 60 (3 specs x 20 seeds).
- `GameState` after the intro deep-equals `main`'s: 60 of 60.
- `startGame` leaves the same state as the three calls by hand (both trees): 60 of 60.
- First descent (floor 1) outcome deep-equals `main`'s: 60 of 60.
- Intro logs identical: 51 of 60; differing: 9.
- Of the differing logs, the first differing event is on or after the first Unicorn turn that began with an attack-locking status (`lockScopesByStatus`: scope `attack` or `all`): 9 of 9.

The rule for the last column: the first index at which the two intro logs differ is compared with the index of the first `TurnStarted` of the enemy Unicorn at which it held a status whose `action-lock` scope is `attack` or `all` (tracked from `StatusApplied`/`StatusExpired` in the `main` log). The Unicorn's `Attack` is the same on both trees; only a turn on which Attack is illegal can differ, because the branch's Unicorn then casts a gem where `main`'s had none. Only the Sorcerer (which holds Pacify) produces such a turn: Brute and Shieldbarer intros are identical on every seed.

| case | state equal | descent equal | intro log | result main / branch | events main / branch | first differing event | first locked Unicorn turn | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| brute/1 | yes | yes | same | win / win | 25 / 25 | - | - | identical |
| brute/2 | yes | yes | same | win / win | 25 / 25 | - | - | identical |
| brute/3 | yes | yes | same | win / win | 25 / 25 | - | - | identical |
| brute/4 | yes | yes | same | win / win | 25 / 25 | - | - | identical |
| brute/5 | yes | yes | same | win / win | 25 / 25 | - | - | identical |
| brute/6 | yes | yes | same | win / win | 25 / 25 | - | - | identical |
| brute/7 | yes | yes | same | win / win | 25 / 25 | - | - | identical |
| brute/8 | yes | yes | same | win / win | 25 / 25 | - | - | identical |
| brute/9 | yes | yes | same | win / win | 25 / 25 | - | - | identical |
| brute/10 | yes | yes | same | win / win | 25 / 25 | - | - | identical |
| brute/11 | yes | yes | same | win / win | 25 / 25 | - | - | identical |
| brute/12 | yes | yes | same | win / win | 25 / 25 | - | - | identical |
| brute/13 | yes | yes | same | win / win | 25 / 25 | - | - | identical |
| brute/14 | yes | yes | same | win / win | 25 / 25 | - | - | identical |
| brute/15 | yes | yes | same | win / win | 25 / 25 | - | - | identical |
| brute/16 | yes | yes | same | win / win | 25 / 25 | - | - | identical |
| brute/17 | yes | yes | same | win / win | 25 / 25 | - | - | identical |
| brute/18 | yes | yes | same | win / win | 25 / 25 | - | - | identical |
| brute/19 | yes | yes | same | win / win | 25 / 25 | - | - | identical |
| brute/20 | yes | yes | same | win / win | 25 / 25 | - | - | identical |
| shieldbarer/1 | yes | yes | same | loss / loss | 52 / 52 | - | - | identical |
| shieldbarer/2 | yes | yes | same | loss / loss | 52 / 52 | - | - | identical |
| shieldbarer/3 | yes | yes | same | loss / loss | 52 / 52 | - | - | identical |
| shieldbarer/4 | yes | yes | same | loss / loss | 52 / 52 | - | - | identical |
| shieldbarer/5 | yes | yes | same | loss / loss | 52 / 52 | - | - | identical |
| shieldbarer/6 | yes | yes | same | loss / loss | 52 / 52 | - | - | identical |
| shieldbarer/7 | yes | yes | same | loss / loss | 52 / 52 | - | - | identical |
| shieldbarer/8 | yes | yes | same | loss / loss | 52 / 52 | - | - | identical |
| shieldbarer/9 | yes | yes | same | loss / loss | 52 / 52 | - | - | identical |
| shieldbarer/10 | yes | yes | same | loss / loss | 52 / 52 | - | - | identical |
| shieldbarer/11 | yes | yes | same | loss / loss | 52 / 52 | - | - | identical |
| shieldbarer/12 | yes | yes | same | loss / loss | 52 / 52 | - | - | identical |
| shieldbarer/13 | yes | yes | same | loss / loss | 52 / 52 | - | - | identical |
| shieldbarer/14 | yes | yes | same | loss / loss | 52 / 52 | - | - | identical |
| shieldbarer/15 | yes | yes | same | loss / loss | 52 / 52 | - | - | identical |
| shieldbarer/16 | yes | yes | same | loss / loss | 52 / 52 | - | - | identical |
| shieldbarer/17 | yes | yes | same | loss / loss | 52 / 52 | - | - | identical |
| shieldbarer/18 | yes | yes | same | loss / loss | 52 / 52 | - | - | identical |
| shieldbarer/19 | yes | yes | same | loss / loss | 52 / 52 | - | - | identical |
| shieldbarer/20 | yes | yes | same | loss / loss | 52 / 52 | - | - | identical |
| sorcerer/1 | yes | yes | same | win / win | 42 / 42 | - | - | identical |
| sorcerer/2 | yes | yes | differs | win / win | 28 / 38 | 7 | 6 | on/after locked turn |
| sorcerer/3 | yes | yes | same | win / win | 28 / 28 | - | - | identical |
| sorcerer/4 | yes | yes | same | win / win | 18 / 18 | - | - | identical |
| sorcerer/5 | yes | yes | differs | win / win | 35 / 76 | 22 | 21 | on/after locked turn |
| sorcerer/6 | yes | yes | differs | win / win | 20 / 53 | 11 | 10 | on/after locked turn |
| sorcerer/7 | yes | yes | same | win / win | 18 / 18 | - | - | identical |
| sorcerer/8 | yes | yes | same | win / win | 12 / 12 | - | - | identical |
| sorcerer/9 | yes | yes | differs | win / win | 28 / 27 | 11 | 10 | on/after locked turn |
| sorcerer/10 | yes | yes | same | win / win | 24 / 24 | - | - | identical |
| sorcerer/11 | yes | yes | same | win / win | 28 / 28 | - | - | identical |
| sorcerer/12 | yes | yes | differs | win / win | 51 / 70 | 21 | 20 | on/after locked turn |
| sorcerer/13 | yes | yes | same | win / win | 12 / 12 | - | - | identical |
| sorcerer/14 | yes | yes | same | win / win | 28 / 28 | - | - | identical |
| sorcerer/15 | yes | yes | same | win / win | 26 / 26 | - | - | identical |
| sorcerer/16 | yes | yes | differs | win / win | 30 / 32 | 7 | 6 | on/after locked turn |
| sorcerer/17 | yes | yes | differs | win / win | 37 / 50 | 11 | 10 | on/after locked turn |
| sorcerer/18 | yes | yes | same | win / win | 22 / 22 | - | - | identical |
| sorcerer/19 | yes | yes | differs | win / win | 47 / 48 | 38 | 22 | on/after locked turn |
| sorcerer/20 | yes | yes | differs | win / win | 61 / 25 | 11 | 10 | on/after locked turn |
