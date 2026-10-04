// Phase 4.1-E (A2): `perform-action` unit coverage beyond the goldens -- where each scope drains its
// grants, who may act, the load-time rejections and the guard lint helpers. The goldens
// (golden-e-*, the re-derived granted-cast/echo goldens) pin the end-to-end logs; each test here is
// the one that fails with its mechanism removed (the PR lists the mutation for each).

import { describe, expect, it } from 'vitest'
import { createCombat, resolveTurn } from './combat'
import { createResolutionContext, drainGrantedActions } from './actions'
import { fireHook, newCascade } from './resolution'
import { updateCreature } from './creature-lookup'
import {
  createEffectInstanceId,
  findUnguardedPerformActions,
  findUnguardedStatusPerformActions,
  hasRealGuard,
  validateNoRandomSelectorInResponseTargets,
  validateSpellEffects,
  validateStatusNoRandomSelectorInResponseTargets,
} from './effect-types'
import { createCreatureId } from './ids'
import { makeParty } from './__fixtures__/creatures'
import { STOCK_SCRIPTS_BY_ID } from '../data/scripts'
import { STUN } from '../data/statuses'
import type { CombatEvent, CombatState, Spell } from './types'
import type {
  ActiveEffect,
  ConditionStatusDef,
  EffectDef,
  StatusDef,
  Trait,
} from './effect-types'
import type { Intent } from './scripting-types'

const BOLT: Spell = {
  id: 'bolt-fixture',
  name: 'Bolt (fixture)',
  targetShape: 'single',
  affinity: 'vitality',
  targetSide: 'enemy',
  unlockedAtBiome: 1,
  effects: [
    {
      kind: 'deal-damage',
      target: { kind: 'cast-target' },
      offStat: 'cast',
      spellPower: 0.5,
    },
  ],
}

const RANDOM_CAST: Intent = { action: { kind: 'cast', gemSlot: 'random' } }
const DEFEND: Intent = { action: { kind: 'defend' } }
const WAIT: Intent = { action: { kind: 'wait' } }

function grantTrigger(
  hook: 'on-fight-start' | 'on-turn-start' | 'on-turn-end' | 'on-round-end' | 'on-attack',
  intent: Intent,
): EffectDef {
  return {
    category: 'triggered',
    hook,
    chancePercent: 100,
    response: { kind: 'perform-action', actor: 'self', intent },
  }
}

/** A trigger that emits only its own `TriggerFired` (a grant-action-state with neither flag). */
function markerTrigger(hook: 'on-turn-end'): EffectDef {
  return {
    category: 'triggered',
    hook,
    response: { kind: 'grant-action-state', target: { kind: 'self' } },
  }
}

function setup(
  effects: readonly EffectDef[],
  options: { stun?: boolean; script?: string; foeScript?: string } = {},
): CombatState {
  const trait: Trait = { id: 'x-trait', name: 'X (fixture)', effects }
  return createCombat({
    seed: 1,
    player: {
      party: makeParty('player', [
        {
          id: 'x',
          health: 100,
          speed: 20,
          scriptId: options.script ?? 'always-wait',
          innateTraitIds: [trait.id],
        },
      ]),
    },
    enemy: {
      party: makeParty('enemy', [
        {
          id: 'foe',
          health: 100,
          speed: 1,
          scriptId: options.foeScript ?? 'always-wait',
        },
      ]),
    },
    registries: {
      scripts: STOCK_SCRIPTS_BY_ID,
      traits: new Map([[trait.id, trait]]),
      statuses: new Map([[STUN.statusId, STUN]]),
    },
  })
}

const types = (events: readonly CombatEvent[]) => events.map((e) => e.type)

