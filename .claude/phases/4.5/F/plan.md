# Plan — 4.5-F: level-ups after each fight, the per-fight record, the intro's XP

Read: `CLAUDE.md`, `workflow/coding-rules.md`, the kickoff and its reading list, the probe, the brief
entries, `spec/run.md`, `spec/store.md`, `spec/creatures.md#levels-and-xp`, `spec/combat.md`,
`spec/saves.md`, and the code the kickoff names. No spec file beyond the kickoff's list is reached.
No conflict between the kickoff and the docs.

## Approach

Three run-layer changes in `src/state/store.ts`, plus the `BalanceConfig` field and the simulator's
switch from `fightEnemyIds` to the records.

### `descend` (store.ts)

- `resolvePlayerParty(state, deps)` becomes `resolvePlayerParty(collection, activeParty, deps)`, so
  `descend` can pass its local collection. `runScriptedIntro` passes `state.collection` /
  `state.activeParty`. Body unchanged.
- In `descend`, `let collection = state.collection` before the fight loop. The party is
  re-materialized at the top of **each** iteration from that local `collection` (one fresh
  `Creature[]` per fight; HP reset comes with it). Never from `state`, which is stale after fight 1.
- Per fight: a local `fightXp` accumulates in the existing per-kill loop (boss path and ordinary
  path both); after the kill loop, `xpBanked += fightXp` and
  `collection = applyXpToParty(collection, state.activeParty, fightXp, cfg)`, **before** the
  win/break check, so a lost or drawn fight applies its kills' XP too. `activeParty` is the active
  party, alive or dead.
- Then the record is pushed (below), with levels read from the updated `collection`.
- The final `set` stores `collection` (the local one) and **no longer calls `applyXpToParty`**. The
  other `set` fields, the seed `hashRunDraw(runSeed, runCounter + i + 1)`, the generation draw and
  `runCounter + fights.length + 1` are untouched, so rosters are the same for the same state.
- `GameActions.descend`'s doc comment and the `FloorOutcome` field comments are rewritten (present
  tense, no provenance).

### The record (store.ts)

```ts
export interface FightRecord {
  readonly events: readonly CombatEvent[]
  readonly result: FightResult
  readonly xpBanked: number
  /** The active party's levels after this fight's XP, in `playerParty` order. */
  readonly partyLevelsAfter: readonly number[]
  readonly seed: number
  /** Exactly as `createCombat` was given them. */
  readonly playerParty: readonly Creature[]
  readonly enemyParty: readonly Creature[]
  readonly playerEffects: readonly EffectDef[]
}
```

- `FloorOutcome.fights: readonly FightRecord[]` replaces `fightEnemyIds`. `events`, `fightResults`,
  `xpBanked` and the rest stay.
- `playerParty` is that fight's own materialized array (the one passed to `createCombat`, not
  `combat.creatures`, which has innate spells prepended and effects instantiated). `enemyParty` is
  `fight.enemyParty`; `playerEffects` is the once-resolved `partyWideEffects`, as passed.
- `partyLevelsAfter` = for each creature in `playerParty`, `collection.get(creature.origin.ref).level`
  (the instance id rides in `origin.ref`), so it aligns index for index with `playerParty`.
- Needs an `EffectDef` import (type) from `engine/effect-types`; `Creature`/`CombatEvent`/
  `FightResult` are already imported.

### The intro (store.ts, `engine/balance-types.ts`, `data/balance.ts`, fixture)

- `BalanceConfig.introXpGrant: number` (doc: flat XP every active-party creature gets once the
  Unicorn has joined). `data/balance.ts`: `introXpGrant: 10`. `engine/__fixtures__/balance.ts`:
  `introXpGrant: 0` (ASSUMPTION 4) and its header comment gains a bullet saying the intro's grant is
  off in the fixture and a test overrides it. These are the only `src/engine` edits. `tsc -b` finds
  any other literal; a grep shows only these two plus `engine/__corpus__/corpus.ts`, which imports
  `DEFAULT_BALANCE_CONFIG` and builds no literal, so it needs nothing.
- `runScriptedIntro`'s `set` becomes: `granted = grantCreatureIfUnowned(s, deps, UNICORN.id)`, then
  `collection: applyXpToParty(granted.collection, granted.activeParty, cfg.introXpGrant, cfg)`
  alongside `activeParty`, `nextInstanceOrdinal` and `runCounter + 1`. It runs whatever the
  result, as the Unicorn grant does. The intro's kills bank nothing (unchanged).

### The simulator (balance-sim.ts)

- `analyzeFights(records, ctx)` maps each record to
  `analyzeFight(record.events, ctx, record.enemyParty.map((c) => c.id))`. The log-vs-roster count
  check goes, since a record pairs them by construction.
- `playFloorRun` calls it with `outcome.fights`; the boss probe with `probeRun.fights`.
- `runProbe` returns `{ cleared, events, fights }` (`fights` replaces `fightEnemyIds`; `events`
  stays, the probe case reads it).
- `analyzeFight`'s roster comment cites the record. `splitFights` loses its only `src` caller but
  stays exported (its test is unchanged; ASSUMPTION 7). No printed report line changes.

