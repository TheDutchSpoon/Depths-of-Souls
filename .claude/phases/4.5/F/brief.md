# 4.5-F — Level-ups after each fight, the per-fight record, and the intro's XP

Phase brief: `.claude/phases/4.5/brief.md`. Golden policy: engine goldens and the corpus digest
**byte-identical**; store tests change, listed (the kickoff probe found only the
`fightEnemyIds` assertions in `balance-sim.test.ts`). CI balance verdicts re-checked
(`phases/4.5/brief.md#balance-verdicts`).

## Scope

- `phases/4.5/brief.md#level-ups-after-each-fight`.
- `phases/4.5/brief.md#the-per-fight-record`.
- `phases/4.5/brief.md#the-scripted-intro-grants-xp`.

## Known

- `descend` today builds the party once (`playerCreatures`) before the fight loop and applies XP
  after it (`applyXpToParty`); `FloorOutcome` has one concatenated `events` and a floor-total
  `xpBanked`.
- `spec/run.md#rewards` carries the `**Known bug:**` line this slice's PR review removes.
- `createCombat` takes the player's perk effects beside the party (`player.effects`); the record
  carries them.
- No store test on `main` pins a level-up between fights or the intro's XP: under the plainest
  version of both changes every store test stays green, and all three CI verdicts too
  (`phases/4.5/F/evidence/kickoff-probe.md`).

## Done when

The party's levels change between two fights of one floor in a hand-derived store test, every
fight of a descent has a record, a record's seed, parties and perk effects reproduce its fight
exactly, and a new game's party enters floor 2 at level 2 after clearing floor 1.