describe('where each scope drains its grants (ASSUMPTION 3)', () => {
  it("a turn-start grant runs AFTER the turn-start cleanup: a granted Defend survives that turn's cleanup", () => {
    const { events, state } = resolveTurn(setup([grantTrigger('on-turn-start', DEFEND)]))
    expect(types(events)).toEqual([
      'FightStarted',
      'RoundStarted',
      'TurnStarted',
      'TriggerFired',
      'ActionGranted',
      'Defended',
      'Waited',
      'TurnEnded',
    ])
    // A drain BEFORE the cleanup would end the fresh Defend at once (ActionStateEnded).
    expect(events.some((e) => e.type === 'ActionStateEnded')).toBe(false)
    expect(state.playerParty[0]?.defending).toBe(true)
  })

  it('a turn-start grant on a SKIPPED turn is refused (the skip gate covers the turn-start drain, not just the turn-end one)', () => {
    // Stun is applied at fight start; its on-turn-start suppression sets the turn's skip flag in the
    // same hook pass that queued the Defend, so the grant must be refused when it would run.
    const stunAtStart: EffectDef = {
      category: 'triggered',
      hook: 'on-fight-start',
      response: {
        kind: 'apply-status',
        target: { kind: 'self' },
        status: { statusId: STUN.statusId, duration: 3 },
      },
    }
    const { events, state } = resolveTurn(
      setup([grantTrigger('on-turn-start', DEFEND), stunAtStart]),
    )
    expect(events.some((e) => e.type === 'ActionGranted')).toBe(false)
    expect(events.some((e) => e.type === 'Defended')).toBe(false)
    expect(state.playerParty[0]?.defending).toBe(false)
    // The chance WAS rolled and the trigger shown (only the grant is refused).
    expect(
      events.filter((e) => e.type === 'TriggerFired' && e.hook === 'on-turn-start'),
    ).toHaveLength(2) // the grant's trigger + Stun's own suppression
  })

  it("the chosen action's grants run right after it, BEFORE the turn-end hooks", () => {
    const { events } = resolveTurn(
      setup([grantTrigger('on-attack', WAIT), markerTrigger('on-turn-end')], {
        script: 'always-attack',
      }),
    )
    // The turn-end hook's TriggerFired falls between the two candidate positions: the grant already
    // ran (ActionGranted, Waited) when the turn-end hooks fire. Draining in the turn-end step
    // instead would put the marker first.
    expect(types(events)).toEqual([
      'FightStarted',
      'RoundStarted',
      'TurnStarted',
      'AttackDeclared',
      'TriggerFired', // on-attack: queues the Wait
      'DamageDealt',
      'ActionGranted',
      'Waited',
      'TriggerFired', // on-turn-end marker
      'TurnEnded',
    ])
  })

  it("the turn-end hooks' grants run in the granted-actions step, before TurnEnded", () => {
    const { events } = resolveTurn(setup([grantTrigger('on-turn-end', WAIT)]))
    expect(types(events).slice(2)).toEqual([
      'TurnStarted',
      'Waited', // the turn's own action
      'TriggerFired',
      'ActionGranted',
      'Waited', // the grant
      'TurnEnded',
    ])
  })

  it('fight-start grants run right after the fight-start hooks, before RoundStarted', () => {
    const { events } = resolveTurn(setup([grantTrigger('on-fight-start', WAIT)]))
    expect(types(events).slice(0, 5)).toEqual([
      'FightStarted',
      'TriggerFired',
      'ActionGranted',
      'Waited',
      'RoundStarted',
    ])
  })

  it('round-end grants run right after the on-round-end pass, before the next RoundStarted', () => {
    let state = setup([grantTrigger('on-round-end', WAIT)])
    state = resolveTurn(state).state // round 1: X
    state = resolveTurn(state).state // round 1: foe
    const { events } = resolveTurn(state) // the round-end sweep, then round 2
    expect(types(events).slice(0, 4)).toEqual([
      'TriggerFired',
      'ActionGranted',
      'Waited',
      'RoundStarted',
    ])
  })
})

