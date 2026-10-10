# Spec — Progression

Read this when changing progression.

## Design

**Perk points** are *not* dropped — they come only from first-time boss kills (see §9).
Essence/Ore are the long-tail infinite sinks; Bricks is a front-loaded, tapering build-out sink.
All currencies are **unbounded** — no storage cap.

## 9. Player specializations

> **The three v1 perk trees are catalogued in `.claude/specializations/`** — `sorcerer.md`,
> `brute.md`, `shieldbarer.md`. Each is a flat pool of effect-carrier perks summing to exactly
> **1000**. The spec docs' P4/P8 column is a **design-record annotation** of which perks work before
> the Phase 8 gem/equipment systems; the code carries **no phase tag** (inert perks get a code
> comment and a data-test list). The starters live there too.

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

**All content is accessible to every specialization** (same creatures, gems, equipment,
biomes, facilities) — a spec changes *how you play*, never *what you can reach*.

The three starter creatures (locked; names are **placeholders** in the "Species + Role" pattern,
and both words may change once the deep biome is designed):
- **Glyphmoth Seer** (Sorcerer) — **Wit**, high Intelligence. Trait *Arcane Surge*: an **innate
  spell** (Arcane Bolt, in an extra slot before its gem slots — not a gem, un-upgradeable, keeps
  working after fusion; §5; spell power 1.0 from 4.1-H2c, was 0.5) plus a **50% chance at the end
  of its turn to cast a random equipped spell** (a granted action, §6).
- **Cragfang Mauler** (Brute) — **Violence**, high Attack. Its **Attack resolves one additional
  instance**: it attacks twice at 100%, each a real attack (same target as the first; if that target
  died, the second hit picks a new default target).
- **Stonehorn Warden** (Shieldbarer) — **Endurance**, high Defence. **Whenever it provokes, your
  whole team gains +35% Defence** for the fight (repeated provokes stack). *(The earlier
  "on-provoke → grant self defending" became the Shieldbarer's **Shield up** perk.)* **From
  4.1-H2c** (brief ASSUMPTION 123) it has Attack 15 (was 10; a 90 stat total on the old scale, like
  the other starters) and runs the **warden** script: provoke when an ally drops below 50%, else
  attack.
  Under **taunter** it never attacked, so its Attack was never read. Its damage after floor 10
  comes from perks.

The **Unicorn Lightbearer** (**Vitality**, the intro helper) joins in the scripted intro and is
**permanently owned**, though it can be benched like any creature. Each starter belongs to a
**species found only in a deep biome**, authored later — so in the seed content only the starter
exists, and its species sits **below the ≥3-creature minimum on purpose** (a forward-reference, not
a gap). The four affinities are ratified and distinct.

**Perks & perk points:**
- A specialization is a **named collection of perks** (data; perks plug into the existing
  effect framework where sensible. *(Meta-economy perk hooks — soul gain, currency drops,
  facility efficiency — are **deferred post-beta**; v1 perks are **combat effect-framework objects
  only**, so a spec's full 1000-point tree is authored from stat/damage-modifier perks. `Perk`
  stays a plain effect-carrier — no speculative meta-hook framework is built now.)* Specific perks
  are TBD; the data model + placeholders suffice for now.
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
- Points are spent **freely** on whichever perks the player wants as they're earned: the player
  sets any perk to any level from 0 to its max, as long as total spend stays within the earned
  budget, and can refund everything at once. Perks that only work once Phase 8 systems exist are
  buyable too (labelled inactive until then).
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
  stacking in the build-modifier pools and effective stats — traits, gem augments, equipment
  infusions, fusion, facility-upgrade efficiencies, and spec perks — *not* in raw levels.
- **Currencies** (combat-dropped unless noted): **Essence** (gems), **Ore** (equipment),
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
(descend deeper, grow creatures via XP + catch-up, collect souls, craft gems/equipment, fuse,
build facilities, earn perks, deepen builds).

Balance numbers are **not** in this document — they live in tunable config so AI-assisted
iteration doesn't require touching engine code. See CONVENTIONS.

## To fold

- **The Sorcerer starter's extra spell is an innate spell** (Phase 4.1-B, A8). Built in Slice F as
  a fixed `SpeciesCreature.equippedSpells` loadout (Arcane Bolt in slot 0 of a 4-slot array), which
  lives on the template and would be lost or broken by Phase 8 fusion. Replaced by a passive
  **`innate-spell { spell }`** effect on the Arcane Surge trait:
  - It is **not a gem**: no level, no augments, un-upgradeable by construction. It **travels with
    the trait through fusion**, whichever parent the Seer is.
  - **Innate spells occupy extra slots placed first**, then the regular gem slots. They are added
    at **fight setup**: `createCombat` reads the creature's `innate-spell` effects (canonical order)
    and prepends their spells onto `equippedSpells`. A materialized creature carries **regular gem
    slots only**; the Seer's **fight-setup** spell array stays byte-identical (innate Arcane Bolt at
    index 0, three regular slots after it). Fight setup refuses already-set-up creatures, so the
    innate slots can't be doubled (see "Fight setup"). *Phase 8 note:* when gems become objects
    (`{ spell, level, augments }`), an innate spell no longer fits the same array; expect innate
    slots to become a separate list that the cast pipeline reads ahead of the gem slots.
  - **No equip gate applies**, because the spell is not equipped: a fused non-Wit creature keeps
    casting it. This is distinct from the post-beta "off-affinity equipping" exception, which stays
    deferred.
  - **`SpeciesCreature.equippedSpells` is deleted.**
  - The same `Spell` stays available as a normal, upgradeable gem in the shared pool; a Seer may
    also equip an Arcane Bolt gem.

