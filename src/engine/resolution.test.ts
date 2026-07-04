import { describe, expect, it } from 'vitest'
import { createCombat, resolveTurn, resolveFight } from './combat'
import { applyStatus, fireHook, newCascade } from './resolution'
import { getEffectiveStat } from './effective-stats'
import { updateCreature } from './creature-lookup'
import { makeParty } from './__fixtures__/creatures'
import { createCreatureId } from './ids'
import { STOCK_SCRIPTS_BY_ID } from '../data/scripts'
import { TRAIT_REGISTRY } from '../data/traits'
import { MAX_TRIGGER_CASCADE_DEPTH } from './config'
import type { CombatEvent } from './types'
import type { ConditionStatusEffect, StatusDef, Trait } from './effect-types'

function registry(...traits: Trait[]): ReadonlyMap<string, Trait> {
  return new Map(traits.map((t) => [t.id, t]))
}

// A creature acting first (highest speed) attacks a slow, high-HP target holding `trait`; one
// resolveTurn resolves that whole turn (including the target's on-damage-taken reaction).
function firstTurnEventsHitting(
  trait: Trait,
  targetOverrides: Record<string, unknown> = {},
) {
  const player = makeParty('player', [
    {
      id: 'attacker',
      attack: 10,
      defence: 0,
      speed: 20,
      affinity: 'body',
      scriptId: 'always-attack',
    },
  ])
  const enemy = makeParty('enemy', [
    {
      id: 'target',
      health: 40,
      attack: 10,
      defence: 5,
      speed: 1,
      affinity: 'body',
      scriptId: 'always-wait',
      innateTraitIds: [trait.id],
      ...targetOverrides,
    },
  ])
  const initial = createCombat(player, enemy, 1, STOCK_SCRIPTS_BY_ID, registry(trait))
  return resolveTurn(initial).events
}

describe('suppress-action (on-turn-start)', () => {
  const STUN_SELF: Trait = {
    id: 'stun-self',
    name: 'Stun Self',
    effects: [
      {
        category: 'triggered',
        hook: 'on-turn-start',
        response: { kind: 'suppress-action' },
      },
    ],
  }

  it('skips the acting creature’s action entirely (empty bracket, no action event)', () => {
    const player = makeParty('player', [
      {
        id: 'hero',
        attack: 20,
        speed: 20,
        scriptId: 'always-attack',
        innateTraitIds: ['stun-self'],
      },
    ])
    const enemy = makeParty('enemy', [
      { id: 'dummy', health: 30, speed: 1, scriptId: 'always-wait' },
    ])
    const { state, events } = resolveFight(
      createCombat(player, enemy, 1, STOCK_SCRIPTS_BY_ID, registry(STUN_SELF)),
    )

    // Hero is stunned every turn and never attacks; dummy only waits -> nobody can win -> draw.
    expect(state.result).toBe('draw')
    expect(events.some((e) => e.type === 'AttackDeclared')).toBe(false)
    expect(
      events.some(
        (e) =>
          e.type === 'TriggerFired' &&
          e.effectId === 'stun-self' &&
          e.hook === 'on-turn-start',
      ),
    ).toBe(true)
  })
})

describe('apply-stat-modifier response', () => {
  const BOOST_ATTACK: Trait = {
    id: 'boost-attack',
    name: 'Boost Attack',
    effects: [
      {
        category: 'triggered',
        hook: 'on-damage-taken',
        response: {
          kind: 'apply-stat-modifier',
          target: { kind: 'self' },
          stat: 'attack',
          factor: 2,
        },
      },
    ],
  }

  it('emits StatModifierApplied with the concrete effective before/after', () => {
    const events = firstTurnEventsHitting(BOOST_ATTACK, { attack: 10 })
    const applied = events.find((e) => e.type === 'StatModifierApplied')
    expect(applied).toMatchObject({
      type: 'StatModifierApplied',
      stat: 'attack',
      factor: 2,
      effectiveBefore: 10,
      effectiveAfter: 20,
    })
  })
})

