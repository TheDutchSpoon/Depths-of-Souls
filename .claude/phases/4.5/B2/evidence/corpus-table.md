# 4.5-B2 corpus table

Method: every corpus fight (527) resolved to completion with `buildCorpus` + `createCorpusCombat` +
`resolveFight`, once on the reversal tree (`main`'s two orders; its digest equals the committed
fixture, `reversal.md`) and once on the branch. Event logs compared whole. "Reorder": same result,
same event count, same multiset of events in a different order. "Diverge": anything else. The first
differing event is read from the first index where the two logs differ; its kind is the same in both
logs for every changed fight. Scripts were scratch, outside the repo.

Against `phases/4.5/B2/evidence/kickoff-probe.md`: identical. 97 of 527 (59 reorders, 38
divergences), the same split per first-differing-event row, and the one result change is fight 185.

Changed: 97 of 527 fights (59 reorders, 38 divergences); 430 byte-identical.

| First differing event (in main's log) | Reorder | Diverge |
| --- | --- | --- |
| TriggerFired on-death-observed | 23 | 7 |
| StatusExpired | 0 | 26 |
| TriggerFired on-fight-start | 21 | 1 |
| TriggerFired on-action-observed | 12 | 1 |
| TriggerFired on-round-end | 3 | 1 |
| TriggerFired on-damage-observed | 0 | 2 |
| **Total** | **59** | **38** |

Fights whose first differing event has a different kind in the two logs: 0.

Result changes:
- Fight 185: win -> loss (1095 -> 535 events), first diverging at event 161: main `StatusExpired`, branch `StatusExpired`.

| Fight | Change | First differing event (index) | Events main -> branch | Result |
| --- | --- | --- | --- | --- |
| 4 | reorder | TriggerFired on-round-end (37) | 61 -> 61 | loss |
| 5 | diverge | TriggerFired on-round-end (279) | 1542 -> 1543 | win |
| 7 | diverge | StatusExpired (148) | 194 -> 182 | win |
| 9 | reorder | TriggerFired on-fight-start (1) | 222 -> 222 | loss |
| 15 | diverge | TriggerFired on-damage-observed (1312) | 3844 -> 3844 | win |
| 18 | diverge | StatusExpired (200) | 744 -> 478 | loss |
| 25 | reorder | TriggerFired on-death-observed (343) | 4724 -> 4724 | draw |
| 29 | reorder | TriggerFired on-death-observed (24) | 4886 -> 4886 | win |
| 34 | reorder | TriggerFired on-fight-start (1) | 18 -> 18 | loss |
| 35 | diverge | StatusExpired (140) | 1758 -> 1651 | win |
| 38 | reorder | TriggerFired on-death-observed (26) | 100 -> 100 | win |
| 39 | reorder | TriggerFired on-round-end (57) | 213 -> 213 | loss |
| 46 | reorder | TriggerFired on-action-observed (39) | 201 -> 201 | win |
| 48 | reorder | TriggerFired on-action-observed (20) | 199 -> 199 | loss |
| 50 | reorder | TriggerFired on-death-observed (81) | 1431 -> 1431 | win |
| 51 | reorder | TriggerFired on-fight-start (1) | 15 -> 15 | loss |
| 54 | reorder | TriggerFired on-death-observed (45) | 292 -> 292 | loss |
| 58 | reorder | TriggerFired on-death-observed (28) | 263 -> 263 | loss |
| 59 | reorder | TriggerFired on-death-observed (29) | 1999 -> 1999 | loss |
| 60 | reorder | TriggerFired on-fight-start (1) | 21 -> 21 | win |
| 64 | reorder | TriggerFired on-fight-start (1) | 90 -> 90 | loss |
| 65 | diverge | StatusExpired (67) | 286 -> 227 | win |
| 68 | reorder | TriggerFired on-fight-start (1) | 117 -> 117 | win |
| 69 | reorder | TriggerFired on-fight-start (1) | 176 -> 176 | loss |
| 71 | diverge | StatusExpired (2205) | 6517 -> 6465 | draw |
| 75 | reorder | TriggerFired on-action-observed (127) | 4207 -> 4207 | win |
| 76 | reorder | TriggerFired on-death-observed (16) | 247 -> 247 | win |
| 79 | reorder | TriggerFired on-action-observed (54) | 192 -> 192 | loss |
| 81 | reorder | TriggerFired on-death-observed (10) | 18 -> 18 | loss |
| 83 | reorder | TriggerFired on-action-observed (394) | 585 -> 585 | win |
| 89 | reorder | TriggerFired on-death-observed (29) | 303 -> 303 | loss |
| 94 | reorder | TriggerFired on-fight-start (1) | 34 -> 34 | loss |
| 95 | diverge | StatusExpired (108) | 434 -> 345 | win |
| 99 | diverge | StatusExpired (105) | 170 -> 173 | loss |
| 104 | reorder | TriggerFired on-action-observed (8) | 580 -> 580 | loss |
| 108 | diverge | StatusExpired (160) | 189 -> 189 | loss |
| 110 | reorder | TriggerFired on-death-observed (190) | 3395 -> 3395 | draw |
| 113 | diverge | TriggerFired on-death-observed (643) | 817 -> 817 | win |
| 114 | reorder | TriggerFired on-death-observed (114) | 1278 -> 1278 | loss |
| 115 | reorder | TriggerFired on-death-observed (65) | 4245 -> 4245 | draw |
| 119 | reorder | TriggerFired on-death-observed (40) | 759 -> 759 | loss |
| 123 | reorder | TriggerFired on-fight-start (1) | 44 -> 44 | win |
| 125 | reorder | TriggerFired on-round-end (137) | 549 -> 549 | win |
| 129 | diverge | StatusExpired (99) | 367 -> 230 | loss |
| 130 | diverge | TriggerFired on-damage-observed (34) | 812 -> 812 | loss |
| 134 | diverge | TriggerFired on-action-observed (4) | 1663 -> 1663 | loss |
| 144 | diverge | TriggerFired on-death-observed (127) | 2023 -> 2023 | loss |
| 149 | reorder | TriggerFired on-death-observed (78) | 288 -> 288 | loss |
| 153 | reorder | TriggerFired on-fight-start (1) | 61 -> 61 | win |
| 154 | reorder | TriggerFired on-fight-start (1) | 28 -> 28 | loss |
| 155 | diverge | StatusExpired (41) | 506 -> 479 | win |
| 159 | diverge | TriggerFired on-fight-start (1) | 185 -> 155 | loss |
| 168 | diverge | StatusExpired (221) | 386 -> 388 | loss |
| 169 | diverge | StatusExpired (166) | 251 -> 257 | loss |
| 170 | diverge | TriggerFired on-death-observed (332) | 1523 -> 1523 | win |
| 177 | reorder | TriggerFired on-action-observed (160) | 1301 -> 1301 | win |
| 178 | reorder | TriggerFired on-death-observed (31) | 270 -> 270 | loss |
| 179 | reorder | TriggerFired on-death-observed (34) | 1179 -> 1179 | loss |
| 185 | diverge | StatusExpired (161) | 1095 -> 535 | win -> loss |
| 189 | diverge | StatusExpired (75) | 158 -> 158 | loss |
| 197 | reorder | TriggerFired on-action-observed (10) | 51 -> 51 | loss |
| 198 | diverge | StatusExpired (82) | 540 -> 837 | loss |
| 204 | reorder | TriggerFired on-death-observed (1072) | 1846 -> 1846 | win |
| 209 | reorder | TriggerFired on-death-observed (40) | 5845 -> 5845 | draw |
| 214 | reorder | TriggerFired on-fight-start (1) | 27 -> 27 | loss |
| 219 | reorder | TriggerFired on-fight-start (1) | 288 -> 288 | loss |
| 225 | reorder | TriggerFired on-action-observed (24) | 590 -> 590 | loss |
| 228 | diverge | StatusExpired (87) | 318 -> 307 | loss |
| 230 | diverge | TriggerFired on-death-observed (74) | 3991 -> 3991 | draw |
| 239 | reorder | TriggerFired on-death-observed (24) | 692 -> 692 | loss |
| 244 | reorder | TriggerFired on-fight-start (1) | 53 -> 53 | loss |
| 247 | reorder | TriggerFired on-fight-start (8) | 107 -> 107 | win |
| 249 | diverge | StatusExpired (57) | 151 -> 152 | loss |
| 250 | reorder | TriggerFired on-action-observed (517) | 992 -> 992 | loss |
| 253 | diverge | StatusExpired (120) | 211 -> 216 | loss |
| 258 | diverge | StatusExpired (85) | 148 -> 150 | loss |
| 260 | diverge | TriggerFired on-death-observed (95) | 5762 -> 5762 | draw |
| 265 | diverge | StatusExpired (2281) | 4172 -> 4148 | draw |
| 269 | reorder | TriggerFired on-death-observed (33) | 601 -> 601 | loss |
| 270 | reorder | TriggerFired on-fight-start (3) | 17 -> 17 | win |
| 275 | diverge | StatusExpired (75) | 5105 -> 5071 | draw |
| 278 | reorder | TriggerFired on-fight-start (8) | 88 -> 88 | win |
| 297 | reorder | TriggerFired on-death-observed (15) | 143 -> 143 | loss |
| 299 | diverge | TriggerFired on-death-observed (26) | 2987 -> 2987 | loss |
| 338 | reorder | TriggerFired on-fight-start (1) | 5645 -> 5645 | draw |
| 349 | reorder | TriggerFired on-action-observed (19) | 1848 -> 1848 | loss |
| 369 | diverge | StatusExpired (94) | 204 -> 204 | win |
| 384 | reorder | TriggerFired on-death-observed (8) | 54 -> 54 | loss |
| 434 | reorder | TriggerFired on-action-observed (4) | 6053 -> 6053 | draw |
| 454 | diverge | StatusExpired (259) | 756 -> 872 | loss |
| 457 | diverge | StatusExpired (30) | 732 -> 967 | win |
| 459 | diverge | StatusExpired (129) | 1138 -> 1149 | win |
| 471 | diverge | TriggerFired on-death-observed (821) | 5276 -> 5276 | draw |
| 489 | diverge | StatusExpired (229) | 425 -> 423 | win |
| 518 | reorder | TriggerFired on-fight-start (2) | 1565 -> 1565 | loss |
| 520 | reorder | TriggerFired on-fight-start (1) | 147 -> 147 | loss |
| 521 | reorder | TriggerFired on-fight-start (1) | 524 -> 524 | win |
