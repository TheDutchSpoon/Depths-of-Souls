# The Overgrowth (biome 1, floors 1–10)

Read this when a slice touches The Overgrowth's creatures, statuses, spells or boss, or the
Unicorn.

Source: species and creatures in `src/data/species/overgrowth.ts`; traits in
`src/data/traits/overgrowth.ts`; spells in `src/data/spells/overgrowth.ts`;
statuses in `src/data/statuses.ts`; the Unicorn in
`src/data/species/starters.ts` and `src/data/traits/starters.ts`. Each description is literal,
exact numbers included, in the style of a future in-game tooltip, and stands on its own together
with the trigger words (`content/overgrowth.md#trigger-words`), which say once what every entry's
wording means. Where it disagrees with the source, the source is right; a change to a number
updates this doc and the trait's `description` in `src/data` in the same change: each description
is transcribed from its entry here.

## Reading this biome

### Enabler, payoff, amplifier

A guideline, not a rule: a species usually has one closed, self-contained trick, and its three
creatures play three roles in it:

- **Common = enabler.** Sets the trick up (applies a status, opens a condition).
- **Uncommon = payoff.** Benefits from the trick once it's set up.
- **Rare = amplifier.** Its own distinct mechanic in the same spirit as its species-mates, never
  just both of their effects stapled together.

### Rarity is not power

A rare creature's total stat budget is about the same as its common and uncommon species-mates'.
Rarity only changes how often it spawns.

### Indirect damage

Damage a trait or perk deals itself follows the indirect damage rule (`spec/combat.md#damage-channels-and-the-additional`): only a fifth of the target's Defence applies, and it gets no chip
floor and no Additional.

### Trigger words

Every trait and perk entry, in every content doc and in `specializations/`, uses these words with
one meaning each, so an entry says only what its trait does.

- **"attacks", "casts"**: the real action (`spec/effects.md#traits`), at the action's power, with
  every action rule. "Attacks an additional time" or "again" is one more instance of the same
  action (`spec/combat.md#action-instance-list`).
- **"hits"**: an attack's or a spell's own damage landing, a splash hit included. Never a trait's
  or perk's own damage.
- **"deals damage"**, in a trait or perk entry: the creature's own damage, outside any action. It
  is indirect damage (`content/overgrowth.md#indirect-damage`): not an attack, so it fires no "when
  it attacks", can't splash and isn't turned by Confusion. In a spell entry, the damage is the
  cast's hit.
- **"when it attacks", "every attack"** (`on-attack`): every attack instance (Flurry gives two),
  granted attacks included. It resolves **before the hit**, aimed at the attack's target, the
  attacker's own ally when Confusion turned the attack, and still resolves when the hit then finds
  its target dead (`spec/combat.md#a-target-killed-by-its-pre-hit-hooks-fizzles`). Not on a splash
  hit, a spell or a trait's damage.
- **"whenever an attack or spell hits it"** (`on-damage-taken` with `damageChannel: 'direct'`):
  every hit separately (each instance of a Flurry or an Echo, each target of an area spell, each
  splash hit), from any creature, an ally included; never the hit that kills it.
- **"whenever an ally casts"** (`on-action-observed`): every cast instance (an Echo gives two; an
  area spell counts once), granted casts and echoes included, the observer's own casts too. It
  resolves before the spell's effects, so a buff an observer gains from its own cast already powers
  that cast.
- **"every kill"** (`on-kill`): every death it deals: by its actions, by its own damage, or by the
  tick of a damage over time it applied while it lives. An ally it kills counts.
- **"at the start of each of its turns", "at the end of its turn"** (`on-turn-start`,
  `on-turn-end`): every turn it has, a turn it loses to Stun or Sleep included.
- **"deals X% more damage to …"** (`conditional-damage-bonus`): its attacks, its spells and its own
  damage, checked on each hit.
- **"its attacks (and spells) deal additional damage"** (`cross-stat`): its attacks' and spells'
  hits, splash hits included; never its own damage.
- **"ignores X% of Defence"** (`armor-penetration`): all its damage except damage over time.

## Statuses

### Web

A Webbed creature acts last in the round. At the end of **every living creature's turn** (not
only the Webbed one's), starting with the turn after the one that applied it, the Web has a **10%
chance** to break, so in a full 6v6 fight a Web usually breaks within one round (about 72% of the
time), and it holds longer as creatures fall. It never lasts more than **3** of its bearer's
turns. Web is deliberately light: the Spiders' reward is the exploit, not the status.

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

Skips its bearer's turn (`spec/statuses.md#stun-is-just-a-status`). No trait or spell in the
seed content applies it.

### Weaken

