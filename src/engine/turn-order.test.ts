import { describe, expect, it } from 'vitest'
import { buildTurnQueue } from './turn-order'
import { makeCreature, makeParty } from './__fixtures__/creatures'
import { createCreatureId } from './ids'
import { createEffectInstanceId } from './effect-types'
import type { ActiveEffect } from './effect-types'

describe('buildTurnQueue', () => {
  it('orders combatants by descending effective Speed', () => {
    const player = makeParty('player', [
      { id: 'slow', speed: 5 },
      { id: 'fast', speed: 25 },
    ])
    const enemy = makeParty('enemy', [{ id: 'medium', speed: 15 }])

    expect(buildTurnQueue(player, enemy)).toEqual(['fast', 'medium', 'slow'])
  })

  it('breaks a same-speed tie in favor of the player side', () => {
    const player = makeParty('player', [{ id: 'p', speed: 10 }])
    const enemy = makeParty('enemy', [{ id: 'e', speed: 10 }])

    expect(buildTurnQueue(player, enemy)).toEqual(['p', 'e'])
  })

  it('breaks a same-speed, same-side tie by ascending slot index', () => {
    const player = makeParty('player', [
      { id: 'slot0', speed: 10 },
      { id: 'slot1', speed: 10 },
    ])

    expect(buildTurnQueue(player, [])).toEqual(['slot0', 'slot1'])
  })

  it('breaks a same-speed, same-side, same-slot tie by creature id (synthetic case; makeParty cannot produce this naturally since slots are assigned sequentially per side)', () => {
    const a = makeCreature({ id: 'b-creature', side: 'player', slot: 0, speed: 10 })
    const b = makeCreature({ id: 'a-creature', side: 'player', slot: 0, speed: 10 })

    expect(buildTurnQueue([a, b], [])).toEqual([
      createCreatureId('a-creature'),
      createCreatureId('b-creature'),
    ])
  })

  it('excludes dead creatures from the built queue entirely', () => {
    const player = makeParty('player', [
      { id: 'alive', speed: 10 },
      { id: 'dead', speed: 20, alive: false },
    ])

    expect(buildTurnQueue(player, [])).toEqual(['alive'])
  })

  it('assigns sequential slots via makeParty (fixture sanity check)', () => {
    const player = makeParty('player', [{ id: 'a' }, { id: 'b' }, { id: 'c' }])
    expect(player.map((c) => c.slot)).toEqual([0, 1, 2])
  })
})

// Phase 4 Slice C: Web (act-last) / Blindclaws' grant-act-first (act-first) -- the same
// turn-order-status primitive, opposite pole (species-locked.md).
function turnOrderStatus(position: 'first' | 'last', id: string): ActiveEffect {
  return {
    category: 'turn-order-status',
    statusId: id,
    cap: 1,
    position,
    instanceId: createEffectInstanceId(id),
    sourceTraitId: id,
    remainingDuration: 3,
    stacks: 1,
  }
}

describe('buildTurnQueue -- turn-order status (Phase 4 Slice C)', () => {
  it('reorders an act-first and an act-last creature around a Speed-sorted middle -- position beats raw Speed entirely', () => {
    const player = makeParty('player', [
      // Highest raw Speed (30) but act-LAST -- must still end up dead last.
      { id: 'webbed', speed: 30, activeEffects: [turnOrderStatus('last', 'web')] },
      { id: 'normal-fast', speed: 20 },
    ])
    const enemy = makeParty('enemy', [
      // Lowest raw Speed (5) but act-FIRST -- must still end up first.
      {
        id: 'blindclaw',
        speed: 5,
        activeEffects: [turnOrderStatus('first', 'act-first')],
      },
      { id: 'normal-slow', speed: 10 },
    ])

    expect(buildTurnQueue(player, enemy)).toEqual([
      'blindclaw', // sole act-first pole member
      'normal-fast', // normal pole, Speed-sorted desc
      'normal-slow',
      'webbed', // sole act-last pole member
    ])
  })

  it('ASSUMPTION 9: a creature carrying both an act-first and an act-last instance resolves to act-first', () => {
    const player = makeParty('player', [
      {
        id: 'both',
        speed: 1,
        activeEffects: [
          turnOrderStatus('last', 'web'),
          turnOrderStatus('first', 'haste'),
        ],
      },
    ])
    const enemy = makeParty('enemy', [{ id: 'normal', speed: 100 }])

    expect(buildTurnQueue(player, enemy)).toEqual(['both', 'normal'])
  })

  it('multiple act-first (or act-last) members still sort by Speed within their own pole', () => {
    const player = makeParty('player', [
      { id: 'first-slow', speed: 5, activeEffects: [turnOrderStatus('first', 'a')] },
      { id: 'first-fast', speed: 15, activeEffects: [turnOrderStatus('first', 'b')] },
    ])

    expect(buildTurnQueue(player, [])).toEqual(['first-fast', 'first-slow'])
  })
})
