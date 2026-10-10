# Spec — Creatures

Read this when changing collection, creatures or gems.

The seed roster (the 18 species of the three authored biomes, their bosses, the three starters and
the Unicorn) is described in the content docs (`content/overgrowth.md`, `content/glimmerdark.md`,
`content/rotcap-hollow.md`, `specializations/`), which describe what `main` ships.
`species/_species-backlog.md` is un-selected inspiration, not spec.

## Design

### Species, creatures and instances

- **Species**: a grouping of related creatures (the Spiders). A species spans several creatures and
  several affinities, and its creatures' traits generally synergize, by design. Biomes spawn
  species; the creature is drawn within the species (`spec/run.md` "Spawning").
- **Creature**: the unit, a data template, and the thing you collect, with its own soul bar. It has
  a name, an affinity, base stats, one innate trait, a rarity, a parent species and a **role**: its
  default script, one of the seven role scripts (`spec/scripting.md` "Role scripts"). It runs its
  role as an enemy, and an owned instance runs it until a script is assigned.
- **Instance**: a copy of a creature the player owns. It stores only what can't be derived
  (Engine rules, "Instance").
- There is no "class": affinity is the only such axis.

### Identity and rarity

- A creature's **name** is its full display name ("Treant Grovekeep", "Broodmother"), stored whole,
  never assembled from the species name.
- **Rarity** has three tiers in v1, Common, Uncommon and Rare, built to take more later. Rarity
  sets a creature's spawn weight and its soul gain.
- No sprite or emoji field exists: Phase 7 adds it with its asset format.

### Affinity

- One of **Vitality, Violence, Wit, Endurance, Instinct**: the creature's behavioural drive
  (teeming life, raw aggression, sharp cunning, stubborn toughness, feral quickness). It lives on
  the creature, so one species can hold several.
