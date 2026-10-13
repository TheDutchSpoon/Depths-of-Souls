// A dead creature's slot is skipped inside the resolveTurn call that reaches it, and a finished
// fight refuses another call. The event-log goldens are golden-dead-slot-skip (nothing emitted,
// nothing rolled) and golden-dead-slot-round-boundary (dead entries ending a round); each test
// here is the one that fails with its mechanism removed.

import { describe, expect, it } from 'vitest'
import { createCombat, resolveTurn } from './combat'
import { ROUND_CAP } from './config'
import { updateCreature } from './creature-lookup'
import { createCreatureId } from './ids'
import { makeParty } from './__fixtures__/creatures'
import type { CreatureOverrides } from './__fixtures__/creatures'
import { FIXTURE_SCRIPTS_BY_ID } from './__fixtures__/scripts'
import { countDraws } from './test-utils/rng-draw-count'
import { deepFreeze } from './test-utils/deep-freeze'
import { stepFrozen } from './test-utils/golden-runner'
import type { CombatEvent, CombatState } from './types'
import type { StatusDef, Trait } from './effect-types'

const id = createCreatureId

const WEB_STATUS_ID = 'dead-slot-web'
const WEB_0: StatusDef = {
  statusId: WEB_STATUS_ID,
  polarity: 'debuff',
  defaultDuration: 3,
  effects: [{ category: 'turn-order', position: 'last', breakChancePercent: 0 }],
}
const WEB_SELF: Trait = {
  id: 'web-self',
  name: 'Web Self',
  effects: [
    {
      category: 'triggered',
      hook: 'on-fight-start',
      response: {
        kind: 'apply-status',
        target: { kind: 'self' },
        status: { statusId: WEB_STATUS_ID, duration: 99 },
      },
    },
  ],
}
const RETALIATE: Trait = {
  id: 'retaliate',
  name: 'Retaliate',
  effects: [
    {
      category: 'triggered',
      hook: 'on-damage-taken',
      response: {
        kind: 'deal-damage',
        target: { kind: 'triggering-source' },
        flatAmount: 99,
        damageSource: 'attack',
      },
    },
  ],
}
const REVIVE_ON_ATTACK: Trait = {
  id: 'revive-on-attack',
  name: 'Revive on Attack',
  effects: [
    {
      category: 'triggered',
      hook: 'on-attack',
      response: { kind: 'revive', target: { kind: 'random-dead-ally' }, pct: 0.2 },
    },
  ],
}
/** Round end: 999 flat damage to every enemy. */
const ROUND_END_WIPE: Trait = {
  id: 'round-end-wipe',
  name: 'Round End Wipe',
  effects: [
    {
      category: 'triggered',
      hook: 'on-round-end',
      response: {
        kind: 'deal-damage',
        target: { kind: 'all-enemies' },
        flatAmount: 999,
        damageSource: 'attack',
      },
    },
  ],
}
const TRAITS = new Map<string, Trait>(
  [WEB_SELF, RETALIATE, REVIVE_ON_ATTACK, ROUND_END_WIPE].map((t) => [t.id, t]),
)

type Spec = CreatureOverrides & { id: string }

function fight(player: Spec[], enemy: Spec[], seed = 1): CombatState {
  return createCombat({
    seed,
    player: { party: makeParty('player', player) },
    enemy: { party: makeParty('enemy', enemy) },
    registries: {
      scripts: FIXTURE_SCRIPTS_BY_ID,
      traits: TRAITS,
      statuses: new Map([[WEB_0.statusId, WEB_0]]),
    },
  })
}

function kill(state: CombatState, who: string): CombatState {
  return updateCreature(state, id(who), { alive: false, currentHp: 0 })
}

/** Steps `n` calls from a deep-frozen state; returns each call's events and the last state. */
function step(state: CombatState, n: number) {
  let working = state
  const perCall: CombatEvent[][] = []
  for (let i = 0; i < n; i++) {
    const out = stepFrozen(working)
    working = out.state
    perCall.push(out.events)
  }
  return { perCall, state: working }
}

const startedBy = (events: readonly CombatEvent[]): string[] =>
  events.flatMap((e) => (e.type === 'TurnStarted' ? [e.creatureId] : []))

