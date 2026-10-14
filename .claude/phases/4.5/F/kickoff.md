# Kickoff — Phase 4.5 — Slice F: Level-ups after each fight, the per-fight record, and the intro's XP

Build ONLY this slice. Standing rules: .claude/workflow/coding-rules.md.

## Read (in addition to the standing list)

- Spec files: `spec/run.md` (`spec/run.md#a-descent-is-atomic`, `spec/run.md#hp-resets-every-fight`,
  `spec/run.md#rewards` with its `**Known bug:**` line, `spec/run.md#scripted-intro`,
  `spec/run.md#floor-runs`, `spec/run.md#rewards-are-a-run-layer-consumer-of-the-event-log`),
  `spec/store.md` (all of it: the record is written into it at the PR review),
  `spec/creatures.md#levels-and-xp`, `spec/combat.md#fight-setup` (what `createCombat` takes and
  what it derives) and `spec/saves.md#the-stores-plain-data-boundary`.
- `CONVENTIONS.md#where-each-number-lives`, `CONVENTIONS.md#balance-simulator`,
  `CONVENTIONS.md#combat-is-reproducible-from-its-inputs`,
  `CONVENTIONS.md#every-failing-fight-is-reproducible-from-its-seed`,
  `CONVENTIONS.md#two-tier-golden-discipline`,
  `CONVENTIONS.md#a-mechanism-at-more-than-one-site-is-tested-at-each-site`.
- The brief: `phases/4.5/brief.md#level-ups-after-each-fight`,
  `phases/4.5/brief.md#the-per-fight-record` (it now carries the perk effects),
  `phases/4.5/brief.md#the-scripted-intro-grants-xp` (new at this kickoff),
  `phases/4.5/brief.md#balance-verdicts`, and `phases/4.5/F/brief.md`. The demo section
  (`phases/4.5/brief.md#the-demo`) is the record's consumer: its viewer header, its fight list and
  **Copy fight as JSON** read what this slice builds.
- Code, before planning: in `state/store.ts`, `FloorOutcome`, `descend`, `resolvePlayerParty`,
  `applyXpToParty`, `runScriptedIntro` and `grantCreatureIfUnowned`; `applyXpGain` in
  `state/rewards.ts`; `createCombat` in `engine/combat.ts` (it prepends innate spells to
  `equippedSpells`, instantiates `activeEffects` and sets `currentHp`); `BalanceConfig` in
  `engine/balance-types.ts`, `data/balance.ts`, `engine/__fixtures__/balance.ts` and every other
  `BalanceConfig` literal (`tsc` finds them); in `state/balance-sim.ts`, `splitFights`,
  `analyzeFight`'s roster comment, `runProbe`, `analyzeFights`, `playFloorRun` and `runSeed`; in
  `state/balance-sim.test.ts`, the probe-run case's `fightEnemyIds` assertions; the fixture setup
  of `state/store.test.ts` (FODDER, the scripted RNG rolls, `TEST_BALANCE_CONFIG`'s
  `100 × level` curve); `state/integration.test.ts`.
- `phases/4.5/F/evidence/kickoff-probe.md`: what the plainest version of the level-up fix and
  the intro grant move on `main`. Your build should reproduce its numbers; any difference is
  explained in the report.

## Scope

Three changes, all in the run layer:

- **Level-ups after each fight.** `descend` materializes the player party for every fight from
  the collection as the floor's earlier fights left it, and applies each fight's XP to the whole
  active party right after that fight, before the next, whatever the fight's result. The state
  `descend` stores is that per-fight collection: the floor's XP is applied once, never again at
  the end.
- **The per-fight record.** `FloorOutcome` gains one record per fight resolved, in fight order:
  that fight's events, its result, the XP it banked, the active party's levels after it, its
  combat seed,
  both parties exactly as `createCombat` was given them, and the player side's perk effects as
  `createCombat` was given them. The record replaces `FloorOutcome.fightEnemyIds`; the balance
  simulator reads each fight's enemy roster, and its events, from the record, and `splitFights`
  goes with its last caller. `events`,
  `fightResults`, `xpBanked`, `soulGained`, `currencyGained` and the other floor-level fields
  stay as they are. The record's type and field names are yours (an ASSUMPTION the brief already
  lists).