describe('who acts (ASSUMPTIONS 6, 9) and the skip gate', () => {
  function bareState(): CombatState {
    return createCombat({
      seed: 1,
      player: {
        party: makeParty('player', [
          { id: 'bearer', equippedSpells: [BOLT], scriptId: 'always-wait' },
          { id: 'caster', equippedSpells: [BOLT], scriptId: 'always-wait' },
        ]),
      },
      enemy: { party: makeParty('enemy', [{ id: 'foe', health: 100 }]) },
      registries: { scripts: STOCK_SCRIPTS_BY_ID },
    })
  }
  const BEARER = createCreatureId('bearer')
  const CASTER = createCreatureId('caster')

  it("actor: 'triggering-source' is the hook's source INCLUDING the bearer (Overtone echoes its own casts)", () => {
    const echo: EffectDef = {
      category: 'triggered',
      hook: 'on-action-observed',
      observationFilter: { relationship: 'ally', actionKind: 'cast' },
      chancePercent: 100,
      response: {
        kind: 'perform-action',
        actor: 'triggering-source',
        intent: RANDOM_CAST,
      },
    }
    const state = updateCreature(bareState(), BEARER, {
      activeEffects: [
        {
          ...echo,
          instanceId: createEffectInstanceId('echo#1'),
          sourceTraitId: 'echo-fixture',
        } as ActiveEffect,
      ],
    })
    const ctx = createResolutionContext([], newCascade())
    // The bearer is BOTH the observer and the observed actor.
    fireHook('on-action-observed', [BEARER], BEARER, state, ctx, {
      observed: { actionKind: 'cast', instanceIndex: 0 },
    })
    expect(ctx.grants).toHaveLength(1)
    expect(ctx.grants[0]).toMatchObject({ sourceId: BEARER, actorId: BEARER })
  })

  it("the bearer dying does NOT cancel a queued grant -- only the actor's state decides", () => {
    const state = updateCreature(bareState(), BEARER, { alive: false })
    const events: CombatEvent[] = []
    const ctx = createResolutionContext(events, newCascade())
    ctx.grants.push({
      sourceId: BEARER,
      actorId: CASTER,
      intent: RANDOM_CAST,
      effectId: 'grant-fixture',
      depth: 1,
    })
    drainGrantedActions(ctx, state)
    expect(types(events)).toEqual(['ActionGranted', 'SpellCast', 'DamageDealt'])
  })

  it('a grant whose ACTOR is dead is refused and emits nothing', () => {
    const state = updateCreature(bareState(), CASTER, { alive: false })
    const events: CombatEvent[] = []
    const ctx = createResolutionContext(events, newCascade())
    ctx.grants.push({
      sourceId: BEARER,
      actorId: CASTER,
      intent: RANDOM_CAST,
      effectId: 'grant-fixture',
      depth: 1,
    })
    drainGrantedActions(ctx, state)
    expect(events).toEqual([])
  })

  it("skippedTurnOf refuses only that creature's grants", () => {
    const events: CombatEvent[] = []
    const ctx = createResolutionContext(events, newCascade())
    for (const actorId of [CASTER, BEARER]) {
      ctx.grants.push({
        sourceId: BEARER,
        actorId,
        intent: RANDOM_CAST,
        effectId: 'grant-fixture',
        depth: 1,
      })
    }
    drainGrantedActions(ctx, bareState(), { skippedTurnOf: CASTER })
    expect(events.filter((e) => e.type === 'ActionGranted')).toEqual([
      {
        type: 'ActionGranted',
        sourceId: BEARER,
        actorId: BEARER,
        effectId: 'grant-fixture',
      },
    ])
  })
})

