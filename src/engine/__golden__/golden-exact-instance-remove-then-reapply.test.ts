import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-exact-instance-remove-then-reapply.fixture'
import { expectedEvents } from './golden-exact-instance-remove-then-reapply.fixture'

describe('golden replay: exact-instance rule -- remove-then-reapply', () => {
  it('matches the committed event log exactly across fight-start and the bearer’s own first turn', () => {
    const { events } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
  })
})
