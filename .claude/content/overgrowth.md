# The Overgrowth (biome 1, floors 1–10)

Read this when a slice touches The Overgrowth's creatures, statuses, spells or boss, the shared
core spells, or the Unicorn.

Source: species and creatures in `src/data/species/overgrowth.ts`; traits in
`src/data/traits/overgrowth.ts`; spells in `src/data/spells/overgrowth.ts`, the shared core spells
in `src/data/spells/core.ts`; statuses in `src/data/statuses.ts`; the Unicorn in
`src/data/species/starters.ts` and `src/data/traits/starters.ts`. Each description is literal,
exact numbers included, in the style of a future in-game tooltip, and stands on its own. Where it
disagrees with the source, the source is right; a change to a number updates this doc in the same
change.

## Reading this biome

### Enabler, payoff, amplifier

Every species has one closed, self-contained trick, and its three creatures play three roles in it:

- **Common = enabler.** Sets the trick up (applies a status, opens a condition).
- **Uncommon = payoff.** Benefits from the trick once it's set up.
- **Rare = amplifier.** Its own distinct mechanic in the same spirit as its species-mates, never
  just both of their effects stapled together.

### Rarity is not power

A rare creature's total stat budget is about the same as its common and uncommon species-mates'.
Rarity only changes how often it spawns.

### Indirect damage

A trait's hit marked *indirect* follows the indirect damage rule (`spec/combat.md` "Damage
formula"): only a fifth of the target's Defence applies, and it gets no chip floor and no
Additional.

## Statuses

### Web

A Webbed creature acts last in the round. At the end of **every creature's turn** (not only the
Webbed one's), starting with the turn after the one that applied it, the Web has a **10% chance**
to break, so in a full 6v6 fight a Web usually breaks within one round (about 72% of the time). It
never lasts more than **3** of its bearer's turns. Web is deliberately light: the Spiders' reward
is the exploit, not the status.

### Silenced

A Silenced creature can't **cast**, whether it chose the cast or a trait granted it. Its turn is
**not** skipped: its script moves on to the next rule it can carry out, and if none fits it attacks,
so a creature that always casts attacks instead. Lasts **3** of its own turns, counted down at the
end of each; Silencing it again refreshes the 3. Applied by **Silence** (Violence). The Sorcerer
perk **Clear Mind** makes your creatures immune: Silence still lands and still counts as Silenced
for any rule that checks for it, but the creature casts anyway.

### Pacified

A Pacified creature can't **attack**, whether it chose the attack or a trait granted it. Its turn is
not skipped: its script moves on to the next rule it can carry out, and if none fits it waits,
because attacking (the usual fallback) is the locked action. So a creature that always attacks
waits, and one whose script also has a cast rule casts. Lasts **3** of its own turns. Applied by
**Pacify** (Wit). The Brute perk **Aggressive** makes your creatures immune, the same way. Silence
(Violence) and Pacify (Wit) are each affinity's answer to the other's core action.

### Sleep

