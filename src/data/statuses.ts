import type {
  ConditionStatusDef,
  DamageModifierDef,
  StatusDef,
  TurnOrderStatusDef,
} from '../engine/effect-types'

// Representative & temporary Phase 3 status content (replaced when the real roster lands,
// Phase 4+). Each is a data instance of the built condition-status / damage-modifier
// primitives -- no per-status special-casing in the engine.

/** DoT: 3 flat damage per stack per round, bypassing Defence/affinity/pools entirely
 * (GAME_DESIGN: "own value from the source"). No TriggerFired per tick -- its StatusApplied
 * already announced it. */
export const POISON: ConditionStatusDef = {
  category: 'condition-status',
  statusId: 'poison',
  cap: 5,
  triggers: [
    {
      hook: 'on-round-end',
      response: {
        kind: 'deal-damage',
        target: { kind: 'self' },
        flatAmount: 3,
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

/** DoT: 5 flat damage per stack per round. */
export const BURN: ConditionStatusDef = {
  category: 'condition-status',
  statusId: 'burn',
  cap: 3,
  triggers: [
    {
      hook: 'on-round-end',
      response: {
        kind: 'deal-damage',
        target: { kind: 'self' },
        flatAmount: 5,
        emitTriggerFired: false,
        damageSource: 'dot',
      },
    },
  ],
  polarity: 'debuff',
  // No real producer applies Burn yet (representative Phase 3 content); placeholder matching
  // its DoT sibling Poison's own default.
  defaultDuration: 3,
}

/** HoT: 4 flat heal per stack per round, clamped to effective max Health (no auto-heal past it). */
export const REGEN: ConditionStatusDef = {
  category: 'condition-status',
  statusId: 'regen',
  cap: 3,
  triggers: [
    {
      hook: 'on-round-end',
      response: {
        kind: 'heal',
        target: { kind: 'self' },
        amountPerStack: 4,
        emitTriggerFired: false,
      },
    },
  ],
  polarity: 'buff',
  // Matches demoFight.ts's own real usage (duration: 3), never actually read by it.
  defaultDuration: 3,
}

/** Just a condition-status: an on-turn-start suppress-action -- the Phase 1 empty-bracket skip,
 * no special resolver branch. Single-instance (cap 1); stacking would be inert either way. */
export const STUN: ConditionStatusDef = {
  category: 'condition-status',
  statusId: 'stun',
  cap: 1,
  triggers: [{ hook: 'on-turn-start', response: { kind: 'suppress-action' } }],
  polarity: 'debuff',
  // Matches REELING's own real usage (duration: 1), never actually read by it.
  defaultDuration: 1,
}

/** Damage-modifier: -20% damage DEALT per stack, additive into (1 + Σ dealtMods). Capped at
 * 1 stack per GAME_DESIGN ("~1 stack + duration"). */
export const WEAKEN: DamageModifierDef = {
  category: 'damage-modifier',
  statusId: 'weaken',
  direction: 'dealt',
  magnitude: -0.2,
  cap: 1,
  polarity: 'debuff',
  // Phase 4 Slice F (review amendment): Concussive Blows (data/specializations.ts) now omits
  // its own explicit duration entirely, inheriting this.
  defaultDuration: 3,
}

/** Damage-modifier: x1.5 damage TAKEN per stack, multiplicative (Π(takenFactors), compounding
 * via magnitude ** stacks). */
export const VULNERABILITY: DamageModifierDef = {
  category: 'damage-modifier',
  statusId: 'vulnerability',
  direction: 'taken',
  magnitude: 1.5,
  cap: 2,
  polarity: 'debuff',
  // Matches combat.test.ts's own real usage (duration: 3), never actually read by it.
  defaultDuration: 3,
}

/** Phase 4 Slice H1 (The Overgrowth, Spiders): a Webbed creature acts LAST until it breaks free
 * -- a `turn-order-status` at `position: 'last'` (Blindclaws' H2 act-first grant-act-first status
 * will be the SAME primitive at the opposite pole -- "same tool, opposite pole" per
 * species-locked.md). Deliberately light per the design doc: a 10%/turn break-free roll
 * (`breakChancePercent`, Slice E2's already-built mechanism -- rolled at every creature's
 * turn-start against every Web-bearer, ~72% free within one round) with a 3-turn cap as a
 * bad-luck backstop (`defaultDuration`/`cap`) -- the reward lives in Spiders' Ambusher exploit
 * (+% damage to Webbed), not in the status itself lasting long. Single-instance (cap 1):
 * re-applying Web to an already-Webbed target just refreshes it, never stacks. */
export const WEB: TurnOrderStatusDef = {
  category: 'turn-order-status',
  statusId: 'web',
  cap: 1,
  position: 'last',
  breakChancePercent: 10,
  polarity: 'debuff',
  defaultDuration: 3,
}

/** Phase 4 Slice H1 (The Overgrowth, Lullpollen): a condition-status with TWO triggers (per
 * ConditionStatusDef's own doc comment -- Sleep is the first status to need more than one),
 * mirroring Stun's on-turn-start suppress-action exactly (the sleeper's turn is skipped) PLUS an
 * on-damage-taken -> remove-status(self) wake-up. Because the wake-up fires AFTER damage lands
 * (applyDamageAndEmit's existing on-damage-taken point, post-DamageDealt), a "vs Sleeping" payoff
 * (Lullpollen's Reaper) still reads the target as asleep at the moment its own bonus is gathered
 * -- the hit that wakes the target is also the hit that benefits from the bonus, per the design
 * doc's "the waking hit still lands its vs-Sleeping bonus, then wakes." Default 3 turns if never
 * struck; single-instance (cap 1).*/
export const SLEEP: ConditionStatusDef = {
  category: 'condition-status',
  statusId: 'sleep',
  cap: 1,
  triggers: [
    { hook: 'on-turn-start', response: { kind: 'suppress-action' } },
    {
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
]

/** Ready to pass directly as createCombat's `statuses` argument. */
export const STATUS_REGISTRY: ReadonlyMap<string, StatusDef> = new Map(
  STOCK_STATUSES.map((s) => [s.statusId, s]),
)
