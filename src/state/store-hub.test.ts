// Phase 4.1-G2 (D2): `summon` and `setPartySlot`, each with its `can…` query, against the real,
// zero-override content store (real biomes, specs, starters, spells). Every failure reason has a
// test, and every `can…` query is checked to agree with its action on the same cases (ASSUMPTIONS
// 89-92). Gem-roll details live in store-gems.test.ts; here only the shape of the result matters.

import { describe, expect, test } from 'vitest'
import { DEFAULT_GEM_SLOT_COUNT } from '../engine/config'
import { BIOMES } from '../data/biomes'
import { createGameStore, PARTY_SIZE, type GameState, type SummonResult } from './store'
import { createInstanceId, type InstanceId } from './ids'

const SUMMONABLE = BIOMES[0]!.speciesPool[0]!.creatures[0]!
const OTHER_SUMMONABLE = BIOMES[0]!.speciesPool[1]!.creatures[0]!

/** A store with the Brute starter granted (slot 0) and `creatureId`'s soul completed. */
function storeWithSoul(...creatureIds: string[]) {
  const store = createGameStore()
  store.getState().setSpec('brute')
  store.setState({
    soulProgress: new Map(creatureIds.map((id) => [id, 100] as const)),
  })
  return store
}

function expectSummoned(result: SummonResult) {
  if (!result.ok) throw new Error(`expected summon ok, got ${result.reason}`)
  return result.instanceId
}

const id = createInstanceId

describe('summon()', () => {
  test('unknown-creature: an id no static data resolves', () => {
    const store = storeWithSoul()
    expect(store.getState().summon('no-such-creature')).toEqual({
      ok: false,
      reason: 'unknown-creature',
    })
  })

  test('unknown-creature is checked before soul-incomplete', () => {
    const store = storeWithSoul() // no soul for the unknown id either
    expect(store.getState().canSummon('no-such-creature')).toEqual({
      ok: false,
      reason: 'unknown-creature',
    })
  })

  test('soul-incomplete: no soul at all, and 99%', () => {
    const store = storeWithSoul()
    expect(store.getState().summon(SUMMONABLE.id)).toEqual({
      ok: false,
      reason: 'soul-incomplete',
    })
    store.setState({ soulProgress: new Map([[SUMMONABLE.id, 99]]) })
    expect(store.getState().summon(SUMMONABLE.id)).toEqual({
      ok: false,
      reason: 'soul-incomplete',
    })
  })

  test('the starters and the Unicorn resolve but never bank soul: soul-incomplete (ASSUMPTION 91)', () => {
    const store = storeWithSoul()
    expect(store.getState().summon('unicorn')).toEqual({
      ok: false,
      reason: 'soul-incomplete',
    })
    expect(store.getState().summon('sorcerer-starter')).toEqual({
      ok: false,
      reason: 'soul-incomplete',
    })
  })

  test('a failed summon leaves every field of the state unchanged', () => {
    const store = storeWithSoul()
    const before = store.getState()
    store.getState().summon(SUMMONABLE.id)
    store.getState().summon('no-such-creature')
    expect(store.getState()).toBe(before)
  })

  test('success: a level-1 role-script instance with a full stored gem set, soul untouched', () => {
    const store = storeWithSoul(SUMMONABLE.id)
    const ordinalBefore = store.getState().nextInstanceOrdinal
    const instanceId = expectSummoned(store.getState().summon(SUMMONABLE.id))
    const state = store.getState()
    const instance = state.collection.get(instanceId)!
    expect(instanceId).toBe(`inst-${ordinalBefore}`)
    expect(instance).toMatchObject({
      id: instanceId,
      source: { kind: 'creature', creatureId: SUMMONABLE.id },
      level: 1,
      xp: 0,
      scriptId: null, // ASSUMPTION 86: null = the role
    })
    expect(instance.gems).toHaveLength(DEFAULT_GEM_SLOT_COUNT)
    expect(state.nextInstanceOrdinal).toBe(ordinalBefore + 1)
    // ASSUMPTION 89: summoning is free and does not touch soul.
    expect(state.soulProgress.get(SUMMONABLE.id)).toBe(100)
  })

  test('auto-place: the new instance takes the lowest-index empty slot', () => {
    const store = storeWithSoul(SUMMONABLE.id)
    // Slot 0 holds the Brute; slots 1-5 are empty.
    const first = expectSummoned(store.getState().summon(SUMMONABLE.id))
    expect(store.getState().activeParty.indexOf(first)).toBe(1)
    const second = expectSummoned(store.getState().summon(SUMMONABLE.id))
    expect(store.getState().activeParty.indexOf(second)).toBe(2)
  })

  test('auto-place picks the LOWEST empty slot, not the one after the last occupied', () => {
    const store = storeWithSoul(SUMMONABLE.id)
    const a = expectSummoned(store.getState().summon(SUMMONABLE.id)) // slot 1
    const b = expectSummoned(store.getState().summon(SUMMONABLE.id)) // slot 2
    store.getState().setPartySlot(1, null) // hole at slot 1
    const c = expectSummoned(store.getState().summon(SUMMONABLE.id))
    expect(store.getState().activeParty.slice(0, 3)).toEqual([id('inst-0'), c, b])
    expect(store.getState().activeParty).not.toContain(a)
  })

  test('with no free slot the instance only joins the collection', () => {
    const store = storeWithSoul(SUMMONABLE.id)
    for (let i = 0; i < PARTY_SIZE - 1; i++) store.getState().summon(SUMMONABLE.id)
    expect(store.getState().activeParty.every((slot) => slot !== null)).toBe(true)
    const partyBefore = store.getState().activeParty
    const extra = expectSummoned(store.getState().summon(SUMMONABLE.id))
    expect(store.getState().collection.has(extra)).toBe(true)
    expect(store.getState().activeParty).toEqual(partyBefore)
    expect(store.getState().activeParty).not.toContain(extra)
  })

  test('duplicates are unlimited: the same creature summons into separate instances', () => {
    const store = storeWithSoul(SUMMONABLE.id)
    const a = expectSummoned(store.getState().summon(SUMMONABLE.id))
    const b = expectSummoned(store.getState().summon(SUMMONABLE.id))
    expect(a).not.toBe(b)
    const sources = [...store.getState().collection.values()].filter(
      (inst) =>
        inst.source.kind === 'creature' && inst.source.creatureId === SUMMONABLE.id,
    )
    expect(sources).toHaveLength(2)
  })

  test('canSummon agrees with summon on every case, and never changes state', () => {
    const store = storeWithSoul(SUMMONABLE.id)
    store.setState((s) => ({
      soulProgress: new Map([...s.soulProgress, [OTHER_SUMMONABLE.id, 40]]),
    }))
    for (const creatureId of [
      SUMMONABLE.id, // ok
      OTHER_SUMMONABLE.id, // soul-incomplete
      'unicorn', // soul-incomplete
      'no-such-creature', // unknown-creature
    ]) {
      const before = store.getState()
      const query = store.getState().canSummon(creatureId)
      expect(store.getState()).toBe(before)
      const action = store.getState().summon(creatureId)
      if (action.ok) expect(query).toEqual({ ok: true })
      else expect(query).toEqual(action)
    }
  })
})

