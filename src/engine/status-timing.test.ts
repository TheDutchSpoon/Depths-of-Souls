// Phase 4.1-F2: status timing in the bearer's turns -- the born-this-turn clock, the countdown and
// the Web roll in turn-end cleanup, and the win checks inside a turn (ASSUMPTIONS 15, 18, 19, 49,
// 51, 52). The goldens (golden-f2-*, golden-stun, golden-dot, ...) pin end-to-end logs; each test
// here is the one that fails with its mechanism removed (the phase record lists each mutation).

import { describe, expect, it } from 'vitest'
import { createCombat, resolveTurn } from './combat'
import { updateCreature } from './creature-lookup'
import { createCreatureId } from './ids'
import { makeParty } from './__fixtures__/creatures'
import { countDraws } from './test-utils/rng-draw-count'
import { FIXTURE_SCRIPTS_BY_ID } from './__fixtures__/scripts'
import { STATUS_REGISTRY } from '../data/statuses'
import { SORCERER_STARTER_TRAIT } from '../data/traits/starters'
import type { CombatEvent, CombatState, Spell } from './types'
import { validateStatusDef } from './effect-types'
import type { EffectDef, StatusDef, Trait } from './effect-types'
import type { Script } from './scripting-types'

// ---- Fixture builder ----

interface Spec {
  readonly id: string
  readonly speed: number
  readonly health?: number
  readonly attack?: number
  readonly script?: string
  readonly effects?: readonly EffectDef[]
  readonly spells?: readonly Spell[]
  /** Starting HP, applied after `createCombat` (which resets HP to max). */
  readonly hp?: number
}

/** A Web with a 100% break chance: a rolled Web always breaks, so a roll shows as `StatusExpired`. */
const WEB_100: StatusDef = {
  statusId: 'web-100',
  polarity: 'debuff',
  defaultDuration: 3,
  effects: [{ category: 'turn-order', position: 'last', breakChancePercent: 100 }],
}
/** A Web with a 50% break chance (used where a roll must be observable as a draw, not an outcome). */
const WEB_50: StatusDef = {
  ...WEB_100,
  statusId: 'web-50',
  effects: [{ category: 'turn-order', position: 'last', breakChancePercent: 50 }],
}

const LETHAL_BOLT: Spell = {
  id: 'lethal-bolt-fixture',
  name: 'Lethal Bolt (fixture)',
  targetShape: 'single',
  affinity: 'vitality',
  targetSide: 'enemy',
  unlockedAtBiome: 1,
  effects: [
    {
      kind: 'deal-damage',
      target: { kind: 'cast-target' },
      offStat: 'cast',
      spellPower: 50,
    },
  ],
}

const CAST_SLOT_0: Script = {
  id: 'cast-slot-0-fixture',
  rules: [{ condition: { kind: 'always' }, action: { kind: 'cast', gemSlot: 0 } }],
}

const statusRegistry = new Map<string, StatusDef>([
  ...STATUS_REGISTRY,
  [WEB_100.statusId, WEB_100],
  [WEB_50.statusId, WEB_50],
])

const id = createCreatureId

function fight(player: readonly Spec[], enemy: readonly Spec[], seed = 1): CombatState {
  const traits = new Map<string, Trait>()
  const party = (side: 'player' | 'enemy', specs: readonly Spec[]) =>
    makeParty(
      side,
      specs.map((s) => {
        if (s.effects)
          traits.set(`t-${s.id}`, { id: `t-${s.id}`, name: s.id, effects: s.effects })
        return {
          id: s.id,
          speed: s.speed,
          health: s.health ?? 100,
          attack: s.attack ?? 20,
          defence: 5,
          scriptId: s.script ?? 'always-wait',
          ...(s.effects ? { innateTraitIds: [`t-${s.id}`] } : {}),
          ...(s.spells ? { equippedSpells: s.spells } : {}),
        }
      }),
    )
  const created = createCombat({
    seed,
    player: { party: party('player', player) },
    enemy: { party: party('enemy', enemy) },
    registries: {
      scripts: new Map([...FIXTURE_SCRIPTS_BY_ID, [CAST_SLOT_0.id, CAST_SLOT_0]]),
      traits,
      statuses: statusRegistry,
    },
  })
  return [...player, ...enemy].reduce(
    (s, spec) =>
      spec.hp === undefined ? s : updateCreature(s, id(spec.id), { currentHp: spec.hp }),
    created,
  )
}

