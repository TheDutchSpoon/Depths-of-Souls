// Phase 4.1-H2b2: the unit tests of the two status rules -- single instance and the applier
// snapshot (CONVENTIONS "DoT and Regen from the applier's snapshot", ASSUMPTIONS 113, 114, 143,
// 144, 145). The focused goldens (golden-h2b2-*) pin the mechanisms through whole fights; these pin
// `snapshotFor`, `applyStatus`'s keep/replace/refresh rules, the resolver invariant and the
// validators directly.

import { describe, expect, it } from 'vitest'
import { createCombat } from './combat'
import { createResolutionContext } from './actions'
import { createCreatureId } from './ids'
import { updateCreature } from './creature-lookup'
import { makeParty } from './__fixtures__/creatures'
import { FIXTURE_SCRIPTS_BY_ID } from './__fixtures__/scripts'
import { holdPotency } from './__fixtures__/held-statuses'
import { snapshotFor } from './effects'
import { applyStatus, executeResponse, fireHook, newCascade } from './resolution'
import {
  createEffectInstanceId,
  validateNoSnapshotPotencyOutsideStatus,
  validateSpellEffects,
  validateStatusDef,
} from './effect-types'
import { STATUS_REGISTRY } from '../data/statuses'
import { SORCERER } from '../data/specializations'
import { validateSpecialization } from '../data/specializations'
import { validateTrait } from '../data/traits'
import type { CombatEvent, CombatState, Creature, Spell } from './types'
import type { EffectDef, StatusDef, StatusEffect, StatusSnapshot } from './effect-types'

// This file's subject is the snapshot RULE, not Poison's number: it borrows the real Poison and pins
// its percentage at the 20% its arithmetic uses (4.1-H2d, ASSUMPTION 147, extended to a rule's unit
// test), so a tuning pass never changes its expected values.
const STATUSES = holdPotency(STATUS_REGISTRY, { poison: 20 })

const A = createCreatureId('a')
const A2 = createCreatureId('a2')
const B = createCreatureId('b')

/** Two appliers (A: Attack 50, A2: Attack 20) on the player side, the bearer B on the enemy side,
 * every stat otherwise 20 (the makeParty default), all vitality. */
function world(extra: Partial<Record<'a' | 'a2' | 'b', object>> = {}): CombatState {
  return createCombat({
    seed: 1,
    player: {
      party: makeParty('player', [
        { id: 'a', attack: 50, ...extra.a },
        { id: 'a2', attack: 20, ...extra.a2 },
      ]),
    },
    enemy: { party: makeParty('enemy', [{ id: 'b', health: 1000, ...extra.b }]) },
    registries: { scripts: FIXTURE_SCRIPTS_BY_ID, statuses: STATUSES },
  })
}

function creature(state: CombatState, id: string): Creature {
  const found = [...state.playerParty, ...state.enemyParty].find((c) => c.id === id)
  if (!found) throw new Error(`no creature ${id}`)
  return found
}

function statusOn(state: CombatState, id: string, statusId: string): StatusEffect {
  const found = creature(state, id).activeEffects.find(
    (e): e is StatusEffect => e.category === 'status' && e.statusId === statusId,
  )
  if (!found) throw new Error(`no ${statusId} on ${id}`)
  return found
}

function apply(
  state: CombatState,
  applier: typeof A,
  statusId: string,
  duration?: number,
  events: CombatEvent[] = [],
  inherited?: StatusSnapshot,
): CombatState {
  return applyStatus(
    applier,
    B,
    duration === undefined ? { statusId } : { statusId, duration },
    state,
    createResolutionContext(events, newCascade()),
    inherited,
  )
}

describe('snapshotFor (the applier snapshot recorded at application)', () => {
  it("records the applier's id, affinity and potency = percent of its effective stat", () => {
    const state = world({ a: { affinity: 'wit' } })
    expect(snapshotFor(creature(state, 'a'), { ofStat: 'attack', percent: 20 })).toEqual({
      applierId: A,
      affinity: 'wit',
      potency: 10, // floor(50 x 20 / 100)
    })
  })

  it('floors the stat BEFORE multiplying the integer percent (one floor, integer arithmetic)', () => {
    // Base Health 49 x1.5 = 73.5. Floored first: floor(73 x 15 / 100) = floor(10.95) = 10.
    // Reading it unfloored would give floor(73.5 x 15 / 100) = floor(11.025) = 11.
    const state = world({ a: { health: 49 } })
    const boosted = updateCreature(state, A, {
      activeEffects: [
        {
          category: 'stat-modifier',
          stat: 'health',
          factor: 1.5,
          instanceId: createEffectInstanceId('boost'),
          sourceTraitId: 'boost',
        },
      ],
    })
    expect(
      snapshotFor(creature(boosted, 'a'), { ofStat: 'health', percent: 15 }).potency,
    ).toBe(10)
  })

  it('reads a corpse as it is (a dead applier still snapshots its effective stats)', () => {
    const state = updateCreature(world(), A, { alive: false, currentHp: 0 })
    expect(
      snapshotFor(creature(state, 'a'), { ofStat: 'attack', percent: 20 }).potency,
    ).toBe(10)
  })
})

