# Glimmerdark (Biome 2, floors 11–20) — content reference

Status: shipped — Phase 4 Slice H2, revised per PR #60 design review; spell list revised again by
the Phase 4 interstitial slice (cumulative spell unlock, between H2 and H3); Phase 4.1 changes
decided (see the last section); Phase 4.1-G1 added the roles and the 6v6 boss floor; Phase 4.1-H2b1
replaced the Glowflies with the Flickerlings and deleted Glow. Source: creature/species composition in
`src/data/species/glimmerdark.ts`; trait definitions in `src/data/traits/glimmerdark.ts`; spell
definitions in `src/data/spells/glimmerdark.ts`; Grant Act First in `src/data/statuses.ts`. Design source:
`.claude/species/species-locked.md`'s Biome 2 table.

**Spell unlock is now cumulative** (GAME_DESIGN §4): every biome-1 spell (The Overgrowth's own
16, plus the 3 shared "core" spells) stays available to any affinity-matched caster at Glimmerdark
and every deeper biome. Glimmerdark originally shipped 10 of its own spells (two per affinity,
mirroring Overgrowth's density); 8 turned out to be exact mechanical reskins of an Overgrowth
spell and a 9th (Glowspark Bolt) was a near-dup of Arcane Bolt — all 9 are **deleted**. Only
**Beacon Charge** was genuinely Glimmerdark's own; four new spells (**Disorient**, **Blinding Flare**,
**Afterglow**, **Kindred Light**) join it below (a fifth, Overcharge, was deleted with Glow in 4.1-H2b1,
and Luminous Tide became Kindred Light). See "Spells" for the current list.

This doc is the **player-facing reference** — every trait and spell below is written as a single,
literal description of what it does, exact numbers included, in the phrasing style a future
in-game tooltip would use. If a number here ever disagrees with the source file, the source file
is correct and this doc is stale — update it in the same change that changes a number.

## Reading this biome

Most species follow the same common/uncommon/rare roles as The Overgrowth — enabler sets a trick
up, payoff benefits from it, amplifier does its own distinct thing. Two species here don't have a
two-role trick to chain off (**Resonants**, **Gloomjaws**) — all three of their creatures share
the *same* mechanic instead, just at a bigger scope or a bigger number as rarity rises.

Affinity spread across the 18 creatures: **4 Wit** (the Flare and the three Resonants), **3 Instinct**
(the Blindclaws), **5 Violence** (the Last Gleam, the Leech, the three Gloomjaws), **4 Endurance** (the
Gorger and the three Shellbacks) and **2 Vitality** (the Wick and the Voidmaw).

**Base stats** sit in the game's design ranges: **Health 20–45**, every other stat **10–30**.
Health was remapped from 10–30 in 4.1-H2c, each creature keeping its place in the range
(GAME_DESIGN §5).

## Statuses

**Grant Act First** — The turn-order twin of Web (The Overgrowth): a creature with this lands at
the *front* of the round's turn order instead of the back. Lasts up to **3 turns**.

## Flickerlings (Vitality/Wit/Violence) — The Flame That Feeds on Itself

Pale cave-dwellers whose glow is their life (names are placeholders). They replaced the Glowflies in
4.1-H2b1. Their Health is on the new 20–45 scale.

