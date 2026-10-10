# Spec — Run

Read this when changing descent, generation or the hub.

## Design

### The cave

- The whole world is **one cave that descends endlessly**. The player never leaves it: play happens
  at the **entrance hub** or on the **floors** below it.
- **Floors** are numbered from the entrance down; deeper is harder.
- **Depth is persistent**: the player keeps their deepest cleared floor, with no per-run reset, and
  can **fast-travel** from the hub to any floor up to one past it, so reaching a deep floor never
  means re-walking the floors above it. Floor selection is a UI feature.
- **No prestige and no resets**: progress only goes forward (`VISION.md` "Explicit non-goals").

### A descent is atomic

- Choosing a floor resolves **the whole floor at once**: every fight in order, HP reset between
  them, no player choice mid-floor, then back to the hub. The game remembers the **last floor**
  fought and pre-selects it next time.
- Clearing the floor (winning every fight) advances the deepest cleared floor. A loss or draw ends
  the descent at that fight and returns the party to the hub with everything banked so far
  (`spec/combat.md` "Encounters, rewards & wipes").

### Content frontier

- A descent past the last floor with authored content is refused: the **content frontier**, the last
  floor of the unbroken run of authored biomes from biome 1 (floor 30 with three biomes).

### Biomes

- The biome changes **every 10 floors**. v1 ships **10 biomes**: floors 1–10 are biome 1, 11–20
  biome 2, …, 91–100 biome 10. Past floor 100, each floor's biome is a **seeded draw from all 10**,
  unless the floor is pinned ("Pins").
- A biome is data: a name, a **spawn pool of species**, and a boss.
- **Content target per biome: 6 or more species, each with 3 or more creatures** (18+ per biome,
  about 180 across the ten): the largest authoring task in the project, and why creatures and
  traits are data.
- Species are **biome-exclusive**: a new biome brings all-new creatures. A biome's **mood** is a
  creature-design filter, shaping what feels native, not mechanics; every biome stays
  affinity-complete. The three authored biomes are in `content/`.
- The player **discovers** a biome by descending into it.

### The onboarding ramp

- The 1–100 biome order is **authored, not incidental**: a ramp in interaction **scope**, not trait
  depth. Every creature is build-relevant from biome 1; what grows is how many moving pieces an
  interaction spans.
- Biomes 1–3 use **self-contained** or **within-species**, **single-condition** interactions: each
  species is a closed mini-system. **Cross-species, chained and multi-condition** combos start at
  **biome 4**.
- That closes each species' **trait kit**, not the shared **spell pool**: a spell may apply any
  status, another species' signature status included, so a species amplifier that reads "enemies
  currently [status]" may have no source in a given fight.
- There is **no difficulty ramp across biomes 1–3**: the enemy level curve carries escalation.

### Spells unlock cumulatively

- Every spell has an **`unlockedAtBiome`**. A gem set rolls from **every spell with
  `unlockedAtBiome` ≤ the current biome**, filtered by affinity, so a biome-1 spell stays available
  at every deeper biome. This is the **opposite** of species, which are biome-exclusive: a biome's
  roster is new, but its spells are the whole inherited list plus its own.