describe('applyStatus: single instance, keep the stronger snapshot, refresh the timer', () => {
  it('a fresh application records the applying creature’s snapshot; the event has no stacks', () => {
    const events: CombatEvent[] = []
    const state = apply(world(), A, 'poison', 3, events)
    expect(statusOn(state, 'b', 'poison').snapshot).toEqual({
      applierId: A,
      affinity: 'vitality',
      potency: 10,
    })
    expect(events[0]).toEqual({
      type: 'StatusApplied',
      targetId: B,
      statusId: 'poison',
      duration: 3,
      sourceId: A,
    })
    expect('stacks' in statusOn(state, 'b', 'poison')).toBe(false)
  })

  it('a STRONGER re-application replaces the whole snapshot (applier, affinity, potency)', () => {
    let state = apply(world(), A2, 'poison', 3) // potency 4
    const id = statusOn(state, 'b', 'poison').instanceId
    state = apply(state, A, 'poison', 3) // potency 10
    expect(statusOn(state, 'b', 'poison').snapshot).toMatchObject({
      applierId: A,
      potency: 10,
    })
    expect(statusOn(state, 'b', 'poison').instanceId).toBe(id) // one instance, id kept
  })

  it('a WEAKER re-application keeps the stronger snapshot but still refreshes the timer (even to a shorter one)', () => {
    let state = apply(world(), A, 'poison', 3)
    state = apply(state, A2, 'poison', 1)
    const poison = statusOn(state, 'b', 'poison')
    expect(poison.snapshot).toMatchObject({ applierId: A, potency: 10 })
    expect(poison.remainingDuration).toBe(1)
  })

  it('a TIE keeps the current instance whole: the applier does not move', () => {
    // A2 boosted to the same potency 10 as A (Attack 50 -> 10).
    let state = world({ a2: { attack: 50 } })
    state = apply(state, A, 'poison', 3)
    state = apply(state, A2, 'poison', 3)
    expect(statusOn(state, 'b', 'poison').snapshot).toMatchObject({
      applierId: A,
      potency: 10,
    })
  })

  it('a re-application resets appliedAt (born this turn) and keeps the instance id', () => {
    let state = apply(world(), A, 'poison', 3)
    const first = statusOn(state, 'b', 'poison')
    state = { ...state, turnClock: 7 }
    state = apply(state, A2, 'poison', 3)
    const second = statusOn(state, 'b', 'poison')
    expect(second.instanceId).toBe(first.instanceId)
    expect(first.appliedAt).toBe(0)
    expect(second.appliedAt).toBe(7)
  })

  it('every application still emits StatusApplied and fires on-status-applied, weaker or tied included', () => {
    const watcher: EffectDef = {
      category: 'triggered',
      hook: 'on-status-applied',
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'self' },
        stat: 'speed',
        factor: 1.1,
      },
    }
    const state = updateCreature(world(), B, {
      activeEffects: [
        {
          ...watcher,
          instanceId: createEffectInstanceId('watch'),
          sourceTraitId: 'watch',
        },
      ],
    })
    const events: CombatEvent[] = []
    let working = apply(state, A, 'poison', 3, events)
    working = apply(working, A2, 'poison', 3, events) // weaker
    apply(working, A, 'poison', 3, events) // tie
    expect(events.filter((e) => e.type === 'StatusApplied')).toHaveLength(3)
    expect(events.filter((e) => e.type === 'TriggerFired')).toHaveLength(3)
  })

  it('a fixed-magnitude status carries no snapshot and just refreshes (Vulnerability x1.5 once)', () => {
    let state = apply(world(), A, 'vulnerability', 3)
    const first = statusOn(state, 'b', 'vulnerability')
    expect('snapshot' in first).toBe(false)
    expect('stacks' in first).toBe(false)
    state = apply(state, A2, 'vulnerability', 2)
    const second = statusOn(state, 'b', 'vulnerability')
    expect(second.instanceId).toBe(first.instanceId)
    expect(second.remainingDuration).toBe(2)
    expect(
      creature(state, 'b').activeEffects.filter((e) => e.category === 'status'),
    ).toHaveLength(1)
  })

  it('an INHERITED snapshot is the candidate instead of the applying creature’s own, and only replaces when stronger', () => {
    const inherited: StatusSnapshot = { applierId: A2, affinity: 'wit', potency: 33 }
    let state = apply(world(), A, 'poison', 3, [], inherited)
    expect(statusOn(state, 'b', 'poison').snapshot).toEqual(inherited)
    // A weaker inherited one does not replace it.
    state = apply(state, A, 'poison', 3, [], {
      applierId: A,
      affinity: 'wit',
      potency: 5,
    })
    expect(statusOn(state, 'b', 'poison').snapshot).toEqual(inherited)
  })

  it('an applier dead at application: the snapshot reads its effective stat then (Rotcore)', () => {
    const dead = updateCreature(world(), A, { alive: false, currentHp: 0 })
    const state = apply(dead, A, 'poison', 3)
    expect(statusOn(state, 'b', 'poison').snapshot).toMatchObject({
      applierId: A,
      potency: 10,
    })
  })
})

