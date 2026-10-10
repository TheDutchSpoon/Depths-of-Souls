# Enemy behaviour — roles, gem sets and boss floors

Read this when a slice touches role scripts, enemy gem sets or boss floors.

Source: the role scripts in `src/data/scripts.ts`; every creature's role (`defaultScriptId`) in
`src/data/species/*.ts`; the gem-set roll and the boss fill in `src/engine/generation.ts`. The rules
behind them are in `spec/scripting.md` "Role scripts" and `spec/run.md` "Boss floors"; each
biome doc gives its creatures' roles. This is the player-facing reference: where it disagrees with
the source, the source is right.

## Roles

### Role scripts

Every creature fights by a **role**, a short list of rules it checks **in order, top first**; the
first rule it can actually carry out wins. These are the same kind of script a player writes, so
enemies are readable and their patterns can be learned. Your own creatures run their role too,
unless they're given a script of their own.

| Role | What it does, top rule first |
|---|---|
| **Striker** | 1. If any enemy is below 80% HP, attack the weakest enemy. 2. Otherwise attack a random enemy. 3. If it can't attack, cast a random gem. |
| **Guardian** | 1. If its own HP is below 50%, Defend. 2. Otherwise attack the weakest enemy. 3. If it can't attack, cast a random gem. |
| **Warden** | 1. If its weakest ally (itself included) is below 50% HP, Provoke, drawing hits onto itself. 2. Otherwise attack the weakest enemy. 3. If it can't attack, cast a random gem. |
| **Caster** | 1. Cast a random gem. 2. If it can't cast (Silenced, or nothing castable), attack the weakest enemy. |
| **Support** | 1. If its weakest ally is below 50% HP, cast a random gem **that targets allies** (a heal or a buff). 2. Otherwise attack the weakest enemy. 3. If it can't attack, cast a random gem. |
| **Opener** | 1. On round 1, cast a random gem. 2. Afterwards attack the weakest enemy. 3. If it can't attack, cast a random gem. |
| **Taunter** | 1. Provoke, every turn. 2. and 3. as the others (never reached: Provoke is always possible). For a creature whose trait fires on Provoke (the Snapjaw Lure). |

### Cast a random gem

"Cast a random gem" picks evenly among the creature's gems that can be cast right now (a spell in
the slot, and a valid target on the side the spell is meant for). The spell's target is the usual
default: the weakest enemy for an enemy-side spell, the weakest ally for an ally-side one.

### A lock downgrades a turn

Every role ends in a fallback that runs only when the rule above it is impossible, so a lock
**downgrades a turn instead of emptying it**:

- A **Silenced** caster can't cast, so it attacks.
- A **Pacified** striker, guardian, warden, support or opener can't attack, so it **casts a random
  gem** (if it has one) instead of waiting.

Because Pacified stops only attacks, anything that triggers on an attack (such as the Leech
Sovereign's stat steal) doesn't fire on a turn spent casting.

### Cast roles

Caster, support and opener are the **cast roles**: creatures built to cast. A cast role always has
a spell to roll: the game refuses to generate one whose affinity has no spell at its depth, and a
data test guards it.

### Known limit: no "target lacks status" check

Scripts can't ask "does my target already have this status?", so casters refresh statuses they
have already applied.

## Starters and the Unicorn

| Creature | Role |
|---|---|
| Glyphmoth Seer (Sorcerer starter) | caster |
| Cragfang Mauler (Brute starter) | striker |
| Stonehorn Warden (Shieldbarer starter) | warden |
| Unicorn Lightbearer | striker (its revive fires on attack) |

## Gem sets

### Three different spells per enemy

Every enemy rolls a **full set of three different spells** of its own affinity, from every spell
unlocked at its biome or earlier, whatever its role: a striker's gems are what it casts when it is
Pacified. The three are picked one at a time, each from what is left, so they never repeat; only a
pool smaller than three (none exists) could repeat a spell. Bosses roll a full set too. Life Siphon
is Vitality's only damage spell, no Vitality creature is a caster or opener, and a support's first
rule casts only gems that target allies, so an enemy casts Life Siphon only on a turn it can't
attack.

### Three biome-1 spells per affinity

Every affinity has **at least three biome-1 spells**, so any enemy can fill its set from the first
biome on; a data test guards it.

## Boss floors

A boss floor is one 6v6 fight: the boss, then its **authored adds** (the creatures its fight
needs), then random creatures from the biome's own pool, never the boss's own species, rerolled on
every visit, with ordinary kill rewards. A boss has no immunity to control: a lock downgrades its
turn like any enemy's. The rules, and why, are in `spec/run.md` "Boss floors".

| Boss | Role | Authored adds | Fill |
|---|---|---|---|
| Broodmother (floor 10) | striker | Spider Weaver, Spider Ambusher | 3 from the Overgrowth, not Spiders |
| Leech Sovereign (floor 20) | striker | none | 5 from Glimmerdark |
| Rot Sovereign (floor 30) | warden | Sporecloud Seeder, Rotfeeder Scavenger | 3 from Rotcap Hollow |