## Golden policy (restated from the kickoff)

Engine goldens and the corpus digest **byte-identical**; `src/engine` diff = the `BalanceConfig`
field and the fixture's value/comment only. The only existing test that changes is
`balance-sim.test.ts`'s probe-run case: its three `fightEnemyIds` assertions (lines ~509-511) read
rosters from the records (`fights.map((f) => f.enemyParty.map((c) => c.id))`); the rosters are
identical. Any other existing test that moves is a stop-and-ask, not a re-pin. New goldens are
hand-derived (arithmetic in comments) except the real-content one, labelled
generated-then-checkpoint-verified. No run-then-pasted values.

## Tests

All new store tests in `state/store.test.ts` on its fixtures (`CFG` = `100 × level`, FODDER level 1
at floor 1 = 1 XP per kill, ALL_WIN / WIN_THEN_LOSS / MIXED sequences). Each mechanism's removal
variant is run by hand once while building and reported.

| # | Test | Hand derivation | Fails when |
| --- | --- | --- | --- |
| 1 | **levels change between two fights** | ALL_WIN, HERO set to level 1 / xp 99. Fight 1 kills FODDER (level 1) → 1 XP → 99+1 = 100 ≥ xpForNextLevel(1)=100 → level 2, xp 0. Assert `fights[0].playerParty` level 1, `fights[0].xpBanked` 1, `fights[0].partyLevelsAfter` `[2]`, `fights[1].playerParty` level 2 (and its scaled `baseStats` above fight 1's), `fights[1].partyLevelsAfter` `[2]` | XP applied after the floor |
| 2 | **XP applied exactly once** | ALL_WIN, party HERO (level 1, xp 98) + the real Unicorn (level 1, xp 0, scriptId `always-attack`). Floor = 3 XP, 1 per fight. HERO: 99, then 100 → level 2 xp 0, then xp 1. Unicorn: xp 3, level 1. Assert exact level and xp of both. A second application of 3 would give HERO xp 4 and Unicorn xp 6 | the end-of-floor application put back on top |
| 3 | **a loss's last fight applies its kills' XP** | MIXED sequence, floor 2, `deepestFloor: 1`, HERO xp 98. Fight 1 is a loss with FODDER dead (level 2 at floor 2, stub level roll 0 → min level) → 2 XP → 100 → level 2, xp 0. One record, `result` loss, `partyLevelsAfter` `[2]`, collection HERO level 2 | XP applied only to won fights / not applied after a loss |
| 4 | **reproduction** | Descent A: ALL_WIN, party HERO + Unicorn (innate spell), a perk bought (`perkSpend` set; a fixture spec with one `attack ×2` stat-modifier perk), HERO xp 99 so a level-up lands between fights 1 and 2. Descent B: WIN_THEN_LOSS, same party, ends on a loss. For every record: `createCombat({ seed, player: { party: playerParty, effects: playerEffects }, enemy: { party: enemyParty }, registries: <the store's deps> })` → `resolveFight` → events deep-equal `record.events`. Also asserts `playerEffects` is non-empty and the party holds an innate-spell creature | perk effects left out of the record (events differ); record parties taken from `combat.creatures` (`createCombat` throws on the already-set-up creature / innate slots doubled); the party shared across fights (fight 2's record would read fight 1's level) |
| 5 | **record invariants** | Over descents A, B and test 3's: `fights.length === fightResults.length`; `fights.flatMap(events)` deep-equals `events`; Σ `xpBanked` = `xpBanked`; `fights[i].result === fightResults[i]` | a record dropped or double-pushed; XP split wrong |
| 6 | **intro grant** | Fixture config `{ ...CFG, introXpGrant: 150 }`, HERO + real Unicorn (the existing intro-test setup). After `runScriptedIntro`: HERO and Unicorn each level 2, xp 50 (150−100; level 2 needs 200). With `introXpGrant: 40`: both level 1, xp 40. With the overwhelming Unicorn (a loss): same grant. Non-vacuous: a Unicorn-only check would not catch a grant to HERO only, so both are asserted | the grant removed; the grant read before the Unicorn joined (Unicorn xp 0); the grant gated on a win |
| 7 | **real content** (`state/integration.test.ts`, labelled generated-then-checkpoint-verified) | Default store, Brute: new game → `setSpec` → intro → `descend(1)` → `descend(2)`. Assert: floor 1's `fights[0].playerParty` levels `[1, 1]` and `fights.at(-1).partyLevelsAfter` `[2, 2]` (checkpoint: 10 intro XP + 10 floor XP = 20 = xpForNextLevel(1) at the default curve); floor 2's every fight enters at `[2, 2]` and floor 2's last-resolved-fight levels follow from the probe's row. Pinned at the file's seed; the per-seed rows (1-5, all three specs) are in the report | the intro grant removed (floor 1 ends at 10/20, level 1); the per-fight application removed |
| 8 | **existing, edited:** `balance-sim.test.ts` probe-run case | roster assertions read from records | `runProbe`/`descend` without the records (type + assertion fail) |

Every site of every mechanism:

- **Per-fight application** (one site, `descend`): tests 1, 2, 3.
- **Records** (built in `descend`, read at two sites, `playFloorRun` and the probe): the
  reproduction/invariants tests cover the build; the probe-run case (8) covers the probe's read;
  `playFloorRun`'s read is covered by the existing sim test asserting
  `fight.enemyTemplateIds.length > 0` (`balance-sim.test.ts` ~1365), which fails if the roster comes
  out empty. Both read sites are named in the report.
- **Intro grant** (one site): test 6, plus 7 end to end.
- **`resolvePlayerParty` reading the local collection** (the stale-state trap): test 1 fails with
  `state.collection` there.

## Verification beyond the suite (scratch scripts outside the repo; printed tables to `evidence/`)

- **Simulator parity:** export `main` (`git archive`) to a scratch dir, run on both trees, from a
  fresh state per spec (brute, shieldbarer, sorcerer) and seeds 1-5: `descend(1)`, and `descend(2)`
  with `deepestFloor` set to 1, printing the enemy roster ids; compare `main`'s `fightEnemyIds` with
  the branch's `fights[].enemyParty` ids. Digest in `evidence/`.
- **Balance:** the three `balance-ci-*` tests green; the threshold values (floor-1 first-try %,
  median runs to first soul, seeds to floor 5) from a scratch script calling the simulator over 40
  seeds at `CI_RUN_CAP`, boss probe off (not `npm run sim`), per spec, compared to the probe's
  "fix + 10 XP" row. A red verdict stops and asks.
- **Levels on real content:** a scratch script printing, per fight, the party's levels going in on
  floor 1 and floor 2, seeds 1-5, per spec, against the probe's rows.
- **Test count:** per-file counts on `main` vs the branch; only the 8 listed rows change counts
  (tests 1-7 are new; 8 is an edit).
- Gates: `npm run test`, `lint`, `format:check`, `build`, `npx tsc -b`, `docs:check -- citations`,
  `docs:check -- comments`; the corpus digest test unchanged.

## Stale comments to rewrite

`GameActions.descend` doc; `FloorOutcome` field comments; `analyzeFight`'s roster comment;
`analyzeFights`'s comment; `TEST_BALANCE_CONFIG`'s header (the XP section gains the intro line);
`runScriptedIntro`'s doc comment gains the grant.

## Spec questions to raise in the report (no living-doc edits)

The record's type and field names (`FightRecord`, `FloorOutcome.fights`, ...) for `spec/store.md`;
`introXpGrant` for `spec/run.md#scripted-intro` and `CONVENTIONS.md#where-each-number-lives`; the
`**Known bug:**` line in `spec/run.md#rewards`; `splitFights` left without a `src` caller.

## Assumptions checklist

- [ ] **ASSUMPTION 1:** the record's type is `FightRecord`, held in `FloorOutcome.fights`, with the
      fields above (the brief already lists the names as the plan's).
- [ ] **ASSUMPTION 2:** the record also carries `result` (not in the kickoff's list), so the
      invariant "each record's result agrees with `fightResults`" reads a field rather than parsing
      `FightEnded`.
- [ ] **ASSUMPTION 3:** `partyLevelsAfter` is one number per creature of `playerParty`, in that
      order (instances the materializer skips get no entry), not per `activeParty` slot.
- [ ] **ASSUMPTION 4:** the config field is `introXpGrant`; the fixture's value is `0`, so every
      existing fixture-config test is untouched and the intro tests override it with a spread
      (150 to cross a threshold, 40 not to).
- [ ] **ASSUMPTION 5:** the record holds references (the player party array, `fight.enemyParty`,
      the one `partyWideEffects` array shared by all records), not deep copies: nothing mutates
      them after `createCombat` takes them, and the reproduction test proves they reproduce.
- [ ] **ASSUMPTION 6:** if the active party is full when the Unicorn is granted, it is not in the
      active party and gets no intro XP ("every creature in the active party"). Not tested; the
      callers run the intro right after `setSpec`.
- [ ] **ASSUMPTION 7:** `splitFights` stays exported and unused in `src` so its test is unchanged
      (changing it would be a second changed test); the design agent can drop both.
- [ ] **ASSUMPTION 8:** the reproduction and exact-once tests use the real Unicorn (its innate spell
      is the innate-spell case), set to the `always-attack` fixture script, with a fixture `attack ×2`
      perk; whether that perk changes the logged events is verified at build by the removal run, and
      if it doesn't, the perk is changed to one that does.
- [ ] **ASSUMPTION 9:** the real-content test pins floor 2's per-fight levels at the file's default
      seed only and asserts levels going in, not floor 2's win/loss; the per-seed rows are report
      evidence, not tests.
- [ ] **ASSUMPTION 10:** parity and threshold values come from scratch scripts outside the repo
      (a `main` export via `git archive`, nothing in `src/`); their printed tables are the only
      files added to `evidence/`.
- [ ] **ASSUMPTION 11:** per-fight XP is the sum of that fight's kill awards, so the floor's
      `xpBanked` is unchanged (the sum of the records').
