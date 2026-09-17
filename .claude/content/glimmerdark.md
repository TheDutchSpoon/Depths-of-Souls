# Glimmerdark (Biome 2, floors 11–20) — content reference

Status: shipped — Phase 4 Slice H2, revised per PR #60 design review; spell list revised again by
the Phase 4 interstitial slice (cumulative spell unlock, between H2 and H3). Source: creature/
species composition in `src/data/species/glimmerdark.ts`; trait definitions in
`src/data/traits/glimmerdark.ts`; spell definitions in `src/data/spells/glimmerdark.ts`;
Glow/grant-act-first in `src/data/statuses.ts`. Design source:
`.claude/species/species-locked.md`'s Biome 2 table.

**Spell unlock is now cumulative** (GAME_DESIGN §4): every biome-1 spell (The Overgrowth's own
11, plus the 3 shared "core" spells) stays available to any affinity-matched caster at Glimmerdark
and every deeper biome. Glimmerdark originally shipped 10 of its own spells (two per affinity,
mirroring Overgrowth's density); 8 turned out to be exact mechanical reskins of an Overgrowth
spell and a 9th (Glowspark Bolt) was a near-dup of Arcane Bolt — all 9 are **deleted**. Only
**Beacon Charge** was genuinely Glimmerdark's own; **five** new spells (**Overcharge**,
**Disorient**, **Blinding Flare**, **Afterglow**, **Luminous Tide**) join it below. See "Spells"
for the current list.

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
| Detonator | Instinct | Payoff | When this creature attacks, it first consumes all of its own Glow stacks in one burst of bonus damage against the creature it's attacking — **its own Intelligence, multiplied by how many stacks it had** (e.g. 3 stacks = one hit worth 3x Intelligence, not three separate hits). Its normal attack then lands on top, as usual. With no Glow stacked, nothing extra happens. |
| Radiant | Vitality | Amplifier | At the start of the fight, this creature charges its **entire team** with 2 stacks of Glow at once — a one-time, team-wide jolt, unlike Charger's repeating single-target trickle. |

## Blindclaws (Instinct) — Ambush via Turn Order

| Creature | Affinity | Role | Description |
|---|---|---|---|
| Setter | Instinct | Enabler | At the start of its own turn, this creature grants Grant Act First to whichever living ally (including itself) has the highest Attack. |
| Striker | Instinct | Payoff | Deals **35% more damage** with its attacks whenever it would act *before* the enemy it's attacking this round (from its own Speed, or a grant from Setter/Vanguard) — a real, permanent-feeling passive bonus, not a change in *what* it does. (Revised from an earlier draft that made this an attack-or-Defend behavior choice — action-selection belongs to scripting/AI, never to a creature's own identity.) |
| Vanguard | Instinct | Amplifier | At the start of every one of its own turns, this creature re-grants itself Grant Act First — it never needs Setter's help; it's always at the front of the next round's turn order. |

## Resonants (Wit) — Caster Synergy

All three react whenever a living ally (including themselves) casts a spell.

| Creature | Affinity | Role | Description |
|---|---|---|---|
| Chorus | Wit | — | Whenever an ally casts a spell, this creature's Attack permanently increases by **5%**. The biome's only spellcaster. |
| Adept | Wit | — | Whenever an ally casts a spell, this creature's Intelligence permanently increases by **8%**. |
| Overtone | Wit | Amplifier | Whenever an ally casts a spell, there's a **10% chance** the caster immediately casts again — a random one of its own equipped spells (possibly the same one), at a random valid target. If that echoed cast is itself observed by an ally (Chorus, Adept, even Overtone again), it reacts too, and the echo can chain into another echo. Only one Overtone-granted echo can happen per cast, no matter how many Overtones are on the field. |

## Sparkeaters (Wit/Violence) — Stat Parasites

A flat family identity — every creature permanently drains a stat from whatever it attacks. Each
one's affinity now matches the stat it steals.

