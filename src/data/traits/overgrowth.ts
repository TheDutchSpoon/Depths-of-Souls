import type { DescribedTrait } from './described'

// ---- The Overgrowth (floors 1-10) -- real per-species content.
// Every creature's own doc comment in
// data/species/overgrowth.ts explains its ROLE within its species; the mechanism doc comments
// here explain the trait's own shape. Player-facing plain-language descriptions with exact
// numbers live in .claude/content/overgrowth.md -- kept in sync with the numbers below.

/** Spiders' Weaver (enabler): at the END of its own turn, Webs a random living enemy --
 * unconditional, decoupled from whatever action it then takes (unlike Lullpollen's Sleeper,
 * which is attack-triggered). Fires on-turn-end -> apply-status(random-enemy selector), not
 * on-turn-start: the Web is then born this turn, so the Weaver's own
 * cleanup does not roll it (its first roll is at the next creature's cleanup). */
export const SPIDER_WEAVER_TRAIT: DescribedTrait = {
  id: 'spider-weaver-web-strike',
  name: 'Web Strike',
  description: 'At the end of its own turn, applies Web to a random living enemy.',
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-end',
      response: {
        kind: 'apply-status',
        target: { kind: 'selector', selector: { kind: 'random-enemy' } },
        status: { statusId: 'web' },
      },
    },
  ],
}

/** Spiders' Ambusher (payoff): a passive conditional-damage-bonus, condition subject
 * 'target' -- folds straight into the attacker's own dealtMods pool for whichever hit lands on a
 * Webbed target. Applies to both Attack and Cast (actionKind left unset -> 'both'). */
export const SPIDER_AMBUSHER_TRAIT: DescribedTrait = {
  id: 'spider-ambusher-exploit',
  name: 'Exploit',
  description: 'Deals 40% more damage to Webbed enemies.',
  effects: [
    {
      category: 'conditional-damage-bonus',
      percent: 0.4,
      condition: { kind: 'has-status', subject: 'target', statusId: 'web' },
    },
  ],
}

/** Spiders' Broodwarden (amplifier): a genuinely distinct mechanic from BOTH Weaver and
 * Ambusher, not the two of them combined -- it never applies Web itself (that's Weaver's job
 * alone) and never reads a flat conditional bonus off ITS OWN hit (that's Ambusher's job alone).
 * Instead, every attack lands a SEPARATE bonus hit whose power grows with how many enemies are
 * CURRENTLY Webbed -- "rewards multiple Webs out" read as a live count-scaling bonus (deal-damage's
 * own magnitudeSource), a payoff-of-the-payoff that depends entirely on its
 * species-mates having done their own jobs, rather than doing any part of those jobs itself. */
export const SPIDER_BROODWARDEN_TRAIT: DescribedTrait = {
  id: 'spider-broodwarden-entangling-brood',
  name: 'Entangling Brood',
  description:
    'When it attacks, it also deals its target damage equal to 25% of its Attack for every enemy currently Webbed (50% with two, and so on). It never applies Web itself; it only benefits from what its species-mates have done.',
  effects: [
    {
      category: 'triggered',
      hook: 'on-attack',
      response: {
        kind: 'deal-damage',
        target: { kind: 'triggering-source' },
        scalingStat: 'attack',
        spellPower: 0.25,
        magnitudeSource: { kind: 'count', of: 'enemies-with-status', statusId: 'web' },
      },
    },
  ],
}

/** Swarmhive's Drone (enabler, `content/overgrowth.md#swarmhive-drone`): a cheap body, but every creature
 * needs its own real mechanic (no trait-less filler) -- a small on-death parting sting fits a
 * cheap, expendable swarm body without stepping on Striker/Queen's own count-scaling payoff.
 * Strikes a RANDOM living enemy, not necessarily its own killer. */
export const SWARMHIVE_DRONE_TRAIT: DescribedTrait = {
  id: 'swarmhive-drone-final-sting',
  name: 'Final Sting',
  description:
    'When it dies, it deals damage equal to 30% of its Attack to a random living enemy.',
  effects: [
    {
      category: 'triggered',
      hook: 'on-death',
      response: {
        kind: 'deal-damage',
        target: { kind: 'selector', selector: { kind: 'random-enemy' } },
        offStat: 'attack',
        spellPower: 0.3,
      },
    },
  ],
}

