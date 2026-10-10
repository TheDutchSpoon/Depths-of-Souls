# Spec — Run

Read this when changing descent, generation or the hub.

## Design

## 4. The Cave (world & structure)

The entire game world is **one cave that descends endlessly**. The player can **never leave
the cave**; all play happens either at the **entrance hub** or on the **floors below it**.

- **Floors**: the cave is a stack of floors numbered from the entrance downward. Greater
  depth = harder creatures (scaling curve is config; see §13). Depth is **persistent** — the
  player keeps their deepest-reached floor; there is no per-run reset. From the entrance the
  player can **fast-travel to any floor up to their deepest-reached** (floor selection is a
  UI feature; no need to re-walk cleared floors). A descent is **atomic**: choosing a floor
  resolves the whole floor at once (every fight, HP reset between them, no choices mid-floor) and
  returns to the hub; the game remembers the **last floor** fought to pre-select it next time.
  Descending past the last floor that has authored content is refused (the **content frontier**,
  derived from the biome data: floor 30 while three biomes exist).
- **Biomes**: the biome changes **every 10 floors** to the next in sequence. v1 ships
  **10 biomes** (so floors 1–10 are biome 1, 11–20 biome 2, … 91–100 biome 10; past floor 100,
  each floor's biome is chosen by **seeded-RNG draw from all 10 biomes** unless the player has
  pinned that floor via the Biome Atlas — see below; pinning can retroactively override a floor
  already visited). Each biome has a **spawn pool of species**.
  When a floor spawns an enemy, it picks a **species** from the biome's pool, then picks a
  **specific creature within that species by rarity-weighted draw from the seeded RNG** (rarer
  creatures appear less often). Biomes are **data** (name, theme, species pool, scaling tweaks,
  visuals). **v1 content target per biome: 6 or more species, each with 3 or more
  creatures** (so ≥18 creatures per biome; ~180+ creatures across the 10 v1 biomes — the
  largest content-authoring task in the project, and why creatures/traits must be data-driven).
- **Fights & HP**: a floor contains a **depth-determined number of fights** (`fightCount(floor)`, a
  deterministic config function — **not** rolled; the fight *count* is stable across visits, only
  the *creatures* re-roll; default from Phase 4.1-A: **10 + (floor − 1)**, i.e. 10 fights on floor
  1, one more per floor, uncapped) drawn from its
  biome pool. **Health resets to full between every fight** (including fights within the same
  floor) — there is no cross-fight attrition. A creature reduced to 0 HP is flagged as no longer
  alive and skipped in the turn order (its slot is retained, not deleted — see CONVENTIONS); death
  has **no lasting consequence** beyond the current fight (no
  instance loss, no cooldown, no soul/XP penalty) — full HP and full roster availability return
  for the next fight regardless of outcome. Defend/Regen/healing are purely *intra-fight* tools.