describe('setPartySlot()', () => {
  /** Brute in slot 0 plus two summons in slots 1 and 2. Returns the three ids. */
  function threeInParty() {
    const store = storeWithSoul(SUMMONABLE.id)
    const a = expectSummoned(store.getState().summon(SUMMONABLE.id))
    const b = expectSummoned(store.getState().summon(SUMMONABLE.id))
    return { store, brute: id('inst-0'), a, b }
  }

  test('slot-out-of-range: negative, past the party, fractional, NaN', () => {
    const { store, brute } = threeInParty()
    for (const slot of [-1, PARTY_SIZE, 1.5, Number.NaN]) {
      expect(store.getState().setPartySlot(slot, brute)).toEqual({
        ok: false,
        reason: 'slot-out-of-range',
      })
      // Even `null` is refused on a slot that does not exist.
      expect(store.getState().setPartySlot(slot, null)).toEqual({
        ok: false,
        reason: 'slot-out-of-range',
      })
    }
  })

  test('slot-out-of-range is checked before unknown-instance', () => {
    const { store } = threeInParty()
    expect(store.getState().setPartySlot(PARTY_SIZE, id('inst-999'))).toEqual({
      ok: false,
      reason: 'slot-out-of-range',
    })
  })

  test('unknown-instance: an id not in the collection', () => {
    const { store } = threeInParty()
    expect(store.getState().setPartySlot(3, id('inst-999'))).toEqual({
      ok: false,
      reason: 'unknown-instance',
    })
  })

  test('a refusal leaves the state untouched', () => {
    const { store } = threeInParty()
    const before = store.getState()
    store.getState().setPartySlot(PARTY_SIZE, null)
    store.getState().setPartySlot(3, id('inst-999'))
    expect(store.getState()).toBe(before)
  })

  test('placing a benched instance into an empty slot', () => {
    const { store, brute } = threeInParty()
    store.getState().setPartySlot(1, null)
    store.getState().setPartySlot(1, id('inst-1'))
    expect(store.getState().activeParty.slice(0, 3)).toEqual([
      brute,
      id('inst-1'),
      id('inst-2'),
    ])
  })

  test('placing a benched instance onto an occupied slot benches the occupant (kept in the collection)', () => {
    const { store, brute, a } = threeInParty()
    const extra = expectSummoned(store.getState().summon(SUMMONABLE.id)) // slot 3
    store.getState().setPartySlot(3, null) // extra is benched
    store.getState().setPartySlot(1, extra) // extra replaces `a` in slot 1
    expect(store.getState().activeParty[1]).toBe(extra)
    expect(store.getState().activeParty).not.toContain(a)
    expect(store.getState().collection.has(a)).toBe(true)
    expect(store.getState().activeParty[0]).toBe(brute)
  })

  test('swap: placing an instance already in another slot swaps the two', () => {
    const { store, brute, a, b } = threeInParty()
    expect(store.getState().setPartySlot(2, a)).toEqual({ ok: true }) // a: slot 1 -> slot 2
    expect(store.getState().activeParty.slice(0, 3)).toEqual([brute, b, a])
  })

  test('moving an instance to an empty slot leaves its old slot empty', () => {
    const { store, brute } = threeInParty()
    store.getState().setPartySlot(4, brute)
    expect(store.getState().activeParty[0]).toBeNull()
    expect(store.getState().activeParty[4]).toBe(brute)
    // No instance is duplicated across slots.
    const ids = store.getState().activeParty.filter((slot) => slot !== null)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('placing an instance in its own slot is a no-op', () => {
    const { store, brute } = threeInParty()
    const partyBefore = store.getState().activeParty
    expect(store.getState().setPartySlot(0, brute)).toEqual({ ok: true })
    expect(store.getState().activeParty).toEqual(partyBefore)
  })

  test('null empties the slot, and emptying every slot is allowed; descend then refuses (ASSUMPTION 10)', () => {
    const { store } = threeInParty()
    for (let slot = 0; slot < PARTY_SIZE; slot++) {
      expect(store.getState().setPartySlot(slot, null)).toEqual({ ok: true })
    }
    expect(store.getState().activeParty.every((slot) => slot === null)).toBe(true)
    expect(store.getState().canDescend(1)).toEqual({ ok: false, reason: 'empty-party' })
    expect(store.getState().descend(1)).toEqual({ ok: false, reason: 'empty-party' })
  })

  test('the Unicorn can be benched and stays owned', () => {
    const store = createGameStore()
    store.getState().setSpec('brute')
    store.getState().runScriptedIntro()
    const unicorn = [...store.getState().collection.values()].find(
      (inst) => inst.source.kind === 'creature' && inst.source.creatureId === 'unicorn',
    )!
    expect(store.getState().activeParty).toContain(unicorn.id)
    const slot = store.getState().activeParty.indexOf(unicorn.id)
    expect(store.getState().setPartySlot(slot, null)).toEqual({ ok: true })
    expect(store.getState().activeParty).not.toContain(unicorn.id)
    expect(store.getState().collection.get(unicorn.id)).toEqual(unicorn)
  })

  test('canSetPartySlot agrees with setPartySlot on every case, and never changes state', () => {
    const { store, brute } = threeInParty()
    const cases: [number, InstanceId | null][] = [
      [3, brute], // ok
      [0, null], // ok
      [PARTY_SIZE, brute], // slot-out-of-range
      [-1, null], // slot-out-of-range
      [2.5, brute], // slot-out-of-range
      [1, id('inst-999')], // unknown-instance
      [PARTY_SIZE, id('inst-999')], // slot-out-of-range first
    ]
    for (const [slot, instanceId] of cases) {
      const before: GameState = store.getState()
      const query = store.getState().canSetPartySlot(slot, instanceId)
      expect(store.getState()).toBe(before)
      const action = store.getState().setPartySlot(slot, instanceId)
      expect(query).toEqual(action)
    }
  })
})
