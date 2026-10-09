import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import * as fixture from './golden-h2b1-observed-silent.fixture'
import { expectedEvents } from './golden-h2b1-observed-silent.fixture'

describe('golden replay: what damage observation must not see (4.1-H2b1)', () => {
  it('an ordinary hit, a spell effect on its own caster and a zero cost leave a cost observer silent', () => {
    const { events } = runGolden(fixture)

    expect(events).toEqual(expectedEvents)
  })
})
