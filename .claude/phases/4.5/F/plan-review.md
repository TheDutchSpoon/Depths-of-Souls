# Plan review — 4.5-F: Level-ups after each fight, the per-fight record, and the intro's XP

## Round 1

**Verdict:** approved, with the corrections below carried in this round's hand-out
(`plan-handout-r1.md`), once Duncan has made the two calls under **Decide-points**. Neither call
needs another round: each changes one field or one helper, not the design.

Checked against `kickoff.md`, `brief.md`, `evidence/kickoff-probe.md`,
`phases/4.5/brief.md#level-ups-after-each-fight`, `phases/4.5/brief.md#the-per-fight-record`,
`phases/4.5/brief.md#the-scripted-intro-grants-xp`, the living docs and the code on the branch
(`fb9e156`, `src/` identical to `main`). The `descend` rework, the intro grant and the simulator
switch match the code as it stands: `createCombat` (`engine/combat.ts`) builds new objects and
never mutates its inputs, `applyXpGain` carries over several levels in one call, and no test
covers `analyzeFights`'s log-vs-roster throw, so dropping it changes no test.

### Plan fixes

1. **The Unicorn has no innate spell (amends test 4, test 2 and ASSUMPTION 8).** Its trait,
   `unicorn-guardians-light` (`data/traits/starters.ts`), is one `on-attack` revive. The only
   innate spell in content is the Sorcerer starter's Arcane Bolt (`SORCERER_STARTER_TRAIT`'s
   `innate-spell` effect). So descents A and B as planned have no innate-spell creature: the
   kickoff requires one, and the plan's own "party holds an innate-spell creature" check would
   fail at build. Use the real `SORCERER_STARTER` as HERO's partner in tests 2 and 4 (added to
   `standaloneCreatures`, placed in the collection and party with a hand-built `Instance`,
   `scriptId: 'always-attack'`, empty gems, so no gem roll runs). The default trait and spell
   registries already hold its trait and Arcane Bolt. Test 2's arithmetic is unchanged: it reads
   XP only.
