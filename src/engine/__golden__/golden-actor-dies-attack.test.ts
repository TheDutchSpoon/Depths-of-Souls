import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-actor-dies-attack.fixture'
import { expectedEvents } from './golden-actor-dies-attack.fixture'

describe('golden replay: an action ends when its actor dies (Phase 4.1-C2c, PR #73 review)', () => {
  it('matches the committed event log exactly -- instance 2 emits nothing after the retaliation kills the attacker', () => {
    const { events, state } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
    expect(events.filter((e) => e.type === 'AttackDeclared')).toHaveLength(1)
    expect(state.result).toBeNull() // the ally survives, so the fight goes on
  })
})