function run(state: CombatState, turns: number) {
  let working = state
  const perTurn: CombatEvent[][] = []
  for (let i = 0; i < turns; i++) {
    const step = resolveTurn(working)
    working = step.state
    perTurn.push(step.events)
  }
  return { state: working, perTurn, events: perTurn.flat() }
}

const types = (events: readonly CombatEvent[]) => events.map((e) => e.type)
const has = (events: readonly CombatEvent[], type: CombatEvent['type']) =>
  events.some((e) => e.type === type)
const creatureOf = (state: CombatState, who: string) =>
  [...state.playerParty, ...state.enemyParty].find((c) => c.id === id(who))!
const statusOn = (state: CombatState, who: string, statusId: string) =>
  creatureOf(state, who).activeEffects.find(
    (e) => e.category === 'status' && e.statusId === statusId,
  )

const applyStatusTo = (
  hook: 'on-turn-start' | 'on-turn-end' | 'on-attack' | 'on-round-end' | 'on-fight-start',
  target: 'self' | 'all-enemies',
  statusId: string,
  duration?: number,
  round?: number,
): EffectDef => ({
  category: 'triggered',
  hook,
  ...(round !== undefined
    ? { condition: { kind: 'round-number', comparator: '==', round } as const }
    : {}),
  response: {
    kind: 'apply-status',
    target: { kind: target },
    status: { statusId, ...(duration !== undefined ? { duration } : {}) },
  },
})

const lethalHit = (
  hook: 'on-fight-start' | 'on-turn-start' | 'on-turn-end' | 'on-round-end',
): EffectDef => ({
  category: 'triggered',
  hook,
  response: {
    kind: 'deal-damage',
    target: { kind: 'selector', selector: { kind: 'lowest-hp-enemy' } },
    flatAmount: 999,
  },
})

// ---- The born-this-turn clock: the action-slot window (ASSUMPTIONS 18, 49) ----

describe('the born window opens at the action slot', () => {
  it('a Weaken 1 self-applied at turn START counts down at that same turn end (applied before the slot)', () => {
    const state = fight(
      [
        {
          id: 'x',
          speed: 20,
          effects: [applyStatusTo('on-turn-start', 'self', 'weaken', 1, 1)],
        },
      ],
      [{ id: 'foe', speed: 1 }],
    )
    const { perTurn } = run(state, 1)
    // SA, then the cleanup's StatusExpired, both inside X's bracket, before TurnEnded.
    expect(types(perTurn[0]!).slice(-3)).toEqual(['Waited', 'StatusExpired', 'TurnEnded'])
  })

  it('the same Weaken applied at turn END (since the slot) is born: no countdown that turn, expires next turn end', () => {
    const state = fight(
      [
        {
          id: 'x',
          speed: 20,
          effects: [applyStatusTo('on-turn-end', 'self', 'weaken', 1, 1)],
        },
      ],
      [{ id: 'foe', speed: 1 }],
    )
    const { perTurn, state: after } = run(state, 3) // X, foe, X (round 2)
    expect(has(perTurn[0]!, 'StatusExpired')).toBe(false)
    expect(has(perTurn[2]!, 'StatusExpired')).toBe(true)
    expect(statusOn(after, 'x', 'weaken')).toBeUndefined()
  })

  it('a status applied BETWEEN turns (round end) is not born in the next turn: it ticks at that turn end', () => {
    // X applies Poison to itself in its round-1 on-round-end; X acts first in round 2 and its
    // turn-end tick must fire (the clock moved on from the value the round-end application carried).
    const state = fight(
      [
        {
          id: 'x',
          speed: 20,
          effects: [applyStatusTo('on-round-end', 'self', 'poison', 3, 1)],
        },
      ],
      [{ id: 'foe', speed: 1 }],
    )
    const { perTurn } = run(state, 3) // X, foe, then round 2's X
    expect(
      perTurn[2]!.some((e) => e.type === 'DamageDealt' && e.damageSource === 'dot'),
    ).toBe(true)
  })
})

// ---- The countdown and the tick gate (ASSUMPTIONS 18, 52) ----

