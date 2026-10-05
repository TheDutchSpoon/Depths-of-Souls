# Enemy behaviour — roles, gem sets and boss floors (Phase 4.1-G1) — content reference

Status: shipped — Phase 4.1-G1. Source: the role scripts in `src/data/scripts.ts`; every creature's
`defaultScriptId` (its role) in `src/data/species/*.ts`; the three new spells in
`src/data/spells/overgrowth.ts`; the gem-set roll and the boss fill in `src/engine/generation.ts`.
Design source: CONVENTIONS "Role scripts" and "Boss floors", GAME_DESIGN "Milestone bosses". Each
biome's own doc (`overgrowth.md`, `glimmerdark.md`, `rotcap-hollow.md`) lists its creatures' roles.

This doc is the **player-facing reference**: how an enemy decides what to do, in plain words. If a
number or rule here disagrees with the source, the source is correct and this doc is stale.

## Roles

Every creature fights by a **role**, a short list of rules it checks **in order, top first**; the
first rule it can actually carry out wins. These are the same kind of script a player writes for a
creature of their own, so enemies are readable and their patterns can be learned. Your own
creatures default to their role too until you give them a script (summoning and the default-script
rule arrive in 4.1-G2).

| Role | What it does, top rule first |
|---|---|
| **Striker** | 1. If any enemy is below 80% HP, attack the weakest enemy. 2. Otherwise attack a random enemy. 3. If it can't attack, cast a random gem. |
| **Guardian** | 1. If its own HP is below 50%, Defend. 2. Otherwise attack the weakest enemy. 3. If it can't attack, cast a random gem. |
| **Warden** | 1. If its weakest ally (itself included) is below 50% HP, Provoke, drawing hits onto itself. 2. Otherwise attack the weakest enemy. 3. If it can't attack, cast a random gem. |
| **Caster** | 1. Cast a random gem. 2. If it can't cast (Silenced, or nothing castable), attack the weakest enemy. |
| **Support** | 1. If its weakest ally is below 50% HP, cast a random gem **that targets allies** (a heal or a buff). 2. Otherwise attack the weakest enemy. 3. If it can't attack, cast a random gem. |
| **Opener** | 1. On round 1, cast a random gem. 2. Afterwards attack the weakest enemy. 3. If it can't attack, cast a random gem. |
| **Taunter** | 1. Provoke, every turn. 2. and 3. as the others (never reached: Provoke is always possible). For creatures whose trait fires on Provoke (Snapjaw Lure, Stonehorn Warden). |

**"Cast a random gem"** picks evenly among the creature's gems that can be cast right now (it has a
spell in the slot, and a valid target on the side the spell is meant for). The spell's target is the
usual default: the weakest enemy for an enemy-side spell, the weakest ally for an ally-side one.

**Why every role ends the same way.** The last rule is a fallback that only runs when the rule above
it is impossible. In practice that means a **lock downgrades a turn instead of emptying it**:

- A **Silenced** caster can't cast, so it attacks.
- A **Pacified** striker, guardian, warden, support or opener can't attack, so it **casts a random
  gem** (if it has one) instead of waiting.

Because Pacified only stops attacks, anything that triggers on an attack (such as the Leech
Sovereign's stat steal) doesn't fire on a turn spent casting.

**Cast roles.** Caster, support and opener are the **cast roles**: creatures built to cast. A cast
role always has a spell to roll; the game refuses to generate one whose affinity has no spell at its
depth (a data test guards it).

**Known limit.** Scripts can't yet ask "does my target already have this status?", so casters refresh
statuses they have already applied.

## Starters and the Unicorn

| Creature | Role |
|---|---|
| Glyphmoth Seer (Sorcerer starter) | caster |
| Cragfang Mauler (Brute starter) | striker |
| Stonehorn Warden (Shieldbarer starter) | taunter |
| Unicorn Lightbearer | striker (its revive fires on attack) |

## Gem sets

Every enemy rolls a **full set of three different spells** of its own affinity, from every spell
unlocked at its biome or earlier, whatever its role: a striker's gems are what it casts when it is
Pacified. The three are picked one at a time, each from what is left, so they never repeat. Only a
pool smaller than three (none exists today) can repeat a spell. Bosses roll a full set too.

Every affinity has **at least three biome-1 spells**, so any enemy can fill its set from the first
biome on.

## The three new spells (Phase 4.1-G1; placeholder numbers, tuned in 4.1-H)

| Spell | Affinity | What it does |
|---|---|---|
| **Pounce** | Instinct | A single-target hit for **100% of the caster's own Speed** (it scales off Speed, not Intelligence), through the normal damage formula. |
| **Stifling Weight** | Endurance | Weakens a single enemy (-20% damage dealt) for 3 turns. No damage. |
| **Life Siphon** | Vitality | A single-target hit for **70% of the caster's Intelligence**, and heals the caster for **35% of its Intelligence**. |

## Boss floors are 6v6

A boss floor is one fight with a **full side of six**, like every fight from floor 6. The boss comes
first, then the creatures its fight needs (its **authored adds**: the Broodmother's two spiderlings,
the Rot Sovereign's Sporecloud Seeder and Rotfeeder Scavenger, none for the Leech Sovereign). The
remaining slots are **random creatures from the biome's own pool, never the boss's own species**
(so the Broodmother's count-scaling sees only her two spiderlings), picked the way an ordinary fight
picks them, and **rerolled on every visit**. They are ordinary enemies with ordinary kill rewards
(XP, currency and soul percentage).

A boss has **no immunity to control**: it runs its role and holds a full gem set like any enemy, so
a lock lowers its turn rather than emptying it. A lock recast every turn still holds for the whole
fight, and that is the intended price: one of your creatures spends its whole turn on it every
round, against one enemy of six.

| Boss | Role | Authored adds | Fill |
|---|---|---|---|
| Broodmother (floor 10) | striker | Spider Weaver, Spider Ambusher | 3 from the Overgrowth, not Spiders |
| Leech Sovereign (floor 20) | striker | none | 5 from Glimmerdark |
| Rot Sovereign (floor 30) | warden | Sporecloud Seeder, Rotfeeder Scavenger | 3 from Rotcap Hollow |

Boss floors get harder (six enemies where there were one to three); the 4.1-H simulator's check
("no wall before the floor-10 boss") covers it and reports how often bosses are locked.
