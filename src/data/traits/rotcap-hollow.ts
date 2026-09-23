import type { Trait } from '../../engine/effect-types'

// ---- Phase 4 Slice H3: Rotcap Hollow (floors 21-30) -- real per-species content, built entirely
// on primitives already proven through Slice E2/H2 (no new engine work needed for any TRAIT here
// -- the one genuinely new piece this slice adds, Spore's `random-ally-without-status` target, is
// a ResponseTarget-only addition living in data/statuses.ts's SPORE, not a species trait). Player-
// facing plain-language descriptions with exact numbers live in .claude/content/rotcap-hollow.md
// -- kept in sync with the numbers below.
//
// Same enabler/payoff/amplifier framing (common/uncommon/rare) as Overgrowth/Glimmerdark, except
// Necromoss -- like Resonants (H2) -- shares ONE mechanic across all three creatures, escalating
// scope/strength by rarity (species-locked.md's own "heal/buff scaling off dead-ally count" is a
// single closed mechanic, not a two-role enabler/payoff chain).

// ---- Sporecloud (Wit) -- closed mechanic: Contagion (Spore) ----

/** Sporecloud Seeder (enabler, common): every attack infects its target with Spore -- the
 * biome's signature DoT (data/statuses.ts's SPORE), which itself spreads to a fresh host when
 * its bearer dies. */
