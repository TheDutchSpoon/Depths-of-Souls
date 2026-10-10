# Spec — Creatures

Read this when changing collection, creatures or gems.

## Design

## 5. Creatures

> **Seed roster catalogued in `.claude/species/`.** The 18 seed species (6 per biome), the 3
> bosses, and the Unicorn intro-helper are authored in `.claude/species/species-locked.md` (locked
> mechanics; the canonical roster the coding agent stamps into data). `.claude/species/_species-backlog.md`
> holds **un-selected inspiration — not spec.**

The game uses a **three-tier model**:

- **Species** = a *grouping* of related creatures (e.g. "Spider"). A species spans **multiple
  creatures** and **multiple affinities**. Traits within a species **generally synergize** (a
  design principle — see example below). Species has mechanical weight: **biomes spawn species**
  (the specific creature is chosen within the species; see §4).
- **Creature** (the unit, a data template) = a specific creature within a species (e.g. "Black
  Spider"). A creature carries its **name**, **affinity**, **base stats**, **innate trait**, a
  **role** (its default script, `defaultScriptId`: one of the seven role scripts in §8 — striker,
  guardian, warden, caster, support, opener, taunter — used when it spawns as an enemy and as a summoned
  creature's starting script, overridable later), rarity, and its parent species. This is the
  collectible thing (its own soul bar). *(Spells aren't caster-gated — any creature has gem slots.
  Every enemy rolls a full set of distinct gems from its affinity's unlocked spells; a creature
  whose role casts always has something to cast.)*
- **Instance** (owned, in save) = a copy of a creature the player owns. It **stores** only what
  can't be derived: its **source** (a creature, or a fusion recipe of two creatures), current
  **level/XP**, its assigned **script**, and (until Phase 8) a **gem set rolled when it is created**.
  Its **affinity** (which may differ after fusion), **trait slots** (1 innate, or 2 after fusion),
  base stats and fused-ness are **derived** from the source. Equipped gems as inventory items (≤3)
  and equipment (1) arrive with Phase 8.

> **Species-synergy example** — the Spider species:
> - *Black Spider* — affinity **Instinct**; innate trait: deals **+30% damage to webbed enemies**.
> - *Webbing Spider* — affinity **Vitality**; innate trait: **applies Web** when its attack hits.
> Two creatures, same species, different affinities, traits built to combo.

Each creature (the unit) has:

- **Identity**: parent species, name, sprite/emoji placeholder, rarity (v1 ships **3 rarity
  tiers — Common, Uncommon, Rare** — designed to expand with more tiers later). The **name** is the
  full display name (e.g. "Treant Grovekeep", "Broodmother"), stored whole, never assembled from
  the species name. **Sprite/emoji is deferred to Phase 7**, which owns the asset format (no empty
  field is added before then).
- **Affinity**: one of **Vitality, Violence, Wit, Endurance, Instinct** — the *behavioral drive*
  the creature embodies (Vitality = teeming life/resilience, Violence = raw aggression, Wit = sharp
  cunning/mind, Endurance = stubborn toughness, Instinct = feral quickness). Affinity lives **on the
  creature**, so one species can contain creatures of different affinities. Each affinity **softly
  corresponds to a stat** — a flavor lean and a trait hook (traits may "scale off my affinity's
  stat"), **never a constraint** on a creature's actual stats (an off-lean creature is a legitimate
  surprise): Vitality→Health, Violence→Attack, Wit→Intelligence, Endurance→Defence, Instinct→Speed.
  Cycle (see §7): Vitality > Violence > Wit > Endurance > Instinct > Vitality.
- **Core stats**: **Health, Attack, Intelligence, Defence, Speed.** Attack drives physical
  damage (Attack action), Intelligence drives spell power (Cast action), Defence mitigates,
  Speed drives turn order within a round.
  - **Scale**: base stats are **fixed per creature** in the design range **10–30** per stat,
    except **Health, 20–45** (the design range, not a per-capture roll — all instances of a
    creature share the same base stats; no individual IV-style rolls in v1). Health's wider range
    is from 4.1-H2c (brief ASSUMPTION 125): every creature's Health was remapped linearly from
    10–30, `floor(20 + (old − 10) × 1.25 + 0.5)`, so creatures are beefier and each keeps its
    place in the range.
- **Trait slots**: a base creature has **1 innate trait**; a fused creature carries **both
  parents' innate traits** (2). Equipment can carry additional trait(s) via infusion (third
  trait source). See §6.
- **Spell gems**: spells are **equipped as spell gems** (not innate). Each creature has **3 gem
  slots** by default (modifiable by traits/effects). Scripts choose which equipped gem to Cast.
  See Spell gems below.
- **Equipment**: **1 equipment slot** per creature (see §6 / Equipment).
- **Level & XP**: creatures level **only via combat XP**. **Each kill grants XP equal to the
  defeated creature's level** (to every party member); the XP needed per level grows with the
  square of the level (default `20 × level²`, config), because the XP a floor yields grows with the
  floor's square (more fights × higher-level enemies), so party level can track the floor at every
  depth. Stat growth is **linear and derived
  purely from base stats** — there is *no separate growth-rate field*. Level-N stat =
  `round(base × (1 + 0.25 × (level − 1)))` — **rounded to the nearest integer**, recomputed from
  base each level (never accumulated, so no rounding drift); inputs are exact quarters, so the
  rounding is fully deterministic, and integer stats keep the level-up readout clean (i.e. +25% of
  base per level; level 1 = base; base 20 → +5 per level → L10 = 65). **Level is uncapped** — it climbs indefinitely in step with floor
  depth (see §4 difficulty model); the formula holds at any level. This keeps the formula's
  output in a sane range for the subtractive damage formula; the incremental power curve comes
  from **multiplicative build sources** (traits, gems/augments, equipment/infusions, fusion,
  facility upgrades, spec perks) stacking in the build-modifier pools / effective stats, not from
  levels.
  - **Catch-up leveling**: at the Fusion Chamber, a creature can be leveled (using **Lifeforce**)
    up to the player's **current highest-level creature** — pure catch-up so fresh
    summons/fusions are viable at depth. The ceiling itself rises only through combat XP.

### Soul collection & summoning
Creatures are obtained via **souls**, not direct capture:
- Defeating a creature grants a **% of that creature's soul** (tracked **per creature**, not per
  species — Black Spider and Webbing Spider have separate soul bars). This reward is **banked
  the instant the creature dies**, regardless of how the fight as a whole ends (see §7
  Encounters).
