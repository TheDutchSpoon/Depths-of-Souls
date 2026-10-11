# Mapping: every old citation in src/ (243) and where it went

Each row is a token the rewrite replaced: `src/` file:line (the line of the old name, before the rewrite), the replaced
text (joined over line breaks), the anchor written, and where the answer came from. Source: the plan's Appendix
(A: 31 rows answered by an inventory row, used as-is and cross-checked by the rewrite against the B-F inventories;
B1-B4: 206 hand-mapped rows approved at the plan review), plus 6 rows the plan review overrode.
Kind: comment (232), title (10), template (1, D1).

Rule: the span is the old name (a `.claude/species/` prefix, `.md`, a possessive and a surrounding backtick pair included), then
for CONVENTIONS a directly following `"Label"` with no colon, for GAME_DESIGN a following `§N`; a quotation after a colon, or
after species-locked, stays. The span becomes the anchor in backticks (bare in a title; backticks escaped in the template).

| src/ file:line | Kind | Replaced text | Anchor written | Source |
| --- | --- | --- | --- | --- |
| app/demoFight.ts:17 | comment | `GAME_DESIGN.md §13` | `OPEN_QUESTIONS.md#balance-numbers` | hand-map B1 |
| data/balance.ts:4 | comment | `GAME_DESIGN §13` | `OPEN_QUESTIONS.md#balance-numbers` | hand-map B1 |
| data/biomes.test.ts:27 | title | `GAME_DESIGN §4` | `spec/run.md#biomes` | hand-map B3 |
| data/biomes.ts:7 | comment | `GAME_DESIGN §4` | `spec/run.md#biomes` | hand-map B1 |
| data/perform-action.data.test.ts:1 | comment | `CONVENTIONS "perform-action"` | `spec/responses.md#perform-action` | hand-map B2 |
| data/scripts.test.ts:37 | comment | `CONVENTIONS "Role scripts"` | `spec/scripting.md#role-scripts` | hand-map B2 |
| data/scripts.ts:3 | comment | `CONVENTIONS "Role scripts"` | `spec/scripting.md#role-scripts` | hand-map B2 |
| data/specializations.ts:1 | comment | `CONVENTIONS` | `spec/progression.md#specializations-are-data` | hand-map B3 |
| data/specializations.ts:59 | comment | `CONVENTIONS'` | `spec/progression.md#specializations-are-data` | hand-map B3 |
| data/specializations.ts:296 | comment | `CONVENTIONS` | `spec/combat.md#cross-stat-contribution` | hand-map B3 |
| data/specializations.ts:334 | comment | `CONVENTIONS` | `spec/combat.md#cross-stat-contribution` | hand-map B3 |
| data/specializations.ts:442 | comment | `CONVENTIONS` | `spec/combat.md#cross-stat-contribution` | hand-map B3 |
| data/species/glimmerdark.test.ts:57 | title | `GAME_DESIGN's` | `spec/creatures.md#core-stats` | hand-map B3 |
| data/species/glimmerdark.ts:1 | comment | `GAME_DESIGN §4` | `spec/run.md#biomes` | hand-map B1 |
| data/species/glimmerdark.ts:2 | comment | ``.claude/species/species-locked.md`'s` | `content/glimmerdark.md#glimmerdark-biome-2-floors-1120` | hand-map B4 |
| data/species/glimmerdark.ts:8 | comment | `species-locked.md` | `content/glimmerdark.md#resonants-wit-caster-synergy` | hand-map B4 |
| data/species/glimmerdark.ts:12 | comment | `GAME_DESIGN §13` | `OPEN_QUESTIONS.md#content-numbers` | hand-map B1 |
| data/species/glimmerdark.ts:13 | comment | `species-locked.md's` | `content/glimmerdark.md#affinity-spread` | hand-map B4 |
| data/species/glimmerdark.ts:18 | comment | `CONVENTIONS` | `CONVENTIONS.md#composition-files-only-reference-carriers` | hand-map B3 |
| data/species/glimmerdark.ts:63 | comment | `GAME_DESIGN §4` | `spec/run.md#spells-unlock-cumulatively` | hand-map B1 |
| data/species/glimmerdark.ts:203 | comment | `species-locked.md` | `content/glimmerdark.md#sparkeaters-violenceendurancevitality-stat-parasites` | hand-map B4 |
| data/species/glimmerdark.ts:344 | comment | `species-locked.md` | `content/glimmerdark.md#leech-sovereign` | hand-map B4 |
| data/species/glimmerdark.ts:351 | comment | `CONVENTIONS' "Boss floors"` | `spec/run.md#boss-floor-generation` | inventory row C:84 |
| data/species/overgrowth.test.ts:52 | title | `GAME_DESIGN's` | `spec/creatures.md#core-stats` | hand-map B3 |
| data/species/overgrowth.test.ts:125 | title | `species-locked.md` | `content/overgrowth.md#broodmother` | hand-map B4 |
| data/species/overgrowth.ts:1 | comment | `GAME_DESIGN §4` | `spec/run.md#biomes` | hand-map B1 |
| data/species/overgrowth.ts:2 | comment | ``.claude/species/species-locked.md`'s` | `content/overgrowth.md#the-overgrowth-biome-1-floors-110` | hand-map B4 |
| data/species/overgrowth.ts:7 | comment | `species-locked.md's` | `content/overgrowth.md#enabler-payoff-amplifier` | hand-map B4 |
| data/species/overgrowth.ts:15 | comment | `GAME_DESIGN §5` | `spec/creatures.md#core-stats` | hand-map B1 |
| data/species/overgrowth.ts:16 | comment | `GAME_DESIGN §13` | `OPEN_QUESTIONS.md#content-numbers` | hand-map B1 |
| data/species/overgrowth.ts:19 | comment | `species-locked.md's` | `content/overgrowth.md#reading-this-biome` | hand-map B4 |
| data/species/overgrowth.ts:363 | comment | `species-locked.md` | `content/overgrowth.md#broodmother` | hand-map B4 |
| data/species/overgrowth.ts:373 | comment | `CONVENTIONS' "Boss floors"` | `spec/run.md#boss-floor-generation` | inventory row C:84 |
| data/species/overgrowth.ts:388 | comment | `species-locked.md's` | `content/overgrowth.md#broodmother` | hand-map B4 |
| data/species/rotcap-hollow.test.ts:58 | title | `GAME_DESIGN's` | `spec/creatures.md#core-stats` | hand-map B3 |
| data/species/rotcap-hollow.ts:1 | comment | `GAME_DESIGN §4` | `spec/run.md#biomes` | hand-map B1 |
| data/species/rotcap-hollow.ts:2 | comment | ``.claude/species/species-locked.md`'s` | `content/rotcap-hollow.md#rotcap-hollow-biome-3-floors-2130` | hand-map B4 |
| data/species/rotcap-hollow.ts:8 | comment | `species-locked.md's` | `content/rotcap-hollow.md#species-roles` | hand-map B4 |
| data/species/rotcap-hollow.ts:13 | comment | `GAME_DESIGN §13` | `OPEN_QUESTIONS.md#content-numbers` | hand-map B1 |
| data/species/rotcap-hollow.ts:14 | comment | `species-locked.md's` | `content/rotcap-hollow.md#species-roles` | hand-map B4 |
| data/species/rotcap-hollow.ts:27 | comment | `CONVENTIONS` | `CONVENTIONS.md#composition-files-only-reference-carriers` | hand-map B3 |
| data/species/rotcap-hollow.ts:347 | comment | `species-locked.md` | `content/rotcap-hollow.md#rot-sovereign` | hand-map B4 |
| data/species/rotcap-hollow.ts:357 | comment | `CONVENTIONS' "Boss floors"` | `spec/run.md#boss-floor-generation` | inventory row C:84 |
| data/species/rotcap-hollow.ts:372 | comment | `species-locked.md` | `content/rotcap-hollow.md#rot-sovereign` | hand-map B4 |
| data/species/starters.test.ts:39 | title | `GAME_DESIGN's` | `spec/creatures.md#core-stats` | hand-map B3 |
| data/species/starters.test.ts:52 | title | `species-locked.md: "ideally distinct"` | `spec/progression.md#specializations` | D3 (plan-review): hand-map, title cites the table, quote dropped |
| data/species/starters.test.ts:183 | title | `species-locked.md` | `specializations/brute.md#starter-cragfang-mauler` | hand-map B4 |
| data/species/starters.ts:1 | comment | `species-locked.md's` | `spec/progression.md#starter-species-are-stubs` | hand-map B4 |
| data/species/starters.ts:5 | comment | `CONVENTIONS` | `spec/creatures.md#materializecreature` | hand-map B3 |
| data/species/starters.ts:7 | comment | `CONVENTIONS "Data layer — carriers vs. composition"` | `CONVENTIONS.md#composition-files-only-reference-carriers` | hand-map B2 |
| data/species/starters.ts:11 | comment | `species-locked.md` | `spec/progression.md#starter-species-are-stubs` | hand-map B4 |
| data/species/starters.ts:18 | comment | `GAME_DESIGN` | `spec/creatures.md#core-stats` | hand-map B3 |
| data/species/starters.ts:19 | comment | `species-locked.md` | `spec/progression.md#starter-species-are-stubs` | hand-map B4 |
| data/species/starters.ts:22 | comment | `species-locked.md` | `spec/progression.md#starter-species-are-stubs` | hand-map B4 |
| data/species/starters.ts:41 | comment | `species-locked.md` | `specializations/sorcerer.md#starter-glyphmoth-seer` | hand-map B4 |
| data/species/starters.ts:48 | comment | `species-locked.md` | `spec/progression.md#starter-species-are-stubs` | hand-map B4 |
| data/species/starters.ts:106 | comment | `species-locked.md` | `content/overgrowth.md#unicorn-lightbearer` | hand-map B4 |
| data/spells/core.ts:27 | comment | `GAME_DESIGN.md §7` | `content/overgrowth.md#spell-power-convention` | hand-map B1 |
| data/spells/core.ts:45 | comment | `CONVENTIONS' "Spell gains an optional status-application."` | `spec/combat.md#spells-carry-responses` | hand-map B2 |
| data/spells/glimmerdark.ts:19 | comment | `GAME_DESIGN §4` | `spec/run.md#spells-unlock-cumulatively` | hand-map B1 |
| data/spells/glimmerdark.ts:28 | comment | `species-locked.md's` | `spec/run.md#the-onboarding-ramp` | hand-map B4 |
| data/spells/glimmerdark.ts:57 | comment | `CONVENTIONS' "statuses are shared primitives"` | `spec/statuses.md#a-status-is-a-timed-effect` | hand-map B2 |
| data/spells/glimmerdark.ts:58 | comment | `species-locked.md's` | `spec/run.md#the-onboarding-ramp` | hand-map B4 |
| data/spells/index.test.ts:129 | comment | `CONVENTIONS` | `CONVENTIONS.md#combat-is-reproducible-from-its-inputs` | hand-map B3 |
| data/spells/index.ts:37 | comment | `CONVENTIONS "Data layer — carriers vs. composition"` | `CONVENTIONS.md#effect-carriers-live-in-libraries` | hand-map B2 |
| data/spells/rotcap-hollow.ts:4 | comment | `GAME_DESIGN §4` | `spec/run.md#spells-unlock-cumulatively` | hand-map B1 |
| data/spells/rotcap-hollow.ts:10 | comment | `species-locked.md` | `spec/run.md#the-onboarding-ramp` | hand-map B4 |
| data/statuses.ts:105 | comment | `GAME_DESIGN` | `spec/statuses.md#no-stacking` | hand-map B2 |
| data/statuses.ts:128 | comment | `species-locked.md` | `content/glimmerdark.md#grant-act-first` | hand-map B4 |
| data/statuses.ts:170 | comment | `species-locked.md` | `content/glimmerdark.md#grant-act-first` | hand-map B4 |
| data/statuses.ts:189 | comment | `GAME_DESIGN §4` | `spec/run.md#biomes` | hand-map B1 |
| data/statuses.ts:232 | comment | `species-locked.md's` | `content/rotcap-hollow.md#confusion` | hand-map B4 |
| data/traits/core.test.ts:34 | comment | `CONVENTIONS` | `CONVENTIONS.md#effect-carriers-live-in-libraries` | hand-map B3 |
| data/traits/glimmerdark.ts:9 | comment | `species-locked.md` | `content/glimmerdark.md#resonants-wit-caster-synergy` | hand-map B4 |
| data/traits/glimmerdark.ts:125 | comment | `species-locked.md` | `content/glimmerdark.md#blindclaws-striker` | hand-map B4 |
| data/traits/glimmerdark.ts:132 | comment | `species-locked.md's` | `content/glimmerdark.md#blindclaws-striker` | hand-map B4 |
| data/traits/glimmerdark.ts:168 | comment | `species-locked.md` | `content/glimmerdark.md#resonants-wit-caster-synergy` | hand-map B4 |
| data/traits/glimmerdark.ts:172 | comment | `CONVENTIONS` | `spec/effects.md#action-reactions-actor-self-hooks-or-observation` | hand-map B3 |
| data/traits/glimmerdark.ts:216 | comment | `species-locked.md's` | `content/glimmerdark.md#resonant-overtone` | hand-map B4 |
| data/traits/glimmerdark.ts:247 | comment | `species-locked.md` | `content/glimmerdark.md#sparkeaters-violenceendurancevitality-stat-parasites` | hand-map B4 |
| data/traits/glimmerdark.ts:248 | comment | `species-locked.md` | `content/glimmerdark.md#sparkeaters-violenceendurancevitality-stat-parasites` | hand-map B4 |
| data/traits/glimmerdark.ts:256 | comment | `species-locked.md's` | `content/glimmerdark.md#sparkeater-leech` | hand-map B4 |
| data/traits/glimmerdark.ts:349 | comment | `species-locked.md's` | `content/glimmerdark.md#gloomjaws-violence-execute-the-weak` | hand-map B4 |
| data/traits/glimmerdark.ts:428 | comment | `species-locked.md's` | `content/glimmerdark.md#shellback-brawler` | hand-map B4 |
| data/traits/glimmerdark.ts:440 | comment | `CONVENTIONS'` | `spec/responses.md#flat-mode` | hand-map B3 |
| data/traits/glimmerdark.ts:460 | comment | `species-locked.md` | `content/glimmerdark.md#leech-sovereign` | hand-map B4 |
| data/traits/index.ts:85 | comment | `CONVENTIONS "Data layer — carriers vs. composition"` | `CONVENTIONS.md#effect-carriers-live-in-libraries` | hand-map B2 |
| data/traits/overgrowth.ts:70 | comment | `species-locked.md` | `content/overgrowth.md#swarmhive-drone` | hand-map B4 |
| data/traits/overgrowth.ts:92 | comment | `CONVENTIONS'` | `spec/effects.md#count-scaling` | hand-map B3 |
| data/traits/overgrowth.ts:271 | comment | `species-locked.md` | `content/overgrowth.md#snapjaw-jaws` | hand-map B4 |
| data/traits/overgrowth.ts:313 | comment | `species-locked.md` | `content/overgrowth.md#lullpollen-sleeper` | hand-map B4 |
| data/traits/rotcap-hollow.ts:12 | comment | `species-locked.md's` | `content/rotcap-hollow.md#myconet-endurancewit-death-network` | hand-map B4 |
| data/traits/rotcap-hollow.ts:214 | comment | `species-locked.md` | `content/rotcap-hollow.md#necromoss-witvitality-reclaim` | hand-map B4 |
| data/traits/rotcap-hollow.ts:344 | comment | `species-locked.md's` | `content/rotcap-hollow.md#sporch-violencewit-strong-non-spreading-burn` | hand-map B4 |
| data/traits/rotcap-hollow.ts:362 | comment | `species-locked.md` | `content/rotcap-hollow.md#sporch-ashborn` | hand-map B4 |
| data/traits/rotcap-hollow.ts:400 | comment | `species-locked.md` | `content/rotcap-hollow.md#rot-sovereign` | hand-map B4 |
| data/traits/starters.ts:10 | comment | `species-locked.md` | `specializations/sorcerer.md#starter-glyphmoth-seer` | hand-map B4 |
| data/traits/starters.ts:56 | comment | `species-locked.md's` | `specializations/shieldbarer.md#starter-stonehorn-warden` | hand-map B4 |
| data/traits/starters.ts:78 | comment | `species-locked.md` | `content/overgrowth.md#unicorn-lightbearer` | hand-map B4 |
| engine/__corpus__/corpus-digest.fixture.ts:3 | comment | `CONVENTIONS "Testing"` | `CONVENTIONS.md#corpus-digest` | plan-review fix 1 (was CONVENTIONS.md#testing; inventory row C:1918) |
| engine/__corpus__/corpus.ts:7 | comment | `CONVENTIONS' "engine purity"` | `CONVENTIONS.md#the-engine-is-pure-and-deterministic` | plan-review fix 1 (was CONVENTIONS.md#engine-purity; inventory row C:16) |
| engine/__fixtures__/biomes.ts:151 | comment | `CONVENTIONS "Boss floors"` | `spec/run.md#boss-floor-generation` | inventory row C:84 |
| engine/__golden__/golden-6v6-scripted.fixture.ts:9 | comment | `CONVENTIONS'` | `CONVENTIONS.md#two-tier-golden-discipline` | hand-map B3 |
| engine/__golden__/golden-action-observed.fixture.ts:6 | comment | `CONVENTIONS` | `spec/effects.md#action-reactions-actor-self-hooks-or-observation` | hand-map B3 |
| engine/__golden__/golden-blindclaws-striker.fixture.ts:1 | comment | `species-locked.md` | `content/glimmerdark.md#blindclaws-instinct-ambush-via-turn-order` | hand-map B4 |
| engine/__golden__/golden-broodmother.fixture.ts:1 | comment | `species-locked.md's` | `content/overgrowth.md#broodmother` | hand-map B4 |
| engine/__golden__/golden-brute-starter.fixture.ts:2 | comment | `species-locked.md` | `specializations/brute.md#starter-cragfang-mauler` | hand-map B4 |
| engine/__golden__/golden-brute-starter.fixture.ts:11 | comment | ``.claude/species/species-locked.md`` | `specializations/brute.md#starter-cragfang-mauler` | hand-map B4 |
| engine/__golden__/golden-defend-count-additive-cap.fixture.ts:11 | comment | `CONVENTIONS'` | `CONVENTIONS.md#golden-replay-tests` | hand-map B3 |
| engine/__golden__/golden-defend-count.fixture.ts:14 | comment | `CONVENTIONS` | `spec/effects.md#taken-reduction-accumulation` | hand-map B3 |
| engine/__golden__/golden-dot.fixture.ts:15 | comment | `GAME_DESIGN` | `spec/combat.md#fight-setup` | hand-map B3 |
| engine/__golden__/golden-dot.fixture.ts:171 | comment | `GAME_DESIGN` | `spec/combat.md#fight-setup` | hand-map B3 |
| engine/__golden__/golden-f2-stun-one-turn.fixture.ts:2 | comment | `CONVENTIONS "Status lifecycle"` | `spec/statuses.md#timing` | inventory row C:1610 |
| engine/__golden__/golden-f2-weaken-three-turns.fixture.ts:2 | comment | `CONVENTIONS "Status lifecycle"` | `spec/statuses.md#timing` | inventory row C:1610 |
| engine/__golden__/golden-g1-leech-sovereign-pacified.fixture.ts:2 | comment | `CONVENTIONS "Role scripts"` | `spec/scripting.md#role-scripts` | hand-map B2 |
| engine/__golden__/golden-gloomjaw-ravager.fixture.ts:15 | comment | `CONVENTIONS` | `spec/combat.md#armor-penetration` | hand-map B3 |
| engine/__golden__/golden-gloomjaw-stalker.fixture.ts:1 | comment | `species-locked.md` | `content/glimmerdark.md#gloomjaws-violence-execute-the-weak` | hand-map B4 |
| engine/__golden__/golden-h2b1-observed-lethal.fixture.ts:2 | comment | `CONVENTIONS "Hook execution model"` | `spec/effects.md#hook-execution` | inventory row C:1402 |
| engine/__golden__/golden-h2b2-tick-no-retaliation.fixture.ts:2 | comment | `CONVENTIONS` | `spec/responses.md#triggering-source-is-never-the-firing-creature` | hand-map B3 |
| engine/__golden__/golden-heal-scaling-count.fixture.ts:8 | comment | `CONVENTIONS "duplicate/dead slots"` | `spec/combat.md#turn-queue` | hand-map B2 |
| engine/__golden__/golden-hollowkin-wretch.fixture.ts:1 | comment | `species-locked.md's` | `content/rotcap-hollow.md#hollowkin-wretch` | hand-map B4 |
| engine/__golden__/golden-leech-sovereign.fixture.ts:1 | comment | `species-locked.md` | `content/glimmerdark.md#leech-sovereign` | hand-map B4 |
| engine/__golden__/golden-necromoss-reclaim.fixture.ts:1 | comment | `species-locked.md's` | `content/rotcap-hollow.md#necromoss-wisp` | hand-map B4 |
| engine/__golden__/golden-overgrowth-web-exploit.fixture.ts:1 | comment | `species-locked.md` | `content/overgrowth.md#spiders-wit-trap--exploit` | hand-map B4 |
| engine/__golden__/golden-resonant-harmonize.fixture.ts:1 | comment | `species-locked.md` | `content/glimmerdark.md#resonants-wit-caster-synergy` | hand-map B4 |
| engine/__golden__/golden-revive.fixture.ts:3 | comment | `CONVENTIONS'` | `spec/responses.md#revive` | hand-map B3 |
| engine/__golden__/golden-rot-sovereign.fixture.ts:1 | comment | `species-locked.md's` | `content/rotcap-hollow.md#rot-sovereign` | hand-map B4 |
| engine/__golden__/golden-shieldbarer-starter.fixture.ts:9 | comment | `CONVENTIONS'` | `CONVENTIONS.md#golden-replay-tests` | hand-map B3 |
| engine/__golden__/golden-spore-spread-fizzle.fixture.ts:2 | comment | `species-locked.md's` | `content/rotcap-hollow.md#spore` | hand-map B4 |
| engine/__golden__/golden-spore-spread.fixture.ts:1 | comment | `species-locked.md` | `content/rotcap-hollow.md#sporecloud-seeder` | hand-map B4 |
| engine/__golden__/golden-spore-spread.fixture.ts:21 | comment | `CONVENTIONS` | `spec/effects.md#hook-execution` | hand-map B3 |
| engine/__golden__/golden-sporecloud-reaper-no-spore.fixture.ts:14 | comment | `CONVENTIONS` | `spec/effects.md#hook-execution` | hand-map B3 |
| engine/actions.ts:334 | comment | `GAME_DESIGN §7` | `spec/combat.md#targeting-override` | hand-map B1 |
| engine/actions.ts:383 | comment | `CONVENTIONS "Every action source obeys the same rules"` | `spec/combat.md#every-action-source-obeys-the-same-rules` | inventory row C:1082 |
| engine/actions.ts:390 | comment | `GAME_DESIGN §7` | `spec/combat.md#provoke` | hand-map B1 |
| engine/actions.ts:411 | comment | `CONVENTIONS' "action instance-list"` | `spec/combat.md#action-instance-list` | inventory row C:187 |
| engine/actions.ts:471 | comment | `CONVENTIONS "An action ends when its actor dies"` | `spec/combat.md#an-action-ends-when-its-actor-dies` | inventory row C:1113 |
| engine/actions.ts:509 | comment | `CONVENTIONS'` | `spec/effects.md#action-reactions-actor-self-hooks-or-observation` | hand-map B3 |
| engine/actions.ts:513 | comment | `CONVENTIONS` | `spec/combat.md#a-target-killed-by-its-pre-hit-hooks-fizzles` | hand-map B3 |
| engine/actions.ts:633 | comment | `CONVENTIONS'` | `spec/effects.md#action-reactions-actor-self-hooks-or-observation` | hand-map B3 |
| engine/actions.ts:666 | comment | `CONVENTIONS` | `spec/combat.md#targeting-override` | hand-map B3 |
| engine/actions.ts:668 | comment | `GAME_DESIGN §7` | `spec/combat.md#provoke` | hand-map B1 |
| engine/actor-death.test.ts:1 | comment | `CONVENTIONS` | `spec/combat.md#an-action-ends-when-its-actor-dies` | hand-map B3 |
| engine/actor-death.test.ts:123 | title | `CONVENTIONS` | `spec/combat.md#an-action-ends-when-its-actor-dies` | hand-map B3 |
| engine/balance-types.ts:2 | comment | `CONVENTIONS` | `CONVENTIONS.md#where-each-number-lives` | hand-map B3 |
| engine/balance-types.ts:49 | comment | `GAME_DESIGN §5` | `spec/creatures.md#levels-and-xp` | hand-map B1 |
| engine/balance-types.ts:66 | comment | `GAME_DESIGN §9` | `spec/creatures.md#souls` | hand-map B1 |
| engine/combat.ts:160 | comment | `CONVENTIONS "Status lifecycle"` | `spec/statuses.md#turn-end-cleanup` | hand-map B2 |
| engine/combat.ts:367 | comment | `CONVENTIONS' "explicit boundary even for no-op turns"` | `spec/combat.md#turn-structure` | hand-map B2 |
| engine/combat.ts:385 | comment | `CONVENTIONS "Action locks"` | `spec/statuses.md#action-locks` | inventory row C:555 |
| engine/combat.ts:410 | comment | `CONVENTIONS'` | `spec/combat.md#turn-structure` | hand-map B3 |
| engine/combat.ts:500 | comment | `CONVENTIONS' "Turn structure"` | `spec/combat.md#turn-structure` | hand-map B2 |
| engine/config.ts:2 | comment | `GAME_DESIGN §13` | `OPEN_QUESTIONS.md#fight-length` | plan-review fix 1 (was OPEN_QUESTIONS.md#balance-numbers; hand-map B1) |
| engine/corpus-digest.test.ts:2 | comment | `CONVENTIONS "Testing"` | `CONVENTIONS.md#corpus-digest` | plan-review fix 1 (was CONVENTIONS.md#testing; inventory row C:1918) |
| engine/corpus-digest.test.ts:54 | template | `CONVENTIONS "Testing"` | `CONVENTIONS.md#corpus-digest` | plan-review fix 1 (was CONVENTIONS.md#testing; inventory row C:1918) |
| engine/curves.ts:3 | comment | `GAME_DESIGN §13` | `OPEN_QUESTIONS.md#balance-numbers` | hand-map B1 |
| engine/curves.ts:48 | comment | `CONVENTIONS "Generation & the run layer"` | `spec/run.md#fights-per-floor` | hand-map B2 |
| engine/damage-observation.test.ts:458 | title | `CONVENTIONS "Hook execution model"` | `spec/effects.md#hook-execution` | inventory row C:1402 |
| engine/effect-types.ts:1 | comment | `GAME_DESIGN §6` | `spec/effects.md#one-effect-framework` | hand-map B1 |
| engine/effect-types.ts:1 (#2) | comment | `CONVENTIONS` | `spec/effects.md#one-effect-framework` | hand-map B3 |
| engine/effect-types.ts:23 | comment | `CONVENTIONS'` | `spec/effects.md#hooks` | hand-map B3 |
| engine/effect-types.ts:26 | comment | `CONVENTIONS` | `spec/effects.md#action-reactions-actor-self-hooks-or-observation` | hand-map B3 |
| engine/effect-types.ts:83 | comment | `CONVENTIONS "count-scaling"` | `spec/effects.md#count-scaling` | inventory row C:435 |
| engine/effect-types.ts:98 | comment | `CONVENTIONS` | `spec/effects.md#count-scaling` | hand-map B3 |
| engine/effect-types.ts:105 | comment | `CONVENTIONS` | `spec/effects.md#count-scaling` | hand-map B3 |
| engine/effect-types.ts:277 | comment | `CONVENTIONS' "hold the line"` | `spec/responses.md#no-side-doors` | inventory row C:257 |
| engine/effect-types.ts:327 | comment | `CONVENTIONS'` | `spec/effects.md#count-scaling` | hand-map B3 |
| engine/effect-types.ts:329 | comment | `species-locked.md's` | `content/overgrowth.md#swarmhive-striker` | hand-map B4 |
| engine/effect-types.ts:369 | comment | `CONVENTIONS "Damage observation"` | `spec/effects.md#damage-observation` | inventory row C:1476 |
| engine/effect-types.ts:406 | comment | `CONVENTIONS "One action pipeline"` | `spec/combat.md#one-action-pipeline` | inventory row C:1029 |
| engine/effect-types.ts:481 | comment | `CONVENTIONS "The bright line"` | `spec/effects.md#no-temporary-stat-modifier` | hand-map B2 |
| engine/effect-types.ts:588 | comment | `CONVENTIONS` | `spec/responses.md#perform-action` | hand-map B3 |
| engine/effect-types.ts:651 | comment | `CONVENTIONS'` | `spec/combat.md#action-instance-list` | hand-map B3 |
| engine/effect-types.ts:743 | comment | `CONVENTIONS' "immunity suppresses the effect, not the application"` | `spec/statuses.md#immunity-suppresses-the-effect-not-the-application` | inventory row C:659 |
| engine/effect-types.ts:783 | comment | `CONVENTIONS'` | `spec/effects.md#splashing-and-annihilate` | hand-map B3 |
| engine/effect-types.ts:849 | comment | `CONVENTIONS "Action locks"` | `spec/statuses.md#action-locks` | inventory row C:555 |
| engine/effects.ts:149 | comment | `CONVENTIONS "Immunity"` | `spec/effects.md#immunity` | hand-map B2 |
| engine/effects.ts:279 | comment | `CONVENTIONS' "Taken-reduction accumulation"` | `spec/effects.md#taken-reduction-accumulation` | inventory row C:446 |
| engine/effects.ts:465 | comment | `CONVENTIONS "Action locks"` | `spec/statuses.md#action-locks` | inventory row C:555 |
| engine/effects.ts:496 | comment | `CONVENTIONS'` | `spec/effects.md#count-scaling` | hand-map B3 |
| engine/effects.ts:545 | comment | `CONVENTIONS` | `spec/effects.md#count-scaling` | hand-map B3 |
| engine/environment.test.ts:4 | comment | `CONVENTIONS` | `CONVENTIONS.md#test-environments` | hand-map B3 |
| engine/generation.ts:1 | comment | `CONVENTIONS "Generation & the run layer"` | `spec/run.md#generation-is-a-pure-seeded-module` | inventory row C:40 |
| engine/generation.ts:2 | comment | `CONVENTIONS` | `spec/run.md#generation-is-a-pure-seeded-module` | hand-map B3 |
| engine/generation.ts:38 | comment | `GAME_DESIGN §5` | `spec/run.md#enemy-script-and-gem-set` | hand-map B1 |
| engine/generation.ts:58 | comment | `CONVENTIONS "Boss floors"` | `spec/run.md#boss-floor-generation` | inventory row C:84 |
| engine/generation.ts:79 | comment | `CONVENTIONS "Spell affinity & equip-gating"` | `spec/creatures.md#spell-affinity-gate` | inventory row C:1752 |
| engine/generation.ts:89 | comment | `GAME_DESIGN §4` | `spec/run.md#biomes` | hand-map B1 |
| engine/generation.ts:92 | comment | `GAME_DESIGN §4` | `spec/run.md#biomes` | hand-map B1 |
| engine/generation.ts:98 | comment | `CONVENTIONS "Boss floors"` | `spec/run.md#boss-floor-generation` | inventory row C:84 |
| engine/generation.ts:264 | comment | `CONVENTIONS "Role scripts"` | `spec/scripting.md#role-scripts` | hand-map B2 |
| engine/generation.ts:396 | comment | `CONVENTIONS` | `spec/run.md#floor-runs` | hand-map B3 |
| engine/generation.ts:400 | comment | `CONVENTIONS' "biomeForFloor's fixed 1-100 sequence is positional"` | `spec/run.md#biomeforfloor` | hand-map B2 |
| engine/leveling.test.ts:12 | comment | `GAME_DESIGN §5` | `spec/creatures.md#levels-and-xp` | hand-map B1 |
| engine/leveling.ts:2 | comment | `GAME_DESIGN §5` | `spec/creatures.md#levels-and-xp` | hand-map B1 |
| engine/leveling.ts:2 (#2) | comment | `CONVENTIONS "Stat growth is linear and derived from base stats."` | `spec/creatures.md#levels-and-xp` | hand-map B2 |
| engine/leveling.ts:26 | comment | `GAME_DESIGN §5` | `spec/creatures.md#levels-and-xp` | hand-map B1 |
| engine/resolution-types.ts:97 | comment | `CONVENTIONS` | `spec/responses.md#perform-action` | hand-map B3 |
| engine/resolution.ts:438 | comment | `CONVENTIONS "Damage observation"` | `spec/effects.md#damage-observation` | inventory row C:1476 |
| engine/resolution.ts:1043 | comment | `CONVENTIONS` | `spec/combat.md#the-stat-a-spells-magnitude-scales-off` | hand-map B3 |
| engine/resolution.ts:1226 | comment | `CONVENTIONS "DoT and Regen from the applier's snapshot"` | `spec/statuses.md#the-applier-snapshot` | inventory row C:349 |
| engine/rng.ts:2 | comment | `CONVENTIONS.md` | `CONVENTIONS.md#the-engine-is-pure-and-deterministic` | hand-map B3 |
| engine/rng.ts:6 | comment | `CONVENTIONS` | `CONVENTIONS.md#combat-is-reproducible-from-its-inputs` | hand-map B3 |
| engine/scripting-types.ts:57 | comment | `GAME_DESIGN §8` | `spec/scripting.md#conditions` | hand-map B1 |
| engine/scripting-types.ts:105 | comment | `GAME_DESIGN §8` | `spec/scripting.md#target-selectors` | hand-map B1 |
| engine/status-snapshot.test.ts:2 | comment | `CONVENTIONS "DoT and Regen from the applier's snapshot"` | `spec/statuses.md#the-applier-snapshot` | inventory row C:349 |
| engine/support-spells.test.ts:73 | comment | `GAME_DESIGN §7` | `spec/combat.md#provoke` | hand-map B1 |
| engine/targeting.ts:107 | comment | `species-locked.md's` | `content/rotcap-hollow.md#confusion` | hand-map B4 |
| engine/test-utils/golden-runner.ts:1 | comment | `CONVENTIONS "Every golden replays through one shared runner"` | `CONVENTIONS.md#every-golden-replays-through-one-shared-runner` | inventory row C:2047 |
| engine/turn-order.test.ts:61 | comment | `species-locked.md` | `content/glimmerdark.md#grant-act-first` | hand-map B4 |
| engine/types.ts:28 | comment | `CONVENTIONS "Spells carry responses"` | `spec/combat.md#spells-carry-responses` | hand-map B2 |
| engine/types.ts:34 | comment | `CONVENTIONS "Spell affinity & equip-gating"` | `spec/creatures.md#spell-affinity-gate` | inventory row C:1752 |
| engine/types.ts:38 | comment | `GAME_DESIGN's` | `spec/run.md#biomes` | hand-map B2 |
| engine/types.ts:47 | comment | `GAME_DESIGN §7` | `spec/combat.md#targeting-override` | hand-map B1 |
| state/integration.test.ts:3 | comment | `CONVENTIONS'` | `CONVENTIONS.md#two-tier-golden-discipline` | hand-map B3 |
| state/integration.test.ts:35 | comment | `CONVENTIONS "Boss floors"` | `spec/run.md#boss-floor-generation` | inventory row C:84 |
| state/integration.test.ts:182 | comment | `species-locked.md` | `content/overgrowth.md#unicorn-lightbearer` | hand-map B4 |
| state/integration.test.ts:192 | comment | `CONVENTIONS` | `spec/responses.md#fizzles` | hand-map B3 |
| state/integration.test.ts:326 | comment | `CONVENTIONS` | `spec/run.md#rewards` | hand-map B3 |
| state/integration.test.ts:330 | comment | `GAME_DESIGN §9` | `spec/progression.md#perk-points` | hand-map B1 |
| state/integration.test.ts:397 | comment | `CONVENTIONS'` | `spec/run.md#fights-per-floor` | hand-map B3 |
| state/integration.test.ts:399 | comment | `CONVENTIONS` | `spec/run.md#a-descent-is-atomic` | hand-map B3 |
| state/rewards.ts:59 | comment | `CONVENTIONS "XP goes to the whole active party regardless of survival"` | `spec/run.md#rewards` | hand-map B2 |
| state/rewards.ts:61 | comment | `CONVENTIONS` | `spec/run.md#rewards` | hand-map B2 |
| state/rewards.ts:79 | comment | `GAME_DESIGN §4/§10` | `spec/run.md#currencies` | hand-map B1 |
| state/rewards.ts:102 | comment | `GAME_DESIGN §7` | `spec/combat.md#encounters-rewards--wipes` | hand-map B1 |
| state/rewards.ts:103 | comment | `CONVENTIONS` | `spec/run.md#rewards` | hand-map B3 |
| state/rewards.ts:104 | comment | `GAME_DESIGN §4` | `spec/run.md#currencies` | hand-map B1 |
| state/rewards.ts:108 | comment | `GAME_DESIGN §13` | `OPEN_QUESTIONS.md#drops-and-costs` | hand-map B1 |
| state/rewards.ts:118 | comment | `GAME_DESIGN §4` | `spec/run.md#currencies` | hand-map B1 |
| state/rewards.ts:124 | comment | `GAME_DESIGN §9` | `spec/progression.md#perk-points` | hand-map B1 |
| state/store.test.ts:1057 | comment | `CONVENTIONS` | `spec/run.md#rewards` | hand-map B3 |
| state/store.ts:1 | comment | `CONVENTIONS "Generation & the run layer"` | `spec/run.md#generation-is-a-pure-seeded-module` | inventory row C:40 |
| state/store.ts:161 | comment | `CONVENTIONS` | `spec/combat.md#resolution--timing` | hand-map B2 |
| state/store.ts:181 | comment | `CONVENTIONS "State & persistence"` | `spec/store.md#how-store-actions-fail` | hand-map B2 |
| state/store.ts:216 | comment | `CONVENTIONS "Specializations"` | `spec/progression.md#specializations` | hand-map B2 |
| state/store.ts:254 | comment | `GAME_DESIGN` | `spec/progression.md#perk-points` | hand-map B1 |
| state/store.ts:258 | comment | `CONVENTIONS'` | `spec/run.md#facilities` | hand-map B3 |
| state/store.ts:459 | comment | `GAME_DESIGN §9` | `spec/progression.md#perk-points` | hand-map B1 |
| state/store.ts:741 | comment | `CONVENTIONS'` | `spec/run.md#biomeforfloor` | hand-map B3 |
| state/store.ts:764 | comment | `CONVENTIONS` | `spec/run.md#rewards-are-a-run-layer-consumer-of-the-event-log` | hand-map B3 |
| state/store.ts:786 | comment | `CONVENTIONS` | `spec/run.md#rewards` | hand-map B2 |
| state/store.ts:793 | comment | `CONVENTIONS'` | `spec/run.md#rewards` | hand-map B3 |

## Hand-edits after the script (src/)

Wrapped labels whose second half sat in a separate `//` comment, so the script replaced the name and left the label's tail
(the span cannot cross two comment ranges). Removed by hand, anchor kept: `data/specializations.ts:1`,
`data/species/glimmerdark.ts:18`, `data/species/rotcap-hollow.ts:27`, `data/spells/index.test.ts:129`,
`data/traits/core.test.ts:34`, `engine/balance-types.ts:2`, `engine/combat.ts:410`, `engine/effect-types.ts:1` (a doubled anchor
too), `engine/effect-types.ts:651`, `engine/environment.test.ts:4`, `engine/__golden__/golden-h2b2-tick-no-retaliation.fixture.ts:2`,
`engine/leveling.ts:2` (a doubled anchor), `state/integration.test.ts:3`, `state/store.ts:741`, `state/store.ts:764`.
`engine/__golden__/golden-brute-starter.fixture.ts:11-12` named `.claude/specializations/brute.md` with a quotation next to the
species-locked one; the pair is now one citation. `eslint.config.js:28` (plan-review fix 8): bare `(CONVENTIONS)` became
`CONVENTIONS.md#the-engine-is-pure-and-deterministic`.

## The brief's line list against the Appendix (plan-review fix 9)

| Brief line | Appendix row that answers it |
| --- | --- |
| `engine/combat.ts:160` | combat.ts:160 (B2, `spec/statuses.md#turn-end-cleanup`) |
| `engine/combat.ts:366` | combat.ts:367 (B2, `spec/combat.md#turn-structure`) |
| `engine/combat.ts:385`, `:410`, `:500` | combat.ts:385 (A), :410 (B3), :500 (B2) |
| `engine/actions.ts` header | none: the header (lines 1-30) holds no old citation |
| `engine/actions.ts:346` | none at :346; the nearest rows are :334 (B1) and :383 (A) |
| `engine/actions.ts:373-376` | actions.ts:383 (A, `spec/combat.md#every-action-source-obeys-the-same-rules`) |
| `engine/actions.ts:397` | actions.ts:390 (B1, `spec/combat.md#provoke`) |
| `engine/actions.ts:334`, `:390`, `:668` | the same three rows (B1) |
| `engine/types.ts:33` | types.ts:34 (A, `spec/creatures.md#spell-affinity-gate`) |
| `engine/types.ts:44-47` | types.ts:47 (B1, `spec/combat.md#targeting-override`) |
