import type {
  ConditionStatusDef,
  DamageModifierDef,
  StatusDef,
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
  hook: 'on-round-end',
  response: {
    kind: 'deal-damage',
    target: { kind: 'self' },
    flatAmount: 3,
    emitTriggerFired: false,
    damageSource: 'dot',
  },
}

/** DoT: 5 flat damage per stack per round. */
export const BURN: ConditionStatusDef = {
  category: 'condition-status',
  statusId: 'burn',
  cap: 3,
  hook: 'on-round-end',
  response: {
    kind: 'deal-damage',
    target: { kind: 'self' },
    flatAmount: 5,
    emitTriggerFired: false,
    damageSource: 'dot',
  },
}

/** HoT: 4 flat heal per stack per round, clamped to effective max Health (no auto-heal past it). */
export const REGEN: ConditionStatusDef = {
  category: 'condition-status',
  statusId: 'regen',
  cap: 3,
  hook: 'on-round-end',
  response: {
    kind: 'heal',
    target: { kind: 'self' },
    amountPerStack: 4,
    emitTriggerFired: false,
  },
}

/** Just a condition-status: an on-turn-start suppress-action -- the Phase 1 empty-bracket skip,
 * no special resolver branch. Single-instance (cap 1); stacking would be inert either way. */
export const STUN: ConditionStatusDef = {
  category: 'condition-status',
  statusId: 'stun',
  cap: 1,
  hook: 'on-turn-start',
  response: { kind: 'suppress-action' },
}

/** Damage-modifier: -20% damage DEALT per stack, additive into (1 + Σ dealtMods). Capped at
 * 1 stack per GAME_DESIGN ("~1 stack + duration"). */
export const WEAKEN: DamageModifierDef = {
  category: 'damage-modifier',
  statusId: 'weaken',
  direction: 'dealt',
  magnitude: -0.2,
  cap: 1,
}

/** Damage-modifier: x1.5 damage TAKEN per stack, multiplicative (Π(takenFactors), compounding
 * via magnitude ** stacks). */
export const VULNERABILITY: DamageModifierDef = {
  category: 'damage-modifier',
  statusId: 'vulnerability',
  direction: 'taken',
  magnitude: 1.5,
  cap: 2,
}

export const STOCK_STATUSES: readonly StatusDef[] = [
  POISON,
  BURN,
  REGEN,
  STUN,
  WEAKEN,
  VULNERABILITY,
]

/** Ready to pass directly as createCombat's `statuses` argument. */
export const STATUS_REGISTRY: ReadonlyMap<string, StatusDef> = new Map(
  STOCK_STATUSES.map((s) => [s.statusId, s]),
)
