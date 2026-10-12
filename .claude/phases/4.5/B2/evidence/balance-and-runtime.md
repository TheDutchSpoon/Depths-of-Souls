# 4.5-B2 balance and runtime

`npm run sim` (40 seeds, run cap 400), before and after. "Before" is the reversal tree
(`reversal.md`), which reproduces `main`'s order and its corpus digest; a separate clean checkout
was not made, to leave the index alone. Reports in the order the simulator prints them.

| Policy | CI floor 1 | CI first soul (median floor runs) | CI floor 5 (seeds) | Round-cap draw rate, before -> after |
| --- | --- | --- | --- | --- |
| sorcerer | 100.0% PASS | 3.0 PASS | 40 PASS | 5.9% (5812/97819) -> 5.7% (5442/94845) |
| brute | 100.0% PASS | 2.0 PASS | 40 PASS | 2.7% (3841/142411) -> 2.7% (3811/142072) |
| shieldbarer | 100.0% PASS | 3.0 PASS | 37 -> 35 PASS | 12.4% (8791/70907) -> 12.4% (8765/70581) |

Floor-1 and first-soul numbers are the same before and after. No verdict flips. Only the
shieldbarer floor-5 count moves (37 -> 35 of 40 seeds), inside its threshold.

## Runtime (same machine, the reversal tree standing in for `main`)

| Run | before | after |
| --- | --- | --- |
| `npm run sim` | 1093.9 s (18m15s wall) | 1515.1 s (25m16s wall), +39% |
| `balance-ci-brute.test.ts` | 11.8 s / 12.1 s | 17.1 s / 16.1 s |
| `balance-ci-shieldbarer.test.ts` | 15.0 s / 15.2 s | 21.2 s / 21.2 s |
| `balance-ci-sorcerer.test.ts` | 13.4 s / 14.0 s | 20.1 s / 19.4 s |
| `corpus-digest.test.ts` (whole file) | 3.0 s / 3.2 s | 4.1 s / 3.7 s |
| corpus resolution alone (527 fights) | 2.6 s / 2.8 s | 3.0 s / 3.1 s |

Two runs each. The CI tests grow about 40-45%, the simulator 39%, corpus resolution about 15-20%
(the probe measured about +60% on corpus resolution with an unshared ordering; this build reads
each creature's pole and Speed once). The kickoff accepts the cost.
