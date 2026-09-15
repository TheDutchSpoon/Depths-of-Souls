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
- **Rare = Amplifier.** Its own distinct mechanic in the same spirit as its species-mates — never
  just both of their effects stapled together.

Rarity never means "stronger" here — a rare creature's total stat budget is about the same as its
common/uncommon species-mates. Rarity only changes how often it spawns.

## Statuses

**Web** — A Webbed creature acts last in the round. Each turn, it has a **10% chance** to break
free early. Web never lasts more than **3 turns**, regardless of whether it breaks free.

**Sleep** — A Sleeping creature's turn is skipped entirely. The instant it takes any damage, it
wakes up — the hit that wakes it still lands its own bonus (see Reaper below) before Sleep is
removed. Lasts up to **3 turns** if the sleeper is never hit.

## Spiders (Wit) — Trap → Exploit

| Creature | Affinity | Role | Description |
|---|---|---|---|
| Weaver | Wit | Enabler | At the start of its own turn, this creature applies Web to a random living enemy. |
| Ambusher | Wit | Payoff | This creature deals **40% more damage** to enemies that are Webbed. |
| Broodwarden | Instinct | Amplifier | When this creature attacks, it also lands a separate bonus hit equal to **25% of its Attack for every enemy currently Webbed** (so 50% with two Webbed enemies, and so on) — it never applies Web itself, only benefits from what its species-mates have already done. |

## Swarmhive (Violence) — Strength in Numbers

| Creature | Affinity | Role | Description |
|---|---|---|---|
| Drone | Violence | Enabler | When this creature dies, it attacks a random living enemy for damage equal to **30% of its Attack**. |
| Striker | Violence | Payoff | At the start of the fight, this creature's Attack permanently increases by **20% for every living Swarmhive ally, itself included**. |
| Queen | Endurance | Amplifier | Every time this creature's own turn starts, it permanently raises the Attack of **every living Swarmhive ally (itself included) by 10%** — this repeats every round she acts, compounding over time. |

Striker's bonus is locked in at the moment the fight starts — it does not change later if allies
join or die mid-fight. Queen's is the opposite: a smaller amount, but it lands again and again as
the fight goes on, and it buffs the whole team, not just herself.

## Treants (Vitality/Endurance) — A Health Engine

| Creature | Affinity | Role | Description |
|---|---|---|---|
| Sapling | Vitality | Enabler | At the end of every round, this creature's maximum Health permanently increases by **10%** (compounding — it keeps stacking every round). |
| Elder | Endurance | Payoff | At the end of every round, this creature heals its lowest-HP ally for an amount equal to **15% of its own effective Health**. |
| Grovekeep | Vitality | Amplifier | At the start of the fight, this creature permanently raises the whole team's maximum Health by **15%** — a one-time, team-wide effect, distinct from Sapling's self-only growth and Elder's single-ally healing. |

## Pollinators (Wit/Vitality) — Team Buffs

| Creature | Affinity | Role | Description |
|---|---|---|---|
| Duster | Vitality | Enabler | At the start of the fight, this creature permanently raises its whole team's Speed by **25%**. |
| Beneficiary | Wit | Payoff | This creature's attacks deal additional damage equal to **30% of its own effective Speed** — so a team sped up by Duster hits harder through Beneficiary specifically. |
| Pollenlord | Wit | Amplifier | Every time this creature's own turn starts, it permanently raises its whole team's Speed by **10%** — a smaller amount than Duster's, but it repeats every round Pollenlord acts. This is the biome's only spellcaster. |

## Snapjaws (Violence/Endurance) — Bait & Punish

| Creature | Affinity | Role | Description |
|---|---|---|---|
| Lure | Endurance | Enabler | Whenever this creature Provokes, it also Defends. |
| Jaws | Violence | Payoff | Whenever this creature takes damage, it attacks back for **60% of its Attack**. |
| Ironjaw | Violence | Amplifier | Every time this creature's own turn starts, its Defence permanently increases by **20%** — a self-ramping wall, distinct from both Lure's provoke-and-Defend and Jaws' retaliation. |

## Lullpollen (Wit/Instinct) — Sleep & Punish

| Creature | Affinity | Role | Description |
|---|---|---|---|
| Sleeper | Wit | Enabler | When this creature attacks, it has a **40% chance** to put its target to Sleep. |
| Reaper | Instinct | Payoff | This creature deals **50% more damage** to Sleeping enemies. |
| Dozer | Instinct | Amplifier | When this creature attacks, it also lands a separate bonus hit equal to **25% of its Attack for every enemy currently Sleeping** (so 50% with two Sleeping enemies, and so on) — it never puts anything to Sleep itself, only benefits from what its species-mates have already done. |

## The Broodmother (floor-10 boss)

Wit affinity. A unique, non-collectable set-piece fight — not a spawn-pool creature.

- Whenever the Broodmother attacks, she also deals bonus damage equal to **25% of her Attack for
  every living spiderling still fighting alongside her, herself included**. Kill her adds and this
  bonus visibly shrinks — it's read fresh on every attack, not locked in at fight-start (unlike
  Swarmhive's Striker above).
- At the end of every round, she has a **40% chance** to apply Web to the entire enemy party at
  once.

Her adds are two real Spider-roster members (Weaver and Ambusher). Actually *running* her fight
(assembling the encounter, awarding perk points on first clear) is deliberately left for a later
slice — this slice only authors her as content: her stats, her signature trait, and which real
roster members accompany her, the same content/runner split the Unicorn's own scripted intro had
in Slice F.

## Spells (10, two per affinity)

Damage-spell power convention: a single-target spell with no other effect deals damage around
**100%** of the caster's Intelligence; one that also applies a status pulls back to roughly
**80–90%**. An AOE spell with no other effect would land around **50%**; one that also applies a
status pulls back to roughly **30–40%**. No affinity in this biome carries two plain damage
spells — every affinity's second entry does something else instead.

| Spell | Affinity | Description |
|---|---|---|
| Thorn Lash | Violence | A single-target hit dealing damage equal to **100% of the caster's Intelligence**. |
| Weakening Bite | Violence | Permanently lowers a single enemy's Defence by **20%** for the rest of the fight. |
| Vine Snare | Wit | A single-target hit dealing **85% of the caster's Intelligence**, and applies Web to its target for 3 turns. |
| Pollen Cloud | Wit | Hits every enemy for **35% of the caster's Intelligence** each, and puts all of them to Sleep for 2 turns. |
| Root Grasp | Endurance | A single-target hit dealing damage equal to **100% of the caster's own Defence** (instead of Intelligence). |
| Bramble Ward | Endurance | Permanently raises the whole team's Defence by **20%** for the rest of the fight. |
| Regrowth | Vitality | Heals a single ally for an amount equal to **30% of the caster's own effective Health**. |
| Wild Vigor | Vitality | Permanently raises a single ally's Attack by **15%** for the rest of the fight. |
| Stinger Swarm | Instinct | A single-target hit dealing damage equal to **100% of the caster's Intelligence**. |
| Howling Instinct | Instinct | Permanently raises the whole team's Speed by **10%** for the rest of the fight. |

"Damage equal to X% of the caster's Intelligence (or Defence, for Root Grasp)" always goes through
the normal damage formula (the target's Defence, affinity, all the usual modifiers) — the
percentage is the spell's own power coefficient, not a flat number. Every ally-targeting entry
above (Bramble Ward, Regrowth, Wild Vigor, Howling Instinct) can be cast on any living ally,
including the caster itself.