- **The intro's XP.** `runScriptedIntro` grants a flat amount of XP, through the same
  level-up path, to every creature in the active party once the Unicorn has joined, whatever the
  fight's result. The amount is a new `BalanceConfig` number: **10** in `data/balance.ts`. The
  intro's kills still bank nothing.

**Not in this slice:** any `src/engine` change beyond the new `BalanceConfig` field and the test
fixture's value; XP per kill, the XP curve or any other number; soul% and currency banking; saving
or keeping records in the store (there is still no descent state); the demo; any tuning; any
living-doc edit (they go under **Spec questions**).

## Golden policy

**Engine goldens and the corpus digest byte-identical.** Nothing in this slice reaches a combat:
seeds, generation and `createCombat` are unchanged, and the store is not under `src/engine`.

**Store tests that change, and only in the listed way:**

- `state/balance-sim.test.ts`, "the probe run…" case: its three `fightEnemyIds` assertions read
  the rosters from the records instead. The rosters themselves are identical.
- `state/balance-sim.test.ts`, "splits fights at FightStarted": deleted with `splitFights`.

The probe found no other existing test that moves (`phases/4.5/F/evidence/kickoff-probe.md#tests`).
A further test that changes is a stop-and-ask, not a re-pin.

**New tests:**

- **Hand-derived store test: levels change between two fights of one floor**, on fixture data
  with arithmetic in comments: the party's levels going into a later fight are above those going
  into an earlier one, and the record of the fight in between shows the XP and levels-after that
  explain it. It fails with the floor's XP applied after the floor, as on `main`.
- **Hand-derived store test: XP is applied exactly once**: each party instance's level and XP
  after `descend` equal its start plus the floor's XP applied one time. It fails with the old
  end-of-floor application put back on top of the per-fight one.
- **Hand-derived store test: the last fight of a descent that ends on a loss** still applies its
  kills' XP, and its record's levels-after include it.
- **Reproduction:** every record of a whole descent, run through `createCombat` (the record's
  seed, parties and perk effects, plus the registries the store was given) and `resolveFight`,
  gives events deep-equal to the record's. The descent has a perk bought, so the perk effects are
  non-empty, and a level-up between two of its fights. It fails with the perk effects left out of
  the record.
- **Record invariants:** one record per fight resolved; the concatenation of the records' events
  is `events`; the sum of their XP is `xpBanked`; each record's result agrees with
  `fightResults`.
- **Hand-derived store test: the intro grant**: after `runScriptedIntro`, every active-party
  creature holds the fixture config's grant, and a grant that crosses a threshold levels the
  creature. It fails with the grant removed.
- **Real content, generated-then-checkpoint-verified** (in `state/integration.test.ts`): new game →
  spec → intro → floor 1 cleared → the party's levels after floor 1's last fight are above its
  levels going into fight 1, and it enters floor 2 at level 2.

## Traps

- **Snapshot the parties `createCombat` is given, not the ones it returns.** `combat.creatures`
  has innate spells already prepended, `activeEffects` instantiated and `currentHp` set from
  effective Health. Fed back to `createCombat`, it prepends the innate spells a second time. The
  reproduction test catches this only for a creature with an innate spell, so make sure its
  descent has one.
- **Double XP.** The end-of-floor `set` applies the floor's `xpBanked` today. If it stays and the
  per-fight application is added, every creature gets the floor's XP twice. Floor 1 under the
  real config hides it (no level changes before the party has 20 XP), so the exact-once test has
  to read XP, not only levels.
- **`resolvePlayerParty` reads `state.collection`.** Re-resolving per fight from the store's
  `state` gives the stale collection, and the fix becomes a no-op that every existing test passes
  (the probe shows they all pass either way). The new tests are what tell the difference.
- **One party per fight.** Today one `playerCreatures` array is reused for every fight. After the
  fix, each record's player party is that fight's own materialization; a record that holds a
  shared reference reads the wrong levels.
- **Nothing else changes between fights.** Re-materializing per fight is also what resets HP
  (`spec/run.md#hp-resets-every-fight`); no other state crosses a fight boundary. The combat seed
  (`hashRunDraw(runSeed, runCounter + i + 1)`), the generation draw and the `runCounter` advance
  stay exactly as they are, so a floor's enemy rosters are the same as on `main` for the same
  state.
- **The perk effects are resolved once per descent**, from the spend at the start; the record
  carries what `createCombat` actually got, not a recomputation. Reproducing a simulator fight
  needs the simulator's registries (`buildSimScripts`), not the default ones.