A Sleeping creature's turn is skipped. The instant it takes any damage it wakes: the waking hit
still lands in full, its bonus against Sleeping targets included (the Lullpollen Reaper's), before
Sleep is removed. A damage-over-time tick wakes it too, and an area hit wakes everyone it hits:
Sleep is a single-punish tool that works against your own damage over time and area spells by
design. Lasts up to **3** of its turns if it is never hit.

### Stun

Skips its bearer's turn (`spec/statuses.md` "Status effects"). No trait or spell in the seed
content applies it.

## Spiders (Wit): trap → exploit

### Spider Weaver

Wit · enabler · caster. At the end of its own turn, applies Web to a random living enemy.

### Spider Ambusher

Wit · payoff · striker. Deals **40% more damage** to Webbed enemies.

### Spider Broodwarden

Instinct · amplifier · striker. When it attacks, it also lands a separate bonus hit of **25% of its
Attack for every enemy currently Webbed** (50% with two, and so on), as indirect damage. It never
applies Web itself; it only benefits from what its species-mates have done.

## Swarmhive (Violence): strength in numbers

### Swarmhive Drone

Violence · enabler · opener. When it dies, it hits a random living enemy for **30% of its Attack**,
as indirect damage.

### Swarmhive Striker

Violence · payoff · striker. At the start of the fight, its Attack permanently rises by **20% for
every living Swarmhive ally, itself included**. The bonus is fixed when the fight starts: allies
joining or dying later don't change it.

### Swarmhive Queen

Endurance · amplifier · warden. At the start of each of its turns, it permanently raises the Attack
of **every living Swarmhive ally, itself included, by 10%**, again every round it acts, so the
bonus compounds over the fight.

## Treants (Vitality/Endurance): a health engine

### Treant Sapling

Vitality · enabler · guardian (self-ramping: it wants to survive, not draw fire). At the end of
every round, its maximum Health permanently rises by **10%**, compounding.

### Treant Elder

Endurance · payoff · warden. At the end of every round, heals its lowest-HP ally for **15% of its
own effective Health**.

### Treant Grovekeep

Vitality · amplifier · warden. At the start of the fight, permanently raises the whole team's
maximum Health by **15%**, once.

## Pollinators (Wit/Vitality): team buffs

### Pollinator Duster

Vitality · enabler · support (it casts its heals and buffs on a wounded ally). At the start of the
fight, permanently raises its whole team's Speed by **25%**.

### Pollinator Beneficiary

Wit · payoff · caster. Its attacks deal additional damage equal to **30% of its own effective
Speed**, so a sped-up team makes it hit harder.

### Pollinator Pollenlord

Wit · amplifier · caster. At the start of each of its turns, permanently raises its whole team's
Speed by **10%**, again every round it acts.

## Snapjaws (Violence/Endurance): bait & punish

### Snapjaw Lure

Endurance · enabler · taunter (its trait fires on Provoke). Whenever it Provokes, it also Defends.

### Snapjaw Jaws

Violence · payoff · striker. Whenever it takes damage, it hits back for **60% of its Attack**, as
indirect damage.

### Snapjaw Ironjaw

Violence · amplifier · striker. At the start of each of its turns, its Defence permanently rises by
**20%**.

## Lullpollen (Wit/Instinct): sleep & punish

### Lullpollen Sleeper

Wit · enabler · striker. When it attacks, it has a **40% chance** to put its target to Sleep.

### Lullpollen Reaper

Instinct · payoff · striker. Deals **50% more damage** to Sleeping enemies.

### Lullpollen Dozer

Instinct · amplifier · striker. When it attacks, it also lands a separate bonus hit of **25% of its
Attack for every enemy currently Sleeping** (50% with two, and so on), as indirect damage. It never
puts anything to Sleep itself; it only benefits from what its species-mates have done.

## Boss

### Broodmother

Wit · striker; floor 10. Unique and non-collectable, never in the spawn pool.

- Whenever she attacks, she also deals bonus damage of **25% of her Attack for every living
  spiderling fighting beside her, herself included**, as indirect damage. It is read fresh on every
  attack, so killing her adds visibly shrinks it.
- At the end of every round, she has a **40% chance** to Web the entire enemy party at once.

Her authored adds are a Spider Weaver and a Spider Ambusher; three random Overgrowth creatures,
never Spiders, fill her side (`content/enemy-behaviour.md` "Boss floors").

## Intro: Unicorn Lightbearer

### Unicorn Lightbearer

Vitality · striker; the name is a placeholder. A unique, permanent party member that joins in the
scripted intro (`spec/run.md` "Flow"); its own species is stubbed and returns with a real roster in
a later biome.

Whenever it attacks, it revives a random dead ally at **20% of that ally's baseline maximum HP**.
It fires once per attack hit, so a creature that attacks more than once (Flurry) revives more than
once; a revive deals no damage, so it can't cascade.

## Spells

### Spell power convention

A single-target damage spell with no other effect deals about **100%** of the caster's
Intelligence; one that also applies a status, about **80–90%**. An area spell with no other effect
would deal about **50%**; one that also applies a status, about **30–40%**. A spell's percentage is
its power coefficient through the normal damage formula (the target's Defence, affinity and every
usual modifier), not a flat amount. An ally spell can target any living ally, the caster included.
Every spell below, the core spells included, unlocks at biome 1 and stays rollable in every deeper
biome (`spec/run.md` "Biome progression").

### Thorn Lash

Violence · single enemy. Deals **100%** of the caster's Intelligence.

### Weakening Bite

Violence · single enemy. Permanently lowers its Defence by **20%** for the rest of the fight.

### Vine Snare

Wit · single enemy. Deals **85%** of the caster's Intelligence and applies Web for **3** turns.

### Pollen Cloud

Wit · every enemy. Puts them to Sleep for **2** turns and deals **no damage**: a control spell,
like Pacify and Silence. Nothing in the cast hits, so the sleepers stay asleep until something else
damages them, and a hit wakes only the creature it lands on.

### Arcane Bolt

Wit · single enemy. Deals **100%** of the caster's Intelligence. Also the Sorcerer starter's innate
spell.

### Root Grasp

Endurance · single enemy. Deals **100%** of the caster's own Defence (instead of Intelligence).

### Bramble Ward

Endurance · whole team. Permanently raises Defence by **20%** for the rest of the fight.

### Regrowth

Vitality · single ally. Heals **30%** of the caster's own effective Health.

### Wild Vigor

Vitality · single ally. Permanently raises Attack by **15%** for the rest of the fight.

### Stinger Swarm

Instinct · single enemy. Deals **100%** of the caster's Intelligence.

### Howling Instinct

Instinct · whole team. Permanently raises Speed by **10%** for the rest of the fight.

### Silence

Violence · single enemy. Silences it for **3** turns: it can't cast. No damage.

### Pacify

Wit · single enemy. Pacifies it for **3** turns: it can't attack. No damage.

### Pounce

Instinct · single enemy. Deals **100%** of the caster's own Speed (instead of Intelligence).

### Stifling Weight

Endurance · single enemy. Weakens it (**−20% damage dealt**) for **3** turns. No damage.

### Life Siphon

Vitality · single enemy. Deals **70%** of the caster's Intelligence and heals the caster for **35%
of its Intelligence**.

## Core spells

Three affinity-generic spells in `src/data/spells/core.ts`, unlocked at biome 1 like the rest.

### Ember Lance

Violence · single enemy. Deals **50%** of the caster's Intelligence.

### Cinder Nova

Violence · every enemy. Deals **30%** of the caster's Intelligence to each.

### Venom Bolt

Instinct · single enemy. Deals **40%** of the caster's Intelligence and Poisons it for **3** turns:
at the end of each of its turns, a tick of **40% of the caster's Attack** (measured when cast), as
indirect damage. Re-poisoning refreshes the timer and keeps the stronger Poison.
