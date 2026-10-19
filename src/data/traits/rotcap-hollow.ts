import type { DescribedTrait } from './described'

// ---- Rotcap Hollow (floors 21-30) -- real per-species content, built entirely
// on primitives the engine already has (no new engine work needed for any TRAIT here
// -- the one genuinely new piece, Spore's `random-ally-without-status` target, is
// a ResponseTarget-only addition living in data/statuses.ts's SPORE, not a species trait). Player-
// facing plain-language descriptions with exact numbers live in .claude/content/rotcap-hollow.md
// -- kept in sync with the numbers below.
//
// Same enabler/payoff/amplifier framing (common/uncommon/rare) as Overgrowth/Glimmerdark, except
// Necromoss -- like Resonants -- shares ONE mechanic across all three creatures, escalating
// scope/strength by rarity (`content/rotcap-hollow.md#necromoss-witvitality-reclaim` is a
// single closed mechanic, not a two-role enabler/payoff chain).

// ---- Sporecloud (Wit) -- closed mechanic: Contagion (Spore) ----

/** Sporecloud Seeder (enabler, common): every attack infects its target with Spore -- the
 * biome's signature DoT (data/statuses.ts's SPORE), which itself spreads to a fresh host when
 * its bearer dies. */
export const SPORECLOUD_SEEDER_TRAIT: DescribedTrait = {
  id: 'sporecloud-seeder-infest',
  name: 'Infest',
  description: 'Every attack infects its target with Spore.',
  effects: [
    {
      category: 'triggered',
      hook: 'on-attack',
      response: {
        kind: 'apply-status',
        target: { kind: 'triggering-source' },
        status: { statusId: 'spore' },
      },
    },
  ],
}

/** Sporecloud Reaper (payoff, uncommon): every attack ALSO lands a bonus Intelligence-scaled
 * tick against whoever it's hitting, scaling with the LIVE count of Spored enemies (mirrors the
 * Broodmother's own "Swarm Call" shape -- a deal-damage response with a live, per-firing
 * `magnitudeSource`, never frozen) -- a no-op rider (0 extra damage) until at least one enemy is
 * Spored. */
export const SPORECLOUD_REAPER_TRAIT: DescribedTrait = {
  id: 'sporecloud-reaper-bloomburst',
  name: 'Bloomburst',
  description:
    'When it attacks, it also deals its target damage equal to 20% of its Intelligence for each enemy currently infected with Spore (3 Spored enemies make it 60%). With no infected enemy it deals none.',
  effects: [
    {
      category: 'triggered',
      hook: 'on-attack',
      response: {
        kind: 'deal-damage',
        target: { kind: 'triggering-source' },
        scalingStat: 'intelligence',
        spellPower: 0.2,
        magnitudeSource: { kind: 'count', of: 'enemies-with-status', statusId: 'spore' },
      },
    },
  ],
}

/** Sporecloud Bloomer (amplifier, rare): a genuinely distinct mechanic from BOTH Seeder and
 * Reaper -- breadth over depth (the same "team-wide burst vs. per-hit trickle" shape the
 * Glimmerdark amplifiers use): once at fight-start, it seeds the WHOLE enemy line with Spore at
 * once, rather than infecting one target per attack. */
export const SPORECLOUD_BLOOMER_TRAIT: DescribedTrait = {
  id: 'sporecloud-bloomer-spore-burst',
  name: 'Spore Burst',
  description: 'At the start of the fight, infects the entire enemy side with Spore.',
  effects: [
    {
      category: 'triggered',
      hook: 'on-fight-start',
      response: {
        kind: 'apply-status',
        target: { kind: 'all-enemies' },
        status: { statusId: 'spore' },
      },
    },
  ],
}

// ---- Rotfeeders (Violence) -- closed mechanic: Carrion snowball ----

/** Rotfeeder Scavenger (enabler, common): permanently grows its own Attack whenever ANY enemy
 * dies -- not just its own kills (`on-death-observed` on an enemy, an OBSERVER hook, unlike
 * `on-kill`'s actor-self scoping) -- a fresh StatModifierEffect each firing, compounding as the
 * fight thins out the opposing side. */
export const ROTFEEDER_SCAVENGER_TRAIT: DescribedTrait = {
  id: 'rotfeeder-scavenger-carrion-hunger',
  name: 'Carrion Hunger',
  description:
    'Whenever any enemy dies, not only one it killed, its Attack permanently rises by 10%. Each death counts, so it can rise more than once in a round and compounds as the fight goes on.',
  effects: [
    {
      category: 'triggered',
      hook: 'on-death-observed',
      observationFilter: { relationship: 'enemy' },
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'self' },
        stat: 'attack',
        factor: 1.1,
      },
    },
  ],
}

