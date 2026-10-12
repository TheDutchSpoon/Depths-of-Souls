// Every multi-creature hook pass takes its creatures in turn order (`turnOrderIdsOf`), at each
// site that fires one. Mechanism tests, one per site; the `golden-pass-order-*` replays pin the
// same behaviour with hand-derived events.
//
// The shared world: players S (slot 0, speed 10) and A (slot 1, speed 40, the actor); enemies F
// (slot 0, speed 30) and T (slot 1, speed 20, the target). Turn order is A, F, T, S and the party
// arrays read S, A, F, T, so the two observers F and S fire in opposite orders under the two.

import { describe, expect, it } from 'vitest'
import { createCombat, resolveTurn } from './combat'
import { makeParty } from './__fixtures__/creatures'
import { FIXTURE_SCRIPTS_BY_ID } from './__fixtures__/scripts'
import { createCreatureId } from './ids'
import type { CombatEvent, CombatState, Spell } from './types'
import type { CreatureOverrides } from './__fixtures__/creatures'
import type { Hook, StatusDef, Trait } from './effect-types'

const F = createCreatureId('f')
const S = createCreatureId('s')

function observer(id: string, hook: Hook, extra: Partial<Trait['effects'][number]> = {}) {
  const observes =
    hook === 'on-action-observed' ||
    hook === 'on-damage-observed' ||
    hook === 'on-death-observed'
  return {
    id,
    name: id,
    effects: [
      {
        category: 'triggered',
        hook,
        ...(observes ? { observationFilter: { relationship: 'any' } } : {}),
        response: {
          kind: 'apply-stat-modifier',
          target: { kind: 'self' },
          stat: 'intelligence',
          factor: 1.1,
        },
        ...extra,
      },
    ],
  } as Trait
}

const SINGLE_SPELL: Spell = {
  id: 'pass-order-single',
  name: 'Single',
  targetShape: 'single',
  affinity: 'violence',
  targetSide: 'enemy',
  unlockedAtBiome: 1,
  effects: [
    {
      kind: 'deal-damage',
      target: { kind: 'cast-target' },
      offStat: 'cast',
      spellPower: 0.1,
    },
  ],
}

const AOE_SPELL: Spell = { ...SINGLE_SPELL, id: 'pass-order-aoe', targetShape: 'aoe' }

interface WorldInput {
  readonly traits?: readonly Trait[]
  readonly statuses?: readonly StatusDef[]
  readonly actor?: CreatureOverrides
  readonly observers?: Readonly<Record<'f' | 's', readonly string[]>>
  readonly target?: CreatureOverrides
}

function world(input: WorldInput): CombatState {
  const observed = input.observers ?? { f: [], s: [] }
  return createCombat({
    seed: 1,
    player: {
      party: makeParty('player', [
        {
          id: 's',
          health: 100,
          speed: 10,
          affinity: 'violence',
          scriptId: 'always-wait',
          innateTraitIds: observed.s,
        },
        {
          id: 'a',
          health: 100,
          speed: 40,
          attack: 40,
          affinity: 'violence',
          scriptId: 'always-attack',
          ...input.actor,
        },
      ]),
    },
    enemy: {
      party: makeParty('enemy', [
        {
          id: 'f',
          health: 100,
          speed: 30,
          affinity: 'violence',
          scriptId: 'always-wait',
          innateTraitIds: observed.f,
        },
        {
          id: 't',
          health: 100,
          speed: 20,
          affinity: 'violence',
          scriptId: 'always-wait',
          ...input.target,
        },
      ]),
    },
    registries: {
      scripts: FIXTURE_SCRIPTS_BY_ID,
      traits: new Map((input.traits ?? []).map((t) => [t.id, t])),
      statuses: new Map((input.statuses ?? []).map((s) => [s.statusId, s])),
    },
  })
}

const firedFor = (hook: Hook, events: readonly CombatEvent[]) =>
  events.flatMap((e) =>
    e.type === 'TriggerFired' && e.hook === hook ? [e.sourceId] : [],
  )

/** F and S both carry `trait`; one turn (A's) resolves. */
function firingOrder(hook: Hook, input: Omit<WorldInput, 'observers'>, trait: Trait) {
  const state = world({
    ...input,
    traits: [...(input.traits ?? []), trait],
    observers: { f: [trait.id], s: [trait.id] },
  })
  return firedFor(hook, resolveTurn(state).events)
}