export const SPORECLOUD_SEEDER_TRAIT: Trait = {
  id: 'sporecloud-seeder-infest',
  name: 'Infest',
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
export const SPORECLOUD_REAPER_TRAIT: Trait = {
  id: 'sporecloud-reaper-bloomburst',
  name: 'Bloomburst',
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
 * Reaper -- breadth over depth (the same "team-wide burst vs. per-hit trickle" shape Glowfly
 * Radiant established in H2): once at fight-start, it seeds the WHOLE enemy line with Spore at
 * once, rather than infecting one target per attack. */
export const SPORECLOUD_BLOOMER_TRAIT: Trait = {
  id: 'sporecloud-bloomer-spore-burst',
  name: 'Spore Burst',
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
 * dies -- not just its own kills (`on-enemy-death`, an OBSERVER hook, unlike `on-kill`'s
 * actor-self scoping) -- a fresh StatModifierEffect each firing, compounding as the fight thins
 * out the opposing side. */
export const ROTFEEDER_SCAVENGER_TRAIT: Trait = {
  id: 'rotfeeder-scavenger-carrion-hunger',
  name: 'Carrion Hunger',
  effects: [
    {
      category: 'triggered',
      hook: 'on-enemy-death',
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
export const ROTFEEDER_RIPPER_TRAIT: Trait = {
  id: 'rotfeeder-ripper-gorge',
  name: 'Gorge',
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
export const ROTFEEDER_GORGEMAW_TRAIT: Trait = {
  id: 'rotfeeder-gorgemaw-gluttony',
  name: 'Gluttony',
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
export const MYCONET_WARDER_TRAIT: Trait = {
  id: 'myconet-warder-network-response',
  name: 'Network Response',
  effects: [
    {
      category: 'triggered',
      hook: 'on-ally-death',
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
 * whole opposing side -- a retaliatory death-burst, `all-enemies` (already built, Slice B). */
export const MYCONET_ROTCORE_TRAIT: Trait = {
  id: 'myconet-rotcore-death-bloom',
  name: 'Death Bloom',
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
export const MYCONET_GRAVEDIGGER_TRAIT: Trait = {
  id: 'myconet-gravedigger-reclaim',
  name: 'Reclaim',
  effects: [
    {
      category: 'triggered',
      hook: 'on-ally-death',
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
// escalating by rarity, the Resonants/H2 pattern -- species-locked.md names ONE closed mechanic,
// "heal/buff scaling off dead-ally count", not a two-role enabler/payoff chain) ----

/** Necromoss Wisp (common): every turn, heals itself scaled by the LIVE count of its own dead
 * allies (`heal`'s `magnitudeSource`, Slice E2's named Necromoss consumer -- recomputed fresh
 * every firing, never frozen). A no-op until an ally has actually died. */
export const NECROMOSS_WISP_TRAIT: Trait = {
  id: 'necromoss-wisp-feed-on-loss',
  name: 'Feed on Loss',
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
 * `StatModifierEffect` per firing, `factor: 1.1`, no `magnitudeSource`). PR #64 review: the
 * earlier draft scaled the SAME response's own `factor` by the live dead-ally count
 * (freeze-at-application) so a single death's rise grew with how many had already died -- the
 * review simplified this to a flat rate per event; the compounding still happens naturally, since
 * a repeating `apply-stat-modifier` trigger APPENDS a fresh modifier each firing and the fold is
 * multiplicative (base x Pi(factors)) -- two deaths is x1.1 x1.1 = x1.21, not one bigger jump. */
export const NECROMOSS_THICKET_TRAIT: Trait = {
  id: 'necromoss-thicket-grim-ward',
  name: 'Grim Ward',
  effects: [
    {
      category: 'triggered',
      hook: 'on-ally-death',
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
 * Glowfly Radiant/Swarmhive Queen's own "breadth for the rare tier" precedent). The biome's one
 * cast-role creature (`defaultScriptId: 'always-cast'`, species/rotcap-hollow.ts): its trait fires
 * on `on-turn-start` regardless of the chosen action, so casting doesn't blunt it. */
export const NECROMOSS_HOLLOWROOT_TRAIT: Trait = {
  id: 'necromoss-hollowroot-communal-reclaim',
  name: 'Communal Reclaim',
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

/** Hollowkin Wretch (enabler, common): whenever it's struck, it lashes back by confusing its
 * attacker (`triggering-source` under `on-damage-taken` = whoever just hit it). */
export const HOLLOWKIN_WRETCH_TRAIT: Trait = {
  id: 'hollowkin-wretch-madness-touch',
  name: 'Madness Touch',
  effects: [
    {
      category: 'triggered',
      hook: 'on-damage-taken',
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
export const HOLLOWKIN_MARIONETTE_TRAIT: Trait = {
  id: 'hollowkin-marionette-puppet-strings',
  name: 'Puppet Strings',
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
export const HOLLOWKIN_PUPPETEER_TRAIT: Trait = {
  id: 'hollowkin-puppeteer-strike-the-confused',
  name: 'Strike the Confused',
  effects: [
    {
      category: 'conditional-damage-bonus',
      percent: 0.3,
      condition: { kind: 'has-status', subject: 'target', statusId: 'confusion' },
    },
  ],
}

// ---- Sporch (Violence/Wit) -- closed mechanic: Strong non-spreading Burn ----

/** Sporch Igniter (enabler, common): every attack brands its target with a potent (2-stack)
 * Burn -- deliberately no spread mechanic on the status itself (unlike Spore), per
 * species-locked.md's own "strong non-spreading Burn". */
export const SPORCH_IGNITER_TRAIT: Trait = {
  id: 'sporch-igniter-brand',
  name: 'Brand',
  effects: [
    {
      category: 'triggered',
      hook: 'on-attack',
      response: {
        kind: 'apply-status',
        target: { kind: 'triggering-source' },
        status: { statusId: 'burn', stacks: 2 },
      },
    },
  ],
}

/** Sporch Ashborn (payoff, uncommon): "+% to Burning" (species-locked.md), the target-conditional
 * damage-modifier this species needed Slice E2 for -- +% damage to any enemy currently Burning. */
export const SPORCH_ASHBORN_TRAIT: Trait = {
  id: 'sporch-ashborn-fan-the-flames',
  name: 'Fan the Flames',
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
export const SPORCH_CINDERLORD_TRAIT: Trait = {
  id: 'sporch-cinderlord-immolate',
  name: 'Immolate',
  effects: [
    {
      category: 'triggered',
      hook: 'on-kill',
      response: {
        kind: 'apply-status',
        target: { kind: 'all-enemies' },
        // PR #64 review fix 6: `stacks: 1` written explicitly rather than relying on
        // StatusSpec's own default (also 1) -- makes the intent (exactly one fresh Burn stack
        // per remaining enemy, stacking toward Burn's own cap like any other application) visible
        // at the call site instead of implicit.
        status: { statusId: 'burn', stacks: 1 },
      },
    },
  ],
}

// ---- The Rot Sovereign (floor-30 boss, the biome-3 finale) ----
// species-locked.md: "Attrition-management (finale) ... Grows via count-scaling off deaths (any
// creature that dies feeds it) + blankets the party in spreading Spore. Puzzle = don't-feed-it +
// out-manage the rot, not pure DPS." Two death-reactive growth hooks, BOTH a flat +10% Attack per
// death -- `on-ally-death` (her own adds dying) and `on-enemy-death` (the player's own creatures
// dying), the SAME rate either way, realizing "ANY creature that dies feeds it" without needing
// death-side to change the magnitude. PR #64 review: the earlier draft used `magnitudeSource`
// (freeze-at-application) on the on-ally-death half only, at a different rate (+15%) than the
// flat on-enemy-death half (+5%) -- the review simplified both to the same flat +10% per event
// (see Necromoss Thicket's own comment for why a flat per-event factor still compounds across
// repeated firings without needing a live count). Plus the spreading-Spore blanket, unconditional
// each of her own turns.

export const ROT_SOVEREIGN_TRAIT: Trait = {
  id: 'rot-sovereign-attrition',
  name: 'Attrition',
  effects: [
    {
      category: 'triggered',
      hook: 'on-ally-death',
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'self' },
        stat: 'attack',
        factor: 1.1,
      },
    },
    {
      category: 'triggered',
      hook: 'on-enemy-death',
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
