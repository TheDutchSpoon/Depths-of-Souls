# 4.5-B corpus attribution

Corpus: 527 fights. Changed digest rows: 143 (130 name only, 13 name + order). The other 384 fights are byte-identical to `main`.

Method: `main` and the branch each resolved every corpus fight to completion (`buildCorpus` + `createCorpusCombat` + `resolveFight`); the full event logs were compared with `on-ally-death` / `on-enemy-death` mapped to `on-death-observed` in `main`'s. Every changed fight has the same result, round count and final HPs. "name only": the mapped logs are byte-identical. "name + order": the mapped logs hold the same multiset of events, in a different order, the reordered firings being death-observer firings of a death whose observers sit on both sides (a player-side observer now fires before an enemy-side one; a fight with several such deaths spans several blocks). No fight differs in any other way. A block is the shortest run of events, from a first difference, over which `main`'s mapped log and the branch's hold the same multiset; the Order change column gives each fight's block count (30 across the 13 fights), its first block's event range (0-based log indices, inclusive) and that block's `on-death-observed` firings (`sourceId`) in `main`'s order and in the branch's.

| Fight | Change | Death-observer firings renamed | Events | Result | Rounds | Order change |
| --- | --- | --- | --- | --- | --- | --- |
| 3 | name only | 4 | 40 | win | 1 | |
| 8 | name only | 12 | 116 | win | 2 | |
| 12 | name only | 5 | 198 | win | 4 | |
| 16 | name only | 6 | 703 | loss | 12 | |
| 19 | name only | 2 | 280 | loss | 7 | |
| 20 | name only | 6 | 3883 | win | 95 | |
| 24 | name + order | 11 | 3496 | draw | 100 | 2 blocks; first block events 505-514, `on-death-observed` firings: main myconet-warder-enemy-2,myconet-gravedigger-enemy-3,rotfeeder-scavenger-player-4; branch rotfeeder-scavenger-player-4,myconet-warder-enemy-2,myconet-gravedigger-enemy-3 |
| 25 | name only | 7 | 4724 | draw | 100 | |
| 28 | name only | 5 | 455 | win | 9 | |
| 29 | name only | 10 | 4886 | win | 88 | |
| 37 | name only | 6 | 131 | win | 3 | |
| 38 | name only | 18 | 100 | win | 1 | |
| 41 | name only | 6 | 128 | win | 3 | |
| 42 | name + order | 7 | 104 | win | 2 | 1 block; first block events 13-20, `on-death-observed` firings: main flickerling-last-gleam-enemy-2,rotfeeder-scavenger-player-0; branch rotfeeder-scavenger-player-0,flickerling-last-gleam-enemy-2 |
| 50 | name only | 7 | 1431 | win | 26 | |
| 52 | name only | 12 | 117 | loss | 2 | |
| 53 | name only | 5 | 4125 | loss | 94 | |
| 54 | name only | 17 | 292 | loss | 5 | |
| 55 | name only | 1 | 354 | win | 6 | |
| 56 | name only | 6 | 62 | loss | 1 | |
| 58 | name only | 12 | 263 | loss | 4 | |
| 59 | name only | 20 | 1999 | loss | 58 | |
| 68 | name only | 18 | 117 | win | 2 | |
| 71 | name only | 2 | 6517 | draw | 100 | |
| 76 | name only | 12 | 247 | win | 5 | |
| 80 | name only | 5 | 4591 | draw | 100 | |
| 81 | name only | 3 | 18 | loss | 1 | |
| 82 | name only | 6 | 76 | loss | 2 | |
| 83 | name only | 12 | 585 | win | 12 | |
| 84 | name only | 4 | 2931 | loss | 91 | |
| 85 | name + order | 9 | 3819 | win | 77 | 3 blocks; first block events 21-28, `on-death-observed` firings: main myconet-warder-enemy-0,rotfeeder-scavenger-player-1; branch rotfeeder-scavenger-player-1,myconet-warder-enemy-0 |
| 86 | name only | 6 | 96 | loss | 2 | |
| 87 | name only | 6 | 119 | loss | 2 | |
| 88 | name only | 5 | 554 | loss | 12 | |
| 89 | name + order | 30 | 303 | loss | 5 | 1 block; first block events 79-82, `on-death-observed` firings: main rot-sovereign-enemy-0,rotfeeder-scavenger-player-0; branch rotfeeder-scavenger-player-0,rot-sovereign-enemy-0 |
| 93 | name only | 4 | 41 | win | 1 | |
| 97 | name only | 6 | 130 | win | 3 | |
| 98 | name only | 12 | 107 | win | 2 | |
| 101 | name only | 10 | 863 | loss | 22 | |
| 102 | name only | 6 | 165 | win | 3 | |
| 106 | name only | 2 | 224 | win | 5 | |
| 110 | name + order | 14 | 3395 | draw | 100 | 1 block; first block events 182-201, `on-death-observed` firings: main myconet-warder-enemy-0,myconet-gravedigger-enemy-2,myconet-warder-enemy-3,necromoss-thicket-enemy-4,myconet-gravedigger-enemy-5,rotfeeder-scavenger-player-3; branch rotfeeder-scavenger-player-3,myconet-warder-enemy-0,myconet-gravedigger-enemy-2,myconet-warder-enemy-3,necromoss-thicket-enemy-4,myconet-gravedigger-enemy-5 |
| 111 | name only | 1 | 11 | loss | 1 | |
| 112 | name only | 6 | 101 | loss | 2 | |
| 113 | name only | 5 | 817 | win | 16 | |
| 114 | name + order | 14 | 1278 | loss | 25 | 3 blocks; first block events 227-234, `on-death-observed` firings: main myconet-warder-enemy-3,rotfeeder-scavenger-player-0; branch rotfeeder-scavenger-player-0,myconet-warder-enemy-3 |
| 115 | name + order | 8 | 4245 | draw | 100 | 2 blocks; first block events 63-78, `on-death-observed` firings: main myconet-gravedigger-enemy-0,myconet-warder-enemy-3,myconet-warder-enemy-5,rotfeeder-scavenger-player-4; branch rotfeeder-scavenger-player-4,myconet-gravedigger-enemy-0,myconet-warder-enemy-3,myconet-warder-enemy-5 |
| 116 | name only | 6 | 59 | loss | 1 | |
| 118 | name only | 6 | 331 | loss | 6 | |
| 119 | name only | 16 | 759 | loss | 13 | |
| 127 | name only | 18 | 109 | win | 2 | |
| 128 | name only | 12 | 109 | win | 2 | |
| 131 | name only | 6 | 139 | win | 3 | |
| 135 | name only | 1 | 464 | win | 12 | |
| 140 | name + order | 10 | 828 | win | 17 | 4 blocks; first block events 25-32, `on-death-observed` firings: main myconet-warder-enemy-4,rotfeeder-scavenger-player-5; branch rotfeeder-scavenger-player-5,myconet-warder-enemy-4 |
| 144 | name + order | 3 | 2023 | loss | 62 | 1 block; first block events 125-138, `on-death-observed` firings: main myconet-warder-enemy-2,myconet-warder-enemy-5,rotfeeder-scavenger-player-5; branch rotfeeder-scavenger-player-5,myconet-warder-enemy-2,myconet-warder-enemy-5 |
| 145 | name + order | 3 | 662 | loss | 14 | 1 block; first block events 90-99, `on-death-observed` firings: main myconet-warder-enemy-5,rotfeeder-scavenger-player-2,rotfeeder-scavenger-player-5; branch rotfeeder-scavenger-player-2,rotfeeder-scavenger-player-5,myconet-warder-enemy-5 |
| 146 | name only | 6 | 89 | loss | 2 | |
| 148 | name only | 3 | 629 | win | 10 | |
| 149 | name + order | 14 | 288 | loss | 5 | 1 block; first block events 78-81, `on-death-observed` firings: main rot-sovereign-enemy-0,rotfeeder-scavenger-player-5; branch rotfeeder-scavenger-player-5,rot-sovereign-enemy-0 |
| 153 | name only | 8 | 61 | win | 1 | |
| 158 | name only | 12 | 83 | win | 1 | |
| 161 | name only | 6 | 182 | win | 4 | |
| 165 | name only | 2 | 218 | loss | 5 | |
| 166 | name only | 6 | 197 | win | 4 | |
| 170 | name only | 11 | 1523 | win | 37 | |
| 171 | name only | 2 | 14 | loss | 1 | |
| 173 | name only | 6 | 198 | loss | 3 | |
| 174 | name only | 8 | 415 | loss | 7 | |
| 175 | name only | 7 | 1889 | win | 64 | |
| 177 | name only | 1 | 1301 | win | 32 | |
| 178 | name only | 12 | 270 | loss | 5 | |
| 179 | name only | 22 | 1179 | loss | 22 | |
| 187 | name only | 6 | 111 | win | 2 | |
| 188 | name only | 12 | 74 | win | 1 | |
| 196 | name only | 6 | 217 | win | 4 | |
| 200 | name + order | 29 | 948 | win | 23 | 5 blocks; first block events 20-31, `on-death-observed` firings: main myconet-gravedigger-enemy-0,necromoss-thicket-enemy-1,necromoss-thicket-enemy-5,rotfeeder-scavenger-player-3,rotfeeder-scavenger-player-4,rotfeeder-scavenger-player-5; branch rotfeeder-scavenger-player-3,rotfeeder-scavenger-player-4,rotfeeder-scavenger-player-5,myconet-gravedigger-enemy-0,necromoss-thicket-enemy-1,necromoss-thicket-enemy-5 |
| 202 | name only | 18 | 126 | loss | 2 | |
| 204 | name + order | 12 | 1846 | win | 30 | 5 blocks; first block events 1070-1079, `on-death-observed` firings: main myconet-gravedigger-enemy-3,myconet-warder-enemy-4,rotfeeder-scavenger-player-0; branch rotfeeder-scavenger-player-0,myconet-gravedigger-enemy-3,myconet-warder-enemy-4 |
| 205 | name only | 5 | 2863 | win | 73 | |
| 207 | name only | 12 | 129 | loss | 2 | |
| 209 | name only | 10 | 5845 | draw | 100 | |
| 213 | name only | 4 | 56 | win | 1 | |
| 218 | name only | 12 | 85 | win | 1 | |
| 222 | name only | 1 | 823 | win | 21 | |
| 226 | name only | 12 | 186 | win | 4 | |
| 228 | name only | 2 | 318 | loss | 5 | |
| 230 | name only | 9 | 3991 | draw | 100 | |
| 231 | name only | 1 | 12 | loss | 1 | |
| 232 | name only | 6 | 114 | loss | 2 | |
| 233 | name only | 1 | 669 | win | 19 | |
| 234 | name only | 6 | 516 | loss | 9 | |
| 235 | name only | 1 | 1138 | win | 21 | |
| 238 | name only | 6 | 215 | loss | 4 | |
| 239 | name only | 17 | 692 | loss | 11 | |
| 247 | name only | 6 | 107 | win | 2 | |
| 248 | name only | 12 | 122 | win | 2 | |
| 260 | name only | 8 | 5762 | draw | 100 | |
| 263 | name only | 4 | 2104 | loss | 68 | |
| 264 | name only | 3 | 5888 | draw | 100 | |
| 266 | name only | 12 | 86 | loss | 1 | |
| 268 | name only | 6 | 270 | loss | 5 | |
| 269 | name only | 18 | 601 | loss | 12 | |
| 278 | name only | 12 | 88 | win | 1 | |
| 280 | name only | 1 | 981 | win | 17 | |
| 286 | name only | 6 | 321 | win | 5 | |
| 290 | name only | 4 | 4792 | draw | 100 | |
| 291 | name only | 2 | 17 | loss | 1 | |
| 292 | name only | 6 | 124 | loss | 3 | |
| 293 | name only | 1 | 386 | loss | 8 | |
| 294 | name only | 8 | 4338 | draw | 100 | |
| 295 | name only | 8 | 513 | win | 9 | |
| 296 | name only | 6 | 83 | loss | 2 | |
| 297 | name only | 12 | 143 | loss | 2 | |
| 298 | name only | 5 | 430 | win | 9 | |
| 299 | name only | 22 | 2987 | loss | 84 | |
| 314 | name only | 1 | 498 | loss | 14 | |
| 320 | name only | 23 | 5965 | draw | 100 | |
| 324 | name only | 7 | 236 | loss | 6 | |
| 326 | name only | 4 | 39 | loss | 1 | |
| 329 | name only | 10 | 62 | loss | 1 | |
| 351 | name only | 5 | 48 | loss | 1 | |
| 353 | name only | 6 | 112 | loss | 2 | |
| 354 | name only | 4 | 37 | loss | 1 | |
| 355 | name only | 5 | 49 | loss | 1 | |
| 356 | name only | 4 | 37 | loss | 1 | |
| 359 | name only | 10 | 65 | loss | 1 | |
| 384 | name only | 8 | 54 | loss | 1 | |
| 387 | name only | 7 | 188 | loss | 3 | |
| 389 | name only | 12 | 109 | loss | 2 | |
| 410 | name only | 4 | 92 | loss | 2 | |
| 415 | name only | 5 | 124 | loss | 3 | |
| 419 | name only | 10 | 98 | loss | 2 | |
| 441 | name only | 2 | 5848 | draw | 100 | |
| 445 | name only | 15 | 3228 | loss | 71 | |
| 446 | name only | 23 | 1223 | loss | 30 | |
| 449 | name only | 52 | 1382 | loss | 22 | |
| 470 | name only | 33 | 5817 | loss | 93 | |
| 471 | name only | 6 | 5276 | draw | 100 | |
| 473 | name only | 2 | 5857 | draw | 100 | |
| 474 | name only | 27 | 2054 | loss | 45 | |
| 475 | name only | 5 | 50 | loss | 1 | |
| 479 | name only | 10 | 67 | loss | 1 | |
