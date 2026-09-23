# Rotcap Hollow (Biome 3, floors 21–30) — content reference

Status: shipped — Phase 4 Slice H3, revised per content review. Source: creature/species
composition in `src/data/species/rotcap-hollow.ts`; trait definitions in
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

## Statuses

**Spore** — A festering infection. While active, the bearer takes damage equal to **4% of its own
maximum HP** every round (up to 3 stacks). If the bearer *dies* while infected, the spores burst
and infect one living, still-healthy member of the bearer's own side — the contagion keeps
spreading through a population as it's whittled down, rather than clinging to whoever already has
it. If every living member of that side is already infected, the spread simply fizzles. Lasts up
to **3 turns** per infection.

**Confusion** — A puppet's madness. For **3 turns**, every time the confused creature tries to
attack or cast something harmful, there's a **50% chance** it strikes its own side instead.

## Sporecloud (Wit) — Contagion

| Creature | Affinity | Role | Description |
|---|---|---|---|
| Seeder | Wit | Enabler | Every attack infects its target with Spore. |
| Reaper | Wit | Payoff | Every attack also lands a bonus hit — **20% of this creature's Intelligence, for each enemy currently infected with Spore** (e.g. 3 Spored enemies = a bonus hit worth 60% Intelligence). With no infected enemies, nothing extra happens. |
| Bloomer | Wit | Amplifier | At the start of the fight, infects the entire enemy side with Spore. |

## Rotfeeders (Violence/Vitality) — Carrion Snowball

| Creature | Affinity | Role | Description |
|---|---|---|---|
| Scavenger | Violence | Enabler | Whenever any enemy dies — not just one it killed itself — this creature's Attack permanently rises by **10%**. This can happen every round, so it compounds as the fight goes on. |
| Ripper | Violence | Payoff | Every kill it personally lands restores **15% of its own maximum HP**. |
| Gorgemaw | Vitality | Amplifier | Every kill it personally lands restores **10% of its own maximum HP**, and permanently raises its own maximum HP by **5%**. |

## Myconet (Endurance/Wit) — Death-Network

| Creature | Affinity | Role | Description |
|---|---|---|---|
| Warder | Endurance | Enabler | Whenever an ally of this creature dies, every surviving ally's Defence permanently rises by **15%**. |
| Rotcore | Wit | Payoff | When this creature itself dies, it bursts a cloud of Poison across the entire enemy side. |
| Gravedigger | Endurance | Amplifier | Whenever an ally of this creature dies, it heals itself for **20% of its own maximum HP**. |

## Necromoss (Wit/Vitality) — Reclaim

All three heal or buff off the same source: how many of their own allies have already died.
Nothing happens until an ally has actually fallen.

| Creature | Affinity | Role | Description |
|---|---|---|---|
| Wisp | Wit | — | At the start of its own turn, heals itself for **5% of its own maximum HP, once for every dead ally on its side** (e.g. 2 dead allies = a 10%-of-maximum-HP heal). |
| Thicket | Vitality | — | Whenever an ally dies, this creature's Defence permanently rises by **10%, once for every dead ally on its side including the one that just died** (e.g. its 1st ally death is a +10% rise; its 2nd is a separate, bigger +20% rise, stacking on top of the first). |
| Hollowroot | Wit | Amplifier | At the start of its own turn, heals **every living ally** for **5% of this creature's own maximum HP, once for every dead ally on its side** — the same heal as Wisp, but for the whole team at once. The biome's one spellcaster; this heal fires regardless of what it casts. |

## Hollowkin (Endurance/Instinct) — Puppet

| Creature | Affinity | Role | Description |
|---|---|---|---|
| Wretch | Endurance | Enabler | Whenever this creature is struck, it confuses whoever just hit it. |
| Marionette | Instinct | Enabler | Every attack confuses whoever it hits. |
| Puppeteer | Endurance | Payoff | Deals **30% more damage** to any enemy currently Confused. |

## Sporch (Violence/Wit) — Strong, Non-Spreading Burn

| Creature | Affinity | Role | Description |
|---|---|---|---|
| Igniter | Violence | Enabler | Every attack brands its target with a potent, **2-stack** Burn. |
| Ashborn | Wit | Payoff | Deals **30% more damage** to any enemy currently Burning. |
| Cinderlord | Violence | Amplifier | Every kill it personally lands detonates a fresh burst of Burn across the entire remaining enemy side. |

## The Rot Sovereign (floor-30 boss)

Endurance affinity. A unique, non-collectable set-piece fight — not a spawn-pool creature. The
biome-3 finale; the puzzle is managing attrition, not racing pure damage.

- Whenever one of her own allies dies (including one of her own adds), her Attack permanently
  rises by **15%, once for every one of her own side that has died so far, including the one that
  just fell** — the same escalating rise Necromoss Thicket uses. Her 1st ally death is a +15%
  rise; her 2nd is a separate, bigger +30% rise, stacking on top of the first; her 3rd would be
  +45%, and so on. Because each rise stacks on top of the ones before it, her Attack compounds
  fast the longer her own side keeps dying.
- Whenever any creature on the *opposing* side dies too, her Attack also rises — a flat **5%**
  every time, regardless of how many have died so far. Death on either side feeds her, which is
  exactly the "don't feed it" puzzle.
- At the start of every one of her own turns, she blankets the entire opposing side with Spore.

## Spells (5 of Rotcap Hollow's own, unlocked at biome 3 — plus every earlier biome's spells, inherited)

Spell unlock is cumulative (GAME_DESIGN §4): a Rotcap Hollow caster can roll any biome-1 or
biome-2 spell (see `.claude/content/overgrowth.md` and `.claude/content/glimmerdark.md`) in
addition to the 5 spells below, which unlock starting at biome 3. One per affinity, each
introducing something the earlier pool doesn't already have.

| Spell | Affinity | Description |
|---|---|---|
| Spore Cyst | Wit | A single-target hit dealing damage equal to **90% of the caster's Intelligence**, and infects the target with Spore for **3 turns** — the first spell to apply Spore. |
| Rasping Chant | Endurance | Permanently lowers a single enemy's Defence to **80%** of its current value, for the rest of the fight. |
| Puppet String | Instinct | A single-target hit dealing damage equal to **80% of the caster's Intelligence**, and Confuses the target for **3 turns** — the first spell to apply Confusion. |
| Charnel Feast | Vitality | Heals every ally for **25% of the caster's maximum HP** — the game's first Vitality AOE spell; every earlier Vitality heal was single-target. |
| Withering Bolt | Violence | A single-target hit dealing damage equal to **85% of the caster's Intelligence**, and Burns the target for **3 turns** — the first spell to apply Burn (Sporch's Igniter was, until now, the only producer). |

Charnel Feast can be cast on the caster's own side and hits every living ally at once.