/** Rotfeeder Ripper (payoff, uncommon): every KILL it personally lands restores a slice of its
 * own vitality (`heal`'s `scalingStat` mode -- reads the HEALER's own effective Health, per
 * REGROWTH's precedent). */
export const ROTFEEDER_RIPPER_TRAIT: DescribedTrait = {
  id: 'rotfeeder-ripper-gorge',
  name: 'Gorge',
  description: 'Every kill it lands itself restores 15% of its own maximum HP.',
  effects: [
    {
      category: 'triggered',
      hook: 'on-kill',
      response: {
        kind: 'heal',
        target: { kind: 'self' },
        scalingStat: 'health',
        spellPower: 0.15,
      },
    },
  ],
}

/** Rotfeeder Gorgemaw (amplifier, rare): a genuinely distinct mechanic from BOTH Scavenger
 * (Attack snowball off ANY death) and Ripper (pure sustain off its OWN kills) -- it grows
 * FATTER off its own kills instead: every kill both heals it AND permanently raises its own max
 * Health (the "grows fatter, not just angrier" identity). */
export const ROTFEEDER_GORGEMAW_TRAIT: DescribedTrait = {
  id: 'rotfeeder-gorgemaw-gluttony',
  name: 'Gluttony',
  description:
    'Every kill it lands itself restores 10% of its own maximum HP and permanently raises its own maximum HP by 5%.',
  effects: [
    {
      category: 'triggered',
      hook: 'on-kill',
      response: {
        kind: 'heal',
        target: { kind: 'self' },
        scalingStat: 'health',
        spellPower: 0.1,
      },
    },
    {
      category: 'triggered',
      hook: 'on-kill',
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'self' },
        stat: 'health',
        factor: 1.05,
      },
    },
  ],
}

// ---- Myconet (Endurance) -- closed mechanic: Death-network ----

/** Myconet Warder (enabler, common): whenever an ally falls, the rest of the colony toughens up
 * -- a fresh StatModifierEffect on every living ally each firing, compounding as the fight goes
 * on (`all-allies` already excludes the just-died member -- livingAlliesOf filters on `alive`). */
export const MYCONET_WARDER_TRAIT: DescribedTrait = {
  id: 'myconet-warder-network-response',
  name: 'Network Response',
  description:
    "Whenever an ally dies, every surviving ally's Defence permanently rises by 15%.",
  effects: [
    {
      category: 'triggered',
      hook: 'on-death-observed',
      observationFilter: { relationship: 'ally' },
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'all-allies' },
        stat: 'defence',
        factor: 1.15,
      },
    },
  ],
}

/** Myconet Rotcore (payoff, uncommon): when IT dies, it bursts a cloud of Poison across the
 * whole opposing side -- a retaliatory death-burst, `all-enemies` (already built). */
export const MYCONET_ROTCORE_TRAIT: DescribedTrait = {
  id: 'myconet-rotcore-death-bloom',
  name: 'Death Bloom',
  description:
    'When it dies, it bursts a cloud of Poison across the entire enemy side. The Poison is measured from the Rotcore as it dies (40% of its Attack).',
  effects: [
    {
      category: 'triggered',
      hook: 'on-death',
      response: {
        kind: 'apply-status',
        target: { kind: 'all-enemies' },
        status: { statusId: 'poison' },
      },
    },
  ],
}

/** Myconet Gravedigger (amplifier, rare): a genuinely distinct mechanic from BOTH Warder
 * (team-wide buff reaction) and Rotcore (opposing-side burst on ITS OWN death) -- a SELF-sustain
 * reaction instead, drawing nutrients from a fallen ally to heal itself. */
export const MYCONET_GRAVEDIGGER_TRAIT: DescribedTrait = {
  id: 'myconet-gravedigger-reclaim',
  name: 'Reclaim',
  description: 'Whenever an ally dies, it heals itself for 20% of its own maximum HP.',
  effects: [
    {
      category: 'triggered',
      hook: 'on-death-observed',
      observationFilter: { relationship: 'ally' },
      response: {
        kind: 'heal',
        target: { kind: 'self' },
        scalingStat: 'health',
        spellPower: 0.2,
      },
    },
  ],
}

// ---- Necromoss (Wit/Vitality) -- closed mechanic: Reclaim (grim sustain, one shared mechanic
// escalating by rarity, the Resonants pattern -- `content/rotcap-hollow.md#necromoss-witvitality-reclaim` names ONE closed mechanic,
// heal/buff scaling off dead-ally count, not a two-role enabler/payoff chain) ----

