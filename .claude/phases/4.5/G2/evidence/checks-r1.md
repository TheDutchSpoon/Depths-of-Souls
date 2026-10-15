# Review r1 checks, 4.5-G2

Branch `4.5-g2` at `820de56`, `main` at `8aef772`. Sandbox clone, `npm ci` on each tree, Node
22.22.0, Vitest 5.0.3.

## Gates on `820de56`

```
npm run test (JSON reporter)   2200 tests: 2199 passed, 1 skipped, 0 failed   (main: 2152: 2151 + 1)
npm run lint                   pass
npm run format:check           pass
npm run build                  pass
npx tsc -b                     pass
docs:check -- citations        PASS, 697 citations in 518 files
docs:check -- comments         PASS, 7602 comments and 1950 titles in 484 files
docs:check -- comments --quotations
                               src/app/instanceLabels.ts:10: spec/store.md#collection-shape "#1"
                               src/engine/__corpus__/node-shims.d.ts:3: CONVENTIONS.md#test-environments "vite/client"   (on main too)
docs:check -- budgets          13 files, 0 over budget
```

## Test count by file, `main` → branch (every file that differs)

```
src/app/creatureLine.test.ts     0 -> 7
src/app/debugBoss.test.ts        0 -> 3
src/app/instanceLabels.test.ts   0 -> 6
src/app/partyRows.test.ts        0 -> 8
src/app/perkRows.test.ts         0 -> 9
src/app/refusals.test.ts         3 -> 7   (all three main titles present)
src/app/soulRows.test.ts         0 -> 6
src/app/specSwitcher.test.ts     0 -> 5
```

## Mutations

Each applied to the branch, run against the named test files, then restored with
`git checkout -- src`.

```
M1  party lines labelled over the party only        0 failed; full suite 0 of 2200 failed   <- unpinned
M2  bench lines labelled over the bench only        1 failed  benchRows: lists exactly the instances outside the party
M3  instance scriptId ignored                       1 failed  creatureLine: a scriptId set on the instance replaces the role script
M4  gems hard-coded to 3                            1 failed  creatureLine: a null gem prints empty and the gem count is the array length
M5  null gem dropped                                1 failed  creatureLine: (same)
M6  spell ids instead of names                      4 failed  creatureLine
M7  affinity and rarity uncapitalized               1 failed  creatureLine: each spec starter and the Unicorn …
M8  pickParty empties the slot first                2 failed  pickParty: exactly one call; a party member … swaps the two
M9  setPerkFromField with Number()                  1 failed  the level field: blank, text, a fraction …
M10 checkPerkField with Number()                    1 failed  the level field: (same)
M11 perk level ignores the spend                    2 failed  perkRows
M12 switchSpec does nothing                         2 failed  switchSpec
M13 recordBoss does nothing                         2 failed  recordBoss
M14 bossChoices names by id                         1 failed  bossChoices
M15 soul row named by id                            2 failed  soulRows
M16 soul row's canSummon replaced by ok             1 failed  soulRows
M17 labelOf falls back to the id                    1 failed  labelInstances: an unlabelled id throws
M18 trait miss falls back to the id                 1 failed  creatureLine: a miss throws …
M19 bench includes party members                    1 failed  benchRows
M20 two summon refusal texts equal                  1 failed  refusal text: every summon refusal reason …
```

M1 on a reachable state (Brute, seed 11, five summons of the starter, the benched copy picked
into slot 0):

```
slot 0 inst-6  option "Cragfang Mauler #6, Lv 1"  line "Cragfang Mauler #5, Lv 1"
slot 2 inst-2  option "Cragfang Mauler #2, Lv 1"  line "Cragfang Mauler #1, Lv 1"
slot 5 inst-5  option "Cragfang Mauler #5, Lv 1"  line "Cragfang Mauler #4, Lv 1"
bench          "Cragfang Mauler #1, Lv 1"
```

`instanceLabels.test`'s "party and bench" case, replayed: after `startRun(brute, '1')` and its one
summon, `activeParty` is `["inst-0","inst-1","inst-2",null,null,null]`, so nothing is benched.

## The first-clear scan, reproduced

An independent scan in the sandbox composing `balance-sim.ts`'s exports as
`plan-handout-r1.md` items 2 and 5 say (`createGameStore()`, `newGame` → `setSpec` →
`runScriptedIntro`, `summoned` seeded from the owned instances, `summonPass` + `applyPartyOrder`
before the first run and after each run but the clearing one, `nextRun` / `descend` /
`advanceProgress`, stop at floor 10 or `RUN_CAP`).

- All 120 rows equal `first-clear-scan.md`'s: Sorcerer 40/40 (quickest 44), Brute 40/40 (38),
  Shieldbarer 28/40 (40; not cleared: seeds 5, 8, 10, 20, 22, 30, 31, 32, 33, 35, 37, 39).
- The pick is unique: Brute 10 at 38; next Brute 18 at 42.
- For Brute 10, the summon / descent / party-before / deepest-after lines equal
  `first-clear-log.md`'s, 56 lines, MD5 `c61b2bbe1aaa5c84e6fd4cbac560ecd8` on both. Descent 38
  reports `bossFirstCleared` with 100 perk points.
- Party targets: in every candidate, `orderedParty` equalled the party it was applied to before
  every run (0 reorders across the 120 candidates, each up to its clear or the cap). Brute 10 summons 18 creatures; the
  party is the starter, the Unicorn and the first four.