- **Milestone bosses**: every 10th floor (each biome transition) is a tougher **boss** fight —
  a difficulty checkpoint and reward spike, and the **sole source of perk points** (see §9).
  Bosses are unique, **cannot be soul-collected**, and grant no soul%. A boss floor is **the boss
  encounter alone** (no ordinary fights). Bosses still drop XP and currency like any kill. The
  first win grants the boss's perk points, and the floor can be re-fought afterwards for ordinary
  rewards (no further perk points).
  - **A boss fight is 6v6, like every fight from floor 6** (decided at the PR #81 review; built
    in 4.1-G). The boss comes first, then its **authored adds**, the creatures its fight needs
    (the Broodmother's spiderlings). The remaining slots are **filled with random creatures from
    the biome's own pool**, excluding the boss's own species (so the Broodmother's count-scaling
    sees only her authored spiderlings), drawn the way an ordinary fight draws them and rerolled
    each visit. A boss with no authored adds (the Leech Sovereign) gets five random ones. The adds
    are ordinary kills with ordinary rewards.
  - **A boss takes control like any enemy: no boss immunity** (PR #81 review). A boss gets a full
    gem set and its role script like every enemy, so a lock **downgrades** its turn and never
    empties it: a Pacified striker casts a random gem instead of attacking, and a Silenced caster
    attacks. A lock recast every turn holds for the whole fight, and that's the intended price:
    one of the player's creatures spends its whole turn on it every round, against one enemy of
    six.
  - **Why** (the PR #81 corpus). The Leech Sovereign fought alone, ran `always-attack` and held no
    gem. So once Pacified she had nothing to do but wait, and one creature casting Pacify every
    round switched off the whole enemy side. In all four corpus fights where the player side
    held Pacify, she waited every turn after her first, and every one of those losses became a
    win. A side of six, and a boss with something to fall back on, fix that through the general
    rules. A boss-only resistance isn't needed.
  - **Watch points.** A lock with no break condition that blocks **every** action (Stun) would
    still empty a boss's turn. Decide how bosses meet it when content first applies Stun. If a
    softer lock on bosses is ever wanted, a shorter duration won't help, because a recast resets
    it each round. The fair form is a per-turn chance to act through the lock, as a general effect
    any creature could carry. **Decided at the 4.1-H2 grill: no break-through chance for now**
    (brief ASSUMPTION 120). H1's probe raised the boss's locked-turn share on every boss floor
    and the clear rate on none but the Leech Sovereign's (+4 to +8 points): Pacify costs a turn
    and buys a turn. Measure again when content first applies Stun, and when Phase 6 adds a
    "target lacks status" condition.
  - **Measuring it** (PR #82 review). Role scripts aim a spell at the lowest-HP enemy, which is
    almost never the boss, so the 4.1-G1 corpus never locks one: 19 boss fights have a player-side
    Pacify, and it lands on the boss in none of them. The case this rule accepts is a player script
    that aims the lock at the boss. 4.1-H's simulator runs that case on every boss floor and reports
    how often the boss spends its turn locked, and the clear rate with and without the lock.
- **Difficulty model**: each floor maps to an **enemy level range** (min–max), not a separate
  stat multiplier — enemies are ordinary creature instances at some level, using the **same
  linear growth formula** as the player's creatures (§5). Enemy level grows **faster than floor
  number** (the gap is the difficulty pressure), and the range's **width widens with depth**
  (deeper floors are spawn-level-swingier). Because HP resets each fight, deeper floors are
  harder purely because enemy level outpaces the party's own leveling pace. Walls happen when
  that gap outpaces level + build. This makes the **floor→level-range curve the single most
  important balance lever** in the game (the curve's exact shape is config; see §13).
  **Curve targets (decided at the Phase 4 close review):** the party's level should track roughly
  **the floor number**; enemies sit at about **1.25× the floor at the start**, rising linearly to
  **2× by floor 100**, then a further **+1 percentage point per floor** past 100 (for now). Enemy
  count ramps **+1 per floor over floors 1–6**, so fights are full **6v6 from floor 6**. The player
  wins the gap by **tactics and trait synergies**, not by out-levelling. These are targets a
  deterministic balance simulator reports as bands, not hard rules.
  **Early floors (decided at the 4.1-H2 grill, from 4.1-H2c):** the range's width starts at **0**
  and grows one level per ten floors, and its minimum is **rounded down**, so floors 1–9 spawn at
  exactly `floor(floor × multiplier)`: levels 1, 2, 3, 5, 6, 7, 9, 10 and 11 (floor 10's enemies
  at 13–14). The boss sits **5** levels above the range's top (was 3), so the
  narrower range doesn't make bosses easier. The early floors are balanced through this range;
  the fight count and the XP curve stay (brief ASSUMPTIONS 117–119).
- **Generation is deterministic-per-seed, fresh-per-visit**: which **biome** sits on a floor is
  fixed (the 1–100 sequence, a seeded draw for 101+, or an Atlas pin), but the **specific creatures
  a floor spawns re-roll on every descent** — re-running a floor yields different draws. This is the
  **soul-grind loop**: farm a floor repeatedly for the creature whose soul you want. All of it is
  reproducible from the run seed (a seeded RNG stream advanced per descent), so runs stay debuggable
  and testable without ever repeating content in normal play.
- **Biome progression**:
  - Early game, biomes are **discovered by descending** — you meet each new biome the first
    time you reach its depth band, in a fixed sequence. This 1–100 order is **authored, not
    incidental**: it's an **onboarding ramp in interaction *scope*, not trait depth**. Every
    creature is build-relevant from biome 1 (no filler) — what ramps is *how many moving pieces* an
    interaction spans, not how shallow it is. Biomes 1–3 use **self-contained** or
    **within-species-closed**, **single-condition** interactions (each species is authored as a
    closed mini-system); **cross-species, chained, and multi-condition** combos are deferred to
    **biome 4+**. This closes each species' **trait kit**, not the shared **spell pool** — a spell
    may apply any status (incl. another species' signature status like Web/Sleep); spell-supplied
    statuses are a shared primitive, not a deferred cross-species *trait*-chain, so a species
    amplifier that reads "enemies currently [status]" may legitimately have no source present in
    a given fight. There is **no difficulty ramp across biomes 1–3** — the enemy-level curve carries
    escalation; only interaction *scope* widens with later biomes.
  - **Spells unlock cumulatively (Phase 4 interstitial slice, pinned here):** unlike species/
    creatures, which are **biome-exclusive** (see below), the **shared spell pool is additive** —
    every `Spell` carries an `unlockedAtBiome` (1-based biome number); an enemy's loadout (every
    enemy rolls a full set from Phase 4.1-G), and the player's own equip options once Phase 8
    lands, are rolled/offered from
    **every spell whose `unlockedAtBiome` is `≤` the current biome**, filtered by affinity. A
    biome-1 spell stays available at every deeper biome; nothing is re-authored per biome once
    it exists. This is **the opposite rule from species/creature biome-exclusivity** below —
    don't conflate the two: a biome's own roster (which creatures spawn there) resets every
    biome, but its casters draw from the FULL inherited spell list, not just that biome's own
    additions. A new biome authors a focused set of its OWN
    spells — **target ≥4–5 per biome** (its own mechanics or fresh takes; a cross-affinity clone
    of an existing spell does NOT count toward the bar) — layered as *spice* on top of the large
    inherited base, never a re-authored full kit per affinity. Two failure modes bracket the bar:
    re-authoring a full kit caused Phase 4 Slice H2's own near-duplicate spells (since deleted; see
    `.claude/archive/phases/` for the record); under-authoring (shipping only 2–3) leaves later biomes thin.
    H3 (Rotcap Hollow) and every biome after author to this same ≥4–5 bar.
  - **Seed biomes (Phase 4):** the first three authored biomes are **The Overgrowth** (lush,
    sunlit entrance), **Glimmerdark** (light thins, life adapts, bioluminescence), and **Rotcap
    Hollow** (fungal — colonies, spores, spread). Mood is a **creature-design filter** — it shapes
    what feels *native*, not mechanics; every biome stays affinity-complete. Species are
    **biome-exclusive** (a new biome = all-new creatures).
  - Once **all biomes have been discovered**, the **Biome Atlas facility** lets the player
    **assign (pin) a biome to a chosen cave floor** — shaping which biome occupies a floor to
    farm, rather than taking whatever the sequence (or, past floor 100, the random draw) gave
    them. Pinning can be applied at any time, including retroactively re-pinning a floor already
    visited. Only a biome with authored content can be pinned (an unauthored biome has nothing to
    fight, so the pin is refused rather than turning the floor into a dead end).
- **Entrance hub**: a persistent base at the top of the cave where the player manages their
  collection and builds **facilities** (see below). The hub is always accessible; returning
  to it is how the player strengthens between descents.

### Facilities
Structures the player builds and upgrades **at the entrance** with **Bricks** to support deeper
expeditions. Facilities are **data-driven** (cost, effect, upgrade tiers) and part of the
permanent, forward-only progression. The player starts with minimal/none and **builds each
out** as an early-game goal. **Every facility action (craft, infuse, fuse, summon) resolves
instantly** on payment — no real-time timers/queues, consistent with the engine's no-wall-clock
rule. Only **Gem Forge, Equipment Forge, and Fusion Chamber** have upgrade tiers (each
facility's tier count is tailored individually); v1 tiers **raise the level cap**
craftable/fuseable there (cost-reduction tiers may follow later). The other three facilities
(Soul Altar, Storage/Vault, Biome Atlas) are **one-time builds** with no further tiers — they
have no throughput axis to upgrade. v1 facility list:

- **Gem Forge** — craft gems (from dropped recipes + **Essence**), augment gems, level gems
  (Essence).
- **Equipment Forge** — craft/infuse equipment (fixed base-types + dropped infusion recipes),
  level equipment, using **Ore**.
- **Fusion Chamber** — perform fusions **and** catch-up-level creatures up to the player's
  current highest-level creature, both fuelled by **Lifeforce**.
- **Soul Altar / Summoning Circle** — summon instances of any creature at 100% soul. *(Until
  Phase 8 builds facilities, summoning is available without the Altar; the gate is added with it.)*
- **Storage / Vault** — manage the unlimited collection; organize the 6-slot active party.
  *(Until Phase 8 builds facilities, party arrangement works without it; whether it stays ungated
  is a Phase 8 call.)*
- **Biome Atlas** — unlocked once **all 10 biomes are discovered**; assigns a biome to a chosen
  floor.

*(No healing facility in v1 — HP resets every fight, so there is nothing persistent to heal.)*

**Currencies & drops (structure; numbers TBD):** floors drop **Essence** (gems), **Ore**
(equipment), **Bricks** (facilities; rarer), **Lifeforce** (leveling + fusion), and **recipes**
(gem, gem-augment, equipment-infusion). Recipe drops come from a **global depth-scaled drop
table**, independent of which specific creature was defeated (not a per-creature loot table).

## Engine rules

## Generation & the run layer (Phase 4)

The **cave is generated by a pure, seeded module** (an `src/engine/` sibling to the combat
resolver) under the same discipline as combat — `(biome data + floor + curve config + RNG state) ->
FloorPlan` (a floor's fights as enemy `Creature[]`), golden-testable from a fixed seed. The
**Zustand store owns navigation + ownership only** — `deepestFloor`, `lastFloor`, the collection,
the per-creature soul `Map`, active-party order, discovered biomes, atlas pins, and the persistent
**run RNG stream** — and *calls* the generator. It **never** owns the deterministic derivation of a
floor's contents.

- **The run model is the hub plus atomic floor runs** (decided, Phase 4 close review G6).
  `descend(floor)` resolves a whole floor synchronously: every fight in sequence, HP reset between
  fights, no player choice mid-floor. There is **no "descent state"** in the store. **`lastFloor`**
  is the floor last fought (the UI pre-selects it in the floor picker; Phase 5 saves it).
  **Fast-travel is just `descend(floor)`** for any floor up to `deepestFloor + 1` (a separate
  `travelTo` action does not exist). Lands in 4.1-A (`currentFloor` → `lastFloor`, `travelTo`
  deleted).
- **Content frontier** (Phase 4.1-A, fixes G5): the last floor of the **unbroken run of
  authored biomes** from biome 1, **derived from the biome data** (authoring biome 4 moves it
  automatically, no constant to bump). Walk the biome list in order and stop at the first biome
  with **no content**: no species with a positive weight and at least one creature (exactly the
  case where the generator's weighted pick throws). A gap in authoring therefore ends the frontier
  instead of exposing floors that would crash. `descend` past it returns `{ ok: false, reason:
  'beyond-content-frontier' }` (see "State & persistence" for the store action rule). **Pins
  can't route around it** (PR #67 review): `pinBiome` refuses a biome with no content (reason
  `biome-has-no-content`), so every floor inside the frontier resolves to an authored biome
  whatever the pins; one shared "has content" check serves both. The generator's own throw on an
  empty or zero-weight pool stays: reaching generation with one is still a real bug. *(Note, not
  code: floor 101+ could draw a placeholder biome, which can't happen while the frontier sits at
  30.)*

- **`biomeForFloor(floor, pins, runSeed)`** — pure: fixed sequence 1–100, derived-seed draw 101+,
  pins override either. The 1–100 order is an authored onboarding ramp (GAME_DESIGN §4).
- **Per-visit spawn** — the specific-creature/level draws advance the **run RNG stream** (fresh each
  descent, reproducible from the run seed): re-descending a floor re-rolls its creatures (the
  soul-grind loop) while its biome stays fixed.
- **`fightCount(floor)`** — deterministic; no per-visit roll. Default (Phase 4.1-A,
  `BalanceConfig`): **`10 + (floor − 1)`, uncapped** (floor 1 = 10 fights, floor 10 = 19). Known
  risk, accepted: floor success ≈ (per-fight win chance)^(fights), so a small per-fight loss rate
  compounds; revisit with a cap or per-biome ramp if the balance simulator shows it dominating.
  **Revisited at the 4.1-H2 grill and kept** (brief ASSUMPTION 117): H1's report shows the
  compounding (floor clears follow p^n), and a flat 10 measured faster, but the design owner keeps
  the growing count and balances the early floors through the level range instead. Watch point:
  the per-fight win rate a floor needs rises with depth; T4 shows whether the curve keeps up.
- **Boss floors** (built in Phase 4 Slice I) — a floor is a boss floor **iff** `floor %
  FLOORS_PER_BIOME === 0` **and** its resolved biome carries a boss encounter (`BiomeData.boss?` —
  `{ bossId, creature, speciesId, adds[] }`); otherwise it is an ordinary floor. One rule at every
  depth: floor 101+ included (a drawn or pinned biome brings its own boss), and a biome with no
  authored boss (placeholder biomes 4–10, test fixtures) simply generates ordinary floors. A boss
  floor is **boss-only**: exactly **one** fight — the boss at slot 0, then its authored adds — with
  no trash fights (`fightCount` is not consulted). **From 4.1-G** (PR #81 review) the fight is
  `enemyPartySize(floor)` creatures like any other: after the authored adds, the remaining slots
  are filled through the ordinary spawn path (weighted species selection from the biome's pool
  **minus the boss's own `speciesId`**, run RNG, so they vary per visit). Only *which* creatures the boss brings is authored;
  everything else is the ordinary spawn path: adds roll their level within `enemyLevelRange(floor)`
  and their loadout like any spawned enemy, and the boss sits at **`bossLevel(floor)`** (a curve —
  a few levels above the range max; the offset is parked balance: **+3, then +5 from 4.1-H2c** so
  the narrower range doesn't lower boss levels, brief ASSUMPTION 119). The boss rolls its loadout
  like any enemy too (a full gem set from 4.1-G), so no boss holds an empty kit. Every add must be a member of
  the biome's own `speciesPool`, and its `speciesId` is resolved from that pool (invariant-checked,
  never re-typed). The boss's `speciesId` is explicit data (the Broodmother carries the Spiders
  species, so `living-allies-of-species` counts her together with her spiderlings). `Fight.boss?`
  marks the boss creature for the run layer.
- **`enemyPartySize(floor)`** — deterministic; no per-visit roll. Enemy count **scales with depth**,
  ramping from 1 toward the full 6-slot slate as floors deepen (an authored curve alongside
  `enemyLevelRange`/`fightCount`, clamped at the 6v6 max). Default: **+1 per floor over floors
  1–6** (`min(6, floor)`), so fights are 6v6 from floor 6. It is *not* a flat 6.
- **Enemy level curve** (decided, Phase 4 close review D1; defaults in `BalanceConfig`, 4.1-A):
  the design assumes **party level ≈ floor**. An **enemy level multiplier** rises linearly from
  **1.25 at floor 1 to 2.0 at floor 100**, then **+1 percentage point per floor** after 100 ("for
  now"): the enemy level range is anchored on `floor × multiplier(floor)` and its **width widens
  with depth**. Watch points for tuning: floors 20–30 before Phase 8 (roughly +40% enemy stats
  answered only by perks and traits) and the steep climb past 100. The exact anchoring, rounding and
  width parameters are proposed in the Phase 4.1 brief (ASSUMPTION 4) and confirmed in the 4.1-A
  plan review. **From 4.1-H2c** (brief ASSUMPTION 118): the width starts at **0** (`max = min +
  floor(floor / 10)`), and the minimum is **rounded down** (`floor` instead of `round`), so an early
  floor's minimum is exactly `floor(floor × multiplier)`. Floors 1–9 spawn at exactly 1, 2, 3, 5,
  6, 7, 9, 10 and 11; floor 10's enemies at 13–14 (its width is 1); floor 30 stays at 44 (44–47). A
  width of 2 put level-3 enemies (+50% stats) against the level-1 starters on floor 1.
- **Enemy script & loadout at spawn** (Phase 4.1-G, D4) — generation sets the enemy's `scriptId`
  from the static creature's **`defaultScriptId`**, which is its **role script** (see "Combat &
  scripting" → role scripts). **Every enemy rolls a full set of distinct gems** (one per gem slot)
  from the spells matching its affinity with `unlockedAtBiome ≤` the current biome. Duplicates are
  allowed **only as a safety net** when that pool is smaller than the slot count; a data test
  requires **≥3 spells per affinity at biome 1**, so real content never hits the net. A
  **cast-role** creature (`caster`/`support`/`opener`) with no usable spell is an invariant
  violation and **throws**, backed by a data test that every cast-role creature has a matching
  spell at its biome.
- **Rewards** (XP / soul% / currency) are a **run-layer consumer of the event log**
  (`CreatureDied.creatureId` joined against the generated enemy roster via each creature's
  `origin`), never engine state. XP goes
  to the **whole active party regardless of survival**, banked per kill, kept on wipe; **level-ups
  apply post-fight** — the engine never sees a mid-fight level change. A **boss kill** banks XP and
  currency through the same per-kill path but **no soul%** (bosses are not collectable). **Winning**
  a boss fight adds its `bossId` to `bossesCleared` (idempotent, so perk points come from the first
  clear only). A cleared boss floor can be re-fought for ordinary rewards and no further points; a
  loss banks the adds' kills as usual and records nothing.

- **Currencies** (config-tuned): Essence (gems), Ore (equipment), Bricks (facilities, rarer),
  Lifeforce (fusion + catch-up leveling), perk points (specs; non-dropped, first-boss-only,
  1000 = one maxed spec [flat list, some perks leveled], refund-on-swap, free/unlimited swap).
  All combat-dropped except perk points; all currencies are **unbounded** (no storage cap).
- **Biomes** are data (name, theme, **species spawn pool**, scaling tweaks, visuals); a floor
  picks a species from the pool, then a specific creature by **rarity-weighted seeded RNG**.
  Biome changes **every 10 floors** (10 in v1) — keep cadence/count as config constants
  (`FLOORS_PER_BIOME`, `BIOME_COUNT`). Floors
  1–100 use the fixed sequence; floor 101+ draws a biome by **seeded RNG** unless pinned via the
  Biome Atlas (pinning may retroactively override a visited floor). v1 content target: **≥6
  species/biome, ≥3 creatures/species** (~180+ creatures total). **Bosses** every 10th floor are
  unique, non-collectable. Track **deepest-reached floor** as state (fast-travel up to it).
  **HP resets every fight**; on wipe, return to hub (no loss).
- **Difficulty/depth model**: each floor maps to an **enemy level range** (not a separate stat
  multiplier) — enemies are ordinary creature instances at that level, using the same linear
  growth formula as player creatures. Enemy level grows **faster than floor number** (a multiplier
  from 1.25 at floor 1 to 2.0 at floor 100, then +1pp per floor; see "Generation & the run
  layer"); the level-range **width widens with depth** (the intended variance axis). A floor
  contains a **deterministic, depth-determined number of fights** (`fightCount(floor)` = `10 +
  (floor − 1)` by default — **not** rolled; the fight *count* is stable across visits, only the
  *creatures/levels* re-roll per visit).
  Recipe drops (gem/augment/infusion) come from a **global depth-scaled table**, independent of
  which creature died.
- **Facilities**: all facility actions (craft, infuse, fuse, summon) resolve **instantly** on
  payment — no real-time timers/queues, consistent with engine purity's no-wall-clock rule.
  Only **Gem Forge, Equipment Forge, Fusion Chamber** have upgrade tiers (tier counts differ per
  facility); v1 tiers **raise the level cap** craftable/fuseable there. Soul Altar,
  Storage/Vault, and Biome Atlas are **one-time builds** with no tiers.

## To fold

### Flow
- **scripted-intro encounter** — a rigged fight whose outcome triggers a story beat (revive the
  starter + gain the **Unicorn**) instead of wipe→hub; the Unicorn joins win-or-lose.

