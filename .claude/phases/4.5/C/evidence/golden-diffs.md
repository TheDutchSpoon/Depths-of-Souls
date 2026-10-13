# Changed goldens, 4.5-C

Each golden run on `main` (old fixture) and on the build (new fixture) through `runGolden`, the two
event logs compared by a scratch script outside the repo. A dead slot is a `TurnStarted` for a
creature already dead (`CreatureDied` not yet followed by `Revived`) and its closing `TurnEnded`.

| Golden | Dead slots | `TURN_STEPS` | New log equals main minus the dead brackets | Result | RNG position | Rounds |
| --- | --- | --- | --- | --- | --- | --- |
| `golden-fallback-attacks-lowest-hp` | 1 | to the end | yes | win → win | 9101 → 9101 | 2 → 2 |
| `golden-random-selector` | 2 | to the end | yes | win → win | 1199737150 → 1199737150 | 3 → 3 |
| `golden-broodmother` | 1 | 5 → 4 | yes | – | 1831572883 → 1831572883 | 2 → 2 |
| `golden-gloomjaw-executioner` | 1 | 4 → 3 | yes | win → win | 9009 → 9009 | 2 → 2 |
| `golden-provoke-stun-cleanup` | 1 | 6 → 5 | yes | – | 1831572473 → 1831572473 | 2 → 2 |
| `golden-pass-order-live` `revived` | 1 | 6 → 5 | yes | – | 1831575323 → 1831575323 | 3 → 3 |
| `golden-6v6-scripted` | 3 | to the end | yes | loss → loss | 3599196435 → 3599196435 | 28 → 28 |

Every `TURN_STEPS` drops by exactly the dead-slot count in its window. `golden-6v6-scripted` has no
stored log; its checkpoints are `TurnStarted` 176 → 173 and `TurnEnded` 176 → 173, every other
count, the result, the round count, the round-1 turn order, the spot checks and the redirects
unchanged. Its test passes with only those two numbers edited.

No hand-derived golden has a Web roll inside a dead bracket (no `StatusExpired` and no RNG-position
change in the table above).
