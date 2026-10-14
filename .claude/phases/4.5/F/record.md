# Record — Phase 4.5 — Slice F: Level-ups after each fight, the per-fight record, and the intro's XP

**Status: built.** Golden policy: every engine golden and the corpus digest byte-identical. Two
existing store-layer tests changed as listed (one edited, one deleted). 1990 tests passed, 1
skipped (net +7 against `main`: 8 added, 1 deleted).

## What was built

- **Level-ups after each fight.** `descend` keeps a local `collection` and re-materializes the
  player party from it at the top of every fight (`resolvePlayerParty(collection, activeParty,
  deps)`, which also returns each creature's `InstanceId` in party order). Each fight's kill XP is
  summed as `fightXp`, added to `xpBanked`, and applied to the whole active party with
  `applyXpToParty` right after the fight and before the win/break check, so a lost fight's kills
  level the party too. The final `set` stores that collection; the floor's XP is applied once.
  The combat seed, the generation draw and the `runCounter` advance are untouched.
- **The per-fight record.** `FightRecord` (`events`, `result`, `xpBanked`, `partyLevelsAfter`,
  `seed`, `playerParty`, `enemyParty`, `playerEffects`) in `state/store.ts`; `FloorOutcome.fightRecords`
  replaces `fightEnemyIds`. `playerParty` is the fight's own array as `createCombat` was given it,
  `enemyParty` is `fight.enemyParty`, `playerEffects` is the once-resolved perk effects.
- **The intro's XP.** `BalanceConfig.introXpGrant` (10 in `data/balance.ts`, 0 in the test
  fixture); `runScriptedIntro` applies it to the active party after the Unicorn joins, whatever
  the fight's result.
- **The simulator** reads each fight's events and enemy roster from the records
  (`analyzeFights(records, ctx)`); `runProbe` returns `{ cleared, events, fightRecords }`.
  `splitFights` and its log-vs-roster count check are deleted.

## Tests and goldens

- New in `state/store.test.ts` (+7): levels change between two fights; XP applied exactly once;
  a loss's last fight applies its kills' XP; two replay tests (a descent with a perk, an innate
  spell and a mid-floor level-up; a descent that ends on a loss); the record invariants over three
  descents; the intro grant. New in `state/integration.test.ts` (+1): floor 1 and floor 2, per
  fight, on real content.
- Changed: `balance-sim.test.ts` "the probe run…" reads rosters from `fightRecords`; "splits
  fights at FightStarted" deleted (−1).
- Corpus digest and every engine golden unchanged. The three `balance-ci-*` verdicts pass with the
  values the kickoff probe gave for fix + 10 XP.

## Files changed

Edited: `state/{store,balance-sim}.ts`, `state/{store,integration,balance-sim}.test.ts`,
`engine/balance-types.ts` (the field), `engine/__fixtures__/balance.ts` (its value and comment),
`data/balance.ts` (the 10). New: `evidence/parity-and-levels.md`,
`evidence/thresholds-and-mechanisms.md`. No living or content doc edited.
