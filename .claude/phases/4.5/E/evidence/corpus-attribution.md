# Corpus attribution (4.5-E)

Method: a scratch vitest test run on a `git archive HEAD` of `main`'s tree ("before", 527 entries) and on a copy of the working tree ("after", 525 entries); each dumps every corpus fight's seed, FNV-1a hash of the event log (the digest's own function), event count, result and every creature's equipped spell ids. The comparison below is of those two dumps.

## Parts A and B (entries 0-499)

- Fights whose digest entry changed: **152** (A 118, B 34). Probe: 152 (A 118, B 34).
- Results that moved: **5**: 190 (A): win -> draw; 252 (A): win -> loss; 254 (A): win -> loss; 298 (A): win -> loss; 460 (B): win -> loss. Probe: 190 win to draw; 252, 254, 298, 460 win to loss.
- Fights where some creature's rolled gem set differs before/after: **435** of 500. Probe: 435.
- Changed fights with no differing set: **0**.
- Fights with a differing set that did not change: 283 (the differing gems were never cast, or never mattered).
- Affinities of every creature whose set differs: **instinct, violence**.
- Every creature's affinity is identical before/after at every position (the script throws otherwise).

## Part C (entries 500+): old to new index map

Before: 15 spell fights (500-514), 9 perk fights (515-523), Silence and Pacify (524-525), Life Siphon (526). After: 13 spell fights (500-512), perk fights 513-521, Silence and Pacify 522-523, Life Siphon 524.

| old | fight | new | old hash | new hash | |
| --- | --- | --- | --- | --- | --- |
| 500 | spell:ember-lance | removed | 65f9edfb | - | removed |
| 501 | spell:cinder-nova | 500 | bc5f5cda | f8902fc3 | CHANGED |
| 502 | spell:thorn-lash | 501 | 469caad2 | 469caad2 | same hash |
| 503 | spell:weakening-bite | 502 | d16b3362 | d16b3362 | same hash |
| 504 | spell:blinding-flare | 503 | 657b5ed8 | 657b5ed8 | same hash |
| 505 | spell:withering-bolt | 504 | 9604069a | 9604069a | same hash |
| 506 | spell:root-grasp | 505 | c402d949 | c402d949 | same hash |
| 507 | spell:bramble-ward | 506 | a5d46558 | a5d46558 | same hash |
| 508 | spell:rasping-chant | 507 | 20e07740 | 20e07740 | same hash |
| 509 | spell:venom-bolt | removed | 1ec57cee | - | removed |
| 510 | spell:stinger-swarm | 508 | 6794f0b6 | 6794f0b6 | same hash |
| 511 | spell:howling-instinct | 509 | 1f47a81e | 1f47a81e | same hash |
| 512 | spell:disorient | 510 | 31a2f99b | 31a2f99b | same hash |
| 513 | spell:puppet-string | 511 | 86dccebf | 86dccebf | same hash |
| 514 | spell:spore-cyst | 512 | 09860c4d | 09860c4d | same hash |
| 515 | perk:sorcerer | 513 | 726f4644 | 5a5aae2b | CHANGED |
| 516 | perk:brute | 514 | f8925efb | f8925efb | same hash |
| 517 | perk:brute-weakened | 515 | aa41b729 | aa41b729 | same hash |
| 518 | perk:shieldbarer-defenders | 516 | cc3015b6 | cc3015b6 | same hash |
| 519 | perk:shieldbarer-confusion | 517 | 16149069 | 16149069 | same hash |
| 520 | perk:shieldbarer-doomed | 518 | f451bea4 | f451bea4 | same hash |
| 521 | perk:shieldbarer | 519 | b3fe0c90 | b3fe0c90 | same hash |
| 522 | perk:sorcerer-silenced | 520 | 4348e46e | 4348e46e | same hash |
| 523 | perk:brute-pacified | 521 | bc9abd08 | bc9abd08 | same hash |
| 524 | spell:silence | 522 | 1bcc68d2 | 1bcc68d2 | same hash |
| 525 | spell:pacify | 523 | d702ce8e | d702ce8e | same hash |
| 526 | spell:life-siphon | 524 | 6bb444f6 | 6bb444f6 | same hash |

- Removed: 500 (spell:ember-lance); 509 (spell:venom-bolt).
- Changed (not removed): 2
  - 501 -> 500 (spell:cinder-nova -> spell:thorn-volley): bc5f5cda/3466/draw -> f8902fc3/3466/draw
  - 515 -> 513 (perk:sorcerer): 726f4644/1925/loss -> 5a5aae2b/85/win
- Every other Part C entry keeps its hash and moves up one index (after Ember Lance's entry) or two (after Venom Bolt's).

## Poison coverage

Corpus entries holding a Poison `StatusApplied` event:

| | before | after |
| --- | --- | --- |
| Part A | 40 | 20 |
| Part B | 11 | 2 |
| Part C | 2 | 0 |
| all | 53 | 22 |

Part C before: 509 (spell:venom-bolt, 100), 515 (perk:sorcerer, 2). Part C after: none.
