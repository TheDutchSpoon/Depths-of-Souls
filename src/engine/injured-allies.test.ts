// Phase 4.1-H2b1 (ASSUMPTION 140, 141): the Flickerling Wick's gate (`other-ally-injured`, a
// trigger-only condition) and its heal target (`lowest-hp-injured-other-ally`) read ONE pool,
// `injuredOtherAlliesOf`. This table pins that they agree on every board state, plus the type-level
// and data-level guarantees that the trigger-only kind never reaches a player's script.

import { describe, expect, it } from 'vitest'
import { createCombat } from './combat'
import { createResolutionContext } from './actions'
import { newCascade, applyStatModifier } from './resolution'
import { evaluateTriggerCondition } from './conditions'
import { resolveLowestHpInjuredOtherAlly } from './target-selectors'
import { injuredOtherAlliesOf } from './targeting'
import { updateCreature } from './creature-lookup'
import { makeParty } from './__fixtures__/creatures'
import { createCreatureId } from './ids'
import { FIXTURE_SCRIPTS_BY_ID } from './__fixtures__/scripts'
import { ROLE_SCRIPTS } from '../data/scripts'
import type { CombatState } from './types'
import type { CreatureId } from './ids'
import type { Rule } from './scripting-types'

const B = createCreatureId('b') // the bearer (the Wick)
const P = createCreatureId('p')
const Q = createCreatureId('q')

/** Player side b (slot 0, health 40), p (slot 1, health 30), q (slot 2, health 60), all full; one
 * enemy. `edit` wounds / kills / raises ceilings. */
function board(edit: (state: CombatState) => CombatState = (s) => s): CombatState {
  const created = createCombat({
    seed: 1,
    player: {
      party: makeParty('player', [
        { id: 'b', health: 40 },
        { id: 'p', health: 30 },
        { id: 'q', health: 60 },
      ]),
    },
    enemy: { party: makeParty('enemy', [{ id: 'e', health: 50 }]) },
    registries: { scripts: FIXTURE_SCRIPTS_BY_ID },
  })
  return edit(created)
}

const wound = (state: CombatState, id: CreatureId, currentHp: number): CombatState =>
  updateCreature(state, id, { currentHp })
const kill = (state: CombatState, id: CreatureId): CombatState =>
  updateCreature(state, id, { currentHp: 0, alive: false })

const ROWS: readonly (readonly [
  label: string,
  edit: (s: CombatState) => CombatState,
  chosen: CreatureId | null,
])[] = [
  ['everyone at full Health', (s) => s, null],
  [
    'the bearer itself hurt, every other ally full (the bearer is not counted)',
    (s) => wound(s, B, 10),
    null,
  ],
  [
    'the bearer hurt AND the most hurt, one other ally lightly hurt (the bearer is excluded from the heal)',
    (s) => wound(wound(s, B, 5), P, 29),
    P,
  ],
  ['one other ally hurt', (s) => wound(s, P, 20), P],
  [
    'the only hurt other ally is dead (a corpse has currentHp 0, below max, and is not counted)',
    (s) => kill(s, P),
    null,
  ],
  [
    'a full-Health ally has LOWER current HP than the hurt one (the heal picks the hurt one)',
    (s) => wound(s, Q, 59), // q 59/60 is hurt; p is full at 30, a LOWER current HP than q's 59
    Q,
  ],
  [
    'two hurt others: the lowest current HP wins',
    (s) => wound(wound(s, P, 25), Q, 12),
    Q,
  ],
  [
    'two hurt others tied on current HP: the standard order (lowest slot) wins',
    (s) => wound(wound(s, P, 12), Q, 12),
    P,
  ],
  [
    'nobody else alive (the other allies are dead), the bearer hurt',
    (s) => wound(kill(kill(s, P), Q), B, 5),
    null,
  ],
  [
    'a raised Health ceiling makes a full-looking ally hurt (p: 30/30 -> max 45)',
    (s) =>
      applyStatModifier(
        B,
        P,
        'health',
        1.5,
        'fixture',
        s,
        createResolutionContext([], newCascade()),
      ),
    P,
  ],
]

describe('the gate and the heal target agree on one pool (4.1-H2b1, ASSUMPTION 140)', () => {
  for (const [label, edit, chosen] of ROWS) {
    it(`${label}`, () => {
      const state = board(edit)
      const bearer = state.playerParty[0]!

      const gate = evaluateTriggerCondition({ kind: 'other-ally-injured' }, bearer, state)
      const target = resolveLowestHpInjuredOtherAlly(bearer, state)

      expect(target).toBe(chosen)
      expect(gate).toBe(target !== null) // the gate never passes with the target empty, nor the reverse
      expect(gate).toBe(injuredOtherAlliesOf(bearer, state).length > 0)
    })
  }

  it('the bearer is never in the pool, and a dead ally never is', () => {
    const state = board((s) => kill(wound(s, B, 1), P))
    const bearer = state.playerParty[0]!

    const pool = injuredOtherAlliesOf(bearer, state).map((c) => c.id)

    expect(pool).not.toContain(B)
    expect(pool).not.toContain(P)
  })

  it('delegates every scripting condition to evaluateCondition unchanged', () => {
    const state = board()
    const bearer = state.playerParty[0]!

    expect(evaluateTriggerCondition({ kind: 'always' }, bearer, state)).toBe(true)
    expect(
      evaluateTriggerCondition(
        { kind: 'ally-count', comparator: '==', count: 3 },
        bearer,
        state,
      ),
    ).toBe(true)
  })
})

describe('the trigger-only condition never reaches a script (4.1-H2b1, ASSUMPTION 141)', () => {
  it('is a type error in a scripting rule (checked by `npx tsc -b`)', () => {
    // @ts-expect-error -- 'other-ally-injured' is a TriggerCondition kind, not a scripting Condition
    const condition: Rule['condition'] = { kind: 'other-ally-injured' }
    expect(condition.kind).toBe('other-ally-injured') // the cast above is only a compile-time check
  })

  it('no stock role script carries the kind', () => {
    for (const script of ROLE_SCRIPTS) {
      for (const rule of script.rules) {
        expect(JSON.stringify(rule.condition)).not.toContain('other-ally-injured')
      }
    }
  })
})