describe('a creature that dies in its own turn keeps its cleanup', () => {
  it('rolls the Web after the actor died in its own action', () => {
    // ATTACKER hits TARGET and is killed by TARGET's retaliation inside its own action. ALLY keeps
    // the side alive, so the turn reaches cleanup. TARGET carries a 0% Web: the roll is a draw.
    const state = fight(
      [
        { id: 'attacker', speed: 20, health: 10, defence: 0, scriptId: 'always-attack' },
        { id: 'ally', speed: 1, health: 40, defence: 0, scriptId: 'always-wait' },
      ],
      [
        {
          id: 'target',
          speed: 1,
          health: 100,
          defence: 0,
          scriptId: 'always-wait',
          innateTraitIds: [WEB_SELF.id, RETALIATE.id],
        },
      ],
    )
    const { perCall, state: after } = step(state, 1)
    const events = perCall[0]!
    expect(
      events.some((e) => e.type === 'CreatureDied' && e.creatureId === id('attacker')),
    ).toBe(true)
    expect(events.at(-1)).toEqual({ type: 'TurnEnded', creatureId: id('attacker') })
    // One draw: the Web roll at a turn whose actor died in it.
    expect(countDraws(state.rng, after.rng)).toBe(1)
  })
})

describe('the skip is decided when the slot is dequeued', () => {
  it('a creature revived before its slot acts in that slot', () => {
    // Queue [FOE 10, UNICORN 5, FOE2 2, ALLY 1]. FOE kills ALLY (lowest-HP player), UNICORN
    // kills FOE and revives ALLY on its attack (a pool of one: one draw), FOE2 waits. ALLY's slot
    // then finds it alive.
    const state = fight(
      [
        {
          id: 'unicorn',
          speed: 5,
          health: 50,
          attack: 10,
          defence: 0,
          scriptId: 'always-attack',
          innateTraitIds: [REVIVE_ON_ATTACK.id],
        },
        { id: 'ally', speed: 1, health: 20, defence: 0, scriptId: 'always-wait' },
      ],
      [
        {
          id: 'foe',
          speed: 10,
          health: 10,
          attack: 20,
          defence: 0,
          scriptId: 'always-attack',
        },
        { id: 'foe2', speed: 2, health: 100, defence: 0, scriptId: 'always-wait' },
      ],
    )
    const { perCall } = step(state, 4)
    expect(
      perCall[0]!.some((e) => e.type === 'CreatureDied' && e.creatureId === id('ally')),
    ).toBe(true)
    expect(
      perCall[1]!.some((e) => e.type === 'Revived' && e.targetId === id('ally')),
    ).toBe(true)
    expect(perCall[3]).toEqual([
      { type: 'TurnStarted', creatureId: id('ally') },
      { type: 'Waited', creatureId: id('ally') },
      { type: 'TurnEnded', creatureId: id('ally') },
    ])
  })

  it('a creature dead at round start and revived mid-round gets no turn that round, and one the next', () => {
    const state = kill(
      fight(
        [
          {
            id: 'unicorn',
            speed: 40,
            health: 50,
            attack: 10,
            defence: 0,
            scriptId: 'always-attack',
            innateTraitIds: [REVIVE_ON_ATTACK.id],
          },
          { id: 'd', speed: 20, health: 20, defence: 0, scriptId: 'always-wait' },
        ],
        [{ id: 'foe', speed: 10, health: 1000, defence: 0, scriptId: 'always-wait' }],
      ),
      'd',
    )
    // Round 1: unicorn (revives d), foe. Round 2: unicorn, d, foe.
    const { perCall } = step(state, 5)
    const round2 = perCall[2]!.findIndex((e) => e.type === 'RoundStarted')
    expect(round2).toBeGreaterThan(-1)
    const round1Starters = [...startedBy(perCall[0]!), ...startedBy(perCall[1]!)]
    expect(round1Starters).toEqual([id('unicorn'), id('foe')])
    expect(perCall[0]!.some((e) => e.type === 'Revived')).toBe(true)
    const round2Starters = [
      ...startedBy(perCall[2]!),
      ...startedBy(perCall[3]!),
      ...startedBy(perCall[4]!),
    ]
    expect(round2Starters).toEqual([id('unicorn'), id('d'), id('foe')])
  })
})

