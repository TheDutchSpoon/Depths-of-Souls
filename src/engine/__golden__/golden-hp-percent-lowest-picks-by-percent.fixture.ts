// Golden: an `hp-percent ... lowest` qualifier tests the creature with the lowest HP%, not the one
// with the lowest current HP (`spec/scripting.md#conditions-in-the-engine`). Hand-derived.
//
// Player: W (Health 25, speed 30, script `hp-lowest-provoke`) and X (Health 100, speed 10,
// waits). Enemy: E (speed 1, waits). `setup` wounds W to 20 (20/25 = 80%) and X to 30
// (30/100 = 30%); `createCombat` resets HP, so the wounds are applied after it.
//
// `hp-lowest-provoke` is a fixture-local copy of the `warden` script's rule 1 with its threshold
// pinned at 50, then attack: a tuning change to `warden` cannot move a mechanism golden
// (`CONVENTIONS.md#tuning-never-changes-a-mechanism-golden`).
//
// TURN_STEPS = 1 (W acts first). W's allies are {W 20/25, X 30/100}, so the rule-1 pool is both.
//   by HP%:        W 80%, X 30%  -> lowest is X; 30 < 50 holds  -> rule 1 fires, W Provokes.
//   by current HP: W 20,  X 30   -> lowest would be W; 80 < 50 fails -> rule 2, W attacks.
// No RNG is drawn: the Provoke needs none and the seed is inert.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { updateCreature } from '../creature-lookup'
import { FIXTURE_SCRIPTS } from '../__fixtures__/scripts'
import type { Script } from '../scripting-types'
import type { CombatEvent, CombatState } from '../types'

export const SEED = 7301 // No RNG consumed; seed is inert.
export const TURN_STEPS = 1 // W's turn only.

const W = createCreatureId('w')
const X = createCreatureId('x')

export const HP_LOWEST_PROVOKE_SCRIPT: Script = {
  id: 'hp-lowest-provoke',
  rules: [
    {
      condition: {
        kind: 'hp-percent',
        subject: 'ally',
        qualifier: 'lowest',
        comparator: '<',
        thresholdPercent: 50,
      },
      action: { kind: 'provoke' },
    },
    {
      condition: { kind: 'always' },
      action: { kind: 'attack' },
      targeting: { kind: 'lowest-hp-enemy' },
    },
  ],
}

export const playerParty = makeParty('player', [
  { id: 'w', health: 25, speed: 30, scriptId: 'hp-lowest-provoke' },
  { id: 'x', health: 100, speed: 10, scriptId: 'always-wait' },
])
export const enemyParty = makeParty('enemy', [
  { id: 'e', speed: 1, scriptId: 'always-wait' },
])

export const scripts: ReadonlyMap<string, Script> = new Map(
  [...FIXTURE_SCRIPTS, HP_LOWEST_PROVOKE_SCRIPT].map((script) => [script.id, script]),
)

export const setup = (created: CombatState): CombatState =>
  updateCreature(updateCreature(created, W, { currentHp: 20 }), X, { currentHp: 30 })

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: W },
  { type: 'Provoked', creatureId: W },
  { type: 'TurnEnded', creatureId: W },
]