describe('pass-on rule: only the SAME status inherits the firing instance’s snapshot (ASSUMPTION 145)', () => {
  it('a status X whose effect applies a DIFFERENT status snapshots its bearer fresh, not X’s snapshot', () => {
    const xTick: EffectDef = {
      category: 'triggered',
      hook: 'on-turn-end',
      response: {
        kind: 'deal-damage',
        target: { kind: 'self' },
        flatAmount: { kind: 'snapshot-potency' },
      },
    }
    const xSeedsPoison: EffectDef = {
      category: 'triggered',
      hook: 'on-turn-start',
      response: {
        kind: 'apply-status',
        target: { kind: 'self' },
        status: { statusId: 'poison', duration: 3 },
      },
    }
    const x: StatusDef = {
      statusId: 'h2b2-seeder',
      polarity: 'debuff',
      defaultDuration: 3,
      effects: [xTick, xSeedsPoison],
      potency: { ofStat: 'attack', percent: 20 },
    }
    expect(() => validateStatusDef(x)).not.toThrow()

    const base = world()
    const state0: CombatState = {
      ...base,
      statuses: new Map([...STATUSES, [x.statusId, x]]),
    }
    // A (Attack 50) applies X to B: X's snapshot = applier A, potency floor(50 x 20 / 100) = 10.
    let state = apply(state0, A, x.statusId, 3)
    expect(statusOn(state, 'b', x.statusId).snapshot).toEqual({
      applierId: A,
      affinity: 'vitality',
      potency: 10,
    })
    state = { ...state, turnClock: 1 } // the application is old news: not born
    // B's turn start fires X's second trigger: B (Attack 20) is the firing creature.
    state = fireHook(
      'on-turn-start',
      [B],
      undefined,
      state,
      createResolutionContext([], newCascade()),
    ).state
    // The new Poison is B's own fresh snapshot: applier B, potency floor(20 x 20 / 100) = 4.
    // (Inheriting X's snapshot would give applier A, potency 10.)
    expect(statusOn(state, 'b', 'poison').snapshot).toEqual({
      applierId: B,
      affinity: 'vitality',
      potency: 4,
    })
  })
})

describe('a tick with no snapshot fails loud (resolver invariant)', () => {
  const tick = (kind: 'deal-damage' | 'heal') =>
    kind === 'deal-damage'
      ? ({
          kind,
          target: { kind: 'self' },
          flatAmount: { kind: 'snapshot-potency' },
        } as const)
      : ({
          kind,
          target: { kind: 'self' },
          flatAmount: { kind: 'snapshot-potency' },
        } as const)

  for (const kind of ['deal-damage', 'heal'] as const) {
    it(`${kind}: a snapshot-potency magnitude with no snapshot in context throws, never a 0 or a bearer-relative fallback`, () => {
      expect(() =>
        executeResponse(
          tick(kind),
          'fixture',
          { channel: 'indirect', self: B, statusId: 'poison' },
          world(),
          createResolutionContext([], newCascade()),
        ),
      ).toThrow(/snapshot-potency magnitude fired with no snapshot/)
    })
  }

  it('an instance built by hand WITHOUT a snapshot throws when its tick fires', () => {
    let state = world()
    const handBuilt: StatusEffect = {
      ...STATUS_REGISTRY.get('poison')!,
      category: 'status',
      instanceId: createEffectInstanceId('hand'),
      sourceTraitId: 'poison',
      remainingDuration: 3,
      appliedAt: 0,
    }
    state = updateCreature(state, B, { activeEffects: [handBuilt] })
    expect(() =>
      fireHook(
        'on-turn-end',
        [B],
        undefined,
        state,
        createResolutionContext([], newCascade()),
      ),
    ).toThrow(/no snapshot/)
  })
})