describe('born-this-turn: tick gate and countdown', () => {
  // X attacks in round 1 only; its on-attack trigger Poisons it (an action-phase application,
  // BEFORE the turn-end hooks).
  const poisonOnFirstAttack = (): CombatState =>
    fight(
      [
        {
          id: 'x',
          speed: 20,
          script: 'always-attack',
          effects: [applyStatusTo('on-attack', 'self', 'poison', 3, 1)],
        },
      ],
      [{ id: 'foe', speed: 1, health: 1000 }],
    )

  it('a status applied in the bearer action does not tick that turn, ticks the next', () => {
    const { perTurn } = run(poisonOnFirstAttack(), 3) // X, foe, X
    const dot = (events: readonly CombatEvent[]) =>
      events.filter((e) => e.type === 'DamageDealt' && e.damageSource === 'dot')
    expect(dot(perTurn[0]!)).toHaveLength(0)
    expect(dot(perTurn[2]!)).toHaveLength(1)
  })

  it('a status applied in the bearer action does not count down that turn, counts down the next', () => {
    const { state: afterOne } = run(poisonOnFirstAttack(), 1)
    expect(statusOn(afterOne, 'x', 'poison')).toMatchObject({ remainingDuration: 3 })
    const { state: afterThree } = run(poisonOnFirstAttack(), 3)
    expect(statusOn(afterThree, 'x', 'poison')).toMatchObject({ remainingDuration: 2 })
  })

  it("a status applied in ANOTHER creature's turn ticks and counts down at its bearer's next turn end", () => {
    const state = fight(
      [
        {
          id: 'a',
          speed: 30,
          effects: [applyStatusTo('on-turn-start', 'all-enemies', 'poison', 1, 1)],
        },
      ],
      [{ id: 'e', speed: 10 }],
    )
    const { perTurn } = run(state, 2) // A, E
    const eTurn = perTurn[1]!
    expect(types(eTurn).slice(-4)).toEqual([
      'Waited',
      'DamageDealt',
      'StatusExpired',
      'TurnEnded',
    ])
  })
})

// ---- Corpses (ASSUMPTION 51) ----

describe("a corpse's statuses are inert", () => {
  it('a bearer that dies in its own turn gets no countdown and no StatusExpired', () => {
    // X carries a preset Weaken 1, then its own on-turn-end lethal self-hit kills it (an ally
    // keeps the side alive). The cleanup must skip the dead bearer.
    const selfKill: EffectDef = {
      category: 'triggered',
      hook: 'on-turn-end',
      response: { kind: 'deal-damage', target: { kind: 'self' }, flatAmount: 999 },
    }
    const state = fight(
      [
        {
          id: 'x',
          speed: 20,
          effects: [applyStatusTo('on-fight-start', 'self', 'weaken', 1), selfKill],
        },
        { id: 'ally', speed: 15 },
      ],
      [{ id: 'foe', speed: 1 }],
    )
    const { perTurn, state: after } = run(state, 1)
    expect(has(perTurn[0]!, 'CreatureDied')).toBe(true)
    expect(has(perTurn[0]!, 'StatusExpired')).toBe(false)
    expect(statusOn(after, 'x', 'weaken')).toBeDefined() // still on the corpse, inert
  })
})

// ---- The Web roll in turn-end cleanup (ASSUMPTION 15) ----

