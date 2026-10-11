# Mapping: label-form cross-links in the living docs (235 labels) and same-file references (D2)

The script (scratchpad, not committed) matched each label to a heading **by its text** (case-insensitive, markup stripped) in the
named file, which had to give exactly one heading; 232 matched exactly, 3 by a unique prefix (A15). A paren
or chained list became `a`, `b` and `c`. Nothing but the citation text was edited.

## Cross-file labels

| Where | Label | Anchor written | Match |
| --- | --- | --- | --- |
| CLAUDE.md:18 | "Combat is reproducible from its inputs" | `CONVENTIONS.md#combat-is-reproducible-from-its-inputs` | exact |
| CLAUDE.md:20 | "The engine is pure and deterministic" | `CONVENTIONS.md#the-engine-is-pure-and-deterministic` | exact |
| CLAUDE.md:22 | "One effect framework" | `spec/effects.md#one-effect-framework` | exact |
| CLAUDE.md:23 | "No magic numbers" | `CONVENTIONS.md#no-magic-numbers` | exact |
| CLAUDE.md:25 | "Scripts are ordered rules" | `spec/scripting.md#scripts-are-ordered-rules` | exact |
| CLAUDE.md:27 | "Versions and migrations" | `spec/saves.md#versions-and-migrations` | exact |
| CLAUDE.md:81 | "One store" | `spec/store.md#one-store` | exact |
| CLAUDE.md:83 | "GitHub Pages, from a subpath" | `CONVENTIONS.md#github-pages-from-a-subpath` | exact |
| CONVENTIONS.md:86 | "Enemy levels" | `spec/run.md#enemy-levels` | exact |
| CONVENTIONS.md:215 | "Golden policy: one per PR" | `WORKFLOWS.md#golden-policy-one-per-pr` | exact |
| CONVENTIONS.md:337 | "Slot and file operations" | `spec/saves.md#slot-and-file-operations` | exact |
| CONVENTIONS.md:357 | "One effect framework" | `spec/effects.md#one-effect-framework` | exact |
| OPEN_QUESTIONS.md:9 | "Where each number lives" | `CONVENTIONS.md#where-each-number-lives` | exact |
| OPEN_QUESTIONS.md:15 | "Enemy levels" | `spec/run.md#enemy-levels` | exact |
| OPEN_QUESTIONS.md:33 | "Fights per floor" | `spec/run.md#fights-per-floor` | exact |
| OPEN_QUESTIONS.md:40 | "Unicorn Lightbearer" | `content/overgrowth.md#unicorn-lightbearer` | exact |
| OPEN_QUESTIONS.md:41 | "revive" | `spec/responses.md#revive` | exact |
| OPEN_QUESTIONS.md:49 | "Facilities" | `spec/run.md#facilities` | exact |
| OPEN_QUESTIONS.md:53 | "Souls" | `spec/creatures.md#souls` | exact |
| OPEN_QUESTIONS.md:60 | "Turn queue" | `spec/combat.md#turn-queue` | exact |
| OPEN_QUESTIONS.md:69 | "perform-action" | `spec/responses.md#perform-action` | exact |
| OPEN_QUESTIONS.md:90 | "Biomes" | `spec/run.md#biomes` | exact |
| OPEN_QUESTIONS.md:93 | "The onboarding ramp" | `spec/run.md#the-onboarding-ramp` | exact |
| ROADMAP.md:7 | "v1 is the start-of-beta baseline" | `VISION.md#v1-is-the-start-of-beta-baseline` | exact |
| ROADMAP.md:15 | "Perk points" | `spec/progression.md#perk-points` | exact |
| ROADMAP.md:59 | "How the spec is written" | `CLAUDE.md#how-the-spec-is-written` | exact |
| ROADMAP.md:76 | "Mechanism goldens vs content goldens" | `CONVENTIONS.md#mechanism-goldens-vs-content-goldens` | exact |
| ROADMAP.md:91 | "Rewards" | `spec/run.md#rewards` | exact |
| ROADMAP.md:102 | "Hooks" | `spec/effects.md#hooks` | exact |
| ROADMAP.md:102 | "Damage-path hook order" | `spec/effects.md#damage-path-hook-order` | exact |
| ROADMAP.md:102 | "Action reactions: actor-self hooks or observation" | `spec/effects.md#action-reactions-actor-self-hooks-or-observation` | exact |
| ROADMAP.md:109 | "Conditions in the engine" | `spec/scripting.md#conditions-in-the-engine` | exact |
| ROADMAP.md:120 | "Turn queue" | `spec/combat.md#turn-queue` | exact |
| ROADMAP.md:120 | "Self-clearing statuses" | `spec/statuses.md#self-clearing-statuses` | exact |
| ROADMAP.md:125 | "IndexedDB is namespaced by environment" | `CONVENTIONS.md#indexeddb-is-namespaced-by-environment` | exact |
| ROADMAP.md:128 | "The script editor" | `spec/scripting.md#the-script-editor` | exact |
| ROADMAP.md:135 | "Trigger conditions" | `spec/effects.md#trigger-conditions` | exact |
| ROADMAP.md:148 | "Scripted intro" | `spec/run.md#scripted-intro` | exact |
| ROADMAP.md:155 | "Category decides player-facing treatment" | `spec/effects.md#category-decides-player-facing-treatment` | exact |
| ROADMAP.md:164 | "Manual mode" | `spec/combat.md#manual-mode` | exact |
| ROADMAP.md:172 | "Biome theme and visuals" | `spec/run.md#biome-theme-and-visuals` | exact |
| VISION.md:23 | "Biomes" | `spec/run.md#biomes` | exact |
| VISION.md:42 | "Combat is reproducible from its inputs" | `CONVENTIONS.md#combat-is-reproducible-from-its-inputs` | exact |
| VISION.md:60 | "The cave" | `spec/run.md#the-cave` | exact |
| WORKFLOWS.md:113 | "Process for 4.2" | `phases/4.2/brief.md#process-for-42` | exact |
| WORKFLOWS.md:126 | "A mechanism at more than one site is tested at each site" | `CONVENTIONS.md#a-mechanism-at-more-than-one-site-is-tested-at-each-site` | exact |
| WORKFLOWS.md:138 | "Doc edits" | `workflow/design-rules.md#doc-edits` | exact |
| content/enemy-behaviour.md:7 | "Role scripts" | `spec/scripting.md#role-scripts` | exact |
| content/enemy-behaviour.md:7 | "Boss floors" | `spec/run.md#boss-floors` | exact |
| content/enemy-behaviour.md:90 | "Boss floors" | `spec/run.md#boss-floors` | exact |
| content/glimmerdark.md:15 | "Enabler, payoff, amplifier" | `content/overgrowth.md#enabler-payoff-amplifier` | exact |
| content/glimmerdark.md:18 | "Indirect damage" | `content/overgrowth.md#indirect-damage` | exact |
| content/glimmerdark.md:64 | "Damage observation" | `spec/effects.md#damage-observation` | exact |
| content/glimmerdark.md:176 | "Boss floors" | `content/enemy-behaviour.md#boss-floors` | exact |
| content/glimmerdark.md:184 | "Spells" | `content/overgrowth.md#spells` | exact |
| content/overgrowth.md:32 | "Damage channels and the Additional" | `spec/combat.md#damage-channels-and-the-additional` | exact |
| content/overgrowth.md:74 | "Stun is just a status" | `spec/statuses.md#stun-is-just-a-status` | exact |
| content/overgrowth.md:196 | "Boss floors" | `content/enemy-behaviour.md#boss-floors` | exact |
| content/overgrowth.md:203 | "Scripted intro" | `spec/run.md#scripted-intro` | exact |
| content/overgrowth.md:220 | "Spells unlock cumulatively" | `spec/run.md#spells-unlock-cumulatively` | exact |
| content/rotcap-hollow.md:15 | "Enabler, payoff, amplifier" | `content/overgrowth.md#enabler-payoff-amplifier` | exact |
| content/rotcap-hollow.md:17 | "Indirect damage" | `content/overgrowth.md#indirect-damage` | exact |
| content/rotcap-hollow.md:35 | "DoT and Regen belong to their applier" | `spec/statuses.md#dot-and-regen-belong-to-their-applier` | exact |
| content/rotcap-hollow.md:161 | "Boss floors" | `content/enemy-behaviour.md#boss-floors` | exact |
| content/rotcap-hollow.md:167 | "Spells" | `content/overgrowth.md#spells` | exact |
| content/rotcap-hollow.md:168 | "Spells" | `content/glimmerdark.md#spells` | exact |
| skills/slice-verify/SKILL.md:11 | "Rules for the new spec" | `phases/4.2/brief.md#rules-for-the-new-spec` | exact |
| skills/slice-verify/SKILL.md:11 | "Condensing rules" | `phases/4.2/brief.md#condensing-rules-42-b-to-f` | prefix of "Condensing rules (4.2-B to F)" |
| skills/slice-verify/SKILL.md:11 | "Inventory format" | `phases/4.2/brief.md#inventory-format` | exact |
| spec/combat.md:24 | "Traits" | `spec/effects.md#traits` | exact |
| spec/combat.md:26 | "perform-action" | `spec/responses.md#perform-action` | exact |
| spec/combat.md:36 | "Spells" | `spec/creatures.md#spells` | exact |
| spec/combat.md:53 | "The fallback" | `spec/scripting.md#the-fallback` | exact |
| spec/combat.md:90 | "Category decides player-facing treatment" | `spec/effects.md#category-decides-player-facing-treatment` | exact |
| spec/combat.md:109 | "Levels and XP" | `spec/creatures.md#levels-and-xp` | exact |
| spec/combat.md:138 | "The applier snapshot" | `spec/statuses.md#the-applier-snapshot` | exact |
| spec/combat.md:146 | "A descent is atomic" | `spec/run.md#a-descent-is-atomic` | exact |
| spec/combat.md:149 | "Rewards" | `spec/run.md#rewards` | exact |
| spec/combat.md:154 | "The cave" | `spec/run.md#the-cave` | exact |
| spec/combat.md:180 | "Innate spells" | `spec/creatures.md#innate-spells` | exact |
| spec/combat.md:182 | "Effect order" | `spec/effects.md#effect-order` | exact |
| spec/combat.md:183 | "Death-reset" | `spec/effects.md#death-reset` | exact |
| spec/combat.md:190 | "Turn order" | `spec/statuses.md#turn-order` | exact |
| spec/combat.md:193 | "Turn order" | `spec/statuses.md#turn-order` | exact |
| spec/combat.md:197 | "perform-action" | `spec/responses.md#perform-action` | exact |
| spec/combat.md:209 | "Ticks are on-turn-end triggers" | `spec/statuses.md#ticks-are-on-turn-end-triggers` | exact |
| spec/combat.md:237 | "Turn-end cleanup" | `spec/statuses.md#turn-end-cleanup` | exact |
| spec/combat.md:240 | "Action locks" | `spec/statuses.md#action-locks` | exact |
| spec/combat.md:241 | "Timing" | `spec/statuses.md#timing` | exact |
| spec/combat.md:273 | "Magnitude modes" | `spec/responses.md#magnitude-modes` | exact |
| spec/combat.md:276 | "The applier snapshot" | `spec/statuses.md#the-applier-snapshot` | exact |
| spec/combat.md:287 | "Damage observation" | `spec/effects.md#damage-observation` | exact |
| spec/combat.md:336 | "Gems as items" | `spec/creatures.md#gems-as-items` | exact |
| spec/combat.md:337 | "Innate spells" | `spec/creatures.md#innate-spells` | exact |
| spec/combat.md:386 | "Magnitude modes" | `spec/responses.md#magnitude-modes` | exact |
| spec/combat.md:394 | "Scripts and rules" | `spec/scripting.md#scripts-and-rules` | exact |
| spec/combat.md:396 | "Stock scripts" | `spec/scripting.md#stock-scripts` | exact |
| spec/combat.md:435 | "acted-before-target" | `spec/effects.md#acted-before-target` | exact |
| spec/combat.md:447 | "Immunity suppresses the effect, not the application" | `spec/statuses.md#immunity-suppresses-the-effect-not-the-application` | exact |
| spec/combat.md:480 | "Dead creatures" | `spec/effects.md#dead-creatures` | exact |
| spec/combat.md:510 | "Splashing and Annihilate" | `spec/effects.md#splashing-and-annihilate` | exact |
| spec/creatures.md:16 | "Spawning" | `spec/run.md#spawning` | exact |
| spec/creatures.md:19 | "Role scripts" | `spec/scripting.md#role-scripts` | exact |
| spec/creatures.md:42 | "Affinity advantage" | `spec/combat.md#affinity-advantage` | exact |
| spec/creatures.md:69 | "Enemy levels" | `spec/run.md#enemy-levels` | exact |
| spec/creatures.md:72 | "Build power is the incremental curve" | `spec/progression.md#build-power-is-the-incremental-curve` | exact |
| spec/creatures.md:77 | "Encounters, rewards & wipes" | `spec/combat.md#encounters-rewards--wipes` | exact |
| spec/creatures.md:87 | "Spawning" | `spec/run.md#spawning` | exact |
| spec/creatures.md:92 | "Specializations" | `spec/progression.md#specializations` | exact |
| spec/creatures.md:93 | "Scripted intro" | `spec/run.md#scripted-intro` | exact |
| spec/creatures.md:96 | "Enemy count" | `spec/run.md#enemy-count` | exact |
| spec/creatures.md:101 | "Store actions" | `spec/store.md#store-actions` | exact |
| spec/creatures.md:115 | "Enemy script and gem set" | `spec/run.md#enemy-script-and-gem-set` | exact |
| spec/creatures.md:131 | "The stat a spell's magnitude scales off" | `spec/combat.md#the-stat-a-spells-magnitude-scales-off` | exact |
| spec/creatures.md:200 | "Enemy script and gem set" | `spec/run.md#enemy-script-and-gem-set` | exact |
| spec/creatures.md:203 | "Swapping specialization" | `spec/progression.md#swapping-specialization` | exact |
| spec/creatures.md:224 | "Fight setup" | `spec/combat.md#fight-setup` | exact |
| spec/creatures.md:240 | "Recipe drops and currency sinks" | `spec/run.md#recipe-drops-and-currency-sinks` | exact |
| spec/creatures.md:242 | "Spells unlock cumulatively" | `spec/run.md#spells-unlock-cumulatively` | exact |
| spec/creatures.md:246 | "Wit Mastery" | `specializations/sorcerer.md#wit-mastery` | exact |
| spec/creatures.md:300 | "Facilities" | `spec/run.md#facilities` | exact |
| spec/effects.md:14 | "Gems as items" | `spec/creatures.md#gems-as-items` | exact |
| spec/effects.md:14 | "Equipment" | `spec/creatures.md#equipment` | exact |
| spec/effects.md:26 | "A status is a timed effect" | `spec/statuses.md#a-status-is-a-timed-effect` | exact |
| spec/effects.md:44 | "Damage formula" | `spec/combat.md#damage-formula` | exact |
| spec/effects.md:64 | "Trait and gem slots" | `spec/creatures.md#trait-and-gem-slots` | exact |
| spec/effects.md:73 | "No side doors" | `spec/responses.md#no-side-doors` | exact |
| spec/effects.md:76 | "perform-action" | `spec/responses.md#perform-action` | exact |
| spec/effects.md:80 | "Behavioral traits" | `OPEN_QUESTIONS.md#behavioral-traits` | exact |
| spec/effects.md:86 | "Damage channels and the Additional" | `spec/combat.md#damage-channels-and-the-additional` | exact |
| spec/effects.md:88 | "triggering-source is never the firing creature" | `spec/responses.md#triggering-source-is-never-the-firing-creature` | exact |
| spec/effects.md:100 | "Fight setup" | `spec/combat.md#fight-setup` | exact |
| spec/effects.md:102 | "StatusDef" | `spec/statuses.md#statusdef` | exact |
| spec/effects.md:110 | "Innate spells" | `spec/creatures.md#innate-spells` | exact |
| spec/effects.md:115 | "Action locks" | `spec/statuses.md#action-locks` | exact |
| spec/effects.md:115 | "Turn order" | `spec/statuses.md#turn-order` | exact |
| spec/effects.md:117 | "Armor penetration" | `spec/combat.md#armor-penetration` | exact |
| spec/effects.md:117 | "Cross-stat contribution" | `spec/combat.md#cross-stat-contribution` | exact |
| spec/effects.md:117 | "Action instance-list" | `spec/combat.md#action-instance-list` | exact |
| spec/effects.md:117 | "Targeting override" | `spec/combat.md#targeting-override` | exact |
| spec/effects.md:126 | "Several triggers" | `spec/statuses.md#several-triggers` | exact |
| spec/effects.md:140 | "Immunity suppresses the effect, not the application" | `spec/statuses.md#immunity-suppresses-the-effect-not-the-application` | exact |
| spec/effects.md:162 | "Equipment" | `spec/creatures.md#equipment` | exact |
| spec/effects.md:193 | "Action instance-list" | `spec/combat.md#action-instance-list` | exact |
| spec/effects.md:212 | "Ticks are on-turn-end triggers" | `spec/statuses.md#ticks-are-on-turn-end-triggers` | exact |
| spec/effects.md:231 | "No response acts on a dead target" | `spec/responses.md#no-response-acts-on-a-dead-target` | exact |
| spec/effects.md:236 | "An action ends when its actor dies" | `spec/combat.md#an-action-ends-when-its-actor-dies` | exact |
| spec/effects.md:374 | "perform-action" | `spec/responses.md#perform-action` | exact |
| spec/effects.md:394 | "Fizzles" | `spec/responses.md#fizzles` | exact |
| spec/effects.md:451 | "Adjacency targeting" | `spec/combat.md#adjacency-targeting` | exact |
| spec/effects.md:473 | "Fight setup" | `spec/combat.md#fight-setup` | exact |
| spec/effects.md:475 | "revive" | `spec/responses.md#revive` | exact |
| spec/progression.md:11 | "Levels and XP" | `spec/creatures.md#levels-and-xp` | exact |
| spec/progression.md:17 | "Cold start" | `spec/creatures.md#cold-start` | exact |
| spec/progression.md:75 | "Carriers and effects" | `spec/effects.md#carriers-and-effects` | exact |
| spec/progression.md:80 | "Store actions" | `spec/store.md#store-actions` | exact |
| spec/responses.md:21 | "Action locks" | `spec/statuses.md#action-locks` | exact |
| spec/responses.md:31 | "Dead creatures" | `spec/effects.md#dead-creatures` | exact |
| spec/responses.md:50 | "Trigger conditions" | `spec/effects.md#trigger-conditions` | exact |
| spec/responses.md:66 | "The applier snapshot" | `spec/statuses.md#the-applier-snapshot` | exact |
| spec/responses.md:93 | "The applier snapshot" | `spec/statuses.md#the-applier-snapshot` | exact |
| spec/responses.md:117 | "Applying and refreshing" | `spec/statuses.md#applying-and-refreshing` | exact |
| spec/responses.md:122 | "Stat-modifier counts freeze at application" | `spec/effects.md#stat-modifier-counts-freeze-at-application` | exact |
| spec/responses.md:136 | "Polarity, cleanse and dispel" | `spec/statuses.md#polarity-cleanse-and-dispel` | exact |
| spec/responses.md:143 | "Death-reset" | `spec/effects.md#death-reset` | exact |
| spec/responses.md:156 | "One action pipeline" | `spec/combat.md#one-action-pipeline` | exact |
| spec/responses.md:175 | "Loop safety" | `spec/effects.md#loop-safety` | exact |
| spec/responses.md:191 | "Every action source obeys the same rules" | `spec/combat.md#every-action-source-obeys-the-same-rules` | exact |
| spec/responses.md:195 | "Traits" | `spec/effects.md#traits` | exact |
| spec/run.md:15 | "Explicit non-goals" | `VISION.md#explicit-non-goals` | exact |
| spec/run.md:24 | "Encounters, rewards & wipes" | `spec/combat.md#encounters-rewards--wipes` | exact |
| spec/run.md:106 | "Levels and XP" | `spec/creatures.md#levels-and-xp` | exact |
| spec/run.md:118 | "Balance numbers" | `OPEN_QUESTIONS.md#balance-numbers` | exact |
| spec/run.md:123 | "Perk points" | `spec/progression.md#perk-points` | exact |
| spec/run.md:157 | "Encounters, rewards & wipes" | `spec/combat.md#encounters-rewards--wipes` | exact |
| spec/run.md:158 | "Levels and XP" | `spec/creatures.md#levels-and-xp` | exact |
| spec/run.md:158 | "Souls" | `spec/creatures.md#souls` | exact |
| spec/run.md:174 | "Perk points" | `spec/progression.md#perk-points` | exact |
| spec/run.md:202 | "The store owns navigation and ownership" | `spec/store.md#the-store-owns-navigation-and-ownership` | exact |
| spec/run.md:255 | "Role scripts" | `spec/scripting.md#role-scripts` | exact |
| spec/run.md:284 | "Gems as items" | `spec/creatures.md#gems-as-items` | exact |
| spec/run.md:285 | "Equipment" | `spec/creatures.md#equipment` | exact |
| spec/run.md:287 | "Fusion" | `spec/creatures.md#fusion` | exact |
| spec/run.md:287 | "Catch-up levelling" | `spec/creatures.md#catch-up-levelling` | exact |
| spec/saves.md:18 | "IndexedDB is namespaced by environment" | `CONVENTIONS.md#indexeddb-is-namespaced-by-environment` | exact |
| spec/saves.md:26 | "Fusion" | `spec/creatures.md#fusion` | exact |
| spec/saves.md:34 | "Instance" | `spec/creatures.md#instance` | exact |
| spec/saves.md:46 | "Player gem sets" | `spec/creatures.md#player-gem-sets` | exact |
| spec/scripting.md:55 | "Provoke" | `spec/combat.md#provoke` | exact |
| spec/scripting.md:61 | "Actions" | `spec/combat.md#actions` | exact |
| spec/scripting.md:68 | "Default targeting is side-aware" | `spec/combat.md#default-targeting-is-side-aware` | exact |
| spec/scripting.md:86 | "Species, creatures and instances" | `spec/creatures.md#species-creatures-and-instances` | exact |
| spec/scripting.md:88 | "Role scripts" | `content/enemy-behaviour.md#role-scripts` | exact |
| spec/scripting.md:90 | "A lock downgrades a turn" | `content/enemy-behaviour.md#a-lock-downgrades-a-turn` | exact |
| spec/scripting.md:99 | "One action pipeline" | `spec/combat.md#one-action-pipeline` | exact |
| spec/scripting.md:110 | "Action locks" | `spec/statuses.md#action-locks` | exact |
| spec/scripting.md:124 | "acted-before-target" | `spec/effects.md#acted-before-target` | exact |
| spec/scripting.md:138 | "Trigger conditions" | `spec/effects.md#trigger-conditions` | exact |
| spec/scripting.md:147 | "One action pipeline" | `spec/combat.md#one-action-pipeline` | exact |
| spec/scripting.md:189 | "Default targeting is side-aware" | `spec/combat.md#default-targeting-is-side-aware` | exact |
| spec/statuses.md:16 | "Effects and carriers" | `spec/effects.md#effects-and-carriers` | exact |
| spec/statuses.md:20 | "No temporary stat-modifier" | `spec/effects.md#no-temporary-stat-modifier` | exact |
| spec/statuses.md:24 | "Category decides player-facing treatment" | `spec/effects.md#category-decides-player-facing-treatment` | exact |
| spec/statuses.md:46 | "Damage channels and the Additional" | `spec/combat.md#damage-channels-and-the-additional` | exact |
| spec/statuses.md:52 | "triggering-source is never the firing creature" | `spec/responses.md#triggering-source-is-never-the-firing-creature` | exact |
| spec/statuses.md:62 | "remove-status" | `spec/responses.md#remove-status` | exact |
| spec/statuses.md:85 | "Specializations" | `spec/progression.md#specializations` | exact |
| spec/statuses.md:85 | "Immunity" | `spec/effects.md#immunity` | exact |
| spec/statuses.md:109 | "The effect iterator" | `spec/effects.md#the-effect-iterator` | exact |
| spec/statuses.md:113 | "Validators" | `spec/effects.md#validators` | exact |
| spec/statuses.md:126 | "Turn structure" | `spec/combat.md#turn-structure` | exact |
| spec/statuses.md:172 | "Resolution & timing" | `spec/combat.md#resolution--timing` | exact |
| spec/statuses.md:174 | "Death-reset" | `spec/effects.md#death-reset` | exact |
| spec/statuses.md:193 | "Flat mode" | `spec/responses.md#flat-mode` | exact |
| spec/statuses.md:199 | "Damage channels and the Additional" | `spec/combat.md#damage-channels-and-the-additional` | exact |
| spec/statuses.md:228 | "Every action source obeys the same rules" | `spec/combat.md#every-action-source-obeys-the-same-rules` | exact |
| spec/store.md:18 | "Generation is a pure seeded module" | `spec/run.md#generation-is-a-pure-seeded-module` | exact |
| spec/store.md:22 | "Instance" | `spec/creatures.md#instance` | exact |
| spec/store.md:39 | "Content frontier and pins" | `spec/run.md#content-frontier-and-pins` | exact |
| spec/store.md:50 | "Specializations are data" | `spec/progression.md#specializations-are-data` | exact |
| specializations/brute.md:7 | "Perks" | `spec/progression.md#perks` | exact |
| specializations/brute.md:7 | "Perk points" | `spec/progression.md#perk-points` | exact |
| specializations/brute.md:7 | "Spending perk points" | `spec/progression.md#spending-perk-points` | exact |
| specializations/shieldbarer.md:7 | "Perks" | `spec/progression.md#perks` | exact |
| specializations/shieldbarer.md:7 | "Perk points" | `spec/progression.md#perk-points` | exact |
| specializations/shieldbarer.md:7 | "Spending perk points" | `spec/progression.md#spending-perk-points` | exact |
| specializations/sorcerer.md:7 | "Perks" | `spec/progression.md#perks` | exact |
| specializations/sorcerer.md:7 | "Perk points" | `spec/progression.md#perk-points` | exact |
| specializations/sorcerer.md:7 | "Spending perk points" | `spec/progression.md#spending-perk-points` | exact |
| workflow/coding-rules.md:15 | "What a mailbox keeps" | `WORKFLOWS.md#what-a-mailbox-keeps` | exact |
| workflow/coding-rules.md:34 | "Local runs match CI's toolchain" | `CONVENTIONS.md#local-runs-match-cis-toolchain` | exact |
| workflow/coding-rules.md:42 | "Golden policy" | `WORKFLOWS.md#golden-policy-one-per-pr` | prefix of "Golden policy: one per PR" |
| workflow/condense.md:5 | "Process for 4.2" | `phases/4.2/brief.md#process-for-42` | exact |
| workflow/design-rules.md:31 | "What a mailbox keeps" | `WORKFLOWS.md#what-a-mailbox-keeps` | exact |
| workflow/plan-review.md:18 | "The human's judgment call" | `WORKFLOWS.md#the-humans-judgment-call-these-dont-remove` | prefix of "The human's judgment call these don't remove" |

