import { describe, expect, it } from 'vitest'
import { decideAction } from './interpreter'
import { makeParty } from './__fixtures__/creatures'
import { createSeededRng } from './rng'
import type { CombatState, Spell } from './types'
import type { Script } from './scripting-types'

function makeState(overrides: Partial<CombatState> = {}): CombatState {
  return {
    rng: createSeededRng(1),
    playerParty: [],
    enemyParty: [],
    turnQueue: [],
    turnCursor: 0,
    round: 1,
    result: null,
    scripts: new Map(),
    ...overrides,
  }
}

const EMBER_LANCE: Spell = {
  id: 'ember-lance',
  name: 'Ember Lance',
  targetShape: 'single',
  spellPower: 0.5,
}
const CINDER_NOVA: Spell = {
  id: 'cinder-nova',
  name: 'Cinder Nova',
  targetShape: 'aoe',
  spellPower: 0.3,
}

describe('decideAction -- rule precedence', () => {
  it('the first valid, matching rule wins; a later matching rule never fires', () => {
    const player = makeParty('player', [{ id: 'me' }])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    const script: Script = {
      id: 'test',
      rules: [
        { condition: { kind: 'always' }, action: { kind: 'defend' } },
        { condition: { kind: 'always' }, action: { kind: 'wait' } },
      ],
    }
    const state = makeState({ playerParty: player, enemyParty: enemy })
    expect(decideAction(player[0]!, script, state)).toEqual({ kind: 'defend' })
  })
})

describe('decideAction -- skip on invalid', () => {
  it('skips a rule casting an empty gem slot and falls through to the next rule', () => {
    const player = makeParty('player', [{ id: 'me', equippedSpells: [null] }])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    const script: Script = {
      id: 'test',
      rules: [
        { condition: { kind: 'always' }, action: { kind: 'cast', gemSlot: 0 } },
        { condition: { kind: 'always' }, action: { kind: 'defend' } },
      ],
    }
    const state = makeState({ playerParty: player, enemyParty: enemy })
    expect(decideAction(player[0]!, script, state)).toEqual({ kind: 'defend' })
  })

  it('skips a targeting-required rule with no targeting field and falls through', () => {
    const player = makeParty('player', [{ id: 'me' }])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    const script: Script = {
      id: 'test',
      rules: [
        { condition: { kind: 'always' }, action: { kind: 'attack' } }, // no `targeting`
        { condition: { kind: 'always' }, action: { kind: 'wait' } },
      ],
    }
    const state = makeState({ playerParty: player, enemyParty: enemy })
    expect(decideAction(player[0]!, script, state)).toEqual({ kind: 'wait' })
  })
})

describe('decideAction -- implicit fallback', () => {
  it('falls back to Attack a valid default target when script is null', () => {
    const player = makeParty('player', [{ id: 'me' }])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    const state = makeState({ playerParty: player, enemyParty: enemy })
    expect(decideAction(player[0]!, null, state)).toEqual({
      kind: 'attack',
      targetId: enemy[0]!.id,
    })
  })

  it('falls back when no rule in the script matches', () => {
    const player = makeParty('player', [{ id: 'me' }])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    const script: Script = {
      id: 'test',
      rules: [
        {
          condition: { kind: 'enemy-count', comparator: '>=', count: 999 },
          action: { kind: 'defend' },
        },
      ],
    }
    const state = makeState({ playerParty: player, enemyParty: enemy })
    expect(decideAction(player[0]!, script, state)).toEqual({
      kind: 'attack',
      targetId: enemy[0]!.id,
    })
  })

  it('falls back to Wait when the enemy side has no valid target', () => {
    const player = makeParty('player', [{ id: 'me' }])
    const state = makeState({ playerParty: player, enemyParty: [] })
    expect(decideAction(player[0]!, null, state)).toEqual({ kind: 'wait' })
  })

  it('the implicit fallback redirects to a provoker when one exists, even with no script assigned', () => {
    const player = makeParty('player', [{ id: 'me' }])
    const enemy = makeParty('enemy', [
      { id: 'provoker', provoking: true },
      { id: 'default-target' },
    ])
    const state = makeState({ playerParty: player, enemyParty: enemy })
    expect(decideAction(player[0]!, null, state)).toEqual({
      kind: 'attack',
      targetId: enemy[0]!.id,
    })
  })
})

describe('decideAction -- AOE cast', () => {
  it('ignores a stray targeting field on an AOE-slotted rule', () => {
    const player = makeParty('player', [{ id: 'me', equippedSpells: [CINDER_NOVA] }])
    const enemy = makeParty('enemy', [{ id: 'a' }, { id: 'b' }])
    const script: Script = {
      id: 'test',
      rules: [
        {
          condition: { kind: 'always' },
          action: { kind: 'cast', gemSlot: 0 },
          targeting: { kind: 'lowest-hp-enemy' }, // irrelevant for AOE, must be ignored
        },
      ],
    }
    const state = makeState({ playerParty: player, enemyParty: enemy })
    expect(decideAction(player[0]!, script, state)).toEqual({
      kind: 'cast',
      targetShape: 'aoe',
      gemSlot: 0,
    })
  })
})