/** Round `round`, queue [hero, foe, d1, d2] with the cursor past hero and foe, d1 and d2 dead. */
function deadTail(round: number, heroTraits: readonly string[] = []): CombatState {
  const base = fight(
    [
      {
        id: 'hero',
        speed: 30,
        health: 50,
        defence: 0,
        scriptId: 'always-wait',
        innateTraitIds: heroTraits,
      },
    ],
    [
      { id: 'foe', speed: 20, health: 100, defence: 0, scriptId: 'always-wait' },
      { id: 'd1', speed: 10, health: 1, defence: 0, scriptId: 'always-wait' },
      { id: 'd2', speed: 5, health: 1, defence: 0, scriptId: 'always-wait' },
    ],
  )
  const dead = kill(kill(base, 'd1'), 'd2')
  return {
    ...dead,
    round,
    turnQueue: ['hero', 'foe', 'd1', 'd2'].map(id),
    turnCursor: 2,
  }
}

describe('dead entries that end a round', () => {
  it('the call that skips them at the round cap ends the fight as a draw, with no new round', () => {
    const { perCall, state } = step(deadTail(ROUND_CAP), 1)
    expect(perCall[0]).toEqual([{ type: 'FightEnded', result: 'draw' }])
    expect(state.result).toBe('draw')
    expect(state.round).toBe(ROUND_CAP)
  })

  it('a round-end pass reached by skipping that wipes a side ends the fight in that call', () => {
    const { perCall, state } = step(deadTail(1, [ROUND_END_WIPE.id]), 1)
    const events = perCall[0]!
    expect(events.at(-3)).toMatchObject({ type: 'DamageDealt', targetId: id('foe') })
    expect(events.at(-2)).toEqual({ type: 'CreatureDied', creatureId: id('foe') })
    expect(events.at(-1)).toEqual({ type: 'FightEnded', result: 'win' })
    expect(events.some((e) => e.type === 'RoundStarted')).toBe(false)
    expect(state.result).toBe('win')
  })
})

describe('resolveTurn refuses a finished fight', () => {
  it('throws for a fight that ended mid-queue, leaving the input untouched', () => {
    // Queue [FOE 30, FOE2 20, HERO 10]: FOE kills HERO, the only player creature. The next entry,
    // FOE2, is alive.
    const start = fight(
      [{ id: 'hero', speed: 10, health: 5, defence: 0, scriptId: 'always-wait' }],
      [
        {
          id: 'foe',
          speed: 30,
          health: 50,
          attack: 20,
          defence: 0,
          scriptId: 'always-attack',
        },
        { id: 'foe2', speed: 20, health: 50, defence: 0, scriptId: 'always-wait' },
      ],
    )
    const { state: finished } = step(start, 1)
    expect(finished.result).toBe('loss')
    const next = finished.turnQueue[finished.turnCursor]
    expect(next).toBe(id('foe2'))
    expect(finished.enemyParty.find((c) => c.id === next)!.alive).toBe(true)

    const frozen = deepFreeze(finished)
    const before = structuredClone(finished)
    expect(() => resolveTurn(frozen)).toThrow(
      'resolveTurn: the fight already has a result',
    )
    expect(frozen).toEqual(before)
  })

  it('throws for a fight that ended at a round boundary, leaving the input untouched', () => {
    const start = fight(
      [
        {
          id: 'hero',
          speed: 30,
          health: 50,
          defence: 0,
          scriptId: 'always-wait',
          innateTraitIds: [ROUND_END_WIPE.id],
        },
      ],
      [{ id: 'foe', speed: 10, health: 100, defence: 0, scriptId: 'always-wait' }],
    )
    const { state: finished } = step(start, 3) // hero, foe, then the round-end wipe
    expect(finished.result).toBe('win')
    expect(finished.turnCursor).toBe(finished.turnQueue.length)

    const frozen = deepFreeze(finished)
    const before = structuredClone(finished)
    expect(() => resolveTurn(frozen)).toThrow(
      'resolveTurn: the fight already has a result',
    )
    expect(frozen).toEqual(before)
  })
})
