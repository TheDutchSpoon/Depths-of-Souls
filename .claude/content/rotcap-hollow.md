# Rotcap Hollow (Biome 3, floors 21–30) — content reference

Status: shipped — Phase 4 Slice H3, revised per content review and PR #64 review; Phase 4.1
changes decided (see the last section); Phase 4.1-G1 added the roles and the 6v6 boss floor. Source:
creature/species composition in `src/data/species/rotcap-hollow.ts`; trait definitions in
`src/data/traits/rotcap-hollow.ts`; spell definitions in `src/data/spells/rotcap-hollow.ts`;
Spore/Confusion in `src/data/statuses.ts`. Design source: `.claude/species/species-locked.md`'s
Biome 3 table.

This doc is the **player-facing reference** — every trait, status, and spell below is written as
a single, literal description of what it does, exact numbers included, in the phrasing style a
future in-game tooltip would use. Each creature's description stands on its own — it never
explains what it does by comparing it to a sibling creature. If a number here ever disagrees with
the source file, the source file is correct and this doc is stale — update it in the same change
that changes a number.

## Reading this biome

Most species follow the same common/uncommon/rare roles as The Overgrowth and Glimmerdark —
enabler sets a trick up, payoff benefits from it, amplifier does its own distinct thing. One
species here doesn't have a two-role trick to chain off (**Necromoss**) — all three of its
creatures share the *same* mechanic instead, just at a bigger scope or a bigger number as rarity
rises (the Resonants/Gloomjaws pattern from Glimmerdark).

Every status below counts its duration down in **rounds** (once at the end of each round), the
same as every other status in the game — never per individual turn. **This changes in Phase
4.1-F:** every status will count down in its **bearer's own turns**, and damage-over-time ticks at
the end of each of the bearer's turns (see the last section).

## Statuses

**Spore** — A festering infection. While active, the bearer takes damage every round worth **15%
of the Speed of the creature that infected it**, measured at the moment of infection (a placeholder
until 4.1-H2c). If the bearer *dies* while infected, the spores burst and infect one living,
still-healthy member of the bearer's own side, **carrying the same infection**: the new host takes
the original infector's damage, not a share of the dying host's own Speed. The contagion keeps
spreading through a population as it's whittled down, rather than clinging to whoever already has
it. If every living member of that side is already infected, the spread simply fizzles. Lasts up
to **3 rounds** per infection.

**Damage over time (Spore, Burn, Poison)** — Each tick is **indirect damage**: the infector's
affinity against the bearer applies, then the bearer's damage-taken effects (Vulnerability,
Defending), and only a fifth of the bearer's Defence is subtracted; a tick always deals at least 1.
None of the infector's damage bonuses (Weaken, a bonus against Burning targets, armour penetration)
touch a tick: its strength was fixed when the status landed. While the infector is alive the damage
counts as its own, so its kill and damage-dealt traits fire; once it is dead the damage is only
logged against the bearer, and nothing reacts as its dealer. Retaliation never answers a tick. A
status never stacks: re-applying it refreshes the timer and keeps the stronger of the two (a tie
keeps the one already there).

**Confusion** — A puppet's madness. For **3 rounds**, every time the confused creature tries to
attack or cast something harmful, there's a **50% chance** it strikes its own side instead.

## Sporecloud (Wit) — Contagion

| Creature | Affinity | Role | Description |
|---|---|---|---|
| Seeder | Wit | Enabler | Every attack infects its target with Spore. |
| Reaper | Wit | Payoff | Every attack also lands a bonus hit — **20% of this creature's Intelligence, for each enemy currently infected with Spore** (e.g. 3 Spored enemies = a bonus hit worth 60% Intelligence). With no infected enemies, this creature lands no bonus hit at all — just its ordinary attack. The bonus hit is **indirect damage**: only a fifth of the target's Defence applies to it, and it gets no chip floor and no Additional. |
| Bloomer | Wit | Amplifier | At the start of the fight, infects the entire enemy side with Spore. |

## Rotfeeders (Violence/Vitality) — Carrion Snowball