describe('health stat-modifier clamps currentHp (HpClamped)', () => {
  const FRAIL_ON_HIT: Trait = {
    id: 'frail-on-hit',
    name: 'Frail',
    effects: [
      {
        category: 'triggered',
        hook: 'on-damage-taken',
        response: {
          kind: 'apply-stat-modifier',
          target: { kind: 'self' },
          stat: 'health',
          factor: 0.5,
        },
      },
    ],
  }

  it('emits StatModifierApplied then HpClamped when the lowered max drops below currentHp', () => {
    // attacker deals 5 (off 10, def 5) -> target 40 -> 35; then health x0.5 -> max 20 -> clamp to 20.
    const events = firstTurnEventsHitting(FRAIL_ON_HIT)
    const modIndex = events.findIndex((e) => e.type === 'StatModifierApplied')
    const clampIndex = events.findIndex((e) => e.type === 'HpClamped')

    expect(modIndex).toBeGreaterThanOrEqual(0)
    expect(clampIndex).toBeGreaterThan(modIndex) // cause (stat change) before effect (clamp)
    expect(events[modIndex]).toMatchObject({
      stat: 'health',
      effectiveBefore: 40,
      effectiveAfter: 20,
    })
    expect(events[clampIndex]).toMatchObject({
      type: 'HpClamped',
      previousHp: 35,
      newHp: 20,
      effectiveMaxHealth: 20,
    })
  })
})

describe('loop safety', () => {
  it('the re-entry guard bounds a mutual-retaliation loop (A↔B) without reaching the depth cap', () => {
    // Both sides have RETALIATE. A hits B → B retaliates A → A retaliates B → B would retaliate
    // AGAIN, but B's instance is still unwinding on the stack, so the guard blocks it. The loop
    // self-limits at 2 retaliations; the depth cap is never involved.
    const player = makeParty('player', [
      {
        id: 'a',
        health: 100000,
        attack: 20,
        defence: 0,
        speed: 10,
        affinity: 'body',
        scriptId: 'always-attack',
        innateTraitIds: ['retaliate'],
      },
    ])
    const enemy = makeParty('enemy', [
      {
        id: 'b',
        health: 100000,
        attack: 20,
        defence: 0,
        speed: 1,
        affinity: 'body',
        scriptId: 'always-wait',
        innateTraitIds: ['retaliate'],
      },
    ])
    const { events } = resolveTurn(
      createCombat(player, enemy, 1, STOCK_SCRIPTS_BY_ID, TRAIT_REGISTRY),
    )

    // A's attack, then B's retaliate, then A's retaliate, then B is guard-blocked: 2 retaliations.
    expect(events.filter((e) => e.type === 'TriggerFired').length).toBe(2)
    expect(events.some((e) => e.type === 'CascadeTruncated')).toBe(false)
  })

  it('truncates deterministically at MAX_TRIGGER_CASCADE_DEPTH, emitting CascadeTruncated', () => {
    // With ≤12 creatures and the stack-scoped guard, a real fight can never nest 500 deep — the
    // cap is a pure backstop. Exercise it white-box: fire a hook with a cascade already AT the
    // cap, so the next trigger is over it. (Same white-box style as the round-cap test.)
    const player = makeParty('player', [
      { id: 'x', attack: 20, scriptId: 'always-wait', innateTraitIds: ['retaliate'] },
    ])
    const enemy = makeParty('enemy', [{ id: 'y', health: 30 }])
    const state = createCombat(player, enemy, 1, STOCK_SCRIPTS_BY_ID, TRAIT_REGISTRY)

    const events: CombatEvent[] = []
    const atCap = newCascade()
    atCap.depth = MAX_TRIGGER_CASCADE_DEPTH
    fireHook(
      'on-damage-taken',
      [createCreatureId('x')],
      createCreatureId('y'),
      state,
      events,
      atCap,
    )

    const truncations = events.filter(
      (e): e is Extract<CombatEvent, { type: 'CascadeTruncated' }> =>
        e.type === 'CascadeTruncated',
    )
    expect(truncations).toHaveLength(1)
    expect(truncations[0]).toMatchObject({
      creatureId: createCreatureId('x'),
      effectId: 'retaliate',
      depth: MAX_TRIGGER_CASCADE_DEPTH + 1,
    })
    // The over-cap trigger did NOT execute: no TriggerFired, no DamageDealt.
    expect(events.some((e) => e.type === 'TriggerFired')).toBe(false)
    expect(events.some((e) => e.type === 'DamageDealt')).toBe(false)
  })
})

