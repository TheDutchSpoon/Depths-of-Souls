import { describe, expect, it } from 'vitest'
import { runGolden } from '../test-utils/golden-runner'
import {
  enemyDies,
  enemyDiesExpected,
  playerDies,
  playerDiesExpected,
} from './golden-death-observed.fixture'

describe('golden replay: on-death-observed', () => {
  it('an enemy dying: ally, enemy, any and absent filters, the player side firing first', () => {
    const { events } = runGolden(enemyDies)

    expect(events).toEqual(enemyDiesExpected)
  })

  it('a player creature dying: the filters read the dead creature from the other side', () => {
    const { events } = runGolden(playerDies)

    expect(events).toEqual(playerDiesExpected)
  })
})
