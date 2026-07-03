# Depths of Souls — Game Design Document

A web-based incremental game. The entire game takes place in **a single endlessly descending
cave** — *the Depths* — where the player collects creature **souls**, fuses them, and descends
ever deeper. Combat is automatic; the player's primary influence is **scripting creature
behavior**. Manual turn-based control is a secondary, optional mode.

> This document is the source of truth for *what* the game is. Implementation rules live
> in the other files in `.claude/`. When this document and code disagree, this document
> wins until it is deliberately revised.

---

## 1. Vision

The player assembles a party of creatures, fuses and customizes them, and then writes
**behavior scripts** that decide what each creature does each turn. Combat runs itself.
The fun loop is *observe → diagnose → rescript → re-fight*, not *click attack*. Power comes
from understanding the systems and writing better scripts, not from manual reflexes.

The incremental layer comes from:
- **Endless descent**: the cave goes down forever and gets harder forever; you descend until
  your party can't, then strengthen and push deeper.
- A fusion economy that compounds (recombining creatures into stronger ones).
- **Biomes**: the cave changes biome every 10 floors (10 biomes in v1), each with its own
  creatures to encounter and collect (biomes spawn species; each species has multiple creatures).
- **Facilities** built at the cave entrance that grant permanent upgrades and services.
- Many small multiplicative bonuses (traits, gem augments, artifact infusions, spec perks) that
  stack.

## 2. Design pillars

1. **Scripting is the game.** Every meaningful decision is expressible as a rule the
   player configures. If a tactic can only be done by manual clicking, reconsider it.
2. **Automation, not idleness.** The game plays combat automatically, but the player is
   actively engaged in *tuning* — not just waiting for numbers to rise.
3. **Legible systems.** A player should be able to reason about *why* something happened.
   Combat is deterministic given the same seed, party, and scripts (see DETERMINISM).
4. **Compounding builds.** Progression is about discovering synergies that multiply, not
   linear stat increases.
5. **No backend.** Everything runs client-side. Saves are local with manual export/import.

## 3. Core loop

```
Descend a cave floor  ->  Auto-battle the floor's creatures  ->  Earn XP & drops
        ^                                                                  |
        |                                                                  v
   Push deeper  <-  Party can go on  <-  Rescript & recustomize  <-  Spend resources
        |                                                                  ^
        v (party too weak)                                                 |
   Return to entrance  ->  Use facilities (fuse / heal / store)  ----------+
```

Depth is **persistent** — there is no run that resets. You hold the deepest floor you've
reached; descending is gated only by whether your party can survive the next floor. When it
can't, you go back up, strengthen (fuse, level, rescript, build/upgrade facilities), and
descend again past the wall.

Short loop (seconds–minutes): fight a floor's creatures, watch scripts execute, collect XP.
Medium loop (a session): descend until you hit a wall, return to the entrance, rescript and
re-gear, push past it.
Long loop (many sessions): discover biomes, build out facilities, and deepen builds to
descend ever further.

## 4. The Cave (world & structure)

The entire game world is **one cave that descends endlessly**. The player can **never leave
the cave**; all play happens either at the **entrance hub** or on the **floors below it**.

- **Floors**: the cave is a stack of floors numbered from the entrance downward. Greater
  depth = harder creatures (scaling curve is config; see §13). Depth is **persistent** — the
  player keeps their deepest-reached floor; there is no per-run reset. From the entrance the
  player can **fast-travel to any floor up to their deepest-reached** (floor selection is a
  UI feature; no need to re-walk cleared floors).
- **Biomes**: the biome changes **every 10 floors** to the next in sequence. v1 ships
  **10 biomes** (so floors 1–10 are biome 1, 11–20 biome 2, … 91–100 biome 10; past floor 100,
  each floor's biome is chosen by **seeded-RNG draw from all 10 biomes** unless the player has
  pinned that floor via the Biome Atlas — see below; pinning can retroactively override a floor
  already visited). Each biome has a **spawn pool of species**.
  When a floor spawns an enemy, it picks a **species** from the biome's pool, then picks a
  **specific creature within that species by rarity-weighted draw from the seeded RNG** (rarer
  creatures appear less often). Biomes are **data** (name, theme, species pool, scaling tweaks,
  visuals). **v1 content target per biome: more than 3 species, each with more than 6
  creatures** (so ≥18 creatures per biome; ~180+ creatures across the 10 v1 biomes — the
  largest content-authoring task in the project, and why creatures/traits must be data-driven).
- **Fights & HP**: a floor contains a **variable, depth-scaled number of fights** drawn from its
  biome pool. **Health resets to full between every fight** (including fights within the same
  floor) — there is no cross-fight attrition. A creature reduced to 0 HP is flagged as no longer
  alive and skipped in the turn order (its slot is retained, not deleted — see CONVENTIONS); death
  has **no lasting consequence** beyond the current fight (no
  instance loss, no cooldown, no soul/XP penalty) — full HP and full roster availability return
  for the next fight regardless of outcome. Defend/Regen/healing are purely *intra-fight* tools.
- **Milestone bosses**: every 10th floor (each biome transition) is a tougher **boss** fight —
  a difficulty checkpoint and reward spike, and the **sole source of perk points** (see §9).
  Bosses are unique, **cannot be soul-collected**, and grant no soul%.