describe('triggered condition (self-scoped)', () => {
  // Retaliate, gated on self HP% < 50. Target max HP 40 -> threshold is currentHp < 20.
  const COND_RETALIATE: Trait = {
    id: 'cond-retaliate',
    name: 'Conditional Retaliate',
    effects: [
      {
        category: 'triggered',
        hook: 'on-damage-taken',
        condition: {
          kind: 'hp-percent',
          subject: 'self',
          qualifier: 'any',
          comparator: '<',
          thresholdPercent: 50,
        },
        response: {
          kind: 'deal-damage',
          target: { kind: 'triggering-source' },
          offStat: 'attack',
          spellPower: 0.3,
        },
      },
    ],
  }

  // One resolveTurn = the attacker's turn (it acts first), including the target's reaction.
  function attackerTurn(attackerAttack: number): CombatEvent[] {
    const player = makeParty('player', [
      {
        id: 'atk',
        attack: attackerAttack,
        defence: 0,
        speed: 20,
        affinity: 'body',
        scriptId: 'always-attack',
      },
    ])
    const enemy = makeParty('enemy', [
      {
        id: 'tgt',
        health: 40,
        attack: 20,
        defence: 5,
        speed: 1,
        affinity: 'body',
        scriptId: 'always-wait',
        innateTraitIds: ['cond-retaliate'],
      },
    ])
    return resolveTurn(
      createCombat(player, enemy, 1, STOCK_SCRIPTS_BY_ID, registry(COND_RETALIATE)),
    ).events
  }

  it('does not fire while the condition is false (target stays above 50% HP)', () => {
    // atk 10, def 5 -> 5 dmg -> target 35/40 (> 50%) -> condition false -> nothing.
    const events = attackerTurn(10)
    expect(events.some((e) => e.type === 'TriggerFired')).toBe(false)
    expect(events.filter((e) => e.type === 'DamageDealt')).toHaveLength(1) // only the attack
  })

  it('fires once the hit drops the target below the threshold', () => {
    // atk 30, def 5 -> 25 dmg -> target 15/40 (< 50%) -> condition true -> retaliation.
    const events = attackerTurn(30)
    expect(
      events.some(
        (e) =>
          e.type === 'TriggerFired' &&
          e.effectId === 'cond-retaliate' &&
          e.hook === 'on-damage-taken',
      ),
    ).toBe(true)
    // The attack plus the retaliation striking back at the attacker.
    expect(
      events.some(
        (e) =>
          e.type === 'DamageDealt' &&
          e.sourceId === createCreatureId('tgt') &&
          e.targetId === createCreatureId('atk'),
      ),
    ).toBe(true)
  })
})

describe('apply-stat-modifier re-stacking (unique instance ids)', () => {
  it('gives each application a distinct instance id and stacks multiplicatively', () => {
    // Fire GRUDGE's on-ally-death twice on the same bearer (as if two allies fell).
    const player = makeParty('player', [
      { id: 'bearer', attack: 20, scriptId: 'always-wait', innateTraitIds: ['grudge'] },
    ])
    const enemy = makeParty('enemy', [{ id: 'foe', health: 30 }])
    let state = createCombat(player, enemy, 1, STOCK_SCRIPTS_BY_ID, TRAIT_REGISTRY)
    const events: CombatEvent[] = []
    const bearerId = createCreatureId('bearer')
    const allyId = createCreatureId('ally')

    state = fireHook(
      'on-ally-death',
      [bearerId],
      allyId,
      state,
      events,
      newCascade(),
    ).state
    state = fireHook(
      'on-ally-death',
      [bearerId],
      allyId,
      state,
      events,
      newCascade(),
    ).state

    const bearer = [...state.playerParty, ...state.enemyParty].find(
      (c) => c.id === bearerId,
    )!
    const applied = bearer.activeEffects.filter(
      (e) => e.category === 'stat-modifier' && e.sourceTraitId === 'grudge',
    )
    expect(applied).toHaveLength(2)
    expect(new Set(applied.map((e) => e.instanceId)).size).toBe(2) // distinct ids
    expect(getEffectiveStat(bearer, 'attack')).toBe(20 * 1.5 * 1.5) // stacking still folds: 45
  })
})

