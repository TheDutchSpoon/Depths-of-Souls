import { describe, expect, it } from 'vitest'
import { createCombat, resolveFight, resolveTurn } from './combat'
import { makeParty } from './__fixtures__/creatures'
import { createSeededRng } from './rng'
import { ROUND_CAP } from './config'
import type { AttackDeclaredEvent, CombatState } from './types'

function isAttackDeclared(event: { type: string }): event is AttackDeclaredEvent {
  return event.type === 'AttackDeclared'
}

describe('createCombat', () => {
  it('throws when the player party is empty', () => {
    const enemy = makeParty('enemy', [{ id: 'goblin' }])
    expect(() => createCombat([], enemy, 1)).toThrow()
  })

  it('throws when the enemy party is empty', () => {
    const player = makeParty('player', [{ id: 'hero' }])
    expect(() => createCombat(player, [], 1)).toThrow()
  })
})

describe('resolveTurn / resolveFight — sanity trace', () => {
  it('produces a plausible 1v1 opening sequence and eventually decides a result', () => {
    const player = makeParty('player', [
      { id: 'hero', speed: 20, attack: 15, defence: 5, health: 30 },
    ])
    const enemy = makeParty('enemy', [
      { id: 'goblin', speed: 10, attack: 5, defence: 5, health: 30 },
    ])

    const { events, state } = resolveFight(createCombat(player, enemy, 1))

    expect(events[0]).toEqual({ type: 'FightStarted' })
    expect(events[1]).toEqual({ type: 'RoundStarted', round: 1 })
    expect(events[2]).toEqual({ type: 'TurnStarted', creatureId: 'hero' })
    expect(events[3]?.type).toBe('AttackDeclared')
    expect(state.result).not.toBeNull()
  })
})

describe('determinism', () => {
  it('produces identical events and result for the same parties and seed', () => {
    const player = makeParty('player', [
      { id: 'hero', speed: 20, attack: 12, defence: 8, health: 40 },
    ])
    const enemy = makeParty('enemy', [
      { id: 'goblin', speed: 10, attack: 9, defence: 6, health: 35 },
    ])

    const run1 = resolveFight(createCombat(player, enemy, 777))
    const run2 = resolveFight(createCombat(player, enemy, 777))

    expect(run1.events).toEqual(run2.events)
    expect(run1.state.result).toBe(run2.state.result)
  })
})

describe('death-mid-round skip', () => {
  it('emits an empty TurnStarted/TurnEnded bracket for a creature that died earlier in the same round', () => {
    const player = makeParty('player', [
      { id: 'hero', speed: 30, attack: 20, defence: 10, health: 50 },
    ])
    const enemy = makeParty('enemy', [
      { id: 'goblinA', speed: 20, attack: 5, defence: 0, health: 5 },
      { id: 'goblinB', speed: 10, attack: 5, defence: 0, health: 30 },
    ])

    const { events } = resolveFight(createCombat(player, enemy, 1))

    const diedIndex = events.findIndex(
      (e) => e.type === 'CreatureDied' && e.creatureId === 'goblinA',
    )
    expect(diedIndex).toBeGreaterThan(-1)

    const skippedTurnStartIndex = events.findIndex(
      (e, i) => i > diedIndex && e.type === 'TurnStarted' && e.creatureId === 'goblinA',
    )
    expect(skippedTurnStartIndex).toBeGreaterThan(-1)
    expect(events[skippedTurnStartIndex + 1]).toEqual({
      type: 'TurnEnded',
      creatureId: 'goblinA',
    })
  })
})

describe('round cap', () => {
  it('ends the fight as a draw exactly at the cap, without starting a new round', () => {
    const player = makeParty('player', [
      { id: 'hero', speed: 10, attack: 5, defence: 100, health: 1000 },
    ])
    const enemy = makeParty('enemy', [
      { id: 'golem', speed: 5, attack: 5, defence: 100, health: 1000 },
    ])

    const atCap: CombatState = {
      rng: createSeededRng(1),
      playerParty: player,
      enemyParty: enemy,
      turnQueue: [],
      turnCursor: 0,
      round: ROUND_CAP,
      result: null,
    }

    const { state, events } = resolveTurn(atCap)

    expect(state.result).toBe('draw')
    // No RoundStarted for ROUND_CAP + 1, and no turn processing -- the gate fires before
    // a new round (and its actions) can begin.
    expect(events).toEqual([{ type: 'FightEnded', result: 'draw' }])
  })
})

describe('win/loss', () => {
  it('resolves to a loss when the enemy wipes the player', () => {
    const player = makeParty('player', [
      { id: 'hero', speed: 10, attack: 1, defence: 100, health: 3 },
    ])
    const enemy = makeParty('enemy', [
      { id: 'ogre', speed: 20, attack: 50, defence: 0, health: 100 },
    ])

    const { state } = resolveFight(createCombat(player, enemy, 1))
    expect(state.result).toBe('loss')
  })
})

describe('event ordering around a kill', () => {
  it('emits CreatureDied immediately after the killing DamageDealt, and closes the turn bracket before the fight result', () => {
    const player = makeParty('player', [
      { id: 'hero', speed: 20, attack: 50, defence: 0, health: 30 },
    ])
    const enemy = makeParty('enemy', [
      { id: 'goblin', speed: 10, attack: 1, defence: 0, health: 5 },
    ])

    const { events } = resolveTurn(createCombat(player, enemy, 1))

    const damageIndex = events.findIndex((e) => e.type === 'DamageDealt')
    expect(events[damageIndex + 1]).toEqual({
      type: 'CreatureDied',
      creatureId: 'goblin',
    })

    const turnEndedIndex = events.findIndex((e) => e.type === 'TurnEnded')
    const fightEndedIndex = events.findIndex((e) => e.type === 'FightEnded')
    expect(turnEndedIndex).toBeGreaterThan(-1)
    expect(fightEndedIndex).toBeGreaterThan(-1)
    expect(turnEndedIndex).toBeLessThan(fightEndedIndex)
  })
})

describe('default targeting', () => {
  it('re-targets the next living slot once the current default target dies', () => {
    const player = makeParty('player', [
      { id: 'hero', speed: 30, attack: 50, defence: 0, health: 50 },
    ])
    const enemy = makeParty('enemy', [
      { id: 'goblinA', speed: 5, attack: 1, defence: 0, health: 5 },
      { id: 'goblinB', speed: 4, attack: 1, defence: 0, health: 40 },
    ])

    const { events } = resolveFight(createCombat(player, enemy, 1))

    const heroAttacks = events
      .filter(isAttackDeclared)
      .filter((e) => e.attackerId === 'hero')
    expect(heroAttacks).toHaveLength(2)
    expect(heroAttacks[0]?.targetId).toBe('goblinA')
    expect(heroAttacks[1]?.targetId).toBe('goblinB')
  })
})
