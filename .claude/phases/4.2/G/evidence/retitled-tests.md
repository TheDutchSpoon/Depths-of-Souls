# The 10 retitled tests (old title -> new title; nothing else in these tests changed)

| # | Old | New |
| --- | --- | --- |
| 1 | `it('ships exactly 10 slots (GAME_DESIGN §4 decade cadence)'` | `it('ships exactly 10 slots (spec/run.md#biomes decade cadence)'` |
| 2 | `it("base stats fall within GAME_DESIGN's ranges: Health 20-45 (4.1-H2c, ASSUMPTION 125), 10-30 for every other stat"` | `it('base stats fall within spec/creatures.md#core-stats ranges: Health 20-45 (4.1-H2c, ASSUMPTION 125), 10-30 for every other stat'` |
| 3 | `it("base stats fall within GAME_DESIGN's ranges: Health 20-45 (4.1-H2c, ASSUMPTION 125), 10-30 for every other stat"` | `it('base stats fall within spec/creatures.md#core-stats ranges: Health 20-45 (4.1-H2c, ASSUMPTION 125), 10-30 for every other stat'` |
| 4 | `it('her adds are real Spider-roster members (species-locked.md: "adds: spiderlings")'` | `it('her adds are real Spider-roster members (content/overgrowth.md#broodmother: "adds: spiderlings")'` |
| 5 | `it("base stats fall within GAME_DESIGN's ranges: Health 20-45 (4.1-H2c, ASSUMPTION 125), 10-30 for every other stat"` | `it('base stats fall within spec/creatures.md#core-stats ranges: Health 20-45 (4.1-H2c, ASSUMPTION 125), 10-30 for every other stat'` |
| 6 | `it("base stats fall within GAME_DESIGN's ranges: Health 20-45 (4.1-H2c, ASSUMPTION 125), 10-30 for every other stat"` | `it('base stats fall within spec/creatures.md#core-stats ranges: Health 20-45 (4.1-H2c, ASSUMPTION 125), 10-30 for every other stat'` |
| 7 | `it('the three specs settle on distinct affinities (species-locked.md: "ideally distinct")'` | `it('the three specs settle on distinct affinities (spec/progression.md#specializations)'` |
| 8 | `it('Brute starter: a second FULL-power attack instance (species-locked.md: "twice at 100%")'` | `it('Brute starter: a second FULL-power attack instance (specializations/brute.md#starter-cragfang-mauler: "twice at 100%")'` |
| 9 | `describe('an action ends when its actor dies (CONVENTIONS, 4.1-C2c)'` | `describe('an action ends when its actor dies (spec/combat.md#an-action-ends-when-its-actor-dies, 4.1-C2c)'` |
| 10 | `describe('hook order in the damage path (4.1-H2b1; CONVENTIONS "Hook execution model")'` | `describe('hook order in the damage path (4.1-H2b1; spec/effects.md#hook-execution)'` |

Files: `data/biomes.test.ts:27`, `data/species/{glimmerdark,overgrowth,rotcap-hollow,starters}.test.ts` (the shared "base stats fall within ... ranges" title, four files), `data/species/overgrowth.test.ts:125`, `data/species/starters.test.ts:52` (D3: the title cites the specializations table without the quotation), `data/species/starters.test.ts:183`, `engine/actor-death.test.ts:123`, `engine/damage-observation.test.ts:458`.
Prettier re-wrapped four of the files (the shorter title no longer needs the long-line form); the comment-and-title proof is unaffected.
