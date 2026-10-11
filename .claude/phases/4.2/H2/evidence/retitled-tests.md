# Retitled tests (4.2-H2)

Every changed `describe`/`it`/`test` title part under `src/` (old -> new), taken from the base and the branch by position.
Each (file, old text) is one entry of `mask.json`. A title that differs only inside a `${}` template is listed per literal part.

Duplicate full test names (excess copies, by `scanSource`'s `fullName`): main 0 in 0 files, branch 0 in 0 files, so no new duplicate.
`comment-proof` also fails a new duplicate; it passes.

Outside the proof (`scripts/` is out of its scope, so no mask entry):

| scripts/docs-check/ci.test.ts:19 | the test job runs citations and budgets | the test job runs citations, budgets and comments |

| file:line | old | new |
| --- | --- | --- |
| src/app/demoFight.test.ts:16 | demo fight (Phase 3.5 presence smoke test) | demo fight (presence smoke test) |
| src/data/biomes.test.ts:26 | BIOMES (Slice A shape + Slice H1/H2/H3 real content) | BIOMES (the shape and the real biomes 1-3) |
| src/data/biomes.test.ts:54 | slots 4-10 keep the Slice A placeholder shape (empty spawn pools) | slots 4-10 keep the placeholder shape (empty spawn pools) |
| src/data/biomes.test.ts:67 | Boss floors (Phase 4 Slice I, PR #65 review) | Boss floors |
| src/data/biomes.test.ts:92 | generateFloor(10, OVERGROWTH_BIOME, ...): the boss and her two spiderling adds carry SPIDERS_SPECIES_ID, and the three fill creatures do not (4.1-G1) | generateFloor(10, OVERGROWTH_BIOME, ...): the boss and her two spiderling adds carry SPIDERS_SPECIES_ID, and the three fill creatures do not |
| src/data/biomes.test.ts:118 | every shipped boss floor is a full side (Phase 4.1-G1) | every shipped boss floor is a full side |
| src/data/perform-action.data.test.ts:18 | perform-action guard lint (4.1-E) | perform-action guard lint |
| src/data/roles.test.ts:106 | creature roles (Phase 4.1-G1) | creature roles |
| src/data/roles.test.ts:154 | spell pools back every role (Phase 4.1-G1, D4) | spell pools back every role |
| src/data/scripts.test.ts:310 | taunter behaves exactly as always-provoke did (ASSUMPTION 68) | taunter behaves exactly as always-provoke did |
| src/data/specializations.test.ts:68 | Known-inert perks (Phase 4.1-G2, G4) | Known-inert perks |
| src/data/species/glimmerdark.test.ts:36 | every species declares a positive draw weight (ASSUMPTION 5) | every species declares a positive draw weight |
| src/data/species/glimmerdark.test.ts:57 | base stats fall within spec/creatures.md#core-stats ranges: Health 20-45 (4.1-H2c, ASSUMPTION 125), 10-30 for every other stat | base stats fall within spec/creatures.md#core-stats ranges: Health 20-45, 10-30 for every other stat |
| src/data/species/glimmerdark.test.ts:70 | the Flickerlings take the old first slot (pool index 0), in rarity order, with the content doc Health and scripts (4.1-H2b1) | the Flickerlings take the first slot (pool index 0), in rarity order, with the content doc Health and scripts |
| src/data/species/glimmerdark.test.ts:89 | the affinity spread is 4 Wit / 3 Instinct / 5 Violence / 4 Endurance / 2 Vitality (4.1-H2b1) | the affinity spread is 4 Wit / 3 Instinct / 5 Violence / 4 Endurance / 2 Vitality |
| src/data/species/glimmerdark.test.ts:108 | the cast-role creatures (caster / support / opener, 4.1-G1) are exactly the roles table ones, and each has an affinity-matched spell | the cast-role creatures (caster / support / opener) are exactly the roles table ones, and each has an affinity-matched spell |
| src/data/species/names.test.ts:21 | every real SpeciesCreature has a name (Phase 4.1-A, G3) | every real SpeciesCreature has a name |
| src/data/species/overgrowth.test.ts:37 | every species declares a positive draw weight (ASSUMPTION 5) | every species declares a positive draw weight |
| src/data/species/overgrowth.test.ts:52 | base stats fall within spec/creatures.md#core-stats ranges: Health 20-45 (4.1-H2c, ASSUMPTION 125), 10-30 for every other stat | base stats fall within spec/creatures.md#core-stats ranges: Health 20-45, 10-30 for every other stat |
| src/data/species/overgrowth.test.ts:72 | the cast-role creatures (caster / support / opener, 4.1-G1) are exactly the roles table ones, and each has an affinity-matched spell | the cast-role creatures (caster / support / opener) are exactly the roles table ones, and each has an affinity-matched spell |
| src/data/species/overgrowth.test.ts:125 | her adds are real Spider-roster members (content/overgrowth.md#broodmother: "adds: spiderlings") | her adds are real Spider-roster members |
| src/data/species/rotcap-hollow.test.ts:37 | every species declares a positive draw weight (ASSUMPTION 5) | every species declares a positive draw weight |
| src/data/species/rotcap-hollow.test.ts:58 | base stats fall within spec/creatures.md#core-stats ranges: Health 20-45 (4.1-H2c, ASSUMPTION 125), 10-30 for every other stat | base stats fall within spec/creatures.md#core-stats ranges: Health 20-45, 10-30 for every other stat |
| src/data/species/rotcap-hollow.test.ts:78 | the cast-role creatures (caster / support / opener, 4.1-G1) are exactly the roles table ones, and each has an affinity-matched spell | the cast-role creatures (caster / support / opener) are exactly the roles table ones, and each has an affinity-matched spell |
| src/data/species/starters.test.ts:39 | base stats fall within spec/creatures.md#core-stats ranges: Health 20-45 (4.1-H2c, ASSUMPTION 125), 10-30 for every other stat | base stats fall within spec/creatures.md#core-stats ranges: Health 20-45, 10-30 for every other stat |
| src/data/species/starters.test.ts:69 | Stonehorn Warden starter (Phase 4.1-H2c, ASSUMPTIONS 123, 125) | Stonehorn Warden starter |
| src/data/species/starters.test.ts:70 | has Attack 15 and Health 39 (the remap of 25), the rest unchanged | has Attack 15 and Health 39, the other stats as authored |
| src/data/species/starters.test.ts:85 | Sorcerer starter loadout (Phase 4.1-B, A8) | Sorcerer starter loadout |
| src/data/species/starters.test.ts:90 | SpeciesCreature carries no equippedSpells field -- the fixed loadout is deleted | SpeciesCreature carries no equippedSpells field |
| src/data/species/starters.test.ts:104 | createCombat prepends Arcane Surge's innate spell, giving the Seer [Bolt, null, null, null] -- byte-identical to the old fixed loadout | createCombat prepends Arcane Surge's innate spell, giving the Seer [Bolt, null, null, null] |
| src/data/species/starters.test.ts:167 | Sorcerer starter: a 50% on-turn-end perform-action(self, random cast) + an innate Arcane Bolt (4.1-B A8, 4.1-E A2) | Sorcerer starter: a 50% on-turn-end perform-action(self, random cast) + an innate Arcane Bolt |
| src/data/spells/glimmerdark.test.ts:29 | is Luminous Tide renamed in place: a Wit AOE ally heal of 20% of the caster Health, no status | is Kindred Light: a Wit AOE ally heal of 20% of the caster Health, no status |
| src/data/spells/glimmerdark.test.ts:50 | are five: Overcharge is deleted | are five |
| src/data/spells/index.test.ts:84 | no two spells share (affinity, targetShape, payload, factor) -- guards against H3+ reintroducing the H2 reskin mistake | no two spells share (affinity, targetShape, payload, factor) |
| src/data/spells/index.test.ts:100 | dedupKey for status-only spells (Phase 4.1-F3) | dedupKey for status-only spells |
| src/data/spells/index.test.ts:128 | Silence and Pacify (Phase 4.1-F3, G2) | Silence and Pacify |
| src/data/spells/index.test.ts:159 | ALL_SPELLS is append-only: the original 24 ids in order, then Silence, then Pacify, then the 4.1-G1 three | ALL_SPELLS is append-only: the first 24 ids in order, then Silence, then Pacify, then the last three |
| src/data/spells/index.test.ts:191 | Pounce, Stifling Weight and Life Siphon (Phase 4.1-G1, D4) | Pounce, Stifling Weight and Life Siphon |
| src/data/spells/index.test.ts:228 | Pollen Cloud is a control spell with no damage: an AoE Sleep for 2 turns on every enemy (4.1-H2d, ASSUMPTION 150) | Pollen Cloud is a control spell with no damage: an AoE Sleep for 2 turns on every enemy |
| src/data/spells/index.test.ts:269 | dedupKey reads the stat a spell scales from (Phase 4.1-G1, ASSUMPTION 74) | dedupKey reads the stat a spell scales from |
| src/data/statuses.test.ts:17 | stock statuses (representative Phase 3 content) | stock statuses (representative content) |
| src/data/statuses.test.ts:54 | the four ticking statuses declare the potencies decided at the 4.1-H2d grill (percent of the APPLIER's stat, ASSUMPTION 152) | the four ticking statuses declare their potencies (percent of the APPLIER's stat) |
| src/data/traits/core.test.ts:27 | stock traits (representative Phase 3 content) | stock traits (representative content) |
| src/data/traits/glimmerdark.test.ts:13 | the Flickerling Wick (ASSUMPTION 140) | the Flickerling Wick |
| src/engine/__fixtures__/held-statuses.test.ts:5 | holdPotency (4.1-H2d pins) | holdPotency pins |
| src/engine/__golden__/golden-action-observed.test.ts:6 | golden replay: on-action-observed (Phase 4 Slice E2, Resonants-shaped) | golden replay: on-action-observed (Resonants-shaped) |
| src/engine/__golden__/golden-actor-dies-attack.test.ts:6 | golden replay: an action ends when its actor dies (Phase 4.1-C2c, PR #73 review) | golden replay: an action ends when its actor dies |
| src/engine/__golden__/golden-armor-penetration.test.ts:6 | golden replay: armor penetration (Phase 4 Slice B) | golden replay: armor penetration |
| src/engine/__golden__/golden-attack-instance-list.test.ts:6 | golden replay: attack instance-list (Phase 4 Slice B) | golden replay: attack instance-list |
| src/engine/__golden__/golden-b1-fallback-lowest-hp.test.ts:6 | golden replay: B1 -- the script-less fallback attacks the lowest-HP enemy (Phase 4.1-C2b) | golden replay: the script-less fallback attacks the lowest-HP enemy |
| src/engine/__golden__/golden-b1-granted-cast-default.test.ts:6 | golden replay: B1 -- a granted cast defaults to the lowest-HP enemy (Phase 4.1-C2b) | golden replay: a granted cast defaults to the lowest-HP enemy |
| src/engine/__golden__/golden-b1-support-heals-own-side.test.ts:6 | golden replay: B1 -- an enemy support caster under always-cast heals its own lowest-HP ally (Phase 4.1-C2b) | golden replay: an enemy support caster under always-cast heals its own lowest-HP ally |
| src/engine/__golden__/golden-b2-confused-granted-cast-redirects.test.ts:6 | golden replay: B2.3 -- a confused caster's granted cast can redirect (Phase 4.1-C2c) | golden replay: a confused caster's granted cast can redirect |
| src/engine/__golden__/golden-b2-provoke-redirects-echo.test.ts:6 | golden replay: B2.3 -- a Provoke redirects an echo (Phase 4.1-C2c) | golden replay: a Provoke redirects an echo |
| src/engine/__golden__/golden-b2-silenced-refuses-granted-cast.test.ts:6 | golden replay: B2.2 -- Silence refuses a granted cast and draws nothing (Phase 4.1-C2c) | golden replay: Silence refuses a granted cast and draws nothing |
| src/engine/__golden__/golden-b2-skipped-turn-refuses-granted-cast.test.ts:6 | golden replay: B2.1 -- a skipped turn refuses the granted cast, after rolling (Phase 4.1-C2c) | golden replay: a skipped turn refuses the granted cast, after rolling |
| src/engine/__golden__/golden-b4-cleanse-then-tick.test.ts:6 | golden replay: B4 exact-instance rule -- cleanse-then-tick (Phase 4.1-B, PR #69 R5) | golden replay: exact-instance rule -- cleanse-then-tick |
| src/engine/__golden__/golden-b4-remove-then-reapply.test.ts:6 | golden replay: B4 exact-instance rule -- remove-then-reapply (Phase 4.1-B, PR #69 R5) | golden replay: exact-instance rule -- remove-then-reapply |
| src/engine/__golden__/golden-b5-cast-fizzle.test.ts:6 | golden replay: B5 on the Cast path -- fizzle + rule 4 re-target (Phase 4.1-C2c, PR #73 review) | golden replay: the pre-hit-hook fizzle on the Cast path -- fizzle + rule 4 re-target |
| src/engine/__golden__/golden-b5-fizzle-rule4-retarget.test.ts:6 | golden replay: B5 fizzle + rule 4 re-target (Phase 4.1-C2c) | golden replay: pre-hit-hook fizzle + rule 4 re-target |
| src/engine/__golden__/golden-b6-provoke-stun-cleanup.test.ts:6 | golden replay: B6 -- a provoking creature Stunned before its next turn stops provoking at that turn start (Phase 4.1-C, D6) | golden replay: a provoking creature Stunned before its next turn stops provoking at that turn start |
| src/engine/__golden__/golden-blindclaws-striker.test.ts:6 | golden replay: Glimmerdark Blindclaws Setter -> Striker (Phase 4 Slice H2, real content) | golden replay: Glimmerdark Blindclaws Setter -> Striker (real content) |
| src/engine/__golden__/golden-broodmother.test.ts:6 | golden replay: Overgrowth Broodmother Swarm Call count-scaling (Phase 4 Slice I, PR #65 review, real content) | golden replay: Overgrowth Broodmother Swarm Call count-scaling (real content) |
| src/engine/__golden__/golden-brute-starter.test.ts:6 | golden replay: Brute starter double-strike (Phase 4 Slice F, real content) | golden replay: Brute starter double-strike (real content) |
| src/engine/__golden__/golden-buff-cast.test.ts:6 | golden replay: stat-modifier-payload AOE Cast (Phase 4 Slice E) | golden replay: stat-modifier-payload AOE Cast |
| src/engine/__golden__/golden-chance-percent.test.ts:13 | golden replay: chancePercent probabilistic trigger (Phase 4 Slice E2) | golden replay: chancePercent probabilistic trigger |
| src/engine/__golden__/golden-cheat-death.test.ts:13 | golden replay: cheat-death (Phase 4 Slice D, Last Stand-shaped) | golden replay: cheat-death (Last Stand-shaped) |
| src/engine/__golden__/golden-conditional-damage-bonus.test.ts:6 | golden replay: conditional-damage-bonus (Phase 4 Slice E2) | golden replay: conditional-damage-bonus |
| src/engine/__golden__/golden-cross-stat-contribution.test.ts:6 | golden replay: cross-stat contribution (Phase 4 Slice B) | golden replay: cross-stat contribution |
| src/engine/__golden__/golden-d3-revive-cap-exclusion.test.ts:7 | golden replay: D3 revive cap -- mixed-pool exclusion (Phase 4.1-B, PR #69 R5, R5-2) | golden replay: revive cap -- mixed-pool exclusion |
| src/engine/__golden__/golden-d3-revive-cap-fizzle.test.ts:6 | golden replay: D3 revive cap -- 11th-attempt fizzle (Phase 4.1-B, PR #69 R5) | golden replay: revive cap -- 11th-attempt fizzle |
| src/engine/__golden__/golden-defend-count-additive-cap.test.ts:9 | golden replay: defend-count additive-cap accumulation (Phase 4 Slice D, PR #47 review amendment, real Bulwark-shaped) | golden replay: defend-count additive-cap accumulation (real Bulwark-shaped) |
| src/engine/__golden__/golden-defend-count.test.ts:6 | golden replay: defend-count magnitudeSource (Phase 4 Slice D, Bulwark-shaped) | golden replay: defend-count magnitudeSource (Bulwark-shaped) |
| src/engine/__golden__/golden-e-echo-chain-truncated.test.ts:7 | golden replay: 4.1-E -- an echo chain through the same Overtone, truncated at the real cap | golden replay: an echo chain through the same Overtone, truncated at the real cap |
| src/engine/__golden__/golden-e-grant-actor-dies-first.test.ts:6 | golden replay: 4.1-E -- a queued grant whose actor died first emits nothing | golden replay: a queued grant whose actor died first emits nothing |
| src/engine/__golden__/golden-e-grant-during-granted-action.test.ts:6 | golden replay: 4.1-E -- a grant raised during a granted action queues FIFO | golden replay: a grant raised during a granted action queues FIFO |
| src/engine/__golden__/golden-f3-silenced-refuses-granted-cast.test.ts:9 | golden replay: the real Silenced status refuses a granted cast (the real-status mirror of B2.2) | golden replay: the real Silenced status refuses a granted cast (the real-status mirror of the trait-borne golden) |
| src/engine/__golden__/golden-g1-leech-sovereign-pacified.test.ts:12 | golden replay: a Pacified Leech Sovereign casts instead of waiting (Phase 4.1-G1, real content) | golden replay: a Pacified Leech Sovereign casts instead of waiting (real content) |
| src/engine/__golden__/golden-gloomjaw-executioner.test.ts:6 | golden replay: Glimmerdark Gloomjaws Executioner (Phase 4 Slice H2, real content) | golden replay: Glimmerdark Gloomjaws Executioner (real content) |
| src/engine/__golden__/golden-gloomjaw-ravager.test.ts:6 | golden replay: Glimmerdark Gloomjaws Ravager (Phase 4 Slice H2, real content) | golden replay: Glimmerdark Gloomjaws Ravager (real content) |
| src/engine/__golden__/golden-gloomjaw-stalker.test.ts:6 | golden replay: Glimmerdark Gloomjaws Predatory Instinct (Phase 4 Slice H2, real content) | golden replay: Glimmerdark Gloomjaws Predatory Instinct (real content) |
| src/engine/__golden__/golden-h2a-additional-granted.test.ts:6 | golden replay: a granted Attack stays direct and gets the Additional (4.1-H2a) | golden replay: a granted Attack stays direct and gets the Additional |
| src/engine/__golden__/golden-h2a-additional-hp-bound.test.ts:6 | golden replay: the Additional is bounded by 20% of the target max Health (4.1-H2a) | golden replay: the Additional is bounded by 20% of the target max Health |
| src/engine/__golden__/golden-h2a-additional-levels.test.ts:6 | golden replay: the Additional at attacker levels 1, 8 and 11 (4.1-H2a) | golden replay: the Additional at attacker levels 1, 8 and 11 |
| src/engine/__golden__/golden-h2a-additional-second-instance.test.ts:6 | golden replay: the Additional lands on the second attack instance too (4.1-H2a) | golden replay: the Additional lands on the second attack instance too |
| src/engine/__golden__/golden-h2a-additional-spell.test.ts:6 | golden replay: the Additional lands on every direct hit of a spell (4.1-H2a) | golden replay: the Additional lands on every direct hit of a spell |
| src/engine/__golden__/golden-h2a-additional-splashing.test.ts:6 | golden replay: the Additional lands on every Splashing hit (4.1-H2a) | golden replay: the Additional lands on every Splashing hit |
| src/engine/__golden__/golden-h2a-cost.test.ts:6 | golden replay: the cost rule and the DoT-tick exclusion (4.1-H2a) | golden replay: the cost rule and the DoT-tick exclusion |
| src/engine/__golden__/golden-h2a-flat-indirect.test.ts:6 | golden replay: flat-mode response damage on another creature is indirect (4.1-H2a) | golden replay: flat-mode response damage on another creature is indirect |
| src/engine/__golden__/golden-h2a-indirect-keeps.test.ts:6 | golden replay: indirect damage keeps affinity, the dealt pool, the conditional bonus, the taken pool and armor penetration, and gets no Additional (4.1-H2a) | golden replay: indirect damage keeps affinity, the dealt pool, the conditional bonus, the taken pool and armor penetration, and gets no Additional |
| src/engine/__golden__/golden-h2a-indirect.test.ts:6 | golden replay: a trait response is indirect damage: a fifth of Defence, Defend, no cross-stat (4.1-H2a) | golden replay: a trait response is indirect damage: a fifth of Defence, Defend, no cross-stat |
| src/engine/__golden__/golden-h2a-spell-on-caster.test.ts:6 | golden replay: a spell effect on its own caster is direct damage (4.1-H2a) | golden replay: a spell effect on its own caster is direct damage |
| src/engine/__golden__/golden-h2b1-last-gleam.test.ts:10 | golden replay: the Last Gleam (4.1-H2b1) | golden replay: the Last Gleam |
| src/engine/__golden__/golden-h2b1-observed-cost.test.ts:6 | golden replay: damage observation of a cost (4.1-H2b1) | golden replay: damage observation of a cost |
| src/engine/__golden__/golden-h2b1-observed-lethal.test.ts:6 | golden replay: observed-lethal (4.1-H2b1) | golden replay: observed-lethal |
| src/engine/__golden__/golden-h2b1-observed-silent.test.ts:6 | golden replay: what damage observation must not see (4.1-H2b1) | golden replay: what damage observation must not see |
| src/engine/__golden__/golden-h2b1-observed-tick.test.ts:6 | golden replay: a DoT tick is not a cost (4.1-H2b1) | golden replay: a DoT tick is not a cost |
| src/engine/__golden__/golden-h2b1-wick-burn-heal.test.ts:6 | golden replay: wick-burn-heal (4.1-H2b1) | golden replay: wick-burn-heal |
| src/engine/__golden__/golden-h2b1-wick-gates.test.ts:10 | golden replay: the Wick gate (4.1-H2b1) | golden replay: the Wick gate |
| src/engine/__golden__/golden-h2b1-wick-skips-self.test.ts:6 | golden replay: wick-skips-self (4.1-H2b1) | golden replay: wick-skips-self |
| src/engine/__golden__/golden-h2b2-carrier-fresh.test.ts:6 | golden replay: a carrier applying the same status snapshots fresh from itself, not the snapshot it carries (4.1-H2b2) | golden replay: a carrier applying the same status snapshots fresh from itself, not the snapshot it carries |
| src/engine/__golden__/golden-h2b2-reapply.test.ts:6 | golden replay: a status re-applied keeps one instance, refreshes its timer, and replaces its snapshot only when strictly stronger (4.1-H2b2) | golden replay: a status re-applied keeps one instance, refreshes its timer, and replaces its snapshot only when strictly stronger |
| src/engine/__golden__/golden-h2b2-regen-potency.test.ts:6 | golden replay: Regen heals the frozen potency of its healer, credited to the healer while it lives, else the bearer (4.1-H2b2) | golden replay: Regen heals the frozen potency of its healer, credited to the healer while it lives, else the bearer |
| src/engine/__golden__/golden-h2b2-spore-spread.test.ts:6 | golden replay: Spore spreads with the dying bearer whole snapshot: the new host ticks as the original applier (4.1-H2b2) | golden replay: Spore spreads with the dying bearer whole snapshot: the new host ticks as the original applier |
| src/engine/__golden__/golden-h2b2-tick-dead-applier.test.ts:6 | golden replay: a tick whose applier died keeps its frozen amount, is sourced from the bearer, fires no dealer hooks and is never self-inflicted (4.1-H2b2) | golden replay: a tick whose applier died keeps its frozen amount, is sourced from the bearer, fires no dealer hooks and is never self-inflicted |
| src/engine/__golden__/golden-h2b2-tick-kill-on-death.test.ts:6 | golden replay: a tick that kills its bearer offers no triggering-source to the bearer on-death either (4.1-H2b2) | golden replay: a tick that kills its bearer offers no triggering-source to the bearer on-death either |
| src/engine/__golden__/golden-h2b2-tick-living-applier.test.ts:6 | golden replay: a status tick is indirect damage from the applier snapshot, credited to the living applier (4.1-H2b2) | golden replay: a status tick is indirect damage from the applier snapshot, credited to the living applier |
| src/engine/__golden__/golden-h2b2-tick-no-retaliation.test.ts:6 | golden replay: a tick from a living applier offers no triggering-source: no retaliator answers, on-damage-taken still fires and wakes Sleep (4.1-H2b2) | golden replay: a tick from a living applier offers no triggering-source: no retaliator answers, on-damage-taken still fires and wakes Sleep |
| src/engine/__golden__/golden-h2b2-tick-self-applied.test.ts:6 | golden replay: a self-applied tick makes its bearer the dealer, and is still never self-inflicted (4.1-H2b2) | golden replay: a self-applied tick makes its bearer the dealer, and is still never self-inflicted |
| src/engine/__golden__/golden-h2b2-tick-taken-factors.test.ts:6 | golden replay: a tick passes through the bearer's taken factors, Defend's then Vulnerability's (4.1-H2b2) | golden replay: a tick passes through the bearer's taken factors, Defend's then Vulnerability's |
| src/engine/__golden__/golden-h2b2-vulnerability-once.test.ts:6 | golden replay: Vulnerability x1.5 once, even when applied twice (single instance, 4.1-H2b2) | golden replay: Vulnerability x1.5 once, even when applied twice (single instance) |
| src/engine/__golden__/golden-h2c-snapback.test.ts:6 | golden replay: the real Snapjaw Jaws counterattacks at 60% of its Attack, as indirect damage (4.1-H2d) | golden replay: the real Snapjaw Jaws counterattacks at 60% of its Attack, as indirect damage |
| src/engine/__golden__/golden-h2d-dot-ticks.test.ts:6 | golden replay: one tick each of the real Poison, Burn and Spore (4.1-H2d) | golden replay: one tick each of the real Poison, Burn and Spore |
| src/engine/__golden__/golden-h2d-pollen-cloud.test.ts:8 | golden replay: the real Pollen Cloud puts Sleep on every enemy and deals no damage (4.1-H2d) | golden replay: the real Pollen Cloud puts Sleep on every enemy and deals no damage |
| src/engine/__golden__/golden-heal-cast.test.ts:6 | golden replay: heal-payload Cast (Phase 4 Slice E) | golden replay: heal-payload Cast |
| src/engine/__golden__/golden-heal-scaling-count.test.ts:6 | golden replay: heal magnitudeSource mode (Phase 4 Slice E2, Necromoss-shaped) | golden replay: heal magnitudeSource mode (Necromoss-shaped) |
| src/engine/__golden__/golden-heal-scaling-stat.test.ts:6 | golden replay: heal scalingStat mode (Phase 4 Slice E2, Treants Elder-shaped) | golden replay: heal scalingStat mode (Treants Elder-shaped) |
| src/engine/__golden__/golden-hollowkin-wretch-self-dot.test.ts:6 | golden replay: PR #64 fix 3 -- triggering-source never resolves to the firing creature itself | golden replay: triggering-source never resolves to the firing creature itself |
| src/engine/__golden__/golden-hollowkin-wretch.test.ts:6 | golden replay: Rotcap Hollow Hollowkin Wretch retaliatory Confusion (Phase 4 Slice H3, real content) | golden replay: Rotcap Hollow Hollowkin Wretch retaliatory Confusion (real content) |
| src/engine/__golden__/golden-leech-sovereign.test.ts:6 | golden replay: the Leech Sovereign, Glimmerdark boss (Phase 4 Slice H2, real content) | golden replay: the Leech Sovereign, Glimmerdark boss (real content) |
| src/engine/__golden__/golden-lullpollen-dozer.test.ts:6 | golden replay: Lullpollen Dozer (Phase 4 Slice H1, real content) | golden replay: Lullpollen Dozer (real content) |
| src/engine/__golden__/golden-necromoss-reclaim.test.ts:6 | golden replay: Rotcap Hollow Necromoss Wisp heal-off-dead-allies (Phase 4 Slice H3, real content) | golden replay: Rotcap Hollow Necromoss Wisp heal-off-dead-allies (real content) |
| src/engine/__golden__/golden-on-action-hooks.test.ts:6 | golden replay: on-[action] hooks (Phase 4 Slice B) | golden replay: on-[action] hooks |
| src/engine/__golden__/golden-overgrowth-web-exploit.test.ts:6 | golden replay: The Overgrowth Web -> Exploit combo (Slice H1, real content) | golden replay: The Overgrowth Web -> Exploit combo (real content) |
| src/engine/__golden__/golden-pollinator-pollenlord.test.ts:6 | golden replay: Pollinators Pollenlord (Phase 4 Slice H1, real content) | golden replay: Pollinators Pollenlord (real content) |
| src/engine/__golden__/golden-resonant-harmonize.test.ts:6 | golden replay: Glimmerdark Resonants Harmonize/Resonate (Phase 4 Slice H2, real content) | golden replay: Glimmerdark Resonants Harmonize/Resonate (real content) |
| src/engine/__golden__/golden-resonant-overtone.test.ts:6 | golden replay: Glimmerdark Resonant Overtone echo-cast (Phase 4 Slice H2, real content) | golden replay: Glimmerdark Resonant Overtone echo-cast (real content) |
| src/engine/__golden__/golden-resonant-overtone.test.ts:7 | matches the committed event log exactly (one echo fires, its own re-observation fails, echo damage lands before the original) | matches the committed event log exactly (one echo fires, its own re-observation fails, the original damage lands first, then the echo damage) |
| src/engine/__golden__/golden-revive.test.ts:6 | golden replay: revive (Phase 4 Slice B) | golden replay: revive |
| src/engine/__golden__/golden-rot-sovereign.test.ts:6 | golden replay: Rotcap Hollow Rot Sovereign attrition (Phase 4 Slice H3, real content) | golden replay: Rotcap Hollow Rot Sovereign attrition (real content) |
| src/engine/__golden__/golden-scoped-suppression.test.ts:6 | golden replay: scoped action-lock (Phase 4 Slice B) | golden replay: scoped action-lock |
| src/engine/__golden__/golden-shieldbarer-starter.test.ts:6 | golden replay: Shieldbarer starter team-wide Defence buff (Phase 4 Slice F, real content) | golden replay: Shieldbarer starter team-wide Defence buff (real content) |
| src/engine/__golden__/golden-sleep-wake.test.ts:6 | golden replay: Sleep two-trigger composition (Phase 4 Slice E2) | golden replay: Sleep two-trigger composition |
| src/engine/__golden__/golden-snapjaw-ironjaw.test.ts:6 | golden replay: Snapjaws Ironjaw (Phase 4 Slice H1, real content) | golden replay: Snapjaws Ironjaw (real content) |
| src/engine/__golden__/golden-sorcerer-starter.test.ts:6 | golden replay: Sorcerer starter granted cast (Phase 4 Slice F, real content, new primitive) | golden replay: Sorcerer starter granted cast (real content, new primitive) |
| src/engine/__golden__/golden-sparkeater-voidmaw.test.ts:6 | golden replay: Glimmerdark Sparkeater Voidmaw (Phase 4 Slice H2, real content) | golden replay: Glimmerdark Sparkeater Voidmaw (real content) |
| src/engine/__golden__/golden-spider-broodwarden.test.ts:6 | golden replay: Spiders Broodwarden (Phase 4 Slice H1, real content) | golden replay: Spiders Broodwarden (real content) |
| src/engine/__golden__/golden-splashing.test.ts:6 | golden replay: Splashing (Phase 4 Slice C) | golden replay: Splashing |
| src/engine/__golden__/golden-spore-spread-dot-kill.test.ts:6 | golden replay: PR #64 fix 1 -- Spore spreads when its OWN turn-end DoT tick kills the host | golden replay: Spore spreads when its OWN turn-end DoT tick kills the host |
| src/engine/__golden__/golden-spore-spread.test.ts:6 | golden replay: Rotcap Hollow Spore contagion, infect -> kill -> spread (Phase 4 Slice H3, real content) | golden replay: Rotcap Hollow Spore contagion, infect -> kill -> spread (real content) |
| src/engine/__golden__/golden-sporecloud-reaper-no-spore.test.ts:6 | golden replay: PR #64 fix 4 -- a zero-count magnitudeSource is a full no-op (real content) | golden replay: a zero-count magnitudeSource is a full no-op (real content) |
| src/engine/__golden__/golden-swarmhive-queen.test.ts:6 | golden replay: Swarmhive Queen / all-allies-of-species (Phase 4 Slice H1, real content) | golden replay: Swarmhive Queen / all-allies-of-species (real content) |
| src/engine/__golden__/golden-treant-grovekeep.test.ts:6 | golden replay: Treants Grovekeep (Phase 4 Slice H1, real content) | golden replay: Treants Grovekeep (real content) |
| src/engine/__golden__/golden-turn-order-status.test.ts:6 | golden replay: turn-order status (Phase 4 Slice C) | golden replay: turn-order status |
| src/engine/__golden__/golden-unicorn-starter.test.ts:6 | golden replay: the Unicorn (Phase 4 Slice F, real content) | golden replay: the Unicorn (real content) |
| src/engine/__golden__/golden-web-break-free.test.ts:6 | golden replay: Web break-free (Phase 4 Slice E2) | golden replay: Web break-free |
| src/engine/actions-gem-side.test.ts:160 | with `gemSide` absent, today's random draw is unchanged (ASSUMPTION 69) | with `gemSide` absent, today's random draw is unchanged |
| src/engine/actions.test.ts:90 | defaultTargetingFor (Phase 4.1-C2a, A1; wired into resolveIntent in C2b/B1) | defaultTargetingFor (wired into resolveIntent) |
| src/engine/actions.test.ts:139 | castableGemSlots (Phase 4.1-C2a, A1) | castableGemSlots |
| src/engine/actions.test.ts:163 | resolveIntent's gemSlot: 'random' draw order (Phase 4.1-C2a, A1) | resolveIntent's gemSlot: 'random' draw order |
| src/engine/actions.test.ts:222 | resolveIntent -- castable-filtered gem draw and resolved-side default (Phase 4.1-C2b) | resolveIntent -- castable-filtered gem draw and resolved-side default |
| src/engine/actions.test.ts:297 | runAction -- legality before resolution, for every source (B2.2, 4.1-C2c) | runAction -- legality before resolution, for every source |
| src/engine/actions.test.ts:395 | an echo is gated by the CASTER, never the bearer (B2.2, 4.1-C2c) | an echo is gated by the CASTER, never the bearer |
| src/engine/actions.test.ts:454 | resolveInstanceTarget -- rule 4 (B2.4, 4.1-C2c) | resolveInstanceTarget -- rule 4 |
| src/engine/actor-death.test.ts:123 | an action ends when its actor dies (spec/combat.md#an-action-ends-when-its-actor-dies, 4.1-C2c) | an action ends when its actor dies (spec/combat.md#an-action-ends-when-its-actor-dies) |
| src/engine/combat.test.ts:179 | resolving the SAME frozen snapshot twice gives identical {state, events} (Phase 4.1-B, B3) | resolving the SAME frozen snapshot twice gives identical {state, events} |
| src/engine/combat.test.ts:699 | born-this-turn: a status refreshed in its own bearer turn keeps full duration (Phase 4.1-F2) | born-this-turn: a status refreshed in its own bearer turn keeps full duration |
| src/engine/combat.test.ts:807 | action instance-list composition (Phase 4 Slice B) | action instance-list composition |
| src/engine/combat.test.ts:916 | Spell.scalingStat (Phase 4 Slice B) | Spell.scalingStat |
| src/engine/combat.test.ts:939 | absent scalingStat preserves the pre-Slice-B remap-aware Intelligence lookup | absent scalingStat reads the remap-aware Intelligence |
| src/engine/combat.test.ts:987 | Web break-free (Phase 4 Slice E2) | Web break-free |
| src/engine/combat.test.ts:1111 | Arcane Surge-shaped granted cast = on-turn-end perform-action (Phase 4.1-E) | Arcane Surge-shaped granted cast = on-turn-end perform-action |
| src/engine/combat.test.ts:1144 | on a successful roll, casts the (only) equipped spell before TurnEnded (Phase 4.1-C, D6) | on a successful roll, casts the (only) equipped spell before TurnEnded |
| src/engine/combat.test.ts:1249 | turn-start cleanup (Phase 4.1-C, D6) | turn-start cleanup |
| src/engine/combat.test.ts:1347 | taken-reduction passive (Phase 4 Slice F, review amendment -- real Bulwark shape, as a perk) | taken-reduction passive (real Bulwark shape, as a perk) |
| src/engine/conditions.test.ts:359 | evaluateCondition -- acted-before-target (Phase 4 Slice C, Blindclaws) | evaluateCondition -- acted-before-target (Blindclaws) |
| src/engine/confusion.test.ts:63 | executeCastAoe -- Confusion redirect (Phase 4 Slice C) | executeCastAoe -- Confusion redirect |
| src/engine/confusion.test.ts:100 | an unconfused caster casts at the enemy side as before -- byte-identical, no RNG drawn for the check | an unconfused caster casts at the enemy side, no RNG drawn for the check |
| src/engine/corpus-coverage.test.ts:132 | corpus coverage (Phase 4.1-D2) | corpus coverage |
| src/engine/corpus-coverage.test.ts:239 | the corpus exercises the applier snapshot (4.1-H2b2): a living-applier tick, a dead-applier tick and a Spore spread | the corpus exercises the applier snapshot: a living-applier tick, a dead-applier tick and a Spore spread |
| src/engine/corpus-digest.test.ts:68 | corpus digest (Phase 4.1-C2a, behaviour tripwire) | corpus digest (behaviour tripwire) |
| src/engine/curves.test.ts:6 | enemyLevelRange (Phase-4 placeholder config) | enemyLevelRange (placeholder config) |
| src/engine/curves.test.ts:19 | the minimum is exactly the floor at every floor, so rounding it down (4.1-H2c) cannot move this config | the minimum is exactly the floor at every floor, so rounding it down cannot move this config |
| src/engine/curves.test.ts:33 | enemyLevelRange (default config, Phase 4.1-H2c / ASSUMPTIONS 4, 118, 119) | enemyLevelRange (default config) |
| src/engine/curves.test.ts:63 | floors 1-9 spawn at exactly 1, 2, 3, 5, 6, 7, 9, 10, 11 (ASSUMPTION 118) | floors 1-9 spawn at exactly 1, 2, 3, 5, 6, 7, 9, 10, 11 |
| src/engine/curves.test.ts:78 | bossLevel (default config, Phase 4.1-H2c / ASSUMPTION 119) | bossLevel (default config) |
| src/engine/curves.test.ts:90 | is a flat, deterministic placeholder under the Phase-4 config -- same value at any floor, not rolled | is a flat, deterministic placeholder under the placeholder config -- same value at any floor, not rolled |
| src/engine/curves.test.ts:97 | is 10 + (floor - 1), uncapped, under the default config (Phase 4.1-A) | is 10 + (floor - 1), uncapped, under the default config |
| src/engine/damage-observation.test.ts:292 | the filter matrix: relationship x selfInflicted (4.1-H2b1) | the filter matrix: relationship x selfInflicted |
| src/engine/damage-observation.test.ts:319 | both observation hooks fail closed (4.1-H2b1) | both observation hooks fail closed |
| src/engine/damage-observation.test.ts:417 | routing: a damage event never reaches an action observer, an action never a damage observer (4.1-H2b1) | routing: a damage event never reaches an action observer, an action never a damage observer |
| src/engine/damage-observation.test.ts:458 | hook order in the damage path (4.1-H2b1; spec/effects.md#hook-execution) | hook order in the damage path (spec/effects.md#hook-execution) |
| src/engine/damage-observation.test.ts:598 | a zero cost is a full no-op: nothing to observe (4.1-H2b1, ASSUMPTION 132) | a zero cost is a full no-op: nothing to observe |
| src/engine/damage-observation.test.ts:624 | loop safety on the damage -> observer -> damage route (4.1-H2b1) | loop safety on the damage -> observer -> damage route |
| src/engine/damage-observation.test.ts:699 | the validator keeps each filter field on its own hook, on every trigger carrier (4.1-H2b1) | the validator keeps each filter field on its own hook, on every trigger carrier |
| src/engine/effective-stats.test.ts:53 | is a passthrough to baseStats.%s (Phase 1 has no stat-modifier effects) | is a passthrough to baseStats.%s when the creature has no stat-modifier effects |
| src/engine/effective-stats.test.ts:104 | includes a conditional modifier only when its read-time condition holds (Phase 4.1-B, S2) | includes a conditional modifier only when its read-time condition holds |
| src/engine/effective-stats.test.ts:126 | at fractional effective Health, hp-percent divides by FLOOR(effective Health) -- the same max HP currentHp is clamped to, not the raw fractional reading (Phase 4.1-B review, PR #69, D1/R2) | at fractional effective Health, hp-percent divides by FLOOR(effective Health) -- the same max HP currentHp is clamped to, not the raw fractional reading |
| src/engine/effects.test.ts:75 | resolveBaselineEffects / instantiateEffectDefs (Phase 4.1-B, S1/B4) | resolveBaselineEffects / instantiateEffectDefs |
| src/engine/effects.test.ts:110 | throws on an unknown trait id (Phase 4.1-B review, PR #69, D3) -- never silently skips | throws on an unknown trait id -- never silently skips |
| src/engine/effects.test.ts:125 | resolveBaselineEffects with side effects (Phase 4 Slice F / ASSUMPTION 21, Phase 4.1-B R1) | resolveBaselineEffects with side effects |
| src/engine/effects.test.ts:232 | gatherTakenFactors yields magnitude once (single instance, 4.1-H2b2) for taken damage-modifier effects only | gatherTakenFactors yields magnitude once (single instance) for taken damage-modifier effects only |
| src/engine/effects.test.ts:237 | a magnitudeSource is the live count the magnitude is scaled by (Phase 4 Slice D) | a magnitudeSource is the live count the magnitude is scaled by |
| src/engine/effects.test.ts:263 | accumulation: 'additive' (Phase 4 Slice D, PR #47 review amendment -- real Bulwark shape) | accumulation: 'additive' (real Bulwark shape) |
| src/engine/effects.test.ts:306 | is byte-identical to the pre-amendment multiplicative default when accumulation is absent | is the multiplicative default when accumulation is absent |
| src/engine/effects.test.ts:371 | gatherArmorPenetration (Phase 4 Slice B) | gatherArmorPenetration |
| src/engine/effects.test.ts:396 | gatherCrossStatContribution (Phase 4 Slice B) | gatherCrossStatContribution |
| src/engine/effects.test.ts:437 | gatherExtraInstances (Phase 4 Slice B) | gatherExtraInstances |
| src/engine/effects.test.ts:478 | hasStatusImmunity / hasProvokeImmunity / hasSplashing / hasAnnihilate (Phase 4 Slice C) | hasStatusImmunity / hasProvokeImmunity / hasSplashing / hasAnnihilate |
| src/engine/effects.test.ts:517 | activeFriendlyFireStatus (Phase 4 Slice C, Confusion) | activeFriendlyFireStatus (Confusion) |
| src/engine/effects.test.ts:553 | resolveCount (Phase 4 Slice D, count-scaling) | resolveCount (count-scaling) |
| src/engine/effects.test.ts:575 | living-allies-of-species is 0 when no speciesId is set (every Phase 1-3/Slice A-C creature) | living-allies-of-species is 0 when no speciesId is set |
| src/engine/effects.test.ts:656 | resolveMagnitudeCount (Phase 4 Slice D) | resolveMagnitudeCount |
| src/engine/effects.test.ts:673 | gatherCheatDeathChance (Phase 4 Slice D, Last Stand) | gatherCheatDeathChance (Last Stand) |
| src/engine/generation-g1.test.ts:81 | generateFloor: full distinct gem sets (Phase 4.1-G1, ASSUMPTION 70) | generateFloor: full distinct gem sets |
| src/engine/generation-g1.test.ts:169 | generateFloor: the cast-role check (Phase 4.1-G1, ASSUMPTION 67) | generateFloor: the cast-role check |
| src/engine/generation-g1.test.ts:202 | no other role is a cast role, and always-cast no longer is: an empty pool is fine | no other role is a cast role, and always-cast is not: an empty pool is fine |
| src/engine/generation-g1.test.ts:218 | generateFloor: the boss fill (Phase 4.1-G1, 6v6 boss floors, ASSUMPTION 72) | generateFloor: the boss fill (6v6 boss floors) |
| src/engine/generation.test.ts:79 | sets the engine-visible level (4.1-H2a, ASSUMPTION 111), always equal to origin.level | sets the engine-visible level, always equal to origin.level |
| src/engine/generation.test.ts:172 | fills origin from the template id, the level and the optional ref (Phase 4.1-A, A5) | fills origin from the template id, the level and the optional ref |
| src/engine/generation.test.ts:197 | an explicit scriptId option overrides the template default (Phase 4.1-A, A6/ASSUMPTION 6) | an explicit scriptId option overrides the template default |
| src/engine/generation.test.ts:273 | biomeHasContent (Phase 4.1-A review fix F1) | biomeHasContent |
| src/engine/generation.test.ts:318 | contentFrontier (Phase 4.1-A, G5/S5; tightened by review fix F1) | contentFrontier |
| src/engine/generation.test.ts:331 | stops at the FIRST has-content gap, never resuming at a later authored biome (F1) | stops at the FIRST has-content gap, never resuming at a later authored biome |
| src/engine/generation.test.ts:490 | speciesId is now real (Phase 4 Slice E2), so living-allies-of-species reads a nonzero count | speciesId is now real, so living-allies-of-species reads a nonzero count |
| src/engine/generation.test.ts:526 | generateFloor: boss floors (Phase 4 Slice I, PR #65 review) | generateFloor: boss floors |
| src/engine/injured-allies.test.ts:107 | the gate and the heal target agree on one pool (4.1-H2b1, ASSUMPTION 140) | the gate and the heal target agree on one pool |
| src/engine/injured-allies.test.ts:147 | the trigger-only condition never reaches a script (4.1-H2b1, ASSUMPTION 141) | the trigger-only condition never reaches a script |
| src/engine/interpreter.test.ts:101 | a targeting-less rule is valid (B1): it matches, carries no targeting, and resolves to the side-aware default | a targeting-less rule is valid: it matches, carries no targeting, and resolves to the side-aware default |
| src/engine/interpreter.test.ts:156 | decideAction -- acted-before-target on a targeting-less rule (B1 peek) | decideAction -- acted-before-target on a targeting-less rule (peek) |
| src/engine/interpreter.test.ts:421 | decideAction -- scoped action-lock (Phase 4 Slice B; passive lock since 4.1-F1) | decideAction -- scoped action-lock (passive lock) |
| src/engine/interpreter.test.ts:505 | decideAction -- status-immunity vs scoped action-lock (Phase 4 Slice C) | decideAction -- status-immunity vs scoped action-lock |
| src/engine/interpreter.test.ts:597 | checkLegality -- pure, draws nothing (Phase 4.1-C2a, A1) | checkLegality -- pure, draws nothing |
| src/engine/leveling.test.ts:54 | xpForNextLevel (Phase 4.1-A, ASSUMPTION 5 -- quadratic default) | xpForNextLevel (quadratic default) |
| src/engine/leveling.test.ts:72 | the Phase-4 placeholder config reproduces the OLD linear curve (100 * level) exactly | the placeholder config gives a linear curve (100 * level) exactly |
| src/engine/leveling.test.ts:78 | xpAwardForKill (Phase 4.1-A, ASSUMPTION 5 -- victim-level-scaled) | xpAwardForKill (victim-level-scaled) |
| src/engine/perform-action.test.ts:107 | where each scope drains its grants (ASSUMPTION 3) | where each scope drains its grants |
| src/engine/perform-action.test.ts:210 | who acts (ASSUMPTIONS 6, 9) and the skip gate | who acts and the skip gate |
| src/engine/perform-action.test.ts:311 | load-time rejections (ASSUMPTION 7) | load-time rejections |
| src/engine/perform-action.test.ts:342 | the guard lint helpers (ASSUMPTION 7) | the guard lint helpers |
| src/engine/resolution.test.ts:76 | 'all' action-lock (a trait-borne passive; 4.1-F1) | 'all' action-lock (a trait-borne passive) |
| src/engine/resolution.test.ts:410 | applyStatus + status-container content (Slice C) | applyStatus + status-container content |
| src/engine/resolution.test.ts:470 | an omitted duration inherits the status's own defaultDuration (Phase 4 Slice F, review amendment) | an omitted duration inherits the status's own defaultDuration |
| src/engine/resolution.test.ts:639 | heal scaling (Phase 4 Slice E2, Treants Elder / Necromoss-shaped) | heal scaling (Treants Elder / Necromoss-shaped) |
| src/engine/resolution.test.ts:731 | deal-damage scalingStat (Phase 4 Slice B) | deal-damage scalingStat |
| src/engine/resolution.test.ts:764 | deal-damage mutual exclusivity (ASSUMPTION 6) | deal-damage mutual exclusivity |
| src/engine/resolution.test.ts:788 | flat-mode stat-derived magnitude (percent-hp-condition-ticks brief) | flat-mode stat-derived magnitude |
| src/engine/resolution.test.ts:907 | reads the bearer’s stat FLOORED before multiplying (ASSUMPTION 3) -- a fractional effective stat does not leak through | reads the bearer’s stat FLOORED before multiplying -- a fractional effective stat does not leak through |
| src/engine/resolution.test.ts:1169 | a literal number flatAmount/flatAmount still behaves exactly as before (regression) | a literal number flatAmount behaves exactly as a plain number (regression) |
| src/engine/resolution.test.ts:1203 | chancePercent probabilistic gate (Phase 4 Slice E2) | chancePercent probabilistic gate |
| src/engine/resolution.test.ts:1305 | conditional-damage-bonus (Phase 4 Slice E2, Cull the Weak / Ambusher-shaped) | conditional-damage-bonus (Cull the Weak / Ambusher-shaped) |
| src/engine/resolution.test.ts:1383 | conditional-damage-bonus actionKind scoping (Phase 4 Slice F, review amendment) | conditional-damage-bonus actionKind scoping |
| src/engine/resolution.test.ts:1451 | an unset actionKind applies to BOTH (byte-identical to pre-amendment 'both' default) | an unset actionKind applies to BOTH ('both' is the default) |
| src/engine/resolution.test.ts:1457 | grant-action-state response (Phase 4 Slice B) | grant-action-state response |
| src/engine/resolution.test.ts:1479 | revive response (Phase 4 Slice B) | revive response |
| src/engine/resolution.test.ts:1528 | clears defending/provoking on the revived creature (F1 regression: a creature that died while defending must not return still defending) | clears defending/provoking on the revived creature (regression: a creature that died while defending must not return still defending) |
| src/engine/resolution.test.ts:1602 | restores a revived PLAYER creature's perks too (ASSUMPTION 21: perks are battle-start-permanent, like innate traits, not in-fight ramp death-reset should wipe) | restores a revived PLAYER creature's perks too (perks are battle-start-permanent, like innate traits, not in-fight ramp death-reset should wipe) |
| src/engine/resolution.test.ts:1638 | remove-status response (Phase 4 Slice E2) | remove-status response |
| src/engine/resolution.test.ts:1773 | all-allies ResponseTarget (Phase 4 Slice F / ASSUMPTION 22, Shieldbarer starter) | all-allies ResponseTarget (Shieldbarer starter) |
| src/engine/resolution.test.ts:1815 | all-allies-of-species ResponseTarget (Phase 4 Slice H1, Swarmhive Queen) | all-allies-of-species ResponseTarget (Swarmhive Queen) |
| src/engine/resolution.test.ts:1893 | cheat-death (Phase 4 Slice D, Last Stand) | cheat-death (Last Stand) |
| src/engine/resolution.test.ts:1971 | on-action-observed filter (Phase 4 Slice E2, general action-observation system) | on-action-observed filter (general action-observation system) |
| src/engine/resolution.test.ts:2077 | on-action-observed end-to-end (Phase 4 Slice E2) | on-action-observed end-to-end |
| src/engine/resolution.test.ts:2192 | echo = perform-action(triggering-source) (Phase 4.1-E, A2 -- Resonant Overtone shape) | echo = perform-action(triggering-source) (Resonant Overtone shape) |
| src/engine/resolution.test.ts:2355 | apply-stat-modifier magnitudeSource (Phase 4 Slice E2, Swarmhive Striker-shaped: freeze-at-application) | apply-stat-modifier magnitudeSource (Swarmhive Striker-shaped: freeze-at-application) |
| src/engine/resolution.test.ts:2436 | exact-instance rule (Phase 4.1-B, B4) | exact-instance rule |
| src/engine/resolution.test.ts:2592 | revive cap (Phase 4.1-B, D3) | revive cap |
| src/engine/resolution.test.ts:2652 | SelfCondition validator (Phase 4.1-B, S2) | SelfCondition validator |
| src/engine/resolution.test.ts:2687 | 'random' response-target validator (Phase 4.1-C2a, PR #71 review) | 'random' response-target validator |
| src/engine/resolution.test.ts:2754 | a cost goes through applyDamageAndEmit (4.1-H2a, ASSUMPTION 132) | a cost goes through applyDamageAndEmit |
| src/engine/resolution.test.ts:2826 | a status-sourced flat hit on ANOTHER creature is indirect, not a tick (4.1-H2a, ASSUMPTION 131) | a status-sourced flat hit on ANOTHER creature is indirect, not a tick |
| src/engine/spell-effects.test.ts:326 | 4.1-D equivalence: the old cast payload path vs the new effect list | equivalence: the old cast payload path vs the new effect list |
| src/engine/spell-effects.test.ts:504 | P2: a spell hit counts as a cast (cross-stat) and never splashes | a spell hit counts as a cast (cross-stat) and never splashes |
| src/engine/spell-effects.test.ts:549 | P8: a spell effect takes no cascade-depth or self-guard accounting | a spell effect takes no cascade-depth or self-guard accounting |
| src/engine/spell-effects.test.ts:589 | B5 on the cast path: a target killed in its own pre-hit hooks gets NOTHING from the list | the pre-hit-hook fizzle on the cast path: a target killed in its own pre-hit hooks gets NOTHING from the list |
| src/engine/spell-effects.test.ts:649 | B5 and the AOE alive-skip also guard `self` effects (cast-target alone would not) | the pre-hit-hook fizzle and the AOE alive-skip also guard `self` effects (cast-target alone would not) |
| src/engine/spell-effects.test.ts:671 | B5 (single): the target dies in the on-cast hook -> no damage AND no self heal | a single target: the target dies in the on-cast hook -> no damage AND no self heal |
| src/engine/spell-effects.test.ts:889 | ASSUMPTION 35: one landed target's effect list is atomic (no actor check between effects) | One landed target's effect list is atomic (no actor check between effects) |
| src/engine/spell-effects.test.ts:963 | ASSUMPTION 36: magnitudes read the caster LIVE when each effect runs | Magnitudes read the caster LIVE when each effect runs |
| src/engine/spell-effects.test.ts:999 | heal.offStat (plan review F2) | heal.offStat |
| src/engine/spell-effects.test.ts:1224 | rejects %s setting both offStat and scalingStat (it used to throw mid-fight) | rejects %s setting both offStat and scalingStat (at load, not mid-fight) |
| src/engine/spell-effects.test.ts:1247 | a trait heal scaled by a live count: 26, not the old (stat x sp) x count = 27 | a trait heal scaled by a live count: 26, not (stat x sp) x count = 27 |
| src/engine/splashing.test.ts:53 | Splashing (Phase 4 Slice C) | Splashing |
| src/engine/status-containers.test.ts:221 | a lock gained during the actor's own turn-start hooks skips that very turn (ASSUMPTION 45) | a lock gained during the actor's own turn-start hooks skips that very turn |
| src/engine/status-containers.test.ts:567 | a granted Defend is refused under an 'all' lock (ASSUMPTION 46) | a granted Defend is refused under an 'all' lock |
| src/engine/status-containers.test.ts:716 | a status's effects carry no count of their own (single instance, 4.1-H2b2) | a status's effects carry no count of their own (single instance) |
| src/engine/status-snapshot.test.ts:250 | pass-on rule: only the SAME status inherits the firing instance’s snapshot (ASSUMPTION 145) | pass-on rule: only the SAME status inherits the firing instance’s snapshot |
| src/engine/status-timing.test.ts:587 | turn-end pass: a lethal own Poison tick after the wiping firing is a WIN with no tick (the PR #70 case) | turn-end pass: a lethal own Poison tick after the wiping firing is a WIN with no tick |
| src/engine/support-spells.test.ts:65 | interpreter -- ally-targeting single Cast (Phase 4 Slice E) | interpreter -- ally-targeting single Cast |
| src/engine/support-spells.test.ts:114 | executeCastAoe -- ally-targeting AOE Cast (Phase 4 Slice E) | executeCastAoe -- ally-targeting AOE Cast |
| src/engine/support-spells.test.ts:164 | ally-targeting Cast end-to-end -- highest-attack-ally (Phase 4 Slice E addendum) | ally-targeting Cast end-to-end -- highest-attack-ally |
| src/engine/target-selectors.test.ts:300 | targetSelectorHasCandidate throws -- 'random' needs the intended side, checked only in actions.ts (PR #71 review) | targetSelectorHasCandidate throws -- 'random' needs the intended side, checked only in actions.ts |
| src/engine/targeting.test.ts:173 | resolveOffensiveTarget -- targeting-override pipeline (Phase 4 Slice C) | resolveOffensiveTarget -- targeting-override pipeline |
| src/engine/targeting.test.ts:250 | ASSUMPTION 12: Confusion is checked BEFORE Provoke -- a confused actor redirects to its own side even when the enemy side has a provoker | Confusion is checked BEFORE Provoke -- a confused actor redirects to its own side even when the enemy side has a provoker |
| src/engine/targeting.test.ts:295 | shouldRedirectAoeToAllies (Phase 4 Slice C, ASSUMPTION 13) | shouldRedirectAoeToAllies |
| src/engine/targeting.test.ts:326 | adjacentLivingTargets (Phase 4 Slice C, Splashing) | adjacentLivingTargets (Splashing) |
| src/engine/targeting.test.ts:345 | skips a dead slot-neighbor in favor of the next LIVING one (ASSUMPTION 14) | skips a dead slot-neighbor in favor of the next LIVING one |
| src/engine/turn-order.test.ts:76 | buildTurnQueue -- turn-order status (Phase 4 Slice C) | buildTurnQueue -- turn-order status |
| src/engine/turn-order.test.ts:101 | ASSUMPTION 9: a creature carrying both an act-first and an act-last instance resolves to act-first | A creature carrying both an act-first and an act-last instance resolves to act-first |
| src/state/balance-ci-brute.test.ts:10 | balance CI thresholds: brute (ASSUMPTION 22) | balance CI thresholds: brute |
| src/state/balance-ci-shieldbarer.test.ts:10 | balance CI thresholds: shieldbarer (ASSUMPTION 22) | balance CI thresholds: shieldbarer |
| src/state/balance-ci-sorcerer.test.ts:10 | balance CI thresholds: sorcerer (ASSUMPTION 22) | balance CI thresholds: sorcerer |
| src/state/balance-sim-report.test.ts:92 | the floor-5 window (ASSUMPTION 126) | the floor-5 window |
| src/state/balance-sim-report.test.ts:122 | the matchup table (ASSUMPTION 127) | the matchup table |
| src/state/balance-sim-report.test.ts:221 | the first-try clear rate per floor (ASSUMPTION 127) | the first-try clear rate per floor |
| src/state/balance-sim-report.test.ts:254 | per-trait stack maxima (plan review, fix 4) | per-trait stack maxima |
| src/state/balance-sim-report.test.ts:385 | T2 and T3 floor reads (ASSUMPTION 153) | T2 and T3 floor reads |
| src/state/balance-sim.test.ts:143 | has every spec, a row per content floor and the H1 report items | has every spec, a row per content floor and the report items |
| src/state/balance-sim.test.ts:200 | summon once (ASSUMPTION 96) | summon once |
| src/state/balance-sim.test.ts:227 | failed-push rule (ASSUMPTION 97) | failed-push rule |
| src/state/balance-sim.test.ts:271 | hard wall and the stop rule (ASSUMPTION 98) | hard wall and the stop rule |
| src/state/balance-sim.test.ts:332 | party order (ASSUMPTION 99) | party order |
| src/state/balance-sim.test.ts:373 | functional perks and the greedy buy (ASSUMPTION 100) | functional perks and the greedy buy |
| src/state/balance-sim.test.ts:495 | boss-run restore and the probe never editing gems (ASSUMPTION 101) | boss-run restore and the probe never editing gems |
| src/state/balance-sim.test.ts:560 | stat-modifier stack attribution (ASSUMPTION 103) | stat-modifier stack attribution |
| src/state/balance-sim.test.ts:646 | boss locked-turn share (ASSUMPTION 102) | boss locked-turn share |
| src/state/balance-sim.test.ts:730 | noteBossVisit: first visit per floor only (ASSUMPTION 102) | noteBossVisit: first visit per floor only |
| src/state/balance-sim.test.ts:738 | boss rows: first visits vs all visits, n/a counts (ASSUMPTION 102) | boss rows: first visits vs all visits, n/a counts |
| src/state/balance-sim.test.ts:787 | report computation on hand-built seed results (F1.1, F2, F4, F5) | report computation on hand-built seed results |
| src/state/balance-sim.test.ts:870 | F5: the walls' size, per seed, below floor 10 and to the first floor-10 clear | the walls' size, per seed, below floor 10 and to the first floor-10 clear |
| src/state/balance-sim.test.ts:894 | F5: spreadOf | spreadOf |
| src/state/balance-sim.test.ts:899 | ASSUMPTION 107 thresholds, both sides of each boundary | thresholds, both sides of each boundary |
| src/state/balance-sim.test.ts:918 | first soul: never-completing seeds count as infinite (F2) | first soul: never-completing seeds count as infinite |
| src/state/balance-sim.test.ts:963 | R2: the spec fold keeps the larger stack per bucket, with its seed; a tie keeps the first seed | the spec fold keeps the larger stack per bucket, with its seed; a tie keeps the first seed |
| src/state/balance-sim.test.ts:1029 | R2: runSeed folds each fight's stacks into the seed's maxima (the wiring, on a real run) | runSeed folds each fight's stacks into the seed's maxima (the wiring, on a real run) |
| src/state/balance-sim.test.ts:1046 | per-seed derivations hold on real runs (F1.2) | per-seed derivations hold on real runs |
| src/state/balance-sim.test.ts:1075 | analyzeFight on hand-built events (F1.3, F6) | analyzeFight on hand-built events |
| src/state/balance-sim.test.ts:1165 | R1: growth and shred stacks are separate, per side | growth and shred stacks are separate, per side |
| src/state/balance-sim.test.ts:1262 | R2: foldFightStacks keeps the larger stack per bucket | foldFightStacks keeps the larger stack per bucket |
| src/state/balance-sim.test.ts:1322 | the live wiring: playFloorRun on the level-30, floor-9 store (F1.4) | the live wiring: playFloorRun on the level-30, floor-9 store |
| src/state/balance-sim.test.ts:1357 | the analysis names the boss of the biome the store fights, pins included (L2) | the analysis names the boss of the biome the store fights, pins included |
| src/state/balance-sim.test.ts:1383 | the probe cannot leak into the policy run, end to end (F3) | the probe cannot leak into the policy run, end to end |
| src/state/integration.test.ts:99 | Slice I integration: real Brute party through real floor 1 (Overgrowth) | integration: real Brute party through real floor 1 (Overgrowth) |
| src/state/integration.test.ts:383 | Phase 4.1-A defaults: real store, real content, the new BalanceConfig | real defaults: real store, real content, the default BalanceConfig |
| src/state/integration.test.ts:437 | Phase 4.1-G2: stored player gems in the real floor-10 fight | Stored player gems in the real floor-10 fight |
| src/state/integration.test.ts:475 | the Pacified Unicorn casts one of its stored gems instead of waiting (4.1-H2c: slot 1, Wild Vigor) | the Pacified Unicorn casts one of its stored gems instead of waiting (slot 1, Wild Vigor) |
| src/state/rewards.test.ts:32 | applyXpGain (Phase-4 placeholder config: xpForNextLevel = 100 * level) | applyXpGain (placeholder config: xpForNextLevel = 100 * level) |
| src/state/rewards.test.ts:89 | applyXpGain (Phase 4.1-A default config: xpForNextLevel = 20 * level^2) | applyXpGain (default config: xpForNextLevel = 20 * level^2) |
| src/state/rewards.test.ts:169 | throws on a 'fusion' source (Phase 8 not built yet, ASSUMPTION 27) | throws on a 'fusion' source (fusion is not built) |
| src/state/rewards.test.ts:283 | resolveKillReward (Phase 4.1-A review fix F4) | resolveKillReward |
| src/state/store-gems.test.ts:61 | hand-derived player gem roll (ASSUMPTIONS 81, 82, 95) | hand-derived player gem roll |
| src/state/store-gems.test.ts:126 | the Seer never rolls her innate Arcane Bolt, for any seed (ASSUMPTION 81) | the Seer never rolls her innate Arcane Bolt, for any seed |
| src/state/store-gems.test.ts:184 | the unlock biome (ASSUMPTION 82) | the unlock biome |
| src/state/store-gems.test.ts:245 | the gem RNG is its own stream (ASSUMPTION 81) | the gem RNG is its own stream |
| src/state/store-gems.test.ts:299 | stored gems reach the fight (ASSUMPTIONS 83, 84) | stored gems reach the fight |
| src/state/store-gems.test.ts:345 | a new instance runs its role (ASSUMPTION 86) | a new instance runs its role |
| src/state/store-hub.test.ts:62 | the starters and the Unicorn resolve but never bank soul: soul-incomplete (ASSUMPTION 91) | the starters and the Unicorn resolve but never bank soul: soul-incomplete |
| src/state/store-hub.test.ts:258 | null empties the slot, and emptying every slot is allowed; descend then refuses (ASSUMPTION 10) | null empties the slot, and emptying every slot is allowed; descend then refuses |
| src/state/store-newgame.test.ts:191 | the seed must be an integer in 0 .. 2^32 - 1 (ASSUMPTION 87) | the seed must be an integer in 0 .. 2^32 - 1 |
| src/state/store-perks.test.ts:106 | a perk inert until Phase 8 is buyable (no gating) | an inert perk is buyable (no gating) |
| src/state/store.test.ts:340 | review fix F5: soul-gain under the DEFAULT config is exact per tier (common=25, rare=10), not just "a multiple of 10" | soul-gain under the DEFAULT config is exact per tier (common=25, rare=10), not just "a multiple of 10" |
| src/state/store.test.ts:524 | an instance with a custom scriptId uses it instead of the creature default (Phase 4.1-A, A6/ASSUMPTION 6) | an instance with a custom scriptId uses it instead of the creature default |
| src/state/store.test.ts:622 | reason: beyond-content-frontier wins even when floor-out-of-reach ALSO fails (F3) | reason: beyond-content-frontier wins even when floor-out-of-reach ALSO fails |
| src/state/store.test.ts:704 | review fix F1: refusing the pin closes the descend()-throws route (reproduces the review-found bug) | refusing the pin closes the descend()-throws route (a player-reachable crash) |
| src/state/store.test.ts:885 | boss floors (Phase 4 Slice I, PR #65 review) | boss floors |