describe('on-action-observed takes turn order at each of the five action sites', () => {
  const watch = observer('watch-action', 'on-action-observed')

  it('attack', () => {
    expect(firingOrder('on-action-observed', {}, watch)).toEqual([F, S])
  })

  it('single-target cast', () => {
    const order = firingOrder(
      'on-action-observed',
      {
        actor: { scriptId: 'always-cast', equippedSpells: [SINGLE_SPELL] },
      },
      watch,
    )

    expect(order).toEqual([F, S])
  })

  it('AOE cast', () => {
    const order = firingOrder(
      'on-action-observed',
      { actor: { scriptId: 'always-cast', equippedSpells: [AOE_SPELL] } },
      watch,
    )

    expect(order).toEqual([F, S])
  })

  it('defend', () => {
    const order = firingOrder(
      'on-action-observed',
      { actor: { scriptId: 'always-defend' } },
      watch,
    )

    expect(order).toEqual([F, S])
  })

  it('provoke', () => {
    const order = firingOrder(
      'on-action-observed',
      { actor: { scriptId: 'always-provoke' } },
      watch,
    )

    expect(order).toEqual([F, S])
  })
})

describe('the other multi-creature passes take turn order', () => {
  it('on-damage-observed', () => {
    const watch = observer('watch-damage', 'on-damage-observed')

    expect(firingOrder('on-damage-observed', {}, watch)).toEqual([F, S])
  })

  it('on-death-observed, the dead creature left out', () => {
    const watch = observer('watch-death', 'on-death-observed')

    // T has 1 HP and carries nothing: A's attack kills it.
    const order = firingOrder('on-death-observed', { target: { health: 1 } }, watch)

    expect(order).toEqual([F, S])
  })

  it('on-fight-start', () => {
    const watch = observer('watch-start', 'on-fight-start')
    const state = world({ traits: [watch], observers: { f: [watch.id], s: [watch.id] } })

    expect(firedFor('on-fight-start', resolveTurn(state).events)).toEqual([F, S])
  })

  it('on-round-end', () => {
    const watch = observer('watch-end', 'on-round-end')
    let state = world({ traits: [watch], observers: { f: [watch.id], s: [watch.id] } })
    const events: CombatEvent[] = []
    // Round 1 has four turns; the fifth call opens with the round-end pass.
    for (let turn = 0; turn < 5; turn++) {
      const step = resolveTurn(state)
      state = step.state
      events.push(...step.events)
    }

    expect(firedFor('on-round-end', events)).toEqual([F, S])
  })
})

describe('a pass is built from the state at the moment it starts', () => {
  it('includes a creature given an observer status by an earlier response in the same pass', () => {
    const watchStatus: StatusDef = {
      statusId: 'watch-status',
      polarity: 'buff',
      defaultDuration: 9,
      effects: [
        {
          category: 'triggered',
          hook: 'on-action-observed',
          observationFilter: { relationship: 'any' },
          response: {
            kind: 'apply-stat-modifier',
            target: { kind: 'self' },
            stat: 'intelligence',
            factor: 1.1,
          },
        },
      ],
    }
    // F carries the only observer trait: it gives S the watching status. S carries nothing at the
    // start of the pass but fires in the same pass, after F.
    const giver = observer('give-status', 'on-action-observed', {
      response: {
        kind: 'apply-status',
        target: { kind: 'selector', selector: { kind: 'lowest-hp-enemy' } },
        status: { statusId: watchStatus.statusId },
      },
    })
    const state = world({
      traits: [giver],
      statuses: [watchStatus],
      observers: { f: [giver.id], s: [] },
      // S is the lowest-HP player creature.
      actor: { health: 200 },
    })

    const events = resolveTurn(state).events

    expect(firedFor('on-action-observed', events)).toEqual([F, S])
  })

  it('reads Speed again at each attack instance, not once at the action start', () => {
    // F lifts S's Speed 10 -> 40 (above F's 30) on every observation.
    const lift = observer('lift-speed', 'on-action-observed', {
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'selector', selector: { kind: 'lowest-hp-enemy' } },
        stat: 'speed',
        factor: 4,
      },
    })
    const watch = observer('watch-action', 'on-action-observed')
    const echo: Trait = {
      id: 'attack-twice',
      name: 'Attack Twice',
      effects: [{ category: 'action-instance', actionKind: 'attack', powerPercent: 100 }],
    }
    const state = world({
      traits: [lift, watch, echo],
      observers: { f: [lift.id], s: [watch.id] },
      actor: { health: 200, innateTraitIds: [echo.id] },
    })

    const events = resolveTurn(state).events

    // Instance 0 is taken from F 30, S 10; instance 1, after F's lift, from S 40, F 30.
    expect(firedFor('on-action-observed', events)).toEqual([F, S, S, F])
  })
})
