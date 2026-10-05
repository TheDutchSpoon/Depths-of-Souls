// Phase 4.1-C2c (PR #73 review, CONVENTIONS "Every golden replays through one shared runner"):
// the ONE way a golden test builds its starting state and replays it. Every turn is resolved from a
// deep-frozen state (`stepFrozen`), so every golden also proves the engine never writes to its
// input -- there is no separate sweep and no list of excluded goldens.
//
// What a fixture exports for the runner (ASSUMPTIONS, see the 4.1-C2c phase record):
//   SEED                   the starting seed (a two-seed golden passes `{ seed }` instead)
//   playerParty/enemyParty the two sides (fresh creatures; `createCombat` sets them up)
//   scripts/traits/statuses  optional registries
//   playerEffects/enemyEffects  optional (4.1-F3): a side's effects (specialization perks, ...),
//                          passed straight to `createCombat`'s per-side `effects` input
//   TURN_STEPS             optional: run exactly N turns; absent = run until the fight has a result
//   setup                  optional: a post-`createCombat` step (e.g. `updateCreature` wounds, since
//                          `createCombat` resets HP); it runs BEFORE the first frozen turn
// A golden that needs more than "run N turns / run to the end" builds its own flow from
// `createGoldenState` + `stepFrozen`, so it still advances turns only through the frozen step.

import { createCombat, resolveTurn } from '../combat'
import { deepFreeze } from './deep-freeze'
import type { CombatEvent, CombatState, Creature } from '../types'
import type { Script } from '../scripting-types'
import type { EffectDef, StatusDef, Trait } from '../effect-types'

export interface GoldenFixture {
  readonly SEED?: number
  readonly playerParty: readonly Creature[]
  readonly enemyParty: readonly Creature[]
  readonly scripts?: ReadonlyMap<string, Script>
  readonly traits?: ReadonlyMap<string, Trait>
  readonly statuses?: ReadonlyMap<string, StatusDef>
  /** Phase 4.1-F3: per-side effects, absent for every pre-F3 fixture. */
  readonly playerEffects?: readonly EffectDef[]
  readonly enemyEffects?: readonly EffectDef[]
  readonly TURN_STEPS?: number
  readonly setup?: (state: CombatState) => CombatState
}

export interface GoldenRun {
  /** The starting state (after `setup`), which the first frozen turn froze. */
  readonly initial: CombatState
  readonly state: CombatState
  readonly events: CombatEvent[]
}

/** `createCombat` from the fixture's exports, then its optional `setup` step. */
export function createGoldenState(fixture: GoldenFixture, seed?: number): CombatState {
  const resolvedSeed = seed ?? fixture.SEED
  if (resolvedSeed === undefined) {
    throw new Error('golden runner: the fixture exports no SEED and none was passed')
  }
  const created = createCombat({
    seed: resolvedSeed,
    player: {
      party: fixture.playerParty,
      ...(fixture.playerEffects ? { effects: fixture.playerEffects } : {}),
    },
    enemy: {
      party: fixture.enemyParty,
      ...(fixture.enemyEffects ? { effects: fixture.enemyEffects } : {}),
    },
    registries: {
      scripts: fixture.scripts,
      traits: fixture.traits,
      statuses: fixture.statuses,
    },
  })
  return fixture.setup ? fixture.setup(created) : created
}

/** One `resolveTurn` over a deep-frozen state: any write to the input throws. */
export function stepFrozen(state: CombatState): {
  state: CombatState
  events: CombatEvent[]
} {
  return resolveTurn(deepFreeze(state))
}

/** Replays a golden: exactly `TURN_STEPS` turns, or to the end of the fight when absent. */
export function runGolden(
  fixture: GoldenFixture,
  options?: { seed?: number },
): GoldenRun {
  const initial = createGoldenState(fixture, options?.seed)
  let state = initial
  const events: CombatEvent[] = []
  for (let turns = 0; ; turns++) {
    const done =
      fixture.TURN_STEPS !== undefined
        ? turns >= fixture.TURN_STEPS
        : state.result !== null
    if (done) break
    const step = stepFrozen(state)
    state = step.state
    events.push(...step.events)
  }
  return { initial, state, events }
}
