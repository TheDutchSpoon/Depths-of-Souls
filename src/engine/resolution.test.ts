import { describe, expect, it } from 'vitest'
import { createCombat, resolveTurn, resolveFight } from './combat'
import {
  applyStatus,
  dealDamage,
  executeResponse,
  fireHook,
  newCascade,
} from './resolution'
import { getEffectiveStat } from './effective-stats'
import { updateCreature } from './creature-lookup'
import { makeParty } from './__fixtures__/creatures'
import { createCreatureId } from './ids'
import { STOCK_SCRIPTS_BY_ID } from '../data/scripts'
import { TRAIT_REGISTRY } from '../data/traits'
import { MAX_TRIGGER_CASCADE_DEPTH } from './config'
import type { CombatEvent } from './types'
import type {
  ConditionStatusEffect,
  ObservationFilter,
  StatusDef,
  Trait,
} from './effect-types'
import type { SeededRng } from './rng'

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
      affinity: 'vitality',
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
      affinity: 'vitality',
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
        affinity: 'vitality',
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
        affinity: 'vitality',
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
        affinity: 'vitality',
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
        affinity: 'vitality',
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
    defaultDuration: 3,
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

  it("an omitted duration inherits the status's own defaultDuration (Phase 4 Slice F, review amendment)", () => {
    const state = stateWithTestDot()
    const events: CombatEvent[] = []
    const result = applyStatus(
      createCreatureId('e'),
      createCreatureId('p'),
      { statusId: 'test-dot' }, // no duration -- inherits TEST_DOT.defaultDuration (3)
      state,
      events,
      newCascade(),
    )
    expect(events[0]).toMatchObject({ type: 'StatusApplied', duration: 3 })
    const p = result.playerParty.find((c) => c.id === createCreatureId('p'))!
    const effect = p.activeEffects.find((e) => e.category === 'condition-status')!
    expect(effect).toMatchObject({ remainingDuration: 3 })
  })

  it('an explicit duration overrides defaultDuration', () => {
    const state = stateWithTestDot()
    const events: CombatEvent[] = []
    applyStatus(
      createCreatureId('e'),
      createCreatureId('p'),
      { statusId: 'test-dot', duration: 9 }, // explicit -- overrides the default (3)
      state,
      events,
      newCascade(),
    )
    expect(events[0]).toMatchObject({ type: 'StatusApplied', duration: 9 })
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
    expect(tick).toMatchObject({
      finalDamage: 10,
      damageSource: 'dot',
      statusId: 'test-dot',
    }) // 5 * 2 stacks
    expect(events.slice(before).some((e) => e.type === 'TriggerFired')).toBe(false)
  })

  it("attack/cast DamageDealt carry no statusId -- it's exclusively the causing STATUS's identity", () => {
    const player = makeParty('player', [
      { id: 'atk', attack: 10, defence: 0, scriptId: 'always-attack' },
    ])
    const enemy = makeParty('enemy', [{ id: 'tgt', health: 40, defence: 0 }])
    const { events } = resolveTurn(createCombat(player, enemy, 1, STOCK_SCRIPTS_BY_ID))
    const attackHit = events.find(
      (e): e is Extract<CombatEvent, { type: 'DamageDealt' }> => e.type === 'DamageDealt',
    )
    expect(attackHit).toBeDefined()
    expect(attackHit?.statusId).toBeUndefined()
  })
})