- Each affinity **softly corresponds to a stat**: Vitality→Health, Violence→Attack,
  Wit→Intelligence, Endurance→Defence, Instinct→Speed. It is a flavour lean and a trait hook
  (a trait may scale off its affinity's stat), never a constraint on the creature's stats: an
  off-lean creature is a legitimate surprise.
- The affinity cycle that drives damage is `spec/combat.md` "Affinity advantage".

### Core stats

- **Health, Attack, Intelligence, Defence, Speed.** Attack drives the Attack action, Intelligence
  drives spells (the Cast action), Defence mitigates, Speed sets turn order within a round.
- Base stats are **fixed per creature**: **Health 20–45, every other stat 10–30**. Every instance of
  a creature shares them; there are no per-instance rolls.

### Trait and gem slots

- A creature has **one innate trait**.
- It has **3 regular gem slots** (`DEFAULT_GEM_SLOT_COUNT`). Its innate spells, if any, sit in extra
  slots before them ("Innate spells"). Spells aren't gated by role: every creature has gem slots,
  and its script chooses which gem to cast.

### Levels and XP

- Creatures level **only through combat XP**. **Each kill grants XP equal to the victim's level** to
  every creature in the active party, alive or not.
- XP to the next level is **`20 × level²`** (config). The XP a floor yields grows with the floor's
  square (more fights, higher-level enemies), so the party's level can track the floor at every
  depth.
- **Level-N stat = `round(base × (1 + 0.25 × (level − 1)))`**: +25% of base per level, level 1 =
  base (base 20 gains 5 a level, 65 at level 10). It is recomputed from base at every level, never
  accumulated, so there is no rounding drift, and the exact-quarter inputs keep it deterministic.
  There is no growth-rate field.
- **Level is uncapped.** It climbs with depth (`spec/run.md` "Enemy levels"), and the formula holds
  at any level.
- Levels keep stats in a sane range for the subtractive damage formula; the power curve comes from
  build sources (`spec/progression.md` "Build power is the incremental curve").

### Souls

- Defeating a creature grants a **percentage of its soul**, tracked **per creature**, not per
  species. It banks the instant the creature dies (`spec/combat.md` "Encounters, rewards &
  wipes").
- Soul gain is a **flat percentage per rarity**: **25% Common, 20% Uncommon, 10% Rare** (config),
  with no variance and no diminishing returns. Rarer creatures take longer; depth doesn't change
  the gain.
- Soul% **caps at 100%**. **Bosses grant no soul%**: they can't be collected.
- At **100%** the creature is **permanently unlocked**: the player can **summon** it any time from
  the hub, free, as many duplicates as wanted. A summon drops into the first free party slot, if
  there is one.
- Which creature spawns can't be steered beyond choosing a biome, by floor or by pin
  (`spec/run.md` "Spawning"): the soul hunt is a deliberate grind.

### Cold start

- The player begins with **exactly one creature**, the starter of the chosen specialization
  (`spec/progression.md` "Specializations"), and the **Unicorn** joins in the scripted intro
  (`spec/run.md` "Scripted intro").
- **Floor 1 is solo-clearable** with the starter, and the first soul completes fast: the opening
  aims at **a full party of 6 within the first session** (the first 10 floor runs). Enemy count
  ramps toward 6v6 alongside it (`spec/run.md` "Enemy count").

### Roster and party

- The collection is **unlimited**; the active **party is 6**, arranged freely at the hub (any
  instance into any slot; moving one onto an occupied slot swaps the two).
- **Duplicates** may share the party: instances are independent.
- The Unicorn is **permanently owned** but can be benched like any creature.

### Spells

- A **spell** is a target shape (single or all), an intended **target side** (enemy or ally) and a
  list of **effects**: the same responses traits use (deal damage, heal, apply a status, apply a
  stat-modifier, remove a status, …), run once per target it lands on. A status-only spell, a
  cleanse or a drain is just data.
- **Spell affinity:** every spell carries an affinity, and a creature can hold a spell only of its
  own affinity. The gate governs **holding only**: the damage cycle stays keyed on the **caster's**
  affinity. Innate spells are outside the gate. An off-affinity exception is parked
  (`OPEN_QUESTIONS.md` "Off-affinity spell equipping").
- **Gem sets:** every enemy rolls a full set of distinct spells at spawn (`spec/run.md` "Enemy
  script and gem set"); every player instance rolls one when it is created and keeps it (Engine
  rules, "Player gem sets").
- **Innate spells:** a trait may give a creature a spell of its own (the Glyphmoth Seer's Arcane
  Bolt). It is not a gem: it can't be levelled or augmented, it needs no matching affinity, and it
  sits in an extra slot before the regular gem slots. The same spell can also exist as an ordinary
  gem.

### Authoring spells

- Each affinity has a **centre of gravity**: its signature buff and debuff key off its own mapped
  stat, and **Vitality** is the main healer and the home of Regen. It is a default, not a fence:
  theme-fitting exceptions are welcome anywhere.
- **Wit** spells are the most *potent* damage (not the most numerous), since Wit maps to
  Intelligence and spells scale off it.
- A spell **scales off Intelligence by default**, a minority off their affinity's mapped stat,
  another stat rarely (the mechanism: `spec/combat.md` "The stat a spell's magnitude scales off").
  A pure-utility spell (a status only, a cleanse) has no damage or heal effect.
- A spell's **flavour and affinity are independent**: an elementally named spell can carry any
  affinity.

## Engine rules

### Content is data

- Creatures, species, traits, spells, statuses, biomes, specializations and perks, and the scaling
  curves are data in `src/data/`, checked by their types.

### Species and creature data

- A `Species` holds its creatures; biome spawn pools list species. A creature (`SpeciesCreature`)
  carries `id`, a required `name`, `affinity`, `baseStats`, `defaultScriptId` (its role),
  `innateTraitIds` and `rarity`. Its species is the one whose list holds it.
- Identity (species and name) and affinity are separate fields, so a fusion can take them from
  different parents ("Fusion").

### Instance

- `Instance = { id, source, level, xp, scriptId, gems }`:
  - `id` is **opaque** (`'inst-17'`), never embedding the creature id;
  - `source` is `{ kind: 'creature', creatureId }` or `{ kind: 'fusion', identityParent,
    affinityParent }` (a recipe of two static creature ids);
  - `level` and `xp`; level is uncapped;
  - `scriptId: string | null`, the assigned script template; `null` runs the creature's role;
  - `gems: (spellId | null)[]`, the gem set rolled and **stored** when the instance is created,
    slot-positional (one entry per regular gem slot), `null` only for a slot the pool couldn't fill.
    Materialization resolves each id through the spell registry, and an unknown id **throws** (data
    drift fails loudly).
- Affinity, traits, base stats and fused-ness are **derived** from `source`, never stored.
  Materializing a fusion-sourced instance throws: fusion isn't built ("Fusion").

### materializeCreature

- **`materializeCreature(template, { level, side, slot, speciesId, gems?, scriptId?, ref? })`**:
  pure and **RNG-free** (generation already spent the randomness), with a **named options object**
  so no two same-typed arguments can be swapped silently. It bakes the level into `baseStats` with
  `scaleStatsToLevel`, copies the affinity and innate trait ids, takes the given gems (all-null
  slots if none), sets `scriptId` to the given one or else the template's `defaultScriptId`, and
  fills `origin` and `level`. Final HP is set by `createCombat`, not here.
- Player instances and generated enemies share this path: an enemy is a transient instance at a
  level, never a separate stat block.

### Creature.level and Creature.origin

- **`Creature.level`** is the level `materializeCreature` baked in. The engine reads it (the
  Additional reads the attacker's level).
- **`Creature.origin: { templateId, level, ref? }`** is required and **engine-inert**: the static
  creature id, the level it was materialized at, and an **opaque** `ref` string (the run layer
  puts the `InstanceId` there; to the engine it is a plain string, not the state-layer brand). The
  engine never reads it. Rewards read it: the soul bar is `origin.templateId` and the XP is
  `origin.level`, so nothing parses `CreatureId` suffixes.
- The `makeCreature` test helper supplies a default `level` and `origin`.

### Spell affinity gate

- **`canEquip(spell, affinity)`** is `spell.affinity === affinity`: one universal data-driven
  predicate, no per-creature allow-lists. `rollLoadout` uses it for every gem set, enemy and
  player; Phase 8's equipping reuses it. Innate spells are never equipped, so it never applies to
  them.
- No exception seam is pre-built for off-affinity equipping.

### Player gem sets

- Every new player instance (the starter grant, the Unicorn, a summon) rolls its gems **once, at
  creation**, through the enemy's own roll (`rollLoadout`: distinct picks, the safety net, the
  cast-role throw; `spec/run.md` "Enemy script and gem set"), and stores them on the instance.
- **A stored set never changes**: nothing re-rolls it, so a set reflects the depth at which it was
  made. The starters and the Unicorn are granted at floor 0 and can never be summoned (they bank
  no soul), so they keep a biome-1 set; a creature summoned again deeper can roll a deeper spell.
- **Its own RNG:** the roll draws from `createRng(hashGemDraw(runSeed, instance ordinal))`, a hash
  with its own constants. It never reads or advances `runCounter`, so a gem roll can't shift a
  floor draw.
- **The unlock biome** is the biome of `min(100, max(1, deepestFloor))`, ignoring atlas pins: the
  pool follows depth, never a farming pin, and stops growing at floor 100.
- **No innate duplicates:** the pool excludes the spells of the creature's own `innate-spell`
  effects (the Seer never rolls Arcane Bolt). The exclusion lives in the store, which has the trait
  registry. No spawnable enemy carries an innate spell, and a data test pins that, so enemies need
  no copy of the rule.

### Innate spells

- An innate spell is a passive **`innate-spell { spell }`** effect on a trait (the Seer's Arcane
  Surge). It has no level and no augments, by construction.
- **Fight setup places it**: `createCombat` reads the creature's `innate-spell` effects in
  canonical order and prepends their spells to `equippedSpells`. A materialized creature carries
  **regular gem slots only**; the Seer fights with Arcane Bolt at index 0 and its three regular
  slots after it. Fight setup refuses already-set-up creatures, so innate slots can't be doubled
  (`spec/combat.md` "Fight setup").
- No equip gate applies, because the spell isn't equipped.
- A creature may also hold the same `Spell` as an ordinary gem.

## Not built

### Gems as items

- Phase 8 builds it, and migrates each instance's stored `gems` into real level-1 gems.
- A **gem** is `{ spell, level, augments[] }`. Its **level** sets how many **augment slots** it has
  (a small fixed maximum, 3–5), not its damage. Gem level is bounded by a fixed maximum, which Gem
  Forge tiers raise. Gems are **levelled with Essence**.
- **Augments** are data-defined effects slotted into a gem: an augment **appends responses** to its
  spell's `effects` list (an extra target, an added or stronger status, a buff on cast, …). They
  are the same effect-framework objects as traits and infusions.
- Gems are crafted and augmented at the **Gem Forge** with Essence; gem and augment **recipes** drop
  from floors (`spec/run.md` "Recipe drops").
- Gems are a **shared, finite inventory**. A gem is equipped on one creature at a time, **free and
  instant** to equip or unequip, gated by the spell's affinity ("Spell affinity gate").
- Traits and effects can change a creature's gem-slot count (the Sorcerer's True Wit).
- When gems become objects, an innate spell no longer fits the gem array: expect innate slots to
  become a separate list the cast pipeline reads ahead of the gem slots.

### Fusion

- Phase 8 builds it, at the **Fusion Chamber**, for **Lifeforce**. Two creatures fuse into one: the
  main build-crafting mechanic.
- **Each creature can be fused only once**, and a fusion result is itself fusion-locked
  (`hasFused`, derived from the recipe source). That caps a creature at 2 innate traits.
- **Both inputs are consumed.** Their equipped gems and equipment first unequip back to inventory,
  so fusion destroys only the two instances and their level and XP. An input at 100% soul can be
  summoned again.
- Fusion is **species-agnostic**, except that two instances of the **same creature can't fuse**
  (two identical innate traits are no trade-off). No other level or state prerequisite.
- The result:
  - **identity** (species, name, sprite) from **parent 1**, the identity parent;
  - **affinity** from **parent 2**, the affinity parent;
  - **base stats** the **per-stat average** of both parents, so fusion combines traits and affinity,
    it doesn't stack stats (two high-Attack parents can't make a higher one); growth follows from
    the new bases;
  - **traits**: both parents' innate traits (2), and an innate spell travels with its trait;
  - **level 1**, brought up by catch-up levelling ("Catch-up levelling");
  - **no rarity**: a fusion result is neither spawned nor collected.
