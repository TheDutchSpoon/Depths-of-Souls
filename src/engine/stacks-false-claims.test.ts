import { describe, expect, it } from 'vitest'
import { createCombat } from './combat'
import { createResolutionContext } from './actions'
import { updateCreature, getCreature } from './creature-lookup'
import { instantiateStatus } from './effects'
import { executeResponse, fireHook, newCascade } from './resolution'
import { turnOrderIdsOf } from './turn-order'
import { createCreatureId } from './ids'
import { makeParty } from './__fixtures__/creatures'
import type { CreatureOverrides } from './__fixtures__/creatures'
import { countDraws } from './test-utils/rng-draw-count'
import { createEffectInstanceId } from './effect-types'
import type {
  ActiveEffect,
  EffectDef,
  Hook,
  StatusDef,
  Trait,
  TriggeredDef,
} from './effect-types'
import type { FireHookOptions } from './resolution'
import type { CombatEvent, CombatState } from './types'

// `stacks: false` claims ONE slot per trigger DEFINITION per `fireHook` call
// (`spec/effects.md#stacks-false`): the key names the carrier kind, the carrier's id and the
// trigger's position in the carrier's effect list, so it is shared by every creature carrying that
// definition and by nothing else.

const HEAL_SELF = { kind: 'heal', target: { kind: 'self' }, flatAmount: 1 } as const

function nonStacking(extra: Partial<TriggeredDef> = {}): TriggeredDef {
  return {
    category: 'triggered',
    hook: 'on-turn-start',
    stacks: false,
    response: HEAL_SELF,
    ...extra,
  }
}

function traitOf(id: string, effects: readonly EffectDef[]): Trait {
  return { id, name: id, effects }
}

function statusOf(statusId: string, effects: readonly EffectDef[]): StatusDef {
  return { statusId, effects, polarity: 'buff', defaultDuration: 5 }
}

function setup(opts: {
  player: CreatureOverrides[]
  enemy: CreatureOverrides[]
  traits?: Trait[]
  playerEffects?: EffectDef[]
}): CombatState {
  return createCombat({
    seed: 1,
    player: {
      party: makeParty('player', opts.player),
      effects: opts.playerEffects,
    },
    enemy: { party: makeParty('enemy', opts.enemy) },
    registries: { traits: new Map((opts.traits ?? []).map((t) => [t.id, t])) },
  })
}

function withStatus(
  state: CombatState,
  creatureId: string,
  def: StatusDef,
  instance: string,
): CombatState {
  const id = createCreatureId(creatureId)
  const status = instantiateStatus(def, createEffectInstanceId(instance), 5, undefined, 0)
  return updateCreature(state, id, {
    activeEffects: [...getCreature(state, id).activeEffects, status],
  })
}

function fire(
  state: CombatState,
  hook: Hook = 'on-turn-start',
  source?: string,
  options?: FireHookOptions,
): { state: CombatState; events: CombatEvent[] } {
  // `fireHook` advances the bookmark it is given in place, so it gets a copy (as `resolveTurn`
  // does) and the caller's `state.rng` stays the "before" bookmark.
  const working = { ...state, rng: { position: state.rng.position } }
  const events: CombatEvent[] = []
  const result = fireHook(
    hook,
    turnOrderIdsOf(working),
    source === undefined ? undefined : createCreatureId(source),
    working,
    createResolutionContext(events, newCascade()),
    options,
  )
  return { state: result.state, events }
}

const firedBy = (events: CombatEvent[]): string[] =>
  events.flatMap((e) => (e.type === 'TriggerFired' ? [e.sourceId] : []))