describe('the Web roll', () => {
  it('a Web applied since the action slot is not rolled at the applier turn end, but at the next creature turn end', () => {
    // A Webs E in its turn-end hooks (born in A's turn). WEB_100 would break on any roll.
    const state = fight(
      [
        {
          id: 'a',
          speed: 30,
          effects: [applyStatusTo('on-turn-end', 'all-enemies', 'web-100', 3, 1)],
        },
        { id: 'b', speed: 20 },
      ],
      [{ id: 'e', speed: 10 }],
    )
    const { perTurn } = run(state, 2) // A, B
    expect(has(perTurn[0]!, 'StatusExpired')).toBe(false)
    expect(types(perTurn[1]!).slice(-3)).toEqual(['Waited', 'StatusExpired', 'TurnEnded'])
  })

  it('a Web applied in the applier turn-START hooks is rolled at that same turn end (the one window)', () => {
    const state = fight(
      [
        {
          id: 'a',
          speed: 30,
          effects: [applyStatusTo('on-turn-start', 'all-enemies', 'web-100', 3, 1)],
        },
      ],
      [{ id: 'e', speed: 10 }],
    )
    const { perTurn } = run(state, 1)
    expect(types(perTurn[0]!).slice(-3)).toEqual(['Waited', 'StatusExpired', 'TurnEnded'])
  })

  it("a dead actor's empty bracket still bumps the clock and rolls: a Web placed in the previous turn action is rolled there", () => {
    // Queue [A, D, E]. A kills D (1 HP) with its attack, then Webs E in its turn-end hooks (born
    // in A's turn: not rolled at A's cleanup). D's slot is a dead actor's empty bracket: its
    // cleanup is the next roll, so the Web breaks inside D's bracket.
    const state = fight(
      [
        {
          id: 'a',
          speed: 30,
          script: 'always-attack',
          effects: [
            {
              category: 'triggered',
              hook: 'on-turn-end',
              response: {
                kind: 'apply-status',
                target: { kind: 'selector', selector: { kind: 'lowest-hp-enemy' } },
                status: { statusId: 'web-100', duration: 3 },
              },
            },
          ],
        },
      ],
      [
        { id: 'd', speed: 20, health: 1 },
        { id: 'e', speed: 10 },
      ],
    )
    const { perTurn } = run(state, 2) // A, then D's empty bracket
    expect(has(perTurn[0]!, 'StatusExpired')).toBe(false)
    expect(types(perTurn[1]!)).toEqual(['TurnStarted', 'StatusExpired', 'TurnEnded'])
  })

  it('a Web with one turn left expires by the countdown and draws no roll at its own turn end (countdown runs first)', () => {
    // X is Webbed (acts last): queue [foe, X]. FOE's turn end rolls X's Web (1 draw, 50% miss or
    // hit). If it misses, X's own turn end must expire the Web by the countdown WITHOUT rolling it
    // first -- one draw in total, one StatusExpired. (Roll-before-countdown draws a second time.)
    // Seed 1's first draw is 0.627, a miss for a 50% roll, so the Web survives foe's turn.
    const state = fight(
      [
        {
          id: 'x',
          speed: 20,
          effects: [applyStatusTo('on-fight-start', 'self', 'web-50', 1)],
        },
      ],
      [{ id: 'foe', speed: 1 }],
    )
    const { events, state: after } = run(state, 2)
    expect(events.filter((e) => e.type === 'StatusExpired')).toHaveLength(1)
    expect(countDraws(state.rng, after.rng)).toBe(1)
  })

  it('draws one roll per living Web bearer in side-slot order, none when there is no Web', () => {
    const state = fight(
      [
        {
          id: 'x',
          speed: 20,
          effects: [applyStatusTo('on-fight-start', 'self', 'web-50', 9)],
        },
      ],
      [{ id: 'foe', speed: 1 }],
    )
    const { state: after } = run(state, 1)
    expect(countDraws(state.rng, after.rng)).toBe(1)
    const none = fight([{ id: 'x', speed: 20 }], [{ id: 'foe', speed: 1 }])
    expect(countDraws(none.rng, run(none, 2).state.rng)).toBe(0)
  })
})

// ---- Win checks inside the turn (ASSUMPTION 19) ----

const marker = (hook: 'on-turn-end'): EffectDef => ({
  category: 'triggered',
  hook,
  response: { kind: 'grant-action-state', target: { kind: 'self' } },
})
const grant = (
  hook: 'on-fight-start' | 'on-turn-start' | 'on-turn-end' | 'on-attack' | 'on-round-end',
  action: 'lethal-cast' | 'defend',
): EffectDef => ({
  category: 'triggered',
  hook,
  chancePercent: 100,
  response: {
    kind: 'perform-action',
    actor: 'self',
    intent: {
      action: action === 'defend' ? { kind: 'defend' } : { kind: 'cast', gemSlot: 0 },
    },
  },
})
const presetWeaken1 = applyStatusTo('on-fight-start', 'self', 'weaken', 1)