2. **Rename the record list `fightRecords` (amends ASSUMPTION 1).** `fights` already means two
   other things on the same lines: the generated floor in `descend` (`fights[i].enemyParty`, the
   same field name as the record's), and `FightMetrics[]` in the simulator
   (`FloorRunResult.fights`, the local `fights` in `playFloorRun`). After the plan,
   `playFloorRun` would hold `probeRun.fights` (records) beside `fights` (metrics). Use
   `FloorOutcome.fightRecords` and `runProbe(...).fightRecords`. `FightRecord` and its field names
   stand.
3. **`partyLevelsAfter` without an unchecked cast (amends "The record").** `origin.ref` is
   `string | undefined`; the collection is keyed by the branded `InstanceId`. Don't look levels up
   through `collection.get(creature.origin.ref as InstanceId)`. Have `resolvePlayerParty` also
   return the `InstanceId` of each creature it materialized, in the same order, and read
   `partyLevelsAfter` through those.
4. **Test 7's floor-2 clause is not a check (amends test 7).** "Floor 2's last-resolved-fight
   levels follow from the probe's row": the probe has no floor-2 levels-after. Pin, at the file's
   seed, every floor-2 record's levels going in and `partyLevelsAfter`, each `[2, 2]` if that is
   what the run gives. Checkpoint in the comment: level 3 needs `xpForNextLevel(2)` = 20 × 2² = 80
   at the default curve, and the floor-2 total printed beside it is below that.
5. **Re-running the intro grants again (adds ASSUMPTION 12).** The Unicorn grant is idempotent;
   the XP grant is not, so a second `runScriptedIntro` call grants the XP a second time.
   `spec/run.md#scripted-intro` already makes calling it once, right after `setSpec`, the
   caller's job, and every caller (the simulator's `runSeed`, the demo's new game) does. Keep it
   unguarded, state it as ASSUMPTION 12, no test. A guard tied to "the Unicorn was newly granted"
   would be a special case for one caller contract.

### Assumptions

- **1** (`FightRecord`, field names): **correct**, fix 2 (the list's name only).
- **2** (`result` on the record): **decide-point 1**. The brief fixes the record's contents
  (`phases/4.5/brief.md#assumptions`, item F), so adding a field is a change, not a confirmation.
- **3** (`partyLevelsAfter` aligned with `playerParty`): **confirm**. Index-aligned with the
  party it describes is what the demo's header reads; a slot the materializer skips is defensive
  only. Read through fix 3.
- **4** (`introXpGrant`, fixture value `0`): **confirm**. `0` keeps every fixture-config test that
  runs the intro (most of `integration.test.ts` pins `TEST_BALANCE_CONFIG`) untouched, and
  `applyXpToParty` returns early on a gain of `0`. The grant is covered by test 6 (spread
  override) and test 7 (default config). The fixture's header comment says the grant is off.
- **5** (references, not copies): **confirm**. `createCombat` spreads and maps; nothing writes to
  the arrays after.
- **6** (full party → the Unicorn gets no intro XP): **confirm**. At a new game the party holds
  only the starter, so it can't happen on the supported path.
- **7** (`splitFights` left exported, unused): **decide-point 2**.
- **8** (Unicorn + `attack ×2` perk): **correct**, fix 1 for the creature. The perk stands:
  `DamageDealt` carries `rawDamage`, so a dropped attack perk changes every player attack's event
  and the fallback isn't needed. Note for the report: the "parties from `combat.playerParty`"
  variant fails by `createCombat`'s own guard (`engine/combat.ts`, "already carries fight-setup
  output"), which trips for any creature with a trait or a perk effect, so it fails here whatever
  the innate spell. The innate-spell creature stays because the kickoff asks for it.
- **9** (real-content test pins one seed; rows are evidence): **confirm**, with fix 4.
- **10** (scratch scripts outside the repo, tables in `evidence/`): **confirm**.
- **11** (per-fight XP = sum of its kills; floor total unchanged): **confirm**.

The golden policy matches the kickoff's: engine goldens and the corpus digest byte-identical, the
`src/engine` diff limited to the field, the fixture value and its comment, one existing store test
changed in the listed way (its assertions read `fightRecords`). Every mechanism has a test that
fails without it, at each site: per-fight application (tests 1–3; test 1 also fails with
`resolvePlayerParty` reading `state.collection`, and with one party shared across fights), the
record's build (tests 4–5), its two read sites (the probe-run case for `runProbe`;
`playFloorRun`'s through the existing `enemyTemplateIds.length > 0` case plus the parity table,
since a map over records can't misalign), and the intro grant (tests 6–7).

### Decide-points

1. **Does the record carry `result`?** Not in the brief's contents list; the plan adds it.
   **Recommendation: yes, and add it to the brief's list.** The kickoff's own invariant ("each
   record's result agrees with `fightResults`") already reads a per-record result; the demo's
   fight list (number, result, rounds, kills, XP, level-ups) then maps over records alone; and a
   copied fight's JSON says how the fight ended without replaying it. The cost is one value held
   twice, in the record and in `fightResults`; test 5 pins them equal, so they can't drift.
   Against: `fightResults` stays, so the record's copy is strictly redundant, and the demo could
   zip by index instead.
2. **`splitFights` after its last `src` caller goes.** The plan keeps it exported and unused so
   its test stays unchanged.
   **Recommendation: delete `splitFights` and its "splits fights at FightStarted" test in this
   slice, listed as the one further changed test.** After this slice the record is the way to get
   one fight's events; an exported helper that re-derives them from the concatenated log invites
   G1 to do it the old way, and nothing in `src` would exercise it. Deleting a test of deleted
   code re-pins nothing. Against: the kickoff makes any further test change a stop-and-ask, which
   is why it's your call, and keeping it costs nine dead lines.

### Decisions

1. **The record carries `result`**, and the brief's contents list says so
   (`phases/4.5/brief.md#the-per-fight-record`). ASSUMPTION 2 stands.
2. **`splitFights` and its "splits fights at FightStarted" test are deleted** in this slice, the
   one further changed test, listed in the kickoff's golden policy. ASSUMPTION 7 is corrected.

### Docs edited

- `.claude/phases/4.5/brief.md`: the per-fight record's contents include its result (decision 1);
  ASSUMPTION (F) ticked with the type and list names (`FightRecord`, `FloorOutcome.fightRecords`).
- `.claude/phases/4.5/F/kickoff.md`: Scope, the record carries its result and `splitFights` goes;
  golden policy, the deleted `splitFights` test (decision 2).
- `.claude/phases/4.5/F/brief.md`: golden policy names the deleted `splitFights` test.
