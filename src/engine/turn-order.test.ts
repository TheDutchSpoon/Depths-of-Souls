import { describe, expect, it } from 'vitest'
import { buildTurnQueue } from './turn-order'
import { makeCreature, makeParty } from './__fixtures__/creatures'
import { createCreatureId } from './ids'

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
