// Golden: the Brute starter's real signature trait (data/species/starters.ts's
// BRUTE_STARTER_TRAIT) -- "Attack resolves one additional instance" (species-locked.md /
// brute.md: "Attack executes TWICE AT 100%"). A direct, content-level exercise of Slice B's
// action instance-list model (golden-attack-instance-list.fixture.ts's own mechanism), not a
// new one -- this golden proves the REAL shipped content, not a fixture stand-in.
//
// NOTE on a brief/docs conflict, flagged rather than silently resolved (per this slice's own
// kickoff instructions -- "docs win over anything in the brief if they disagree"):
// `.claude/briefs/phase-4-implementation-plan.md`'s own Slice B vocabulary table and Slice F
// prose repeatedly describe the Brute starter's second instance as `[100%, 30%]` ("attack again
// for 30%"). But BOTH content docs -- `.claude/species/species-locked.md` ("Attack executes
// twice at 100%") and `.claude/specializations/brute.md` ("Attack executes twice at 100%") --
// agree the second instance is FULL power, [100%, 100%]. This golden (and
// BRUTE_STARTER_TRAIT itself) follows the two content docs, not the brief; the brief's own
// prose needs a correction before it's read again in a future slice's chat.
//
// Hand-derived (independent `node -e` calculator). ATTACKER (BRUTE_STARTER-shaped: Attack 30,
// violence affinity) vs DEFENDER (violence affinity too -> neutral x1.0, Defence 0).
//
//   Each instance (100% power): off 30, def 0 -> core 30, chip 0.01*30=0.3 -> raw 30.3 -> final 30.
//   DEFENDER health 45 (picked so ONE instance alone does not kill it, but two do):
//     instance 1: 45 - 30 -> 15 (alive -- proves the fight does NOT end after the first hit).
//     instance 2: 15 - 30 -> -15 -> clamped to 0 -> dies. Both instances land on the SAME frozen
//     target (ASSUMPTION 31 -- it never dies mid-list here, so the selector is never re-run).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { TRAIT_REGISTRY } from '../../data/traits'
import { BRUTE_STARTER_TRAIT } from '../../data/species/starters'
import type { CombatEvent, FightResult } from '../types'

export const SEED = 3003 // No RNG consumed (single enemy, no provokers); seed is inert.

const ATTACKER = createCreatureId('attacker')
const DEFENDER = createCreatureId('defender')

export const playerParty = makeParty('player', [
  {
    id: 'attacker',
    attack: 30,
    defence: 15,
    speed: 20,
    affinity: 'violence',
    scriptId: 'always-attack',
    innateTraitIds: [BRUTE_STARTER_TRAIT.id],
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'defender',
    health: 45,
    defence: 0,
    speed: 1,
    affinity: 'violence',
    scriptId: 'always-wait',
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
// Real registry (not a fixture-scoped one) -- proving the SHIPPED trait, referenced by id.
export const traits = TRAIT_REGISTRY

function hit(remainingHp: number): CombatEvent {
  return {
    type: 'DamageDealt',
    sourceId: ATTACKER,
    targetId: DEFENDER,
    rawDamage: 30.3,
    finalDamage: 30,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp,
    damageSource: 'attack',
  }
}

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: ATTACKER },
  { type: 'AttackDeclared', attackerId: ATTACKER, targetId: DEFENDER },
  hit(15),
  { type: 'AttackDeclared', attackerId: ATTACKER, targetId: DEFENDER },
  hit(0),
  { type: 'CreatureDied', creatureId: DEFENDER },
  { type: 'TurnEnded', creatureId: ATTACKER },
  { type: 'FightEnded', result: 'win' },
]

export const expectedResult: FightResult = 'win'