describe('load-time rejections (ASSUMPTION 7)', () => {
  const performAction = {
    kind: 'perform-action',
    actor: 'self',
    intent: RANDOM_CAST,
  } as const

  it("a spell's effect list rejects perform-action", () => {
    expect(() => validateSpellEffects({ ...BOLT, effects: [performAction] })).toThrow(
      /not allowed in a spell/,
    )
  })

  it("consume-stacks' wrapped effect rejects perform-action (traits and perks)", () => {
    const wrapped: EffectDef = {
      category: 'triggered',
      hook: 'on-turn-end',
      chancePercent: 50,
      response: { kind: 'consume-stacks', statusId: 'glow', effect: performAction },
    }
    expect(() => validateNoRandomSelectorInResponseTargets([wrapped])).toThrow(
      /wraps 'perform-action' inside consume-stacks/,
    )
  })

  it("consume-stacks' wrapped effect rejects perform-action (status triggers)", () => {
    const status: ConditionStatusDef = {
      category: 'condition-status',
      statusId: 'wrapped-fixture',
      cap: 1,
      polarity: 'debuff',
      defaultDuration: 1,
      triggers: [
        {
          hook: 'on-turn-end',
          chancePercent: 50,
          response: { kind: 'consume-stacks', statusId: 'glow', effect: performAction },
        },
      ],
    }
    expect(() => validateStatusNoRandomSelectorInResponseTargets(status)).toThrow(
      /wraps 'perform-action' inside consume-stacks/,
    )
  })

  it("a plain perform-action may carry the intent-only 'random' target selector", () => {
    const echo: EffectDef = {
      category: 'triggered',
      hook: 'on-action-observed',
      chancePercent: 10,
      response: {
        kind: 'perform-action',
        actor: 'triggering-source',
        intent: {
          action: { kind: 'cast', gemSlot: 'random' },
          targeting: { kind: 'random' },
        },
      },
    }
    expect(() => validateNoRandomSelectorInResponseTargets([echo])).not.toThrow()
  })
})

describe('the guard lint helpers (ASSUMPTION 7)', () => {
  it('a real guard is a chancePercent below 100, or a condition other than `always`', () => {
    expect(hasRealGuard({ chancePercent: 50 })).toBe(true)
    expect(hasRealGuard({ chancePercent: 99 })).toBe(true)
    expect(
      hasRealGuard({
        condition: {
          kind: 'has-status',
          subject: 'self',
          statusId: 'poison',
        },
      }),
    ).toBe(true)
  })

  it('chancePercent 100, `always` and no guard at all are NOT real guards', () => {
    expect(hasRealGuard({ chancePercent: 100 })).toBe(false)
    expect(hasRealGuard({ condition: { kind: 'always' } })).toBe(false)
    expect(hasRealGuard({ chancePercent: 100, condition: { kind: 'always' } })).toBe(
      false,
    )
    expect(hasRealGuard({})).toBe(false)
  })

  it('findUnguardedPerformActions reports exactly the unguarded perform-action triggers', () => {
    const guarded = grantTrigger('on-turn-end', WAIT)
    const half: EffectDef = { ...(guarded as object), chancePercent: 50 } as EffectDef
    const unconditional: EffectDef = {
      category: 'triggered',
      hook: 'on-turn-end',
      response: { kind: 'perform-action', actor: 'self', intent: WAIT },
    }
    const other: EffectDef = markerTrigger('on-turn-end') // not a perform-action: never reported
    expect(findUnguardedPerformActions([half, unconditional, guarded, other])).toEqual([
      unconditional,
      guarded, // chancePercent 100 is the trivially-true guard
    ])
  })

  it('findUnguardedStatusPerformActions covers status triggers too', () => {
    const status: StatusDef = {
      category: 'condition-status',
      statusId: 'grant-status-fixture',
      cap: 1,
      polarity: 'buff',
      defaultDuration: 1,
      triggers: [
        {
          hook: 'on-turn-end',
          response: { kind: 'perform-action', actor: 'self', intent: WAIT },
        },
      ],
    }
    expect(findUnguardedStatusPerformActions(status)).toHaveLength(1)
  })
})