- Each biome authors **at least 4–5 spells of its own** (its mechanics or fresh takes; a
  cross-affinity clone of an existing spell doesn't count), layered on the inherited base, never a
  full kit per affinity. Re-authoring a full kit makes near-duplicates; authoring only 2–3 leaves
  later biomes thin.

### Spawning

- An enemy is drawn as a **species** from the biome's pool, then a **creature within it by
  rarity-weighted draw** (rarer creatures appear less often), then a level in the floor's range,
  then its gem set.
- Nothing steers the draw beyond choosing a biome: within a biome it is pure rarity-weighted
  seeded RNG, by design.

### Fresh every visit, deterministic per seed

- A floor's **biome is fixed** (the 1–100 sequence, the seeded draw past 100, or a pin), but **its
  creatures re-roll on every descent**. This is the **soul-grind loop**: farm a floor for the
  creature whose soul you want.
- All of it is reproducible from the run seed, so runs stay debuggable and testable without ever
  repeating content in play.

### Fights per floor

- A floor has a **depth-determined number of fights**, `10 + (floor − 1)` (config): 10 on floor 1,
  one more per floor, uncapped. The count is **not rolled**: it is the same on every visit; only
  the creatures and their levels re-roll.

### HP resets every fight

- **Health resets to full between every fight**, within a floor too: there is no cross-fight
  attrition. Defend, Regen and healing are intra-fight tools.
- **Death has no lasting consequence** beyond its fight: no instance loss, no cooldown, no soul or XP
  penalty. Full HP and the whole roster are back for the next fight, whatever the outcome.

### Enemy count

- Enemies per fight ramp **+1 per floor over floors 1–6** (`min(6, floor)`), so fights are full
  **6v6 from floor 6**.

### Enemy levels

- Difficulty is an **enemy level range per floor**, not a separate stat multiplier: enemies are
  ordinary creatures at a level, grown by the same formula as the player's (`spec/creatures.md`
  "Levels and XP"). Enemy level grows **faster than the floor number**, and that gap is the
  pressure. HP resets every fight, so a deeper floor is harder only because enemy level outpaces the
  party's; a wall is where the gap outpaces level and build. The floor → level-range curve is the
  **most important balance lever** in the game.
- Targets: the **party's level tracks the floor**. An **enemy level multiplier** rises linearly
  from **1.25 at floor 1 to 2.0 at floor 100**, then **+1 percentage point per floor** past 100. The
  player wins the gap with **tactics and trait synergies**, not by out-levelling. The balance
  simulator reports these as bands, not hard rules.
- The range's minimum is **`floor(floor × multiplier)`**, rounded down; its width starts at **0**
  and grows by **one level per ten floors**. Floors 1–9 spawn at exactly levels 1, 2, 3, 5, 6, 7, 9,
  10 and 11; floor 10 at 13–14; floor 30 at 44–47.
- Watch points for tuning are in `OPEN_QUESTIONS.md` "Balance numbers".

### Boss floors

- Every 10th floor is a **boss floor**: a difficulty checkpoint and reward spike, and the **only
  source of perk points** (`spec/progression.md` "Perk points"). A boss floor is **one fight**, no
  ordinary fights.
- **Each boss is a set piece with one clear signature.** A boss may carry more than a roster
  creature's single trait, but keeps one clear signature mechanic for legibility, and the bosses
  are shaped to play differently from each other, not as three race-fights.
- **The fight is 6v6**: the boss, then its **authored adds** (the creatures its fight needs, the
  Broodmother's spiderlings), then **random creatures from the biome's own pool**, excluding the
  boss's own species, drawn like an ordinary fight's and rerolled each visit. A boss with no
  authored adds gets five random ones. The adds are ordinary kills with ordinary rewards; each
  boss's adds are in its biome's content doc.
- The boss sits **5 levels above the floor's range**.
- Bosses are unique and can't be collected ("Rewards").

### Bosses take control like any enemy

- **No boss immunity.** A boss has a full gem set and its role script like every enemy, so a lock
  **downgrades** its turn and never empties it: a Pacified striker casts a random gem instead of
  attacking, a Silenced caster attacks. A lock recast every turn holds all fight, and that is the
  intended price: one of the player's creatures spends every turn on it, against one enemy of six.
- A side of six and a boss with something to fall back on keep one lock from switching off the
  whole enemy side; a boss-only resistance isn't needed.
- **No break-through chance.** A lock that blocks **every** action with no break condition (Stun)
  would still empty a boss's turn: decide how bosses meet it when content first applies Stun. A
  softer lock on bosses couldn't come from a shorter duration (a recast resets it each round); the
  fair form would be a per-turn chance to act through the lock, as a general effect any creature
  could carry. Measure again when content first applies Stun and when Phase 6 adds a "target lacks
  status" condition.
- Role scripts aim spells at the lowest-HP enemy, which is almost never the boss, so the case this
  rule accepts is a player script aiming the lock at the boss. The balance simulator runs that case
  on every boss floor and reports how often the boss spends its turn locked, and the clear rate
  with and without the lock.

### Rewards

- Rewards **bank per kill** (`spec/combat.md` "Encounters, rewards & wipes"): XP to the whole active
  party (`spec/creatures.md` "Levels and XP"), soul% to the creature's bar (`spec/creatures.md`
  "Souls") and currency. A wipe keeps them.
