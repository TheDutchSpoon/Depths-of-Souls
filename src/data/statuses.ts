import { validateStatusDef } from '../engine/effect-types'
import type { StatusDef } from '../engine/effect-types'

// Status content. Since Phase 4.1-F1 (A3) every status is the same shape: a container
// `{ statusId, polarity, defaultDuration, effects: EffectDef[], potency? }` of ordinary effects
// (the ones a trait carries), read through the engine's one effect iterator -- no per-status
// special-casing in the engine, and no bespoke status categories. Since 4.1-H2b2 a status is
// SINGLE-INSTANCE: a re-application keeps the stronger value and refreshes the timer.
//
// A TICKING status (Poison, Burn, Regen, Spore) declares a `potency`: a percent of the APPLIER's
// effective stat, recorded once at application as the instance's snapshot (applier, affinity,
// potency). Its tick is the `snapshot-potency` magnitude: indirect damage (or a heal) from that
// snapshot, with the applier as its source while it lives. The percentages were chosen at the
// 4.1-H2d grill (ASSUMPTION 152): Poison 40% of Attack, Burn 35% of Intelligence, Spore 35% of
// Speed, Regen 10% of Health.

/** DoT: each bearer turn (on-turn-end) the bearer takes the instance's potency -- 20% of the
 * APPLIER's effective Attack when applied (decided at the 4.1-H2d grill; 20% before) -- as INDIRECT damage from the applier's
 * snapshot (affinity of the applier against the bearer, the bearer's Defence at a fifth, the
 * bearer's taken factors; no dealt pool). No TriggerFired per tick -- its StatusApplied already
 * announced it. */
export const POISON: StatusDef = {
  statusId: 'poison',
  potency: { ofStat: 'attack', percent: 40 },
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-end',
      response: {
        kind: 'deal-damage',
        target: { kind: 'self' },
        flatAmount: { kind: 'snapshot-potency' },
        emitTriggerFired: false,
        damageSource: 'dot',
      },
    },
  ],
  polarity: 'debuff',
  // Phase 4 Slice F (review amendment): every real producer (VENOM_BOLT, golden-dot) already
  // applies Poison with an explicit duration:3, so this default is never actually read by
  // current content -- picked to match that existing usage for documentation honesty.
  defaultDuration: 3,
}

/** DoT: as POISON, but the potency is 35% of the APPLIER's effective Intelligence when applied
 * (decided at the 4.1-H2d grill; 25% before). */
export const BURN: StatusDef = {
  statusId: 'burn',
  potency: { ofStat: 'intelligence', percent: 35 },
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-end',
      response: {
        kind: 'deal-damage',
        target: { kind: 'self' },
        flatAmount: { kind: 'snapshot-potency' },
        emitTriggerFired: false,
        damageSource: 'dot',
      },
    },
  ],
  polarity: 'debuff',
  // No real producer applies Burn with a bare default (Withering Bolt and Sporch pass 3);
  // placeholder matching its DoT sibling Poison's own default.
  defaultDuration: 3,
}

/** HoT: each bearer turn (on-turn-end) the bearer is healed the instance's potency -- 10% of the
 * HEALER's (the applier's) effective Health when applied (kept at the 4.1-H2d grill) -- clamped to the bearer's
 * effective max Health (no auto-heal past it). The healer's snapshot, mirrored onto heal; the
 * HealApplied source is the healer while it lives, else the bearer. */
export const REGEN: StatusDef = {
  statusId: 'regen',
  potency: { ofStat: 'health', percent: 10 },
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-end',
      response: {
        kind: 'heal',
        target: { kind: 'self' },
        flatAmount: { kind: 'snapshot-potency' },
        emitTriggerFired: false,
      },
    },
  ],
  polarity: 'buff',
  // Matches demoFight.ts's own real usage (duration: 3), never actually read by it.
  defaultDuration: 3,
}

/** Just a status carrying a passive `action-lock { scope: 'all' }` (4.1-F1): when the bearer's turn
 * comes up it is skipped (`TurnSkipped`), and every action it could take, chosen or granted, is
 * illegal. No special resolver branch. */
export const STUN: StatusDef = {
  statusId: 'stun',
  effects: [{ category: 'action-lock', scope: 'all' }],
  polarity: 'debuff',
  // Matches REELING's own real usage (duration: 1), never actually read by it.
  defaultDuration: 1,
}

/** Damage-modifier: -20% damage DEALT, additive into (1 + Σ dealtMods). One instance
 * (GAME_DESIGN: "one instance + duration"). */