describe('stacks: false claims are per trigger definition', () => {
  it('two stacks:false triggers in one trait are two claims: both fire', () => {
    const T = traitOf('two-triggers', [nonStacking(), nonStacking()])
    const state = setup({
      player: [{ id: 'a', speed: 20, innateTraitIds: [T.id] }],
      enemy: [{ id: 'e', speed: 10 }],
      traits: [T],
    })
    expect(firedBy(fire(state).events)).toEqual(['a', 'a'])
  })

  it('two stacks:false triggers in one status are two claims: both fire', () => {
    const S = statusOf('two-status-triggers', [nonStacking(), nonStacking()])
    const state = withStatus(
      setup({ player: [{ id: 'a', speed: 20 }], enemy: [{ id: 'e', speed: 10 }] }),
      'a',
      S,
      'st#1',
    )
    expect(firedBy(fire(state).events)).toEqual(['a', 'a'])
  })

  it('a trait id equal to a status id does not share a claim: both fire', () => {
    const T = traitOf('same-id', [nonStacking()])
    const S = statusOf('same-id', [nonStacking()])
    const state = withStatus(
      setup({
        player: [{ id: 'a', speed: 20, innateTraitIds: [T.id] }],
        enemy: [{ id: 'e', speed: 10 }],
        traits: [T],
      }),
      'e',
      S,
      'st#1',
    )
    expect(firedBy(fire(state).events)).toEqual(['a', 'e'])
  })

  it('one trait trigger carried by two creatures on opposite sides is one claim: the first in turn order fires, the second never rolls', () => {
    const T = traitOf('shared', [nonStacking({ chancePercent: 50 })])
    const state = setup({
      player: [{ id: 'a', speed: 20, innateTraitIds: [T.id] }],
      enemy: [{ id: 'e', speed: 10, innateTraitIds: [T.id] }],
      traits: [T],
    })
    // One claim: A (first in turn order) rolls once and E never does. Two claims would be two draws.
    const { state: after } = fire(state)
    expect(countDraws(state.rng, after.rng)).toBe(1)
  })

  it('a creature carrying one trait twice makes one claim', () => {
    const T = traitOf('doubled', [nonStacking()])
    const state = setup({
      player: [{ id: 'a', speed: 20, innateTraitIds: [T.id, T.id] }],
      enemy: [{ id: 'e', speed: 10 }],
      traits: [T],
    })
    expect(firedBy(fire(state).events)).toEqual(['a'])
  })

  it('a side-effect trigger carried by two party members is one claim', () => {
    const state = setup({
      player: [
        { id: 'a', speed: 20 },
        { id: 'b', speed: 15 },
      ],
      enemy: [{ id: 'e', speed: 10 }],
      playerEffects: [nonStacking()],
    })
    expect(firedBy(fire(state).events)).toEqual(['a'])
  })

  it('two different side-effect triggers are two claims', () => {
    const state = setup({
      player: [
        { id: 'a', speed: 20 },
        { id: 'b', speed: 15 },
      ],
      enemy: [{ id: 'e', speed: 10 }],
      playerEffects: [nonStacking(), nonStacking()],
    })
    expect(firedBy(fire(state).events)).toEqual(['a', 'a'])
  })

  it('a revived carrier keeps its claim key: still one claim after the revive', () => {
    const T = traitOf('revivable', [nonStacking()])
    const created = setup({
      player: [
        { id: 'a', speed: 20, innateTraitIds: [T.id] },
        { id: 'b', speed: 15, innateTraitIds: [T.id] },
      ],
      enemy: [{ id: 'e', speed: 10 }],
      traits: [T],
    })
    const dead = updateCreature(created, createCreatureId('b'), { alive: false })
    const revived = executeResponse(
      { kind: 'revive', target: { kind: 'random-dead-ally' }, pct: 0.5 },
      'fixture',
      { channel: 'indirect', self: createCreatureId('a') },
      dead,
      createResolutionContext([], newCascade()),
    ).state
    const b = getCreature(revived, createCreatureId('b'))
    expect(b.alive).toBe(true)
    expect(
      b.activeEffects.map((e) => ('claimKey' in e ? e.claimKey : undefined)),
    ).toEqual(['trait:revivable#0'])
    expect(firedBy(fire(revived).events)).toEqual(['a'])
  })

  it('a stacks:false effect with no claimKey is a resolver-invariant error', () => {
    const unkeyed: ActiveEffect = {
      ...nonStacking(),
      instanceId: createEffectInstanceId('unkeyed#1'),
      sourceTraitId: 'unkeyed',
    }
    const created = setup({
      player: [{ id: 'a', speed: 20 }],
      enemy: [{ id: 'e', speed: 10 }],
    })
    const state = updateCreature(created, createCreatureId('a'), {
      activeEffects: [unkeyed],
    })
    expect(() => fire(state)).toThrow(
      /stacks: false effect from "unkeyed" has no claimKey/,
    )
  })
})

describe('a skipped candidate claims no stacks:false slot', () => {
  it('skipped by its condition: the next carrier still fires', () => {
    // Fires only at full HP. A (faster) is wounded, so its condition is false; B is whole.
    const T = traitOf('conditional', [
      nonStacking({
        condition: {
          kind: 'hp-percent',
          subject: 'self',
          qualifier: 'any',
          comparator: '>=',
          thresholdPercent: 100,
        },
      }),
    ])
    const created = setup({
      player: [
        { id: 'a', speed: 20, innateTraitIds: [T.id] },
        { id: 'b', speed: 15, innateTraitIds: [T.id] },
      ],
      enemy: [{ id: 'e', speed: 10 }],
      traits: [T],
    })
    const state = updateCreature(created, createCreatureId('a'), { currentHp: 1 })
    expect(firedBy(fire(state).events)).toEqual(['b'])
  })

  it('skipped by its observationFilter relationship: the next carrier still fires', () => {
    // Observes an action by E (enemy side) from an ALLY of the actor. A (player side, first in turn
    // order) is E's enemy, so its relationship doesn't match and it is skipped; E2 is E's ally.
    const T = traitOf('observer', [
      nonStacking({
        hook: 'on-action-observed',
        observationFilter: { relationship: 'ally' },
      }),
    ])
    const state = setup({
      player: [{ id: 'a', speed: 20, innateTraitIds: [T.id] }],
      enemy: [
        { id: 'e', speed: 10 },
        { id: 'e2', speed: 5, innateTraitIds: [T.id] },
      ],
      traits: [T],
    })
    const { events } = fire(state, 'on-action-observed', 'e', {
      observed: { actionKind: 'attack', instanceIndex: 0 },
    })
    expect(firedBy(events)).toEqual(['e2'])
  })
})