/** Swarmhive's Striker (payoff, `content/overgrowth.md#swarmhive-striker`): scales per hive-mate
 * in the team, through apply-stat-modifier's magnitudeSource (`spec/effects.md#count-scaling`):
 * fires once on-fight-start, freeze-at-application, count = living-allies-of-species (INCLUDES
 * self) at that moment -- never re-reads live after. */
export const SWARMHIVE_STRIKER_TRAIT: DescribedTrait = {
  id: 'swarmhive-striker-hive-mind',
  name: 'Hive Mind',
  description:
    "At the start of the fight, its Attack permanently rises by 20% for every living Swarmhive ally, itself included. The bonus is fixed when the fight starts: allies joining or dying later don't change it.",
  effects: [
    {
      category: 'triggered',
      hook: 'on-fight-start',
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'self' },
        stat: 'attack',
        factor: 1.2,
        magnitudeSource: { kind: 'count', of: 'living-allies-of-species' },
      },
    },
  ],
}

/** Swarmhive's Queen (amplifier): the anchor -- a genuinely distinct mechanic from Striker
 * (design note: an amplifier should never just combine its species-mates' own effects). Every
 * time her own turn starts, she permanently buffs the WHOLE Swarmhive team's Attack by a flat
 * 10% -- the `all-allies-of-species` ResponseTarget (effect-types.ts), a fresh
 * StatModifierEffect appended to every qualifying ally each firing, compounding round over
 * round for as long as she's alive and acting. */
export const SWARMHIVE_QUEEN_TRAIT: DescribedTrait = {
  id: 'swarmhive-queen-hive-anchor',
  name: 'Hive Anchor',
  description:
    'At the start of each of its turns, it permanently raises the Attack of every living Swarmhive ally, itself included, by 10%, so the bonus compounds over the fight.',
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-start',
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'all-allies-of-species' },
        stat: 'attack',
        factor: 1.1,
      },
    },
  ],
}

/** Treants' Sapling (enabler): permanently grows its own max Health every round-end (a fresh
 * StatModifierEffect instance each firing, compounding multiplicatively -- base x Pi(factors),
 * per the unified effect framework's own fold rule). */
export const TREANT_SAPLING_TRAIT: DescribedTrait = {
  id: 'treant-sapling-taking-root',
  name: 'Taking Root',
  description:
    'At the end of every round, its maximum Health permanently rises by 10%, compounding.',
  effects: [
    {
      category: 'triggered',
      hook: 'on-round-end',
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'self' },
        stat: 'health',
        factor: 1.1,
      },
    },
  ],
}

/** Treants' Elder (payoff): "heals the line" -- heal's own scalingStat mode (Treants Elder is the
 * CANONICAL example in that mechanism's own doc comment), scaling off the HEALER's
 * own effective Health, landing on the lowest-HP ally every round-end. */
export const TREANT_ELDER_TRAIT: DescribedTrait = {
  id: 'treant-elder-verdant-ward',
  name: 'Verdant Ward',
  description:
    'At the end of every round, heals its lowest-HP ally for 15% of its own effective Health.',
  effects: [
    {
      category: 'triggered',
      hook: 'on-round-end',
      response: {
        kind: 'heal',
        target: { kind: 'selector', selector: { kind: 'lowest-hp-ally' } },
        scalingStat: 'health',
        spellPower: 0.15,
      },
    },
  ],
}

/** Treants' Grovekeep (amplifier): "huge sustained wall" via its OWN mechanic, not Sapling's
 * self-growth or Elder's single-ally heal-over-time reused -- once, at fight-start, it roots the
 * WHOLE team into the grove, permanently raising every living ally's max Health at once. Neither
 * self-only (like Sapling) nor round-repeating (like Elder/Sapling) -- a one-time, team-wide
 * effect instead. */
export const TREANT_GROVEKEEP_TRAIT: DescribedTrait = {
  id: 'treant-grovekeep-ancient-growth',
  name: 'Ancient Growth',
  description:
    "At the start of the fight, permanently raises the whole team's maximum Health by 15%, once.",
  effects: [
    {
      category: 'triggered',
      hook: 'on-fight-start',
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'all-allies' },
        stat: 'health',
        factor: 1.15,
      },
    },
  ],
}

