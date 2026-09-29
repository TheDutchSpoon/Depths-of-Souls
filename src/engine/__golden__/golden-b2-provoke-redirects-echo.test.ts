import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-b2-provoke-redirects-echo.fixture'
import { expectedEvents } from './golden-b2-provoke-redirects-echo.fixture'

describe('golden replay: B2.3 -- a Provoke redirects an echo (Phase 4.1-C2c)', () => {
  it('matches the committed event log exactly -- exactly one echo, on the provoker', () => {
    const { initial, events, state } = runGolden(fixture)
    expect(initial.playerParty[0]?.equippedSpells.map((s) => s?.id)).toEqual([
      'bolt-fixture',
    ])

    expect(events).toEqual(expectedEvents)
    expect(events.filter((e) => e.type === 'EchoCastGranted')).toHaveLength(1)
    expect(events.some((e) => e.type === 'CascadeTruncated')).toBe(false)
    expect(state.result).toBeNull()
  })
})
