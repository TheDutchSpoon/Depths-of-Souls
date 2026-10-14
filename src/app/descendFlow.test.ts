import { describe, expect, test } from 'vitest'
import { BIOMES } from '../data/biomes'
import type { DescendResult, FloorOutcome, GameActions, GameState } from '../state/store'
import { createGameStore } from '../state/store'
import { bossResultLine } from './descentText'
import { runDescent } from './descendFlow'
import { startRun } from './startRun'

type Full = GameState & GameActions

// A store whose `descend` behaves as the real one does with a boss: it replaces `bossesCleared`
// with a new Set holding the boss, before it returns.
function bossStore(alreadyCleared: boolean) {
  let state = {
    bossesCleared: new Set<string>(alreadyCleared ? ['broodmother'] : []),
    descend: (): DescendResult => {
      state = {
        ...state,
        bossesCleared: new Set([...state.bossesCleared, 'broodmother']),
      }
      const outcome = {
        floor: 10,
        bossDefeated: 'broodmother',
      } as unknown as FloorOutcome
      return { ok: true, outcome }
    },
  } as unknown as Full
  return { getState: () => state }
}

describe('runDescent', () => {
  test('a first boss clear: the snapshot lacks the boss and the fresh read has it', () => {
    const run = runDescent(bossStore(false), 10)
    expect(run.ok).toBe(true)
    if (!run.ok) return
    expect(run.bossesBefore.has('broodmother')).toBe(false)
    expect(run.bossesAfter.has('broodmother')).toBe(true)
    expect(
      bossResultLine('broodmother', run.bossesBefore, run.bossesAfter, BIOMES),
    ).toContain('first clear')
  })

  test('a repeat clear: the boss is in the snapshot already', () => {
    const run = runDescent(bossStore(true), 10)
    expect(run.ok).toBe(true)
    if (!run.ok) return
    expect(run.bossesBefore.has('broodmother')).toBe(true)
    expect(
      bossResultLine('broodmother', run.bossesBefore, run.bossesAfter, BIOMES),
    ).toContain('already cleared')
  })

  test('a refused descent returns its reason', () => {
    const store = createGameStore()
    expect(runDescent(store, 1)).toEqual({ ok: false, reason: 'no-spec' })
  })

  test('on the real store the outcome is the store’s own', () => {
    const store = createGameStore()
    startRun(store.getState(), 'brute', '1')
    const run = runDescent(store, 1)
    expect(run.ok).toBe(true)
    if (!run.ok) return
    expect(run.outcome.floor).toBe(1)
    expect(run.bossesAfter).toBe(store.getState().bossesCleared)
  })
})