export const WEAKEN: StatusDef = {
  statusId: 'weaken',
  effects: [{ category: 'damage-modifier', direction: 'dealt', magnitude: -0.2 }],
  polarity: 'debuff',
  // Phase 4 Slice F (review amendment): Concussive Blows (data/specializations.ts) now omits
  // its own explicit duration entirely, inheriting this.
  defaultDuration: 3,
}

/** Damage-modifier: x1.5 damage TAKEN, once (4.1-H2b2: single-instance, so a re-application
 * refreshes the timer and never compounds to 2.25). Multiplicative: it enters Π(takenFactors). */
export const VULNERABILITY: StatusDef = {
  statusId: 'vulnerability',
  effects: [{ category: 'damage-modifier', direction: 'taken', magnitude: 1.5 }],
  polarity: 'debuff',
  // Matches combat.test.ts's own real usage (duration: 3), never actually read by it.
  defaultDuration: 3,
}

/** Phase 4 Slice H1 (The Overgrowth, Spiders): a Webbed creature acts LAST until it breaks free
 * -- a `turn-order` effect at `position: 'last'` (Blindclaws' H2 act-first grant-act-first status
 * will be the SAME primitive at the opposite pole -- "same tool, opposite pole" per
 * species-locked.md). Deliberately light per the design doc: a 10%/turn break-free roll
 * (`breakChancePercent`, Slice E2's already-built mechanism -- rolled at every creature's
 * turn-end cleanup against every Web-bearer, ~72% free within one round) with a 3-turn duration as a
 * bad-luck backstop (`defaultDuration`) -- the reward lives in Spiders' Ambusher exploit
 * (+% damage to Webbed), not in the status itself lasting long. Re-applying Web to an
 * already-Webbed target just refreshes it. */
export const WEB: StatusDef = {
  statusId: 'web',
  effects: [{ category: 'turn-order', position: 'last', breakChancePercent: 10 }],
  polarity: 'debuff',
  defaultDuration: 3,
}

/** Phase 4 Slice H1 (The Overgrowth, Lullpollen): a status with TWO effects (its 'all' lock
 * plus a trigger -- Sleep was the first status to need more than one),
 * mirroring Stun's 'all' action-lock exactly (the sleeper's turn is skipped) PLUS an
 * on-damage-taken -> remove-status(self) wake-up. Because the wake-up fires AFTER damage lands
 * (applyDamageAndEmit's existing on-damage-taken point, post-DamageDealt), a "vs Sleeping" payoff
 * (Lullpollen's Reaper) still reads the target as asleep at the moment its own bonus is gathered
 * -- the hit that wakes the target is also the hit that benefits from the bonus, per the design
 * doc's "the waking hit still lands its vs-Sleeping bonus, then wakes." Default 3 turns if never
 * struck. */
export const SLEEP: StatusDef = {
  statusId: 'sleep',
  effects: [
    { category: 'action-lock', scope: 'all' },
    {
      category: 'triggered',
      hook: 'on-damage-taken',
      response: {
        kind: 'remove-status',
        target: { kind: 'self' },
        filter: { statusId: 'sleep' },
      },
    },
  ],
  polarity: 'debuff',
  defaultDuration: 3,
}

/** Phase 4 Slice H2 (Glimmerdark, Blindclaws): the act-FIRST pole of the same `turn-order`
 * primitive Web (act-last, H1) already proved -- "same tool, opposite pole"
 * (species-locked.md). No `breakChancePercent` -- unlike Web, nothing breaks this early; it just
 * runs its duration. Re-applying just refreshes it. */
export const GRANT_ACT_FIRST: StatusDef = {
  statusId: 'grant-act-first',
  effects: [{ category: 'turn-order', position: 'first' }],
  polarity: 'buff',
  defaultDuration: 3,
}

/** Phase 4 Slice H3 (Rotcap Hollow, Sporecloud): a DoT status with TWO triggers (the
 * Sleep-established pattern for a status needing more than one hook) -- a tick of 35% of the
 * APPLIER's effective Speed (decided at the 4.1-H2d grill; 15% before; same snapshot mechanism as POISON/BURN) each bearer turn
 * (on-turn-end), PLUS an
 * `on-death -> apply-status({kind:'random-ally-without-status', statusId:'spore'}, spore)` --
 * this trigger lives on the STATUS itself (not a species trait), so any Spore bearer spreads it
 * on death regardless of which creature/spell originally applied it. When the bearer dies, the
 * contagion spreads to one living, still-healthy member of the BEARER'S OWN side -- host-relative
 * (ratified reading of "spreads to a living, non-Spored enemy": a fungal contagion spreading
 * through the population it already infected, matching the mood "colonies, spores, decay ...
 * spread", GAME_DESIGN §4). No existing `ResponseTarget` could express "exclude a status" for
 * this pick, so `random-ally-without-status` (effect-types.ts) is a genuinely new
 * `ResponseTarget` variant (PR #64 review: ASSUMPTION 30's original "no new engine primitive"
 * framing did not hold -- see the Slice H3 phase record). It resolves relative to `self` (the
 * dying bearer); when every living ally already carries Spore, resolution.ts's
 * `resolveResponseTargets` returns an empty target list, so the trigger's own `TriggerFired` is
 * still emitted but nothing follows it -- a fizzle, not a silent no-op -- which is what keeps the
 * disease spreading to FRESH hosts instead of endlessly refreshing one.
 *
 * The spread is this status's OWN effect applying this same status, so the engine copies the dying
 * bearer's WHOLE snapshot onto the new host (applier, affinity, potency -- ASSUMPTIONS 143, 145):
 * the new host's ticks are still the original applier's, not the dying bearer's. */