/** Necromoss Wisp (common): every turn, heals itself scaled by the LIVE count of its own dead
 * allies (`heal`'s `magnitudeSource`, the Necromoss consumer -- recomputed fresh
 * every firing, never frozen). A no-op until an ally has actually died. */
export const NECROMOSS_WISP_TRAIT: DescribedTrait = {
  id: 'necromoss-wisp-feed-on-loss',
  name: 'Feed on Loss',
  description:
    'At the start of its own turn, heals itself for 5% of its own maximum HP for every dead ally on its side (2 dead allies make a 10% heal).',
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-start',
      response: {
        kind: 'heal',
        target: { kind: 'self' },
        scalingStat: 'health',
        spellPower: 0.05,
        magnitudeSource: { kind: 'count', of: 'dead-allies' },
      },
    },
  ],
}

/** Necromoss Thicket (uncommon): the BUFF half of the same "off dead allies" idea, not the heal
 * half -- a flat +10% Defence every time an ally dies (a fresh `apply-stat-modifier`
 * `StatModifierEffect` per firing, `factor: 1.1`, no `magnitudeSource`): a flat rate per event, not
 * one scaled by the live dead-ally count. The compounding still happens naturally, since
 * a repeating `apply-stat-modifier` trigger APPENDS a fresh modifier each firing and the fold is
 * multiplicative (base x Pi(factors)) -- two deaths is x1.1 x1.1 = x1.21, not one bigger jump. */
export const NECROMOSS_THICKET_TRAIT: DescribedTrait = {
  id: 'necromoss-thicket-grim-ward',
  name: 'Grim Ward',
  description:
    'Whenever an ally dies, its Defence permanently rises by a flat 10%. Each death is a separate +10% on top of the last, not a bigger single jump.',
  effects: [
    {
      category: 'triggered',
      hook: 'on-death-observed',
      observationFilter: { relationship: 'ally' },
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'self' },
        stat: 'defence',
        factor: 1.1,
      },
    },
  ],
}

/** Necromoss Hollowroot (rare, amplifier): every turn, heals the WHOLE living team, each member
 * scaled by the LIVE count of the team's own dead allies (breadth over Wisp's self-only heal, per
 * Swarmhive Queen's own "breadth for the rare tier" precedent). A `support`
 * (species/rotcap-hollow.ts): its trait fires
 * on `on-turn-start` regardless of the chosen action, so casting doesn't blunt it. */
export const NECROMOSS_HOLLOWROOT_TRAIT: DescribedTrait = {
  id: 'necromoss-hollowroot-communal-reclaim',
  name: 'Communal Reclaim',
  description:
    'At the start of its own turn, heals every living ally for 5% of its own maximum HP for every dead ally on its side (2 dead allies heal every ally for 10% of its maximum HP), whatever it casts.',
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-start',
      response: {
        kind: 'heal',
        target: { kind: 'all-allies' },
        scalingStat: 'health',
        spellPower: 0.05,
        magnitudeSource: { kind: 'count', of: 'dead-allies' },
      },
    },
  ],
}

// ---- Hollowkin (Endurance/Instinct) -- closed mechanic: Puppet (Confusion) ----

/** Hollowkin Wretch (enabler, common): whenever an attack or spell strikes it, it lashes back by
 * confusing its attacker (`triggering-source` under `on-damage-taken` = whoever just hit it). */
export const HOLLOWKIN_WRETCH_TRAIT: DescribedTrait = {
  id: 'hollowkin-wretch-madness-touch',
  name: 'Madness Touch',
  description:
    'Whenever an attack or spell hits it, it Confuses the creature that hit it.',
  effects: [
    {
      category: 'triggered',
      hook: 'on-damage-taken',
      damageChannel: 'direct',
      response: {
        kind: 'apply-status',
        target: { kind: 'triggering-source' },
        status: { statusId: 'confusion' },
      },
    },
  ],
}

/** Hollowkin Marionette (enabler, uncommon): infects via touch instead -- every attack confuses
 * whoever it hits (`triggering-source` under `on-attack` = the attack's own target, per
 * Sparkeater Leech's own precedent). */
export const HOLLOWKIN_MARIONETTE_TRAIT: DescribedTrait = {
  id: 'hollowkin-marionette-puppet-strings',
  name: 'Puppet Strings',
  description: 'When it attacks, it Confuses its target.',
  effects: [
    {
      category: 'triggered',
      hook: 'on-attack',
      response: {
        kind: 'apply-status',
        target: { kind: 'triggering-source' },
        status: { statusId: 'confusion' },
      },
    },
  ],
}

