# Specialization — Shieldbarer

Read this when a slice touches the Shieldbarer's starter or perks.

Source: the perks in `src/data/specializations.ts`; the starter in `src/data/species/starters.ts`
and `src/data/traits/starters.ts`. The rules every spec follows (perk points, the 1000-point tree,
refunds, inert perks): `spec/progression.md` "Perks", "Perk points" and "Spending perk
points".

## Identity

The **protector and provoke-tank**: draw fire, survive it, punish attackers, and turn Defence into
offence. All content stays reachable by every spec.

## Starter: Stonehorn Warden

Endurance, high Defence, Attack 15; the name is a placeholder. Whenever it provokes, **your
creatures gain +35% Defence** for the rest of the fight, so repeated provokes stack into a ramping
team-Defence engine. It runs the **warden** role script (provoke when an ally drops below 50%, else
attack); its damage after floor 10 comes from perks.

## Perks

Ten perks; at max levels they cost exactly 1000 points.

### Bulwark

1 level × 100 points. −5% damage taken (cap 80%) for each time the creature has Defended this
battle.

### Shield up

1 level × 100 points. On provoke, the creature also defends.

### Armor piercer

25 levels × 4 points. Attacks and spells ignore 1% of the enemy's Defence per level.

### Shield Specialist

100 levels × 1 point. +1% benefit per level from equipment Stat Slots that increase Defence. Inert: it
needs Phase 8's equipment system.

### Thorns

1 level × 100 points. After taking damage from an attack or spell, deals damage to that enemy
equal to 15% of the creature's Defence, as indirect damage (a fifth of the enemy's Defence
applies).

**Known bug:** `main` answers any damage that has a source, trait and perk hits and other
retaliations included (never a damage-over-time tick). The fix is listed in `ROADMAP.md` Phase 4.5
"Decided, not built".

### Shield Bash

10 levels × 10 points. Attacks and spells deal additional damage equal to 3% of the creature's
Defence per level.

### Lucidity

1 level × 100 points. Immune to the *effect* of Confused: it still lands and still counts as
Confused for any "target is Confused" payoff, but the creature ignores the chaos.

### Last Stand

1 level × 100 points. When taking more than 1 damage that would kill the creature, 50% chance to
be left at 1 HP.

**Known bug:** `main` rolls on any lethal damage, so a creature left at 1 HP rolls again on a
1-damage hit. The fix is listed in `ROADMAP.md` Phase 4.5 "Decided, not built".

### Phalanx

1 level × 100 points. Your creatures start each battle defending.

### Defensive Stance

10 levels × 10 points. On defend, +1% Defence per level.
