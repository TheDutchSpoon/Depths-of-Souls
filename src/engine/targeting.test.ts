import { describe, expect, it } from 'vitest'
import {
  adjacentLivingTargets,
  getDefaultTarget,
  getProvokingMembers,
  livingAlliesOf,
  livingEnemiesOf,
  resolveOffensiveTarget,
  shouldRedirectAoeToAllies,
} from './targeting'
import { makeParty } from './__fixtures__/creatures'
import { createSeededRng } from './rng'
import { createEffectInstanceId } from './effect-types'
import type { CombatState } from './types'
import type { ActiveEffect } from './effect-types'

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
    traits: new Map(),
    ...overrides,
  }
}

describe('getDefaultTarget', () => {
  it('returns null when the enemy side has no living creatures', () => {
    expect(getDefaultTarget([])).toBeNull()
    const allDead = makeParty('enemy', [{ id: 'a', alive: false }])
    expect(getDefaultTarget(allDead)).toBeNull()
  })

  it('returns the first living enemy by slot, ascending', () => {
    const enemy = makeParty('enemy', [
      { id: 'first', alive: false },
      { id: 'second' },
      { id: 'third' },
    ])
    expect(getDefaultTarget(enemy)).toBe(enemy[1]?.id)
  })
})

describe('livingEnemiesOf / livingAlliesOf', () => {
  it('selects the opposing side, alive-filtered', () => {
    const player = makeParty('player', [{ id: 'hero' }])
    const enemy = makeParty('enemy', [
      { id: 'alive-enemy' },
      { id: 'dead-enemy', alive: false },
    ])
    const state = makeState({ playerParty: player, enemyParty: enemy })

    const hero = player[0]!
    expect(livingEnemiesOf(hero, state)).toEqual([enemy[0]])
  })

  it('ally pool always includes the acting creature itself', () => {
    const player = makeParty('player', [{ id: 'solo' }])
    const state = makeState({ playerParty: player, enemyParty: [] })
    const solo = player[0]!
    expect(livingAlliesOf(solo, state)).toEqual([solo])
  })

  it('ally pool excludes dead allies but keeps the acting creature', () => {
    const player = makeParty('player', [{ id: 'me' }, { id: 'dead-ally', alive: false }])
    const state = makeState({ playerParty: player, enemyParty: [] })
    const me = player[0]!
    expect(livingAlliesOf(me, state)).toEqual([me])
  })
})

describe('getProvokingMembers', () => {
  it('includes only alive + provoking members', () => {
    const party = makeParty('enemy', [
      { id: 'provoker', provoking: true },
      { id: 'not-provoking' },
      { id: 'dead-provoker', provoking: true, alive: false },
    ])
    expect(getProvokingMembers(party)).toEqual([party[0]])
  })
})

describe('resolveOffensiveTarget', () => {
  it('calls resolveNormally when the opposing side has zero provokers', () => {
    const player = makeParty('player', [{ id: 'hero' }])
    const enemy = makeParty('enemy', [{ id: 'goblin' }])
    const state = makeState({ playerParty: player, enemyParty: enemy })
    const hero = player[0]!

    let called = false
    const result = resolveOffensiveTarget(hero, state, () => {
      called = true
      return enemy[0]!.id
    })

    expect(called).toBe(true)
    expect(result).toBe(enemy[0]!.id)
  })

  it('redirects to the sole provoker without ever calling resolveNormally', () => {
    const player = makeParty('player', [{ id: 'hero' }])
    const enemy = makeParty('enemy', [
      { id: 'provoker', provoking: true },
      { id: 'other' },
    ])
    const state = makeState({ playerParty: player, enemyParty: enemy })
    const hero = player[0]!

    let called = false
    const result = resolveOffensiveTarget(hero, state, () => {
      called = true
      return enemy[1]!.id
    })

    expect(called).toBe(false)
    expect(result).toBe(enemy[0]!.id)
  })

  it('excludes an expired provoker (provoking: false) from the redirect pool', () => {
    const player = makeParty('player', [{ id: 'hero' }])
    const enemy = makeParty('enemy', [
      // Simulates a creature that provoked earlier this fight but whose own turn
      // already came and cleared the flag -- it must not still redirect to it.
      { id: 'expired-provoker', provoking: false },
      { id: 'target' },
    ])
    const state = makeState({ playerParty: player, enemyParty: enemy })
    const hero = player[0]!

    const result = resolveOffensiveTarget(hero, state, () => enemy[1]!.id)

    expect(result).toBe(enemy[1]!.id)
  })

  it('draws exactly one RNG value when redirecting, even for a singleton provoker pool', () => {
    const player = makeParty('player', [{ id: 'hero' }])
    const enemy = makeParty('enemy', [{ id: 'provoker', provoking: true }])
    const state = makeState({
      playerParty: player,
      enemyParty: enemy,
      rng: createSeededRng(42),
    })
    const sibling = createSeededRng(42)

    resolveOffensiveTarget(player[0]!, state, () => null)

    // The state's rng should have advanced by exactly one draw relative to a fresh sibling.
    sibling.next()
    expect(state.rng.next()).toBe(sibling.next())
  })
})

