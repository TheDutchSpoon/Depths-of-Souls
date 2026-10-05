# The Overgrowth (Biome 1, floors 1–10) — content reference

Status: shipped — Phase 4 Slice H1; Phase 4.1 changes decided (see the last section). Source:
creature/species composition in `src/data/species/overgrowth.ts`; trait definitions in
`src/data/traits/overgrowth.ts`; spell definitions in `src/data/spells/overgrowth.ts` (shared core
spells in `src/data/spells/core.ts`); Web/Sleep in `src/data/statuses.ts`. Design source:
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

**Web** — A Webbed creature acts last in the round. **Every time any creature takes a turn** (not
only the Webbed one), the Web has a **10% chance** to break — so in a full 6v6 fight a Web usually
breaks within one round (about 72% of the time). Web never lasts more than **3 turns**, regardless
of whether it breaks free.

**Silenced** — A Silenced creature can't **cast** (any spell, whether it chose the cast or was
granted it by a trait). Its turn is **not** skipped: it uses its next legal option instead, so a
creature that always casts attacks, and a creature whose script has nothing else to do waits.
Lasts **3 of the Silenced creature's own turns**, whether it acts before or after the caster in the
round (it counts down at the end of each of its own turns); casting Silence again on it refreshes
the 3 turns. Applied by **Silence** (Violence). The Sorcerer perk **Clear Mind** makes a creature
immune: Silence still lands and still counts as "Silenced" for any rule that checks for it, but the
creature casts anyway.

**Pacified** — Silenced's mirror: the creature can't **attack** (chosen or granted), but its turn is
not skipped. A creature that always attacks has no legal action and waits; one that can cast
casts. Lasts **3 of its own turns**. Applied by **Pacify** (Wit). The Brute perk **Aggressive**
makes a creature immune, the same way.

**Sleep** — A Sleeping creature's turn is skipped entirely. The instant it takes any damage, it
wakes up — the hit that wakes it still lands its own bonus (see Reaper below) before Sleep is
removed. Lasts up to **3 turns** if the sleeper is never hit.

## Spiders (Wit) — Trap → Exploit

| Creature | Affinity | Role | Description |
|---|---|---|---|
| Weaver | Wit | Enabler | At the end of its own turn, this creature applies Web to a random living enemy. |
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

## Spells (13 of The Overgrowth's own (11 plus Silence and Pacify, built in 4.1-F3), plus 3 shared "core" spells — all unlocked at biome 1)

Damage-spell power convention: a single-target spell with no other effect deals damage around
**100%** of the caster's Intelligence; one that also applies a status pulls back to roughly
**80–90%**. An AOE spell with no other effect would land around **50%**; one that also applies a
status pulls back to roughly **30–40%**. No affinity in this biome carries two plain damage
spells — every affinity's second entry does something else instead (except Wit, which carries a
third, plain-damage entry: Arcane Bolt).

| Spell | Affinity | Description |
|---|---|---|
| Thorn Lash | Violence | A single-target hit dealing damage equal to **100% of the caster's Intelligence**. |
| Weakening Bite | Violence | Permanently lowers a single enemy's Defence by **20%** for the rest of the fight. |
| Vine Snare | Wit | A single-target hit dealing **85% of the caster's Intelligence**, and applies Web to its target for 3 turns. |
| Pollen Cloud | Wit | Hits every enemy for **35% of the caster's Intelligence** each, and puts all of them to Sleep for 2 turns. |
| Arcane Bolt | Wit | A single-target hit dealing damage equal to **50% of the caster's Intelligence**. Also the Sorcerer starter's fixed granted gem. |
| Root Grasp | Endurance | A single-target hit dealing damage equal to **100% of the caster's own Defence** (instead of Intelligence). |
| Bramble Ward | Endurance | Permanently raises the whole team's Defence by **20%** for the rest of the fight. |
| Regrowth | Vitality | Heals a single ally for an amount equal to **30% of the caster's own effective Health**. |
| Wild Vigor | Vitality | Permanently raises a single ally's Attack by **15%** for the rest of the fight. |
| Stinger Swarm | Instinct | A single-target hit dealing damage equal to **100% of the caster's Intelligence**. |
| Howling Instinct | Instinct | Permanently raises the whole team's Speed by **10%** for the rest of the fight. |
| Silence | Violence | Silences a single enemy for **3 turns**: it can't cast. No damage. |
| Pacify | Wit | Pacifies a single enemy for **3 turns**: it can't attack. No damage. |

