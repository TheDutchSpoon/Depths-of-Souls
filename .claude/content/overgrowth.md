# The Overgrowth (Biome 1, floors 1–10) — content reference

Status: shipped — Phase 4 Slice H1. Source: creature/species composition in
`src/data/species/overgrowth.ts`; trait definitions in `src/data/traits.ts`; spell definitions in
`src/data/spells.ts`; Web/Sleep in `src/data/statuses.ts`. Design source:
`.claude/species/species-locked.md`'s Biome 1 table.

This doc is the **player-facing reference** — every trait and spell below is written as a single,
literal description of what it does, exact numbers included, in the phrasing style a future
in-game tooltip would use. If a number here ever disagrees with the source file, the source file
is correct and this doc is stale — update it in the same change that changes a number.

## Reading this biome

Every species has one closed, self-contained trick ("closed mechanic"). Within a species, the
three creatures always play the same three roles:

- **Common = Enabler.** Sets the trick up (applies a status, opens a condition).
- **Uncommon = Payoff.** Benefits from the trick once it's set up.
- **Rare = Amplifier.** Usually does *both* halves on its own, or scales the hardest.

Rarity never means "stronger" here — a rare creature's total stat budget is about the same as its
common/uncommon species-mates. Rarity only changes how often it spawns.

## Statuses

**Web** — A Webbed creature acts last in the round. Each turn, it has a **10% chance** to break
free early. Web never lasts more than **3 turns**, regardless of whether it breaks free.

**Sleep** — A Sleeping creature's turn is skipped entirely. The instant it takes any damage, it
wakes up — the hit that wakes it still lands its own bonus (see Reaper/Dozer below) before Sleep
is removed. Lasts up to **3 turns** if the sleeper is never hit.

## Spiders (Wit) — Trap → Exploit

| Creature | Role | Description |
|---|---|---|
| Weaver | Enabler | When this creature attacks, it applies Web to its target. |
| Ambusher | Payoff | This creature deals **40% more damage** to enemies that are Webbed. |
| Broodwarden | Amplifier | When this creature attacks, it applies Web to its target, and also deals bonus damage equal to **20% of its Attack for every enemy currently Webbed** (so 40% with two Webbed enemies, and so on). |

## Swarmhive (Violence) — Strength in Numbers

| Creature | Role | Description |
|---|---|---|
| Drone | Enabler | When this creature dies, it strikes whatever killed it for damage equal to **30% of its Attack**. |
| Striker | Payoff | At the start of the fight, this creature's Attack permanently increases by **10% for every living Swarmhive ally, itself included**. |
| Queen | Amplifier | At the start of the fight, this creature's Attack permanently increases by **20% for every living Swarmhive ally, itself included**. |

Striker and Queen's bonus is locked in at the moment the fight starts — it does not change later
if allies join or die mid-fight.

## Treants (Vitality/Endurance) — A Health Engine

| Creature | Role | Description |
|---|---|---|
| Sapling | Enabler | At the end of every round, this creature's maximum Health permanently increases by **5%** (compounding — it keeps stacking every round). |
| Elder | Payoff | At the end of every round, this creature heals its lowest-HP ally for an amount equal to **10% of its own effective Health**. |
| Grovekeep | Amplifier | At the end of every round, this creature's maximum Health permanently increases by **4%**, and it heals its lowest-HP ally for an amount equal to **15% of its own effective Health**. |

## Pollinators (Wit/Vitality) — Team Buffs

| Creature | Role | Description |
|---|---|---|
| Duster | Enabler | At the start of the fight, this creature permanently raises its whole team's Speed by **15%**. |
| Beneficiary | Payoff | This creature's attacks deal additional damage equal to **30% of its own effective Speed** — so a team sped up by Duster hits harder through Beneficiary specifically. |
| Pollenlord | Amplifier | At the start of the fight, this creature permanently raises its whole team's Speed by **10%** and Attack by **8%**. This is the biome's only spellcaster. |

## Snapjaws (Violence/Endurance) — Bait & Punish

| Creature | Role | Description |
|---|---|---|
| Lure | Enabler | Whenever this creature Provokes, it also enters a defensive stance (as if it had Defended). |
| Jaws | Payoff | Whenever this creature takes damage, it strikes back at the attacker for **60% of its Attack**. |
| Ironjaw | Amplifier | Whenever this creature Provokes, it also enters a defensive stance. Whenever it takes damage, it strikes back at the attacker for **50% of its Attack**. |

## Lullpollen (Wit/Instinct) — Sleep & Punish

| Creature | Role | Description |
|---|---|---|
| Sleeper | Enabler | When this creature attacks, it has a **40% chance** to put its target to Sleep. |
| Reaper | Payoff | This creature deals **50% more damage** to Sleeping enemies. |
| Dozer | Amplifier | When this creature attacks, it has a **30% chance** to put its target to Sleep. It also deals **35% more damage** to Sleeping enemies. |

## The Broodmother (floor-10 boss)

A unique, non-collectable set-piece fight — not a spawn-pool creature.

- Whenever the Broodmother attacks, she also deals bonus damage equal to **25% of her Attack for
  every living spiderling still fighting alongside her, herself included**. Kill her adds and this
  bonus visibly shrinks — it's read fresh on every attack, not locked in at fight-start (unlike
  Swarmhive's Striker/Queen above).
- At the end of every round, she has a **40% chance** to apply Web to the entire enemy party at
  once.

Her adds are two real Spider-roster members (Weaver and Ambusher). Actually *running* her fight
(assembling the encounter, awarding perk points on first clear) is deliberately left for a later
slice — this slice only authors her as content: her stats, her signature trait, and which real
roster members accompany her, the same content/runner split the Unicorn's own scripted intro had
in Slice F.

## Spells (10, two per affinity)

| Spell | Affinity | Description |
|---|---|---|
| Thorn Lash | Violence | A single-target hit dealing damage equal to **50% of the caster's Intelligence**. |
| Snapping Bite | Violence | A single-target hit dealing damage equal to **55% of the caster's Intelligence**. |
| Vine Snare | Wit | A single-target hit dealing **30% of the caster's Intelligence**, and applies Web to its target for 3 turns. |
| Pollen Cloud | Wit | Hits every enemy for **25% of the caster's Intelligence** each, and puts all of them to Sleep for 2 turns. |
| Root Grasp | Endurance | A single-target hit dealing damage equal to **40% of the caster's own Defence** (instead of Intelligence). |
| Bramble Ward | Endurance | Permanently raises the whole team's Defence by **20%** for the rest of the fight. |
| Regrowth | Vitality | Heals a single ally for an amount equal to **30% of the caster's own effective Health**. |
| Wild Vigor | Vitality | Permanently raises a single ally's Attack by **15%** for the rest of the fight. |
| Stinger Swarm | Instinct | A single-target hit dealing damage equal to **45% of the caster's Intelligence**. |
| Howling Instinct | Instinct | Permanently raises the whole team's Speed by **10%** for the rest of the fight. |

"Damage equal to X% of the caster's Intelligence" always goes through the normal damage formula
(Defence, affinity, all the usual modifiers) — the percentage is the spell's own power coefficient,
not a flat number. Every ally-targeting entry above (Bramble Ward, Regrowth, Wild Vigor, Howling
Instinct) can be cast on any living ally, including the caster itself.