function provokeImmunity(id = 'tunnel-vision'): ActiveEffect {
  return {
    category: 'provoke-immunity',
    instanceId: createEffectInstanceId(id),
    sourceTraitId: id,
  }
}

function confusion(chancePercent: number, id = 'confusion'): ActiveEffect {
  return {
    category: 'friendly-fire-status',
    statusId: id,
    cap: 3,
    chancePercent,
    instanceId: createEffectInstanceId(id),
    sourceTraitId: id,
    remainingDuration: 3,
    stacks: 1,
  }
}

function statusImmunity(statusId: string, id: string): ActiveEffect {
  return {
    category: 'status-immunity',
    statusId,
    instanceId: createEffectInstanceId(id),
    sourceTraitId: id,
  }
}

describe('resolveOffensiveTarget -- targeting-override pipeline (Phase 4 Slice C)', () => {
  it('Tunnel Vision skips straight to normal resolution, ignoring an active enemy provoker', () => {
    const player = makeParty('player', [
      { id: 'hero', activeEffects: [provokeImmunity()] },
    ])
    const enemy = makeParty('enemy', [
      { id: 'provoker', provoking: true },
      { id: 'other' },
    ])
    const state = makeState({ playerParty: player, enemyParty: enemy })

    let called = false
    const result = resolveOffensiveTarget(player[0]!, state, () => {
      called = true
      return enemy[1]!.id
    })

    expect(called).toBe(true)
    expect(result).toBe(enemy[1]!.id)
  })

  it('a confused actor at 100% chance always redirects to a living ally, never calling resolveNormally', () => {
    const player = makeParty('player', [
      { id: 'confused', activeEffects: [confusion(100)] },
      { id: 'ally' },
    ])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    const state = makeState({
      playerParty: player,
      enemyParty: enemy,
      rng: createSeededRng(1),
    })

    let called = false
    const result = resolveOffensiveTarget(player[0]!, state, () => {
      called = true
      return enemy[0]!.id
    })

    expect(called).toBe(false)
    expect([player[0]!.id, player[1]!.id]).toContain(result)
  })

  it('a confused actor at 0% chance never redirects -- falls through to normal resolution', () => {
    const player = makeParty('player', [
      { id: 'confused', activeEffects: [confusion(0)] },
    ])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    const state = makeState({ playerParty: player, enemyParty: enemy })

    const result = resolveOffensiveTarget(player[0]!, state, () => enemy[0]!.id)
    expect(result).toBe(enemy[0]!.id)
  })

  it('ASSUMPTION 12: Confusion is checked BEFORE Provoke -- a confused actor redirects to its own side even when the enemy side has a provoker', () => {
    const player = makeParty('player', [
      { id: 'confused', activeEffects: [confusion(100)] },
    ])
    const enemy = makeParty('enemy', [{ id: 'provoker', provoking: true }])
    const state = makeState({
      playerParty: player,
      enemyParty: enemy,
      rng: createSeededRng(7),
    })

    // Only living ally is the actor itself -- the redirect must land on 'confused', never on
    // the enemy provoker.
    const result = resolveOffensiveTarget(player[0]!, state, () => enemy[0]!.id)
    expect(result).toBe(player[0]!.id)
  })

  it('a Lucidity-immune creature ignores Confusion entirely (no roll at all) -- Provoke still applies', () => {
    const player = makeParty('player', [
      {
        id: 'immune',
        activeEffects: [
          confusion(100, 'confusion'),
          statusImmunity('confusion', 'lucidity'),
        ],
      },
    ])
    const enemy = makeParty('enemy', [{ id: 'provoker', provoking: true }])
    const state = makeState({
      playerParty: player,
      enemyParty: enemy,
      rng: createSeededRng(1),
    })
    const sibling = createSeededRng(1)

    const result = resolveOffensiveTarget(player[0]!, state, () => enemy[0]!.id)
    expect(result).toBe(enemy[0]!.id) // redirected to the provoker via the normal Provoke path

    // Confusion drew zero RNG (fully suppressed); exactly Provoke's own single index draw
    // should have happened.
    sibling.next()
    expect(state.rng.next()).toBe(sibling.next())
  })
})

