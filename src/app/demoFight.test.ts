import { describe, expect, it } from 'vitest'
import { createCombat, resolveFight } from '../engine/combat'
import {
  demoPlayerParty,
  demoEnemyParty,
  demoScripts,
  demoTraits,
  demoStatuses,
  DEMO_SEED,
} from './demoFight'

// Presence smoke test, not a golden -- guards against a future retune silently gutting the
// demo (traits/statuses no longer firing at all). Pins DEMO_SEED so the demo's
// randomize-seed button never destabilizes this; asserts that trait and status mechanics
// fire, not a full log.
describe('demo fight (presence smoke test)', () => {
  it('fires at least one triggered effect and applies at least one status at DEMO_SEED', () => {
    const initial = createCombat({
      seed: DEMO_SEED,
      player: { party: demoPlayerParty },
      enemy: { party: demoEnemyParty },
      registries: { scripts: demoScripts, traits: demoTraits, statuses: demoStatuses },
    })
    const { events } = resolveFight(initial)

    expect(events.filter((e) => e.type === 'TriggerFired').length).toBeGreaterThanOrEqual(
      1,
    )
    expect(
      events.filter((e) => e.type === 'StatusApplied').length,
    ).toBeGreaterThanOrEqual(1)
  })
})