- **Level-ups apply after each fight**: the engine never sees a level change mid-fight, and the
  party fights the floor's next fight at its new levels.
  **Known bug:** `main` materializes the party once per descent and applies the floor's XP after the
  whole floor, so levels never change between the fights of one floor. The fix is listed in
  `ROADMAP.md` Phase 4.5 "Decided, not built".
- **A boss kill** banks XP and currency through the same per-kill path, but **no soul%**.
- **Winning** a boss fight records the boss as cleared; perk points come from the **first clear
  only**. A cleared boss floor can be fought again for ordinary rewards. A loss banks the adds'
  kills and records nothing.

### Currencies

- Floors drop **Essence** (gems), **Ore** (equipment), **Bricks** (facilities; rarer) and
  **Lifeforce** (levelling and fusion), per kill, scaled by depth (config). **Perk points** are a
  separate, non-dropped currency (`spec/progression.md` "Perk points").
- Every currency is **unbounded**: no storage cap.

### Pins

- A floor can be **pinned** to a biome, overriding the 1–100 sequence or the draw past 100, at any
  time, retroactively too. Only a biome with authored content can be pinned: an unauthored biome
  has nothing to fight.

### Entrance hub

- A persistent base at the top of the cave, always reachable: the player manages the collection
  there and strengthens the party between descents.

### Scripted intro

- `runScriptedIntro` is a fixed fight against a level-1 **Unicorn**, through the ordinary resolver
  and outside any floor run. It never ends in wipe → hub: the Unicorn joins (if not owned) whether
  the fight is won, lost or drawn.
- Callers run it right after `setSpec` at a new game; the store doesn't enforce that order.

## Engine rules

### Generation is a pure seeded module