describe('shouldRedirectAoeToAllies (Phase 4 Slice C, ASSUMPTION 13)', () => {
  it('draws no RNG and returns false for an unconfused actor', () => {
    const actor = makeParty('player', [{ id: 'caster' }])[0]!
    const state = makeState({ rng: createSeededRng(1) })
    const sibling = createSeededRng(1)

    expect(shouldRedirectAoeToAllies(actor, state)).toBe(false)
    expect(state.rng.next()).toBe(sibling.next())
  })

  it('returns true at 100% chance for a confused actor', () => {
    const actor = makeParty('player', [
      { id: 'caster', activeEffects: [confusion(100)] },
    ])[0]!
    expect(shouldRedirectAoeToAllies(actor, makeState())).toBe(true)
  })

  it('returns false when the confused actor is status-immune to that confusion', () => {
    const actor = makeParty('player', [
      {
        id: 'caster',
        activeEffects: [
          confusion(100, 'confusion'),
          statusImmunity('confusion', 'lucidity'),
        ],
      },
    ])[0]!
    expect(shouldRedirectAoeToAllies(actor, makeState())).toBe(false)
  })
})

describe('adjacentLivingTargets (Phase 4 Slice C, Splashing)', () => {
  it('returns both neighbors for a middle target in a 3+ living lineup', () => {
    const enemy = makeParty('enemy', [{ id: 'a' }, { id: 'b' }, { id: 'c' }])
    expect(adjacentLivingTargets(enemy[1]!, enemy).map((c) => c.id)).toEqual([
      enemy[0]!.id,
      enemy[2]!.id,
    ])
  })

  it('returns only the inward neighbor at each edge of the living list', () => {
    const enemy = makeParty('enemy', [{ id: 'a' }, { id: 'b' }, { id: 'c' }])
    expect(adjacentLivingTargets(enemy[0]!, enemy).map((c) => c.id)).toEqual([
      enemy[1]!.id,
    ])
    expect(adjacentLivingTargets(enemy[2]!, enemy).map((c) => c.id)).toEqual([
      enemy[1]!.id,
    ])
  })

  it('skips a dead slot-neighbor in favor of the next LIVING one (ASSUMPTION 14)', () => {
    const enemy = makeParty('enemy', [
      { id: 'a' },
      { id: 'dead', alive: false },
      { id: 'c' },
    ])
    // 'a' and 'c' are each other's sole living neighbor once 'dead' drops out of the list.
    expect(adjacentLivingTargets(enemy[0]!, enemy).map((c) => c.id)).toEqual([
      enemy[2]!.id,
    ])
    expect(adjacentLivingTargets(enemy[2]!, enemy).map((c) => c.id)).toEqual([
      enemy[0]!.id,
    ])
  })

  it('returns empty for a lone living enemy', () => {
    const enemy = makeParty('enemy', [{ id: 'solo' }])
    expect(adjacentLivingTargets(enemy[0]!, enemy)).toEqual([])
  })

  it('returns empty when the target is not alive-and-present in party', () => {
    const enemy = makeParty('enemy', [{ id: 'a' }, { id: 'b' }])
    const stranger = makeParty('enemy', [{ id: 'stranger' }])[0]!
    expect(adjacentLivingTargets(stranger, enemy)).toEqual([])
  })
})