/** Pollinators' Duster (enabler): spreads a permanent, non-health stat-buff to the whole team
 * once, at fight-start. */
export const POLLINATOR_DUSTER_TRAIT: DescribedTrait = {
  id: 'pollinator-duster-pollen-drift',
  name: 'Pollen Drift',
  description:
    "At the start of the fight, permanently raises its whole team's Speed by 25%.",
  effects: [
    {
      category: 'triggered',
      hook: 'on-fight-start',
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'all-allies' },
        stat: 'speed',
        factor: 1.25,
      },
    },
  ],
}

/** Pollinators' Beneficiary (payoff): "capitalizes on a buffed team" -- reads its OWN
 * (Duster-buffed) effective Speed as bonus Attack via cross-stat, so raising the
 * team's Speed literally raises this creature's own damage; never a status/trigger, folded
 * straight into the formula. */
export const POLLINATOR_BENEFICIARY_TRAIT: DescribedTrait = {
  id: 'pollinator-beneficiary-thriving',
  name: 'Thriving',
  description:
    'Its attacks deal additional damage equal to 30% of its own effective Speed, so a sped-up team makes it hit harder.',
  effects: [
    {
      category: 'cross-stat',
      fromStat: 'speed',
      percentPerRank: 0.3,
      appliesTo: 'attack',
    },
  ],
}

/** Pollinators' Pollenlord (amplifier): a genuinely distinct mechanic from Duster, not a bigger
 * copy of it -- instead of one buff at fight-start, a SMALLER team Speed buff repeats every time
 * Pollenlord's own turn comes around, compounding round over round for as long as it's alive and
 * acting. */
export const POLLINATOR_POLLENLORD_TRAIT: DescribedTrait = {
  id: 'pollinator-pollenlord-bloom-surge',
  name: 'Bloom Surge',
  description:
    "At the start of each of its turns, permanently raises its whole team's Speed by 10%.",
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-start',
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'all-allies' },
        stat: 'speed',
        factor: 1.1,
      },
    },
  ],
}

/** Snapjaws' Lure (enabler): Provoking also grants itself Defending -- pulls aggro AND tanks the
 * redirected hits (grant-action-state, reusing Defend's existing math verbatim). It runs the
 * `taunter` role, which Provokes every turn, so this fires every turn. */
export const SNAPJAW_LURE_TRAIT: DescribedTrait = {
  id: 'snapjaw-lure-maw-of-thorns',
  name: 'Maw of Thorns',
  description: 'Whenever it Provokes, it also Defends.',
  effects: [
    {
      category: 'triggered',
      hook: 'on-provoke',
      response: { kind: 'grant-action-state', target: { kind: 'self' }, defending: true },
    },
  ],
}

/** Snapjaws' Jaws (payoff): when it takes damage from an attack or spell, a retaliate at 60% of its
 * Attack (`content/overgrowth.md#snapjaw-jaws`). */
export const SNAPJAW_JAWS_TRAIT: DescribedTrait = {
  id: 'snapjaw-jaws-snapback',
  name: 'Snapback',
  description:
    'Whenever an attack or spell hits it, it deals damage equal to 60% of its Attack to the creature that hit it.',
  effects: [
    {
      category: 'triggered',
      hook: 'on-damage-taken',
      damageChannel: 'direct',
      response: {
        kind: 'deal-damage',
        target: { kind: 'triggering-source' },
        offStat: 'attack',
        spellPower: 0.6,
      },
    },
  ],
}

/** Snapjaws' Ironjaw (amplifier): a genuinely distinct mechanic from Lure and Jaws, not a
 * combination of the two -- a self-ramping wall, permanently raising its own Defence by 20%
 * every time its own turn comes around, compounding round over round. */
export const SNAPJAW_IRONJAW_TRAIT: DescribedTrait = {
  id: 'snapjaw-ironjaw-iron-maw',
  name: 'Iron Maw',
  description: 'At the start of each of its turns, its Defence permanently rises by 20%.',
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-start',
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'self' },
        stat: 'defence',
        factor: 1.2,
      },
    },
  ],
}

/** Lullpollen's Sleeper (enabler): a CHANCE (unlike Spiders' unconditional Web) to Sleep its
 * target on attack -- `content/overgrowth.md#lullpollen-sleeper` explicitly calls out "chance" for Sleeper, unlike
 * Weaver. */
