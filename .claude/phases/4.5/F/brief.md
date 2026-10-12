# 4.5-F — Level-ups after each fight, and the per-fight record

Phase brief: `.claude/phases/4.5/brief.md`. Golden policy: engine goldens and the corpus digest
**byte-identical**; store tests and the balance simulator's results change, listed. CI balance
verdicts re-checked (`phases/4.5/brief.md#balance-verdicts`).

## Scope

- `phases/4.5/brief.md#level-ups-after-each-fight`.
- `phases/4.5/brief.md#the-per-fight-record`.

## Known

- `descend` today builds the party once (`playerCreatures`) before the fight loop and applies XP
  after it (`applyXpToParty`); `FloorOutcome` has one concatenated `events` and a floor-total
  `xpBanked`.
- `spec/run.md#rewards` carries the `**Known bug:**` line this slice's PR review removes.

## Done when

The party's levels change between two fights of one floor in a hand-derived store test, every
fight of a descent has a record, and a record's seed and parties reproduce its fight exactly.
