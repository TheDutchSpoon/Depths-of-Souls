# Rotcap Hollow (biome 3, floors 21–30)

Read this when a slice touches Rotcap Hollow's creatures, statuses, spells or boss.

Source: species and creatures in `src/data/species/rotcap-hollow.ts`; traits in
`src/data/traits/rotcap-hollow.ts`; spells in `src/data/spells/rotcap-hollow.ts`; Spore, Burn,
Poison and Confusion in `src/data/statuses.ts`. Each description is literal, exact numbers
included, in the style of a future in-game tooltip, and stands on its own together with the trigger
words (`content/overgrowth.md#trigger-words`). Where it disagrees with
the source, the source is right; a change to a number updates this doc and the trait's
`description` in `src/data` in the same change: each description is transcribed from its entry
here.

## Reading this biome

### Species roles

Most species follow The Overgrowth's enabler, payoff and amplifier roles (`content/overgrowth.md#enabler-payoff-amplifier`), a guideline, not a rule. The Necromoss share one mechanic, at a
bigger scope or a bigger number as rarity rises, and the Hollowkin have two enablers and a payoff.

## Statuses

### Spore

A festering infection. At the end of each of its bearer's turns, it deals damage worth **35% of the
Speed of the creature that infected it**, measured at the moment of infection. If the bearer dies
while infected, the spores burst and infect one living, uninfected member of the bearer's own side,
**carrying the same infection**: the new host takes the original infector's damage, not a share of
the dying host's Speed. The contagion keeps spreading through a side as it is whittled down; if
every living member of that side is already infected, the spread fizzles. Lasts up to **3** of its
bearer's turns per infection.

### Damage over time

Spore, Burn and Poison tick as indirect damage from a snapshot of their applier, at the end of each
of the bearer's turns (`spec/statuses.md#dot-and-regen-belong-to-their-applier`).

### Burn

At the end of each of its bearer's turns, deals damage worth **35% of the Intelligence of the
creature that applied it**, measured when applied. Lasts **3** of its bearer's turns unless what
applies it says otherwise; Burning it again refreshes the timer and keeps the stronger Burn. Applied
by **Withering Bolt** (Violence), the Sporch Igniter and the Sporch Cinderlord.

### Poison

At the end of each of its bearer's turns, deals damage worth **40% of the Attack of the creature
that applied it**, measured when applied. Lasts **3** of its bearer's turns; poisoning it again
refreshes the timer and keeps the stronger Poison. Applied by the Myconet Rotcore.

### Confusion

A puppet's madness. For **3** of its bearer's turns, every time it tries to attack or cast
something harmful, there's a **50% chance** it aims at its own side instead: a random ally, itself
included, or for an area spell its whole side, one roll per cast.

## Sporecloud (Wit): contagion

### Sporecloud Seeder

Wit · enabler · striker. Every attack infects its target with Spore.

### Sporecloud Reaper

Wit · payoff · striker. When it attacks, it also deals its target damage equal to **20% of its
Intelligence for each enemy currently infected with Spore** (3 Spored enemies make it 60%). With no
infected enemy it deals none.

### Sporecloud Bloomer

Wit · amplifier · caster. At the start of the fight, infects the entire enemy side with Spore.

## Rotfeeders (Violence/Vitality): carrion snowball

### Rotfeeder Scavenger

Violence · enabler · striker. Whenever any enemy dies, not only one it killed, its Attack
permanently rises by **10%**. Each death counts, so it can rise more than once in a round and
compounds as the fight goes on.

### Rotfeeder Ripper

Violence · payoff · striker. Every kill it lands itself restores **15% of its own maximum HP**.

### Rotfeeder Gorgemaw

Vitality · amplifier · striker. Every kill it lands itself restores **10% of its own maximum HP**
and permanently raises its own maximum HP by **5%**.

## Myconet (Endurance/Wit): death network

### Myconet Warder

Endurance · enabler · warden. Whenever an ally dies, every surviving ally's Defence permanently
rises by **15%**.

