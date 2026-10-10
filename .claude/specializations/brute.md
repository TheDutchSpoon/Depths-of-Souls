# Specialization — Brute

Read this when a slice touches the Brute's starter or perks.

Source: the perks in `src/data/specializations.ts`; the starter in `src/data/species/starters.ts`
and `src/data/traits/starters.ts`. The rules every spec follows (perk points, the 1000-point tree,
refunds, inert perks): `spec/progression.md` "9. Player specializations".

## Identity

Raw physical **aggression**: Attack power, on-attack triggers and melee-splash force. All content
stays reachable by every spec.

## Starter: Cragfang Mauler

Violence, high Attack; the name is a placeholder. Its **Attack resolves one additional instance**:
it attacks twice at 100%, each a *real attack* firing `on-attack`, at the first one's target (the
default target if that one died). This is an **instance-list** effect, like Flurry, not an
on-attack trigger.

## Perks

Ten perks; at max levels they cost exactly 1000 points.

### Flurry

1 level × 100 points. Your creatures Attack an additional time.

### Might

50 levels × 2 points. +1% Attack per level.

### Brute Force

100 levels × 1 point. +1% damage with attacks per level.

### Aggressive

1 level × 100 points. Your creatures are immune to the *effect* of Pacified: it still lands and
still counts as Pacified, but they attack anyway.

### Proficient Warrior

1 level × 100 points. Your creatures always have **Splashing** (their attacks deal 100% of their
damage to the enemies adjacent to the target) and **Proficient** (+30% benefit from equipment Stat
Slots). Proficient is inert (it needs Phase 8's equipment system); Splashing works now.

### Annihilate

1 level × 100 points. Your creatures' Splashing hits **all** enemies, not just adjacent ones.

### Aggressive Caster

25 levels × 4 points. On a cast, +1% of the caster's Attack per level is added to the spell's
damage. It works whenever a creature casts: casting is spec-agnostic, so it is as thin in the seed
content as casting is for everyone.

### Concussive Blows

25 levels × 4 points. On attack, 1% chance per level to Weaken the target.

### Cull the Weak

50 levels × 2 points. +1% damage to Weakened targets per level.

### Tunnel Vision

1 level × 100 points. Your creatures ignore enemy **Provoke** and choose their target freely.