Hand-edit after the script: `ROADMAP.md:115` named two more statuses.md headings after a parenthetical ("(the 72%), "Born this turn" and
"Turn order""), so the chain had ended; converted by hand to `spec/statuses.md#born-this-turn` and `spec/statuses.md#turn-order`.

## D2: same-file label references converted (quoted text equals exactly one heading of the same file)

44 converted to the full `<path>.md#<anchor>` form. One candidate was left alone: `content/enemy-behaviour.md:32`
`"Cast a random gem"` names the selector in running text, not the rule, although a heading has the same name.

| Where | Quoted text | Anchor written |
| --- | --- | --- |
| CONVENTIONS.md:425 | "Open questions get an interface" | `CONVENTIONS.md#open-questions-get-an-interface` |
| CONVENTIONS.md:428 | "Two-tier golden discipline" | `CONVENTIONS.md#two-tier-golden-discipline` |
| content/enemy-behaviour.md:32 | "Cast a random gem" | `content/enemy-behaviour.md#cast-a-random-gem` (**left alone**, see above) |
| spec/combat.md:32 | "Damage formula" | `spec/combat.md#damage-formula` |
| spec/combat.md:40 | "Provoke" | `spec/combat.md#provoke` |
| spec/combat.md:50 | "One action pipeline" | `spec/combat.md#one-action-pipeline` |
| spec/combat.md:60 | "Default targeting is side-aware" | `spec/combat.md#default-targeting-is-side-aware` |
| spec/combat.md:79 | "Damage channels and the Additional" | `spec/combat.md#damage-channels-and-the-additional` |
| spec/combat.md:159 | "Fight setup" | `spec/combat.md#fight-setup` |
| spec/combat.md:163 | "Event log" | `spec/combat.md#event-log` |
| spec/combat.md:231 | "Resolution & timing" | `spec/combat.md#resolution--timing` |
| spec/combat.md:317 | "Every action source obeys the same rules" | `spec/combat.md#every-action-source-obeys-the-same-rules` |
| spec/combat.md:334 | "Turn structure" | `spec/combat.md#turn-structure` |
| spec/combat.md:340 | "Targeting override" | `spec/combat.md#targeting-override` |
| spec/combat.md:368 | "An action ends when its actor dies" | `spec/combat.md#an-action-ends-when-its-actor-dies` |
| spec/combat.md:370 | "A target killed by its pre-hit hooks fizzles" | `spec/combat.md#a-target-killed-by-its-pre-hit-hooks-fizzles` |
| spec/combat.md:402 | "Default targeting is side-aware" | `spec/combat.md#default-targeting-is-side-aware` |
| spec/combat.md:403 | "Targeting override" | `spec/combat.md#targeting-override` |
| spec/combat.md:477 | "Spells carry responses" | `spec/combat.md#spells-carry-responses` |
| spec/creatures.md:22 | "Instance" | `spec/creatures.md#instance` |
| spec/creatures.md:55 | "Innate spells" | `spec/creatures.md#innate-spells` |
| spec/creatures.md:113 | "Gems as items" | `spec/creatures.md#gems-as-items` |
| spec/creatures.md:115 | "Player gem sets" | `spec/creatures.md#player-gem-sets` |
| spec/creatures.md:147 | "Fusion" | `spec/creatures.md#fusion` |
| spec/creatures.md:162 | "Fusion" | `spec/creatures.md#fusion` |
| spec/creatures.md:242 | "Spell affinity gate" | `spec/creatures.md#spell-affinity-gate` |
| spec/creatures.md:267 | "Catch-up levelling" | `spec/creatures.md#catch-up-levelling` |
| spec/effects.md:27 | "No temporary stat-modifier" | `spec/effects.md#no-temporary-stat-modifier` |
| spec/effects.md:98 | "Effect order" | `spec/effects.md#effect-order` |
| spec/effects.md:116 | "Validators" | `spec/effects.md#validators` |
| spec/effects.md:143 | "No temporary stat-modifier" | `spec/effects.md#no-temporary-stat-modifier` |
| spec/effects.md:143 | "Immunity" | `spec/effects.md#immunity` |
| spec/effects.md:271 | "Damage observation" | `spec/effects.md#damage-observation` |
| spec/effects.md:301 | "Hook execution" | `spec/effects.md#hook-execution` |
| spec/effects.md:427 | "Trigger conditions" | `spec/effects.md#trigger-conditions` |
| spec/responses.md:48 | "revive" | `spec/responses.md#revive` |
| spec/responses.md:78 | "Flat mode" | `spec/responses.md#flat-mode` |
| spec/run.md:35 | "Pins" | `spec/run.md#pins` |
| spec/run.md:133 | "Rewards" | `spec/run.md#rewards` |
| spec/run.md:288 | "Pins" | `spec/run.md#pins` |
| spec/statuses.md:37 | "Action locks" | `spec/statuses.md#action-locks` |
| spec/statuses.md:109 | "The applier snapshot" | `spec/statuses.md#the-applier-snapshot` |
| spec/statuses.md:145 | "Action locks" | `spec/statuses.md#action-locks` |
| spec/statuses.md:168 | "Several triggers" | `spec/statuses.md#several-triggers` |
| workflow/coding-rules.md:11 | "Phase record" | `workflow/coding-rules.md#phase-record` |