| Creature | Affinity | Role | Description |
|---|---|---|---|
| Scavenger | Violence | Enabler | Whenever any enemy dies — not just one it killed itself — this creature's Attack permanently rises by **10%**. This can happen more than once in the same round if more than one enemy dies, so it compounds as the fight goes on. |
| Ripper | Violence | Payoff | Every kill it personally lands restores **15% of its own maximum HP**. |
| Gorgemaw | Vitality | Amplifier | Every kill it personally lands restores **10% of its own maximum HP**, and permanently raises its own maximum HP by **5%**. |

## Myconet (Endurance/Wit) — Death-Network

| Creature | Affinity | Role | Description |
|---|---|---|---|
| Warder | Endurance | Enabler | Whenever an ally of this creature dies, every surviving ally's Defence permanently rises by **15%**. |
| Rotcore | Wit | Payoff | When this creature itself dies, it bursts a cloud of Poison across the entire enemy side. The Poison is measured from the Rotcore as it dies (20% of its Attack), and since it is already dead, every tick is logged as each bearer's own damage. |
| Gravedigger | Endurance | Amplifier | Whenever an ally of this creature dies, it heals itself for **20% of its own maximum HP**. |

## Necromoss (Wit/Vitality) — Reclaim

All three heal or buff off the same source: how many of their own allies have already died.
Nothing happens until an ally has actually fallen.

| Creature | Affinity | Role | Description |
|---|---|---|---|
| Wisp | Wit | — | At the start of its own turn, heals itself for **5% of its own maximum HP, once for every dead ally on its side** (e.g. 2 dead allies = a 10%-of-maximum-HP heal). |
| Thicket | Vitality | — | Whenever an ally dies, this creature's Defence permanently rises by a flat **10%**. This happens once per death — a 2nd death is a separate, additional +10% rise on top of the first, not a bigger single jump. |
| Hollowroot | Vitality | Amplifier | At the start of its own turn, heals **every living ally** for **5% of this creature's own maximum HP, once for every dead ally on its side** (e.g. 2 dead allies = every ally healed for 10% of this creature's maximum HP). This heal fires regardless of what it casts. |

## Hollowkin (Endurance/Instinct) — Puppet

| Creature | Affinity | Role | Description |
|---|---|---|---|
| Wretch | Endurance | Enabler | Whenever this creature is struck, it confuses whoever just hit it. |
| Marionette | Instinct | Enabler | Every attack confuses whoever it hits. |
| Puppeteer | Instinct | Payoff | Deals **30% more damage** to any enemy currently Confused. |

## Sporch (Violence/Wit) — Strong, Non-Spreading Burn

| Creature | Affinity | Role | Description |
|---|---|---|---|
| Igniter | Violence | Enabler | Every attack brands its target with Burn: each round, damage worth **25% of the Igniter's Intelligence**, measured when branded (a placeholder until 4.1-H2c). Re-branding refreshes the Burn and keeps the stronger one. |
| Ashborn | Wit | Payoff | Deals **30% more damage** to any enemy currently Burning. |
| Cinderlord | Violence | Amplifier | Every kill it personally lands applies **Burn to every remaining enemy**, measured from the Cinderlord's own Intelligence; an enemy already Burning keeps the stronger Burn and has its timer refreshed. |

## How each creature plays (roles)

Every creature fights by a **role**: a short list of rules it follows in order, top first (see
`.claude/content/enemy-behaviour.md` for what each role does). Every enemy also carries **three
different spells** of its own affinity.

| Creature | Role | Creature | Role |
|---|---|---|---|
| Sporecloud Seeder | striker | Necromoss Wisp | caster |
| Sporecloud Reaper | striker | Necromoss Thicket | warden |
| Sporecloud Bloomer | caster | Necromoss Hollowroot | support (casts its heals only when an ally is below 50%) |
| Rotfeeder Scavenger | striker | Hollowkin Wretch | warden (provokes, then confuses whoever hits it) |
| Rotfeeder Ripper | striker | Hollowkin Marionette | striker |
| Rotfeeder Gorgemaw | striker | Hollowkin Puppeteer | striker |
| Myconet Warder | warden | Sporch Igniter | striker |
| Myconet Rotcore | warden (it wants to be hit) | Sporch Ashborn | caster |
| Myconet Gravedigger | guardian (self-sustain that pays off by surviving) | Sporch Cinderlord | opener |
| **Rot Sovereign** (boss) | warden | | |