| Creature | Affinity | Role | Health / Atk / Int / Def / Spd | Description |
|---|---|---|---|---|
| Wick | Vitality | Enabler | 38 / 10 / 16 / 14 / 16 | At the start of its turn, **only while another living ally is below maximum Health**, this creature burns **10% of its own maximum HP** to heal its lowest-HP **injured** ally **other than itself** for **20% of its own maximum HP**. When every other ally is at full health (or none is left), it neither burns nor heals. The burn is a **cost**: exactly 10% of its maximum HP, whatever its Defence. It can kill the Wick; then no heal follows (Last Stand can still save it, and the heal then proceeds). |
| Flare | Wit | Payoff | 25 / 14 / 22 / 10 / 22 | Whenever an ally damages **itself** (a cost, like the Wick's burn — never an ordinary hit or a damage-over-time tick), **every living ally** permanently gains **15% Speed**. The Flare counts itself as an ally. Two Flares both react, so their bonuses multiply. |
| Last Gleam | Violence | Amplifier | 28 / 24 / 10 / 14 / 18 | Whenever an ally dies, **every living ally** permanently gains **20% Attack**. It does not react to its own death. Two Last Gleams both react, so their bonuses multiply. |

The Flare is the first trait to watch **damage** rather than actions (CONVENTIONS, "Damage
observation"). Order on a lethal burn: the burn's damage, then the Flare's reaction, then the Wick's
death, then the Last Gleam's reaction.

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
| Chorus | Wit | — | Whenever an ally casts a spell, this creature's Attack permanently increases by **5%**. |
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
| Bulwark | Endurance | Amplifier | Whenever this creature takes damage, it strikes back for **50% of its own Defence** — the defensive mirror of Brawler's offensive trick. The strike-back is **indirect damage**: only a fifth of the target's Defence applies to it, and it gets no chip floor and no Additional. |

## How each creature plays (roles)

Every creature fights by a **role**: a short list of rules it follows in order, top first (see
`.claude/content/enemy-behaviour.md` for what each role does). Every enemy also carries **three
different spells** of its own affinity.

| Creature | Role | Creature | Role |
|---|---|---|---|
| Flickerling Wick | support | Sparkeater Leech | striker |
| Flickerling Flare | caster | Sparkeater Gorger | striker |
| Flickerling Last Gleam | striker | Sparkeater Voidmaw | striker |
| Blindclaws Setter | opener | Gloomjaw Stalker | opener |
| Blindclaws Striker | striker | Gloomjaw Executioner | striker |
| Blindclaws Vanguard | striker | Gloomjaw Ravager | striker |
| Resonant Chorus | caster | Shellback Warden | warden |
| Resonant Adept | caster | Shellback Brawler | striker |
| Resonant Overtone | caster | Shellback Bulwark | warden (provoking draws more hits to retaliate against) |
| **Leech Sovereign** (boss) | striker | | |

Resonant Chorus is no longer the biome's only spellcaster: the three Resonants and Flickerling Flare
are casters, Flickerling Wick is a support, and Blindclaws Setter and Gloomjaw Stalker are openers.

## The Leech Sovereign (floor-20 boss)

Instinct affinity. A unique, non-collectable set-piece fight — not a spawn-pool creature. A lean
fight with one mechanic and **no authored adds**: **a boss fight is 6v6, like every fight from
floor 6**, so the rest of her side is five random creatures from Glimmerdark's own pool (never
another Sovereign), rerolled on every visit, with ordinary kill rewards. She plays as a striker and
carries three Instinct spells, so a lock lowers her turn rather than emptying it: a Pacified
Sovereign casts one of her spells instead of waiting (and her stat steal, which fires on attacks,
does not fire that turn).

- Every time the Sovereign attacks, it permanently steals **20% of its target's Attack** into its
  own — the target's Attack falls by 20%, the Sovereign's own rises by 20%. This stacks every hit:
  the party hollows out while the Sovereign snowballs, so the fight is a race to burst it down
  before the steal compounds too far.

## Spells (5 of Glimmerdark's own, unlocked at biome 2 — plus every biome-1 spell, inherited)

Spell unlock is cumulative (GAME_DESIGN §4): a Glimmerdark caster can roll ANY biome-1 spell
(The Overgrowth's 16 + the 3 shared "core" spells — see `.claude/content/overgrowth.md` and
`src/data/spells/core.ts`) in addition to the 5 spells below, which unlock starting at biome 2.
Glimmerdark deliberately does not re-author a full per-affinity kit — the inherited biome-1 base
already covers every affinity; these are spice on top of it, not a replacement kit (per GAME_DESIGN §4's ≥4–5-own-spells-per-biome bar).

| Spell | Affinity | Description |
|---|---|---|
| Beacon Charge | Wit | Heals a single ally for **30% of the caster's effective Health**, and grants that ally **Grant Act First** (the same status Blindclaws' Setter and Vanguard grant) for **3 turns**. |
| Disorient | Instinct | A single-target hit dealing damage equal to **85% of the caster's Intelligence**, and applies Web (act-last) to the target for **3 turns** — the same status Overgrowth's Vine Snare applies, reused rather than re-authored under a new name. |
| Blinding Flare | Violence | A single-target hit dealing damage equal to **70% of the caster's Intelligence**, and leaves the target **Vulnerable** (takes ×1.5 damage, once: re-casting refreshes it, it never compounds) for **3 turns** — a light-burst setup debuff; no other spell applies Vulnerability. |
| Afterglow | Vitality | Heals a single ally for **50% of the caster's effective Health**, and grants **Regen** (heals a further **10% of the caster's Health** at the end of each round, measured when cast) for **3 turns** — a lingering-light sustain heal, distinct from Regrowth's plain burst. Regen never stacks: re-granting it refreshes the timer and keeps the stronger heal. While the caster lives the heal is credited to it, after that to the target. |
| Kindred Light | Wit | Heals **every ally** for **20% of the caster's effective Health** — a party-wide wave of light; the game's first AOE support spell. |