### Myconet Rotcore

Wit · payoff · warden (it wants to be hit). When it dies, it bursts a cloud of Poison across the
entire enemy side. The Poison is measured from the Rotcore as it dies (**40% of its Attack**), and
since it is already dead, every tick is logged as each bearer's own damage.

### Myconet Gravedigger

Endurance · amplifier · guardian (self-sustain that pays off by surviving). Whenever an ally dies,
it heals itself for **20% of its own maximum HP**.

## Necromoss (Wit/Vitality): reclaim

All three heal or buff off one source: how many of their own allies have died. Nothing happens until
an ally has fallen.

### Necromoss Wisp

Wit · caster. At the start of its own turn, heals itself for **5% of its own maximum HP for every
dead ally on its side** (2 dead allies make a 10% heal).

### Necromoss Thicket

Vitality · warden. Whenever an ally dies, its Defence permanently rises by a flat **10%**. Each
death is a separate +10% on top of the last, not a bigger single jump.

### Necromoss Hollowroot

Vitality · amplifier · support (it casts its heals only when an ally is below 50%). At the start of
its own turn, heals **every living ally** for **5% of its own maximum HP for every dead ally on its
side** (2 dead allies heal every ally for 10% of its maximum HP), whatever it casts.

## Hollowkin (Endurance/Instinct): puppet

### Hollowkin Wretch

Endurance · enabler · warden (provoking draws the hits its trait answers). Whenever an attack or
spell hits it, it Confuses the creature that hit it.

### Hollowkin Marionette

Instinct · enabler · striker. When it attacks, it Confuses its target.

### Hollowkin Puppeteer

Instinct · payoff · striker. Deals **30% more damage** to Confused enemies.

## Sporch (Violence/Wit): strong, non-spreading Burn

### Sporch Igniter

Violence · enabler · striker. When it attacks, it Burns its target.

### Sporch Ashborn

Wit · payoff · caster. Deals **30% more damage** to Burning enemies.

### Sporch Cinderlord

Violence · amplifier · opener. Every kill it lands applies **Burn to every remaining enemy**.

## Boss

### Rot Sovereign

Endurance · warden; floor 30. Unique and non-collectable, never in the spawn pool. The biome-3
finale: the puzzle is managing attrition, not racing damage.

- Whenever a creature dies on **either** side (one of her own, adds included, or one of yours), her
  Attack permanently rises by a flat **10%**, the same rate either way. Each death is a separate
  +10% on top of the last. Death on either side feeds her: that is the "don't feed it" puzzle.
- At the start of each of her own turns, she blankets the entire opposing side with Spore.

Her authored adds are a Sporecloud Seeder and a Rotfeeder Scavenger; three random Rotcap Hollow
creatures fill her side (`content/enemy-behaviour.md#boss-floors`), and every one of them that
dies feeds her too.

## Spells

These unlock at biome 3, one per affinity; Rotcap Hollow's casters also roll every biome-1 and
biome-2 spell (`content/overgrowth.md#spells`, `content/glimmerdark.md#spells`). Rasping Chant does
what Weakening Bite does, in Endurance. Spore Cyst and Withering Bolt sit outside the spell power
convention (`content/overgrowth.md#spell-power-convention`).

### Spore Cyst

Wit · single enemy. Deals **45%** of the caster's Intelligence and infects it with Spore for **3**
turns. The only spell that applies Spore.

### Rasping Chant

Endurance · single enemy. Permanently lowers its Defence to **80%** of its current value, for the
rest of the fight.

### Puppet String

Instinct · single enemy. Deals **80%** of the caster's Intelligence and Confuses it for **3** turns.
The only spell that applies Confusion.

### Charnel Feast

Vitality · every ally. Heals every living ally at once for **25% of the caster's maximum HP**.

### Withering Bolt

Violence · single enemy. Deals **45%** of the caster's Intelligence and Burns it for **3** turns.
The only spell that applies Burn.