/** Hollowkin Puppeteer (payoff, rare): the amplifier that neither species-mate is -- it never
 * applies Confusion itself, it PROFITS from it (`conditional-damage-bonus`, the same "+% to
 * [status] targets" shape Ambusher/Lullpollen Reaper/Gloomjaw Stalker already use). */
export const HOLLOWKIN_PUPPETEER_TRAIT: DescribedTrait = {
  id: 'hollowkin-puppeteer-strike-the-confused',
  name: 'Strike the Confused',
  description: 'Deals 30% more damage to Confused enemies.',
  effects: [
    {
      category: 'conditional-damage-bonus',
      percent: 0.3,
      condition: { kind: 'has-status', subject: 'target', statusId: 'confusion' },
    },
  ],
}

// ---- Sporch (Violence/Wit) -- closed mechanic: Strong non-spreading Burn ----

/** Sporch Igniter (enabler, common): every attack brands its target with a Burn (one instance;
 * the Burn's potency is the Igniter's own Intelligence) --
 * deliberately no spread mechanic on the status itself (unlike Spore), per `content/rotcap-hollow.md#sporch-violencewit-strong-non-spreading-burn`. */
export const SPORCH_IGNITER_TRAIT: DescribedTrait = {
  id: 'sporch-igniter-brand',
  name: 'Brand',
  description: 'When it attacks, it Burns its target.',
  effects: [
    {
      category: 'triggered',
      hook: 'on-attack',
      response: {
        kind: 'apply-status',
        target: { kind: 'triggering-source' },
        status: { statusId: 'burn' },
      },
    },
  ],
}

/** Sporch Ashborn (payoff, uncommon): +% damage to Burning enemies
 * (`content/rotcap-hollow.md#sporch-ashborn`), the target-conditional
 * damage-modifier this species needs -- +% damage to any enemy currently Burning. */
export const SPORCH_ASHBORN_TRAIT: DescribedTrait = {
  id: 'sporch-ashborn-fan-the-flames',
  name: 'Fan the Flames',
  description: 'Deals 30% more damage to Burning enemies.',
  effects: [
    {
      category: 'conditional-damage-bonus',
      percent: 0.3,
      condition: { kind: 'has-status', subject: 'target', statusId: 'burn' },
    },
  ],
}

/** Sporch Cinderlord (amplifier, rare): a genuinely distinct mechanic from both Igniter
 * (per-hit application) and Ashborn (a passive payoff) -- every kill detonates a fresh burst of
 * Burn across the WHOLE remaining opposing side. Still not the STATUS spreading itself (Burn
 * carries no on-death trigger, unlike Spore) -- this is a CREATURE's own on-kill response,
 * keeping "non-spreading Burn" intact at the status level. */
export const SPORCH_CINDERLORD_TRAIT: DescribedTrait = {
  id: 'sporch-cinderlord-immolate',
  name: 'Immolate',
  description: 'Every kill it lands applies Burn to every remaining enemy.',
  effects: [
    {
      category: 'triggered',
      hook: 'on-kill',
      response: {
        kind: 'apply-status',
        target: { kind: 'all-enemies' },
        // One Burn per remaining enemy, each snapshotting the Cinderlord's own Intelligence
        // (a re-application keeps the stronger snapshot and refreshes the timer).
        status: { statusId: 'burn' },
      },
    },
  ],
}

// ---- The Rot Sovereign (floor-30 boss, the biome-3 finale) ----
// `content/rotcap-hollow.md#rot-sovereign`. One death-reactive growth hook: a flat +10% Attack per
// death, ONE `on-death-observed` trigger with relationship `any` (her own adds and the player's
// creatures dying alike), so ANY creature that dies feeds her at the same rate. A flat per-event
// factor (no `magnitudeSource` freeze-at-application) still compounds across repeated firings
// without needing a live count (see Necromoss Thicket's own comment). Plus the spreading-Spore
// blanket, unconditional each of her own turns.

export const ROT_SOVEREIGN_TRAIT: DescribedTrait = {
  id: 'rot-sovereign-attrition',
  name: 'Attrition',
  description:
    'Whenever a creature dies on either side (one of her own, adds included, or one of yours), her Attack permanently rises by a flat 10%, the same rate either way. Each death is a separate +10% on top of the last. At the start of each of her own turns, she blankets the entire opposing side with Spore.',
  effects: [
    {
      category: 'triggered',
      hook: 'on-death-observed',
      observationFilter: { relationship: 'any' },
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'self' },
        stat: 'attack',
        factor: 1.1,
      },
    },
    {
      category: 'triggered',
      hook: 'on-turn-start',
      response: {
        kind: 'apply-status',
        target: { kind: 'all-enemies' },
        status: { statusId: 'spore' },
      },
    },
  ],
}