describe('applyStatus + condition-status content (Slice C)', () => {
  const TEST_DOT: StatusDef = {
    category: 'condition-status',
    statusId: 'test-dot',
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

  function stateWithTestDot() {
    const player = makeParty('player', [{ id: 'p', health: 40 }])
    const enemy = makeParty('enemy', [{ id: 'e' }])
    const statuses = new Map([[TEST_DOT.statusId, TEST_DOT]])
    return createCombat(player, enemy, 1, STOCK_SCRIPTS_BY_ID, TRAIT_REGISTRY, statuses)
  }

  it('emits StatusApplied then fires on-status-applied', () => {
    const state = stateWithTestDot()
    const events: CombatEvent[] = []
    applyStatus(
      createCreatureId('e'),
      createCreatureId('p'),
      { statusId: 'test-dot', duration: 2 },
      state,
      events,
      newCascade(),
    )
    expect(events[0]).toMatchObject({
      type: 'StatusApplied',
      targetId: createCreatureId('p'),
      statusId: 'test-dot',
      stacks: 1,
      duration: 2,
      sourceId: createCreatureId('e'),
    })
  })

  it('re-applying refreshes duration and stacks up to the declared cap', () => {
    let state = stateWithTestDot()
    const events: CombatEvent[] = []
    const apply = (duration: number) => {
      state = applyStatus(
        createCreatureId('e'),
        createCreatureId('p'),
        { statusId: 'test-dot', duration },
        state,
        events,
        newCascade(),
      )
    }
    apply(2)
    apply(5)
    apply(5)
    apply(5) // 4th application; cap is 3

    const p = [...state.playerParty, ...state.enemyParty].find(
      (c) => c.id === createCreatureId('p'),
    )!
    const effect = p.activeEffects.find(
      (e) => e.category === 'condition-status',
    ) as ConditionStatusEffect
    expect(effect.stacks).toBe(3) // capped
    expect(effect.remainingDuration).toBe(5) // refreshed to the latest application's duration
  })

  it('a DoT tick is a flat, stack-scaled deal-damage bypassing the OffStat/Defence formula, with no TriggerFired', () => {
    let state = stateWithTestDot()
    const events: CombatEvent[] = []
    state = applyStatus(
      createCreatureId('e'),
      createCreatureId('p'),
      { statusId: 'test-dot', duration: 2, stacks: 2 },
      state,
      events,
      newCascade(),
    )
    const before = events.length
    fireHook(
      'on-round-end',
      [createCreatureId('p')],
      undefined,
      state,
      events,
      newCascade(),
    )
    const tick = events.slice(before).find((e) => e.type === 'DamageDealt')
    expect(tick).toMatchObject({ finalDamage: 10, damageSource: 'dot' }) // 5 * 2 stacks
    expect(events.slice(before).some((e) => e.type === 'TriggerFired')).toBe(false)
  })
})

describe('heal response (Regen)', () => {
  const TEST_REGEN: StatusDef = {
    category: 'condition-status',
    statusId: 'test-regen',
    cap: 3,
    hook: 'on-round-end',
    response: {
      kind: 'heal',
      target: { kind: 'self' },
      amountPerStack: 10,
      emitTriggerFired: false,
    },
  }

  it('emits HealApplied clamped to effective max Health, never past it', () => {
    const player = makeParty('player', [{ id: 'p', health: 40 }])
    const enemy = makeParty('enemy', [{ id: 'e' }])
    const statuses = new Map([[TEST_REGEN.statusId, TEST_REGEN]])
    let state = createCombat(
      player,
      enemy,
      1,
      STOCK_SCRIPTS_BY_ID,
      TRAIT_REGISTRY,
      statuses,
    )
    state = updateCreature(state, createCreatureId('p'), { currentHp: 35 }) // simulate prior damage

    const events: CombatEvent[] = []
    state = applyStatus(
      createCreatureId('e'),
      createCreatureId('p'),
      { statusId: 'test-regen', duration: 2 },
      state,
      events,
      newCascade(),
    )
    fireHook(
      'on-round-end',
      [createCreatureId('p')],
      undefined,
      state,
      events,
      newCascade(),
    )

    const heal = events.find((e) => e.type === 'HealApplied')
    expect(heal).toMatchObject({ amount: 5, remainingHp: 40 }) // 35+10=45 clamped to 40
  })
})