/** X (player) alone against FOE (30 HP): the fight ends the moment FOE dies. */
function duel(x: Omit<Spec, 'id' | 'speed'>) {
  return fight(
    [{ id: 'x', speed: 20, spells: [LETHAL_BOLT], ...x }],
    [{ id: 'foe', speed: 1, health: 30 }],
  )
}

/** The turn ends at once on a wipe: TurnEnded, then FightEnded, and the result is a win. */
function expectEndsWithWin(events: readonly CombatEvent[]) {
  expect(types(events).slice(-2)).toEqual(['TurnEnded', 'FightEnded'])
  expect(events[events.length - 1]).toEqual({ type: 'FightEnded', result: 'win' })
}

describe('a mid-turn wipe ends the turn at once (every check point)', () => {
  it('after the turn-start hooks: the actor does not go on to act', () => {
    const { events } = run(
      duel({ script: 'always-defend', effects: [lethalHit('on-turn-start')] }),
      1,
    )
    expect(has(events, 'Defended')).toBe(false)
    expectEndsWithWin(events)
  })

  it('after the turn-start hooks: the turn-start cleanup does not run either (a defending actor keeps its flag)', () => {
    const state = updateCreature(
      duel({ script: 'always-defend', effects: [lethalHit('on-turn-start')] }),
      id('x'),
      { defending: true },
    )
    const { events } = run(state, 1)
    expect(has(events, 'ActionStateEnded')).toBe(false)
    expectEndsWithWin(events)
  })

  it('after the turn-start grants: the actor does not go on to act', () => {
    const { events } = run(
      duel({ script: 'always-defend', effects: [grant('on-turn-start', 'lethal-cast')] }),
      1,
    )
    expect(has(events, 'SpellCast')).toBe(true)
    expect(has(events, 'Defended')).toBe(false)
    expectEndsWithWin(events)
  })

  it('after the action: the turn-end hooks do not fire', () => {
    const { events } = run(
      duel({ script: 'cast-slot-0-fixture', effects: [marker('on-turn-end')] }),
      1,
    )
    expect(has(events, 'SpellCast')).toBe(true)
    expect(has(events, 'TriggerFired')).toBe(false)
    expectEndsWithWin(events)
  })

  it("after the action's grants: the turn-end hooks do not fire", () => {
    const { events } = run(
      duel({
        script: 'always-attack',
        effects: [grant('on-attack', 'lethal-cast'), marker('on-turn-end')],
      }),
      1,
    )
    expect(has(events, 'ActionGranted')).toBe(true)
    expect(events.filter((e) => e.type === 'TriggerFired')).toHaveLength(1) // only the on-attack grant's
    expectEndsWithWin(events)
  })

  it('after the action, when the wipe also killed the actor (a lethal reaction): the fight ends with a loss', () => {
    // X's attack is answered by a lethal reaction on FOE; X is the player's only creature, so
    // the turn-end block (alive-gated) never runs -- only the check after the action ends it.
    const reaction: EffectDef = {
      category: 'triggered',
      hook: 'on-damage-taken',
      response: {
        kind: 'deal-damage',
        target: { kind: 'triggering-source' },
        flatAmount: 999,
      },
    }
    const state = fight(
      [{ id: 'x', speed: 20, script: 'always-attack' }],
      [{ id: 'foe', speed: 1, health: 100, effects: [reaction] }],
    )
    const { events, state: after } = run(state, 1)
    expect(after.result).toBe('loss')
    expect(types(events).slice(-3)).toEqual(['CreatureDied', 'TurnEnded', 'FightEnded'])
  })

  it('after the turn-end hooks: no cleanup (no countdown, no StatusExpired)', () => {
    const { events } = run(
      duel({ effects: [presetWeaken1, lethalHit('on-turn-end')] }),
      1,
    )
    expect(has(events, 'StatusExpired')).toBe(false)
    expectEndsWithWin(events)
  })

  it('after the turn-end grants: no cleanup (no countdown, no StatusExpired)', () => {
    const { events } = run(
      duel({ effects: [presetWeaken1, grant('on-turn-end', 'lethal-cast')] }),
      1,
    )
    expect(has(events, 'SpellCast')).toBe(true)
    expect(has(events, 'StatusExpired')).toBe(false)
    expectEndsWithWin(events)
  })

  it('no Web roll after a mid-turn wipe (the Web is on a living ally)', () => {
    const state = fight(
      [
        { id: 'x', speed: 20, script: 'cast-slot-0-fixture', spells: [LETHAL_BOLT] },
        {
          id: 'ally',
          speed: 10,
          effects: [applyStatusTo('on-fight-start', 'self', 'web-100', 9)],
        },
      ],
      [{ id: 'foe', speed: 1, health: 30 }],
    )
    const { events, state: after } = run(state, 1) // X acts first (ally is webbed -> last)
    expect(has(events, 'StatusExpired')).toBe(false)
    expect(countDraws(state.rng, after.rng)).toBe(0)
    expectEndsWithWin(events)
  })
})