describe('heal response (Regen)', () => {
  const TEST_REGEN: StatusDef = {
    category: 'condition-status',
    statusId: 'test-regen',
    cap: 3,
    triggers: [
      {
        hook: 'on-round-end',
        response: {
          kind: 'heal',
          target: { kind: 'self' },
          amountPerStack: 10,
          emitTriggerFired: false,
        },
      },
    ],
    polarity: 'buff',
    defaultDuration: 3,
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

describe('heal scaling (Phase 4 Slice E2, Treants Elder / Necromoss-shaped)', () => {
  it('throws a resolver-invariant error when both amountPerStack and scalingStat are set', () => {
    const state = createCombat(
      makeParty('player', [{ id: 'a' }]),
      makeParty('enemy', [{ id: 'b' }]),
      1,
    )
    expect(() =>
      executeResponse(
        {
          kind: 'heal',
          target: { kind: 'self' },
          amountPerStack: 5,
          scalingStat: 'health',
        },
        'fixture',
        { self: createCreatureId('a') },
        state,
        [],
        newCascade(),
      ),
    ).toThrow(/more than one of amountPerStack\/scalingStat/)
  })

  it('scalingStat mode reads the HEALER’s own effective stat, not the target’s', () => {
    // Healer's effective Health is 200 (a high-Health "Elder"); target is a DIFFERENT, much
    // lower-Health ally -- if the response mistakenly read the TARGET's stat instead, the heal
    // would come out tiny, not 200.
    const player = makeParty('player', [
      { id: 'elder', health: 200 },
      { id: 'ally', health: 30 },
    ])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    // createCombat always inits currentHp to full effective max regardless of any raw
    // `currentHp` override, so "ally is wounded" has to be patched in AFTER creation.
    let state = createCombat(player, enemy, 1, STOCK_SCRIPTS_BY_ID)
    state = updateCreature(state, createCreatureId('ally'), { currentHp: 10 })
    const events: CombatEvent[] = []
    executeResponse(
      {
        kind: 'heal',
        target: { kind: 'selector', selector: { kind: 'lowest-hp-ally' } },
        scalingStat: 'health',
        spellPower: 1.0,
      },
      'elder-fixture',
      { self: createCreatureId('elder') },
      state,
      events,
      newCascade(),
    )
    const heal = events.find((e) => e.type === 'HealApplied')
    // amount = getEffectiveStat(elder,'health') x 1.0 = 200; ally 10 + 200 = 210, clamped to 30.
    expect(heal).toMatchObject({ amount: 20, remainingHp: 30 })
  })

  it('magnitudeSource (count) scales a flat heal by a live count instead of stacks', () => {
    const player = makeParty('player', [
      { id: 'necromoss', health: 100 },
      { id: 'dead1', alive: false },
      { id: 'dead2', alive: false },
    ])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    let state = createCombat(player, enemy, 1, STOCK_SCRIPTS_BY_ID)
    state = updateCreature(state, createCreatureId('necromoss'), { currentHp: 50 })
    const events: CombatEvent[] = []
    executeResponse(
      {
        kind: 'heal',
        target: { kind: 'self' },
        amountPerStack: 5, // per-unit rate the live count multiplies, not a real "stack"
        magnitudeSource: { kind: 'count', of: 'dead-allies' },
      },
      'necromoss-fixture',
      { self: createCreatureId('necromoss') },
      state,
      events,
      newCascade(),
    )
    const heal = events.find((e) => e.type === 'HealApplied')
    // 2 dead allies x 5 = 10 healed; 50 + 10 = 60, well under the 100 cap.
    expect(heal).toMatchObject({ amount: 10, remainingHp: 60 })
  })
})

describe('deal-damage scalingStat (Phase 4 Slice B)', () => {
  const THORNS: Trait = {
    id: 'thorns',
    name: 'Thorns',
    effects: [
      {
        category: 'triggered',
        hook: 'on-damage-taken',
        response: {
          kind: 'deal-damage',
          target: { kind: 'triggering-source' },
          scalingStat: 'defence',
          spellPower: 1.0,
        },
      },
    ],
  }

  it('scales off the declared Stat via getEffectiveStat (no remap resolution), through the same formula', () => {
    // Attacker (off 10, def 0) -> target (def 5): core 5, chip 0.1 -> raw 5.1 -> final 5.
    // Thorns retaliates: off = target's OWN effective Defence (5) x spellPower 1.0 = 5;
    // vs attacker's def 0: core 5, chip 0.05 -> raw 5.05 -> final 5.
    const events = firstTurnEventsHitting(THORNS)
    const retaliation = events.find(
      (e) => e.type === 'DamageDealt' && e.sourceId === createCreatureId('target'),
    )
    expect(retaliation).toMatchObject({
      targetId: createCreatureId('attacker'),
      finalDamage: 5,
    })
  })
})

describe('deal-damage mutual exclusivity (ASSUMPTION 6)', () => {
  it('throws a resolver-invariant error when more than one of offStat/scalingStat/flatAmount is set', () => {
    const state = createCombat(
      makeParty('player', [{ id: 'a' }]),
      makeParty('enemy', [{ id: 'b' }]),
      1,
    )
    expect(() =>
      executeResponse(
        {
          kind: 'deal-damage',
          target: { kind: 'self' },
          offStat: 'attack',
          scalingStat: 'defence',
        },
        'fixture',
        { self: createCreatureId('a') },
        state,
        [],
        newCascade(),
      ),
    ).toThrow(/more than one of offStat\/scalingStat\/flatAmount/)
  })
})

/** Wraps a real SeededRng to count draws -- proves a code path drew ZERO/exactly-ONE RNG value
 * rather than merely asserting on an outcome that could coincidentally match either way. */
function countingRng(inner: SeededRng): SeededRng & { calls: number } {
  const wrapper = {
    calls: 0,
    next(): number {
      wrapper.calls += 1
      return inner.next()
    },
  }
  return wrapper
}

describe('chancePercent probabilistic gate (Phase 4 Slice E2)', () => {
  const WITH_CHANCE: Trait = {
    id: 'with-chance-fixture',
    name: 'With Chance (fixture)',
    effects: [
      {
        category: 'triggered',
        hook: 'on-attack',
        chancePercent: 50,
        response: {
          kind: 'apply-stat-modifier',
          target: { kind: 'self' },
          stat: 'attack',
          factor: 1.1,
        },
      },
    ],
  }

  const WITHOUT_CHANCE: Trait = {
    id: 'without-chance-fixture',
    name: 'Without Chance (fixture)',
    effects: [
      {
        category: 'triggered',
        hook: 'on-attack',
        response: {
          kind: 'apply-stat-modifier',
          target: { kind: 'self' },
          stat: 'attack',
          factor: 1.1,
        },
      },
    ],
  }

  const CONDITION_NEVER_TRUE_WITH_CHANCE: Trait = {
    id: 'condition-never-true-with-chance-fixture',
    name: 'Condition Never True, With Chance (fixture)',
    effects: [
      {
        category: 'triggered',
        hook: 'on-attack',
        condition: { kind: 'is-provoking' }, // the attacker never provokes -- always false
        chancePercent: 50,
        response: {
          kind: 'apply-stat-modifier',
          target: { kind: 'self' },
          stat: 'attack',
          factor: 1.1,
        },
      },
    ],
  }

  function rngDrawsForOneAttack(trait: Trait): number {
    const player = makeParty('player', [
      {
        id: 'atk',
        attack: 10,
        defence: 0,
        speed: 20,
        affinity: 'vitality',
        scriptId: 'always-attack',
        innateTraitIds: [trait.id],
      },
    ])
    const enemy = makeParty('enemy', [
      {
        id: 'tgt',
        health: 100,
        defence: 0,
        speed: 1,
        affinity: 'vitality',
        scriptId: 'always-wait',
      },
    ])
    const created = createCombat(player, enemy, 1, STOCK_SCRIPTS_BY_ID, registry(trait))
    const rng = countingRng(created.rng)
    resolveTurn({ ...created, rng })
    return rng.calls
  }

  it('draws exactly one RNG value when a firing effect carries chancePercent', () => {
    expect(rngDrawsForOneAttack(WITH_CHANCE)).toBe(1)
  })

  it('draws zero RNG values when chancePercent is absent', () => {
    expect(rngDrawsForOneAttack(WITHOUT_CHANCE)).toBe(0)
  })

  it('draws zero RNG values when the condition fails -- never reaches the roll', () => {
    expect(rngDrawsForOneAttack(CONDITION_NEVER_TRUE_WITH_CHANCE)).toBe(0)
  })
})

describe('conditional-damage-bonus (Phase 4 Slice E2, Cull the Weak / Ambusher-shaped)', () => {
  // +50% dealt when the CURRENT damage target is below 50% HP -- a permanent passive on the
  // ATTACKER, gathered into dealtMods at hit time (never a trigger, never a second instance).
  const CULL_THE_WEAK_FIXTURE: Trait = {
    id: 'cull-the-weak-fixture',
    name: 'Cull the Weak (fixture)',
    effects: [
      {
        category: 'conditional-damage-bonus',
        percent: 0.5,
        condition: {
          kind: 'hp-percent',
          subject: 'target',
          qualifier: 'any',
          comparator: '<',
          thresholdPercent: 50,
        },
      },
    ],
  }

  function oneHit(targetCurrentHp: number) {
    const player = makeParty('player', [
      {
        id: 'attacker',
        attack: 20,
        defence: 0,
        speed: 20,
        affinity: 'vitality',
        scriptId: 'always-attack',
        innateTraitIds: [CULL_THE_WEAK_FIXTURE.id],
      },
    ])
    const enemy = makeParty('enemy', [
      {
        id: 'target',
        health: 40,
        defence: 0,
        speed: 1,
        affinity: 'vitality',
        scriptId: 'always-wait',
      },
    ])
    const created = createCombat(
      player,
      enemy,
      1,
      STOCK_SCRIPTS_BY_ID,
      registry(CULL_THE_WEAK_FIXTURE),
    )
    const patched = updateCreature(created, createCreatureId('target'), {
      currentHp: targetCurrentHp,
    })
    return resolveTurn(patched).events
  }

  it('does not apply when the target is at/above the HP threshold -- byte-identical hit', () => {
    // off 20, def 0: core 20, chip 0.2 -> raw 20.2 -> final 20. No bonus (target at 100%, not <50%).
    const events = oneHit(40)
    const dealt = events.find((e) => e.type === 'DamageDealt')
    expect(dealt).toMatchObject({ rawDamage: 20.2, finalDamage: 20 })
  })

  it('applies as ONE clean modified hit when the target is below threshold -- no second instance', () => {
    // Target at 16/40 = 40%, below 50% -> +50% dealt: (20+0.2) x 1.5 = 30.3 -> final 30.
    const events = oneHit(16)
    const dealtEvents = events.filter((e) => e.type === 'DamageDealt')
    expect(dealtEvents).toHaveLength(1) // option (a): one hit, never a follow-up instance
    const dealt = dealtEvents[0] as Extract<CombatEvent, { type: 'DamageDealt' }>
    expect(dealt.rawDamage).toBeCloseTo(30.3) // 20.2 x 1.5, float-imprecise at full precision
    expect(dealt.finalDamage).toBe(30)
    // A passive dealt-mod, not a triggered response -- no TriggerFired anywhere in the turn.
    expect(events.some((e) => e.type === 'TriggerFired')).toBe(false)
  })
})

describe('conditional-damage-bonus actionKind scoping (Phase 4 Slice F, review amendment)', () => {
  // Attack 20 == Intelligence 20 == Defence 0 on both sides of the comparison, so an unscoped
  // hit (no bonus) is IDENTICAL whether dealt as an Attack or a Cast: core 20, chip 0.01*20=0.2
  // -> raw 20.2 -> final 20. A +100% bonus that actually applies doubles the raw hit before the
  // floor: raw 40.4 -> final 40. Easy to eyeball which branch fired.
  function finalDamageVia(
    hitAs: 'attack' | 'cast',
    bonusActionKind: 'attack' | 'cast' | 'both' | undefined,
  ): number {
    const trait: Trait = {
      id: 'scoped-bonus-fixture',
      name: 'Scoped Bonus (fixture)',
      effects: [
        {
          category: 'conditional-damage-bonus',
          percent: 1.0,
          condition: { kind: 'always' },
          ...(bonusActionKind === undefined ? {} : { actionKind: bonusActionKind }),
        },
      ],
    }
    const player = makeParty('player', [
      {
        id: 'attacker',
        attack: 20,
        intelligence: 20,
        defence: 0,
        affinity: 'vitality',
        innateTraitIds: [trait.id],
      },
    ])
    const enemy = makeParty('enemy', [
      { id: 'target', health: 1000, defence: 0, affinity: 'vitality' },
    ])
    const state = createCombat(player, enemy, 1, STOCK_SCRIPTS_BY_ID, registry(trait))
    const events: CombatEvent[] = []
    dealDamage(
      createCreatureId('attacker'),
      createCreatureId('target'),
      hitAs,
      1.0,
      hitAs,
      state,
      events,
      newCascade(),
    )
    const dealt = events.find((e) => e.type === 'DamageDealt') as Extract<
      CombatEvent,
      { type: 'DamageDealt' }
    >
    return dealt.finalDamage
  }

  it("actionKind: 'attack' applies on an Attack, not on a Cast", () => {
    expect(finalDamageVia('attack', 'attack')).toBe(40)
    expect(finalDamageVia('cast', 'attack')).toBe(20) // does NOT leak onto Cast
  })

  it("actionKind: 'cast' applies on a Cast, not on an Attack", () => {
    expect(finalDamageVia('cast', 'cast')).toBe(40)
    expect(finalDamageVia('attack', 'cast')).toBe(20) // does NOT leak onto Attack
  })

  it("an unset actionKind applies to BOTH (byte-identical to pre-amendment 'both' default)", () => {
    expect(finalDamageVia('attack', undefined)).toBe(40)
    expect(finalDamageVia('cast', undefined)).toBe(40)
  })
})

describe('grant-action-state response (Phase 4 Slice B)', () => {
  it('sets only the requested flag(s) true, leaving the other untouched', () => {
    const state = createCombat(
      makeParty('player', [{ id: 'a' }]),
      makeParty('enemy', [{ id: 'b' }]),
      1,
    )
    const result = executeResponse(
      { kind: 'grant-action-state', target: { kind: 'self' }, defending: true },
      'fixture',
      { self: createCreatureId('a') },
      state,
      [],
      newCascade(),
    )
    const a = [...result.state.playerParty, ...result.state.enemyParty].find(
      (c) => c.id === createCreatureId('a'),
    )!
    expect(a.defending).toBe(true)
    expect(a.provoking).toBe(false)
    expect(result.suppressed).toBe(false)
  })
})

describe('revive response (Phase 4 Slice B)', () => {
  const REVIVE_FIXTURE: Trait = {
    id: 'revive-fixture',
    name: 'Fixture Revive',
    effects: [
      {
        category: 'triggered',
        hook: 'on-attack',
        response: { kind: 'revive', target: { kind: 'random-dead-ally' }, pct: 0.2 },
      },
    ],
  }

  it('revives a dead ally at pct of its death-reset baseline max HP, resetting activeEffects', () => {
    const player = makeParty('player', [
      { id: 'reviver', innateTraitIds: ['revive-fixture'] },
      { id: 'fallen', health: 40, alive: false },
    ])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    const state = createCombat(
      player,
      enemy,
      1,
      STOCK_SCRIPTS_BY_ID,
      registry(REVIVE_FIXTURE),
    )
    const events: CombatEvent[] = []
    const result = executeResponse(
      { kind: 'revive', target: { kind: 'random-dead-ally' }, pct: 0.2 },
      'revive-fixture',
      { self: createCreatureId('reviver') },
      state,
      events,
      newCascade(),
    )
    const fallen = [...result.state.playerParty, ...result.state.enemyParty].find(
      (c) => c.id === createCreatureId('fallen'),
    )!
    expect(fallen.alive).toBe(true)
    expect(fallen.currentHp).toBe(8) // round(40 * 0.2)
    expect(fallen.activeEffects).toEqual([])
    expect(events).toEqual([
      {
        type: 'Revived',
        sourceId: createCreatureId('reviver'),
        targetId: createCreatureId('fallen'),
        currentHp: 8,
      },
    ])
  })

  it('clears defending/provoking on the revived creature (F1 regression: a creature that died while defending must not return still defending)', () => {
    const player = makeParty('player', [
      { id: 'reviver', innateTraitIds: ['revive-fixture'] },
      {
        id: 'fallen',
        health: 40,
        defence: 10,
        alive: false,
        defending: true,
        provoking: true,
      },
    ])
    const enemy = makeParty('enemy', [{ id: 'foe', attack: 40 }])
    const state = createCombat(
      player,
      enemy,
      1,
      STOCK_SCRIPTS_BY_ID,
      registry(REVIVE_FIXTURE),
    )
    const events: CombatEvent[] = []
    const revived = executeResponse(
      { kind: 'revive', target: { kind: 'random-dead-ally' }, pct: 0.2 },
      'revive-fixture',
      { self: createCreatureId('reviver') },
      state,
      events,
      newCascade(),
    ).state

    const fallen = [...revived.playerParty, ...revived.enemyParty].find(
      (c) => c.id === createCreatureId('fallen'),
    )!
    expect(fallen.defending).toBe(false)
    expect(fallen.provoking).toBe(false)

    // Prove it through the REAL formula, not just the raw field: a subsequent hit deals full
    // damage -- no Defend ×1.5 effective-defence / ×0.65 taken-factor reduction.
    const hitEvents: CombatEvent[] = []
    dealDamage(
      createCreatureId('foe'),
      createCreatureId('fallen'),
      'attack',
      1.0,
      'attack',
      revived,
      hitEvents,
      newCascade(),
    )
    // off 40, def 10 (undefended): core 30, chip 0.4 -> raw 30.4 -> final 30. A stale
    // defending:true would instead give effDef 15, core 25, chip 0.4, raw 25.4 x taken 0.65 =
    // 16.51 -> final 16 -- this assertion catches that regression.
    expect(hitEvents[0]).toMatchObject({ finalDamage: 30 })
  })

  it('is a no-op when there are no dead allies to revive', () => {
    const player = makeParty('player', [{ id: 'reviver' }])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    const state = createCombat(player, enemy, 1, STOCK_SCRIPTS_BY_ID)
    const events: CombatEvent[] = []
    const result = executeResponse(
      { kind: 'revive', target: { kind: 'random-dead-ally' }, pct: 0.2 },
      'revive-fixture',
      { self: createCreatureId('reviver') },
      state,
      events,
      newCascade(),
    )
    expect(result.state).toEqual(state)
    expect(events).toEqual([])
  })

  it("restores a revived PLAYER creature's perks too (ASSUMPTION 21: perks are battle-start-permanent, like innate traits, not in-fight ramp death-reset should wipe)", () => {
    const player = makeParty('player', [
      { id: 'reviver', innateTraitIds: ['revive-fixture'] },
      { id: 'fallen', health: 40, alive: false },
    ])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    const perks = [{ category: 'stat-modifier', stat: 'attack', factor: 2 } as const]
    const state = createCombat(
      player,
      enemy,
      1,
      STOCK_SCRIPTS_BY_ID,
      registry(REVIVE_FIXTURE),
      new Map(),
      perks,
    )
    const events: CombatEvent[] = []
    const result = executeResponse(
      { kind: 'revive', target: { kind: 'random-dead-ally' }, pct: 0.2 },
      'revive-fixture',
      { self: createCreatureId('reviver') },
      state,
      events,
      newCascade(),
    )
    const fallen = result.state.playerParty.find(
      (c) => c.id === createCreatureId('fallen'),
    )!
    expect(fallen.alive).toBe(true)
    // The perk-derived x2 Attack stat-modifier is present on the revived creature, exactly as
    // it was pre-death (fight-assembly instantiates the SAME playerWideEffects via the SAME
    // instantiateCreatureEffects call revive itself now reuses).
    expect(getEffectiveStat(fallen, 'attack')).toBe(fallen.baseStats.attack * 2)
  })
})

describe('consume-stacks response (Phase 4 Slice D, Glowflies’ Detonator)', () => {
  const GLOW: StatusDef = {
    category: 'damage-modifier',
    statusId: 'glow-fixture',
    cap: 5,
    direction: 'dealt',
    magnitude: 0.1,
    polarity: 'buff',
    defaultDuration: 3,
  }

  function stateWithGlowStacks(stacks: number) {
    const player = makeParty('player', [
      { id: 'detonator', intelligence: 10, defence: 0 },
    ])
    const enemy = makeParty('enemy', [{ id: 'foe', health: 100, defence: 0 }])
    const statuses = new Map([[GLOW.statusId, GLOW]])
    let state = createCombat(
      player,
      enemy,
      1,
      STOCK_SCRIPTS_BY_ID,
      TRAIT_REGISTRY,
      statuses,
    )
    const events: CombatEvent[] = []
    state = applyStatus(
      createCreatureId('detonator'),
      createCreatureId('detonator'),
      { statusId: 'glow-fixture', duration: 5, stacks },
      state,
      events,
      newCascade(),
    )
    return state
  }

  it('reads and clears the firing creature’s own stacks, then executes the wrapped effect scaled by the consumed count', () => {
    const state = stateWithGlowStacks(3)
    const events: CombatEvent[] = []
    const result = executeResponse(
      {
        kind: 'consume-stacks',
        statusId: 'glow-fixture',
        effect: {
          kind: 'deal-damage',
          target: { kind: 'triggering-source' },
          scalingStat: 'intelligence',
          magnitudeSource: { kind: 'consumed-stacks' },
        },
      },
      'detonator-fixture',
      { self: createCreatureId('detonator'), source: createCreatureId('foe') },
      state,
      events,
      newCascade(),
    )

    expect(events[0]).toMatchObject({ type: 'StatusExpired', statusId: 'glow-fixture' })
    // off = intelligence(10) * spellPower(1.0 * 3 consumed stacks) = 30; def 0: core 30, chip
    // 0.3 -> raw 30.3 -> final 30.
    expect(events[1]).toMatchObject({ type: 'DamageDealt', finalDamage: 30 })

    const detonator = [...result.state.playerParty, ...result.state.enemyParty].find(
      (c) => c.id === createCreatureId('detonator'),
    )!
    expect(detonator.activeEffects).toEqual([])
  })

  it('is a full no-op when the status is absent (0/absent stacks == no status present)', () => {
    // A creature that never had Glow applied at all -- CONVENTIONS: "no status present" and
    // "0 stacks" are the same state.
    const player = makeParty('player', [{ id: 'detonator' }])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    const bareState = createCombat(player, enemy, 1, STOCK_SCRIPTS_BY_ID)
    const events: CombatEvent[] = []
    const result = executeResponse(
      {
        kind: 'consume-stacks',
        statusId: 'glow-fixture',
        effect: {
          kind: 'deal-damage',
          target: { kind: 'triggering-source' },
          flatAmount: 999,
        },
      },
      'detonator-fixture',
      { self: createCreatureId('detonator'), source: createCreatureId('foe') },
      bareState,
      events,
      newCascade(),
    )
    expect(events).toEqual([])
    expect(result.state).toEqual(bareState)
  })
})

describe('remove-status response (Phase 4 Slice E2)', () => {
  const TEST_DEBUFF: StatusDef = {
    category: 'condition-status',
    statusId: 'test-debuff',
    cap: 3,
    triggers: [
      {
        hook: 'on-round-end',
        response: { kind: 'deal-damage', target: { kind: 'self' }, flatAmount: 1 },
      },
    ],
    polarity: 'debuff',
    defaultDuration: 3,
  }

  function stateWithDebuffOn(targetId: string) {
    // sufferer's health is deliberately LOWER than healer's, so 'lowest-hp-ally' unambiguously
    // resolves to it (both would otherwise tie at their own full HP and fall to the slot
    // tie-break, which would pick healer -- the opposite of what this test needs).
    const player = makeParty('player', [
      { id: 'healer', health: 20 },
      { id: targetId, health: 5 },
    ])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    const statuses = new Map([[TEST_DEBUFF.statusId, TEST_DEBUFF]])
    let state = createCombat(
      player,
      enemy,
      1,
      STOCK_SCRIPTS_BY_ID,
      TRAIT_REGISTRY,
      statuses,
    )
    const events: CombatEvent[] = []
    state = applyStatus(
      createCreatureId('healer'),
      createCreatureId(targetId),
      { statusId: 'test-debuff', duration: 5 },
      state,
      events,
      newCascade(),
    )
    return state
  }

  it('clears the status and emits StatusExpired, reusing the same clear path as decrement/expiry', () => {
    const state = stateWithDebuffOn('sufferer')
    const events: CombatEvent[] = []
    const result = executeResponse(
      {
        kind: 'remove-status',
        target: { kind: 'selector', selector: { kind: 'lowest-hp-ally' } },
        filter: { statusId: 'test-debuff' },
      },
      'cleanse-fixture',
      { self: createCreatureId('healer') },
      state,
      events,
      newCascade(),
    )

    expect(events).toEqual([
      {
        type: 'StatusExpired',
        creatureId: createCreatureId('sufferer'),
        statusId: 'test-debuff',
      },
    ])
    const sufferer = [...result.state.playerParty].find(
      (c) => c.id === createCreatureId('sufferer'),
    )!
    expect(sufferer.activeEffects).toEqual([])
  })

  it('is a no-op, no event, when the target does not carry the statusId', () => {
    const state = stateWithDebuffOn('sufferer')
    const events: CombatEvent[] = []
    const result = executeResponse(
      {
        kind: 'remove-status',
        target: { kind: 'self' },
        filter: { statusId: 'test-debuff' }, // 'healer' (self) never had it applied
      },
      'cleanse-fixture',
      { self: createCreatureId('healer') },
      state,
      events,
      newCascade(),
    )
    expect(events).toEqual([])
    expect(result.state).toEqual(state)
  })

  it('targets via the full ResponseTarget vocabulary -- all-enemies removes it from every enemy carrying it', () => {
    const player = makeParty('player', [{ id: 'healer' }])
    const enemy = makeParty('enemy', [{ id: 'e1' }, { id: 'e2' }])
    const statuses = new Map([[TEST_DEBUFF.statusId, TEST_DEBUFF]])
    let state = createCombat(
      player,
      enemy,
      1,
      STOCK_SCRIPTS_BY_ID,
      TRAIT_REGISTRY,
      statuses,
    )
    const applyEvents: CombatEvent[] = []
    for (const id of ['e1', 'e2']) {
      state = applyStatus(
        createCreatureId('healer'),
        createCreatureId(id),
        { statusId: 'test-debuff', duration: 5 },
        state,
        applyEvents,
        newCascade(),
      )
    }
    const events: CombatEvent[] = []
    const result = executeResponse(
      {
        kind: 'remove-status',
        target: { kind: 'all-enemies' },
        filter: { statusId: 'test-debuff' },
      },
      'dispel-fixture',
      { self: createCreatureId('healer') },
      state,
      events,
      newCascade(),
    )
    expect(events.filter((e) => e.type === 'StatusExpired')).toHaveLength(2)
    for (const id of ['e1', 'e2']) {
      const c = result.state.enemyParty.find((x) => x.id === createCreatureId(id))!
      expect(c.activeEffects).toEqual([])
    }
  })
})

describe('all-allies ResponseTarget (Phase 4 Slice F / ASSUMPTION 22, Shieldbarer starter)', () => {
  it('applies to every living ally, INCLUDING the firing creature itself', () => {
    const player = makeParty('player', [
      { id: 'provoker', defence: 10 },
      { id: 'ally', defence: 10 },
      { id: 'dead-ally', defence: 10, alive: false },
    ])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    const state = createCombat(player, enemy, 1, STOCK_SCRIPTS_BY_ID)
    const events: CombatEvent[] = []
    const result = executeResponse(
      {
        kind: 'apply-stat-modifier',
        target: { kind: 'all-allies' },
        stat: 'defence',
        factor: 1.35,
      },
      'shieldbarer-starter-rally',
      { self: createCreatureId('provoker') },
      state,
      events,
      newCascade(),
    )
    for (const id of ['provoker', 'ally']) {
      const c = result.state.playerParty.find((x) => x.id === createCreatureId(id))!
      expect(getEffectiveStat(c, 'defence')).toBe(13.5)
    }
    // A dead ally is skipped -- applyStatModifier reads/writes it fine, but only alive
    // targets should ever be selected in real content; assert it wasn't silently touched.
    const deadAlly = result.state.playerParty.find(
      (x) => x.id === createCreatureId('dead-ally'),
    )!
    expect(deadAlly.activeEffects).toEqual([])
    // Never touches the enemy side.
    expect(result.state.enemyParty[0]!.activeEffects).toEqual([])
  })
})

describe('cheat-death (Phase 4 Slice D, Last Stand)', () => {
  const LAST_STAND: Trait = {
    id: 'last-stand-fixture',
    name: 'Last Stand (fixture)',
    effects: [{ category: 'cheat-death', chancePercent: 50 }],
  }

  function stateWithBearer(traits: ReadonlyMap<string, Trait>) {
    const player = makeParty('player', [{ id: 'atk', attack: 20, defence: 0 }])
    const enemy = makeParty('enemy', [
      { id: 'bearer', health: 20, defence: 0, innateTraitIds: [...traits.keys()] },
    ])
    return createCombat(player, enemy, 1, STOCK_SCRIPTS_BY_ID, traits)
  }

  function hit(state: ReturnType<typeof stateWithBearer>, rngNext: () => number) {
    const rigged = { ...state, rng: { next: rngNext } }
    const events: CombatEvent[] = []
    const result = dealDamage(
      createCreatureId('atk'),
      createCreatureId('bearer'),
      'attack',
      1.0,
      'attack',
      rigged,
      events,
      newCascade(),
    )
    const bearer = [...result.playerParty, ...result.enemyParty].find(
      (c) => c.id === createCreatureId('bearer'),
    )!
    return { bearer, events }
  }

  it('a successful roll survives at exactly 1 HP -- no CreatureDied/on-death, DamageDealt.remainingHp reflects 1', () => {
    // off 20, def 0: core 20, chip 0.2 -> raw 20.2 -> final 20 -- exactly lethal for health 20.
    const state = stateWithBearer(registry(LAST_STAND))
    const { bearer, events } = hit(state, () => 0.1) // 0.1 < 0.5 chance -> succeeds

    expect(bearer.alive).toBe(true)
    expect(bearer.currentHp).toBe(1)
    expect(events.find((e) => e.type === 'DamageDealt')).toMatchObject({
      finalDamage: 20, // ASSUMPTION 19: unchanged -- only remainingHp reflects the save
      remainingHp: 1,
    })
    expect(events.some((e) => e.type === 'CreatureDied')).toBe(false)
  })

  it('a failed roll dies normally, unaffected', () => {
    const state = stateWithBearer(registry(LAST_STAND))
    const { bearer, events } = hit(state, () => 0.9) // 0.9 >= 0.5 chance -> fails

    expect(bearer.alive).toBe(false)
    expect(bearer.currentHp).toBe(0)
    expect(events.some((e) => e.type === 'CreatureDied')).toBe(true)
  })

  it('never draws RNG for a creature with no cheat-death effect', () => {
    const state = stateWithBearer(new Map<string, Trait>()) // no traits -- chancePercent sums to 0
    let draws = 0
    hit(state, () => {
      draws += 1
      return 0
    })
    expect(draws).toBe(0)
  })
})

describe('suppress-action scope (Phase 4 Slice B)', () => {
  it('undeclared/"all" scope still sets suppressed:true -- byte-identical to pre-Slice-B (Stun)', () => {
    const state = createCombat(
      makeParty('player', [{ id: 'a' }]),
      makeParty('enemy', [{ id: 'b' }]),
      1,
    )
    const result = executeResponse(
      { kind: 'suppress-action' },
      'fixture',
      { self: createCreatureId('a') },
      state,
      [],
      newCascade(),
    )
    expect(result.suppressed).toBe(true)
  })

  it('a scoped ("attack" | "cast") suppress-action does NOT set the whole-turn suppressed flag', () => {
    const state = createCombat(
      makeParty('player', [{ id: 'a' }]),
      makeParty('enemy', [{ id: 'b' }]),
      1,
    )
    const result = executeResponse(
      { kind: 'suppress-action', scope: 'cast' },
      'fixture',
      { self: createCreatureId('a') },
      state,
      [],
      newCascade(),
    )
    expect(result.suppressed).toBe(false)
  })
})

describe('on-action-observed filter (Phase 4 Slice E2, general action-observation system)', () => {
  function observerTrait(filter: ObservationFilter): Trait {
    return {
      id: 'observer-fixture',
      name: 'Observer (fixture)',
      effects: [
        {
          category: 'triggered',
          hook: 'on-action-observed',
          observationFilter: filter,
          response: {
            kind: 'apply-stat-modifier',
            target: { kind: 'self' },
            stat: 'attack',
            factor: 1.1,
          },
        },
      ],
    }
  }

  // observer (player slot0) + allyActor (player slot1) + enemyActor (enemy slot0). Every
  // filter-combination test below re-fires fireHook fresh from this SAME base state (a pure,
  // read-only call from the events-array's point of view -- we only check whether the response
  // fired, never chain state between calls).
  function baseState(filter: ObservationFilter) {
    const trait = observerTrait(filter)
    const player = makeParty('player', [
      { id: 'observer', innateTraitIds: [trait.id] },
      { id: 'ally-actor' },
    ])
    const enemy = makeParty('enemy', [{ id: 'enemy-actor' }])
    return createCombat(player, enemy, 1, STOCK_SCRIPTS_BY_ID, registry(trait))
  }

  function fires(
    filter: ObservationFilter,
    actorId: string,
    actionKind: 'attack' | 'cast' | 'defend' | 'provoke',
  ): boolean {
    const state = baseState(filter)
    const livingIds = [...state.playerParty, ...state.enemyParty]
      .filter((c) => c.alive)
      .map((c) => c.id)
    const events: CombatEvent[] = []
    fireHook(
      'on-action-observed',
      livingIds,
      createCreatureId(actorId),
      state,
      events,
      newCascade(),
      { actionKind, instanceIndex: 0 },
    )
    return events.some((e) => e.type === 'TriggerFired')
  }

  it("relationship 'ally' + actionKind 'cast' (Resonants' own shape): fires for an ally's cast", () => {
    expect(
      fires({ relationship: 'ally', actionKind: 'cast' }, 'ally-actor', 'cast'),
    ).toBe(true)
  })

  it("relationship 'ally': does NOT fire for an enemy's action", () => {
    expect(
      fires({ relationship: 'ally', actionKind: 'cast' }, 'enemy-actor', 'cast'),
    ).toBe(false)
  })

  it('actionKind mismatch: does NOT fire even for a matching relationship', () => {
    expect(
      fires({ relationship: 'ally', actionKind: 'cast' }, 'ally-actor', 'attack'),
    ).toBe(false)
  })

  it("relationship 'enemy': fires only for the enemy actor, never an ally", () => {
    expect(fires({ relationship: 'enemy' }, 'enemy-actor', 'attack')).toBe(true)
    expect(fires({ relationship: 'enemy' }, 'ally-actor', 'attack')).toBe(false)
  })

  it("relationship 'any' (or absent): fires regardless of side", () => {
    expect(fires({ relationship: 'any' }, 'ally-actor', 'attack')).toBe(true)
    expect(fires({}, 'enemy-actor', 'attack')).toBe(true)
  })

  it("excludeActor: 'ally' relationship normally includes self, but excludeActor drops the observer's own action", () => {
    expect(fires({ relationship: 'ally' }, 'observer', 'attack')).toBe(true)
    expect(
      fires({ relationship: 'ally', excludeActor: true }, 'observer', 'attack'),
    ).toBe(false)
    // A DIFFERENT ally is unaffected by excludeActor.
    expect(
      fires({ relationship: 'ally', excludeActor: true }, 'ally-actor', 'attack'),
    ).toBe(true)
  })

  it("relationship 'self': fires only when the observer IS the actor", () => {
    expect(fires({ relationship: 'self' }, 'observer', 'attack')).toBe(true)
    expect(fires({ relationship: 'self' }, 'ally-actor', 'attack')).toBe(false)
  })
})

describe('on-action-observed end-to-end (Phase 4 Slice E2)', () => {
  it('an actor-self trait fires only on its own hook, never doubles via observation', () => {
    // A trait subscribed to on-attack (actor-self routing) must NOT also fire when
    // on-action-observed is raised for that same attack instance.
    const ACTOR_SELF_ON_ATTACK: Trait = {
      id: 'actor-self-on-attack-fixture',
      name: 'Actor-Self On-Attack (fixture)',
      effects: [
        {
          category: 'triggered',
          hook: 'on-attack',
          response: {
            kind: 'apply-stat-modifier',
            target: { kind: 'self' },
            stat: 'attack',
            factor: 1.1,
          },
        },
      ],
    }
    const player = makeParty('player', [
      {
        id: 'attacker',
        attack: 10,
        speed: 20,
        scriptId: 'always-attack',
        innateTraitIds: [ACTOR_SELF_ON_ATTACK.id],
      },
    ])
    const enemy = makeParty('enemy', [
      { id: 'target', health: 100, speed: 1, scriptId: 'always-wait' },
    ])
    const { events } = resolveTurn(
      createCombat(player, enemy, 1, STOCK_SCRIPTS_BY_ID, registry(ACTOR_SELF_ON_ATTACK)),
    )
    // Exactly ONE TriggerFired -- from on-attack. No observationFilter means this trait is
    // never a candidate for on-action-observed's own hook lookup at all (different hook
    // entirely), so there's no double-fire to even guard against structurally -- this test
    // pins that guarantee.
    const fired = events.filter((e) => e.type === 'TriggerFired')
    expect(fired).toHaveLength(1)
    expect(fired[0]).toMatchObject({
      hook: 'on-attack',
      effectId: 'actor-self-on-attack-fixture',
    })
  })

  it('on-action-observed rides the same MAX_TRIGGER_CASCADE_DEPTH guard as every other hook', () => {
    // No response verb can itself perform an Attack/Cast/Defend/Provoke action, so there is no
    // way to build a REAL recursive chain through on-action-observed alone in v1 content -- this
    // is the same white-box technique the 'loop safety' describe block above uses for
    // on-damage-taken: fire the hook with a cascade already AT the cap, proving the guard is
    // wired for this hook too, not just the damage-path ones.
    const OBSERVER_AT_CAP: Trait = {
      id: 'observer-at-cap-fixture',
      name: 'Observer At Cap (fixture)',
      effects: [
        {
          category: 'triggered',
          hook: 'on-action-observed',
          observationFilter: { relationship: 'any' },
          response: {
            kind: 'apply-stat-modifier',
            target: { kind: 'self' },
            stat: 'attack',
            factor: 1.1,
          },
        },
      ],
    }
    const player = makeParty('player', [
      { id: 'observer', innateTraitIds: [OBSERVER_AT_CAP.id] },
    ])
    const enemy = makeParty('enemy', [{ id: 'actor' }])
    const state = createCombat(
      player,
      enemy,
      1,
      STOCK_SCRIPTS_BY_ID,
      registry(OBSERVER_AT_CAP),
    )

    const events: CombatEvent[] = []
    const atCap = newCascade()
    atCap.depth = MAX_TRIGGER_CASCADE_DEPTH
    fireHook(
      'on-action-observed',
      [createCreatureId('observer'), createCreatureId('actor')],
      createCreatureId('actor'),
      state,
      events,
      atCap,
      { actionKind: 'attack', instanceIndex: 0 },
    )

    expect(events).toEqual([
      {
        type: 'CascadeTruncated',
        creatureId: createCreatureId('observer'),
        effectId: 'observer-at-cap-fixture',
        depth: MAX_TRIGGER_CASCADE_DEPTH + 1,
      },
    ])
  })
})

describe('apply-stat-modifier magnitudeSource (Phase 4 Slice E2, Swarmhive Striker-shaped: freeze-at-application)', () => {
  it('bakes a fixed finalFactor at application time; a later change in the live count does NOT retroactively change it', () => {
    const player = makeParty('player', [
      { id: 'striker', attack: 100, speciesId: 'hive' },
      { id: 'mate1', speciesId: 'hive' },
      { id: 'mate2', speciesId: 'hive' },
    ])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    const state = createCombat(player, enemy, 1, STOCK_SCRIPTS_BY_ID)
    const events: CombatEvent[] = []
    const result = executeResponse(
      {
        kind: 'apply-stat-modifier',
        target: { kind: 'self' },
        stat: 'attack',
        factor: 1.02, // per-unit rate: +2% per hive-mate (self included, "in the team")
        magnitudeSource: { kind: 'count', of: 'living-allies-of-species' },
      },
      'striker-fixture',
      { self: createCreatureId('striker') },
      state,
      events,
      newCascade(),
    )

    // count = 3 (striker + 2 hive-mates, self included) -> finalFactor = 1 + 0.02*3 = 1.06.
    const striker = [...result.state.playerParty].find(
      (c) => c.id === createCreatureId('striker'),
    )!
    expect(getEffectiveStat(striker, 'attack')).toBe(106)
    expect(events).toContainEqual({
      type: 'StatModifierApplied',
      sourceId: createCreatureId('striker'),
      targetId: createCreatureId('striker'),
      stat: 'attack',
      factor: 1.06,
      effectiveBefore: 100,
      effectiveAfter: 106,
    })

    // Kill a hive-mate AFTER the modifier was applied -- the already-baked finalFactor must NOT
    // change (the polar opposite of Bulwark's damage-modifier, which DOES live-recompute).
    const afterDeath = updateCreature(result.state, createCreatureId('mate1'), {
      alive: false,
    })
    const strikerAfterDeath = [...afterDeath.playerParty].find(
      (c) => c.id === createCreatureId('striker'),
    )!
    expect(getEffectiveStat(strikerAfterDeath, 'attack')).toBe(106) // unchanged -- frozen
  })

  it('is byte-identical to the plain factor when magnitudeSource is absent', () => {
    const player = makeParty('player', [{ id: 'a', attack: 100 }])
    const enemy = makeParty('enemy', [{ id: 'b' }])
    const state = createCombat(player, enemy, 1, STOCK_SCRIPTS_BY_ID)
    const result = executeResponse(
      {
        kind: 'apply-stat-modifier',
        target: { kind: 'self' },
        stat: 'attack',
        factor: 1.5,
      },
      'fixture',
      { self: createCreatureId('a') },
      state,
      [],
      newCascade(),
    )
    const a = [...result.state.playerParty].find((c) => c.id === createCreatureId('a'))!
    expect(getEffectiveStat(a, 'attack')).toBe(150)
  })
})
