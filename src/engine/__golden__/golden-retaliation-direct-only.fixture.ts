// Golden (a content golden: re-derived by hand when a retaliator or Poison is retuned): the four
// real retaliators -- Snapback (Snapjaw Jaws), Retaliating Shell (Shellback Bulwark), Madness
// Touch (Hollowkin Wretch) and the Shieldbearer's Thorns perk -- answer an attack and skip an
// indirect hit and a status tick, silently (`spec/effects.md#hooks`). Hand-derived.
//
// P (player, Health 1000, Attack 40, Defence 10, speed 10, always-attack) carries Snapback,
// Retaliating Shell and Madness Touch as innate traits and Thorns as the perk (its sourceTraitId
// is `perk-0`, the only side effect). A (enemy, Health 1000, Attack 50, Defence 20, speed 20,
// always-attack) carries Snapback. All vitality (x1.0), level at the Additional's zero. Poison from
// the living A is on P from `setup` (held at 20% of Attack: potency floor(50 x 20 / 100) = 10).
// P's effect order is innate traits in declaration order, then the perk: Snapback, Shell, Madness
// Touch, Thorns. Direct damage is `(off - def) + 0.01 x off`, floored to at least 1; indirect is
// `magnitude - 0.2 x def`, floored to at least 1.
//
// TURN_STEPS = 2 (A, P).
//   A attacks P: off 50 vs def 10 -> core 40 + chip 0.5 = 40.5 -> 40, P 1000 -> 960. P survives, so
//   all four answer, each an indirect hit on A (def 20 -> 0.2 x 20 = 4):
//     Snapback  40 x 0.6 = 24 - 4 = 20          -> 20, A 1000 -> 980
//     Shell     Defence 10 x 0.5 = 5 - 4 = 1    -> 1,  A 979
//     Madness   applies Confusion (3 turns) to A
//     Thorns    Defence 10 x 0.15 = 1.5 - 4 = -2.5 -> raised to 1, A 978
//   A's own Snapback sees each of the three answering hits (indirect) and skips them: no TriggerFired
//   for it, no hit on P.
//   P attacks A: off 40 vs def 20 -> core 20 + chip 0.4 = 20.4 -> 20, A 978 -> 958. A's Snapback
//   answers (direct damage): 50 x 0.6 = 30 - 0.2 x 10 = 28, P 960 -> 932. That is an indirect hit on
//   P: P's four skip it, silently.
//   P's turn end, the Poison tick from the living A: 10 x 1.0 - 0.2 x 10 = 8, P 932 -> 924. A tick
//   is indirect: P's four skip it, silently.
// RNG draws in the window: none. No retaliator carries a chancePercent; each side has one target
// and no provoker; Confusion's redirect roll is drawn only on its bearer's own harmful action, and
// A's next action falls after the window; the Poison tick draws nothing.
// Were the field dropped from a retaliator, its TriggerFired would show here on the indirect hit
// (and on the tick), named by effectId.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import {
  HOLLOWKIN_WRETCH_TRAIT,
  SHELLBACK_BULWARK_TRAIT,
  SNAPJAW_JAWS_TRAIT,
  TRAIT_REGISTRY,
} from '../../data/traits'
import { STATUS_REGISTRY } from '../../data/statuses'
import { SHIELDBARER, resolveSpecializationEffects } from '../../data/specializations'
import { holdPotency } from '../__fixtures__/held-statuses'
import { applyStatus, newCascade } from '../resolution'
import { createResolutionContext } from '../actions'
import type { CombatEvent, CombatState } from '../types'

export const SEED = 4501 // No RNG consumed; seed is inert.
export const TURN_STEPS = 2 // A, then P.

const A = createCreatureId('a')
const P = createCreatureId('p')

export const playerParty = makeParty('player', [
  {
    id: 'p',
    health: 1000,
    attack: 40,
    defence: 10,
    speed: 10,
    scriptId: 'always-attack',
    innateTraitIds: [
      SNAPJAW_JAWS_TRAIT.id,
      SHELLBACK_BULWARK_TRAIT.id,
      HOLLOWKIN_WRETCH_TRAIT.id,
    ],
  },
])
export const enemyParty = makeParty('enemy', [
  {
    id: 'a',
    health: 1000,
    attack: 50,
    defence: 20,
    speed: 20,
    scriptId: 'always-attack',
    innateTraitIds: [SNAPJAW_JAWS_TRAIT.id],
  },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY
// Pinned at Poison 20% of Attack, the value this golden's arithmetic uses (tuning never changes a
// mechanism golden). The status is otherwise the real one.
export const statuses = holdPotency(STATUS_REGISTRY, { poison: 20 })
export const playerEffects = resolveSpecializationEffects(
  SHIELDBARER,
  new Map([['thorns', 1]]),
)

export const setup = (created: CombatState): CombatState =>
  applyStatus(
    A,
    P,
    { statusId: 'poison', duration: 3 },
    created,
    createResolutionContext([], newCascade()),
  )

const SNAPBACK = SNAPJAW_JAWS_TRAIT.id
const SHELL = SHELLBACK_BULWARK_TRAIT.id
const MADNESS = HOLLOWKIN_WRETCH_TRAIT.id

const fired = (sourceId: typeof A | typeof P, effectId: string): CombatEvent => ({
  type: 'TriggerFired',
  sourceId,
  hook: 'on-damage-taken',
  effectId,
})

const hit = (
  sourceId: typeof A | typeof P,
  targetId: typeof A | typeof P,
  rawDamage: number,
  finalDamage: number,
  remainingHp: number,
  damageSource: 'attack' | 'dot' = 'attack',
  statusId?: string,
): CombatEvent => ({
  type: 'DamageDealt',
  sourceId,
  targetId,
  rawDamage,
  finalDamage,
  affinityMultiplier: 1,
  wasChipOnly: false,
  remainingHp,
  damageSource,
  statusId,
})

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: A },
  { type: 'AttackDeclared', attackerId: A, targetId: P },
  hit(A, P, 40.5, 40, 960),
  // P's four answer the attack, in effect order; A's Snapback skips each answering hit.
  fired(P, SNAPBACK),
  hit(P, A, 20, 20, 980),
  fired(P, SHELL),
  hit(P, A, 1, 1, 979),
  fired(P, MADNESS),
  { type: 'StatusApplied', targetId: A, statusId: 'confusion', duration: 3, sourceId: P },
  fired(P, 'perk-0'),
  hit(P, A, -2.5, 1, 978),
  { type: 'TurnEnded', creatureId: A },
  { type: 'TurnStarted', creatureId: P },
  { type: 'AttackDeclared', attackerId: P, targetId: A },
  hit(P, A, 20.4, 20, 958),
  // A's Snapback answers the attack; P's four skip that indirect hit.
  fired(A, SNAPBACK),
  hit(A, P, 28, 28, 932),
  // P's turn end: the Poison tick; P's four skip it.
  hit(A, P, 8, 8, 924, 'dot', 'poison'),
  { type: 'TurnEnded', creatureId: P },
]