- **Rarer creatures grant less %** per defeat (slower to complete): soul-gain is a **flat
  percentage, fixed per rarity tier** (no variance, no diminishing returns; config default from
  Phase 4.1-A: **25% common / 20% uncommon / 10% rare**). Rarity is the knob; depth does not affect soul gain in v1.
- There is **no way to target/bias which specific creature spawns** beyond choosing a biome (via
  discovery or the Biome Atlas); within a biome, the species → creature draw is pure
  rarity-weighted seeded RNG, by design (soul-hunting is an intentional grind/RNG loop).
- At **100%** soul, the creature is **permanently unlocked** — the player can **summon** new
  instances of it freely thereafter (at the Soul Altar once Phase 8 builds it; before that,
  directly from the hub). Summoning is free, duplicates are unlimited, and a new summon drops into
  a free party slot if there is one. Soul% **caps at 100%** (no overkill).
- **Bosses cannot be soul-collected** (they grant no soul%); they are unique challenges.
- **Cold start**: the player begins with **exactly one creature**, determined by their starting
  **specialization** (the starter fits the spec's playstyle), joined by the **Unicorn** in the
  scripted intro. Building out a full party via soul collection is an explicit early-game goal.
  **Floor 1 is solo-clearable** with the starter, and the first soul completion comes fast — the
  opening is designed for quick momentum: **a full party of 6 within the first session** (taken as
  the first 10 floor runs), not a grind wall. More creatures means more options, and early floors
  ramp enemy count toward 6v6 alongside it (§4).
- **Roster**: collection is **unlimited**; the active **party is 6**, freely arranged at the hub
  (any instance into any slot; moving one onto an occupied slot swaps the two). The Unicorn is
  **permanently owned** but can be benched like any creature.
  **Duplicate creatures are allowed** across party slots (two instances of the same creature can
  both be active at once) — instances are independent (level, gems, equipment, fusion state).

### Spell gems
- A **gem** carries one spell and is modeled as `{ spell, level, augments: Augment[] }`. A
  **spell** is a target shape (single / all), an intended **target side** (enemy / ally) and a list
  of **effects**: the same responses traits use (deal damage, heal, apply a status, apply a
  stat-modifier, remove a status, …), run once per target it lands on. So a status-only spell, a
  cleanse or a drain is just data, and an augment simply **adds effects** to the list.
- **Innate spells**: a trait may grant a creature a spell of its own (the Sorcerer starter's Arcane
  Bolt). An innate spell is **not a gem**: it can't be levelled or augmented, it needs no matching
  affinity (it isn't equipped), it sits in an extra slot **before** the regular gem slots, and it
  **travels with its trait through fusion**. The same spell can also exist as an ordinary gem.
- **Spell affinity & equip-gating**: every spell carries an **affinity** (one of the five — Vitality,
  Violence, Wit, Endurance, Instinct) and is **equippable only on a creature of matching affinity**, tying
  loadouts to a creature's domain instead of letting anything cast anything. The gate governs
  **equipping only** — it does **not** feed the damage affinity cycle, which stays keyed on the
  **caster's** affinity (§7). **Enemy** loadouts are **rolled at generation** from the
  affinity-matched pool (fresh per visit, reproducible from seed): **every enemy rolls a full set
  of distinct gems**. **Player** loadouts are player-chosen and persistent from Phase 8; until then
  each owned instance **rolls a random gem set when it is created** and keeps it (Phase 8 converts
  it into real level-1 gems). *(An off-affinity exception via a trait/perk is parked post-beta —
  §13; until then the gate is universal. Innate spells are outside the gate.)*
- **Seed spell set (Phase 4 content).** ~10 spells per affinity (~50 total), authored as **data
  against a shared template** (not designed one-by-one). Every affinity gets the full kit —
  **damage** (single + AOE), **stat-buff** (self/ally) and **stat-debuff** (enemy) — both permanent
  **stat-modifiers** (last the fight), distinct from timed **statuses** — other
  **debuffs** (DoT, Stun, Vulnerability) and **buffs** (Regen, etc.), and **heals/support** — with a
  per-affinity **centre of gravity** (its signature buff/debuff keys off its own mapped stat;
  **Vitality** is the primary healer / Regen home) that is a *default, not a fence*: theme-fitting
  exceptions are welcome anywhere. **Wit** spells are the most *potent* damage (not more numerous),
  since Wit→Intelligence and Cast scales off Intelligence.
  - **Support is in scope** (heals, ally/self buffs) — a model extension over the offensive-only
    built Spell (see Phase-4 systems addenda in CONVENTIONS).
  - **Scaling:** off **Intelligence by default**; a minority off their **affinity's mapped stat**
    (flavored exception); other-stat rare. The scaling stat sits on the spell's damage/heal effect
    (remap-aware Intelligence by default, or a `scalingStat` of `Intelligence | Health | Attack |
    Defence | Speed`). A pure-utility spell (status only, a cleanse) simply carries no damage/heal
    effect.
  - **Every affinity has at least 3 biome-1 spells**, so every enemy's full distinct gem set can
    be filled from biome 1 on (a data test guards it).
  - Spell **flavor and affinity are independent layers** — an elementally-named spell can carry any
    behavioral affinity; no renaming needed.
- **Gem level governs how many augment slots** the gem has (not its damage — damage is purely
  Intelligence-driven). Gems are **leveled via Essence**. **Gem level is bounded** (a fixed
  max, raised by Gem Forge tiers); **augment slots have a small fixed max (3–5)**.
- **Augments** are data-defined effects slotted into a gem that change the spell's
  numbers/behavior (extra target, added/strengthened status, a Modifiers buff on cast, …).
  Augments are the **same effect-framework objects** as infusions/traits/statuses (see §6 /
  CONVENTIONS).
- **Gems are crafted/augmented at the Gem Forge** using **Essence**; **gem recipes** and
  **augment recipes** drop from floors.
- Gems are a **shared, finite inventory** the player owns; a gem instance is equipped on one
  creature at a time, **free and instant to equip/unequip**. Before a creature is fused, its
  gems **unequip back to inventory** (so does its equipment — see Fusion, below).

### Fusion (compounding economy)
Two creatures fuse into a single resulting creature, at the **Fusion Chamber**, costing
**Lifeforce**. This is the primary build-crafting mechanic. The rules:

- **Each creature can be fused only once** (`hasFused`). A fusion *result* is itself
  fusion-locked — it cannot be an input to another fusion. This caps creatures at 2 innate
  traits and keeps fusion bounded.
- **Both input creatures are consumed** into the single result. (Nothing is permanently lost:
  inputs can be re-summoned from soul if that creature is at 100%.) Before being consumed, both
  inputs' **equipped gems and equipment unequip back to inventory** — nothing of value is
  destroyed by fusion, only the creature instance and its level/XP.
- Fusion is **species-agnostic** — any creature can fuse with any other **except itself**:
  fusing two instances of the identical creature is **disallowed** (it would produce two
  identical innate traits with no meaningful tradeoff). There is **no level/state prerequisite**
  otherwise — any unfused creature, at any level, is eligible.
- The result's composition:
  - **Identity = parent 1**: the result *is* parent 1's creature (same sprite, name, and parent
    species) — except for the stats and affinity below.
  - **Base stats = per-stat average of both parents** (e.g. result Attack = (p1 Attack + p2
    Attack) / 2). Because growth is derived from base stats, the result's growth follows
    automatically from its new averaged bases — there is no separate growth field to inherit.
    *Consequence:* fusion pulls stats toward the midpoint, so fusing is about combining
    **traits + affinity**, not stacking stats (you can't fuse two high-Attack creatures into
    something higher than either).
  - **Affinity = parent 2's affinity.**
  - **Traits = both parents' innate traits** (the result carries 2).
- The result starts at **level 1**; bring it up via catch-up leveling (Lifeforce).
- Fusion order (which parent is "parent 1") is **player-chosen in the UI**.
- The result has **no rarity** — rarity only governs spawn-weight and soul-gain for
  *collectible, spawnable* static creatures, and a fusion result is neither (it's derived from
  a recipe; see §11).

> Terminology note for implementation: **species** = the grouping (data: a set of creatures +
> thematic identity, used by biome spawn tables); **creature** = the specific unit (data:
> affinity, base stats, innate trait, sprite, rarity, parent species); **instance** = an owned
> copy (stored: source or fusion recipe, level/XP, script; derived: affinity, trait slots,
> stats, fused-ness; gems/equipment from Phase 8). **Affinity**
> lives on the creature/instance, separate from identity, so fusion is a clean field-level
> recombination: identity from parent-1 creature, affinity from parent-2, averaged base stats,
> both innate traits. **There is no growth-rate field** — level-N stat = `round(base × (1 + 0.25 ×
> (level − 1)))`, derived purely from base stats.

### Equipment
**Note:** the equipment *mechanism* (slot, infusions, Equipment Forge, Ore, leveling, infusion-recipe
drops) is **deferred to Phase 8** with the rest of the forge economy. The **effects** an equipment
would carry are exactly the effect framework built in Phase 3 — so nothing about equipment needs to
exist before Phase 8; they plug into the already-built machinery. The design below is the eventual
target.
- An equipment is an **equippable item** on a creature (**1 equipment slot** per creature in v1),
  **stat-focused** in character (where gems are spell-focused).
- Structurally **parallel to gems**: an equipment has a **level** (bounded, a fixed max, raised
  by Equipment Forge tiers) that governs **infusion slots** (small fixed max, 3–5), and slots
  hold **infusions** — which are the **same effect-framework objects** as gem augments.
  Infusions grant **stats, traits, or other effects**. Equip/unequip is **free and instant**.
- **Base equipment are a small fixed set of base-types** — stat-flavor variants (e.g. a
  Health-focused charm vs. a Defence-focused plate) that all compete for the single equipment
  slot, not distinct equipment categories; variety comes from infusions. **Infusion recipes
  drop** from floors.
- Crafted/infused at the **Equipment Forge** using **Ore**; equipment are **leveled via Ore**.

## Engine rules

- **`materializeCreature(template, { level, side, slot, speciesId, gems, ref? })`** (Phase 4.1-A,
  A5; exact field names are the 4.1-A plan's) —
  pure and **RNG-free** (generation already spent the randomness), taking a **named options
  object** (no positional lists that can be swapped silently): resolves the static creature, bakes
  level into `baseStats` (`round(...)`), copies affinity/scriptId/innateTraitIds and the given gem
  set, and fills `origin` from the template id, the level and the optional instance ref; final HP is
  set by `createCombat`, **not** duplicated here. **Un-fused only** (fused
  derivation is Phase 8). Player instances and generated enemies share this path (an enemy is a
  transient instance at a level, never a separate stat block).
- **`Creature.level`** (Phase 4.1-H2a, brief ASSUMPTION 111) — the combat creature's level, set by
  `materializeCreature` from the level it bakes in. **Engine-visible**: the Additional reads the
  attacker's level. `origin` (below) stays engine-inert; the `makeCreature` test helper supplies a
  default level.
- **`Creature.origin: { templateId, level, ref? }`** (Phase 4.1-A, A5) — **required**,
  **engine-inert** run-layer identity on every combat creature: the static creature id, the level
  it was materialized at, and an **opaque** `ref` string (the run layer puts the `InstanceId` there;
  it is a plain string to the engine, not the state-layer brand). The engine never reads it; the
  `makeCreature` test helper supplies a default. Rewards read `origin` (the soul bar is
  `origin.templateId`, and **XP per kill = the victim's level**, decided), so **parsing
  `CreatureId` suffixes is deleted**. Rejected: continued parsing, a side map outside combat state, and `CreatureId` =
  `InstanceId`.
- **Player gem sets** (Phase 4.1-G2, D4) — every new player instance (the starter grant, the
  Unicorn, a summon) rolls its gems **once, at creation**, through the **same roll** as an enemy
  (`rollLoadout`: distinct picks, the safety net, the cast-role throw), and stores them on the
  instance. **A stored set never changes** (PR #83 review): nothing re-rolls it, so a set reflects
  the depth at which it was made. The starters and the Unicorn are granted at floor 0 and can never
  be summoned (they bank no soul), so they keep a biome-1 set until Phase 8; a creature summoned
  again deeper can roll a deeper spell. Deeper spells mostly widen the pool rather than outclass
  biome 1, and Phase 8 replaces the roll with equipping. Three rules are the player side's own:
  - **Its own RNG.** The roll draws from `createRng(hashGemDraw(runSeed, instance ordinal))`, a
    hash with its own constants. It never reads or advances `runCounter`, so a gem roll can't
    shift a floor draw.
  - **The unlock biome** is the biome of `min(100, max(1, deepestFloor))` with atlas pins
    ignored: the pool follows depth, never a farming pin, and stops growing at floor 100.
  - **No innate duplicates.** A creature never rolls a spell it already holds innately: the pool
    excludes the spells of its `innate-spell` effects (the Seer's Arcane Bolt). The exclusion
    lives in the store, which has the trait registry; no spawnable enemy carries an innate spell,
    and a data test pins that, so enemies need no copy of the rule.
## Data-driven content

- Creatures, **species templates**, traits, spells/**gems**, **equipment**, **statuses**,
  biomes, facilities, **specializations/perks**, and scaling curves are data in `src/data/`,
  validated by types (consider `zod` at load boundaries).
- **Three-tier model**: **species** = a grouping of creatures (data: thematic identity + the
  set of creatures it contains; used by biome spawn tables; intra-species traits synergize by
  design). **Creature** = the specific unit (data: parent species, affinity, fixed base stats —
  **Health 20–45, every other stat 10–30** from 4.1-H2c (brief ASSUMPTION 125; all stats 10–30
  before), innate trait, sprite, rarity — v1 ships **3 rarity tiers: Common, Uncommon, Rare**,
  designed to expand later). A creature also carries a required full display **`name`** (e.g.
  "Treant Grovekeep", never built by joining species and creature names; Phase 4.1-A, G3) and its
  role as `defaultScriptId`; sprite/emoji is deferred to Phase 7. **Instance** (in save) = an
  owned copy, per Phase 4.1-A (A6):
  `Instance = { id, source, level, xp, scriptId, gems }` where
  - `id` is **opaque** (e.g. `'inst-17'`; it never embeds the creature id),
  - `source` is `{ kind: 'creature', creatureId }` or `{ kind: 'fusion', identityParent,
    affinityParent }` (the recipe),
  - `level`/`xp` (level **uncapped**), `scriptId: string | null` (the assigned script template),
  - `gems: (spellId | null)[]` (Phase 4.1-G, D4: a random gem set rolled and **stored** when the
    instance is created, until Phase 8 migrates it into real level-1 inventory gems). It is
    slot-positional, one entry per regular gem slot, with `null` only for a slot a pool couldn't
    fill. Materialization resolves each id through the spell registry, and an unknown id
    **throws** (data drift fails loudly).

  Affinity, traits, base stats and `hasFused` are **derived** from `source`, never stored. Gems
  as inventory items and equipment arrive with a Phase 8 migration (defining them now would pre-empt
  Phase 8's design). Base stats are **fixed per creature** (no per-instance rolls in v1).
  Affinity lives on the creature/instance; one species spans multiple affinities. Duplicate
  creatures may occupy multiple party slots simultaneously; an in-fight death has no
  consequence beyond that one fight.
- A creature keeps **identity** (species + sprite/name) and **affinity** as separate fields, so
  fusion is a clean field-level recombination (species-agnostic): **identity from
  identityParent, affinity from affinityParent, base stats = per-stat average of both parents,
  both innate traits**; result is level 1; both inputs consumed; result is itself fusion-locked
  (`hasFused`). **Fusing two instances of the identical creature is disallowed.** There is no
  level/state prerequisite otherwise. Equipped gems **and equipment** unequip back to inventory
  before the inputs are consumed. A fusion result has **no rarity** (rarity only applies to
  spawnable/collectible static creatures). (There is **no "class"** concept — affinity is the
  only such axis.)
- **Fused creatures are stored as a recipe, derived on load** — the instance saves
  `{ identityParent: creatureId, affinityParent: creatureId }` (two static creature IDs), and
  the engine recomputes identity/affinity/averaged-stats/both-traits from static data each load.
  Valid because fuse-once means a parent is never itself a fusion, and fusion reads only static
  per-creature data. **Accepted consequence**: rebalancing a base creature retroactively changes
  existing fusions derived from it. Do **not** store computed fusion results.
- **Stat growth is linear and derived from base stats — there is NO growth-rate field.**
  Level-N stat = `round(base × (1 + 0.25 × (level − 1)))` (nearest integer, recomputed from base
  each level — no accumulated drift; exact-quarter inputs make it deterministic). Incremental power comes from the
  **build-modifier pools and effective stats** (traits/augments/infusions/perks/fusion/facility
  upgrades), not levels.
- **Spell affinity & equip-gating**: spells carry an `affinity` (one of the five);
  `canEquip(spell, creature) = spell.affinity === creature.affinity` — a **universal data-driven
  predicate**, not per-creature allow-lists. Enemy loadouts are generator-rolled from the
  affinity-matched pool; player equipping (Phase 8) reuses the same gate. **Innate spells (A8)
  are exempt**: they are not equipped, so no gate applies. **The predicate itself
  lands in Phase 4 Slice A** — its first consumer is the generator's cast-role loadout roll; no
  earlier phase needed per-spell gating, so a later slice shouldn't assume it predates that work.
  Governs **equipping
  only** — the damage affinity cycle stays keyed on **caster** affinity (goldens untouched).
  Off-affinity exceptions (trait/perk) are post-beta; **no exception seam is pre-built**.
- **Gems**: `{ spell, level, augments[] }`; level (**bounded, fixed max, raised by Gem Forge
  tiers**) → augment-slot count (**small fixed max, 3–5**; not damage); leveled via
  **Essence**, free/instant to equip. **Equipment**: parallel shape (level bounded similarly,
  raised by Equipment Forge tiers; → infusion-slot count, same 3–5 ceiling; leveled via **Ore**),
  stat-focused; few fixed base-types (stat-flavor variants for the single equipment slot, not
  equipment categories). Augments and infusions are **effect-framework objects** (above); a gem
  augment **appends responses** to its spell's `effects` list (A4).
- **Souls**: tracked **per creature** (not per species); 100% = permanent summon unlock; caps
  at 100%; bosses grant none. Soul-gain per kill is a **flat % fixed per rarity tier** (no
  variance; `BalanceConfig` default **25% common / 20% uncommon / 10% rare**, Phase 4.1-A); banked
  the instant the kill happens, regardless of the fight's eventual outcome. **Summoning** at 100%
  is a store action (`summon`, Phase 4.1-G): free, unlimited duplicates, auto-placed into a free
  party slot, and **ungated until Phase 8** adds the Soul Altar requirement.
  There is no way to target/bias which specific creature spawns beyond choosing a biome — within
  a biome it's pure rarity-weighted RNG.
