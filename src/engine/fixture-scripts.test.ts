import { describe, expect, it } from 'vitest'
import {
  ALWAYS_ATTACK_SCRIPT,
  ALWAYS_CAST_SCRIPT,
  ALWAYS_DEFEND_SCRIPT,
  ALWAYS_PROVOKE_SCRIPT,
  ALWAYS_WAIT_SCRIPT,
  FIXTURE_SCRIPTS_BY_ID,
} from './__fixtures__/scripts'
import { EMBER_LANCE } from '../data/spells'
import { decideAction } from './interpreter'
import { resolveIntent } from './actions'
import { makeParty } from './__fixtures__/creatures'
import { createRngState } from './rng'
import type { CombatState, Creature } from './types'
import type { Script } from './scripting-types'

// Phase 4.1-G1 (stage 0, ASSUMPTION 68): the five `always-*` scripts are test fixtures now
// (__fixtures__/scripts.ts); these are the Phase 2 stock-script tests, moved here unchanged except
// for their imports. The shipped scripts' tests are src/data/scripts.test.ts.

/** decideAction returns an unresolved Intent (Phase 4.1-C2a, A1); resolve it the same way
 * combat.ts's resolveTurn does. */
function decide(creature: Creature, script: Script | null, state: CombatState) {
  return resolveIntent(creature, decideAction(creature, script, state), state)
}

function makeState(overrides: Partial<CombatState> = {}): CombatState {
  return {
    rng: createRngState(1),
    playerParty: [],
    enemyParty: [],
    turnQueue: [],
    turnCursor: 0,
    round: 1,
    result: null,
    scripts: new Map(),
    statuses: new Map(),
    effectInstanceCounter: 0,
    turnClock: 0,
    ...overrides,
  }
}

describe('always-* fixture scripts', () => {
  it('always-attack attacks the lowest-HP enemy', () => {
    const player = makeParty('player', [{ id: 'me' }])
    const enemy = makeParty('enemy', [
      { id: 'high', currentHp: 20 },
      { id: 'low', currentHp: 5 },
    ])
    const state = makeState({ playerParty: player, enemyParty: enemy })
    expect(decide(player[0]!, ALWAYS_ATTACK_SCRIPT, state)).toEqual({
      kind: 'attack',
      targetId: enemy[1]!.id,
    })
  })

  it('always-cast casts slot 0 at the lowest-HP enemy when equipped', () => {
    const player = makeParty('player', [{ id: 'me', equippedSpells: [EMBER_LANCE] }])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    const state = makeState({ playerParty: player, enemyParty: enemy })
    expect(decide(player[0]!, ALWAYS_CAST_SCRIPT, state)).toEqual({
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
    expect(decide(player[0]!, ALWAYS_CAST_SCRIPT, state)).toEqual({
      kind: 'attack',
      targetId: enemy[0]!.id,
    })
  })

  it('always-defend defends', () => {
    const player = makeParty('player', [{ id: 'me' }])
    const state = makeState({ playerParty: player, enemyParty: [] })
    expect(decide(player[0]!, ALWAYS_DEFEND_SCRIPT, state)).toEqual({
      kind: 'defend',
    })
  })

  it('always-provoke provokes', () => {
    const player = makeParty('player', [{ id: 'me' }])
    const state = makeState({ playerParty: player, enemyParty: [] })
    expect(decide(player[0]!, ALWAYS_PROVOKE_SCRIPT, state)).toEqual({
      kind: 'provoke',
    })
  })

  it('always-wait waits', () => {
    const player = makeParty('player', [{ id: 'me' }])
    const state = makeState({ playerParty: player, enemyParty: [] })
    expect(decide(player[0]!, ALWAYS_WAIT_SCRIPT, state)).toEqual({ kind: 'wait' })
  })

  it('FIXTURE_SCRIPTS_BY_ID contains exactly the 5 fixture scripts, keyed by id', () => {
    expect([...FIXTURE_SCRIPTS_BY_ID.keys()].sort()).toEqual(
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