- **Difficulty model**: each floor maps to an **enemy level range** (min–max), not a separate
  stat multiplier — enemies are ordinary creature instances at some level, using the **same
  linear growth formula** as the player's creatures (§5). Enemy level grows **faster than floor
  number** (the gap is the difficulty pressure), and the range's **width widens with depth**
  (deeper floors are spawn-level-swingier). Because HP resets each fight, deeper floors are
  harder purely because enemy level outpaces the party's own leveling pace. Walls happen when
  that gap outpaces level + build. This makes the **floor→level-range curve the single most
  important balance lever** in the game (the curve's exact shape is config; see §13).
- **Biome progression**:
  - Early game, biomes are **discovered by descending** — you meet each new biome the first
    time you reach its depth band, in a fixed sequence.
  - Once **all biomes have been discovered**, the **Biome Atlas facility** lets the player
    **assign (pin) a biome to a chosen cave floor** — shaping which biome occupies a floor to
    farm, rather than taking whatever the sequence (or, past floor 100, the random draw) gave
    them. Pinning can be applied at any time, including retroactively re-pinning a floor already
    visited.
- **Entrance hub**: a persistent base at the top of the cave where the player manages their
  collection and builds **facilities** (see below). The hub is always accessible; returning
  to it is how the player strengthens between descents.

### Facilities
Structures the player builds and upgrades **at the entrance** with **Bricks** to support deeper
expeditions. Facilities are **data-driven** (cost, effect, upgrade tiers) and part of the
permanent, forward-only progression. The player starts with minimal/none and **builds each
out** as an early-game goal. **Every facility action (craft, infuse, fuse, summon) resolves
instantly** on payment — no real-time timers/queues, consistent with the engine's no-wall-clock
rule. Only **Gem Forge, Artifact Forge, and Fusion Chamber** have upgrade tiers (each
facility's tier count is tailored individually); v1 tiers **raise the level cap**
craftable/fuseable there (cost-reduction tiers may follow later). The other three facilities
(Soul Altar, Storage/Vault, Biome Atlas) are **one-time builds** with no further tiers — they
have no throughput axis to upgrade. v1 facility list:

- **Gem Forge** — craft gems (from dropped recipes + **Essence**), augment gems, level gems
  (Essence).
- **Artifact Forge** — craft/infuse artifacts (fixed base-types + dropped infusion recipes),
  level artifacts, using **Ore**.
- **Fusion Chamber** — perform fusions **and** catch-up-level creatures up to the player's
  current highest-level creature, both fuelled by **Lifeforce**.
- **Soul Altar / Summoning Circle** — summon instances of any species at 100% soul.
- **Storage / Vault** — manage the unlimited collection; organize the 6-slot active party.
- **Biome Atlas** — unlocked once **all 10 biomes are discovered**; assigns a biome to a chosen
  floor.

*(No healing facility in v1 — HP resets every fight, so there is nothing persistent to heal.)*

**Currencies & drops (structure; numbers TBD):** floors drop **Essence** (gems), **Ore**
(artifacts), **Bricks** (facilities; rarer), **Lifeforce** (leveling + fusion), and **recipes**
(gem, gem-augment, artifact-infusion). Recipe drops come from a **global depth-scaled drop
table**, independent of which specific creature was defeated (not a per-creature loot table).
**Perk points** are *not* dropped — they come only from first-time boss kills (see §9).
Essence/Ore are the long-tail infinite sinks; Bricks is a front-loaded, tapering build-out sink.
All currencies are **unbounded** — no storage cap.

## 5. Creatures

The game uses a **three-tier model**:

- **Species** = a *grouping* of related creatures (e.g. "Spider"). A species spans **multiple
  creatures** and **multiple affinities**. Traits within a species **generally synergize** (a
  design principle — see example below). Species has mechanical weight: **biomes spawn species**
  (the specific creature is chosen within the species; see §4).
- **Creature** (the unit, a data template) = a specific creature within a species (e.g. "Black
  Spider"). A creature carries its **affinity**, **base stats**, **innate trait**, sprite,
  rarity, and its parent species. This is the collectible thing (its own soul bar).
- **Instance** (owned, in save) = a copy of a creature the player owns: references a creature +
  current **level/XP**, current **affinity** (may differ after fusion), **trait slots** (1
  innate, or 2 after fusion), **equipped gems** (≤3), **equipped artifact** (1), `hasFused`.

> **Species-synergy example** — the Spider species:
> - *Black Spider* — affinity **Primal**; innate trait: deals **+30% damage to webbed enemies**.
> - *Webbing Spider* — affinity **Body**; innate trait: **applies Web** when its attack hits.
> Two creatures, same species, different affinities, traits built to combo.

Each creature (the unit) has:

- **Identity**: parent species, name, sprite/emoji placeholder, rarity (v1 ships **3 rarity
  tiers — Common, Uncommon, Rare** — designed to expand with more tiers later).
- **Affinity**: one of **Body, Spirit, Mind, Void, Primal** — the *domain of being* the creature
  is made of (Body = physical form/instinct, Spirit = soul/the ethereal, Mind = psyche/intellect,
  Void = entropy/nothingness, Primal = raw wild nature). Affinity lives **on the creature**, so
  one species can contain creatures of different affinities. Cycle (see §7):
  Body > Spirit > Mind > Void > Primal > Body.
- **Core stats**: **Health, Attack, Intelligence, Defence, Speed.** Attack drives physical
  damage (Attack action), Intelligence drives spell power (Cast action), Defence mitigates,
  Speed drives turn order within a round.
  - **Scale**: base stats are **fixed per creature** in the design range **10–30** per stat
    (the design range, not a per-capture roll — all instances of a creature share the same base
    stats; no individual IV-style rolls in v1).
- **Trait slots**: a base creature has **1 innate trait**; a fused creature carries **both
  parents' innate traits** (2). Artifacts can carry additional trait(s) via infusion (third
  trait source). See §6.
- **Spell gems**: spells are **equipped as spell gems** (not innate). Each creature has **3 gem
  slots** by default (modifiable by traits/effects). Scripts choose which equipped gem to Cast.
  See Spell gems below.
- **Artifact**: **1 artifact slot** per creature (see §6 / Artifacts).
- **Level & XP**: creatures level **only via combat XP**. Stat growth is **linear and derived
  purely from base stats** — there is *no separate growth-rate field*. Level-N stat =
  `base × (1 + 0.25 × (level − 1))` (i.e. +25% of base per level; level 1 = base; base 20 → +5
  per level → L10 = 65). **Level is uncapped** — it climbs indefinitely in step with floor
  depth (see §4 difficulty model); the formula holds at any level. This keeps the formula's
  output in a sane range for the subtractive damage formula; the incremental power curve comes
  from **multiplicative build sources** (traits, gems/augments, artifacts/infusions, fusion,
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
  percentage, fixed per rarity tier** (no variance, no diminishing returns). Rarity is the knob;
  depth does not affect soul gain in v1.
- There is **no way to target/bias which specific creature spawns** beyond choosing a biome (via
  discovery or the Biome Atlas); within a biome, the species → creature draw is pure
  rarity-weighted seeded RNG, by design (soul-hunting is an intentional grind/RNG loop).
- At **100%** soul, the creature is **permanently unlocked** — the player can **summon** new
  instances of it freely thereafter (at the Soul Altar). Soul% **caps at 100%** (no overkill).
- **Bosses cannot be soul-collected** (they grant no soul%); they are unique challenges.
- **Cold start**: the player begins with **exactly one creature**, determined by their starting
  **specialization** (the starter fits the spec's playstyle). Building out a full party via
  soul collection is an explicit early-game goal. **Floor 1 is solo-clearable** with the
  starter, and the first soul completion comes fast — the opening is designed for quick
  momentum (1 → 2 → 3 creatures in the first session), not a grind wall.
- **Roster**: collection is **unlimited**; the active **party is 6**, swappable at the hub.
  **Duplicate creatures are allowed** across party slots (two instances of the same creature can
  both be active at once) — instances are independent (level, gems, artifact, fusion state).

### Spell gems
- A **gem** carries one spell (Intelligence-scaled via the damage formula, optional status,
  target shape) and is modeled as `{ spell, level, augments: Augment[] }`.
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
  gems **unequip back to inventory** (so does its artifact — see Fusion, below).

### Fusion (compounding economy)
Two creatures fuse into a single resulting creature, at the **Fusion Chamber**, costing
**Lifeforce**. This is the primary build-crafting mechanic. The rules:

- **Each creature can be fused only once** (`hasFused`). A fusion *result* is itself
  fusion-locked — it cannot be an input to another fusion. This caps creatures at 2 innate
  traits and keeps fusion bounded.
- **Both input creatures are consumed** into the single result. (Nothing is permanently lost:
  inputs can be re-summoned from soul if that creature is at 100%.) Before being consumed, both
  inputs' **equipped gems and artifact unequip back to inventory** — nothing of value is
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
> copy (level/XP, current affinity, trait slots, equipped gems/artifact, `hasFused`). **Affinity**
> lives on the creature/instance, separate from identity, so fusion is a clean field-level
> recombination: identity from parent-1 creature, affinity from parent-2, averaged base stats,
> both innate traits. **There is no growth-rate field** — level-N stat = `base × (1 + 0.25 ×
> (level − 1))`, derived purely from base stats.

## 6. Traits, statuses, artifacts & the effect framework

### The unified effect framework (architectural keystone)
**Traits, status effects, gem augments, and artifact infusions are all instances of one
data-driven, hook-based effect framework.** They differ only in how they attach to a creature
(innate/fused, applied in combat, equipped via gem, equipped via artifact) and which hooks they
use — not in their underlying machinery. This is a hard invariant (see CONVENTIONS): one effect
model underpins all of them, so new content is data and genuinely novel behavior is at most one
reusable hook primitive.

An effect declares: a **kind/category** (see taxonomy below), a **magnitude**, a **duration**
(where applicable), a **stacking rule**, one or more **hooks** (when it acts — on-apply,
start-of-turn, end-of-turn, on-the-creature's-turn, on-damage-taken, on-damage-dealt, on-expiry,
…), and its payload.

**Effect categories (taxonomy)** — four kinds, all riding this one framework. **Category determines
player-facing treatment** (a bright line, locked Phase 3):
1. **`stat-modifier`** — scales a stat's *value* (`stat`, `factor`). Folds into **effective stats**
   (below) **multiplicatively** (`base × Π(factors)`). **Always permanent-for-the-fight, uncapped,
   never surfaced as a status** — the player sees only the resulting **effective stat** (and net
   multiplier), never a "−20% Attack" icon. Because folding is multiplicative, reductions **approach
   but never reach zero** (five ×0.8 = ×0.328, not zero) and **stacking is uncapped** — grinding a
   stat up or down is a supported, cap-free build path (the incremental-scaling lane). Buffs compound
   the same way (five ×1.3 = ×3.7). **There is no temporary stat-modifier** — all timed/capped
   debuffing is done via `damage-modifier` or `condition-status` instead. Stat buffs/debuffs are data
   instances of this one primitive (parameters: stat, factor), no per-stat special-casing;
   spells/effects may apply custom factors.
2. **`stat-remap`** — redirects *which stat a formula slot reads* (e.g. "use Speed as Attack for
   the Attack action"). Reads the **source stat's effective value**; Attack-slot stat-modifiers do
   **not** transfer to the substituted stat (a Speed-attacker wants +Speed, not +Attack — a legible
   consequence). Multiple remaps on one slot resolve by **fixed effect order (innate-1 → innate-2 →
   artifact infusions), last-writer-wins**. The damage formula reads its OffStat through a
   remap-aware lookup so this needs no formula changes.
3. **`damage-modifier`** — folds into the damage formula's mod pools: the attacker's **additive
   dealt pool** (`1 + Σ`) or the defender's **multiplicative taken pool** (`Π`). **These ARE surfaced
   as timed statuses and may be capped.** Weaken ("−X% damage dealt", e.g. 1 stack + duration),
   Defend's ×0.65, a Vulnerability ("+X% damage taken") debuff, trait-granted crits all live here.
   Pools stay additive-dealt / multiplicative-taken (unchanged — these are capped/timed, so no
   runaway-to-zero concern). Distinct from `stat-modifier` — a "−Attack" stat change and a "−damage
   dealt" Weaken are different categories with different treatment and never double-count.
4. **`condition-status`** — tagged conditions like Poison (DoT), Regen, Stun (skip turn). Timed,
   surfaced as status icons. This is what scripting's `has-status` condition scopes to (not the
   invisible stat-modifiers).

**Effective stats (engine invariant):** base stats are **immutable** (except by permanent effects
like level-up). A creature's current stat is **computed on demand** — `getEffectiveStat(creature,
stat)` folds all active `stat-modifier` effects over the base **multiplicatively** (`base ×
Π(factors)`) in a fixed deterministic order (a conditional passive's factor is included only when
its read-time predicate holds). Never write a derived value back to the creature. Expiry = removing
the effect from the list; the next `getEffectiveStat` reflects it automatically (no
reverse-bookkeeping, no order ambiguity). All combat math reads stats through this accessor (a
passthrough to base until effects exist). **This base+fold-on-read model — not a mutable per-creature
stat blob — is required**: conditional passives (whose contribution blinks with live state) and any
non-permanent effects need recomputation/reversibility a mutable blob cannot give cleanly, and it
keeps the representation singular and deterministic.

**UI consequence of multiplicative stacking (a Phase 7 requirement):** because stacked multipliers
aren't mentally computable (`0.8³ = 0.512`, not "−60%"), the UI must **always surface the computed
effective stat and net multiplier as the primary display**, with the per-factor breakdown as
hover/detail — never make the player multiply factors. (Incremental-genre players expect
multiplicative diminishing-returns, so this is idiomatic, but the display must show *results*, not
raw factor lists.) One known ergonomic cost: scripting against a *predicted* post-debuff stat
threshold requires reasoning about compounding; if playtesting shows this confuses players, an
additive-within-a-type / multiplicative-across-types hybrid is the documented fallback.


**Loop safety** (engine invariant, applies to the whole framework): an effect/trigger **cannot
re-enter its own resolution chain** (kills true infinite loops), and a
**named cascade-depth cap** (`MAX_TRIGGER_CASCADE_DEPTH` **= 500**, counting *chain depth* not
trigger breadth) backstops exotic multi-effect cycles. Breadth is effectively unlimited — "lots
and lots of triggers firing once each" is a fully supported build path; only unbroken
self-perpetuating chains are truncated. Truncation is deterministic. Concretely (locked Phase 3):
- **Self-re-entry guard = instance-level, stack-scoped** — a specific effect *instance* cannot
  re-enter while it is already unwinding on the active resolution stack. This blocks true
  self-loops (a retaliation triggering its own retaliation) but leaves legitimate cross-creature
  cascades alone (A hits B, B's trait fires — not re-entry of A's).
- **Depth = chain nesting**, not breadth. N effects firing on one hook point is breadth N at the
  current depth; each trigger that *causes a new hook to fire* increments depth for that sub-chain.
- **On the cap**: the over-cap trigger simply does **not execute** (no crash, no partial fire);
  resolution unwinds normally, and a **mandatory `CascadeTruncated` event** (creature/effect +
  depth) is **always** emitted — observable in the log/UI and assertable in goldens.
- **Depth is transient** — it lives on the resolution call stack, resets to 0 per top-level
  action/hook point, and is **never stored in `CombatState`** or serialized (same principle as
  effective stats: derived/momentary values don't live in authoritative state).

### Hook execution model (locked Phase 3)
The dormant hook seams (no-ops since Phase 1) activate here. How a hook fires:
- **Scoped iteration.** At a **per-creature** phase point (that creature's turn start/end),
  iterate that creature's effects; at a **global** phase point (round-start/round-end), iterate all
  creatures' effects in the **standard tie-break order** (player → slot → id). All hook lookups go
  through one function, **`effectsForHook(creature, hook)`** (scan-and-filter inside) — a
  hook-type index is deferred until profiling shows it's needed (drop-in behind that boundary,
  golden-verified, since correct output is byte-identical).
- **Hooks reuse action machinery.** A hook that deals damage or applies a status calls the *same*
  paths and emits the *same* shared consequence events (`DamageDealt`, `CreatureDied`,
  `StatusApplied`, …) as a chosen action. A hook is a new *trigger origin*, not a new consequence
  vocabulary.
- **`TriggerFired` intent event** precedes the consequences a trigger produces (mirroring
  `AttackDeclared`→`DamageDealt`), so the log explains *why* triggered damage/effects happened.
- **One shared per-creature effect ordering** — innate-1 → innate-2 → artifact infusions → applied
  statuses — is reused *everywhere* effects are iterated: stat folding, hook firing, remap
  resolution. One "effect order" concept, not several.

**Hook interaction edges (locked Phase 3):**
- **Dead creatures fire only `on-death`.** `effectsForHook` considers only effects on `alive`
  creatures; the sole exception is `on-death`, which fires once, *as* the creature dies, even
  mid-cascade/mid-sweep. A creature that takes lethal damage fires `on-death` but **not**
  `on-damage-taken` (death pre-empts the victim's reaction — you can't swing back if the blow killed
  you). **Damage-path hook order** (after `DamageDealt`): `on-damage-dealt` (source) fires
  **unconditionally — including on a lethal hit** (the attacker dealt the damage regardless) →
  `on-damage-taken` (self) fires **only if the target survived** → then if it died: `CreatureDied` →
  `on-death` → `on-kill` (source) → `on-ally-death`/`on-enemy-death` (observers). Hit-reactions
  resolve before death-reactions.
- **Applying a status emits `StatusApplied` then fires `on-status-applied`** (event-before-hook,
  matching intent→consequence ordering). Re-entrant chains (a status-application triggering another)
  are covered by the loop-safety guard.
- **`DamageDealt` carries a required `damageSource: 'attack' | 'cast' | 'dot'`** (+ the status
  identity for DoT). A DoT tick emits only `DamageDealt` (no per-tick `TriggerFired` — the DoT's
  existence is already announced by its `StatusApplied`), tagged `'dot'`, so the log renders
  "[creature] took X poison damage" and Phase 7's UI can attribute it. Attack/cast damage carries
  `'attack'`/`'cast'`. (Contrast: a triggered *attack* does emit `TriggerFired` → `DamageDealt`.)
  Because the field is **required** (uniform self-describing schema, not an optional sometimes-field),
  the **Phase 1/2 goldens are consciously updated** to add it — a **field-addition-only** change
  (regenerate, then verify the diff shows *only* the new field, no value/ordering changes), which is
  a deliberate reviewed schema update, not a silent regenerate, and preserves the byte-identical
  *behavior* guarantee while improving the schema.
- **Applying a stat-modifier emits a `StatModifierApplied` consequence event** carrying source,
  target, stat, the factor applied, **and the concrete effective-stat change** (e.g. before/after or
  delta — "Attack 100 → 51 (−49)"), because a bare factor (`×0.8`) is meaningless without its base.
  This is the golden assertion surface for stat changes (stat-modifiers are "not surfaced *as a
  status icon*" — a UI statement, not a log one; the log still records the change, and Phase 7 can
  use it for floating combat text like "Attack −49"). Order: `TriggerFired` → `StatModifierApplied`.
- **Conditional-passive predicates read effective stats but must not create a read-cycle**: a
  predicate gating a modifier of stat X may reference *other* effective stats, but must not depend on
  X's own effective value (read base X if truly needed). Prevents `getEffectiveStat` recursion.

**v1 hook vocabulary (13, pinned):** `on-fight-start`, `on-turn-start`, `on-turn-end`,
`on-round-end`, `on-damage-dealt`, `on-damage-taken`, `on-kill` (dealt a killing blow), `on-death`
(self died), `on-ally-action`, `on-enemy-action`, `on-ally-death`, `on-enemy-death`,
`on-status-applied`. Each hook = a firing point + a **context** (e.g. `on-damage-taken` provides
`{self, source, amount}`). Expanding the set later is **additive and golden-safe** — a new firing
point no trait listens to emits zero events — provided the hook fires at a point the resolver
already reaches; a hook needing newly-tracked state is a larger change (none of v1's are).

### Traits
- **v1 categories**: **passive/stat** (always-on or conditionally-on modifiers, e.g. "+25% Attack
  at full HP") and **triggered** (fire on a hook, produce an effect). **Behavioral** traits
  (changing scripting options, granting extra actions, altering the creature's own decision-making
  or the turn economy) are **deferred past v1**. *Reacting to an event by dealing damage / applying
  a status / changing a stat is **triggered**, not behavioral — in scope.*
- A base creature has **1 innate trait**; a fused creature has **2** (both parents'). Each
  **creature has a fixed innate trait** defined in its data (collecting a creature = knowing its
  trait). Artifacts can add further trait(s) via infusion (artifact *mechanism* deferred to Phase 8;
  the effects it would carry are the framework built here).
- **`Trait { id, name, effects: readonly Effect[] }`** — a thin named wrapper (identity/flavor for
  UI) over one-or-more effects (the mechanical units); a trait may bundle multiple effects.
- **Passive/stat traits** are `stat-modifier` effects. A **conditional** passive carries a
  **read-time activation predicate** evaluated during `getEffectiveStat` folding (e.g. "+25% Attack
  at full HP" = a modifier whose predicate is `currentHp == effMaxHp`) — never cached, always
  correct on read.
- **Triggered traits** = `{ hook, condition?, response }`. The **v1 response vocabulary** (each
  fully parameterized by **target** and **magnitude**): **(a) deal damage, (b) apply a status,
  (c) apply a stat-modifier, (d) suppress-action** (skip a turn — what Stun uses). Design-space
  breadth comes from the **hook × condition × parameter cross-product**, not from more response
  types (13 hooks × conditions × targets/magnitudes is ample for the v1 trait roster).
- **No keywords, no implicit targets.** There is no "Retaliate" (or similar) concept — every trait
  is expressed as an explicit event→condition→response→target→magnitude sentence in data, e.g.
  *"when this creature is dealt damage by another creature, attack that creature for 30% Attack."*
  The hook **context** supplies the reference actors (`{self, source}` etc.); the response names its
  target via a vocabulary (`self`, `triggering-source`, `triggering-ally`, `all-enemies`, a full
  `TargetSelector`, …).
- **"attack" / "cast" in a trait or spell mean the real actions** — same damage formula, OffStat
  (Attack / Intelligence), affinity, Defence interaction, pools, and min-1 floor as a creature
  choosing that action; the trait/spell supplies only the spellPower coefficient and target. There
  is no separate "trigger damage" formula. **DoT is the one deliberate Defence-bypass exception**;
  a response may *opt into* that bypass explicitly for armour-ignoring damage.
- Traits are **data, not code branches**. Definitions live in `src/data/`; a creature references
  them via **`innateTraitIds`** (1 base / 2 fused), resolved from a registry at combat start, with
  effects instantiated onto the active-effects list at fight start.

### Status effects
- Statuses are **applied effects** (from spells, augments, traits) with a **fixed turn
  duration**, counted down each round.
- **Stacking**: re-applying refreshes duration **and** stacks intensity, up to a per-status
  cap — **each status declares its own cap explicitly; there is no shared global default.**
- **v1 content**: a flexible, easily-addable **DoT category** (parameterized: damage value,
  duration, flavor; start with Poison/Burn), **Regen** (heal-over-time), **Stun**, and a set of
  **timed `damage-modifier` statuses** — **Weaken** ("−X% damage dealt", capped ~1 stack + duration)
  and **Vulnerability** ("+X% damage taken") — all surfaced as status icons with durations. **Raw
  stat buffs/debuffs (raising/lowering Attack/Defence/Intelligence/Speed) are NOT statuses** — they
  are permanent-for-fight `stat-modifier` effects (multiplicative, uncapped, invisible-as-status;
  the player sees the effective stat). So "make them weaker" has two distinct tools: a **permanent
  stat-modifier** (grind their Attack down, uncapped) vs. a **timed Weaken damage-modifier** (tactical
  output cut). Health's "regen" is the Regen HoT; a health DoT is a distinct answer to high-Defence
  enemies. **Health IS a modifiable stat** (a `stat-modifier` may target it, e.g. an innate "+50%
  Health" trait) — the four combat stats plus Health all fold multiplicatively. Two rules keep this
  clean: **(a)** at fight-start, `currentHp` initializes to **effective** max Health (so a +Health
  trait actually grants the HP); **(b)** `currentHp` is **clamped to effective max whenever effective
  max changes** — a Health debuff lowers the cap and current HP with it; a Health buff raises the cap
  but does **not** auto-heal into the new space. HP% (which scripts read) therefore stays bounded
  0–100. When the clamp actually reduces `currentHp` (max dropped below current), a dedicated
  **`HpClamped { creatureId, previousHp, newHp, effectiveMaxHealth }`** event is emitted (after the
  `StatModifierApplied` that caused it) so the currentHp drop — neither damage nor heal — is explicit
  in the log/UI rather than silently inferred. All are **data instances of the built primitives** — no
  per-stat/per-status special-casing.
- **DoT damage** uses its **own value from the source** and **bypasses Defence** (not the
  Attack/Defence formula) — making DoT a distinct answer to high-Defence enemies.
- **Stun** is **just a `condition-status`**, not a special mechanic — it registers an
  `on-turn-start` hook whose response is **suppress-action**, so the affected creature's turn is
  skipped **via the Phase 1 empty-bracket mechanism** (its `TurnStarted`/`TurnEnded` still emit,
  with no action between). A stun applied earlier in the round lands because the check happens when
  the creature's turn comes up. No special resolver branch — the resolver just fires the hook.
- The system is built to **scale to many future statuses** (e.g. end-of-turn auto-Provoke,
  exotic conditional effects) via new data using existing hooks. New statuses are pure data
  instances of the built primitives (DoT / stat-modifier / heal-over-time / suppress-action) — the
  v1 set is not a ceiling.

**Status lifecycle (locked Phase 3):**
- **Duration counts down in ROUNDS**, decremented at **round-end** (a global phase point), not
  per-turn — order-independent and easy to hand-derive in goldens. A "3-round" status lasts three
  round-ends regardless of whose it is.
- **A DoT ticks at round-end, *before* the decrement** — so a freshly-applied 1-round DoT ticks
  exactly once, then decrements to 0 and expires ("a 1-round poison poisons once").
- **Stacking = a single status instance per (status-type, creature)** carrying a **stack count** +
  **remaining duration**; re-applying refreshes duration and increments intensity toward the
  status's declared cap. DoT intensity = per-stack tick damage; stat-status intensity = magnitude
  scaling. (Not N separate instances.)
- **Round-end resolves as global sweeps over a start-of-sweep snapshot.** Snapshot the set of
  statuses present when the sweep begins, then: **(1)** fire all `on-round-end` hooks across all
  creatures in **tie-break order** — including DoT ticks (a DoT tick *is* an `on-round-end` hook on
  the DoT effect, same machinery as any trigger; **no separate status-tick pass**). Cascades resolve
  fully here: if a tick kills a creature, that creature's **`on-death` hook fires immediately** (the
  death exception — see hook model), which may itself apply new statuses/effects. **(2)** Decrement
  durations — **only for statuses in the start-of-sweep snapshot**. **(3)** Expire snapshot statuses
  now at 0 duration (emit `StatusExpired`).
- **Statuses born *during* the sweep** (e.g. a poison applied by an `on-death` trait) are **not in
  the snapshot**: they do not tick, decrement, or expire this sweep — they keep their full declared
  duration and begin normal countdown at the *next* round-end. (Without this, a mid-sweep-applied
  status would silently lose a round to the same sweep's decrement.)
- **A creature killed mid-sweep fires only `on-death`**; its own not-yet-reached `on-round-end`
  hooks (e.g. a DoT it was carrying that would tick *others*) are **skipped** — so round-end is
  deterministically order-sensitive to death (fixed by tie-break order). **Win/loss is checked once,
  after the entire sweep completes** (consistent with "resolve the whole boundary, then check").

### Artifacts
**Note:** the artifact *mechanism* (slot, infusions, Artifact Forge, Ore, leveling, infusion-recipe
drops) is **deferred to Phase 8** with the rest of the forge economy. The **effects** an artifact
would carry are exactly the effect framework built in Phase 3 — so nothing about artifacts needs to
exist before Phase 8; they plug into the already-built machinery. The design below is the eventual
target.
- An artifact is an **equippable item** on a creature (**1 artifact slot** per creature in v1),
  **stat-focused** in character (where gems are spell-focused).
- Structurally **parallel to gems**: an artifact has a **level** (bounded, a fixed max, raised
  by Artifact Forge tiers) that governs **infusion slots** (small fixed max, 3–5), and slots
  hold **infusions** — which are the **same effect-framework objects** as gem augments.
  Infusions grant **stats, traits, or other effects**. Equip/unequip is **free and instant**.
- **Base artifacts are a small fixed set of base-types** — stat-flavor variants (e.g. a
  Health-focused charm vs. a Defence-focused plate) that all compete for the single artifact
  slot, not distinct equipment categories; variety comes from infusions. **Infusion recipes
  drop** from floors.
- Crafted/infused at the **Artifact Forge** using **Ore**; artifacts are **leveled via Ore**.

## 7. Combat (automatic)

- **Format**: **6v6** — six creatures per side, all active simultaneously. The full party of
  six is the normal case. Early game, before the player has collected six creatures, fights
  run with fewer (1–5) on the player side; the engine must handle any party size 1–6.
- **Turn-based under the hood**, resolved automatically. **One round = every living creature
  acts once**, in **Speed order (descending)**, recomputed each round (so Speed buffs/debuffs
  change ordering next round). Ties broken deterministically: **side (player side wins ties) →
  slot → creature id**. No creature gets multiple actions in v1 (a trait could grant extra
  actions later). As a determinism/safety backstop, every fight has a **hard round cap**
  (config); a fight that somehow reaches it (e.g. a pathological all-Defend/all-Wait script on
  both sides) ends immediately as a timeout/draw rather than running unbounded.
- Each turn, a creature consults its **behavior script** to choose an action. If the script
  yields no valid action, fall back to the implicit default (basic Attack on a default target,
  else Wait). The player never has to author the empty case.
- **Actions** (the starting set — more may be added later):
  - **Attack** — physical strike scaled by Attack vs. target Defence (see damage formula).
  - **Cast** — cast an equipped spell (gem), scaled by Intelligence. No resource cost, freely
    castable. Scripts pick *which* equipped gem/slot to cast. A spell's **target shape**
    (single-target or AOE/all-enemies) is a property of the spell itself, not the rule — v1
    supports both shapes.
  - **Defend** — until the creature's next turn: takes **35% less damage** (a ×0.65 factor in
    the defender's multiplicative **taken pool**) **and** has **+50% Defence** (a ×1.5 on its
    effective Defence, inside the subtractive core). Both apply together; strongest on already-
    tanky creatures (the +50% Defence scales with base Defence) while the flat 35% helps squishier
    creatures too.
  - **Provoke** — mark this creature as *provoking* (taunt) **until its next turn**; see
    targeting rule below. Re-provoking each turn is a recurring tactical cost (the creature
    isn't attacking), making dedicated tanking a real choice.
  - **Wait** — take no action this turn.
  - Plus any trait-granted actions (post-v1).
- **Provoke / targeting resolution**: when a creature uses an offensive action (Attack or
  Cast) against the enemy side, target selection works as follows:
  - If one or more enemy creatures are currently **provoking**, the action targets a
    **random** one of the provoking creatures.
  - If none are provoking, the action targets per the script's normal targeting selector
    (or the default selector if none applies).
  - "Random" here means a draw from the **seeded combat RNG**, never `Math.random()`, so the
    outcome stays deterministic and replayable (see CONVENTIONS). Provoke is an **override
    layer** applied *after* the script chooses an action — it constrains the target set, it
    does not change which action the script selected. Targeting selectors that conflict with
    an active provoke are narrowed to the provoking set rather than ignored wholesale.
  - Provoke applies only to enemy-targeting offensive actions; ally-targeting actions (e.g.
    a support spell on an ally) are unaffected.
  - Provoke **only narrows single-target selection**. An **AOE** Cast (hits all enemies)
    ignores provoke entirely and still hits its full target set — narrowing an AOE down to just
    the taunting creature would defeat the point of choosing an AOE spell.
- **Affinity advantage** is a cycle: **Body > Spirit > Mind > Void > Primal > Body** (each
  beats the next; loops back). It is its **own standalone multiplicative term** in the damage
  formula (separate from both the additive dealt pool and the multiplicative taken pool), defined
  once per hit: attacker's affinity beats defender's → **×1.25**; defender's beats attacker's →
  **×0.75**; otherwise **×1.0**. Being separate and always-multiplicative keeps affinity matchups
  relevant no matter how much a build stacks in the mod pools. Encode the cycle and multipliers as
  data, not branches.

### Damage formula
All direct damage (Attack and Cast) uses one formula:

```
effOffStat = getEffectiveStat( remapResolve(creature, action) ) × spellPower   // spellPower = 1.0 for Attack
raw        = ( MAX(effOffStat − Defence, 0) + 0.01 × effOffStat ) × Affinity × (1 + Σ dealtMods) × Π(takenFactors)
damage     = MAX(1, floor(raw))
```

- **effOffStat** = the attacker's effective offensive stat, scaled by the action's **spellPower**:
  - Base offensive stat is **Attack** (for Attack) or **Intelligence** (for Cast), read via a
    **resolvable lookup** (`getAttackStat`-style) that consults any active **stat-remap** effect
    first, so a trait like "use Speed as Attack" slots in without a formula rewrite (see §6).
  - That value is taken as an **effective** stat (`getEffectiveStat`, base folded with active
    stat-modifiers), never raw base. `Defence` is likewise effective.
  - Then multiplied by **`spellPower`**, a coefficient the **action/spell** carries. Basic **Attack
    has spellPower 1.0**; a spell declares its own (e.g. a "30% Intelligence" spell = `0.30`).
  - **Order**: remap-resolve the source stat → `getEffectiveStat` → `× spellPower` → that is
    `effOffStat`, used everywhere OffStat appears below.
  - Both offensive paths are checked against the target's single **Defence** (no separate magic
    resist in v1).
- **spellPower scales OffStat, NOT the post-mitigation damage** — it is inside the subtractive
  core, *before* Defence: a 30% spell wields `Int × 0.30` and Defence bites that scaled value
  (`(Int × 0.30) − Def`), **not** `(Int − Def) × 0.30`. Deliberate: Defence measures against the
  spell's actual incoming power. This is a **third modifier locus**, distinct from stat-modifiers
  (→ effective stats) and damage-modifiers (→ the dealt/taken pools below); see §6.
- **Base stats immutable**; effective values computed on demand (see §6 and CONVENTIONS).
- **Subtractive core**, `MAX(effOffStat − Defence, 0)`, clamped at 0 — Defence can fully cancel it.
- **+1% chip floor**, `0.01 × effOffStat`, added **unconditionally** (even when the core is fully
  absorbed) — and it scales with spellPower too (a weak spell has a proportionally small chip), so
  affinity/mods still have something to act on against a wall.
- **Rounding**: HP and damage are **integers**; `raw` is computed in full precision, then
  **floored once at the end**, with a hard **minimum of 1** — every hit removes at least 1 HP
  (no stalemates; the round cap is thus only a pathological backstop). Floor once, not per-term
  (per-term rounding compounds error and risks cross-platform float drift → breaks golden replay).
- **Affinity** = the standalone ×1.25 / ×0.75 / ×1.0 term (see cycle above). **Always
  multiplicative**, separate from both mod pools, so affinity matchups stay relevant no matter how
  much a build stacks.
- **Two damage-modifier pools, deliberately asymmetric** (this is where build power compounds;
  base stats grow linearly, §5):
  - **Dealt pool (attacker's damage-*dealt* modifiers): additive** — `1 + Σ dealtMods` (empty =
    1.0). Many "+X% damage" sources **sum**, keeping offensive scaling tractable and avoiding
    super-exponential blowup when stacking lots of trait/augment/perk modifiers.
  - **Taken pool (defender's damage-*taken* modifiers): multiplicative** — `Π(takenFactors)`
    (empty = 1.0). Each reduction (Defend's ×0.65, a "-20% taken" source = ×0.8) or amplification
    (a "Vulnerable: +50% taken" debuff = ×1.5) is its **own factor, producted together**.
    Reductions trend toward but **never reach 0** → defensive builds are powerful and never grant
    true immunity; **no clamp needed** (multiplication can't cross 0). Amplifications share the
    same pool.
  - Rationale for the asymmetry: additive on offense prevents number-explosion when stacking many
    sources; multiplicative on defense makes each defensive layer compound so tanking is a real
    power path, with no immunity and no clamp. Different goals, different math, on purpose.
- **Stat changes never touch the damage pools**: a "+50% Attack" buff raises effective Attack
  (folded into `OffStat`); it is *not* a dealt-mod. Conversely, a "+30% damage dealt" effect is a
  dealt-mod and does not touch the Attack stat. This split prevents double-counting. (A future
  status *could* deliberately be a damage-modifier — that's a distinct effect category, §6.)
- **Defend** contributes its ×0.65 to the defender's **taken pool** and its ×1.5 to the
  defender's effective Defence (inside the core), both until the creature's next turn.
- **No "Additional" (flat true-damage) channel** in v1. **No damage variance/rolls** — fully
  deterministic. **No baseline crits** — "crit" is a trait-granted dealt-mod.
- **DoT damage** does **not** use this formula — DoTs carry their own value from their source and
  bypass Defence (see status framework, §6 / CONVENTIONS).

### Encounters, rewards & wipes
- **Encounters** are **cave floors**: descending pits your party against that floor's creatures
  (drawn from the floor's biome, at the floor's enemy-level range; see §4). Clearing a floor lets
  you descend. Rewards (XP, drops) scale with depth.
- **Rewards bank per kill-event, the instant an enemy dies** — soul%, XP, and currency are never
  held pending the fight's outcome, so a wipe after some enemies died keeps everything earned so
  far. Win/loss/draw is checked **after every action**; the fight ends the instant one side has no
  living creatures (it does not finish the round).
- **Fight result is a three-value union** — `win` / `loss` / `draw`. A round-cap timeout is a
  `draw`. For navigation, **draw resolves like loss** (return to hub, no floor cleared), but
  already-banked per-kill rewards stay banked.
- **On a wipe** (loss or draw) there is **no run reset and no loss of progress** — depth is
  persistent. The party returns to the **entrance hub**; from there the player can **fast-travel**
  to any floor up to their deepest-reached. Wiping never rolls back creatures, XP, or facilities.
- Combat must be **deterministic** given (party snapshot, scripts, RNG seed) — enables
  reproducible bugs, replay/fast-forward, and testable scripts. See CONVENTIONS.

### Manual mode (secondary)
An optional toggle lets the player take manual control of one fight: same engine, but
actions come from UI input instead of the script. It must not require its own combat code
path — it's the same resolver with a different action source.

## 8. Scripting system (the heart of the game)

The player authors **scripts**: ordered lists of rules. Scripts are **templated** — a
script is a reusable template that can be assigned to any creature (a creature references a
template; many creatures can share one; editing a template updates all creatures using it). A
rule is:

```
PRIORITY n:  IF <condition>  THEN <action>  [TARGETING <selector>]
```

Evaluated top-down each turn; the **first** rule whose single condition is true and whose
action is currently valid wins.

**One condition per rule (v1).** No AND/OR. Complex behavior is expressed by **stacking
priority-ordered rules** (you get "OR" by writing two rules; nuance comes from ordering narrow
high-priority rules above general ones). **Consequence**: rule *ordering carries all the logic
weight*, which makes the **drag-to-reorder UI** and the **"which rule fired" feedback**
(§ROADMAP combat-feedback) load-bearing features, not minor polish. Rule count per template and
template count overall are both **unbounded**.

**v1 conditions** (a starter set — expandable, and the highest-leverage place to add power
later): self HP%, ally HP% (any / lowest), enemy HP% (any / lowest / highest), enemy count,
ally count, turn/round number, "has status X" (self / ally / enemy — matches a **literal status
ID**, e.g. exactly "Weaken", not a category like "any Attack-debuff"), affinity advantage vs a
target, and "is provoking". (Fight-*context* conditions like "is this a boss fight" or "current
floor/depth" are deliberately deferred past v1.)

**v1 targeting selectors** (orthogonal to conditions — any condition pairs with any target):
lowest-HP enemy, highest-HP enemy, highest-Attack enemy, highest-Intelligence enemy, lowest-HP
ally, random enemy, self.

*(A "provoking enemy" selector was considered and **dropped** for v1: because Provoke is a blanket
post-selection override on all single-target offensive actions (§7), explicitly selecting the
provoker would produce behavior indistinguishable from any other selector when a provoker exists,
and an unresolvable rule when none does — i.e. it can never produce an observable outcome. Reintroduce
only if a future mechanic makes it meaningful, e.g. targeting provokers for non-offensive actions.)*

**Actions**: the action set from §7. For **Cast**, the rule specifies **which equipped gem/slot**
to fire (choosing the right spell for the situation is the tactical depth). The **TARGETING**
clause only appears for actions that need to choose among multiple valid targets (Attack,
single-target Cast); it's automatically omitted for self-only actions (Defend, Provoke, Wait)
and for AOE Cast (which always hits its full target set per §7).

**Fallback**: if no rule matches, the engine applies the implicit default automatically (Attack
a default target if any valid, else Wait) — the player never authors the empty case.

Design constraints:
- Authoring is **UI-driven** (dropdowns/blocks), not free-text code, so it's accessible and
  cannot crash the engine. Think "Final Fantasy XII Gambits."
- The script model is **serializable data** so it saves, exports, and feeds deterministic
  replays.
- **Script scope (decided)**: scripts are **reusable templates assignable to creatures**; the
  template is the unit of authoring. Per-creature overrides may come later.

**Interpreter semantics (locked — Phase 2):**
- **Rule validity**: a rule matches only if its condition is true **AND** its chosen action is
  currently valid. An invalid action → **skip to the next rule** (not "match and fizzle"). In v1 the
  one reachable cause of invalidity is an **empty referenced gem slot** (Cast with nothing in that
  slot → skip). A separate "**unresolvable selector → skip**" branch also exists, but with the v1
  selector set it has **no reachable trigger** (self always exists; ally-selectors include the
  acting creature so they always resolve; enemy-selectors always have a target because `decideAction`
  never runs against an already-wiped enemy side — win/loss is checked after every action). It is
  kept as a **defensive/structural seam** — documented but currently unreachable, like Phase 1's
  `getDefaultTarget` null case — so that future selectors which *can* fail to resolve get correct
  behavior for free. This keeps scripts robust.
- **Evaluation is side-effect-free lookahead**: walk rules top-down evaluating condition + validity
  as pure predicates over current state; the **first** rule that passes wins; only then is its
  single action executed. No try/rollback.
- **`always` condition**: unconditionally true — also the idiomatic explicit catch-all bottom rule.
- **Ordering is array position**, not a stored priority number; drag-to-reorder reorders the array.
- **Cast references a gem *slot index*** (not a spell ID), so a template is reusable across
  loadouts; the spell fired is whatever occupies that slot on that creature. The **target shape**
  (single / all-enemies) is a property of the *equipped spell*, resolved at evaluation time; AOE
  omits the selector and hits all living enemies (frozen at cast-start, slot order); single-target
  uses the selector and is subject to provoke.
- **"ally" includes the acting creature**; "lowest-HP ally" on a solo creature resolves to itself.
- **`Script.defaultTarget?`** (reserved): optional per-template default selector for rules that omit
  TARGETING; data field reserved now, surfaced in the Phase 6 authoring UI.
- **Assignment**: a creature references a script by `scriptId`; null/absent → the implicit fallback
  runs every turn (Attack a valid target, else Wait). The interpreter is **symmetric** — player and
  enemy creatures use the same system. Phase 2 gives enemies trivial **stock scripts** (one per
  action type); richer enemy scripts drop in later with no new machinery.
- **HP% conditions** use **effective Health** as the denominator (`getEffectiveStat(_, 'health')`),
  compared via integer cross-multiplication (no float) — see CONVENTIONS.

**Deferred to Phase 6 (authoring UI):**
- The UI must surface **equipped-slot contents** when authoring a Cast rule — a slot-referencing
  rule fires different spells on different creatures; template-vs-creature context makes this
  non-trivial.
- A template's TARGETING clause may **mismatch** a creature's equipped spell shape (single-target
  selector on an AOE slot). Runtime tolerates it (AOE ignores the stray selector); the UI must
  handle the mismatch — warn / adapt / type slots by shape (TBD).

## 9. Player specializations

The player picks a **specialization** that shapes their own bonuses and playstyle (distinct
from creature affinities). The game ships with **three** at launch; future specializations
may be added and **existing ones edited**, so model specializations as **data**, not
hard-coded classes.

Starting specializations (each defines a **starter creature** matching its playstyle — the
player's single cold-start creature, see §5):
- **Sorcerer** — gems/Cast focus; perks center on gem slots, augment capacity, Cast-damage
  modifiers. (Resolves the Sorcerer↔gem interaction.) Spell-leaning starter.
- **Brute** — Attack focus; perks center on Attack-action damage modifiers and physical builds.
  Attack-leaning starter.
- **Shieldbarer** — Defence/tank focus; perks center on Defend/Defence/survivability and
  Provoke-tanking. Defence-leaning starter.

**All content is accessible to every specialization** (same creatures, gems, artifacts,
biomes, facilities) — a spec changes *how you play*, never *what you can reach*.

**Perks & perk points:**
- A specialization is a **named collection of perks** (data; perks plug into the existing
  effect framework where sensible, plus meta-economy hooks like soul gain, currency drops,
  facility efficiency). Specific perks are TBD; the data model + placeholders suffice for now.
- The perk tree is a **flat list, not a prerequisite/tiered tree** — any perk can be bought in
  any order. Each spec has a **fixed set of perks**; some are single on/off purchases, others
  are **leveled** (purchasable multiple times up to a per-perk level cap) — the full set, at
  max levels, sums to exactly **1000 points**.
- Each spec's full perk tree costs **1000 perk points** total.
- Perk points are earned **only from first-time boss kills**: **100 points per boss**, one boss
  per 10th-floor biome transition. 10 bosses in v1 = 1000 points = exactly enough to **max one
  specialization at floor 100** — character progression and cave depth finish together. Bosses
  are the **sole** perk-point source (no other trickle); points come from **first clear only**,
  not repeatable farming.
- Points are spent **freely** on whichever perks the player wants as they're earned.
- Perk points are effectively a **third, non-droppable progression currency** (alongside the
  combat-dropped currencies).

**Specialization is freely swappable, free and unlimited, any time** — no cooldown, no fee. On
swap, all spent perk points are **refunded for full re-spend** in the new spec — your total
earned points (a function of bosses cleared) is your budget, and swapping reallocates it
(build-change, not grind-reset). Permanent-until-swap; no per-point respec cost.

Model specializations as **data** so future specs can be added and existing ones edited.

## 10. Progression & incremental layers

- **Creature XP & levels**: creatures level **only via combat XP**, with **linear** stat growth
  (+25% of base per level). The XP/level ceiling rises only through combat.
- **Catch-up leveling**: at the Fusion Chamber, fresh summons/fusions can be leveled (via
  **Lifeforce**) up to the player's current highest-level creature — never beyond it.
- **Build power (the incremental curve)**: the "numbers go up" fantasy lives in **build sources**
  stacking in the build-modifier pools and effective stats — traits, gem augments, artifact
  infusions, fusion, facility-upgrade efficiencies, and spec perks — *not* in raw levels.
- **Currencies** (combat-dropped unless noted): **Essence** (gems), **Ore** (artifacts),
  **Bricks** (facilities, rarer), **Lifeforce** (leveling + fusion), and **perk points**
  (specs; non-dropped, first-boss-kills only). All currencies are **unbounded** — no storage
  cap.
- **Depth scaling**: enemy **level** (via a floor→level-range curve, not a separate stat
  multiplier) scales with floor depth (config; the master difficulty lever — see §4 difficulty
  model and §13).
- **Biome discovery**: reaching new depth bands reveals biomes; discovering all 10 unlocks the
  Biome Atlas (see §4).
- **Facilities**: built/upgraded with Bricks; a core progression axis (see §4).
- **Souls**: per-creature collection toward 100% summon unlocks (see §5).

There are **no prestige mechanics and no progress resets** — progression is purely forward
(descend deeper, grow creatures via XP + catch-up, collect souls, craft gems/artifacts, fuse,
build facilities, earn perks, deepen builds).

Balance numbers are **not** in this document — they live in tunable config so AI-assisted
iteration doesn't require touching engine code. See CONVENTIONS.

## 11. Persistence

Saves are expected to be **large** (big creature rosters, many script templates, inventories,
progression state). Design for that from the start.

**Store:** IndexedDB is the **primary store** (via `idb`/Dexie); `localStorage` holds only tiny
things (settings, a last-save pointer) — never the main save.

**What the save contains** (instances + references only — never copies of static game data):
- **Player meta**: chosen specialization; perk points (earned total + spent allocation);
  deepest-reached floor; current floor; bosses defeated (first-clear tracking); biome discovery
  state; Biome Atlas assignments.
- **Collection**: owned creature **instances**, each: a reference to its source + level/XP,
  current affinity, trait slots, equipped gem refs, equipped artifact ref, `hasFused`; plus
  **per-creature soul%**.
- **Inventory**: gem instances (level + augments), artifact instances (level + infusions),
  unlocked recipes, currency balances (Essence / Ore / Bricks / Lifeforce).
- **Facilities**: which are built + their upgrade tiers.
- **Scripts**: all script templates + each creature's assigned template.

**References, not copies** (the key rule): instances reference static creatures/species **by
ID** (e.g. `creatureId: "black_spider"`) and read base stats/affinity/trait from shipped data.
This keeps saves lean and lets rebalancing flow into existing saves automatically.

**Fused creatures store a recipe, not a result.** A fused instance saves
`{ identityParent: creatureId, affinityParent: creatureId }` (two static creature IDs, ordered
by role). On load the engine derives the fused creature: **identity/species from
identityParent, affinity from affinityParent, base stats = per-stat average of the two, both
innate traits**. This is valid because **fusion is fuse-once** (a parent is never itself a
fusion) and fusion reads only **static per-creature data** (not level/gems/XP). *Consequence,
accepted as intended:* rebalancing a base creature later **does** retroactively change existing
fused creatures derived from it.

**Versioning & migration**: `{ version: number, data: {...} }` — **one global version number for
the whole save**, even though storage is partitioned (below); a migration step may touch only
the partition(s) it actually changes. On load, run a sequential migration chain
(`migrate_v1_to_v2(data)`, `migrate_v2_to_v3(data)`, …), each a pure function, up to current.
Never load an unversioned blob.

**Partitioning**: split the save into **logical records** (`meta`, `collection`, `inventory`,
`facilities`, `scripts`) so a small change (e.g. spending a perk point) rewrites only `meta`,
not the whole game. **Do not pre-optimize** to per-creature records; only split `collection`
finer *if* the collection write becomes a **measured** bottleneck on very large rosters. If a
partition is **missing or fails to parse** on load (corruption, manual tampering, a bug), the
engine resets **just that partition** to its default/empty shape and surfaces a warning to the
player — it does not fail the whole load. Losing one partition (e.g. `inventory`) should never
cost the player unrelated data (e.g. `collection`, `scripts`).

**Autosave**: on **meaningful events** (fight resolved, item crafted, fusion done, floor
descended, perk spent), **debounced** (a few seconds), plus a save on tab-close /
visibility-change. A fight is **atomic** — never save mid-fight; resolve, then save the result.
Never block the game loop on a save.

**Slots & file ops**: **single save slot** in v1 (the game is one continuous forward-only
descent). Provide **export to file** (compressed, e.g. native `CompressionStream`/gzip — large
saves warrant it for shareable/backup file size), **import from file** (decompresses and
migrates as needed), and **delete save** (a clean start-over escape hatch). **IndexedDB itself
stores uncompressed records** — compression is an export/import-boundary concern only, kept off
the hot autosave path.

## 12. Explicit non-goals (for now)

- No multiplayer, no server, no accounts.
- No real-money anything.
- No real-time/twitch combat — it's resolved turn-based even when fast-forwarded.
- No free-text scripting language in v1 (UI-driven rules only).
- **No prestige / no resets** — progression is forward-only.

## 13. Open questions & parked items

**Balance numbers (all parked — live in config, tune in playtest):**
- Floor→enemy-level-range curve (the master difficulty lever: level-vs-floor ratio, range
  width-growth rate) and XP/level growth pacing.
- Drop weights/rates for Essence, Ore, Bricks, Lifeforce, and recipes.
- Costs: gem craft/augment/level (Essence), artifact craft/infuse/level (Ore), facility
  build/upgrade (Bricks), fusion + catch-up leveling (Lifeforce).
- Soul-per-kill % per rarity tier; status magnitudes/durations/per-status stack caps; affinity
  already fixed (±25%).
- Facility upgrade-tier counts and exact cap values (Gem Forge, Artifact Forge, Fusion Chamber
  only — structure is decided in §4, numbers are not).
- Typical fight-length target (rounds per on-level fight) and the exact fight-length safety
  round-cap value (structure decided in §7, number TBD).

**Design items parked (decided to defer, not undecided):**
- **Behavioral traits** (scripting-altering / extra-action traits) — post-v1.
- **Status effect naming** (Intelligence/Speed buff-debuff names) — data, name later.
- **Lifeforce / Essence** possible rename if they feel too samey in UI.

**Genuinely open (need a decision before the relevant content):**
1. The **biome roster**: the 10 biome names/themes and which creature types populate each
   (v1 target >3 species/biome, >6 creatures/species ≈180+ total), plus per-spec **starter
   creatures**. Deliberately deferred — don't let it block the engine skeleton (Phases 0–3),
   which is built against placeholder data; it's the largest content-authoring task in the
   project.

Lock this down before the phase that depends on it (Phase 4 content, per ROADMAP).
