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
// Phase 3.5 demo (traits/statuses no longer firing at all). Pins DEMO_SEED so the demo's
// randomize-seed button never destabilizes this; asserts presence of Phase 3 mechanics, not
// a full log.
describe('demo fight (Phase 3.5 presence smoke test)', () => {
  it('fires at least one triggered effect and applies at least one status at DEMO_SEED', () => {
    const initial = createCombat(
      demoPlayerParty,
      demoEnemyParty,
      DEMO_SEED,
      demoScripts,
      demoTraits,
      demoStatuses,
    )
    const { events } = resolveFight(initial)

    expect(events.filter((e) => e.type === 'TriggerFired').length).toBeGreaterThanOrEqual(
      1,
    )
    expect(
      events.filter((e) => e.type === 'StatusApplied').length,
    ).toBeGreaterThanOrEqual(1)
  })
})