Every ally-targeting entry above (Beacon Charge, Afterglow, Kindred Light) can be
cast on any living ally, including the caster itself; Kindred Light hits the whole ally side at
once.

**Deleted (Phase 4 interstitial slice):** Crystal Shard, Fracture Strike, and Glowspark Bolt
(Violence/Wit), Stoneshell Bash and Bastion Chant (Endurance), Echo Fang and Pack Howl
(Instinct), Bioglow Mend and Luminous Vigor (Vitality) — 8 were exact mechanical reskins of an
Overgrowth spell (same affinity/shape/numbers, different name) and Glowspark Bolt was a near-dup
of Arcane Bolt. All 9 are inherited from Overgrowth (or, for the near-dup, functionally replaced
by it) now that unlock is cumulative — re-authoring them here was always redundant.

## Phase 4.1 — decided changes (pending build)

Decided at the Phase 4 close review and the 4.1-H2 grill (the last items). Each slice PR folds its
part into the sections above when it lands. (4.1-G1 folded in the roles and the casting-role notes.)

**Resonant Overtone's echo timing (4.1-E):** the echo becomes an ordinary "perform an action"
response. The chance, the random gem and the random target are unchanged, but the echoed cast now
happens **after the original cast has fully resolved** (all its hits and effects), instead of in the
middle of it, and it obeys every action rule (a Silenced caster can't echo, and a caster killed
during its own cast, by a retaliation say, loses the echo). The log shows `ActionGranted` instead
of `EchoCastGranted`.

**Status timing (4.1-F):** every status's duration (Grant Act First, the Regen from
Afterglow, the Web from Disorient, the Vulnerability from Blinding Flare) counts the **bearer's own
turns**, counted down at the end of each of its turns. Regen heals **at the end of each of its
bearer's turns** instead of at round end. A status applied during or after its bearer's action
starts counting the next turn; one applied at the start of the bearer's turn, before it acts,
counts that turn.

**Decided at the 4.1-H2 grill** (brief ASSUMPTIONS 110–129): every item has landed and is folded
into the sections above. The Flickerlings, Glow's deletion, Beacon Charge, Kindred Light and the
affinity spread landed in 4.1-H2b1, single-instance Vulnerability and Afterglow's Regen in
4.1-H2b2, and every other creature's Health moved to the 20–45 range in 4.1-H2c ("Reading this
biome"; the Flickerlings were already on it).

**Decided at the 4.1-H2d grill** (brief ASSUMPTION 152): Afterglow's Regen stays at **10% of the
caster's Health**, no longer a placeholder; 4.1-H2d removed the placeholder wording (folded above).