describe('the tick source is judged at tick time (a revived applier is the source again)', () => {
  function tickSource(state: CombatState): string | undefined {
    const events: CombatEvent[] = []
    fireHook(
      'on-turn-end',
      [B],
      undefined,
      state,
      createResolutionContext(events, newCascade()),
    )
    const dealt = events.find((e) => e.type === 'DamageDealt')
    return dealt && dealt.type === 'DamageDealt' ? dealt.sourceId : undefined
  }

  it('alive: the applier; dead: the bearer; revived: the applier again', () => {
    let state = apply(world(), A, 'poison', 3)
    state = { ...state, turnClock: 1 } // the application is old news: not born
    expect(tickSource(state)).toBe(A)
    const dead = updateCreature(state, A, { alive: false, currentHp: 0 })
    expect(tickSource(dead)).toBe(B)
    const revived = updateCreature(dead, A, { alive: true, currentHp: 5 })
    expect(tickSource(revived)).toBe(A)
  })
})

describe('validators: one potency per status, the marker only inside it', () => {
  const tickResponse = {
    kind: 'deal-damage',
    target: { kind: 'self' },
    flatAmount: { kind: 'snapshot-potency' },
  } as const
  const tick: EffectDef = {
    category: 'triggered',
    hook: 'on-turn-end',
    response: tickResponse,
  }
  const status = (over: Partial<StatusDef>): StatusDef => ({
    statusId: 'fixture',
    polarity: 'debuff',
    defaultDuration: 3,
    effects: [tick],
    potency: { ofStat: 'attack', percent: 20 },
    ...over,
  })

  it('accepts a status with a potency and exactly one self-targeted tick (and the four shipped ones)', () => {
    expect(() => validateStatusDef(status({}))).not.toThrow()
    for (const id of ['poison', 'burn', 'regen', 'spore']) {
      expect(() => validateStatusDef(STATUS_REGISTRY.get(id)!)).not.toThrow()
    }
  })

  it('rejects a tick in a status that declares no potency', () => {
    expect(() => validateStatusDef(status({ potency: undefined }))).toThrow(
      /declares no potency/,
    )
  })

  it('rejects a potency with no tick, and with two', () => {
    expect(() => validateStatusDef(status({ effects: [] }))).toThrow(/exactly one/)
    expect(() => validateStatusDef(status({ effects: [tick, tick] }))).toThrow(
      /exactly one/,
    )
  })

  it('rejects a non-positive-integer percent', () => {
    for (const percent of [2.5, 0, -3]) {
      expect(() =>
        validateStatusDef(status({ potency: { ofStat: 'attack', percent } })),
      ).toThrow(/positive integer/)
    }
  })

  it('rejects a tick that does not target self or carries a magnitudeSource', () => {
    const elsewhere: EffectDef = {
      category: 'triggered',
      hook: 'on-turn-end',
      response: { ...tickResponse, target: { kind: 'all-enemies' } },
    }
    const counted: EffectDef = {
      category: 'triggered',
      hook: 'on-turn-end',
      response: { ...tickResponse, magnitudeSource: { kind: 'flat', value: 2 } },
    }
    expect(() => validateStatusDef(status({ effects: [elsewhere] }))).toThrow(
      /target self/,
    )
    expect(() => validateStatusDef(status({ effects: [counted] }))).toThrow(
      /no magnitudeSource/,
    )
  })

  it('a heal tick is a tick too (Regen), and a status may carry only one of either kind', () => {
    const healTick: EffectDef = {
      category: 'triggered',
      hook: 'on-turn-end',
      response: {
        kind: 'heal',
        target: { kind: 'self' },
        flatAmount: { kind: 'snapshot-potency' },
      },
    }
    expect(() => validateStatusDef(status({ effects: [healTick] }))).not.toThrow()
    expect(() => validateStatusDef(status({ effects: [tick, healTick] }))).toThrow(
      /exactly one/,
    )
  })

  it('a trait, a perk and a spell may not carry the marker', () => {
    expect(() => validateNoSnapshotPotencyOutsideStatus([tick])).toThrow(
      /snapshot-potency/,
    )
    expect(() => validateNoSnapshotPotencyOutsideStatus([])).not.toThrow()
    expect(() => validateTrait({ id: 't', name: 'T', effects: [tick] })).toThrow(
      /snapshot-potency/,
    )
    const broken = {
      ...SORCERER,
      perks: SORCERER.perks.map((perk, i) =>
        i === 0 ? { ...perk, effects: [tick] } : perk,
      ),
    }
    expect(() => validateSpecialization(broken)).toThrow(/snapshot-potency/)
    const spell: Spell = {
      id: 'marker-spell',
      name: 'Marker',
      targetShape: 'single',
      affinity: 'wit',
      unlockedAtBiome: 1,
      targetSide: 'enemy',
      effects: [{ ...tickResponse, target: { kind: 'cast-target' } }],
    }
    expect(() => validateSpellEffects(spell)).toThrow(/formula mode/)
  })
})