Necromoss Hollowroot is no longer the biome's only spellcaster: Sporecloud Bloomer, Necromoss Wisp
and Sporch Ashborn are casters, and Sporch Cinderlord is an opener.

## The Rot Sovereign (floor-30 boss)

Endurance affinity. A unique, non-collectable set-piece fight — not a spawn-pool creature. The
biome-3 finale; the puzzle is managing attrition, not racing pure damage.

- Whenever a creature dies on *either* side of the fight — one of her own (including her own
  adds) or one of the opposing party's — her Attack permanently rises by a flat **10%**, the same
  rate no matter which side it was. This happens once per death — a 2nd death (from either side)
  is a separate, additional +10% rise on top of the first, not a bigger single jump. Death on
  either side feeds her, which is exactly the "don't feed it" puzzle.
- At the start of every one of her own turns, she blankets the entire opposing side with Spore.

**A boss fight is 6v6, like every fight from floor 6.** Her authored adds are a Sporecloud Seeder
and a Rotfeeder Scavenger; the other three slots are random creatures from Rotcap Hollow's own pool
(never another Sovereign), rerolled on every visit, with ordinary kill rewards — and every one of
them that dies feeds her, the same as any death. She plays as a warden and carries three Endurance spells, so a lock lowers
her turn rather than emptying it: a Pacified Rot Sovereign casts one of her spells instead of
waiting.

## Spells (5 of Rotcap Hollow's own, unlocked at biome 3 — plus every earlier biome's spells, inherited)

Spell unlock is cumulative (GAME_DESIGN §4): a Rotcap Hollow caster can roll any biome-1 or
biome-2 spell (see `.claude/content/overgrowth.md` and `.claude/content/glimmerdark.md`) in
addition to the 5 spells below, which unlock starting at biome 3. One per affinity, each
introducing something the earlier pool doesn't already have.

| Spell | Affinity | Description |
|---|---|---|
| Spore Cyst | Wit | A single-target hit dealing damage equal to **45% of the caster's Intelligence**, and infects the target with Spore for **3 rounds** — the first spell to apply Spore. |
| Rasping Chant | Endurance | Permanently lowers a single enemy's Defence to **80%** of its current value, for the rest of the fight. |
| Puppet String | Instinct | A single-target hit dealing damage equal to **80% of the caster's Intelligence**, and Confuses the target for **3 rounds** — the first spell to apply Confusion. |
| Charnel Feast | Vitality | Heals every ally for **25% of the caster's maximum HP** — the game's first Vitality AOE spell; every earlier Vitality heal was single-target. |
| Withering Bolt | Violence | A single-target hit dealing damage equal to **45% of the caster's Intelligence**, and Burns the target for **3 rounds** — the first spell to apply Burn (Sporch's Igniter was, until now, the only producer). |

Spore Cyst and Withering Bolt both deal comparatively low upfront damage for a single-target
spell — a status-applying spell's damage half is deliberately not its headline number, the same
rule Puppet String follows. The nearest comparison point in the existing pool is Venom Bolt
(Instinct), the game's other damage-plus-DoT spell, at 40% Intelligence.

Charnel Feast can be cast on the caster's own side and hits every living ally at once.

## Phase 4.1 — decided changes (pending build)

Decided at the Phase 4 close review and the 4.1-H2 grill (the last items). Each slice PR folds its
part into the sections above when it lands. (4.1-G1 folded in the roles and the casting-role notes.)

**Status timing (4.1-F):** Spore, Confusion and every other status count down in the **bearer's own
turns**. Spore (and every DoT) ticks **at the end of each of its bearer's turns** instead of at round
end, before that turn's countdown. A status applied during or after its bearer's action starts
counting the next turn; one applied at the start of the bearer's turn, before it acts, counts that
turn. Spore's spread on death is unchanged.

**Enemy support casters (4.1-C):** Necromoss Hollowroot's ally spells (Regrowth, Afterglow, Wild
Vigor, …) now land on **its own side** by default. In Phase 4 an enemy support caster targeted the
player's lowest-HP creature, healing and buffing the player.

**Decided at the 4.1-H2 grill** (brief ASSUMPTIONS 110–129; the DoT, Spore-spread, Rotcore and
Sporch items landed in 4.1-H2b2 and are folded into the sections above):

- **Health (4.1-H2c):** every creature's Health moves to the 20–45 range, as in every biome.