"Damage equal to X% of the caster's Intelligence (or Defence, for Root Grasp)" always goes through
the normal damage formula (the target's Defence, affinity, all the usual modifiers) — the
percentage is the spell's own power coefficient, not a flat number. Every ally-targeting entry
above (Bramble Ward, Regrowth, Wild Vigor, Howling Instinct) can be cast on any living ally,
including the caster itself.

### Shared "core" spells (`src/data/spells/core.ts`)

Three affinity-generic spells, authored before any biome existed, that were never actually wired
into any biome's roll until the Phase 4 interstitial slice (cumulative spell unlock) — they're
tagged `unlockedAtBiome: 1` and reachable at The Overgrowth and every deeper biome, same as the
11 above:

| Spell | Affinity | Description |
|---|---|---|
| Ember Lance | Violence | A single-target hit dealing damage equal to **50% of the caster's Intelligence**. |
| Cinder Nova | Violence | Hits every enemy for **30% of the caster's Intelligence** each. |
| Venom Bolt | Instinct | A single-target hit dealing damage equal to **40% of the caster's Intelligence**, and applies Poison to its target for 3 turns. |

### Cumulative unlock

Spell unlock is **cumulative, not per-biome-exclusive** (GAME_DESIGN §4): every spell above is
tagged `unlockedAtBiome: 1`, meaning it stays rollable by any affinity-matched caster in every
biome from here on — Glimmerdark and Rotcap Hollow inherit this entire list rather than
re-authoring their own version of it. See `.claude/content/glimmerdark.md` for what biome 2 adds
on top.

## Phase 4.1 — decided changes (pending build)

Decided at the Phase 4 close review. Each slice PR folds its part into the sections above when it
lands, the same way numbers are kept in sync.

**Roles** (4.1-G; each creature's `defaultScriptId` becomes its role script, see CONVENTIONS
"Role scripts"):

| Creature | Role | Creature | Role |
|---|---|---|---|
| Spider Weaver | caster | Pollinator Duster | support |
| Spider Ambusher | striker | Pollinator Beneficiary | caster |
| Spider Broodwarden | striker | Pollinator Pollenlord | caster |
| Swarmhive Drone | opener | Snapjaw Lure | `always-provoke` (its trait fires on Provoke) |
| Swarmhive Striker | striker | Snapjaw Jaws | striker |
| Swarmhive Queen | warden | Snapjaw Ironjaw | striker |
| Treant Sapling | guardian (self-ramping: wants to survive, not draw fire) | Lullpollen Sleeper | striker |
| Treant Elder | warden | Lullpollen Reaper | striker |
| Treant Grovekeep | warden | Lullpollen Dozer | striker |
| **Broodmother** (boss) | striker | | |

**New biome-1 spells:**

| Spell | Affinity | Slice | Description (numbers set in the 4.1-H tuning pass) |
|---|---|---|---|
| Pounce | Instinct | 4.1-G | A single-target hit whose damage scales off the caster's **Speed**. |
| Stifling Weight | Endurance | 4.1-G | Weakens a single enemy. No damage. |
| Life Siphon | Vitality | 4.1-G | A single-target hit that also heals the caster. |

With these, every affinity has at least three biome-1 spells, so every enemy can roll a full set of
three distinct gems (a data test guards it).

**Phase 4.5 clean-up (decided):** Ember Lance and Venom Bolt are deleted (no niche: Venom Bolt
overlaps Stinger Swarm). **Cinder Nova is kept and promoted** to real Overgrowth content, as the
pool's only plain AOE damage spell, with a reviewed name and numbers.

**Status timing (4.1-F):** Web, Sleep and every other status count down in the **bearer's own
turns**, at the end of each of its turns; damage-over-time (e.g. Venom Bolt's Poison, while it
exists) ticks at the end of each of its bearer's turns instead of at round end. A status applied
during or after its bearer's action starts counting the next turn; one applied at the start of the
bearer's turn, before it acts, counts that turn. Web's break roll moves to the end of each
creature's turn (still 10%, still at every creature's turn), and a Web is first rolled at the turn
after the one that applied it. The Weaver now Webs at the **end** of its turn (4.1-F2), so its own
turn's roll never touches the Web it just placed.

**Casting roles change the "only spellcaster" notes:** once roles land (4.1-G), Pollenlord is no
longer the biome's only caster: Spider Weaver and Pollinator Beneficiary become casters, Pollinator
Duster a support and Swarmhive Drone an opener, and every enemy carries a full gem set. Update the
creature descriptions when the roles land.

**Stun has no real source** in the seed content for now (no trait or spell applies it); it stays in
the status vocabulary.
