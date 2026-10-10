# Glimmerdark (biome 2, floors 11–20)

Read this when a slice touches Glimmerdark's creatures, statuses, spells or boss.

Source: species and creatures in `src/data/species/glimmerdark.ts`; traits in
`src/data/traits/glimmerdark.ts`; spells in `src/data/spells/glimmerdark.ts`; Grant Act First in
`src/data/statuses.ts`. Each description is literal, exact numbers included, in the style of a
future in-game tooltip, and stands on its own. Where it disagrees with the source, the source is
right; a change to a number updates this doc in the same change.

## Reading this biome

### Species roles

Most species follow The Overgrowth's enabler, payoff and amplifier roles (`content/overgrowth.md`
"Enabler, payoff, amplifier"). Three don't chain a trick: the Resonants and the Sparkeaters each
share one mechanic, and the Gloomjaws take three distinct verbs toward one theme. A hit marked
*indirect* follows `content/overgrowth.md` "Indirect damage".

### Affinity spread

Across the 18 creatures: **4 Wit** (the Flickerling Flare and the three Resonants), **3 Instinct**
(the Blindclaws), **5 Violence** (the Flickerling Last Gleam, the Sparkeater Leech and the three
Gloomjaws), **4 Endurance** (the Sparkeater Gorger and the three Shellbacks) and **2 Vitality** (the
Flickerling Wick and the Sparkeater Voidmaw).

## Statuses

### Grant Act First

Web's turn-order twin: its bearer acts at the **front** of the round's turn order instead of the
back. Lasts **3** of its bearer's turns.

## Flickerlings (Vitality/Wit/Violence): the flame that feeds on itself

Pale cave-dwellers whose glow is their life (the names are placeholders).

### Flickerling Wick

Vitality · enabler · support. At the start of its turn, **only while another living ally is below
maximum Health**, it burns **10% of its own maximum HP** to heal its lowest-HP **injured** ally
**other than itself** for **20% of its own maximum HP**. When every other ally is at full health
(or none is left), it neither burns nor heals. The burn is a **cost**: exactly 10% of its maximum
HP, whatever its Defence. It can kill the Wick, and then no heal follows (unless Last Stand saves
it; the heal then proceeds).

### Flickerling Flare

Wit · payoff · caster. Whenever an ally damages **itself** (a cost, like the Wick's burn; never an
ordinary hit or a damage-over-time tick), **every living ally** permanently gains **15% Speed**. It
counts itself as an ally, and two Flares both react, so their bonuses multiply. It watches damage,
not actions (`spec/effects.md` "Damage observation"). On a lethal burn the order is: the burn's
damage, the Flare's reaction, the Wick's death, the Last Gleam's reaction.

### Flickerling Last Gleam

Violence · amplifier · striker. Whenever an ally dies, **every living ally** permanently gains
**20% Attack**. It doesn't react to its own death. Two Last Gleams both react, so their bonuses
multiply.

## Blindclaws (Instinct): ambush via turn order

### Blindclaws Setter

Instinct · enabler · opener. At the start of its own turn, grants Grant Act First to the living ally
(itself included) with the highest Attack.

### Blindclaws Striker

Instinct · payoff · striker. Deals **35% more damage** with its attacks when it acts *before* the
enemy it is attacking this round (from its own Speed, or a Setter's or Vanguard's grant). The bonus
changes how hard it hits, not what it does.

### Blindclaws Vanguard

Instinct · amplifier · striker. At the start of each of its turns, grants itself Grant Act First,
so it is always at the front of the next round's turn order without a Setter's help.

## Resonants (Wit): caster synergy

All three react whenever a living ally, themselves included, casts a spell.

### Resonant Chorus

Wit · caster. Whenever an ally casts a spell, its Attack permanently rises by **5%**.

### Resonant Adept

Wit · caster. Whenever an ally casts a spell, its Intelligence permanently rises by **8%**.

### Resonant Overtone