- The cave is generated in `src/engine/` under combat's discipline: `generateFloor(floor, biome,
  biomeIndex, allSpells, runRng, balanceConfig) -> Fight[]`, the floor's fights as enemy
  `Creature[]`, golden-testable from a fixed seed. The store calls it and never derives a floor's
  contents itself (`spec/store.md` "The store owns navigation and ownership").
- Every curve (`fightCount`, `enemyPartySize`, `enemyLevelRange`, `bossLevel`) is a pure function
  of `(floor, BalanceConfig)`, never a literal; the values live in `src/data/balance.ts`.
- `FLOORS_PER_BIOME` and `BIOME_COUNT` are config constants (10 and 10).

### Floor runs

- **`descend(floor)`** resolves a whole floor synchronously; there is **no descent state** in the
  store. **`lastFloor`** is the floor last fought. **Fast travel is `descend(floor)`** for any floor
  up to `deepestFloor + 1`.
- Each descent draws its generation RNG and each fight's combat seed from `runSeed` and
  `runCounter`, and advances `runCounter`. Re-descending a floor re-rolls its creatures; its biome
  stays fixed. Every descent adds its biome to `discoveredBiomes`.

### biomeForFloor

- **`biomeForFloor(floor, biomes, atlasPins, runSeed)`**, pure: a pin wins; floors 1–100 take the
  fixed sequence (decade N → `biomes[N]`); floor 101+ takes a draw seeded from the run seed and the
  floor. The 1–100 order is positional, so an existing biome slot never changes place.

### Content frontier and pins

- **`contentFrontier(biomes)`** walks the biome list in order and stops at the first biome with **no
  content** (`biomeHasContent`: no species with a positive weight and at least one creature,
  exactly the case where the generator's weighted pick throws). It is derived from the biome data,
  so authoring a biome moves it with no constant to bump, and a gap in authoring ends it instead of
  exposing floors that would crash. `descend` past it returns `{ ok: false, reason:
  'beyond-content-frontier' }`.
- **Pins can't route around it**: `pinBiome` refuses a biome with no content (reason
  `biome-has-no-content`) through the same `biomeHasContent` check, so every floor inside the
  frontier resolves to an authored biome whatever the pins.
- The generator's own throw on an empty or zero-weight pool stays: reaching generation with one is
  a real bug.

### Boss floor generation

- A floor is a boss floor **iff** `floor % FLOORS_PER_BIOME === 0` **and** its resolved biome has a
  boss (`BiomeData.boss?: { bossId, creature, speciesId, adds[] }`). The rule holds at every depth,
  floor 101+ included; a biome with no boss (the unauthored biomes, test fixtures) generates
  ordinary floors.
- A boss floor is exactly **one** fight, and `fightCount` is not consulted. The boss is at slot 0 at
  **`bossLevel(floor)`** (the range's maximum plus `bossLevelOffset`), then its authored adds, each
  at a level within `enemyLevelRange(floor)`, then the fill up to `enemyPartySize(floor)` through
  the ordinary spawn path, over the biome's pool **minus the boss's own `speciesId`**, from the run
  RNG. The boss and every add roll their gem set like any spawn, so no boss holds an empty kit.
- Every add must be a member of the biome's own `speciesPool`; its `speciesId` is resolved from
  that pool (invariant-checked, never re-typed). The boss's `speciesId` is explicit data (the
  Broodmother carries the Spiders', so `living-allies-of-species` counts her with her
  spiderlings). `Fight.boss` marks the boss creature for the run layer.

### Enemy script and gem set

- Generation leaves the enemy's `scriptId` unset, so `materializeCreature` gives it the creature's
  `defaultScriptId`, its role script (`spec/scripting.md` "Role scripts").
- **Every enemy rolls a full set of distinct spells** (`rollLoadout`, one per regular gem slot) from
  the spells of its affinity with `unlockedAtBiome` ≤ the current biome. Duplicates appear only as
  a safety net when that pool is smaller than the slot count; a data test requires **≥3 spells per
  affinity at biome 1**, so real content never reaches the net.
- A **cast-role** creature (`caster`, `support`, `opener`; `CAST_ROLE_SCRIPT_IDS`) with no usable
  spell is an invariant violation and **throws**, backed by a data test that every cast-role
  creature has a matching spell at its biome.

### Rewards are a run-layer consumer of the event log

- XP, soul% and currency are read from the event log (each `CreatureDied` joined to the generated
  enemy through its `origin`), never kept as engine state. `Fight.boss` singles out the boss kill.
- Winning a boss fight adds its `bossId` to `bossesCleared`, idempotently.

## Not built

### Facilities

- Phase 8 builds them. Structures the player builds and upgrades **at the hub** with **Bricks**:
  data-driven (cost, effect, tiers), part of the permanent progression, built out as an early-game
  goal from little or nothing.
- **Every facility action** (craft, infuse, fuse, summon) **resolves instantly** on payment: no
  timers or queues, which the engine's no-wall-clock rule requires.
- Only the **Gem Forge, Equipment Forge and Fusion Chamber** have upgrade tiers (tier counts per
  facility); in v1 a tier **raises the level cap** craftable or fusable there (cost-reduction tiers
  may follow). The others are **one-time builds**: they have no throughput to upgrade.
- The v1 list:
  - **Gem Forge**: craft gems (dropped recipes and Essence), augment and level them (Essence)
    (`spec/creatures.md` "Gems as items").
  - **Equipment Forge**: craft, infuse and level equipment with Ore (`spec/creatures.md`
    "Equipment").
  - **Fusion Chamber**: fusion and catch-up levelling, for Lifeforce (`spec/creatures.md` "Fusion",
    "Catch-up levelling").
  - **Soul Altar**: summoning happens there once it exists.
  - **Storage / Vault**: manages the collection and the party; whether party arrangement then needs
    it is Phase 8's call.
  - **Biome Atlas**: pinning ("Pins") then needs it, and it unlocks once **all 10 biomes are
    discovered**.
- No healing facility: HP resets every fight, so there is nothing persistent to heal.

### Recipe drops and currency sinks

- Phase 8 builds them. Floors also drop **recipes** (gem, augment, infusion) from one **global,
  depth-scaled table**, not from the creature defeated.
- Essence and Ore are the long-tail sinks; Bricks is a front-loaded build-out sink that tapers.

### Biome theme and visuals

- Phase 10 builds them. A biome's data also carries a theme, scaling tweaks and visuals.