| Creature | Affinity | Role | Description |
|---|---|---|---|
| Leech | Violence | — | When this creature attacks, it permanently drains **10% Attack** from its target into itself. |
| Gorger | Endurance | — | The same, draining **10% Defence** instead. |
| Voidmaw | Vitality | Amplifier | A different kind of parasite — every attack, it permanently drains **10% of its target's maximum HP** (which also immediately clamps that target's current HP down if it's above the new max) and raises **every living ally's maximum HP (including its own) by 5%** (a ceiling raise only — it doesn't heal anyone, it just grows how much the team can hold going forward). |

## Gloomjaws (Violence) — Execute the Weak

Three distinct verbs toward the same theme, not one shared mechanic repeated at bigger numbers.

| Creature | Affinity | Role | Description |
|---|---|---|---|
| Stalker | Violence | Finisher | Deals **30% more damage** to enemies below 30% HP. |
| Executioner | Violence | Snowball | Every kill permanently raises its own Attack by **15%** for the rest of the fight — it doesn't need a weak target to pay off, it needs kills, and it keeps hitting harder the more of them it gets. |
| Ravager | Violence | Armor-breaker | Permanently ignores **30%** of every target's Defence, unconditionally — it doesn't hit low-HP targets harder, it gets every target *into* low-HP range faster by punching straight through their armor. |

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

## Spells (6 of Glimmerdark's own, unlocked at biome 2 — plus every biome-1 spell, inherited)

Spell unlock is cumulative (GAME_DESIGN §4): a Glimmerdark caster can roll ANY biome-1 spell
(The Overgrowth's 11 + the 3 shared "core" spells — see `.claude/content/overgrowth.md` and
`src/data/spells/core.ts`) in addition to the 6 spells below, which unlock starting at biome 2.
Glimmerdark deliberately does not re-author a full per-affinity kit — the inherited biome-1 base
already covers every affinity; these are spice on top of it, not a replacement kit (per GAME_DESIGN §4's ≥4–5-own-spells-per-biome bar).

| Spell | Affinity | Description |
|---|---|---|
| Beacon Charge | Wit | Heals a single ally for **30% of the caster's effective Health**, and charges that ally with a stack of Glow. |
| Overcharge | Wit | Heals a single ally for **15% of the caster's effective Health** (half of Beacon Charge's heal), and charges that ally with **2 stacks** of Glow at once (double Beacon Charge's one). |
| Disorient | Instinct | A single-target hit dealing damage equal to **85% of the caster's Intelligence**, and applies Web (act-last) to the target for **3 turns** — the same status Overgrowth's Vine Snare applies, reused rather than re-authored under a new name. |
| Blinding Flare | Violence | A single-target hit dealing damage equal to **70% of the caster's Intelligence**, and leaves the target **Vulnerable** (takes ×1.5 damage) for **3 turns** — a light-burst setup debuff; no other spell applies Vulnerability. |
| Afterglow | Vitality | Heals a single ally for **50% of the caster's effective Health**, and grants **Regen** (heals a further 4 HP at the end of each round) for **3 turns** — a lingering-light sustain heal, distinct from Regrowth's plain burst. |
| Luminous Tide | Wit | Heals **every ally** for **20% of the caster's effective Health** and charges each with a stack of **Glow** — a party-wide wave of light; the game's first AOE support spell. |

Every ally-targeting entry above (Beacon Charge, Overcharge, Afterglow, Luminous Tide) can be
cast on any living ally, including the caster itself; Luminous Tide hits the whole ally side at
once.

**Deleted (Phase 4 interstitial slice):** Crystal Shard, Fracture Strike, and Glowspark Bolt
(Violence/Wit), Stoneshell Bash and Bastion Chant (Endurance), Echo Fang and Pack Howl
(Instinct), Bioglow Mend and Luminous Vigor (Vitality) — 8 were exact mechanical reskins of an
Overgrowth spell (same affinity/shape/numbers, different name) and Glowspark Bolt was a near-dup
of Arcane Bolt. All 9 are inherited from Overgrowth (or, for the near-dup, functionally replaced
by it) now that unlock is cumulative — re-authoring them here was always redundant.
