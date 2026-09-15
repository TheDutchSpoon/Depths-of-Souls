# Glimmerdark (Biome 2, floors 11–20) — content reference

Status: shipped — Phase 4 Slice H2. Source: creature/species composition in
`src/data/species/glimmerdark.ts`; trait definitions in `src/data/traits/glimmerdark.ts`; spell
definitions in `src/data/spells/glimmerdark.ts`; Glow/grant-act-first in `src/data/statuses.ts`;
the `ambush-strike` script in `src/data/scripts.ts`. Design source:
`.claude/species/species-locked.md`'s Biome 2 table.

This doc is the **player-facing reference** — every trait and spell below is written as a single,
literal description of what it does, exact numbers included, in the phrasing style a future
in-game tooltip would use. If a number here ever disagrees with the source file, the source file
is correct and this doc is stale — update it in the same change that changes a number.

## Reading this biome

Most species follow the same common/uncommon/rare roles as The Overgrowth — enabler sets a trick
up, payoff benefits from it, amplifier does its own distinct thing. Two species here don't have a
two-role trick to chain off (**Resonants**, **Gloomjaws**) — all three of their creatures share
the *same* mechanic instead, just at a bigger scope or a bigger number as rarity rises.

## Statuses

**Glow** — A stacking resource. While a creature holds Glow, it deals **8% more damage per
stack** (up to 5 stacks, +40%). Lasts up to **4 turns** unless consumed first.

**Grant Act First** — The turn-order twin of Web (The Overgrowth): a creature with this lands at
the *front* of the round's turn order instead of the back. Lasts up to **3 turns**.

## Glowflies (Wit/Instinct) — Charge & Release

| Creature | Affinity | Role | Description |
|---|---|---|---|
| Charger | Wit | Enabler | At the start of its own turn, this creature applies a stack of Glow to whichever living ally (including itself) has the highest Attack. |
| Detonator | Instinct | Payoff | When this creature attacks, it first consumes all of its own Glow stacks and deals bonus damage equal to **its own Intelligence, once per consumed stack**, to the creature it's attacking — then its normal attack lands as usual. With no Glow stacked, nothing extra happens. |
| Radiant | Vitality | Amplifier | At the start of the fight, this creature charges its **entire team** with 2 stacks of Glow at once — a one-time, team-wide jolt, unlike Charger's repeating single-target trickle. |

## Blindclaws (Instinct) — Ambush via Turn Order

| Creature | Affinity | Role | Description |
|---|---|---|---|
| Setter | Instinct | Enabler | At the start of its own turn, this creature grants Grant Act First to whichever living ally (including itself) has the highest Attack. |
| Striker | Instinct | Payoff | This creature only attacks when it would act *before* its target this round (whether from its own Speed or a grant from Setter/Vanguard) — otherwise it holds position and Defends instead. Its Attack also gets a bonus equal to **20% of its own effective Speed**. |
| Vanguard | Instinct | Amplifier | At the start of every one of its own turns, this creature re-grants itself Grant Act First — it never needs Setter's help; it's always at the front of the next round's turn order. |

## Resonants (Wit) — Caster Synergy

All three share the same reaction — whenever a living ally (including themselves) casts a spell,
they react. Escalates by rarity instead of chaining an enabler/payoff.

| Creature | Affinity | Role | Description |
|---|---|---|---|
| Chorus | Wit | — | Whenever an ally casts a spell, this creature's Attack permanently increases by **5%**. The biome's only spellcaster. |
| Adept | Wit | — | Whenever an ally casts a spell, this creature's Intelligence permanently increases by **8%**. |
| Overtone | Wit | — | Whenever an ally casts a spell, this creature's Attack **and** Intelligence both permanently increase by **5%** each. |

## Sparkeaters (Wit/Violence) — Stat Parasites

A flat family identity — every creature permanently drains a stat from whatever it attacks into
itself. No enabler/payoff chain; the amplifier drains more stats, not a bigger single steal.

| Creature | Affinity | Role | Description |
|---|---|---|---|
| Leech | Wit | — | When this creature attacks, it permanently drains **10% Attack** from its target into itself. |
| Gorger | Violence | — | The same, draining **10% Defence** instead. |
| Voidmaw | Vitality | — | Drains **both** 10% Attack and 10% Defence from its target into itself in the same hit. |

## Gloomjaws (Violence) — Execute the Weak

All three share the same mechanic — bonus damage against a low-HP target — at an escalating
threshold and magnitude.

| Creature | Affinity | Role | Description |
|---|---|---|---|
| Stalker | Violence | — | Deals **30% more damage** to enemies below 30% HP. |
| Executioner | Violence | — | Deals **50% more damage** to enemies below 20% HP. |
| Ravager | Violence | — | Deals **70% more damage** to enemies below 15% HP, and permanently ignores **20%** of every target's Defence outright — it doesn't just hit low-HP targets harder, it gets through armor to put them there faster. |

## Shellbacks (Endurance) — Armor as Weapon

| Creature | Affinity | Role | Description |
|---|---|---|---|
| Warden | Endurance | Enabler | Every time this creature's own turn starts, it permanently raises the whole team's Defence by **10%** — this repeats every round it acts, compounding over time. |
| Brawler | Endurance | Payoff | This creature's Attack action reads its own **Defence** instead of Attack entirely — its armor *is* its weapon. |
| Bulwark | Endurance | Amplifier | Whenever this creature takes damage, it strikes back for **50% of its own Defence** — the defensive mirror of Brawler's offensive trick. |

## The Leech Sovereign (floor-20 boss)

Instinct affinity. A unique, non-collectable set-piece fight — not a spawn-pool creature. A lean
fight with one mechanic, no adds.

- Every time the Sovereign attacks, it permanently steals **20% of its target's Attack** into its
  own — the target's Attack falls by 20%, the Sovereign's own rises by 20%. This stacks every hit:
  the party hollows out while the Sovereign snowballs, so the fight is a race to burst it down
  before the steal compounds too far.

## Spells (10, two per affinity)

Same power convention as The Overgrowth: a single-target damage-only spell deals around **100%**
of the caster's Intelligence; one that also applies a status or other upside pulls back to roughly
**80–90%** (single-target) or **30–40%** (AOE). No affinity here carries two plain damage spells.

| Spell | Affinity | Description |
|---|---|---|
| Crystal Shard | Violence | A single-target hit dealing damage equal to **100% of the caster's Intelligence**. |
| Fracture Strike | Violence | Permanently lowers a single enemy's Defence by **20%** for the rest of the fight. |
| Glowspark Bolt | Wit | A single-target hit dealing damage equal to **100% of the caster's Intelligence**. |
| Beacon Charge | Wit | Heals a single ally for **30% of the caster's effective Health**, and charges that ally with a stack of Glow. |
| Stoneshell Bash | Endurance | A single-target hit dealing damage equal to **100% of the caster's own Defence** (instead of Intelligence). |
| Bastion Chant | Endurance | Permanently raises the whole team's Defence by **20%** for the rest of the fight. |
| Echo Fang | Instinct | A single-target hit dealing damage equal to **100% of the caster's Intelligence**. |
| Pack Howl | Instinct | Permanently raises the whole team's Speed by **10%** for the rest of the fight. |
| Bioglow Mend | Vitality | Heals a single ally for an amount equal to **30% of the caster's own effective Health**. |
| Luminous Vigor | Vitality | Permanently raises a single ally's Attack by **15%** for the rest of the fight. |

Every ally-targeting entry above (Beacon Charge, Bastion Chant, Pack Howl, Bioglow Mend, Luminous
Vigor) can be cast on any living ally, including the caster itself.
