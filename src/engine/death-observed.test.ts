// `on-death-observed` -- the death sibling of the other two observation hooks, fired once per
// death over every living creature but the dead one (`fireDeathObservers`, resolution.ts).
// Mechanism tests; `golden-death-observed` pins the same behaviour as a replay.

import { describe, expect, it } from 'vitest'
import { createCombat } from './combat'
import { createResolutionContext } from './actions'
import { executeResponse, fireHook, newCascade } from './resolution'
import { updateCreature } from './creature-lookup'
import { makeParty } from './__fixtures__/creatures'
import { createCreatureId } from './ids'
import { FIXTURE_SCRIPTS_BY_ID } from './__fixtures__/scripts'
import type { CombatEvent, CombatState } from './types'
import type { ObservationFilter, Trait } from './effect-types'

const V = createCreatureId('v') // player
const W = createCreatureId('w') // player
const X = createCreatureId('x') // enemy
const Y = createCreatureId('y') // enemy

type Relationship = NonNullable<ObservationFilter['relationship']> | 'absent'

function deathObserver(id: string, relationship: Relationship, stacks = true): Trait {
  return {
    id,
    name: id,
    effects: [
      {
        category: 'triggered',
        hook: 'on-death-observed',
        ...(relationship === 'absent' ? {} : { observationFilter: { relationship } }),
        ...(stacks ? {} : { stacks: false }),
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

/** The Unicorn's shape on `on-death`: a revive whose pool (`random-dead-ally`) holds only the
 * dying creature itself, so it comes back before its death's observers fire. */
const REVIVE_SELF: Trait = {
  id: 'revive-self',
  name: 'revive-self',
  effects: [
    {
      category: 'triggered',
      hook: 'on-death',
      response: { kind: 'revive', target: { kind: 'random-dead-ally' }, pct: 0.5 },
    },
  ],
}

/** Players V (slot 0) and W (slot 1); enemies X (slot 0) and Y (slot 1); health 100. */
function world(traits: Readonly<Record<string, readonly Trait[]>>): CombatState {
  const carried = (id: string) => (traits[id] ?? []).map((t) => t.id)
  const registry = new Map(
    Object.values(traits).flatMap((ts) => ts.map((t) => [t.id, t])),
  )
  const member = (id: string) => ({
    id,
    health: 100,
    scriptId: 'always-wait',
    innateTraitIds: carried(id),
  })
  return createCombat({
    seed: 1,
    player: { party: makeParty('player', [member('v'), member('w')]) },
    enemy: { party: makeParty('enemy', [member('x'), member('y')]) },
    registries: { scripts: FIXTURE_SCRIPTS_BY_ID, traits: registry },
  })
}

/** Kills `dead` with a cost response of its own (the lethal path through `applyDamageAndEmit`). */
function kill(dead: ReturnType<typeof createCreatureId>, state: CombatState) {
  const events: CombatEvent[] = []
  const ctx = createResolutionContext(events, newCascade())
  const after = executeResponse(
    { kind: 'deal-damage', target: { kind: 'self' }, flatAmount: 1000 },
    'fixture',
    { channel: 'indirect', self: dead },
    state,
    ctx,
  )
  return { events, state: after.state }
}

function observers(events: readonly CombatEvent[]): string[] {
  return events.flatMap((e) =>
    e.type === 'TriggerFired' && e.hook === 'on-death-observed' ? [e.sourceId] : [],
  )
}

describe('on-death-observed filter: relationship compares the observer with the dead creature', () => {
  // [relationship, dead creature, who fires]: W/V are players, X/Y are enemies.
  const rows: [Relationship, string, ReturnType<typeof createCreatureId>[]][] = [
    ['ally', 'v', [W]],
    ['enemy', 'v', [X, Y]],
    ['any', 'v', [W, X, Y]],
    ['absent', 'v', [W, X, Y]],
    ['ally', 'x', [Y]],
    ['enemy', 'x', [V, W]],
    ['any', 'x', [V, W, Y]],
    ['absent', 'x', [V, W, Y]],
  ]

  it.each(rows)('%s, %s dies', (relationship, dead, expected) => {
    const watcher = deathObserver(`watch-${relationship}`, relationship)
    const state = world({ v: [watcher], w: [watcher], x: [watcher], y: [watcher] })

    const { events } = kill(createCreatureId(dead), state)

    expect(observers(events)).toEqual(expected)
  })
})

describe('on-death-observed order', () => {
  it('fires the player side first, then the enemy side, whichever side the dead creature was on', () => {
    const watcher = deathObserver('watch-any', 'any')
    const state = world({ v: [watcher], w: [watcher], x: [watcher], y: [watcher] })

    // An enemy dies: its ally Y used to fire before its enemies V and W.
    expect(observers(kill(X, state).events)).toEqual([V, W, Y])
    expect(observers(kill(V, state).events)).toEqual([W, X, Y])
  })
})

describe('a creature never observes its own death', () => {
  it('not even when its own on-death revive brings it back before the observers fire', () => {
    const watcher = deathObserver('watch-any', 'any')
    const state = world({ v: [REVIVE_SELF, watcher], w: [watcher] })

    const { events, state: after } = kill(V, state)

    // V is alive when its observers fire
    expect(events.some((e) => e.type === 'Revived')).toBe(true)
    expect(after.playerParty.find((c) => c.id === V)!.alive).toBe(true)
    expect(observers(events)).toEqual([W])
  })
})

describe('on-death-observed is one fireHook call', () => {
  it('a stacks:false observer on opposite sides fires once between them', () => {
    const once = deathObserver('watch-once', 'any', false)
    const state = world({ w: [once], y: [once] })

    const { events } = kill(V, state)

    expect(observers(events)).toEqual([W])
  })
})

describe('fireHook(on-death-observed)', () => {
  const ctxFor = (events: CombatEvent[]) => createResolutionContext(events, newCascade())

  it('is alive-gated: a dead observer does not fire', () => {
    const watcher = deathObserver('watch-any', 'any')
    let state = world({ v: [watcher], w: [watcher] })
    state = updateCreature(state, V, { alive: false, currentHp: 0 })
    state = updateCreature(state, W, { alive: false, currentHp: 0 })
    const events: CombatEvent[] = []

    fireHook('on-death-observed', [W], V, state, ctxFor(events))

    expect(observers(events)).toEqual([])
  })

  it('fails closed when the dead creature is absent or unknown, with or without a filter', () => {
    const filterless = deathObserver('watch-absent', 'absent')
    const ally = deathObserver('watch-ally', 'ally')
    const state = world({ v: [filterless], w: [ally] })
    const events: CombatEvent[] = []

    for (const source of [createCreatureId('nobody'), undefined]) {
      fireHook('on-death-observed', [V, W], source, state, ctxFor(events))
    }

    expect(observers(events)).toEqual([])
  })
})