describe('a hook pass stops at the firing that wipes (never inside a cascade)', () => {
  const weakenSelf = (hook: 'on-turn-start' | 'on-turn-end' | 'on-round-end') =>
    applyStatusTo(hook, 'self', 'weaken', 3)

  it('turn-start pass: a later firing does not follow the wiping one', () => {
    const { events } = run(
      duel({ effects: [lethalHit('on-turn-start'), weakenSelf('on-turn-start')] }),
      1,
    )
    expect(has(events, 'StatusApplied')).toBe(false)
    expectEndsWithWin(events)
  })

  it('turn-end pass: a later firing does not follow the wiping one', () => {
    const { events } = run(
      duel({ effects: [lethalHit('on-turn-end'), weakenSelf('on-turn-end')] }),
      1,
    )
    expect(has(events, 'StatusApplied')).toBe(false)
    expectEndsWithWin(events)
  })

  it('turn-end pass: a lethal own Poison tick after the wiping firing is a WIN with no tick (the PR #70 case)', () => {
    // X (3 HP, Poisoned at fight start: a 3% tick of 100 max HP is 3 = lethal) empties the enemy
    // side in its own turn-end pass; the tick that follows in the same pass must not run.
    const { events, state } = run(
      duel({
        hp: 3,
        effects: [
          applyStatusTo('on-fight-start', 'self', 'poison', 3),
          lethalHit('on-turn-end'),
        ],
      }),
      1,
    )
    expect(events.some((e) => e.type === 'DamageDealt' && e.statusId === 'poison')).toBe(
      false,
    )
    expect(state.result).toBe('win')
    expectEndsWithWin(events)
  })

  it('round-end pass: a later firing does not follow the wiping one, and the fight ends there', () => {
    const state = duel({
      effects: [lethalHit('on-round-end'), weakenSelf('on-round-end')],
    })
    const { events } = run(state, 3) // X, foe, then round 1's end
    expect(has(events, 'StatusApplied')).toBe(false)
    expect(types(events).slice(-1)).toEqual(['FightEnded'])
    expect(types(events).filter((t) => t === 'RoundStarted')).toHaveLength(1)
  })
})

describe('a grant drain stops at the grant that wipes', () => {
  const twoGrants = (
    hook: 'on-turn-start' | 'on-turn-end' | 'on-attack' | 'on-round-end',
  ) => [grant(hook, 'lethal-cast'), grant(hook, 'defend')]

  it.each([
    ['turn-start', 'on-turn-start', 1],
    ['action', 'on-attack', 1],
    ['turn-end', 'on-turn-end', 1],
    ['round-end', 'on-round-end', 3],
  ] as const)(
    '%s drain: the grant after the wiping one never runs',
    (_site, hook, turns) => {
      const { events } = run(
        duel({
          script: hook === 'on-attack' ? 'always-attack' : 'always-wait',
          effects: twoGrants(hook),
        }),
        turns,
      )
      expect(has(events, 'SpellCast')).toBe(true) // the first grant ran...
      expect(has(events, 'Defended')).toBe(false) // ...the second did not
      expect(types(events).slice(-1)).toEqual(['FightEnded'])
    },
  )
})

// ---- The fight-start win check (Phase 4.1-F3, ASSUMPTION 61) ----

