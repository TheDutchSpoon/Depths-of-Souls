# Specialization — Shieldbarer

**Identity:** the **protector / provoke-tank** — draw fire, survive it, punish attackers, and turn
Defence into offence. (Contrast: Sorcerer = affinity-flexible caster, Brute = raw Attack.) All
content stays reachable by every spec.

**Starter:** high Defence. Trait: `on-provoke → your creatures gain +35% Defence` (team-wide).
*(Permanent-for-fight, so repeated provokes stack — a ramping team-Defence engine. Balance parked.)*

**Perk rules:** effect-framework effect-carriers, combat-only; flat pool; spec valid iff
Σ(maxLevel × costPerLevel) === **1000**.

## Perks (10 — sums to 1000)

| Perk | Max lvl | Cost/lvl | Total | Effect | Phase |
|---|--:|--:|--:|---|---|
| **Bulwark** | 1 | 100 | 100 | −5% damage taken (cap 80%) for each time the creature has Defended this battle. | P4 ✓ |
| **Shield up** | 1 | 100 | 100 | On provoke, the creature also defends. | P4 ✓ |
| **Armor piercer** | 25 | 4 | 100 | Attacks and spells ignore 1% of the enemy's Defence per level. | P4 ✓ |
| **Shield Specialist** | 100 | 1 | 100 | +1% benefit per level from equipment Stat Slots that increase Defence. | P8 |
| **Thorns** | 1 | 100 | 100 | After taking damage from an attack or spell, deal damage to that enemy equal to 15% of the creature's Defence. | P4 ✓ |
| **Shield Bash** | 10 | 10 | 100 | Attacks and spells deal additional damage equal to 3% of the creature's Defence per level. | P4 ✓ |
| **Lucidity** | 1 | 100 | 100 | Immune to the *effect* of Confused (still applied; suppress-effect principle). | P4 ✓ |
| **Last Stand** | 1 | 100 | 100 | When taking >1 damage that would kill the creature, 50% chance to be left at 1 HP. | P4 ✓ |
| **Phalanx** | 1 | 100 | 100 | Your creatures start each battle defending. | P4 ✓ |
| **Defensive Stance** | 10 | 10 | 100 | On defend, +1% Defence per level. | P4 ✓ |
| | | | **1000** | | |

## Phase notes
Almost entirely **Phase-4-functional** (a rich seed spec). Only **Shield Specialist** waits for P8
(equipment system). Everything else is live combat.

## New mechanics this spec introduces (for the Phase-4 manifest)
- **Trait/response `scalingStat`** — deal-damage responses gain a scaling-stat (default **Attack**,
  can be **Defence** / etc.) — the mirror of spells' `scalingStat`. **General capability**, built
  now (un-defers the parked "traits may scale off a stat" item): needed by **Thorns** & **Shield
  Bash** (Defence), Brute's **Aggressive Caster** (Attack→spell), and roster **Shellbacks**.
- **Armor penetration** — a damage-calc parameter: ignore X% of the target's Defence (Armor piercer;
  shared with any future pen effect).
- **Cheat-death (Last Stand)** — lethal-hit interception → RNG roll → survive at 1 HP. New, bespoke;
  consumes combat RNG.
- **Defend-count tracker (Bulwark)** — per-creature "times Defended this fight" counter its
  mitigation reads (same class as Glow/Momentum stacks).
- **Lucidity** — Confused immunity, via the **suppress-effect-not-application** principle (Confused
  still lands + still counts for "target is Confused" payoffs; the creature just ignores the chaos).
- Reuses: Defence/Health stat-mods, grant-action-state (Shield up, Phalanx), `on-defend`,
  `on-provoke`, `on-fight-start`, `on-damage-taken` retaliate.

## Cross-spec pattern (all three specs)
Each spec has **one control-immunity** to an enemy-applied status — **Clear Mind** (Silenced) /
**Aggressive** (Pacified) / **Lucidity** (Confused) — all enemy-applied via generated loadouts, so
all three earn their keep in single-player. A clean recurring archetype.
