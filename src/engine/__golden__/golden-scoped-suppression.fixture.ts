// Golden: scoped suppress-action (Phase 4 Slice B) -- a Silenced-shaped creature's Cast rule is
// skipped (interpreter-level gating, not the hook-fired whole-turn-skip Stun uses) while its
// Attack rule -- lower in the SAME script -- still fires. The suppression trait still fires its
// own on-turn-start hook every turn (TriggerFired, "every status has an intrinsic effect" per
// CONVENTIONS) but does NOT set resolveTurn's whole-turn `suppressed` flag, since its scope is
// 'cast', not 'all'.
//
// Hand-derived (independent `node -e` calculator). Both vitality -> neutral affinity x1.0.
// HERO's Cast rule (slot 0 holds a real, single-target spell -- proving the skip is caused by
// suppression, not an empty gem slot) is invalid every turn; its Attack rule wins instead.
//
//   HERO->DUMMY (off 20, def 0): core 20, chip 0.01*20=0.2 -> raw 20.2 -> final 20.
//   DUMMY health 20 - 20 -> 0 -> dies. One hit, one round -- no SpellCast event ever appears.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import type { CombatEvent, FightResult, Spell } from '../types'
import type { Script } from '../scripting-types'
import type { Trait } from '../effect-types'

export const SEED = 6006 // No RNG consumed; seed is inert.

const HERO = createCreatureId('hero')
const DUMMY = createCreatureId('dummy')

export const SILENCED_FIXTURE: Trait = {
  id: 'silenced-fixture',
  name: 'Silenced (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-start',
      response: { kind: 'suppress-action', scope: 'cast' },
    },
  ],
}

export const FIXTURE_SPELL: Spell = {
  id: 'fixture-spell',
  name: 'Fixture Bolt',
  targetShape: 'single',
  spellPower: 0.5,
  affinity: 'vitality',
}

export const CAST_THEN_ATTACK_SCRIPT: Script = {
  id: 'cast-then-attack',
  rules: [
    {
      condition: { kind: 'always' },
      action: { kind: 'cast', gemSlot: 0 },
      targeting: { kind: 'lowest-hp-enemy' },
    },
    {
      condition: { kind: 'always' },
      action: { kind: 'attack' },
      targeting: { kind: 'lowest-hp-enemy' },
    },
  ],
}

export const playerParty = makeParty('player', [
  {
    id: 'hero',
    attack: 20,
    defence: 0,
    speed: 20,
    affinity: 'vitality',
    scriptId: 'cast-then-attack',
    equippedSpells: [FIXTURE_SPELL],
    innateTraitIds: ['silenced-fixture'],
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'dummy',
    health: 20,
    defence: 0,
    speed: 1,
    affinity: 'vitality',
    scriptId: 'always-wait',
  },
])

export const scripts: ReadonlyMap<string, Script> = new Map([
  ...STOCK_SCRIPTS_BY_ID,
  [CAST_THEN_ATTACK_SCRIPT.id, CAST_THEN_ATTACK_SCRIPT],
])
export const traits: ReadonlyMap<string, Trait> = new Map([
  [SILENCED_FIXTURE.id, SILENCED_FIXTURE],
])

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: HERO },
  {
    type: 'TriggerFired',
    sourceId: HERO,
    hook: 'on-turn-start',
    effectId: 'silenced-fixture',
  },
  { type: 'AttackDeclared', attackerId: HERO, targetId: DUMMY },
  {
    type: 'DamageDealt',
    sourceId: HERO,
    targetId: DUMMY,
    rawDamage: 20.2,
    finalDamage: 20,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
  },
  { type: 'CreatureDied', creatureId: DUMMY },
  { type: 'TurnEnded', creatureId: HERO },
  { type: 'FightEnded', result: 'win' },
]

export const expectedResult: FightResult = 'win'