- **XP goes to the active party, alive or dead** (`spec/creatures.md#levels-and-xp`): `activeParty`,
  not the creatures still standing at the end.
- **The intro grant follows the Unicorn grant.** It reads the active party after
  `grantCreatureIfUnowned`, so the Unicorn gets it at a new game. Under `TEST_BALANCE_CONFIG`'s
  `100 × level` curve, 10 XP changes no level, so the fixture's value and the test that shows a
  level-up from the grant are yours to choose: an ASSUMPTION.
- **No magic numbers.** The 10 is `data/balance.ts`'s; no literal in the store. Every
  `BalanceConfig` literal gets the field, including `engine/__corpus__/corpus.ts`'s if it builds
  one: the corpus digest must stay byte-identical, and the intro never runs in the corpus.
- **Stale comments:** `GameActions.descend`'s doc comment ("applies XP-driven level-ups
  post-fight"), `FloorOutcome`'s field comments, the `analyzeFight` roster comment citing
  `FloorOutcome.fightEnemyIds`, and `TEST_BALANCE_CONFIG`'s header comment on XP. Present tense,
  no provenance (`CONVENTIONS.md#comment-why-not-what`).
- **The simulator's report shape.** The summary `sim.yml` extracts reads fixed report lines
  (`CONVENTIONS.md#the-simulator-report-runs-after-each-merge`). Reading rosters and events from
  the records changes no printed line; if it would, stop and ask.

## Must stay green

All gates in `coding-rules.md`. Every golden and the corpus digest, byte-identical. Every existing
test except the one listed above. The three `balance-ci-*` tests (green in the probe), and
`balance-sim.test.ts`'s probe-run case, which restores the state it started from.

## The PR must prove

- **Byte-identical engine side:** every golden and the corpus digest unchanged, and the diff of
  `src/engine` is only the `BalanceConfig` field, the fixture's value and any config literal that
  needed the field.
- **Mechanisms, each with its failing variant:** per-fight application reverted to end-of-floor →
  the between-fights test fails; end-of-floor application restored on top → the exact-once test
  fails; perk effects dropped from the record → the reproduction test fails; record parties taken
  from `combat.creatures` → the reproduction test fails; intro grant removed → the intro test fails.
- **Reproduction over whole descents:** the reproduction test's descent (perks bought, a mid-floor
  level-up, an innate spell), plus one descent that ends on a loss.
- **Simulator parity:** for the same seeds, the records' enemy rosters equal `main`'s
  `fightEnemyIds`.
- **Balance** (`phases/4.5/brief.md#balance-verdicts`): the three `balance-ci-*` tests green, and
  the threshold *values* per spec compared with the probe's "fix + 10 XP" row
  (`phases/4.5/F/evidence/kickoff-probe.md#ci-thresholds-40-seeds-ci_run_cap-boss-probe-off`). Don't
  run `npm run sim`. A red verdict stops and asks; no tuning.
- **Levels on real content:** a new game's floor 1 and floor 2, per fight, the party's levels
  going in, matching the probe's floor-1 and floor-2 rows for the fix plus 10 XP.
- The test count, reconciled file by file against `main`: new tests only where listed above.
- **Spec questions:** the record's type and field names, for `spec/store.md`; the intro grant's
  config field name, for `spec/run.md#scripted-intro` and `CONVENTIONS.md#where-each-number-lives`.

## Docs edited at this kickoff

- `.claude/phases/4.5/brief.md`: the per-fight record carries the player's perk effects, and
  reproducing a fight uses them (Duncan's call at kickoff); new entry
  `phases/4.5/brief.md#the-scripted-intro-grants-xp`, 10 XP, in 4.5-F (Duncan's call at kickoff);
  the 4.5-F row of the slice table; the demo's **Copy fight as JSON** carries the perk effects;
  G1's smoke test checks the levels after floor 1's last fight above those going into fight 1,
  instead of a level-up between two floor-1 fights, which the probe showed can't happen.
- `.claude/phases/4.5/F/brief.md`: title and scope (the intro's XP), golden policy (the one store
  test that changes), "Known" (the perk effects; the probe), "Done when" (the perk effects; floor 2
  at level 2).
- Added `.claude/phases/4.5/F/evidence/kickoff-probe.md`, the probe this kickoff cites.
