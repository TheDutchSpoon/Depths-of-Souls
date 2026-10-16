# Specialization — Shieldbarer

Read this when a slice touches the Shieldbarer's starter or perks.

Source: the perks in `src/data/specializations.ts`; the starter in `src/data/species/starters.ts`
and `src/data/traits/starters.ts`. The rules every spec follows (perk points, the 1000-point tree,
refunds, inert perks): `spec/progression.md#perks`, `spec/progression.md#perk-points` and `spec/progression.md#spending-perk-points`.
Each perk's and the starter trait's `description` in `src/data` is transcribed from its entry
here; a change to its numbers updates both in the same change.

## Identity

The **protector and provoke-tank**: draw fire, survive it, punish attackers, and turn Defence into
offence. All content stays reachable by every spec. Its wording follows the trigger words
(`content/overgrowth.md#trigger-words`).

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

**Known bug:** the creature only takes the defending stance; it doesn't Defend, so Bulwark and
Defensive Stance don't count it (fix: `phases/4.6/brief.md#granted-defends-are-real-defends`).

### Armor piercer

25 levels × 4 points. Your creatures' damage ignores 1% of the target's Defence per level.

### Shield Specialist

100 levels × 1 point. +1% benefit per level from equipment Stat Slots that increase Defence. Inert: it
needs Phase 8's equipment system.

### Thorns

1 level × 100 points. Whenever an attack or spell hits the creature, it deals damage equal to 15%
of its Defence to the creature that hit it.

### Shield Bash

10 levels × 10 points. Attacks and spells deal additional damage equal to 3% of the creature's
Defence per level.

### Lucidity

1 level × 100 points. Immune to the *effect* of Confused: it still lands and still counts as
Confused for any "target is Confused" payoff, but the creature ignores the chaos.

### Last Stand

1 level × 100 points. When taking damage that would kill the creature, 50% chance to be left at 1
HP. It doesn't roll while the creature is at 1 HP; healed above 1 HP, it rolls again.

### Phalanx

1 level × 100 points. Your creatures start each battle defending.

**Known bug:** they only take the defending stance; they don't Defend, so Bulwark and Defensive
Stance don't count it (fix: `phases/4.6/brief.md#granted-defends-are-real-defends`).

### Defensive Stance

10 levels × 10 points. On defend, +1% Defence per level.