A Weakened creature deals **−20% damage**. Lasts **3** of its own turns unless what applies it says
otherwise; Weakening it again refreshes the timer. Applied by **Stifling Weight** (Endurance) and the
Brute perk **Concussive Blows**.

## Spiders (Wit): trap → exploit

### Spider Weaver

Wit · enabler · caster. At the end of its own turn, applies Web to a random living enemy.

### Spider Ambusher

Wit · payoff · striker. Deals **40% more damage** to Webbed enemies.

### Spider Broodwarden

Instinct · amplifier · striker. When it attacks, it also deals its target damage equal to **25% of
its Attack for every enemy currently Webbed** (50% with two, and so on). It never applies Web
itself; it only benefits from what its species-mates have done.

## Swarmhive (Violence): strength in numbers

### Swarmhive Drone

Violence · enabler · opener. When it dies, it deals damage equal to **30% of its Attack** to a
random living enemy.

### Swarmhive Striker

Violence · payoff · striker. At the start of the fight, its Attack permanently rises by **20% for
every living Swarmhive ally, itself included**. The bonus is fixed when the fight starts: allies
joining or dying later don't change it.

### Swarmhive Queen

Endurance · amplifier · warden. At the start of each of its turns, it permanently raises the Attack
of **every living Swarmhive ally, itself included, by 10%**, so the bonus compounds over the
fight.

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
Speed by **10%**.

## Snapjaws (Violence/Endurance): bait & punish

### Snapjaw Lure

Endurance · enabler · taunter (its trait fires on Provoke). Whenever it Provokes, it also Defends.

**Known bug:** the Lure only takes the defending stance; it doesn't Defend, so the stance counts for
no Defend count and fires no `on-defend` (fix: `phases/4.6/brief.md#granted-defends-are-real-defends`).

### Snapjaw Jaws

Violence · payoff · striker. Whenever an attack or spell hits it, it deals damage equal to **60% of
its Attack** to the creature that hit it.

### Snapjaw Ironjaw

Violence · amplifier · striker. At the start of each of its turns, its Defence permanently rises by
**20%**.

## Lullpollen (Wit/Instinct): sleep & punish

### Lullpollen Sleeper

Wit · enabler · striker. When it attacks, it has a **40% chance** to put its target to Sleep.

**Known bug:** the Sleep lands before the attack's hit, and that hit wakes the target, so a Sleeper's
Sleep never outlasts the attack that applies it (fix:
`phases/4.6/brief.md#action-hooks-fire-after-the-action`).

### Lullpollen Reaper

Instinct · payoff · striker. Deals **50% more damage** to Sleeping enemies.

### Lullpollen Dozer

Instinct · amplifier · striker. When it attacks, it also deals its target damage equal to **25% of
its Attack for every enemy currently Sleeping** (50% with two, and so on). It never puts anything
to Sleep itself; it only benefits from what its species-mates have done.

## Boss

### Broodmother

Wit · striker; floor 10. Unique and non-collectable, never in the spawn pool.

- Whenever she attacks, she also deals her target damage equal to **25% of her Attack for every
  living spiderling fighting beside her, herself included**. It is read fresh on every attack, so
  killing her adds visibly shrinks it.
- At the end of every round, she has a **40% chance** to Web the entire enemy party at once.

Her authored adds are a Spider Weaver and a Spider Ambusher; three random Overgrowth creatures,
never Spiders, fill her side (`content/enemy-behaviour.md#boss-floors`).

## Intro: Unicorn Lightbearer

### Unicorn Lightbearer

Vitality · striker; the name is a placeholder. A unique, permanent party member that joins in the
scripted intro (`spec/run.md#scripted-intro`); its own species is stubbed and returns with a real roster in
a later biome.

Whenever it attacks, it revives a random dead ally at **20% of that ally's baseline maximum HP**.
With Flurry it attacks twice, so it revives twice.

## Spells

### Spell power convention

A single-target damage spell with no other effect deals about **100%** of the caster's
Intelligence; one that also applies a status that only hinders (Web, Weaken, Confusion), about
**80–90%**. An area spell with no other effect deals about **50%**; one that also applies a
hindering status, about **30–40%**. A spell whose other effect is itself damage, healing or a damage
multiplier (a damage over time, a heal, Vulnerability) is outside the convention and priced by
tuning: Life Siphon, Blinding Flare, Spore Cyst and Withering Bolt. A spell copying another's effect
in a different affinity is allowed, but avoided where another effect would do. A spell's percentage is
its power coefficient through the normal damage formula (the target's Defence, affinity and every
usual modifier), not a flat amount. An ally spell can target any living ally, the caster included.
Every spell below unlocks at biome 1 and stays rollable in every deeper
biome (`spec/run.md#spells-unlock-cumulatively`).

### Thorn Volley

Violence · every enemy. Deals **45%** of the caster's Intelligence to each.

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
