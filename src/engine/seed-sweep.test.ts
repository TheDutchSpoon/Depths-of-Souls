// Phase 4.1-C2a (A1): a 200-seed determinism sweep over a party mix that exercises bonus-cast
// (Arcane Surge), echo-cast (Resonant Overtone), Provoke (always-provoke) and Confusion (the
// real `confusion` status) all at once -- the combination the rerouted action pipeline most
// needs to prove itself against, and one no existing fixed-seed golden happens to combine. For
// every seed, two independent runs from the same freshly-built state, and a third run from a
// deep-frozen snapshot of it, must all reproduce the exact same event log. Separate from
// frozen-replay-sweep.test.ts, which only replays fixed-seed fixtures already committed to disk.

import { describe, expect, it } from 'vitest'
import { createCombat, resolveFight } from './combat'
import { applyStatus, newCascade } from './resolution'
import { createResolutionContext } from './actions'
import { deepFreeze } from './test-utils/deep-freeze'
import { makeParty } from './__fixtures__/creatures'
import { createCreatureId } from './ids'
import { STOCK_SCRIPTS_BY_ID } from '../data/scripts'
import { TRAIT_REGISTRY } from '../data/traits'
import { STATUS_REGISTRY } from '../data/statuses'
import { SORCERER_STARTER_TRAIT } from '../data/traits/starters'
import { RESONANT_OVERTONE_TRAIT } from '../data/traits/glimmerdark'
import { ARCANE_BOLT } from '../data/spells'
import type { CombatEvent, CombatState } from './types'

const SORCERER = createCreatureId('sorcerer')
const AMPLIFIER = createCreatureId('amplifier')
const PROVOKER = createCreatureId('provoker')

function freshState(seed: number): CombatState {
  const player = makeParty('player', [
    {
      id: 'sorcerer',
      intelligence: 25,
      speed: 15,
      scriptId: 'always-cast',
      equippedSpells: [ARCANE_BOLT],
      innateTraitIds: [SORCERER_STARTER_TRAIT.id],
    },
    {
      id: 'amplifier',
      speed: 10,
      scriptId: 'always-wait',
      innateTraitIds: [RESONANT_OVERTONE_TRAIT.id],
    },
  ])
  const enemy = makeParty('enemy', [
    { id: 'provoker', speed: 20, health: 60, scriptId: 'always-provoke' },
    { id: 'striker', speed: 5, health: 60, attack: 15, scriptId: 'always-attack' },
  ])
  const created = createCombat({
    seed,
    player: { party: player },
    enemy: { party: enemy },
    registries: {
      scripts: STOCK_SCRIPTS_BY_ID,
      traits: TRAIT_REGISTRY,
      statuses: STATUS_REGISTRY,
    },
  })
  // Pre-apply the real Confusion status to SORCERER, before any turn resolves -- matching every
  // other golden fixture's own "pre-apply into a throwaway events array" idiom.
  return applyStatus(
    SORCERER,
    SORCERER,
    { statusId: 'confusion', duration: 100 },
    created,
    createResolutionContext([], newCascade()),
  )
}

function run(state: CombatState): CombatEvent[] {
  return resolveFight(state).events
}

describe('seed sweep: bonus-cast + echo-cast + Provoke + Confusion together (Phase 4.1-C2a)', () => {
  it('sanity: the fixture actually exercises all four mechanisms across the sweep', () => {
    let sawEcho = false
    let sawBonusCast = false
    let sawProvokeRedirect = false
    let sawConfusionRedirect = false

    for (let seed = 0; seed < 200; seed++) {
      const events = run(freshState(seed))
      for (const event of events) {
        if (event.type === 'EchoCastGranted') sawEcho = true
        // PROVOKER starts at much higher HP than STRIKER (60 vs the fixture default) -- a cast
        // landing on it this early can only be Provoke's redirect overriding the script's own
        // lowest-hp-enemy selector, never a coincidental "it happens to be lowest HP" pick.
        if (
          event.type === 'SpellCast' &&
          event.targetShape === 'single' &&
          event.casterId === SORCERER &&
          event.targetId === PROVOKER
        ) {
          sawProvokeRedirect = true
        }
        // Confusion redirects an enemy-targeting cast onto the caster's OWN living side --
        // AMPLIFIER is the only other player-side creature ARCANE_BOLT could land on that way.
        if (
          event.type === 'SpellCast' &&
          event.targetShape === 'single' &&
          event.casterId === SORCERER &&
          event.targetId === AMPLIFIER
        ) {
          sawConfusionRedirect = true
        }
      }
      // A bonus cast lands on the Sorcerer's own turn-end, so a SECOND SpellCast inside one
      // TurnStarted/TurnEnded bracket (the first being the scripted always-cast) is bonus-cast.
      let inSorcererTurn = false
      let castsThisTurn = 0
      for (const event of events) {
        if (event.type === 'TurnStarted' && event.creatureId === SORCERER) {
          inSorcererTurn = true
          castsThisTurn = 0
        }
        if (inSorcererTurn && event.type === 'SpellCast') castsThisTurn += 1
        if (event.type === 'TurnEnded' && event.creatureId === SORCERER) {
          if (castsThisTurn > 1) sawBonusCast = true
          inSorcererTurn = false
        }
      }
    }

    expect(sawBonusCast).toBe(true)
    expect(sawEcho).toBe(true)
    expect(sawProvokeRedirect).toBe(true)
    expect(sawConfusionRedirect).toBe(true)
  })

  it.each(Array.from({ length: 200 }, (_, seed) => seed))(
    'seed %i: two independent runs and a frozen-snapshot replay all agree',
    (seed) => {
      const runA = run(freshState(seed))
      const runB = run(freshState(seed))
      const runC = run(deepFreeze(freshState(seed)))

      expect(runB).toEqual(runA)
      expect(runC).toEqual(runA)
    },
  )
})