describe('decideAction -- single cast', () => {
  it('honors the rule targeting for a single-target spell', () => {
    const player = makeParty('player', [{ id: 'me', equippedSpells: [EMBER_LANCE] }])
    const enemy = makeParty('enemy', [
      { id: 'high', currentHp: 20 },
      { id: 'low', currentHp: 5 },
    ])
    const script: Script = {
      id: 'test',
      rules: [
        {
          condition: { kind: 'always' },
          action: { kind: 'cast', gemSlot: 0 },
          targeting: { kind: 'lowest-hp-enemy' },
        },
      ],
    }
    const state = makeState({ playerParty: player, enemyParty: enemy })
    expect(decideAction(player[0]!, script, state)).toEqual({
      kind: 'cast',
      targetShape: 'single',
      gemSlot: 0,
      targetId: enemy[1]!.id,
    })
  })
})

describe('decideAction -- defend/provoke/wait always resolve', () => {
  it.each([
    [{ kind: 'defend' as const }, { kind: 'defend' as const }],
    [{ kind: 'provoke' as const }, { kind: 'provoke' as const }],
    [{ kind: 'wait' as const }, { kind: 'wait' as const }],
  ])('rule action %o resolves to %o regardless of state', (ruleAction, expected) => {
    const player = makeParty('player', [{ id: 'me' }])
    const script: Script = {
      id: 'test',
      rules: [{ condition: { kind: 'always' }, action: ruleAction }],
    }
    const state = makeState({ playerParty: player, enemyParty: [] })
    expect(decideAction(player[0]!, script, state)).toEqual(expected)
  })
})

describe('decideAction -- RNG lookahead vs execution discipline', () => {
  it('a non-matching rule referencing random-enemy targeting consumes zero RNG state', () => {
    const seed = 123
    const player = makeParty('player', [{ id: 'me' }])
    const enemy = makeParty('enemy', [{ id: 'a' }, { id: 'b' }])

    const scriptWithDummy: Script = {
      id: 'with-dummy',
      rules: [
        {
          condition: { kind: 'enemy-count', comparator: '>=', count: 999 }, // never matches
          action: { kind: 'attack' },
          targeting: { kind: 'random-enemy' },
        },
        { condition: { kind: 'always' }, action: { kind: 'defend' } },
      ],
    }
    const scriptWithoutDummy: Script = {
      id: 'without-dummy',
      rules: [{ condition: { kind: 'always' }, action: { kind: 'defend' } }],
    }

    const stateWith = makeState({
      playerParty: player,
      enemyParty: enemy,
      rng: createSeededRng(seed),
    })
    const stateWithout = makeState({
      playerParty: player,
      enemyParty: enemy,
      rng: createSeededRng(seed),
    })

    decideAction(player[0]!, scriptWithDummy, stateWith)
    decideAction(player[0]!, scriptWithoutDummy, stateWithout)

    expect(stateWith.rng.next()).toBe(stateWithout.rng.next())
  })

  it('a winning random-enemy rule draws exactly once whether or not a provoker overrides it', () => {
    const seed = 456
    const player = makeParty('player', [{ id: 'me' }])
    const script: Script = {
      id: 'random-attacker',
      rules: [
        {
          condition: { kind: 'always' },
          action: { kind: 'attack' },
          targeting: { kind: 'random-enemy' },
        },
      ],
    }

    const enemyNoProvoker = makeParty('enemy', [{ id: 'a' }, { id: 'b' }])
    const stateNoProvoker = makeState({
      playerParty: player,
      enemyParty: enemyNoProvoker,
      rng: createSeededRng(seed),
    })
    const siblingNoProvoker = createSeededRng(seed)

    decideAction(player[0]!, script, stateNoProvoker)
    siblingNoProvoker.next()
    expect(stateNoProvoker.rng.next()).toBe(siblingNoProvoker.next())

    const enemyWithProvoker = makeParty('enemy', [
      { id: 'a', provoking: true },
      { id: 'b' },
    ])
    const stateWithProvoker = makeState({
      playerParty: player,
      enemyParty: enemyWithProvoker,
      rng: createSeededRng(seed),
    })
    const siblingWithProvoker = createSeededRng(seed)

    const result = decideAction(player[0]!, script, stateWithProvoker)
    expect(result).toEqual({ kind: 'attack', targetId: enemyWithProvoker[0]!.id })
    siblingWithProvoker.next()
    expect(stateWithProvoker.rng.next()).toBe(siblingWithProvoker.next())
  })
})