- The player chooses which parent is parent 1.
- **A fused instance is stored as its recipe and derived on load** from static data: identity,
  affinity, averaged stats, both traits. That is sound because a parent is never itself a fusion
  and fusion reads only static per-creature data. Accepted consequence: rebalancing a creature
  changes every existing fusion made from it. Never store a computed fusion result.

### Equipment

- Phase 8 builds it. The effects an equipment carries are the effect framework that exists today,
  so nothing about equipment needs to exist before then.
- **One equipment slot** per creature in v1. Equipment is **stat-focused**, where gems are
  spell-focused.
- Parallel to gems: an equipment has a **level** (bounded, raised by Equipment Forge tiers) that
  sets its **infusion slots** (a small fixed maximum, 3–5). **Infusions** are the same
  effect-framework objects as augments and grant stats, traits or other effects; an infused trait
  is a creature's third trait source. Equip and unequip are free and instant.
- Base equipment is a **small fixed set of base types**, stat-flavour variants (a Health charm, a
  Defence plate) competing for the one slot; variety comes from infusions. Infusion **recipes**
  drop from floors.
- Crafted and infused at the **Equipment Forge** with **Ore**, and levelled with Ore.

### Catch-up levelling

- Phase 8 builds it. At the Fusion Chamber, a creature can be levelled with **Lifeforce** up to the
  player's **highest-level creature**, never beyond, so fresh summons and fusions are viable at
  depth. The ceiling rises only through combat XP.

### Summoning at the Soul Altar

- Phase 8 builds the Soul Altar (`spec/run.md` "Facilities"), and summoning then requires it.