Wit · amplifier · caster. Whenever an ally casts a spell, there's a **10% chance** the caster casts
again: a random one of its own equipped spells (possibly the same one), at a random valid target.
The echo comes **after the original cast has fully resolved**, and it obeys every action rule: a
Silenced caster can't echo, and a caster killed during its own cast (by a retaliation, say) loses
the echo. An echo is observed like any cast (by a Chorus, an Adept, even an Overtone again), so it
can chain into another echo. Only one Overtone echo can follow a cast, however many Overtones are on
the field.

## Sparkeaters (Violence/Endurance/Vitality): stat parasites

Every one permanently drains a stat from whatever it attacks, and its affinity matches the stat it
steals.

### Sparkeater Leech

Violence · striker. When it attacks, it permanently drains **10% Attack** from its target into
itself.

### Sparkeater Gorger

Endurance · striker. When it attacks, it permanently drains **10% Defence** from its target into
itself.

### Sparkeater Voidmaw

Vitality · amplifier · striker. When it attacks, it permanently drains **10% of its target's maximum
HP** (clamping the target's current HP down if it is above the new maximum) and raises **every
living ally's maximum HP, its own included, by 5%**: a ceiling raise only, not a heal.

## Gloomjaws (Violence): execute the weak

Three distinct verbs toward one theme: the Ravager softens targets, the Stalker executes them, the
Executioner snowballs off the kills.

### Gloomjaw Stalker

Violence · finisher · opener. Deals **30% more damage** to enemies below 30% HP.

### Gloomjaw Executioner

Violence · snowball · striker. Every kill permanently raises its own Attack by **15%** for the rest
of the fight: it needs kills, not weak targets, and hits harder with each one.

### Gloomjaw Ravager

Violence · armor-breaker · striker. Ignores **30%** of every target's Defence, unconditionally: it
doesn't hit low-HP targets harder, it gets every target into low-HP range faster.

## Shellbacks (Endurance): armor as weapon

### Shellback Warden

Endurance · enabler · warden. At the start of each of its turns, permanently raises the whole
team's Defence by **10%**, again every round it acts, so it compounds.

### Shellback Brawler

Endurance · payoff · striker. Its Attack action reads its own **Defence** instead of Attack: its
armor is its weapon.

### Shellback Bulwark

Endurance · amplifier · warden (provoking draws more hits to strike back at). Whenever it takes
damage, it strikes back for **50% of its own Defence**, as indirect damage.

## Boss

### Leech Sovereign

Instinct · striker; floor 20. Unique and non-collectable, never in the spawn pool. A lean fight with
one mechanic and no authored adds: five random Glimmerdark creatures fill her side
(`content/enemy-behaviour.md` "Boss floors").

- Every time she attacks, she permanently steals **20% of her target's Attack**: the target's
  Attack falls by 20% and hers rises by 20%, on every hit. The party hollows out while she
  snowballs, so the fight is a race to burst her down before the steal compounds too far.

## Spells

These unlock at biome 2; Glimmerdark's casters also roll every biome-1 spell (`content/overgrowth.md`
"Spells"). An ally spell can target any living ally, the caster included.

### Beacon Charge

Wit · single ally. Heals **30%** of the caster's effective Health and grants Grant Act First for
**3** turns.

### Disorient

Instinct · single enemy. Deals **85%** of the caster's Intelligence and applies Web for **3** turns.

### Blinding Flare

Violence · single enemy. Deals **70%** of the caster's Intelligence and leaves it **Vulnerable**
for **3** turns: it takes ×1.5 damage, once (re-casting refreshes it; it never compounds). The only
spell that applies Vulnerability.

### Afterglow

Vitality · single ally. Heals **50%** of the caster's effective Health and grants **Regen** for
**3** turns: at the end of each of the ally's turns it heals a further **10% of the caster's
Health**, measured when cast. Regen never stacks: re-granting it refreshes the timer and keeps the
stronger heal. While the caster lives the heal is credited to it, after that to the ally.

### Kindred Light

Wit · every ally. Heals **20%** of the caster's effective Health.