export const SPORE: StatusDef = {
  statusId: 'spore',
  potency: { ofStat: 'speed', percent: 35 },
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-end',
      response: {
        kind: 'deal-damage',
        target: { kind: 'self' },
        flatAmount: { kind: 'snapshot-potency' },
        emitTriggerFired: false,
        damageSource: 'dot',
      },
    },
    {
      category: 'triggered',
      hook: 'on-death',
      response: {
        kind: 'apply-status',
        target: { kind: 'random-ally-without-status', statusId: 'spore' },
        status: { statusId: 'spore' },
      },
    },
  ],
  polarity: 'debuff',
  defaultDuration: 3,
}

/** Phase 4 Slice H3 (Rotcap Hollow, Hollowkin): a `friendly-fire` effect (built in Slice C,
 * given its first real producer/consumer here) -- a 50% roll, consulted once per the bearer's
 * harmful offensive action (species-locked.md's own "3-turn default ... 50% chance it strikes
 * its own side"), that redirects the whole action to the bearer's own living side instead. */
export const CONFUSION: StatusDef = {
  statusId: 'confusion',
  effects: [{ category: 'friendly-fire', chancePercent: 50 }],
  polarity: 'debuff',
  defaultDuration: 3,
}

/** Phase 4.1-F3 (G2): a scoped passive `action-lock` -- the bearer cannot Cast. A scoped lock never
 * skips the turn: the script falls through to its next legal rule, then to the implicit fallback
 * (Attack if legal, else Wait). Refuses a granted cast too (every action source goes through
 * `checkLegality`). Clear Mind (Sorcerer perk) is immunity to it: the status still lands and
 * `has-status` stays true, but the lock is ignored. Counts the bearer's own turns. */
export const SILENCED: StatusDef = {
  statusId: 'silenced',
  effects: [{ category: 'action-lock', scope: 'cast' }],
  polarity: 'debuff',
  defaultDuration: 3,
}

/** Phase 4.1-F3 (G2): Silenced's mirror -- the bearer cannot Attack (`action-lock { scope:
 * 'attack' }`). Aggressive (Brute perk) is immunity to it. Same rules as Silenced. */
export const PACIFIED: StatusDef = {
  statusId: 'pacified',
  effects: [{ category: 'action-lock', scope: 'attack' }],
  polarity: 'debuff',
  defaultDuration: 3,
}

export const STOCK_STATUSES: readonly StatusDef[] = [
  POISON,
  BURN,
  REGEN,
  STUN,
  WEAKEN,
  VULNERABILITY,
  // Phase 4 Slice H1: real per-species Overgrowth statuses (additive -- see the guardrail in
  // phase-4-implementation-plan.md, the Phase 3 representative set above stays untouched).
  WEB,
  SLEEP,
  // Phase 4 Slice H2: real per-species Glimmerdark statuses (additive, same guardrail).
  GRANT_ACT_FIRST,
  // Phase 4 Slice H3: real per-species Rotcap Hollow statuses (additive, same guardrail).
  SPORE,
  CONFUSION,
  // Phase 4.1-F3 (G2): the two scoped locks (appended).
  SILENCED,
  PACIFIED,
]

/** Ready to pass directly as createCombat's `statuses` argument. */
export const STATUS_REGISTRY: ReadonlyMap<string, StatusDef> = new Map(
  STOCK_STATUSES.map((s) => [s.statusId, s]),
)

// Load-time check (4.1-C2a, extended in 4.1-F1) -- throws at import time if any status carries an
// effect a status may not carry (stat-modifier / stat-remap / status-immunity / innate-spell), or
// a trigger targets the intent-only 'random' selector.
for (const status of STOCK_STATUSES) {
  validateStatusDef(status)
}