export const LULLPOLLEN_SLEEPER_TRAIT: DescribedTrait = {
  id: 'lullpollen-sleeper-lulling-touch',
  name: 'Lulling Touch',
  description: 'When it attacks, it has a 40% chance to put its target to Sleep.',
  effects: [
    {
      category: 'triggered',
      hook: 'on-attack',
      chancePercent: 40,
      response: {
        kind: 'apply-status',
        target: { kind: 'triggering-source' },
        status: { statusId: 'sleep' },
      },
    },
  ],
}

/** Lullpollen's Reaper (payoff): "+% dmg to Sleeping" -- the same conditional-damage-bonus shape
 * as Spiders' Ambusher, gated on Sleep instead of Web. */
export const LULLPOLLEN_REAPER_TRAIT: DescribedTrait = {
  id: 'lullpollen-reaper-dream-reaper',
  name: 'Dream Reaper',
  description: 'Deals 50% more damage to Sleeping enemies.',
  effects: [
    {
      category: 'conditional-damage-bonus',
      percent: 0.5,
      condition: { kind: 'has-status', subject: 'target', statusId: 'sleep' },
    },
  ],
}

/** Lullpollen's Dozer (amplifier): a genuinely distinct mechanic from BOTH Sleeper and Reaper --
 * it never rolls to apply Sleep itself (Sleeper's job alone) and never reads a flat conditional
 * bonus off its OWN hit (Reaper's job alone). Instead, every attack lands a SEPARATE bonus hit
 * whose power grows with how many enemies are CURRENTLY Sleeping -- the exact same live
 * count-scaling shape as Spiders' Broodwarden (deal-damage's magnitudeSource), reused
 * for a different status: a payoff-of-the-payoff that depends entirely on its species-mates
 * having done their own jobs. */
export const LULLPOLLEN_DOZER_TRAIT: DescribedTrait = {
  id: 'lullpollen-dozer-drowsy-bloom',
  name: 'Drowsy Bloom',
  description:
    'When it attacks, it also deals its target damage equal to 25% of its Attack for every enemy currently Sleeping (50% with two, and so on). It never puts anything to Sleep itself; it only benefits from what its species-mates have done.',
  effects: [
    {
      category: 'triggered',
      hook: 'on-attack',
      response: {
        kind: 'deal-damage',
        target: { kind: 'triggering-source' },
        scalingStat: 'attack',
        spellPower: 0.25,
        magnitudeSource: { kind: 'count', of: 'enemies-with-status', statusId: 'sleep' },
      },
    },
  ],
}

/** The Broodmother (floor-10 boss, `data/species/overgrowth.ts`'s `BROODMOTHER`). Live
 * count-scaling (NOT frozen, unlike Swarmhive Striker/Queen): every attack lands a second,
 * scaled hit whose power grows with her OWN living-allies-of-species count (herself + living
 * spiderling adds) -- "kill adds to weaken her" requires a LIVE recompute, so this reuses the
 * exact same on-attack magnitudeSource trick as Broodwarden above, just keyed on her own side's
 * count instead of the enemy Webbed count. A second effect Webs the whole party each round-end,
 * at a chance. */
export const BROODMOTHER_TRAIT: DescribedTrait = {
  id: 'broodmother-swarm-call',
  name: 'Swarm Call',
  description:
    'Whenever she attacks, she also deals her target damage equal to 25% of her Attack for every living spiderling fighting beside her, herself included. It is read fresh on every attack, so killing her adds visibly shrinks it. At the end of every round, she has a 40% chance to Web the entire enemy party at once.',
  effects: [
    {
      category: 'triggered',
      hook: 'on-attack',
      response: {
        kind: 'deal-damage',
        target: { kind: 'triggering-source' },
        scalingStat: 'attack',
        spellPower: 0.25,
        magnitudeSource: { kind: 'count', of: 'living-allies-of-species' },
      },
    },
    {
      category: 'triggered',
      hook: 'on-round-end',
      chancePercent: 40,
      response: {
        kind: 'apply-status',
        target: { kind: 'all-enemies' },
        status: { statusId: 'web' },
      },
    },
  ],
}
