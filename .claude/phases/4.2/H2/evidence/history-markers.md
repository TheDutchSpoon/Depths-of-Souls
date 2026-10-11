# History markers (4.2-H2)

A scan of every comment line and title for the words that narrate change (no longer, used to, previously, formerly,
before this, was ..., now ..., renamed, replacing, reworked, originally, the old, pre-/post-<id>, regression, unchanged,
byte-identical, legacy, earlier draft, deferred) on the tree after the mechanical pass and on the final tree.
Hits before the hand pass: 734. After: 298 (round 2 moved the two `combat.test.ts:939` title hits from Kept to Rewritten, and
rewrote the markers of the 30 further lines listed under "Rewritten in round 2" below, which the word list does not see).

## Rewritten (history, dropped or put in the present tense)

| file:line (before) | marker | old text |
| --- | --- | --- |
| src/app/demoFight.test.ts:13 | no longer | // Phase 3.5 demo (traits/statuses no longer firing at all). Pins DEMO_SEED so the demo's |
| src/app/demoFight.ts:18 | replac | // output. This file and CombatDemo.tsx are a throwaway harness; Phase 7 replaces them. |
| src/data/balance.ts:17 | was.. | // Was 3 |
| src/data/biomes.test.ts:19 | replac | // Slice A shipped the SHAPE only -- 10 placeholder slots, empty spawn pools. Slice H1 replaced |
| src/data/biomes.test.ts:19 | Slice/H | // Slice A shipped the SHAPE only -- 10 placeholder slots, empty spawn pools. Slice H1 replaced |
| src/data/biomes.test.ts:20 | replac | // slot 1 (floors 1-10) with real The Overgrowth content; Slice H2 replaced slot 2 (floors 11-20) |
| src/data/biomes.test.ts:20 | Slice/H | // slot 1 (floors 1-10) with real The Overgrowth content; Slice H2 replaced slot 2 (floors 11-20) |
| src/data/biomes.test.ts:21 | replac | // with real Glimmerdark content; Slice H3 replaces slot 3 (floors 21-30) with real Rotcap Hollow |
| src/data/biomes.test.ts:21 | Slice/H | // with real Glimmerdark content; Slice H3 replaces slot 3 (floors 21-30) with real Rotcap Hollow |
| src/data/biomes.test.ts:23 | Slice/H | // the placeholder shape every later slice can safely replace one entry of without disturbing the |
| src/data/biomes.test.ts:26 | Slice/H | TITLE BIOMES (Slice A shape + Slice H1/H2/H3 real content) |
| src/data/biomes.test.ts:54 | Slice/H | TITLE slots 4-10 keep the Slice A placeholder shape (empty spawn pools) |
| src/data/biomes.ts:7 | Slice/H | // Phase 4 Slice A ships the SHAPE only: 10 fixed biome slots (`spec/run.md#biomes`'s decade |
| src/data/biomes.ts:8 | replac | // cadence), each a valid-shape, empty spawn pool. Slice H1 replaced slot 1 (floors 1-10) with |
| src/data/biomes.ts:8 | Slice/H | // cadence), each a valid-shape, empty spawn pool. Slice H1 replaced slot 1 (floors 1-10) with |
| src/data/biomes.ts:9 | replac | // real The Overgrowth content; Slice H2 replaced slot 2 (floors 11-20) with real Glimmerdark |
| src/data/biomes.ts:9 | Slice/H | // real The Overgrowth content; Slice H2 replaced slot 2 (floors 11-20) with real Glimmerdark |
| src/data/biomes.ts:10 | replac | // content; Slice H3 replaced slot 3 (floors 21-30) with real Rotcap Hollow content. Biomes 4-10 |
| src/data/biomes.ts:10 | Slice/H | // content; Slice H3 replaced slot 3 (floors 21-30) with real Rotcap Hollow content. Biomes 4-10 |
| src/data/biomes.ts:11 | until | // stay this placeholder shape until a later phase authors them (v1 needs all 10 biomes, per |
| src/data/scripts.test.ts:306 | renamed | // `taunter` is `always-provoke` renamed into the role set. Its two real |
| src/data/specializations.test.ts:54 | deleted | // `PerkDef.phase` is deleted; the nine perks that stay inert until Phase 8 are |
| src/data/specializations.ts:21 | pre-/post- | // Review amendment (post-initial-submission): Brute's "Brute Force" (+1% damage with ATTACKS per |
| src/data/specializations.ts:24 | now+ | // only existing dealt-pool-percentage primitive. `ConditionalDamageBonusDef` now carries an |
| src/data/specializations.ts:96 | Slice/H | * ready to pass directly as `createCombat`'s `partyWidePlayerEffects` argument (the Slice G |
| src/data/specializations.ts:97 | Slice/H | * store's own eventual job; exposed here so this slice's own tests/goldens can exercise the same |
| src/data/specializations.ts:116 | Slice/H | // "Your creatures Cast spells an additional time." -- Slice B's action-instance model, |
| src/data/species/glimmerdark.test.ts:70 | the old | TITLE the Flickerlings take the old first slot (pool index 0), in rarity order, with the content doc Health and scripts |
| src/data/species/glimmerdark.ts:3 | Slice/H | // entirely on primitives already proven through Slice E2 (no new engine work needed -- verified |
| src/data/species/glimmerdark.ts:58 | originally | // Phase 4 interstitial slice (cumulative spell unlock): H2 originally authored 10 here (a |
| src/data/species/glimmerdark.ts:58 | Slice/H | // Phase 4 interstitial slice (cumulative spell unlock): H2 originally authored 10 here (a |
| src/data/species/glimmerdark.ts:59 | was.. | // near-complete reskinned kit); 9 were deleted as exact-or-near reskins of Overgrowth spells |
| src/data/species/glimmerdark.ts:59 | deleted | // near-complete reskinned kit); 9 were deleted as exact-or-near reskins of Overgrowth spells |
| src/data/species/glimmerdark.ts:61 | was.. | // full list). Five new spells were added to meet the design owner's >=4-5-own-spells-per-biome |
| src/data/species/glimmerdark.ts:62 | no longer | // bar (`spec/run.md#spells-unlock-cumulatively`). This grouping is no longer fed into `BiomeData` (see overgrowth.ts's own |
| src/data/species/glimmerdark.ts:209 | now+ | // Affinity now matches the stat it steals (CLAUDE.md's affinity->stat |
| src/data/species/glimmerdark.ts:351 | Slice/H | // is what Slice I closes. |
| src/data/species/overgrowth.ts:2 | Slice/H | // entirely on primitives already proven through Slice E2 (no new engine work needed -- per the |
| src/data/species/overgrowth.ts:3 | Slice/H | // project's own "stop and amend the relevant earlier slice" discipline, confirmed while |
| src/data/species/overgrowth.ts:27 | used to | // same composition-only shape in that same reorg (it used to define its own trait/spell consts |
| src/data/species/overgrowth.ts:78 | no longer | // interstitial slice (cumulative spell unlock): this grouping is no longer fed into |
| src/data/species/overgrowth.ts:78 | Slice/H | // interstitial slice (cumulative spell unlock): this grouping is no longer fed into |
| src/data/species/overgrowth.ts:295 | the old | // Its own trait fires on-turn-start regardless of chosen action (unlike the old provoke-gated |
| src/data/species/rotcap-hollow.ts:2 | Slice/H | // entirely on primitives already proven through Slice E2/H2 (no new engine work needed for any |
| src/data/species/rotcap-hollow.ts:66 | Slice/H | // Phase 4 interstitial slice (cumulative spell unlock, extended to H3 from the start -- see |
| src/data/species/rotcap-hollow.ts:68 | no longer | // triggers): this grouping is no longer fed into `BiomeData` -- kept purely as "the spells this |
| src/data/species/rotcap-hollow.ts:357 | Slice/H | // is what Slice I closes. |
| src/data/species/starters.test.ts:70 | unchanged | TITLE has Attack 15 and Health 39 (the remap of 25), the rest unchanged |
| src/data/species/starters.test.ts:90 | deleted | TITLE SpeciesCreature carries no equippedSpells field -- the fixed loadout is deleted |
| src/data/species/starters.test.ts:104 | the old | TITLE createCombat prepends Arcane Surge's innate spell, giving the Seer [Bolt, null, null, null] -- byte-identical to the old fixed loadout |
| src/data/species/starters.test.ts:104 | byte-identical | TITLE createCombat prepends Arcane Surge's innate spell, giving the Seer [Bolt, null, null, null] -- byte-identical to the old fixed loadout |
| src/data/species/starters.ts:2 | not yet | // species (stubbed -- rosters deferred)" section). Real, shipped content -- authored directly as |
| src/data/species/starters.ts:3 | Slice/H | // `SpeciesCreature`s (generation.ts's own static-content shape), so a future Slice G store can |
| src/data/species/starters.ts:3 | not yet | // `SpeciesCreature`s (generation.ts's own static-content shape), so a future Slice G store can |
| src/data/species/starters.ts:12 | now+ | // now only the starter creature exists -- species sits below the >=3-creature minimum on |
| src/data/species/starters.ts:53 | no longer | // deleted (`SpeciesCreature.equippedSpells` no longer exists) -- Arcane Bolt is now granted by |
| src/data/species/starters.ts:56 | byte-identical | // byte-identical: `[Arcane Bolt, null, null, null]` -- immediately castable by the `caster` role |
| src/data/species/starters.ts:65 | Slice/H | // died)." A direct, content-level exercise of Slice B's action instance-list model -- no new |
| src/data/species/starters.ts:91 | was.. | // Health 39 is the ASSUMPTION 125 remap of 25; Attack 15 is ASSUMPTION 123 (was 10). |
| src/data/species/starters.ts:91 | (was | // Health 39 is the ASSUMPTION 125 remap of 25; Attack 15 is ASSUMPTION 123 (was 10). |
| src/data/species/starters.ts:104 | Slice/H | // joins via the scripted-intro encounter, a Slice G/run-layer concern -- this slice only authors |
| src/data/spells/core.ts:11 | Slice/H | // Phase 4 interstitial slice (cumulative spell unlock): these three core spells were never |
| src/data/spells/core.ts:12 | before this | // actually wired into any biome's roll before this slice (BiomeData.spellPool never |
| src/data/spells/core.ts:12 | Slice/H | // actually wired into any biome's roll before this slice (BiomeData.spellPool never |
| src/data/spells/glimmerdark.test.ts:2 | deleted | // `.claude/content/glimmerdark.md`. Glow is deleted: Beacon Charge grants Grant Act First instead, |
| src/data/spells/glimmerdark.test.ts:29 | renamed | TITLE is Luminous Tide renamed in place: a Wit AOE ally heal of 20% of the caster Health, no status |
| src/data/spells/glimmerdark.test.ts:50 | deleted | TITLE are five: Overcharge is deleted |
| src/data/spells/glimmerdark.ts:37 | Slice/H | * ASSUMPTION (interstitial slice, NEW CONTENT -- surfaced for sign-off): Disorient, suggested by |
| src/data/spells/glimmerdark.ts:44 | Slice/H | * just be Web-with-a-new-name -- the exact anti-pattern this slice exists to undo. Authored as |
| src/data/spells/glimmerdark.ts:75 | Slice/H | * ASSUMPTION (interstitial slice expansion, NEW CONTENT -- design-agent proposal, numbers deferred): |
| src/data/spells/glimmerdark.ts:75 | not yet | * ASSUMPTION (interstitial slice expansion, NEW CONTENT -- design-agent proposal, numbers deferred): |
| src/data/spells/glimmerdark.ts:102 | Slice/H | * ASSUMPTION (interstitial slice expansion, NEW CONTENT -- design-agent proposal, numbers deferred): |
| src/data/spells/glimmerdark.ts:102 | not yet | * ASSUMPTION (interstitial slice expansion, NEW CONTENT -- design-agent proposal, numbers deferred): |
| src/data/spells/glimmerdark.ts:129 | Slice/H | * ASSUMPTION (interstitial slice expansion, NEW CONTENT -- design-agent proposal, numbers deferred): |
| src/data/spells/glimmerdark.ts:129 | not yet | * ASSUMPTION (interstitial slice expansion, NEW CONTENT -- design-agent proposal, numbers deferred): |
| src/data/spells/glimmerdark.ts:130 | formerly | * Kindred Light (formerly Luminous Tide, renamed in place in 4.1-H2b1 when Glow was deleted) -- a |
| src/data/spells/glimmerdark.ts:130 | was.. | * Kindred Light (formerly Luminous Tide, renamed in place in 4.1-H2b1 when Glow was deleted) -- a |
| src/data/spells/glimmerdark.ts:130 | renamed | * Kindred Light (formerly Luminous Tide, renamed in place in 4.1-H2b1 when Glow was deleted) -- a |
| src/data/spells/glimmerdark.ts:130 | deleted | * Kindred Light (formerly Luminous Tide, renamed in place in 4.1-H2b1 when Glow was deleted) -- a |
| src/data/spells/index.test.ts:14 | Slice/H | // Phase 4 interstitial slice (cumulative spell unlock). This registry only exists because H2 |
| src/data/spells/index.test.ts:22 | was.. | // "factor" read as the primary effect's `spellPower`. Pre-4.1-D that field was a spell-level one |
| src/data/spells/index.test.ts:24 | pre-/post- | // every REAL duplicate pair pre-deletion (every stat-modifier reskin shared the placeholder); the |
| src/data/spells/index.test.ts:26 | not yet | // future stat-modifier spell that deliberately reuses an existing (affinity, targetShape) pair |
| src/data/spells/index.test.ts:31 | before this | * Before this, every such spell of one affinity and shape keyed to `...|none|1`, so a second one |
| src/data/spells/index.test.ts:58 | the old | // The old (payload, spellPower) pair, read off the spell's PRIMARY effect -- the first |
| src/data/spells/index.test.ts:114 | the old | // A throwaway pair. Keyed by status ids they differ; keyed the old way (payload "none", |
| src/data/spells/index.test.ts:130 | renamed | // deliberately deleted Overcharge (index 15) and renamed Luminous Tide to Kindred Light in place, so |
| src/data/spells/index.ts:45 | Slice/H | * Phase 4 interstitial slice (cumulative spell unlock): the GLOBAL spell registry -- |
| src/data/spells/index.ts:46 | no longer | * `generateFloor` no longer rolls a cast-role loadout from a per-biome `BiomeData.spellPool` |
| src/data/spells/index.ts:49 | previously | * spells into the roll for the first time -- previously unreferenced by any biome. Order IS |
| src/data/spells/index.ts:54 | was.. | * deliberate exception so far: Phase 4.1-H2b1 deleted Overcharge (its Glow was deleted), which |
| src/data/spells/index.ts:54 | deleted | * deliberate exception so far: Phase 4.1-H2b1 deleted Overcharge (its Glow was deleted), which |
| src/data/spells/index.ts:56 | renamed | * and renamed Luminous Tide to Kindred Light in place. |
| src/data/spells/overgrowth.ts:3 | Slice/H | // ---- Phase 4 Slice H1: The Overgrowth (floors 1-10) -- 11 real spells, so any affinity-matched |
| src/data/spells/overgrowth.ts:97 | previously | /** Arcane Bolt: a normal biome-1 Wit spawn-pool spell (data-layer carrier reorg -- previously |
| src/data/spells/overgrowth.ts:102 | was.. | * no upside -> the plain ~100% band: spell power 1.0 since 4.1-H2c (it was 0.5). */ |
| src/data/spells/overgrowth.ts:102 | (was | * no upside -> the plain ~100% band: spell power 1.0 since 4.1-H2c (it was 0.5). */ |
| src/data/spells/rotcap-hollow.ts:3 | Slice/H | // ---- Phase 4 Slice H3: Rotcap Hollow (floors 21-30) -- 5 new, genuinely-own spells (one per |
| src/data/spells/rotcap-hollow.ts:5 | pre-/post- | // way H2's post-interstitial-slice kit does: spice on top of the inherited Overgrowth/Glimmerdark |
| src/data/spells/rotcap-hollow.ts:5 | Slice/H | // way H2's post-interstitial-slice kit does: spice on top of the inherited Overgrowth/Glimmerdark |
| src/data/spells/rotcap-hollow.ts:13 | no longer | * lowered 0.9 -> 0.45 -- the "~80-90% band" reasoning below no longer applies. A DoT-applying |
| src/data/spells/rotcap-hollow.ts:109 | before this | * real producer before this slice besides Sporch's own on-attack trait -- statuses are never |
| src/data/spells/rotcap-hollow.ts:109 | Slice/H | * real producer before this slice besides Sporch's own on-attack trait -- statuses are never |
| src/data/spells/rotcap-hollow.ts:111 | no longer | * reasoning below no longer applies. A DoT-applying spell's upfront damage shouldn't lead its |
| src/data/statuses.ts:139 | was.. | * plus a trigger -- Sleep was the first status to need more than one), |
| src/data/statuses.ts:188 | Slice/H | * `ResponseTarget` variant (ASSUMPTION 30's original "no new engine primitive" framing did not hold -- see the Slice H3 phase record). It resolves relative to `self` (the |
| src/data/statuses.ts:226 | Slice/H | /** A `friendly-fire` effect (built in Slice C, |
| src/data/traits/core.ts:4 | replac | // Slice-A passive shape, until the actual creature roster is designed (Phase 4+) and replaces |
| src/data/traits/core.ts:4 | Slice/H | // Slice-A passive shape, until the actual creature roster is designed (Phase 4+) and replaces |
| src/data/traits/core.ts:5 | Slice/H | // it. Triggered traits (retaliate etc.) land with Slice B; status-applying traits with Slice C. |
| src/data/traits/core.ts:20 | the old | * full HP" -- byte-identical to the old predicate `(c) => c.currentHp >= effectiveMaxHp(c)`. |
| src/data/traits/core.ts:20 | byte-identical | * full HP" -- byte-identical to the old predicate `(c) => c.currentHp >= effectiveMaxHp(c)`. |
| src/data/traits/glimmerdark.ts:3 | Slice/H | // ---- Phase 4 Slice H2: Glimmerdark (floors 11-20) -- real per-species content, built entirely |
| src/data/traits/glimmerdark.ts:4 | Slice/H | // on primitives already proven through Slice E2 (no new engine work needed, same discipline as |
| src/data/traits/glimmerdark.ts:15 | was.. | // . They replaced the Glowflies once Glow was deleted. Names are |
| src/data/traits/glimmerdark.ts:15 | replac | // . They replaced the Glowflies once Glow was deleted. Names are |
| src/data/traits/glimmerdark.ts:15 | deleted | // . They replaced the Glowflies once Glow was deleted. Names are |
| src/data/traits/glimmerdark.ts:106 | not yet | * acts first starting NEXT round (re-application refreshes; it affects future rounds' turn order only, like Overgrowth's Weaver Webbing an enemy -- though the Weaver now  |
| src/data/traits/glimmerdark.ts:128 | deleted | * has been removed; Striker runs the plain `striker` role |
| src/data/traits/glimmerdark.ts:213 | replac | /** Resonant Overtone (rare, amplifier): PR #60 review -- replaces the previous "gain both |
| src/data/traits/glimmerdark.ts:249 | now+ | // affinity now matches the stat each one drains, per CLAUDE.md's affinity->stat soft-mapping -- |
| src/data/traits/glimmerdark.ts:312 | replac | * replaces the previous "steal Attack+Defence" (a diluted copy of Leech+Gorger, not a distinct |
| src/data/traits/glimmerdark.ts:315 | pre-/post- | * target's CURRENT hp down, resolution.ts's post-stat-modifier clamp -- it bites now) and raises |
| src/data/traits/glimmerdark.ts:351 | unchanged | /** Gloomjaw Stalker (common): the finisher -- unchanged, +30% damage to enemies below 30% HP. */ |
| src/data/traits/glimmerdark.ts:370 | replac | /** Gloomjaw Executioner (uncommon): PR #60 review (C4) -- replaces the previous "bigger execute |
| src/data/traits/glimmerdark.ts:392 | replac | /** Gloomjaw Ravager (rare, amplifier): PR #60 review (C4) -- replaces the previous "biggest |
| src/data/traits/index.ts:107 | replac | // never replacing it). |
| src/data/traits/overgrowth.ts:3 | Slice/H | // ---- Phase 4 Slice H1: The Overgrowth (floors 1-10) -- real per-species content, additive |
| src/data/traits/overgrowth.ts:90 | Slice/H | /** Swarmhive's Striker (payoff): "scales per hive-mate in the team" -- the Slice E2-DECIDED |
| src/data/traits/overgrowth.ts:270 | no longer | * It was 30% in 4.1-H2c (as indirect damage the 60% beat the Shieldbarer pair in every floor-1 fight); 4.1-H2d put it back at 60% once Pollen Cloud no longer deals damage |
| src/data/traits/overgrowth.ts:270 | was.. | * It was 30% in 4.1-H2c (as indirect damage the 60% beat the Shieldbarer pair in every floor-1 fight); 4.1-H2d put it back at 60% once Pollen Cloud no longer deals damage |
| src/data/traits/rotcap-hollow.ts:3 | Slice/H | // ---- Phase 4 Slice H3: Rotcap Hollow (floors 21-30) -- real per-species content, built entirely |
| src/data/traits/rotcap-hollow.ts:4 | Slice/H | // on primitives already proven through Slice E2/H2 (no new engine work needed for any TRAIT here |
| src/data/traits/rotcap-hollow.ts:5 | Slice/H | // -- the one genuinely new piece this slice adds, Spore's `random-ally-without-status` target, is |
| src/data/traits/rotcap-hollow.ts:218 | Slice/H | * allies (`heal`'s `magnitudeSource`, Slice E2's named Necromoss consumer -- recomputed fresh |
| src/data/traits/rotcap-hollow.ts:241 | earlier draft | * earlier draft scaled the SAME response's own `factor` by the live dead-ally count |
| src/data/traits/rotcap-hollow.ts:363 | Slice/H | * damage-modifier this species needed Slice E2 for -- +% damage to any enemy currently Burning. */ |
| src/data/traits/rotcap-hollow.ts:405 | earlier draft | // death-side to change the magnitude. The earlier draft used `magnitudeSource` |
| src/data/traits/starters.ts:43 | Slice/H | // died)." A direct, content-level exercise of Slice B's action instance-list model -- no new |
| src/data/traits/starters.ts:78 | Slice/H | // joins via the scripted-intro encounter, a Slice G/run-layer concern -- this slice only authors |
| src/engine/__corpus__/corpus.ts:399 | byte-identical | // the coverage fights ride on no role's draws and stay byte-identical through G1. The defaults below |
| src/engine/__fixtures__/balance.ts:4 | byte-identical | // byte-identical to Phase 4, with one deliberate exception (XP -- see below). Never imported by |
| src/engine/__fixtures__/balance.ts:17 | unchanged | *  - enemyPartySize(floor) = min(6, floor) -- unchanged between Phase 4 and 4.1, so this field is |
| src/engine/__fixtures__/balance.ts:19 | unchanged | *  - rarityDrawWeight {6,3,1} -- unchanged between Phase 4 and 4.1. |
| src/engine/__fixtures__/balance.ts:20 | the old | *  - soulGainPercent {10,5,2} -- Phase 4's OLD values (4.1-A's new default is {25,20,10}). |
| src/engine/__fixtures__/balance.ts:21 | unchanged | *  - currency drop shape -- unchanged between Phase 4 and 4.1 (currencyPerFloor/bricksMinimum/ |
| src/engine/__fixtures__/balance.ts:25 | the old | * (an earlier draft of this fixture wrongly set BOTH xpCurve* fields to the new defaults, claiming neither had an old-compatible expression): |
| src/engine/__fixtures__/balance.ts:25 | earlier draft | * (an earlier draft of this fixture wrongly set BOTH xpCurve* fields to the new defaults, claiming neither had an old-compatible expression): |
| src/engine/__fixtures__/balance.ts:29 | the old | *    different mechanism). Set to the old values here, so `applyXpGain` under this fixture |
| src/engine/__fixtures__/biomes.ts:1 | Slice/H | // Test-only fixtures for generation.ts. Not real content -- see src/data/biomes.ts (Slice A |
| src/engine/__fixtures__/biomes.ts:2 | Slice/H | // placeholder shape) and src/data/species/ (real content, Slice H1-H3). Never imported by |
| src/engine/__fixtures__/biomes.ts:39 | was.. | // A cast-role creature (role `caster`; was `always-cast`): generation throws if it has no |
| src/engine/__fixtures__/biomes.ts:122 | no longer | * interstitial slice: no longer a per-biome `spellPool` -- every biome shares one cumulative |
| src/engine/__fixtures__/biomes.ts:122 | Slice/H | * interstitial slice: no longer a per-biome `spellPool` -- every biome shares one cumulative |
| src/engine/__fixtures__/biomes.ts:150 | pre-/post- | // biome is boss-less" is the invariant that keeps every pre-Slice-I generateFloor golden/test |
| src/engine/__fixtures__/biomes.ts:150 | Slice/H | // biome is boss-less" is the invariant that keeps every pre-Slice-I generateFloor golden/test |
| src/engine/__fixtures__/creatures.ts:1 | not yet | // Test-only fixtures. Not real content — see src/data/ for that (deferred). Never imported |
| src/engine/__fixtures__/scripts.ts:1 | unchanged | // Phase 4.1-G1, stage 0: the five Phase 2 `always-*` scripts, moved UNCHANGED (same |
| src/engine/__golden__/golden-b1-granted-cast-default.fixture.ts:8 | unchanged | // before the SpellCast; target/damage unchanged). Exactly ONE equipped spell, |
| src/engine/__golden__/golden-b1-granted-cast-default.fixture.ts:102 | now+ | // The granted cast is now an on-turn-end `perform-action` grant (chance = draw #1, then |
| src/engine/__golden__/golden-b1-support-heals-own-side.fixture.ts:2 | any more | // (no explicit targeting any more) casting an ALLY-side heal heals its OWN lowest-HP ally, never |
| src/engine/__golden__/golden-b2-confused-granted-cast-redirects.fixture.ts:5 | was.. | // = [on-turn-end perform-action(self, cast 'random') chancePercent 100 (was `bonus-cast`), |
| src/engine/__golden__/golden-b2-confused-granted-cast-redirects.fixture.ts:5 | (was | // = [on-turn-end perform-action(self, cast 'random') chancePercent 100 (was `bonus-cast`), |
| src/engine/__golden__/golden-b2-silenced-refuses-granted-cast.fixture.ts:8 | was.. | // chancePercent 100 (was `bonus-cast`), a trait-borne passive `action-lock` scope 'cast' |
| src/engine/__golden__/golden-b2-silenced-refuses-granted-cast.fixture.ts:8 | (was | // chancePercent 100 (was `bonus-cast`), a trait-borne passive `action-lock` scope 'cast' |
| src/engine/__golden__/golden-b2-silenced-refuses-granted-cast.fixture.ts:9 | was.. | // (was a permanent on-turn-start suppression)] -- a fixture stand-in for Silenced |
| src/engine/__golden__/golden-b2-silenced-refuses-granted-cast.fixture.ts:9 | (was | // (was a permanent on-turn-start suppression)] -- a fixture stand-in for Silenced |
| src/engine/__golden__/golden-b2-silenced-refuses-granted-cast.fixture.ts:12 | any more | // Round 1, CASTER: (the lock is passive, so no turn-start TriggerFired any more; scoped, so it does NOT skip the turn), it attacks the lowest-HP enemy (E2 30 < E1 40): c |
| src/engine/__golden__/golden-b2-skipped-turn-refuses-granted-cast.fixture.ts:6 | was.. | //   [on-turn-end perform-action(self, cast 'random') chancePercent 100 (was `bonus-cast`), |
| src/engine/__golden__/golden-b2-skipped-turn-refuses-granted-cast.fixture.ts:6 | (was | //   [on-turn-end perform-action(self, cast 'random') chancePercent 100 (was `bonus-cast`), |
| src/engine/__golden__/golden-b4-remove-then-reapply.fixture.ts:12 | the old | // counter -- B4); by the time the OLD tick candidate comes up, its exact owning instance is gone |
| src/engine/__golden__/golden-b5-fizzle-rule4-retarget.fixture.ts:20 | pre-/post- | //   C 5 -> 0, CreatureDied(C). B5: the target died in its own pre-hit hooks, so the main hit |
| src/engine/__golden__/golden-b6-provoke-stun-cleanup.fixture.ts:2 | before this | // provoking at that turn's start, with no stale redirect afterward. Before this fix, turn-start |
| src/engine/__golden__/golden-blindclaws-striker.fixture.ts:3 | earlier draft | // `conditional-damage-bonus` on `acted-before-target` (C1/E1 -- superseding the initial submission's `ambush-strike` script, which wrongly put a creature's signature mec |
| src/engine/__golden__/golden-broodmother.fixture.ts:5 | Slice/H | // after one has died. This is the H1 "boss-encounter runner contract" golden that slice flagged |
| src/engine/__golden__/golden-broodmother.fixture.ts:6 | not yet | // as deferred (its own doc comment: "the boss-encounter RUNNER... is currently untested"), |
| src/engine/__golden__/golden-broodmother.fixture.ts:7 | Slice/H | // closed here by Slice I. |
| src/engine/__golden__/golden-brute-starter.fixture.ts:3 | Slice/H | // brute.md: "Attack executes TWICE AT 100%"). A direct, content-level exercise of Slice B's |
| src/engine/__golden__/golden-brute-starter.fixture.ts:7 | Slice/H | // NOTE on a brief/docs conflict, flagged rather than silently resolved (per this slice's own |
| src/engine/__golden__/golden-brute-starter.fixture.ts:9 | Slice/H | // `.claude/archive/briefs/phase-4-implementation-plan.md`'s own Slice B vocabulary table and Slice F |
| src/engine/__golden__/golden-brute-starter.fixture.ts:14 | Slice/H | // prose needs a correction before it's read again in a future slice's chat. |
| src/engine/__golden__/golden-brute-starter.fixture.ts:14 | not yet | // prose needs a correction before it's read again in a future slice's chat. |
| src/engine/__golden__/golden-conditional-damage-bonus.fixture.ts:6 | Slice/H | // Explicit BEFORE/AFTER proof on the SAME target across two rounds (Slice B/D discipline for |
| src/engine/__golden__/golden-conditional-damage-bonus.fixture.ts:7 | byte-identical | // formula-touching work): hit 1 lands while TARGET is still above the threshold (byte-identical |
| src/engine/__golden__/golden-conditional-damage-bonus.fixture.ts:8 | pre-/post- | // to the pre-Slice-E2 formula -- no bonus); hit 1 itself brings TARGET below the threshold, so |
| src/engine/__golden__/golden-conditional-damage-bonus.fixture.ts:8 | Slice/H | // to the pre-Slice-E2 formula -- no bonus); hit 1 itself brings TARGET below the threshold, so |
| src/engine/__golden__/golden-d3-revive-cap-exclusion.fixture.ts:103 | pre-/post- | // createCombat resets currentHp/revivesUsed at fight-setup (S1/D3), so the pre-capped, |
| src/engine/__golden__/golden-defend-count-additive-cap.fixture.ts:1 | unchanged | // Golden: `accumulation: 'additive'` on a `taken`-direction `damage-modifier` (PR #47 review amendment -- real Bulwark-SHAPED: specializations/shieldbarer.md's actual "- |
| src/engine/__golden__/golden-dot.fixture.ts:4 | was.. | // DamageDealt carries no statusId (it isn't status-caused). Re-derived in 4.1-F2 (was the Phase 3 |
| src/engine/__golden__/golden-dot.fixture.ts:4 | (was | // DamageDealt carries no statusId (it isn't status-caused). Re-derived in 4.1-F2 (was the Phase 3 |
| src/engine/__golden__/golden-dot.fixture.ts:23 | pre-/post- | //   Defence 5 = 4 - 1 = 3 -> floor 3 (min 1 not reached). Same 3 as the pre-H2b2 percent-of-Health |
| src/engine/__golden__/golden-f2-stun-one-turn.fixture.ts:14 | the old | //     skipped turn, not zero (the old round-end countdown expired it before FAST ever acted again) |
| src/engine/__golden__/golden-gloomjaw-ravager.fixture.ts:2 | earlier draft | // identity now (superseding the initial submission's "biggest execute bonus + armor-pen" combo, |
| src/engine/__golden__/golden-h2a-cost.fixture.ts:1 | now+ | // Golden: the COST rule and the DoT-tick exclusion (the tick is now a snapshot-potency status tick). |
| src/engine/__golden__/golden-h2b2-vulnerability-once.fixture.ts:2 | pre-/post- | // so applying Vulnerability twice refreshes the one instance; the pre-H2b2 stack (cap 2) would have |
| src/engine/__golden__/golden-h2c-snapback.fixture.ts:1 | was.. | // Golden: the real Snapjaw Jaws ("Snapback") at 60% of Attack (it was 30% in 4.1-H2c, and 60% before). Re-derived in 4.1-H2d. A content golden: its subject is one named  |
| src/engine/__golden__/golden-h2c-snapback.fixture.ts:1 | (was | // Golden: the real Snapjaw Jaws ("Snapback") at 60% of Attack (it was 30% in 4.1-H2c, and 60% before). Re-derived in 4.1-H2d. A content golden: its subject is one named  |
| src/engine/__golden__/golden-h2d-dot-ticks.fixture.ts:19 | the old | //   E1 Poison: 40 - 10 = 30, E1 1000 -> 970.   (At the old 20%: 20 - 10 = 10.) |
| src/engine/__golden__/golden-h2d-dot-ticks.fixture.ts:20 | the old | //   E2 Burn:   28 - 10 = 18, E2 1000 -> 982.   (At the old 25%: floor(80 x 25 / 100) = 20 -> 10.) |
| src/engine/__golden__/golden-h2d-dot-ticks.fixture.ts:21 | the old | //   E3 Spore:  21 - 10 = 11, E3 1000 -> 989.   (At the old 15%: floor(60 x 15 / 100) = 9 -> |
| src/engine/__golden__/golden-h2d-pollen-cloud.fixture.ts:6 | unchanged | // It also shows Sleep's wake-up is unchanged: nothing in the cast hits, so the sleepers stay |
| src/engine/__golden__/golden-heal-cast.fixture.ts:46 | Slice/H | /** A fixture-only script with an explicit `lowest-hp-ally` rule, authored for this slice's own |
| src/engine/__golden__/golden-heal-cast.fixture.ts:48 | Slice/H | * this slice's own tests; the real spell set is authored in H1-H3"). Since Phase 4.1-C2b (B1) the |
| src/engine/__golden__/golden-hollowkin-wretch-self-dot.fixture.ts:12 | no longer | // so it is never born in any turn). Re-derived in 4.1-F2: the tick is no longer a round-end sweep |
| src/engine/__golden__/golden-hollowkin-wretch.fixture.ts:4 | Slice/H | // in Slice C, given its first real producer here) applies correctly end to end against real |
| src/engine/__golden__/golden-loop-safety.fixture.ts:15 | was.. | //     20×0.3 = 6, floored once, no Defence/pools/chip → 6. (Before 4.1-H2a this was a formula hit |
| src/engine/__golden__/golden-necromoss-reclaim.fixture.ts:7 | the old | // at the old numbers (18 max HP, 2 dead allies), 18*0.05*2 = 1.8 floors to 1, which is also what |
| src/engine/__golden__/golden-necromoss-reclaim.fixture.ts:8 | pre-/post- | // 18*0.03*2 = 1.08 (the pre-review rate) floors to, so that scenario couldn't have caught a |
| src/engine/__golden__/golden-overgrowth-web-exploit.fixture.ts:4 | Slice/H | // stand-in -- matching the Slice F starter-golden precedent ("a direct, content-level exercise"). |
| src/engine/__golden__/golden-overgrowth-web-exploit.fixture.ts:10 | (was | // Weaver's Web Strike fires on-turn-END (it was on-turn-start) -> a |
| src/engine/__golden__/golden-overgrowth-web-exploit.fixture.ts:19 | no longer | // the golden no longer depends on a rolled failure (it did, at 0.8017, when the Web was placed |
| src/engine/__golden__/golden-resonant-harmonize.fixture.ts:8 | originally | // Phase 4 interstitial slice (cumulative spell unlock): originally cast GLOWSPARK_BOLT |
| src/engine/__golden__/golden-resonant-harmonize.fixture.ts:8 | Slice/H | // Phase 4 interstitial slice (cumulative spell unlock): originally cast GLOWSPARK_BOLT |
| src/engine/__golden__/golden-resonant-overtone.fixture.ts:8 | originally | // Phase 4 interstitial slice (cumulative spell unlock): originally cast GLOWSPARK_BOLT |
| src/engine/__golden__/golden-resonant-overtone.fixture.ts:8 | Slice/H | // Phase 4 interstitial slice (cumulative spell unlock): originally cast GLOWSPARK_BOLT |
| src/engine/__golden__/golden-resonant-overtone.fixture.ts:27 | pre-/post- | // pre-hit dispatch, so ITS damage came first; the draws and numbers are unchanged. |
| src/engine/__golden__/golden-resonant-overtone.fixture.ts:27 | unchanged | // pre-hit dispatch, so ITS damage came first; the draws and numbers are unchanged. |
| src/engine/__golden__/golden-rot-sovereign.fixture.ts:6 | replac | // review fix 5 -- both hooks now apply a flat +10% per event, no `magnitudeSource`, replacing the |
| src/engine/__golden__/golden-rot-sovereign.fixture.ts:7 | earlier draft | // earlier draft's mismatched +15%-scaled/+5%-flat split), the two compounding multiplicatively |
| src/engine/__golden__/golden-rot-sovereign.fixture.ts:13 | pre-/post- | // 30 is the pre-4.1-H2c value, the real one is now 45) before WEAK (speed 10) before ADD (speed 1 -- |
| src/engine/__golden__/golden-sorcerer-starter.fixture.ts:23 | was.. | //   ARCANE_BOLT: spellPower 1.0 (it was 0.5), scalingStat unset -> default |
| src/engine/__golden__/golden-sorcerer-starter.fixture.ts:23 | (was | //   ARCANE_BOLT: spellPower 1.0 (it was 0.5), scalingStat unset -> default |
| src/engine/__golden__/golden-sparkeater-voidmaw.fixture.ts:2 | earlier draft | // the whole team, superseding the initial submission's "steal Attack+Defence" (a diluted copy of |
| src/engine/__golden__/golden-sparkeater-voidmaw.fixture.ts:6 | pre-/post- | // (resolution.ts's post-stat-modifier clamp, HpClamped event) -- it bites now; raising every |
| src/engine/__golden__/golden-spider-broodwarden.fixture.ts:21 | was.. | // exact rng.ts algorithm. (Before 4.1-F2 both rolled at turn start; draw #2 = 0.3250 was also a |
| src/engine/__golden__/golden-spider-broodwarden.fixture.ts:22 | unchanged | // miss, so the event log is unchanged.) |
| src/engine/__golden__/golden-splashing.fixture.ts:5 | Slice/H | // combat.ts's executeCastSingle / this slice's dedicated Cast-no-splash unit test. |
| src/engine/__golden__/golden-sporch-cinderlord-burn-refresh.fixture.ts:2 | renamed | // (renamed from golden-sporch-cinderlord-burn-stacks -- the stacking it was named for is gone). It pins the single-instance rule against real content: a fresh target get |
| src/engine/__golden__/golden-sporch-cinderlord-burn-refresh.fixture.ts:7 | pre-/post- | // `StatusApplied` events (ENEMY_B's pre-applied 2 stacks lived in the SETUP, a throwaway events |
| src/engine/__golden__/golden-sporch-cinderlord-burn-refresh.fixture.ts:11 | pre-/post- | // Cinderlord base stats, speed 16; its Health 18 is the pre-4.1-H2c value, the real one is now 30) |
| src/engine/__golden__/golden-sporch-cinderlord-burn-refresh.fixture.ts:32 | was.. | // the percentage was 25% when this was written). |
| src/engine/__golden__/golden-spore-spread-dot-kill.fixture.ts:5 | not yet | // to `cascade.activeInstances` and had not yet removed it by the time its own lethal damage |
| src/engine/__golden__/golden-spore-spread-dot-kill.fixture.ts:8 | no longer | // (`${instanceId}#trigger#${index}`), so the DoT tick and the spread no longer collide. |
| src/engine/__golden__/golden-spore-spread-dot-kill.fixture.ts:9 | used to | // Re-derived in 4.1-F2: the tick is a trigger in the bearer's OWN turn-end hooks (it used to be a |
| src/engine/__golden__/golden-spore-spread-dot-kill.fixture.ts:32 | the old | //     counts down 3 -> 2 (no event). (Under the old sweep it was skipped until round 2.) |
| src/engine/__golden__/golden-stun.fixture.ts:5 | Slice/H | // StatusApplied, on the killing blow) -- reusing Slice B's pinned hook order. |
| src/engine/__golden__/golden-turn-end-dot-kill-burst.fixture.ts:2 | was.. | // end (the born-this-turn rule only protects a status from the turn it was applied in, for its bearer). Re-derived from the PR #64 fix 2 round-end-sweep golden (the swee |
| src/engine/__golden__/golden-turn-end-dot-kill-burst.fixture.ts:3 | deleted | // snapshot and its gate are deleted). The repro: Myconet Rotcore (player-side, real |
| src/engine/__golden__/golden-turn-end-dot-kill-burst.fixture.ts:28 | the old | //     this turn: it ticks (6, source E1, E1 100 -> 94) and counts down 3 -> 2. (Under the old |
| src/engine/__golden__/golden-unicorn-starter.fixture.ts:3 | Slice/H | // HP." Same arithmetic as Slice B's golden-revive.fixture.ts (small, hand-derivable stats, not |
| src/engine/__golden__/golden-web-break-free.fixture.ts:2 | (was | // creature's turn-end cleanup (was turn start) against every current Web-bearer (TurnOrderDef.breakChancePercent), |
| src/engine/actions-gem-side.test.ts:4 | pre-/post- | // either read fails a test. With the field absent, the pre-G1 draw must be unchanged: pinned here |
| src/engine/actions-gem-side.test.ts:4 | unchanged | // either read fails a test. With the field absent, the pre-G1 draw must be unchanged: pinned here |
| src/engine/actions.ts:376 | unchanged | // ---- Execution (the executors, moved from combat.ts unchanged) ---- |
| src/engine/actions.ts:509 | pre-/post- | // B5 (`spec/combat.md#a-target-killed-by-its-pre-hit-hooks-fizzles`): the pre-hit hooks may have killed the target -- that hit fizzles (no |
| src/engine/actions.ts:551 | pre-/post- | * D-A4, byte-identical with the pre-4.1-D direct calls). `cast-target` resolves to `targetId`; a |
| src/engine/actions.ts:551 | byte-identical | * D-A4, byte-identical with the pre-4.1-D direct calls). `cast-target` resolves to `targetId`; a |
| src/engine/actions.ts:552 | pre-/post- | * dead one gets nothing because no verb acts on a corpse (`executeResponse`'s verb rule; pre-4.1-D |
| src/engine/actions.ts:553 | was.. | * this was `applyStatusIfAlive`), so an `apply-status` after a killing hit lands nowhere. |
| src/engine/actions.ts:633 | pre-/post- | // B5: same pre-hit-hook fizzle as executeAttack (no payload, no status); SpellCast stays. |
| src/engine/balance-types.ts:34 | unchanged | * levelRangeWidth.perTenFloors. Default 2, 1 (Phase 4's own width rule, unchanged by 4.1). */ |
| src/engine/balance-types.ts:41 | unchanged | /** Within-species rarity-weighted draw. Default {common:6, uncommon:3, rare:1} (unchanged by |
| src/engine/balance-types.ts:55 | replac | * level (Creature.origin.level, A5), replacing the old floor-scaled placeholder. Default 1. */ |
| src/engine/balance-types.ts:55 | the old | * level (Creature.origin.level, A5), replacing the old floor-scaled placeholder. Default 1. */ |
| src/engine/balance-types.ts:59 | unchanged | * max(bricksMinimum, floor(floor/10) * bricksPerTenFloors). Defaults 1, 1, 1 (unchanged by |
| src/engine/combat.test.ts:74 | used to | // Phase 4.1-B review: `enemy.effects` used to be silently dropped -- `createCombat` |
| src/engine/combat.test.ts:112 | used to | // Phase 4.1-B review: re-feeding a post-setup creature used to be "safe but |
| src/engine/combat.test.ts:112 | pre-/post- | // Phase 4.1-B review: re-feeding a post-setup creature used to be "safe but |
| src/engine/combat.test.ts:114 | now+ | // (A8), it would silently DOUBLE the innate slots instead. Now a thrown error. |
| src/engine/combat.test.ts:180 | regression | // The actual B3 regression probe: unlike the test above (which builds two SEPARATE |
| src/engine/combat.test.ts:182 | was.. | // twice. Before B3, CombatState.rng was a closure shared by reference across every `{ |
| src/engine/combat.test.ts:701 | replac | // Replaces the Phase 3 round-end-sweep refresh test (the sweep is deleted). Z seeds two |
| src/engine/combat.test.ts:701 | deleted | // Replaces the Phase 3 round-end-sweep refresh test (the sweep is deleted). Z seeds two |
| src/engine/combat.test.ts:1167 | now+ | // (the queued perform-action grant) now runs BEFORE it, not after (Phase 4 fired it after). |
| src/engine/combat.test.ts:1348 | Slice/H | // Same numbers as Slice D's golden-defend-count-additive-cap (mechanically identical -- |
| src/engine/combat.ts:47 | pre-/post- | * to an empty Map (matching the pre-S1 positional defaults). |
| src/engine/combat.ts:80 | unchanged | // activeEffects is [] and effective max == base Health, so currentHp is unchanged -- Phase 1/2 |
| src/engine/combat.ts:81 | byte-identical | // fixtures stay byte-identical. |
| src/engine/config.ts:33 | Slice/H | // is transient (call-stack only), never stored in CombatState. Wired in Slice B. |
| src/engine/confusion.test.ts:100 | byte-identical | TITLE an unconfused caster casts at the enemy side as before -- byte-identical, no RNG drawn for the check |
| src/engine/curves.ts:1 | reworked | // Phase 4 Slice A; reworked Phase 4.1-A (A7 + D1 defaults) -- depth-scaling curves for the run |
| src/engine/curves.ts:1 | Slice/H | // Phase 4 Slice A; reworked Phase 4.1-A (A7 + D1 defaults) -- depth-scaling curves for the run |
| src/engine/curves.ts:56 | unchanged | * 6, so fights are 6v6 from floor 6 (`min(6, floor)`, unchanged from Phase 4). */ |
| src/engine/curves.ts:62 | was.. | * Default offset 5 since 4.1-H2c (it was 3), so the narrower |
| src/engine/curves.ts:62 | (was | * Default offset 5 since 4.1-H2c (it was 3), so the narrower |
| src/engine/damage-channels.test.ts:11 | Slice/H | // `damage.test.ts` (the direct formula) is untouched by this slice. |
| src/engine/damage.ts:21 | pre-/post- | * subtractive core. 0 by default -- byte-identical to pre-Slice-B behavior. */ |
| src/engine/damage.ts:21 | byte-identical | * subtractive core. 0 by default -- byte-identical to pre-Slice-B behavior. */ |
| src/engine/damage.ts:21 | Slice/H | * subtractive core. 0 by default -- byte-identical to pre-Slice-B behavior. */ |
| src/engine/damage.ts:24 | byte-identical | * core (Shield Bash's Defence contribution, etc.). 0 by default -- byte-identical to |
| src/engine/damage.ts:25 | pre-/post- | * pre-Slice-B behavior. Feeds the chip floor too, since it scales with the same effOffStat. */ |
| src/engine/damage.ts:25 | Slice/H | * pre-Slice-B behavior. Feeds the chip floor too, since it scales with the same effOffStat. */ |
| src/engine/damage.ts:39 | pre-/post- | // Both default to their pre-Slice-B no-op value (0), so effectiveOffStat === input.offStat and |
| src/engine/damage.ts:39 | Slice/H | // Both default to their pre-Slice-B no-op value (0), so effectiveOffStat === input.offStat and |
| src/engine/dead-target-pins.test.ts:103 | pre-/post- | // pre-4.1-D: `applyStatusIfAlive`), so no StatusApplied is emitted for it. |
| src/engine/effect-types.ts:20 | Slice/H | // The v1 hook vocabulary (13, pinned) plus Phase 4 Slice B's on-[action] family (+4, -> 17), one |
| src/engine/effect-types.ts:21 | Slice/H | // fewer after Slice E2 (below: the never-wired pair out, on-action-observed in, -> 16), plus Phase |
| src/engine/effect-types.ts:24 | originally | // originally-listed on-ally-action/on-enemy-action pair was NEVER WIRED (confirmed dead -- no |
| src/engine/effect-types.ts:80 | not yet | // ---- Forward surface for Slices B/C (declared, not yet consumed) ---- |
| src/engine/effect-types.ts:82 | Slice/H | // ---- Phase 4 Slice D: the count-scaling / resource-primitive vocabulary ---- |
| src/engine/effect-types.ts:101 | byte-identical | * one, so every call site is byte-identical when magnitudeSource is absent. The |
| src/engine/effect-types.ts:104 | Slice/H | * wired to this source in this slice (see StatModifierDef's own comment) -- deferred to whichever |
| src/engine/effect-types.ts:104 | not yet | * wired to this source in this slice (see StatModifierDef's own comment) -- deferred to whichever |
| src/engine/effect-types.ts:105 | Slice/H | * slice first authors a count-scaled stat-modifier (H1's Swarmhive Striker). */ |
| src/engine/effect-types.ts:131 | Slice/H | // ResponseTarget (ASSUMPTION 30's original "not a new engine primitive" framing did not hold -- see the Slice H3 phase record). Resolved like `random-dead-ally` above -- |
| src/engine/effect-types.ts:202 | renamed | /** Flat heal amount (renamed from `amountPerStack`, the concept is gone). A |
| src/engine/effect-types.ts:218 | not yet | * (reading the TARGET's max HP) are deferred, no locked content needs them. */ |
| src/engine/effect-types.ts:244 | Slice/H | * rate" only in this mode (mirrors how a Slice D magnitudeSource substitutes for a |
| src/engine/effect-types.ts:249 | pre-/post- | * already-applied modifier. Absent -- `factor` used directly, byte-identical to pre-Slice- |
| src/engine/effect-types.ts:249 | byte-identical | * already-applied modifier. Absent -- `factor` used directly, byte-identical to pre-Slice- |
| src/engine/effect-types.ts:249 | Slice/H | * already-applied modifier. Absent -- `factor` used directly, byte-identical to pre-Slice- |
| src/engine/effect-types.ts:255 | Slice/H | // Phase 4 Slice B. Target must be DEAD (see ResponseTarget's random-dead-ally). Returns the |
| src/engine/effect-types.ts:260 | Slice/H | // Phase 4 Slice B. Sets `defending`/`provoking` true on the target(s) -- reuses Defend's |
| src/engine/effect-types.ts:302 | replac | // function (replaces the `predicate: ActivationPredicate` function, the one thing that made |
| src/engine/effect-types.ts:319 | Slice/H | // NOTE (resolved in Slice E2): `spec/effects.md#count-scaling` count-scaling primitive names |
| src/engine/effect-types.ts:326 | Slice/H | // function the whole damage-formula/scripting pipeline depends on. Slice E2 resolves this |
| src/engine/effect-types.ts:652 | Slice/H | // rest of this slice's checklist. |
| src/engine/effect-types.ts:663 | Slice/H | /** Phase 4 Slice E2 (`on-action-observed`) and Phase 4.1-H2b1 (`on-damage-observed`): the filter |
| src/engine/effect-types.ts:779 | pre-/post- | * `CrossStatDef.appliesTo`. Absent = `'both'` (byte-identical to pre-amendment behavior -- no |
| src/engine/effect-types.ts:779 | byte-identical | * `CrossStatDef.appliesTo`. Absent = `'both'` (byte-identical to pre-amendment behavior -- no |
| src/engine/effect-types.ts:789 | Slice/H | * accumulation shape `DamageModifierDef`'s own `taken` direction already proved (Slice D's |
| src/engine/effect-types.ts:962 | the old | /** A status instance: the `StatusDef` (its `effects` embedded, as the old def spread |
| src/engine/effect-types.ts:1000 | no longer | * (the dedup flag; not a status stack count, which no longer exists) -- |
| src/engine/effect-types.ts:1064 | replac | * `resolveBaselineEffects`). Plain data (no functions -- `SelfCondition` replacing |
| src/engine/effective-stats.test.ts:135 | the old | // is LESS than the unfloored 34.5*100 (3450): the old (pre-fix) reading would have judged |
| src/engine/effective-stats.test.ts:135 | pre-/post- | // is LESS than the unfloored 34.5*100 (3450): the old (pre-fix) reading would have judged |
| src/engine/effective-stats.ts:64 | replac | * (replaces `predicate: ActivationPredicate`). Self-only, mirroring the old predicate's contract: |
| src/engine/effective-stats.ts:64 | the old | * (replaces `predicate: ActivationPredicate`). Self-only, mirroring the old predicate's contract: |
| src/engine/effects.test.ts:120 | no longer | // Phase 4.1-B review: `resolveBaselineEffects` no longer reads `creature.side` at |
| src/engine/effects.test.ts:306 | pre-/post- | TITLE is byte-identical to the pre-amendment multiplicative default when accumulation is absent |
| src/engine/effects.test.ts:306 | byte-identical | TITLE is byte-identical to the pre-amendment multiplicative default when accumulation is absent |
| src/engine/effects.test.ts:575 | Slice/H | TITLE living-allies-of-species is 0 when no speciesId is set (every Phase 1-3/Slice A-C creature) |
| src/engine/effects.ts:42 | used to | * to pass `registries.traits` used to strip every innate trait with no signal at all. |
| src/engine/effects.ts:277 | Slice/H | /** Phase 4 Slice D, PR #47 review amendment: collapses one `taken`-direction modifier to its |
| src/engine/effects.ts:414 | Slice/H | // ---- Phase 4 Slice C: permanent-passive checks + status-carrying lookups ---- |
| src/engine/effects.ts:492 | Slice/H | // ---- Phase 4 Slice D: resource & counter primitives ---- |
| src/engine/fixture-scripts.test.ts:19 | unchanged | // (__fixtures__/scripts.ts); these are the Phase 2 stock-script tests, moved here unchanged except |
| src/engine/generation-g1.test.ts:28 | Slice/H | // generation's enemy-behaviour rules, split from generation.test.ts so the slice's |
| src/engine/generation-g1.test.ts:202 | no longer | TITLE no other role is a cast role, and always-cast no longer is: an empty pool is fine |
| src/engine/generation.test.ts:493 | before this | // living-allies-of-species was inert (always 0) before this slice wired it through |
| src/engine/generation.test.ts:493 | Slice/H | // living-allies-of-species was inert (always 0) before this slice wired it through |
| src/engine/generation.ts:4 | Slice/H | // FIXTURE biome/species/creature data (`__fixtures__/biomes.ts`); Slice H1-H3 plug in real |
| src/engine/generation.ts:25 | Slice/H | // Slice A ships the SHAPE only (this is the "biome data + spawn pools" row of the phase plan's |
| src/engine/generation.ts:170 | not yet | * this option; nothing produces a non-null `Instance.scriptId` before a future |
| src/engine/generation.ts:171 | Slice/H | * script-assignment phase, but the plumbing is real end to end as of this slice. */ |
| src/engine/generation.ts:189 | no longer | * `gems` fallback (the FIXED-starter-loadout branch of this fallback is deleted -- `SpeciesCreature.equippedSpells` no longer exists; a starter's granted spell is now an  |
| src/engine/generation.ts:189 | now+ | * `gems` fallback (the FIXED-starter-loadout branch of this fallback is deleted -- `SpeciesCreature.equippedSpells` no longer exists; a starter's granted spell is now an  |
| src/engine/generation.ts:189 | deleted | * `gems` fallback (the FIXED-starter-loadout branch of this fallback is deleted -- `SpeciesCreature.equippedSpells` no longer exists; a starter's granted spell is now an  |
| src/engine/generation.ts:272 | Slice/H | * Phase 4 interstitial slice (cumulative spell unlock): every spell whose `unlockedAtBiome` is |
| src/engine/generation.ts:286 | replac | * affinity-matched pool (`spellsUnlockedAt` then `canEquip`). Replaces "a cast-role enemy rolls one |
| src/engine/generation.ts:296 | unchanged | * copy; the body is unchanged. |
| src/engine/generation.ts:396 | no longer | * `allSpells` is the GLOBAL spell registry (no longer a per-biome `spellPool`, Phase 4 |
| src/engine/generation.ts:397 | Slice/H | * interstitial slice) -- together they drive `rollLoadout`'s cumulative-unlock filter. |
| src/engine/interpreter.test.ts:29 | now+ | /** decideAction now returns an unresolved Intent; resolve it the same way |
| src/engine/interpreter.test.ts:31 | unchanged | * unchanged -- only the call site adapts to the new two-step API. */ |
| src/engine/leveling.test.ts:72 | the old | TITLE the Phase-4 placeholder config reproduces the OLD linear curve (100 * level) exactly |
| src/engine/leveling.ts:1 | reworked | // Phase 4 Slice A; XP curve reworked Phase 4.1-A -- creature leveling. Pure, |
| src/engine/leveling.ts:1 | Slice/H | // Phase 4 Slice A; XP curve reworked Phase 4.1-A -- creature leveling. Pure, |
| src/engine/leveling.ts:28 | replac | * depth. Replaces Phase 4's linear `100 * level` placeholder. |
| src/engine/leveling.ts:36 | replac | * awarded to every party member regardless of survival -- replaces Phase 4's floor-scaled |
| src/engine/resolution-types.ts:81 | used to | * replacing the separate `events`/`cascade` arguments every resolution.ts function used to take, |
| src/engine/resolution-types.ts:81 | replac | * replacing the separate `events`/`cascade` arguments every resolution.ts function used to take, |
| src/engine/resolution-types.ts:82 | replac | * and replacing the old echo callback. A response that needs an action run (`perform-action`) |
| src/engine/resolution-types.ts:82 | the old | * and replacing the old echo callback. A response that needs an action run (`perform-action`) |
| src/engine/resolution.test.ts:1247 | was.. | // always-false condition this test used, was deleted in Phase 4.1-C.) |
| src/engine/resolution.test.ts:1247 | deleted | // always-false condition this test used, was deleted in Phase 4.1-C.) |
| src/engine/resolution.test.ts:2577 | the old | // FRESH instance with a new id, B4); by the time the candidate list reaches the old tick |
| src/engine/resolution.test.ts:1169 | regression | TITLE a literal number flatAmount/flatAmount still behaves exactly as before (regression) |
| src/engine/resolution.test.ts:1451 | pre-/post- | TITLE an unset actionKind applies to BOTH (byte-identical to pre-amendment 'both' default) |
| src/engine/resolution.test.ts:1451 | byte-identical | TITLE an unset actionKind applies to BOTH (byte-identical to pre-amendment 'both' default) |
| src/engine/resolution.test.ts:1528 | regression | TITLE clears defending/provoking on the revived creature (F1 regression: a creature that died while defending must not return still defending) |
| src/engine/resolution.ts:209 | pre-/post- | * pre-amendment effect -- none of which set the field -- is unaffected), mirroring |
| src/engine/resolution.ts:299 | replac | * `origin` (it replaces H2b1's `selfInflicted` boolean) is |
| src/engine/resolution.ts:861 | pre-/post- | // undefined, this branch never taken) -- byte-identical to pre-fix-4 behavior. |
| src/engine/resolution.ts:861 | byte-identical | // undefined, this branch never taken) -- byte-identical to pre-fix-4 behavior. |
| src/engine/resolution.ts:865 | pre-/post- | // No count (a trait's own trigger, no magnitudeSource): the implicit 1 -- exact pre-Slice-D |
| src/engine/resolution.ts:865 | Slice/H | // No count (a trait's own trigger, no magnitudeSource): the implicit 1 -- exact pre-Slice-D |
| src/engine/resolution.ts:869 | pre-/post- | // implicit `1`, in the SAME multiplication order as the pre-4.1-D `spell.spellPower * pf`. |
| src/engine/resolution.ts:1030 | pre-/post- | // `spellPower × multiplier` is associated exactly as the pre-4.1-D `sp * pf`. |
| src/engine/resolution.ts:1185 | Slice/H | // Phase 4 Slice E2 (Sleep's on-damage-taken wake-up; future cleanse/dispel). It has a real |
| src/engine/resolution.ts:1185 | not yet | // Phase 4 Slice E2 (Sleep's on-damage-taken wake-up; future cleanse/dispel). It has a real |
| src/engine/resolution.ts:1297 | pre-/post- | * pre-4.1-D cast path on the same primitive. */ |
| src/engine/resolution.ts:1425 | no longer | // the old ordinal-scan-over-a-deterministic-prefix trick is no longer needed. |
| src/engine/resolution.ts:1425 | the old | // the old ordinal-scan-over-a-deterministic-prefix trick is no longer needed. |
| src/engine/scripting-types.ts:95 | Slice/H | // highest-intelligence, random) plus `self` shipped in Phase 2; Phase 4 Slice E completed the |
| src/engine/scripting-types.ts:97 | Slice/H | // the already-existing lowest-hp-ally) so ally-targeting spells/trait responses (the Slice E |
| src/engine/scripting-types.ts:172 | pre-/post- | * Absent = every castable gem, exactly the pre-G1 draw. Read at both sites that read the castable |
| src/engine/spell-effects.test.ts:1 | byte-identical | // Spells carry responses. The re-expression is BYTE-IDENTICAL, so this file has |
| src/engine/spell-effects.test.ts:5 | pre-/post- | //     status, AOE + status). The "old" side is `legacyCast` below: the pre-4.1-D cast executor's |
| src/engine/spell-effects.test.ts:104 | legacy | // ---- The legacy oracle (main@eb37246) ---- |
| src/engine/spell-effects.test.ts:119 | the old | /** How the 4.1-D data re-expression maps an old spell onto `effects` (what the codemod did to |
| src/engine/spell-effects.test.ts:968 | pre-/post- | // SNAPSHOT (pre-4.1-D): off = 10 -> core 10, chip 0.1 -> raw 10.1 -> final 10. |
| src/engine/spell-effects.test.ts:1253 | pre-/post- | //   (60 x 0.15) x 3 = 9 x 3 = 27 -> 27                        (the pre-review trait order) |
| src/engine/spell-effects.test.ts:326 | the old | TITLE 4.1-D equivalence: the old cast payload path vs the new effect list |
| src/engine/spell-effects.test.ts:589 | pre-/post- | TITLE B5 on the cast path: a target killed in its own pre-hit hooks gets NOTHING from the list |
| src/engine/spell-effects.test.ts:1224 | used to | TITLE rejects %s setting both offStat and scalingStat (it used to throw mid-fight) |
| src/engine/spell-effects.test.ts:1247 | the old | TITLE a trait heal scaled by a live count: 26, not the old (stat x sp) x count = 27 |
| src/engine/splashing.test.ts:8 | Slice/H | // Phase 4 Slice C (Proficient Warrior / Annihilate). Fixture-scoped traits only -- per the |
| src/engine/splashing.test.ts:9 | Slice/H | // slice-sequencing rule, this new mechanism is never exercised against the real Phase 4 |
| src/engine/splashing.test.ts:10 | Slice/H | // roster (that's Slice I), just local test content. |
| src/engine/status-containers.test.ts:327 | used to | // Stands in for the real Glow this test used to borrow (deleted): the same shape, a |
| src/engine/status-timing.test.ts:739 | no longer | // tick is the 4.1-H2b2 applier-snapshot potency, no longer a percent of max HP); the grant it |
| src/engine/support-spells.test.ts:161 | Slice/H | // this slice's own support-spell model. target-selectors.test.ts covers the selectors themselves |
| src/engine/support-spells.test.ts:164 | Slice/H | TITLE ally-targeting Cast end-to-end -- highest-attack-ally (Phase 4 Slice E addendum) |
| src/engine/targeting.ts:54 | pre-/post- | * normal resolution, ignoring enemy Provoke entirely. (3) Provoke -- the pre-Slice-C |
| src/engine/targeting.ts:54 | Slice/H | * normal resolution, ignoring enemy Provoke entirely. (3) Provoke -- the pre-Slice-C |
| src/engine/targeting.ts:55 | unchanged | * mechanism, unchanged: if the opposing side has >=1 provoking member, draws one seeded-RNG |
| src/engine/targeting.ts:60 | no longer | * RNG draws are no longer capped at exactly one (Confusion may draw up to two of its own, |
| src/engine/test-utils/golden-runner.ts:30 | pre-/post- | /** per-side effects, absent for every pre-F3 fixture. */ |
| src/engine/test-utils/rng-draw-count.ts:1 | replac | // A test-only helper replacing the old `countingRng` (a closure wrapper |
| src/engine/test-utils/rng-draw-count.ts:1 | the old | // A test-only helper replacing the old `countingRng` (a closure wrapper |
| src/engine/turn-order.ts:22 | pre-/post- | /** Speed-descending, then the shared side/slot/id tie-break -- the pre-Slice-C sort, applied |
| src/engine/turn-order.ts:22 | Slice/H | /** Speed-descending, then the shared side/slot/id tie-break -- the pre-Slice-C sort, applied |
| src/engine/turn-order.ts:39 | pre-/post- | * to the pre-Slice-C single-group sort. Called once per round; never called again mid-round |
| src/engine/turn-order.ts:39 | Slice/H | * to the pre-Slice-C single-group sort. Called once per round; never called again mid-round |
| src/engine/types.ts:35 | Slice/H | * the CASTER's affinity, never the spell's. First consumer: Phase 4 Slice A's generation |
| src/engine/types.ts:45 | Slice/H | /** Who this spell targets (Phase 4 Slice E's Support-spell model, REQUIRED since 4.1-D). |
| src/engine/types.ts:107 | previously | * (gains a `perks` slot, a documented change to the previously-pinned ordering): innate-1 -> innate-2 -> perks (player-side only) -> equipment |
| src/engine/types.ts:263 | Slice/H | /** Precedes a triggered effect's consequences (mirrors AttackDeclared->DamageDealt). Slice B. |
| src/engine/types.ts:289 | replac | * `TriggerFired.effectId` carries. Replaces the old lock's no-op on-turn-start `TriggerFired`. */ |
| src/engine/types.ts:289 | the old | * `TriggerFired.effectId` carries. Replaces the old lock's no-op on-turn-start `TriggerFired`. */ |
| src/engine/types.ts:335 | Slice/H | // slice that owns the mechanism: StatModifierApplied/HpClamped in B, the rest in C). ---- |
| src/engine/types.ts:401 | previously | * too, which is the fix: previously cleanup only ran when the creature went on to act, so a |
| src/state/integration.test.ts:9 | Slice/H | // currency banking math) already rests on Slice A-H3's own focused goldens (and, for the |
| src/state/integration.test.ts:23 | Slice/H | // trait is a direct, content-level exercise of Slice B's action instance-list model (Attack |
| src/state/integration.test.ts:25 | Slice/H | // real content, not just Slice B's own fixture-scoped golden. |
| src/state/integration.test.ts:33 | unchanged | // Two cases: floor 1 (the original Slice I scenario, unchanged by the PR #65 review) and floor |
| src/state/integration.test.ts:33 | Slice/H | // Two cases: floor 1 (the original Slice I scenario, unchanged by the PR #65 review) and floor |
| src/state/integration.test.ts:35 | Slice/H | // runner" gap H1-H3 each deferred (see `spec/run.md#boss-floor-generation` and the Slice I phase-record |
| src/state/integration.test.ts:35 | not yet | // runner" gap H1-H3 each deferred (see `spec/run.md#boss-floor-generation` and the Slice I phase-record |
| src/state/integration.test.ts:57 | no longer | * an unexpected refusal (G5/S5 -- descend no longer throws on success/failure). */ |
| src/state/integration.test.ts:71 | Slice/H | * that turn (Slice B's action instance-list model: a double-strike Attack fires AttackDeclared |
| src/state/integration.test.ts:114 | Slice/H | // has no living target left and never fires (Slice B's action instance-list model, |
| src/state/integration.test.ts:183 | Slice/H | // resurrects a random dead ally at 20% of its baseline max HP") -- Slice B's `revive` |
| src/state/integration.test.ts:187 | used to | // 4.1-H2a re-pin (the Additional): this used to assert `revivedCount > 0`. |
| src/state/integration.test.ts:188 | was.. | // Before the Additional, the Treant Grovekeep fight was a ~50-turn grind of 1-damage chip hits |
| src/state/integration.test.ts:193 | was.. | // not a suppressed trigger, and no Revived event (`revivedCount` was 0). |
| src/state/integration.test.ts:196 | now+ | // fight 2 against the Snapjaw Jaws now runs two events longer. The Brute (33 HP since the |
| src/state/integration.test.ts:214 | was.. | // fizzle, no Revived event. At 30% the opening counter was 30 x 0.3 x 0.75 - 3 = 3.75 -> 3 |
| src/state/integration.test.ts:240 | any more | // floor's draw any more.) |
| src/state/integration.test.ts:256 | Slice/H | // ---- Slice B's action instance-list model, re-proven against real content (per this |
| src/state/integration.test.ts:259 | now+ | // 4.1-H2a re-pin (the Additional shortens every fight): the Brute now takes 4 turns across |
| src/state/integration.test.ts:260 | was.. | // floor 1's 3 fights (was 5), [2, 1, 2, 1] (was [2, 2, 2, 2, 1]): the double-strike still |
| src/state/integration.test.ts:260 | (was | // floor 1's 3 fights (was 5), [2, 1, 2, 1] (was [2, 2, 2, 2, 1]): the double-strike still |
| src/state/integration.test.ts:264 | any more | // 4.1-H2c re-pin (generated-then-checkpoint-verified; first changed by the Health remap): with Health on the 20-45 scale no lone enemy dies to instance 1 any more, so |
| src/state/integration.test.ts:415 | unchanged | // strikers) and every value they pin is UNCHANGED by G2. What does move is the floor-10 event log |
| src/state/integration.test.ts:424 | unchanged | // Beneficiary Pacifies the Unicorn before its first turn). The rule is unchanged: the Unicorn is |
| src/state/integration.test.ts:99 | Slice/H | TITLE Slice I integration: real Brute party through real floor 1 (Overgrowth) |
| src/state/rewards.test.ts:2 | reworked | // Zustand plumbing (store.test.ts covers those integration paths). Reworked Phase 4.1-A (A6, A7) |
| src/state/rewards.test.ts:29 | the old | // The Phase-4 placeholder config reproduces the OLD linear curve |
| src/state/rewards.test.ts:30 | byte-identical | // (xpForNextLevel = 100 * level) exactly -- these four cases are byte-identical to main's own |
| src/state/rewards.test.ts:31 | pre-/post- | // pre-4.1 applyXpGain tests, just now routed through CFG instead of an implicit module constant. |
| src/state/rewards.test.ts:88 | byte-identical | // byte-identical-to-main placeholder block above. |
| src/state/rewards.test.ts:169 | not yet | TITLE throws on a 'fusion' source (Phase 8 not built yet) |
| src/state/rewards.ts:4 | reworked | // Instance shape reworked Phase 4.1-A (A6) -- the save-v1 shape, decided before Phase 5. |
| src/state/rewards.ts:33 | not yet | * . Nothing sets this non-null before a future script-assignment phase, but the |
| src/state/rewards.ts:39 | replac | * materialized (an unknown id throws). Phase 8 replaces the roll with the |
| src/state/rewards.ts:45 | Slice/H | *  -- deriving a fused creature is Phase 8; the variant exists only so this slice's |
| src/state/rewards.ts:108 | unchanged | * unchanged from Phase 4. |
| src/state/rewards.ts:168 | used to | * own pure, independently-testable function -- `descend()` (store.ts) used to inline this same |
| src/state/rewards.ts:171 | regression | * be suffix-parseable too, which is why that particular regression test never actually |
| src/state/store.test.ts:5 | Slice/H | // following Slice A's own precedent (generation.test.ts's constant-stub-RNG traces) rather than |
| src/state/store.test.ts:8 | reworked | // Reworked Phase 4.1-A (G5, S5, G6, A6, A7): descend()/pinBiome() return `{ ok, ... }` instead of |
| src/state/store.test.ts:9 | deleted | // throwing/returning directly; `travelTo` is deleted (G6); the collection is a flat |
| src/state/store.test.ts:11 | byte-identical | // every non-XP number below stays byte-identical to Phase 4 -- only the XP |
| src/state/store.test.ts:61 | now+ | /** The collection is now a flat `Map<InstanceId, Instance>` -- this scans it |
| src/state/store.test.ts:63 | the old | * a given static creatureId, mirroring what the old `collection.get(creatureId)` bucket lookup |
| src/state/store.test.ts:64 | used to | * used to answer directly. */ |
| src/state/store.test.ts:147 | Slice/H | // ---- Stub RNG (deterministic species/creature/level draws -- Slice A's own testing technique) ---- |
| src/state/store.test.ts:202 | regression | // ---- Fixtures for the "wipe with a mid-fight kill" regression (Fix 2) ---- |
| src/state/store.test.ts:241 | regression | // ---- Fixtures for the perk-plumbing regression (Fix 3) ---- |
| src/state/store.test.ts:486 | the old | // suffix-parser from the current origin.templateId lookup -- the old parser sliced exactly |
| src/state/store.test.ts:488 | the old | // real discriminating case (an id/origin pair the old parser would get WRONG) is |
| src/state/store.test.ts:491 | the old | // fight -- kept as a smoke test, not a regression test for the old bug. |
| src/state/store.test.ts:491 | regression | // fight -- kept as a smoke test, not a regression test for the old bug. |
| src/state/store.test.ts:1064 | now+ | // (regenerated in 4.1-G1: the run stream now also feeds four fill creatures and every loadout): |
| src/state/store.ts:8 | Slice/H | // (store.test.ts) run against a fully isolated, deterministic instance built on Slice A's own |
| src/state/store.ts:10 | Slice/H | // framing, necessary for testability without a UI (no Slice-4.5-style demo exists yet to |
| src/state/store.ts:11 | Slice/H | // exercise this against). Slice I's `integration.test.ts` is the deliberate exception: it runs |
| src/state/store.ts:13 | Slice/H | // 4-10 stay the Slice A placeholder shape -- see data/biomes.ts). |
| src/state/store.ts:17 | renamed | // action gets a pure `can...` query sharing its check; `currentFloor` is renamed `lastFloor`; |
| src/state/store.ts:18 | deleted | // `travelTo` is deleted (fast-travel is just `descend`); the collection becomes a flat |
| src/state/store.ts:82 | Slice/H | /** Phase 4 interstitial slice (cumulative spell unlock): the GLOBAL spell registry |
| src/state/store.ts:84 | replac | * affinity) -- replaces the old per-biome `BiomeData.spellPool`. */ |
| src/state/store.ts:84 | the old | * affinity) -- replaces the old per-biome `BiomeData.spellPool`. */ |
| src/state/store.ts:130 | renamed | /** The floor last FOUGHT (renamed from `currentFloor`) -- set by `descend` on |
| src/state/store.ts:271 | unchanged | * Player-reachable failure per G5/S5: returns `{ ok: false, reason }` (state unchanged) instead |
| src/state/store.ts:738 | Slice/H | // Phase 4 interstitial slice (cumulative spell unlock): the biome's 1-based number is its |
| src/state/store.ts:918 | Slice/H | * playable content as of Slices H1-H3; biomes 4-10 stay Slice A's placeholder shape (empty |
| src/state/store.ts:919 | until | * spawn pools) until a future phase authors them -- `descend()` against floor 31+ returns |
| src/state/store.ts:919 | not yet | * spawn pools) until a future phase authors them -- `descend()` against floor 31+ returns |
| src/ui/CombatDemo.tsx:9 | replac | // (Combat UI & feedback) replaces this with real combat presentation once Phase 4 |
| src/ui/CombatDemo.tsx:19 | not yet | // Baseline UI-only demo feature carried forward from Phase 3.5 to all future .5 demos. |
| vite.config.ts:15 | now+ | // The Node project's `include` is now a single catch-all |

### Rewritten in round 2

| file:line (round 1) | marker | old text |
| --- | --- | --- |
| src/engine/combat.test.ts:939 | pre-/post- | TITLE absent scalingStat preserves the pre-Slice-B remap-aware Intelligence lookup |
| src/engine/combat.test.ts:939 | Slice/H | TITLE absent scalingStat preserves the pre-Slice-B remap-aware Intelligence lookup |
| src/engine/__golden__/golden-stun.fixture.ts:83 | used to | // born in VICTIM's) counts down in VICTIM's own turn-end cleanup, inside its bracket (it used / // to expire at the round-end sweep, after TurnEnded). |
| src/engine/__golden__/golden-f2-weaken-three-turns.fixture.ts:3 | unchanged | // counting a Weaken applied after the bearer acted covered only two of its three turns. The / // modifier math is unchanged (...); only WHICH turns it covers moves. |
| src/data/spells/overgrowth.ts:81 | before | // damage, like Pacify and Silence (it dealt 35% before). |
| src/data/traits/index.ts:129 | became | // (the Glowflies' three became the Flickerlings'.) |
| src/data/roles.test.ts:82 | was.. | // Was 'taunter' |
| src/engine/__golden__/golden-spore-spread-dot-kill.fixture.ts:24 | now+ | (a DIFFERENT guard identity / now, per the fix) |
| src/engine/__golden__/golden-sorcerer-starter.fixture.ts:72 | before | (draw #1, the same draw as before) |
| src/engine/__golden__/golden-sorcerer-starter.fixture.ts:9 | stays | so the equipped pool stays size 1 |
| src/engine/__golden__/golden-b2-silenced-refuses-granted-cast.fixture.ts:138 | new | this TriggerFired is the one new event |
| src/engine/__golden__/golden-b1-granted-cast-default.fixture.ts:7 | gains | (the log gains TriggerFired + ActionGranted |
| src/engine/__golden__/golden-h2b1-observed-tick.fixture.ts:2 | Slice/H | H2b2 moved the tick's source to the applier and made it indirect, so this case changed alone |
| src/engine/__golden__/golden-h2b2-tick-self-applied.fixture.ts:4 | Slice/H | the id inference H2b1 refused, in its other spelling |
| src/data/spells/overgrowth.ts:228 | Slice/H | No tuned numbers (H's job). |
| src/engine/__golden__/golden-action-observed.fixture.ts:1 | locked | Resonants' own locked consumer shape |
| src/engine/__golden__/golden-attack-instance-list.fixture.ts:1 | locked | the action instance-list model (locked) |
| src/engine/combat.ts:51 | review | (design-review B-5) |
| src/engine/generation.ts:221 | review | (nit, review) |
| src/engine/perform-action.test.ts:4 | PR | (the PR lists the mutation for each) |
| src/engine/status-containers.test.ts:195 | deliberate change | Stun 1 counts down at the skipped turn's own cleanup (deliberate change) |
| src/engine/__golden__/golden-sleep-wake.fixture.ts:4 | plan item | #1's vs-Sleeping bonus / composed with #1's `conditional-damage-bonus` |
| src/engine/test-utils/rng-draw-count.ts:1 | impossible once | a closure wrapper around `SeededRng.next()`, impossible once `CombatState.rng` is a plain bookmark (the deleted helper) |
| src/engine/generation.ts:169 | yet | nothing produces a non-null `Instance.scriptId` yet |
| src/data/statuses.ts:38 | never actually read | this default is never actually read by current content (`MYCONET_ROTCORE_TRAIT` reads it) |
| src/data/spells/overgrowth.ts:3 | count | 11 real spells ... every other affinity has two (the file has 16) |
| src/data/spells/overgrowth.ts:97 | fixed slot-0 loadout | the Sorcerer starter's innate spell, not a loadout |
| src/engine/spell-effects.test.ts:1224 | used to | TITLE rejects %s setting both offStat and scalingStat (a mid-fight throw) |
| src/data/traits/glimmerdark.ts:247 | flattens to | the biome's affinity spread flattens to 4/4/4/4/2 |
| src/engine/__golden__/golden-resonant-overtone.test.ts:7 | before | TITLE echo damage lands before the original |
| src/engine/effect-types.ts:769 | no existing content | no existing content sets this |
| src/engine/__golden__/golden-necromoss-reclaim.fixture.ts:5 | the species' real | (50, not the species' own real 18) |

### Rewritten in round 3

| file:line (round 2) | marker | old text |
| --- | --- | --- |
| src/engine/generation.test.ts:180 | review | // Nit (review): `ref` is spread only when defined -- no explicit `undefined` key. |
| src/engine/combat.ts:269 | moved | // The action executors (attack/cast/defend/provoke/wait) all moved to actions.ts -- combat.ts only |

## Kept (a live invariant, a scenario step or a term of the code)

| marker | hits | why it stays |
| --- | ---: | --- |
| pre-/post- | 82 | engine and game terms (`pre-hit` hooks, `post-createCombat`, `pre-empts`), not provenance |
| was.. | 41 | a test scenario`s sequence of events (a status that was applied earlier in the fight), not project history |
| unchanged | 35 | states an invariant of the code (a default, a pass-through, a no-op), not a change |
| replac | 30 | the mechanism is replacement (a snapshot replaced by a stronger one, a status replaced in a pass) |
| not yet | 20 | a live state (not yet expired, not yet consumed) or a forward pointer that cites its rule |
| the old | 19 | one side of a test`s own comparison (the old instance vs the new one) or a counterfactual the test pins |
| byte-identical | 17 | a live invariant: a default of 0 or an absent field gives the same result (the golden policy`s word) |
| no longer | 14 | a state inside the fight (a creature no longer alive, a lock no longer in force) or why a stub is impossible |
| regression | 12 | a test`s purpose (a regression probe) or the label `CONVENTIONS.md#two-tier-golden-discipline` requires |
| legacy | 10 | the name of an API or oracle that exists in the code (`legacyCast`, the legacy closure RNG) |
| deleted | 7 | a verb of the mechanism under test (a status removed, a target deleted from a list) |
| Slice/H | 2 | the word slice (a slice of a list), not a project slice |
| renamed | 2 | see the line |
| now+ | 2 | see the line |
| previously | 2 | see the line |
| originally | 1 | see the line |
| until | 1 | see the line |
| before this | 1 | see the line |

The kept lines, one per row:

| file:line | marker | text |
| --- | --- | --- |
| src/app/demoFight.test.ts:12 | not yet | // Presence smoke test, not a golden -- guards against a future retune silently gutting the |
| src/app/demoFight.test.ts:13 | no longer | // demo (traits/statuses no longer firing at all). Pins DEMO_SEED so the demo's |
| src/data/scripts.test.ts:306 | renamed | // `taunter` is `always-provoke` renamed into the role set: the same fight, with only the |
| src/data/specializations.test.ts:106 | unchanged | TITLE a flat (non-leveled) perk returns its fixed effects array unchanged at any purchased level |
| src/data/specializations.ts:115 | unchanged | // the same primitive the Echo/Flurry perk family runs on unchanged. |
| src/data/spells/index.test.ts:21 | not yet | // primary effect keys as spellPower 1, and a status-only spell keys by its status ids. A future |
| src/data/spells/index.ts:48 | Slice/H | * determinism-relevant: `weightedPick` (generation.ts) walks the affinity-filtered slice of this |
| src/data/spells/rotcap-hollow.ts:8 | pre-/post- | // (data/spells/index.test.ts) -- checked by hand against every pre-existing spell below. |
| src/data/statuses.ts:140 | pre-/post- | * (applyDamageAndEmit's existing on-damage-taken point, post-DamageDealt), a "vs Sleeping" payoff |
| src/data/statuses.ts:180 | originally | * on death regardless of which creature/spell originally applied it. When the bearer dies, the |
| src/data/traits/core.ts:4 | replac | // passive shape, until the actual creature roster replaces it |
| src/data/traits/core.ts:44 | pre-/post- | * formula). Death pre-empts it — a creature killed by the hit does not retaliate. */ |
| src/data/traits/glimmerdark.ts:104 | not yet | * acts first starting NEXT round (re-application refreshes; it affects future rounds' turn order only, like Overgrowth's Weaver Webbing an enemy -- though the Weaver plac |
| src/data/traits/glimmerdark.ts:310 | pre-/post- | * target's CURRENT hp down, resolution.ts's post-stat-modifier clamp -- it bites) and raises |
| src/data/traits/index.ts:105 | replac | // own registry entries alongside the representative-and-temporary set above, never replacing |
| src/data/traits/rotcap-hollow.ts:102 | Slice/H | /** Rotfeeder Ripper (payoff, uncommon): every KILL it personally lands restores a slice of its |
| src/engine/__corpus__/corpus.ts:169 | replac | /** Slot 1: replacing it if the party already has one, appending it (as the new slot 1) if the |
| src/engine/__corpus__/corpus.ts:399 | byte-identical | // the coverage fights ride on no role's draws and stay byte-identical when roles change. The defaults below |
| src/engine/__corpus__/corpus.ts:500 | not yet | /** One fight per specialization, then a variant wherever a perk did not yet matter in it (the |
| src/engine/__fixtures__/balance.ts:14 | pre-/post- | *    floor (curves.ts's post-100 branch only needs perFloorAfter100Hundredths to diverge, and it |
| src/engine/__fixtures__/biomes.ts:150 | byte-identical | // byte-identical (see `spec/run.md#boss-floor-generation`). |
| src/engine/__fixtures__/creatures.ts:41 | pre-/post- | * override is only useful for a test constructing a post-fight-setup `Creature` directly. */ |
| src/engine/__fixtures__/held-statuses.test.ts:6 | replac | TITLE replaces only the potency percent: the held def equals the real def apart from it |
| src/engine/__fixtures__/held-statuses.ts:4 | replac | // REAL `StatusDef` spread with only `potency.percent` replaced: the effects, polarity, duration and |
| src/engine/__golden__/golden-6v6-scripted.fixture.ts:8 | regression | // GENERATED then CHECKPOINT-VERIFIED -- an integration/regression golden per |
| src/engine/__golden__/golden-6v6-scripted.fixture.ts:107 | unchanged | // provoke redirects) is unchanged, confirmed by re-running this fixture. |
| src/engine/__golden__/golden-b2-silenced-refuses-granted-cast.fixture.ts:137 | was.. | // The grant's trigger fired (chance rolled, draw #1) and the grant was then refused by the Cast |
| src/engine/__golden__/golden-b2-skipped-turn-refuses-granted-cast.fixture.ts:10 | was.. | // spellPower 0.5) -- so if the gate were removed there IS something castable to cast. |
| src/engine/__golden__/golden-b2-skipped-turn-refuses-granted-cast.fixture.ts:10 | deleted | // spellPower 0.5) -- so if the gate were removed there IS something castable to cast. |
| src/engine/__golden__/golden-b2-skipped-turn-refuses-granted-cast.fixture.ts:179 | was.. | // The grant was then refused by the skipped-turn gate: NO ActionGranted, NO SpellCast, NO |
| src/engine/__golden__/golden-b4-cleanse-then-tick.fixture.ts:4 | no longer | // though its status instance no longer exists on the creature by the time its own turn in the |
| src/engine/__golden__/golden-b4-remove-then-reapply.fixture.ts:2 | the old | // reapplied within the SAME hook pass gets a genuinely new instance; the OLD instance's own |
| src/engine/__golden__/golden-b4-remove-then-reapply.fixture.ts:10 | the old | // effect 3 (apply-fresh), the OLD status's own tick trigger]. Effect 2 fires first (removes the |
| src/engine/__golden__/golden-b4-remove-then-reapply.fixture.ts:12 | the old | // counter); by the time the OLD tick candidate comes up, its exact owning instance is gone |
| src/engine/__golden__/golden-b4-remove-then-reapply.fixture.ts:15 | the old | // DIFFERENT from the old one is covered by resolution.test.ts's own unit test, which can inspect |
| src/engine/__golden__/golden-b4-remove-then-reapply.fixture.ts:128 | the old | // Candidate 1 (effect 2, remove): fires -- the OLD instance is gone. |
| src/engine/__golden__/golden-b4-remove-then-reapply.fixture.ts:136 | replac | // Candidate 2 (effect 3, apply-fresh): fires -- a brand-new instance replaces it. |
| src/engine/__golden__/golden-b4-remove-then-reapply.fixture.ts:150 | the old | // Candidate 3 (the OLD status's own tick, captured before either of the above ran): skipped |
| src/engine/__golden__/golden-b4-remove-then-reapply.fixture.ts:151 | no longer | // silently -- its exact owning instance no longer exists. No third TriggerFired, no |
| src/engine/__golden__/golden-b5-cast-fizzle.fixture.ts:1 | pre-/post- | // Golden: the pre-hit-hook fizzle on the CAST path -- the twin of |
| src/engine/__golden__/golden-b5-cast-fizzle.fixture.ts:4 | pre-/post- | // pre-hit hooks: the hit fizzles (no damage, no status), SpellCast stays, and the caster's second |
| src/engine/__golden__/golden-b5-cast-fizzle.fixture.ts:21 | pre-/post- | //   died in its own pre-hook -> NO DamageDealt for the spell, NO StatusApplied. |
| src/engine/__golden__/golden-b5-cast-fizzle.test.ts:6 | pre-/post- | TITLE golden replay: the pre-hit-hook fizzle on the Cast path -- fizzle + rule 4 re-target |
| src/engine/__golden__/golden-b5-fizzle-rule4-retarget.fixture.ts:1 | pre-/post- | // Golden: the pre-hit-hook fizzle + rule 4 -- a Brute-style two-instance attacker whose first hit's |
| src/engine/__golden__/golden-b5-fizzle-rule4-retarget.fixture.ts:20 | pre-/post- | //   C 5 -> 0, CreatureDied(C). The target died in its own pre-hit hooks, so the main hit |
| src/engine/__golden__/golden-b5-fizzle-rule4-retarget.test.ts:6 | pre-/post- | TITLE golden replay: pre-hit-hook fizzle + rule 4 re-target |
| src/engine/__golden__/golden-b6-provoke-stun-cleanup.fixture.ts:178 | no longer | // flag from round 1 is cleared here, not carried into a redirect that no longer applies. |
| src/engine/__golden__/golden-blindclaws-striker.fixture.ts:17 | was.. | //   STRIKER's turn: round 1's queue was already frozen BEFORE the grant landed, so STRIKER is |
| src/engine/__golden__/golden-cheat-death.fixture.ts:82 | unchanged | // unchanged -- only remainingHp reflects the save |
| src/engine/__golden__/golden-conditional-trigger.fixture.ts:4 | pre-/post- | // Condition is evaluated self-scoped against LIVE state (post-damage currentHp) at fire time. |
| src/engine/__golden__/golden-conditional-trigger.fixture.ts:16 | pre-/post- | //   R3: X  6 →  0. killed → on-damage-taken pre-empted by death → no retaliation. |
| src/engine/__golden__/golden-conditional-trigger.fixture.ts:107 | pre-/post- | // Killed -> death pre-empts on-damage-taken -> no retaliation. |
| src/engine/__golden__/golden-d3-revive-cap-exclusion.fixture.ts:9 | pre-/post- | // "post-createCombat setup step" pattern golden-dot.fixture.ts's own header comment documents |
| src/engine/__golden__/golden-d3-revive-cap-exclusion.fixture.ts:25 | no longer | //     (still dead, still at the cap) -- no Revived event at all, and the log no longer matches. |
| src/engine/__golden__/golden-d3-revive-cap-exclusion.fixture.ts:28 | not yet | // future change that makes this roll draw zero or two times fails loudly too. |
| src/engine/__golden__/golden-d3-revive-cap-exclusion.fixture.ts:103 | pre-/post- | // createCombat resets currentHp/revivesUsed at fight-setup, so the pre-capped, |
| src/engine/__golden__/golden-d3-revive-cap-exclusion.fixture.ts:104 | pre-/post- | // pre-dead starting state has to be applied here, after creation -- see this fixture's own |
| src/engine/__golden__/golden-d3-revive-cap-fizzle.fixture.ts:9 | pre-/post- | // CAPPED starts dead and already at the cap (set post-createCombat, same pattern as that |
| src/engine/__golden__/golden-dot.fixture.ts:47 | pre-/post- | /** Applied post-createCombat by golden-dot.test.ts -- see the header comment above for why. */ |
| src/engine/__golden__/golden-f2-turn-end-interaction.fixture.ts:18 | was.. | //     MATE waits; the Spore was applied in ANOTHER creature's turn, so it is not born for MATE: |
| src/engine/__golden__/golden-f2-turnstart-self-stun-once.fixture.ts:2 | was.. | // turn (the lock is read after the turn-start hooks) and, because it was applied |
| src/engine/__golden__/golden-f2-weaken-three-turns.fixture.ts:1 | was.. | // Golden: a 3-turn Weaken covers its bearer's next three turns whether it was applied before or |
| src/engine/__golden__/golden-f2-weaken-three-turns.fixture.ts:4 | unchanged | // modifier math is unchanged (Weaken -20% dealt, additive into the dealt pool); only WHICH turns it |
| src/engine/__golden__/golden-g1-leech-sovereign-pacified.fixture.ts:44 | was.. | // the status was applied before her action slot, so it is not "born this turn" and counts. Nothing |
| src/engine/__golden__/golden-gloomjaw-executioner.fixture.ts:16 | now+ | //   Round 2: EXECUTIONER->FOE2 (now the only living enemy), reading its NOW-buffed Attack: off |
| src/engine/__golden__/golden-h2a-additional-levels.fixture.ts:4 | pre-/post- | // and nothing modifies it. rawDamage stays the formula's pre-clamp value. |
| src/engine/__golden__/golden-h2b1-observed-lethal.fixture.ts:23 | no longer | //  5. The heal (the Wick's second effect) is SKIPPED: the Wick is no longer alive, so no |
| src/engine/__golden__/golden-h2b1-observed-tick.fixture.ts:4 | byte-identical | // (golden-h2b1-observed-silent) stayed byte-identical. |
| src/engine/__golden__/golden-h2b1-wick-burn-heal.fixture.ts:62 | pre-/post- | /** createCombat resets HP, so the wound is a post-creation step. */ |
| src/engine/__golden__/golden-h2b2-reapply.fixture.ts:3 | replac | // (even when shorter), and replaces the applier snapshot ONLY when the new potency is STRICTLY |
| src/engine/__golden__/golden-h2b2-reapply.fixture.ts:21 | replac | //   R2: P2 applies: same instance, remaining 1 -> 3; 10 > 6 so the snapshot is REPLACED (P2/10). |
| src/engine/__golden__/golden-h2b2-reapply.fixture.ts:25 | was.. | //   R4: nobody applies. E's tick 10 (source P2) 974 -> 964; countdown 3 -> 2. (Were the weaker |
| src/engine/__golden__/golden-h2b2-reapply.test.ts:6 | replac | TITLE golden replay: a status re-applied keeps one instance, refreshes its timer, and replaces its snapshot only when strictly stronger |
| src/engine/__golden__/golden-h2b2-reapply.test.ts:7 | replac | TITLE matches the committed event log exactly (stronger replaces, weaker refreshes only, a tie keeps the current applier) |
| src/engine/__golden__/golden-h2b2-tick-dead-applier.fixture.ts:20 | was.. | //     B is the logged source only, NOT a dealer: its Dealer trait stays silent (were the fallback a |
| src/engine/__golden__/golden-h2b2-tick-kill-on-death.fixture.ts:14 | was.. | //   DamageDealt on A. (Were the applier offered as the source, A would take an indirect hit of |
| src/engine/__golden__/golden-h2d-dot-ticks.fixture.ts:5 | the old | // hand-written snapshot would not fail at an old percentage). Each tick sits above the minimum of 1. |
| src/engine/__golden__/golden-h2d-pollen-cloud.fixture.ts:6 | until | // asleep until a LATER hit from another source lands, and that hit wakes only its own target. |
| src/engine/__golden__/golden-heal-scaling-count.fixture.ts:7 | pre-/post- | // dead (a pre-wiped party member, per `spec/combat.md#turn-queue` -- never gets a turn, |
| src/engine/__golden__/golden-hollowkin-wretch-self-dot.fixture.ts:2 | was.. | // tick (applier = bearer) has the bearer as its source; were `on-damage-taken`'s hook context |
| src/engine/__golden__/golden-hollowkin-wretch-self-dot.fixture.ts:103 | pre-/post- | /** Post-`createCombat` step: pre-apply Poison to WRETCH before any turn resolves, into a throwaway |
| src/engine/__golden__/golden-loop-safety.fixture.ts:6 | pre-/post- | // lethal hit — death pre-empts on-damage-taken.) |
| src/engine/__golden__/golden-loop-safety.fixture.ts:99 | pre-/post- | // No reckless here: the hit killed X (death pre-empts on-damage-taken). |
| src/engine/__golden__/golden-necromoss-reclaim.fixture.ts:9 | regression | // regression to the wrong rate. Here: 50*0.05*3 = 7.5 -> floors to 7; the WRONG rate (0.03) would |
| src/engine/__golden__/golden-necromoss-reclaim.fixture.ts:17 | pre-/post- | // (applied post-createCombat, same idiom golden-dot.fixture.ts uses -- createCombat resets |
| src/engine/__golden__/golden-necromoss-reclaim.fixture.ts:40 | pre-/post- | /** Applied post-createCombat by golden-necromoss-reclaim.test.ts -- see the header comment above. */ |
| src/engine/__golden__/golden-provoke-redirect.fixture.ts:81 | no longer | * override no longer applies -- hero's selector resolves normally to weakling (the only |
| src/engine/__golden__/golden-rot-sovereign.fixture.ts:18 | pre-/post- | //     floor(20.2) = 20. ADD (wounded to 5 post-createCombat) 5 - 20 -> 0, dies. |
| src/engine/__golden__/golden-rot-sovereign.fixture.ts:29 | pre-/post- | //     post-createCombat) 5 - 24 -> 0, dies -- proving the ally-death growth already fed this very |
| src/engine/__golden__/golden-rot-sovereign.fixture.ts:33 | was.. | //     TARGET (WEAK's only living ally) was ALSO blanketed with Spore in that same firing and is |
| src/engine/__golden__/golden-rot-sovereign.fixture.ts:58 | pre-/post- | /** Applied post-createCombat by golden-rot-sovereign.test.ts -- see the header comment above. */ |
| src/engine/__golden__/golden-round-end-interaction.fixture.ts:16 | pre-/post- | //   E1 health 30: R1 30->15. R2 15->3. R3 3-12 clamped to 0 -> dies. Win, checked post-action |
| src/engine/__golden__/golden-round-end-interaction.fixture.ts:93 | pre-/post- | // on-death fires (self-destruct's lethal hit pre-empted P1's own on-damage-taken, but |
| src/engine/__golden__/golden-round-end-interaction.fixture.ts:122 | not yet | // -- P2's cleanup counted its Weaken down 2 -> 1 (no event): still active, not yet expired. -- |
| src/engine/__golden__/golden-scripted-1v1.fixture.ts:61 | no longer | * 20 -> 19. Hero's hit (sentry no longer defending): core=max(20-10,0)=10, chip=0.2, |
| src/engine/__golden__/golden-sleep-wake.fixture.ts:18 | was.. | //   SLEEPER's own turn: no lock is left (the Sleep was removed on ATTACKER's turn, same |
| src/engine/__golden__/golden-sleep-wake.fixture.ts:18 | deleted | //   SLEEPER's own turn: no lock is left (the Sleep was removed on ATTACKER's turn, same |
| src/engine/__golden__/golden-sparkeater-voidmaw.fixture.ts:6 | pre-/post- | // (resolution.ts's post-stat-modifier clamp, HpClamped event); raising every |
| src/engine/__golden__/golden-sparkeater-voidmaw.fixture.ts:18 | pre-/post- | //     20, chip 0.2 -> raw 20.2 -> final 20. TARGET 45 (post-clamp) - 20 = 25, survives. |
| src/engine/__golden__/golden-spider-broodwarden.fixture.ts:17 | was.. | // Web-bearer at EVERY creature's turn end, including Broodwarden's own. Both Webs were applied at |
| src/engine/__golden__/golden-sporch-cinderlord-burn-refresh.fixture.ts:13 | pre-/post- | //     floor(22.22) = 22. VICTIM (wounded to 5 post-createCombat) 5 - 22 -> 0, dies. |
| src/engine/__golden__/golden-sporch-cinderlord-burn-refresh.fixture.ts:18 | pre-/post- | //     ENEMY_B (pre-applied Burn at duration:1 -- deliberately NOT Burn's own default of 3, so |
| src/engine/__golden__/golden-sporch-cinderlord-burn-refresh.fixture.ts:23 | pre-/post- | //       overwriting the pre-existing 1). Its snapshot stays ENEMY_B's own (the stronger one: |
| src/engine/__golden__/golden-sporch-cinderlord-burn-refresh.fixture.ts:47 | pre-/post- | /** Applied post-createCombat by the test -- see the header comment above. */ |
| src/engine/__golden__/golden-spore-spread-dot-kill.fixture.ts:5 | not yet | // instanceId to `cascade.activeInstances` and not yet have removed it by the time its own lethal |
| src/engine/__golden__/golden-spore-spread-dot-kill.fixture.ts:29 | was.. | //   MATE's turn: the Spore was applied in BEARER's turn, so for MATE it is NOT born this turn: at |
| src/engine/__golden__/golden-spore-spread-dot-kill.fixture.ts:53 | pre-/post- | /** Applied post-createCombat by the test -- see the header comment above. */ |
| src/engine/__golden__/golden-spore-spread-filter.fixture.ts:9 | pre-/post- | // pre-applied Spore (its own on-death spread trigger only exists while it carries the status), |
| src/engine/__golden__/golden-spore-spread-filter.fixture.ts:24 | pre-/post- | //     floor(20.2) = 20. BEARER (wounded to 10 post-createCombat) 10 - 20 -> 0, dies. |
| src/engine/__golden__/golden-spore-spread-filter.fixture.ts:48 | pre-/post- | /** Applied post-createCombat by the test -- see the header comment above. */ |
| src/engine/__golden__/golden-spore-spread-fizzle.fixture.ts:14 | pre-/post- | // living ally, ALLY, are pre-applied Spore before any turn resolves (a throwaway events array), |
| src/engine/__golden__/golden-spore-spread-fizzle.fixture.ts:20 | pre-/post- | //     floor(20.2) = 20. BEARER (wounded to 10 post-createCombat) 10 - 20 -> 0, dies. |
| src/engine/__golden__/golden-spore-spread-fizzle.fixture.ts:43 | pre-/post- | /** Applied post-createCombat by the test -- see the header comment above. */ |
| src/engine/__golden__/golden-spore-spread.fixture.ts:3 | pre-/post- | // same attack's damage kills the (pre-wounded) target, and Spore's own `on-death` trigger |
| src/engine/__golden__/golden-spore-spread.fixture.ts:11 | pre-/post- | // 10 HP (applied post-createCombat, same idiom golden-dot.fixture.ts uses -- createCombat resets |
| src/engine/__golden__/golden-spore-spread.fixture.ts:20 | pre-/post- | //   on-attack fires BEFORE the attack's own damage (`spec/combat.md#a-target-killed-by-its-pre-hit-hooks-fizzles`): SEEDER's Infest trait applies |
| src/engine/__golden__/golden-spore-spread.fixture.ts:50 | pre-/post- | /** Applied post-createCombat by golden-spore-spread.test.ts -- see the header comment above. */ |
| src/engine/__golden__/golden-sporecloud-reaper-no-spore.fixture.ts:14 | pre-/post- | //   on-attack fires BEFORE the attack's own damage (`spec/combat.md#a-target-killed-by-its-pre-hit-hooks-fizzles`): Bloomburst's bonus rider rolls |
| src/engine/__golden__/golden-stun.fixture.ts:4 | pre-/post- | // its TurnStarted/TurnEnded. Also exercises death pre-empting on-damage-taken (no re-stun, no new |
| src/engine/__golden__/golden-stun.fixture.ts:10 | pre-/post- | //   to 0 (dies) -- death pre-empts on-damage-taken, so no re-stun this time. |
| src/engine/__golden__/golden-stun.fixture.ts:91 | pre-/post- | // No re-stun here: the hit killed VICTIM, and death pre-empts on-damage-taken. |
| src/engine/__golden__/golden-triggered-damage.fixture.ts:4 | pre-/post- | // (death pre-empts the victim's on-damage-taken, per the pinned damage-path hook order). |
| src/engine/__golden__/golden-triggered-damage.fixture.ts:115 | pre-/post- | // No retaliation here: the hit killed FOE, and death pre-empts on-damage-taken. |
| src/engine/__golden__/golden-triggered-damage.test.ts:6 | pre-/post- | TITLE golden replay: triggered damage (retaliate), TriggerFired + death pre-emption |
| src/engine/__golden__/golden-turn-end-dot-kill-burst-refresh.fixture.ts:6 | replac | // end), and the snapshot is replaced because the new potency is strictly greater. |
| src/engine/__golden__/golden-turn-end-dot-kill-burst-refresh.fixture.ts:20 | replac | //     REPLACES it. StatusApplied(E1, poison, duration 3, source ROTCORE). |
| src/engine/__golden__/golden-turn-end-dot-kill-burst-refresh.fixture.ts:21 | replac | //   E1's turn end (round 1): not born for E1 -> ticks the replaced snapshot: 10 - 4 = 6, E1 100 -> |
| src/engine/__golden__/golden-turn-end-dot-kill-burst-refresh.fixture.ts:22 | was.. | //     94, sourced from E1 (the applier ROTCORE is dead -> the bearer is the logged source). Were the |
| src/engine/__golden__/golden-turn-end-dot-kill-burst-refresh.fixture.ts:45 | pre-/post- | /** Applied post-createCombat by the test -- see the header comment above. */ |
| src/engine/__golden__/golden-turn-end-dot-kill-burst-refresh.test.ts:7 | replac | TITLE matches the committed event log exactly (Rotcore's death-Poison replaces the weaker snapshot on E1's existing Poison in Rotcore's turn, so E1 ticks the stronger pot |
| src/engine/__golden__/golden-turn-end-dot-kill-burst.fixture.ts:2 | was.. | // end (the born-this-turn rule only protects a status from the turn it was applied in, for its bearer). The case: Myconet Rotcore (player-side, real |
| src/engine/__golden__/golden-turn-end-dot-kill-burst.fixture.ts:26 | was.. | //   E1's turn end (round 1): the Poison was applied in ROTCORE's turn, so for E1 it is NOT born |
| src/engine/__golden__/golden-turn-end-dot-kill-burst.fixture.ts:49 | pre-/post- | /** Applied post-createCombat by the test -- see the header comment above. */ |
| src/engine/__golden__/golden-web-break-free.fixture.ts:11 | was.. | // was applied at fight start (not born in any turn), so that cleanup rolls it. |
| src/engine/actions-gem-side.test.ts:4 | unchanged | // either read fails a test. With the field absent, the draw from before the field existed must be unchanged: pinned here |
| src/engine/actions-gem-side.test.ts:160 | unchanged | TITLE with `gemSide` absent, today's random draw is unchanged |
| src/engine/actions.test.ts:589 | previously | // The previously chosen ally is dead, so BOTH instances fall back to the lowest-HP living |
| src/engine/actions.ts:15 | pre-/post- | // fallback is the side-aware default then Provoke; and a hit whose target died in its own pre-hit |
| src/engine/actions.ts:16 | pre-/post- | // hooks fizzles (`spec/combat.md#a-target-killed-by-its-pre-hit-hooks-fizzles`). |
| src/engine/actions.ts:94 | deleted | * rest of the queue is dropped (a wipe ends the turn at once). Supplied by `resolveTurn`. */ |
| src/engine/actions.ts:245 | pre-/post- | * `acted-before-target` peek calls it pre-draw and treats `undefined` as "no default, no peek". */ |
| src/engine/actions.ts:415 | pre-/post- | * no trigger/re-entrancy/loop-guard involvement here -- this is a pre-computed execution plan. |
| src/engine/actions.ts:470 | pre-/post- | * its own pre-hit hooks). Read fresh from `working`, never from the `actor` snapshot the executor |
| src/engine/actions.ts:510 | pre-/post- | // (`spec/combat.md#a-target-killed-by-its-pre-hit-hooks-fizzles`) the pre-hit hooks may have killed the target -- that hit fizzles (no |
| src/engine/actions.ts:634 | pre-/post- | // Same pre-hit-hook fizzle as executeAttack (no payload, no status); SpellCast stays. |
| src/engine/actions.ts:664 | was.. | // Provoke was already exempt for every AOE regardless of side (`spec/combat.md#provoke`). |
| src/engine/actions.ts:699 | no longer | // Skip a frozen-list target that's no longer alive by the time its hit lands (a prior |
| src/engine/actions.ts:701 | unchanged | // unchanged; this only skips *hitting* an already-dead member. |
| src/engine/actions.ts:724 | pre-/post- | // from `working` (not the pre-hook `actor`) in case an on-defend response somehow touched it, |
| src/engine/actor-death.test.ts:54 | pre-/post- | /** A permanent hook -> lethal flat hit on the bearer itself (kills the actor in its own pre-hit hooks). */ |
| src/engine/combat.test.ts:112 | pre-/post- | // Re-feeding a post-setup creature throws: silently recomputing it from scratch would, for a |
| src/engine/combat.test.ts:179 | regression | // The regression probe for a shared RNG closure: unlike the test above (which builds two |
| src/engine/combat.test.ts:1128 | no longer | // mulberry32 math -- an arbitrary-value stub is no longer possible. Instead these tests set |
| src/engine/combat.test.ts:1273 | now+ | // Round 1: LURE provokes; on-provoke grants itself Defending too. LURE now carries both |
| src/engine/combat.ts:80 | unchanged | // activeEffects is [] and effective max == base Health, so currentHp is unchanged. |
| src/engine/combat.ts:197 | deleted | * status instance is removed and StatusExpired emitted; the frozen current-round turnQueue is |
| src/engine/conditions.ts:137 | unchanged | // (unchanged path, RNG-free peek); falls back to the already-resolved trigger/gather target |
| src/engine/conditions.ts:160 | unchanged | * delegates to `evaluateCondition` unchanged, whose exhaustive `never` arm is untouched, so the |
| src/engine/corpus-coverage.test.ts:242 | was.. | // dead-applier tick (a self-applied one was applied by the bearer). A spread is Spore's own |
| src/engine/corpus-digest.test.ts:4 | byte-identical | // fixture (`__corpus__/corpus-digest.fixture.ts`). Byte-identical PRs leave the fixture |
| src/engine/corpus-digest.test.ts:5 | unchanged | // unchanged; a deliberate-change PR regenerates it (`npm run corpus:update`) and attributes |
| src/engine/damage.test.ts:98 | byte-identical | TITLE armorPenetrationPercent at 0 (default) is byte-identical to no penetration |
| src/engine/damage.test.ts:124 | byte-identical | TITLE crossStatBonus at 0 (default) is byte-identical to no bonus |
| src/engine/damage.ts:79 | pre-/post- | /** A direct hit's result with the Additional added to the integer damage (`rawDamage` stays the formula's pre-clamp value). */ |
| src/engine/effect-types.ts:96 | byte-identical | * byte-identical when magnitudeSource is absent. The count is a LIVE board count, recomputed on |
| src/engine/effect-types.ts:212 | not yet | * (reading the TARGET's max HP) are deferred, no content needs them. */ |
| src/engine/effect-types.ts:268 | not yet | // polarity-based filter (`'buff' | 'debuff'`, reading StatusDef.polarity) is a natural future |
| src/engine/effect-types.ts:269 | not yet | // widening for the first cleanse/dispel spell, not built until there's a real producer/consumer |
| src/engine/effect-types.ts:627 | pre-/post- | * post-spellPower, before the subtractive core -- for actions matching `appliesTo` |
| src/engine/effect-types.ts:916 | not yet | * status -- consumed by `remove-status`'s future polarity-filter branch (cleanse/dispel). */ |
| src/engine/effect-types.ts:938 | replac | * application; a re-application replaces it only when strictly stronger. */ |
| src/engine/effect-types.ts:940 | was.. | /** `CombatState.turnClock` when this instance was applied or last |
| src/engine/effect-types.ts:972 | was.. | * which one supplied it. `statusId` is present only when the source was a status. */ |
| src/engine/effect-types.ts:981 | was.. | * one too; it is undefined only when none was authored. */ |
| src/engine/effect-types.ts:999 | replac | * status instance an EARLIER candidate in the same pass already removed or replaced). */ |
| src/engine/effects.test.ts:190 | unchanged | // Already below max: unchanged (no auto-heal). |
| src/engine/effects.test.ts:143 | byte-identical | TITLE is byte-identical whether side effects are omitted or an empty list |
| src/engine/effects.ts:190 | not yet | * hook-type index is deferred until profiling shows it's needed). The alive/death gating is the |
| src/engine/effects.ts:211 | replac | // removed (cleansed) or replaced earlier in the SAME hook pass must not let a stale |
| src/engine/effects.ts:321 | unchanged | * of `hasStatus` from THIS module keeps working unchanged. */ |
| src/engine/effects.ts:335 | pre-/post- | * post-spellPower, before the subtractive core) -- sums `percentPerRank × |
| src/engine/environment.test.ts:6 | regression | // the jsdom project instead (a config regression), both assertions below would fail. |
| src/engine/generation-g1.test.ts:238 | was.. | // 31 draws in all. Were the fill drawn BEFORE the add, the add's level would read draw 3 as a |
| src/engine/generation.test.ts:150 | unchanged | TITLE passes through a supplied gems loadout unchanged |
| src/engine/generation.ts:262 | renamed | * list, so a renamed role cannot silently stop being a cast role. |
| src/engine/generation.ts:412 | unchanged | * path below unchanged. |
| src/engine/injured-allies.test.ts:132 | unchanged | TITLE delegates every scripting condition to evaluateCondition unchanged |
| src/engine/leveling.test.ts:7 | unchanged | TITLE returns base stats unchanged at level 1 (factor === 1) |
| src/engine/leveling.ts:10 | unchanged | * base unchanged (factor === 1). |
| src/engine/resolution-types.ts:88 | not yet | /** The `perform-action` grants raised in this scope and not yet run (see `QueuedGrant`). A |
| src/engine/resolution-types.ts:93 | unchanged | * (if given) then executes it. A no-op (returns `state` unchanged, nothing drawn, nothing pushed) |
| src/engine/resolution.test.ts:911 | regression | // floor(11.025) = 11 -- this test guards against that regression (it fails, returning 11, |
| src/engine/resolution.test.ts:912 | deleted | // if resolveFlatTotal's inner Math.floor over getEffectiveStat is removed). |
| src/engine/resolution.test.ts:1170 | pre-/post- | // Unchanged: 7 x 2 (live count) = 14, exactly the pre-existing literal-number behavior -- the |
| src/engine/resolution.test.ts:1170 | unchanged | // Unchanged: 7 x 2 (live count) = 14, exactly the pre-existing literal-number behavior -- the |
| src/engine/resolution.test.ts:1576 | regression | // 16.51 -> final 16 -- this assertion catches that regression. |
| src/engine/resolution.test.ts:1631 | pre-/post- | // it was pre-death (fight-assembly instantiates the SAME playerWideEffects via the SAME |
| src/engine/resolution.test.ts:1913 | no longer | // mulberry32 math -- an arbitrary-value rngNext stub is no longer possible. Instead `hit` sets |
| src/engine/resolution.test.ts:1948 | unchanged | // Unchanged -- only remainingHp reflects the save |
| src/engine/resolution.test.ts:2398 | was.. | // Kill a hive-mate AFTER the modifier was applied -- the already-baked finalFactor must NOT |
| src/engine/resolution.test.ts:2406 | unchanged | // unchanged -- frozen |
| src/engine/resolution.test.ts:2574 | the old | // effect 2), tick (the OLD status instance -- captured before either trait effect ran)]. |
| src/engine/resolution.test.ts:2576 | the old | // FRESH instance with a new id); by the time the candidate list reaches the old tick |
| src/engine/resolution.test.ts:2647 | unchanged | // unchanged -- the fizzle never incremented it |
| src/engine/resolution.test.ts:1169 | regression | TITLE a literal number flatAmount behaves exactly as a plain number (regression) |
| src/engine/resolution.test.ts:1362 | byte-identical | TITLE does not apply when the target is at/above the HP threshold -- byte-identical hit |
| src/engine/resolution.test.ts:1527 | regression | TITLE clears defending/provoking on the revived creature (regression: a creature that died while defending must not return still defending) |
| src/engine/resolution.test.ts:2409 | byte-identical | TITLE is byte-identical to the plain factor when magnitudeSource is absent |
| src/engine/resolution.test.ts:2515 | the old | TITLE remove-then-reapply: a status removed and reapplied inside one cascade -- the old instance's pending trigger does not fire; the new instance follows normal rules |
| src/engine/resolution.ts:111 | replac | * status. Replaces the magnitude `count` a `magnitudeSource` would supply (a spell may not carry |
| src/engine/resolution.ts:295 | pre-/post- | * on-enemy-death (observers). Death pre-empts the victim's on-damage-taken; hit-reactions |
| src/engine/resolution.ts:444 | was.. | * never gated): true means the bearer's status instance (`statusInstanceId`) was applied or |
| src/engine/resolution.ts:509 | replac | // removed or replaced (cleanse, then reapply) the status this candidate came from. Re-check |
| src/engine/resolution.ts:765 | not yet | * (an instance built by hand without one, a future path that forgets it) must never fall back to |
| src/engine/resolution.ts:790 | before this | * is a tick, handled before this is reached), scaled by `count` (the live magnitudeSource count, |
| src/engine/resolution.ts:858 | was.. | // removes >=1 HP" floor doesn't know this was never really a hit). TriggerFired was already |
| src/engine/resolution.ts:1001 | byte-identical | // No count: the implicit 1 (byte-identical for a trait's own trigger), same composition as |
| src/engine/resolution.ts:1133 | not yet | // the defensive re-check for any OTHER ResponseTarget a future revive might use. |
| src/engine/resolution.ts:1138 | was.. | // ramp preserved: innate traits + perks come back exactly as they were at fight-start). |
| src/engine/resolution.ts:1185 | not yet | // Sleep's on-damage-taken wake-up; future cleanse/dispel. It has a real |
| src/engine/resolution.ts:1297 | legacy | * legacy cast path on the same primitive. */ |
| src/engine/resolution.ts:1322 | replac | * when shorter) and resets `appliedAt` (born this turn), and replaces the applier snapshot ONLY |
| src/engine/resolution.ts:1361 | the old | // status always gets a truly new id, never the old one back). |
| src/engine/resolution.ts:1369 | no longer | // flag), so spreading the raw union member no longer type-checks cleanly against |
| src/engine/rng.test.ts:65 | regression | // regression check, not just a parity assertion, since createSeededRng is implemented on top |
| src/engine/rng.test.ts:66 | not yet | // of nextRandom (see rng.ts). A future edit that broke the sequence for either API would fail |
| src/engine/rng.test.ts:68 | legacy | TITLE produces the identical sequence as the legacy createSeededRng API for the same seed |
| src/engine/rng.ts:40 | legacy | // ---- Legacy closure API (generation.ts only; see this module's own doc comment) ---- |
| src/engine/spell-effects.test.ts:1 | byte-identical | // Spells carry responses. The effect-list cast is BYTE-IDENTICAL to the legacy payload path, so |
| src/engine/spell-effects.test.ts:1 | legacy | // Spells carry responses. The effect-list cast is BYTE-IDENTICAL to the legacy payload path, so |
| src/engine/spell-effects.test.ts:5 | legacy | //     status, AOE + status). The "old" side is `legacyCast` below: the legacy cast executor's |
| src/engine/spell-effects.test.ts:9 | replac | //     It is NOT verbatim: the old damage call (`dealDamageWithOffStat`, since deleted) is replaced |
| src/engine/spell-effects.test.ts:9 | the old | //     It is NOT verbatim: the old damage call (`dealDamageWithOffStat`, since deleted) is replaced |
| src/engine/spell-effects.test.ts:17 | unchanged | // The full golden suite (unchanged `expected*` exports) and the corpus digest are the integration |
| src/engine/spell-effects.test.ts:104 | legacy | // ---- The legacy oracle ---- |
| src/engine/spell-effects.test.ts:106 | legacy | /** The legacy `Spell` shape: `spellPower`, `scalingStat`, `payload`, `statModifier` and |
| src/engine/spell-effects.test.ts:107 | legacy | * `appliesStatus` were spell-level fields. Only the legacy oracle below reads it. */ |
| src/engine/spell-effects.test.ts:119 | the old | /** How an old spell maps onto `effects` (what the legacy oracle's literals were converted |
| src/engine/spell-effects.test.ts:119 | legacy | /** How an old spell maps onto `effects` (what the legacy oracle's literals were converted |
| src/engine/spell-effects.test.ts:184 | the old | // the action-start SNAPSHOT, exactly as the old executors passed it |
| src/engine/spell-effects.test.ts:194 | the old | // The old path: dealDamageWithOffStat(offStat, 'cast', 'cast') over resolveSpellOffStat's |
| src/engine/spell-effects.test.ts:293 | the old | /** Runs the same cast down the old and the new path from equal states and demands identical |
| src/engine/spell-effects.test.ts:709 | was.. | // m1 was a LANDED target (its list runs whole, atomic): one self heal. m2 must add none. |
| src/engine/spell-effects.test.ts:965 | pre-/post- | // Caster Int 10. on-cast -> apply-stat-modifier self Intelligence x2 (fires in the pre-hit |
| src/engine/spell-effects.test.ts:968 | legacy | // SNAPSHOT (the legacy read): off = 10 -> core 10, chip 0.1 -> raw 10.1 -> final 10. |
| src/engine/spell-effects.test.ts:326 | the old | TITLE equivalence: the old cast payload path vs the new effect list |
| src/engine/spell-effects.test.ts:589 | pre-/post- | TITLE the pre-hit-hook fizzle on the cast path: a target killed in its own pre-hit hooks gets NOTHING from the list |
| src/engine/spell-effects.test.ts:603 | unchanged | TITLE a stat-modifier spell: no StatModifierApplied, target unchanged |
| src/engine/spell-effects.test.ts:649 | pre-/post- | TITLE the pre-hit-hook fizzle and the AOE alive-skip also guard `self` effects (cast-target alone would not) |
| src/engine/spell-effects.test.ts:1384 | deleted | TITLE remove-status, from a trait: nothing is removed from the dead triggering-source |
| src/engine/status-containers.test.ts:277 | deleted | // Turn-start grant stuns X (read 2 skips the turn); at turn end the stun is removed (trigger 1) |
| src/engine/status-containers.test.ts:321 | no longer | //   X's attack: refused by the skip gate -- NOT by the lock, which no longer exists: no |
| src/engine/status-snapshot.test.ts:142 | replac | TITLE a STRONGER re-application replaces the whole snapshot (applier, affinity, potency) |
| src/engine/status-snapshot.test.ts:225 | replac | TITLE an INHERITED snapshot is the candidate instead of the applying creature’s own, and only replaces when stronger |
| src/engine/target-selectors.test.ts:138 | was.. | // The state's rng was advanced by this call (compare against the untouched draw). |
| src/engine/target-selectors.ts:152 | unchanged | * `TargetSelector` variant: the player-facing vocabulary is unchanged. |
| src/engine/target-selectors.ts:167 | unchanged | * random-enemy is already RNG-free in resolveTargetSelector -- this delegates to it unchanged |
| src/engine/tie-break.ts:10 | byte-identical | * machines (local vs CI), which would silently break byte-identical golden-replay output. |
| src/engine/turn-order.ts:38 | byte-identical | * With no `turn-order` effects present, both poles are empty and this is byte-identical |
| src/engine/types.ts:208 | byte-identical | * stay byte-identical regardless of the exact format). Starts at 0 in `createCombat`. */ |
| src/engine/types.ts:221 | not yet | // actions once they exist, e.g. a future Wait). |
| src/engine/types.ts:270 | was.. | /** A `perform-action` grant ran and was ACCEPTED -- emitted when the queued |
| src/engine/types.ts:275 | replac | * granting trait/status/perk's definition id, the same value its `TriggerFired` carries. Replaces |
| src/engine/types.ts:304 | not yet | // Consequence events: shared across any future source, not just Attack. |
| src/engine/types.ts:395 | was.. | * was actually set and just expired ("until its next turn") -- never on a dead creature's empty |
| src/state/balance-sim-report.test.ts:293 | replac | // larger: replaces |
| src/state/balance-sim.test.ts:1281 | replac | // larger: replaces |
| src/state/balance-sim.ts:124 | was.. | /** True iff the last run was a push that failed. */ |
| src/state/balance-sim.ts:807 | was.. | /** One fight on an early floor: who the enemy side was and how it ended. */ |
| src/state/integration.test.ts:228 | byte-identical | // ---- Determinism: same fixed seed, same real data -> byte-identical outcome ---- |
| src/state/integration.test.ts:338 | byte-identical | // ---- Determinism: same fixed seed/levels, same real data -> byte-identical FIRST outcome -- |
| src/state/rewards.test.ts:297 | the old | // ('aaa'), which isn't in `standalone` here, so the old approach would have thrown where |
| src/state/rewards.test.ts:166 | not yet | TITLE throws on a 'fusion' source (fusion is not built) |
| src/state/rewards.ts:38 | replac | * materialized (an unknown id throws). Equipping replaces the roll |
| src/state/store-hub.test.ts:227 | replac | // extra replaces `a` in slot 1 |
| src/state/store-hub.test.ts:73 | unchanged | TITLE a failed summon leaves every field of the state unchanged |
| src/state/store-perks.test.ts:91 | replac | // 50 -> 50 would double-count if the old level were kept; 30 -> 50 again fits only if replaced. |
| src/state/store-perks.test.ts:91 | the old | // 50 -> 50 would double-count if the old level were kept; 30 -> 50 again fits only if replaced. |
| src/state/store-perks.test.ts:82 | pre-/post- | TITLE the budget check is on the post-change total: exactly the budget passes |
| src/state/store-perks.test.ts:88 | replac | TITLE setting a perk to a new level replaces its old spend, it does not add to it |
| src/state/store.test.ts:200 | regression | // ---- Fixtures for the "wipe with a mid-fight kill" regression ---- |
| src/state/store.test.ts:239 | regression | // ---- Fixtures for the perk-plumbing regression ---- |
| src/state/store.test.ts:440 | was.. | // still set -- the floor WAS attempted, just not cleared |
| src/state/store.test.ts:476 | unchanged | // unchanged -- floor 2 wasn't cleared |
| src/state/store.test.ts:477 | was.. | // still set -- floor 2 WAS attempted |
| src/state/store.test.ts:489 | regression | // fight -- a smoke test, not a regression test. |
| src/state/store.test.ts:547 | unchanged | // completely unchanged (reference equality on the whole state, not a field-by-field spot check -- |
| src/state/store.test.ts:1077 | unchanged | // unchanged -- the boss floor wasn't cleared |
| src/state/store.test.ts:984 | unchanged | TITLE re-clearing an already-cleared boss floor leaves bossesCleared.size unchanged (idempotent, no further perk points) |
| src/state/store.ts:127 | was.. | * all other state) unchanged, since nothing was attempted. */ |
| src/state/store.ts:127 | unchanged | * all other state) unchanged, since nothing was attempted. */ |
| src/state/store.ts:162 | pre-/post- | /** Static creatureId -> total % gained THIS call (pre-existing-progress-relative; the store's |
| src/state/store.ts:169 | was.. | * was a boss encounter AND it was won -- else null. Idempotent at the bossesCleared level (a |
| src/state/store.ts:244 | previously | * Swapping specs never removes a previously-owned starter. Throws on an unknown |
| src/state/store.ts:264 | pre-/post- | * applies XP-driven level-ups post-fight, and advances deepestFloor only on a full clear. |
| src/state/store.ts:265 | unchanged | * Player-reachable failure (`spec/store.md#how-store-actions-fail`): returns `{ ok: false, reason }` (state unchanged) instead |
| src/state/store.ts:296 | no longer | // A stored spell id that no longer resolves is data drift, not a skippable slot. |
| src/state/store.ts:482 | was.. | * that don't depend on which floor was asked for (no-spec, empty-party) first, then |
