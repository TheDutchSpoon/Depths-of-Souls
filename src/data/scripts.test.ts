import { describe, expect, it } from 'vitest'
import {
  ALWAYS_ATTACK_SCRIPT,
  ALWAYS_CAST_SCRIPT,
  ALWAYS_DEFEND_SCRIPT,
  ALWAYS_PROVOKE_SCRIPT,
  ALWAYS_WAIT_SCRIPT,
  STOCK_SCRIPTS_BY_ID,
} from './scripts'
import { EMBER_LANCE } from './spells'
import { decideAction } from '../engine/interpreter'
import { makeParty } from '../engine/__fixtures__/creatures'
import { createSeededRng } from '../engine/rng'
import type { CombatState } from '../engine/types'

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
    statuses: new Map(),
    ...overrides,
  }
}

describe('stock scripts', () => {
  it('always-attack attacks the lowest-HP enemy', () => {
    const player = makeParty('player', [{ id: 'me' }])
    const enemy = makeParty('enemy', [
      { id: 'high', currentHp: 20 },
      { id: 'low', currentHp: 5 },
    ])
    const state = makeState({ playerParty: player, enemyParty: enemy })
    expect(decideAction(player[0]!, ALWAYS_ATTACK_SCRIPT, state)).toEqual({
      kind: 'attack',
      targetId: enemy[1]!.id,
    })
  })

  it('always-cast casts slot 0 at the lowest-HP enemy when equipped', () => {
    const player = makeParty('player', [{ id: 'me', equippedSpells: [EMBER_LANCE] }])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    const state = makeState({ playerParty: player, enemyParty: enemy })
    expect(decideAction(player[0]!, ALWAYS_CAST_SCRIPT, state)).toEqual({
      kind: 'cast',
      targetShape: 'single',
      gemSlot: 0,
      targetId: enemy[0]!.id,
    })
  })

  it('always-cast degrades to the implicit fallback when slot 0 is empty', () => {
    const player = makeParty('player', [{ id: 'me', equippedSpells: [null] }])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    const state = makeState({ playerParty: player, enemyParty: enemy })
    expect(decideAction(player[0]!, ALWAYS_CAST_SCRIPT, state)).toEqual({
      kind: 'attack',
      targetId: enemy[0]!.id,
    })
  })

  it('always-defend defends', () => {
    const player = makeParty('player', [{ id: 'me' }])
    const state = makeState({ playerParty: player, enemyParty: [] })
    expect(decideAction(player[0]!, ALWAYS_DEFEND_SCRIPT, state)).toEqual({
      kind: 'defend',
    })
  })

  it('always-provoke provokes', () => {
    const player = makeParty('player', [{ id: 'me' }])
    const state = makeState({ playerParty: player, enemyParty: [] })
    expect(decideAction(player[0]!, ALWAYS_PROVOKE_SCRIPT, state)).toEqual({
      kind: 'provoke',
    })
  })

  it('always-wait waits', () => {
    const player = makeParty('player', [{ id: 'me' }])
    const state = makeState({ playerParty: player, enemyParty: [] })
    expect(decideAction(player[0]!, ALWAYS_WAIT_SCRIPT, state)).toEqual({ kind: 'wait' })
  })

  it('STOCK_SCRIPTS_BY_ID contains exactly the 5 stock scripts, keyed by id', () => {
    expect([...STOCK_SCRIPTS_BY_ID.keys()].sort()).toEqual(
      [
        'always-attack',
        'always-cast',
        'always-defend',
        'always-provoke',
        'always-wait',
      ].sort(),
    )
  })
})