describe('a fight-start wipe ends the fight before round 1', () => {
  const noRound = (events: readonly CombatEvent[]) => {
    expect(has(events, 'RoundStarted')).toBe(false)
    expect(has(events, 'TurnStarted')).toBe(false)
    expect(types(events).slice(-1)).toEqual(['FightEnded'])
    expect(events[events.length - 1]).toEqual({ type: 'FightEnded', result: 'win' })
  }

  it('the check after the pass and drain: a wipe ends the fight with no RoundStarted', () => {
    const { events, state } = run(duel({ effects: [lethalHit('on-fight-start')] }), 1)
    noRound(events)
    expect(state.result).toBe('win')
  })

  it('the hook pass stops at the wiping firing: a later fight-start firing does not follow it', () => {
    const { events } = run(
      duel({
        effects: [
          lethalHit('on-fight-start'),
          applyStatusTo('on-fight-start', 'self', 'weaken', 3),
        ],
      }),
      1,
    )
    expect(has(events, 'StatusApplied')).toBe(false)
    noRound(events)
  })

  it('the drain stops at the wiping grant: the grant after it never runs', () => {
    const { events } = run(
      duel({
        script: 'always-wait',
        effects: [
          grant('on-fight-start', 'lethal-cast'),
          grant('on-fight-start', 'defend'),
        ],
      }),
      1,
    )
    expect(has(events, 'SpellCast')).toBe(true)
    expect(has(events, 'Defended')).toBe(false)
    noRound(events)
  })

  it('a fight that nobody wipes at fight start still begins round 1', () => {
    const { events } = run(
      duel({ effects: [applyStatusTo('on-fight-start', 'self', 'weaken', 3)] }),
      1,
    )
    expect(has(events, 'RoundStarted')).toBe(true)
  })
})

// ---- Round end has no status work (ASSUMPTION 50) ----

describe('a status may not trigger on round end', () => {
  const ROUND_END_DOT: StatusDef = {
    statusId: 'round-end-dot-fixture',
    polarity: 'debuff',
    defaultDuration: 3,
    effects: [
      {
        category: 'triggered',
        hook: 'on-round-end',
        response: { kind: 'deal-damage', target: { kind: 'self' }, flatAmount: 1 },
      },
    ],
  }

  it('validateStatusDef rejects an on-round-end trigger; the stock registry still loads', () => {
    expect(() => validateStatusDef(ROUND_END_DOT)).toThrow(/on-round-end/)
    for (const def of STATUS_REGISTRY.values())
      expect(() => validateStatusDef(def)).not.toThrow()
  })

  it('createCombat validates the registry it is given', () => {
    expect(() =>
      createCombat({
        seed: 1,
        player: { party: makeParty('player', [{ id: 'x' }]) },
        enemy: { party: makeParty('enemy', [{ id: 'foe' }]) },
        registries: { statuses: new Map([[ROUND_END_DOT.statusId, ROUND_END_DOT]]) },
      }),
    ).toThrow(/on-round-end/)
  })
})

// ---- Arcane Surge shares the turn-end pass with the ticks (brief, PR #78 review) ----

describe('Arcane Surge and a lethal tick in one turn-end pass', () => {
  it("a Seer killed by its own tick keeps Surge's TriggerFired; the queued cast is refused at drain (dead actor)", () => {
    // Innate effects run before the status tick in canonical effect order, so the Surge roll
    // (seed 0's first draw, 0.2664 < 50%) happens first. The Poison then kills the Seer (3 HP, a
    // 3% tick of 100 max HP is 3); the grant it queued is refused (ASSUMPTION 43). An ally keeps
    // the side alive, so the drain runs.
    const state = fight(
      [
        {
          id: 'seer',
          speed: 20,
          hp: 3,
          effects: [
            applyStatusTo('on-fight-start', 'self', 'poison', 3),
            ...SORCERER_STARTER_TRAIT.effects,
          ],
        },
        { id: 'ally', speed: 10 },
      ],
      [{ id: 'foe', speed: 1 }],
      0,
    )
    const { events } = run(state, 1)
    const surge = events.findIndex(
      (e) => e.type === 'TriggerFired' && e.hook === 'on-turn-end',
    )
    const tick = events.findIndex(
      (e) => e.type === 'DamageDealt' && e.statusId === 'poison',
    )
    expect(surge).toBeGreaterThan(-1)
    expect(tick).toBeGreaterThan(surge) // the roll came first
    expect(has(events, 'CreatureDied')).toBe(true)
    expect(has(events, 'ActionGranted')).toBe(false)
    expect(has(events, 'SpellCast')).toBe(false)
  })
})
