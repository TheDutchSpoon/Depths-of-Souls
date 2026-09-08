// Golden: the four on-[action] hooks (Phase 4 Slice B) -- on-defend, on-provoke, on-cast,
// on-attack, one per round via a round-number-gated script, each firing a distinct,
// easily-verified apply-stat-modifier response ON SELF (a different Stat each, so the four
// firings are individually attributable). Proves each hook fires exactly once per that action
// (Defend/Provoke are always single-instance in v1) and lands AFTER its own intent event
// (Defended/Provoked/SpellCast/AttackDeclared) but BEFORE any of that action's own consequences
// (Cast/Attack's DamageDealt).
//
// Hand-derived (independent `node -e` calculator). HERO (speed 20, boosted to 30 after round 1 --
// still always highest) acts before DUMMY (speed 1, attack 0, scripted always-wait -- it never
// damages HERO and never has a matching hook of its own). All base stats 20 for uniformity;
// every mark's factor is 1.5 (chosen to avoid binary float drift: 20 * 1.5 = 30 exactly).
//
//   R1 Defend:  on-defend fires -> Speed 20 -> 30 (StatModifierApplied). No damage.
//   R2 Provoke: on-provoke fires -> Intelligence 20 -> 30. No damage.
//   R3 Cast:    on-cast fires -> Defence 20 -> 30 (irrelevant to this hit's own math) BEFORE the
//     hit lands. Cast's own offStat reads Intelligence, already boosted to 30 by R2's permanent
//     mod: off 30, def 0 (DUMMY) -> core 30, chip 0.01*30=0.3 -> raw 30.3 -> final 30.
//     DUMMY 1000 - 30 = 970.
//   R4 Attack:  on-attack fires -> Health 20 -> 30 (HERO's own max HP rising never clamps
//     currentHp) BEFORE the hit lands. Attack's own offStat reads Attack (never modified): off
//     20, def 0 -> core 20, chip 0.2 -> raw 20.2 -> final 20. DUMMY 970 - 20 = 950.
//
// Driven via 8 explicit resolveTurn steps (HERO/DUMMY x 4 rounds), NOT resolveFight -- DUMMY
// never dies (1000 HP, HERO only ever deals a fraction of that), so the fight never naturally
// ends; the golden only asserts the first 4 rounds' worth of turns.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import type { CombatEvent, Spell } from '../types'
import type { Script } from '../scripting-types'
import type { Trait } from '../effect-types'

export const SEED = 8008 // No RNG consumed (single enemy, no provokers, no random selectors).

const HERO = createCreatureId('hero')
const DUMMY = createCreatureId('dummy')

function selfMark(
  id: string,
  hook: 'on-defend' | 'on-provoke' | 'on-cast' | 'on-attack',
  stat: 'speed' | 'intelligence' | 'defence' | 'health',
): Trait {
  return {
    id,
    name: id,
    effects: [
      {
        category: 'triggered',
        hook,
        response: {
          kind: 'apply-stat-modifier',
          target: { kind: 'self' },
          stat,
          factor: 1.5,
        },
      },
    ],
  }
}

export const ON_DEFEND_MARK = selfMark('on-defend-mark', 'on-defend', 'speed')
export const ON_PROVOKE_MARK = selfMark('on-provoke-mark', 'on-provoke', 'intelligence')
export const ON_CAST_MARK = selfMark('on-cast-mark', 'on-cast', 'defence')
export const ON_ATTACK_MARK = selfMark('on-attack-mark', 'on-attack', 'health')

export const FIXTURE_SPELL: Spell = {
  id: 'fixture-spell',
  name: 'Fixture Bolt',
  targetShape: 'single',
  spellPower: 1.0,
  affinity: 'vitality',
}

export const ROUND_GATED_SCRIPT: Script = {
  id: 'round-gated',
  rules: [
    {
      condition: { kind: 'round-number', comparator: '==', round: 1 },
      action: { kind: 'defend' },
    },
    {
      condition: { kind: 'round-number', comparator: '==', round: 2 },
      action: { kind: 'provoke' },
    },
    {
      condition: { kind: 'round-number', comparator: '==', round: 3 },
      action: { kind: 'cast', gemSlot: 0 },
      targeting: { kind: 'lowest-hp-enemy' },
    },
    {
      condition: { kind: 'round-number', comparator: '==', round: 4 },
      action: { kind: 'attack' },
      targeting: { kind: 'lowest-hp-enemy' },
    },
  ],
}

export const playerParty = makeParty('player', [
  {
    id: 'hero',
    health: 20,
    attack: 20,
    intelligence: 20,
    defence: 20,
    speed: 20,
    affinity: 'vitality',
    scriptId: 'round-gated',
    equippedSpells: [FIXTURE_SPELL],
    innateTraitIds: [
      'on-defend-mark',
      'on-provoke-mark',
      'on-cast-mark',
      'on-attack-mark',
    ],
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'dummy',
    health: 1000,
    attack: 0,
    defence: 0,
    speed: 1,
    affinity: 'vitality',
    scriptId: 'always-wait',
  },
])

export const scripts: ReadonlyMap<string, Script> = new Map([
  ...STOCK_SCRIPTS_BY_ID,
  [ROUND_GATED_SCRIPT.id, ROUND_GATED_SCRIPT],
])
export const traits: ReadonlyMap<string, Trait> = new Map([
  [ON_DEFEND_MARK.id, ON_DEFEND_MARK],
  [ON_PROVOKE_MARK.id, ON_PROVOKE_MARK],
  [ON_CAST_MARK.id, ON_CAST_MARK],
  [ON_ATTACK_MARK.id, ON_ATTACK_MARK],
])

export const TURN_STEPS = 8 // 4 rounds x (HERO, DUMMY)

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: HERO },
  { type: 'Defended', creatureId: HERO },
  { type: 'TriggerFired', sourceId: HERO, hook: 'on-defend', effectId: 'on-defend-mark' },
  {
    type: 'StatModifierApplied',
    sourceId: HERO,
    targetId: HERO,
    stat: 'speed',
    factor: 1.5,
    effectiveBefore: 20,
    effectiveAfter: 30,
  },
  { type: 'TurnEnded', creatureId: HERO },
  { type: 'TurnStarted', creatureId: DUMMY },
  { type: 'Waited', creatureId: DUMMY },
  { type: 'TurnEnded', creatureId: DUMMY },
  { type: 'RoundStarted', round: 2 },
  { type: 'TurnStarted', creatureId: HERO },
  { type: 'Provoked', creatureId: HERO },
  {
    type: 'TriggerFired',
    sourceId: HERO,
    hook: 'on-provoke',
    effectId: 'on-provoke-mark',
  },
  {
    type: 'StatModifierApplied',
    sourceId: HERO,
    targetId: HERO,
    stat: 'intelligence',
    factor: 1.5,
    effectiveBefore: 20,
    effectiveAfter: 30,
  },
  { type: 'TurnEnded', creatureId: HERO },
  { type: 'TurnStarted', creatureId: DUMMY },
  { type: 'Waited', creatureId: DUMMY },
  { type: 'TurnEnded', creatureId: DUMMY },
  { type: 'RoundStarted', round: 3 },
  { type: 'TurnStarted', creatureId: HERO },
  {
    type: 'SpellCast',
    targetShape: 'single',
    casterId: HERO,
    gemSlot: 0,
    targetId: DUMMY,
  },
  { type: 'TriggerFired', sourceId: HERO, hook: 'on-cast', effectId: 'on-cast-mark' },
  {
    type: 'StatModifierApplied',
    sourceId: HERO,
    targetId: HERO,
    stat: 'defence',
    factor: 1.5,
    effectiveBefore: 20,
    effectiveAfter: 30,
  },
  {
    type: 'DamageDealt',
    sourceId: HERO,
    targetId: DUMMY,
    rawDamage: 30.3,
    finalDamage: 30,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 970,
    damageSource: 'cast',
  },
  { type: 'TurnEnded', creatureId: HERO },
  { type: 'TurnStarted', creatureId: DUMMY },
  { type: 'Waited', creatureId: DUMMY },
  { type: 'TurnEnded', creatureId: DUMMY },
  { type: 'RoundStarted', round: 4 },
  { type: 'TurnStarted', creatureId: HERO },
  { type: 'AttackDeclared', attackerId: HERO, targetId: DUMMY },
  { type: 'TriggerFired', sourceId: HERO, hook: 'on-attack', effectId: 'on-attack-mark' },
  {
    type: 'StatModifierApplied',
    sourceId: HERO,
    targetId: HERO,
    stat: 'health',
    factor: 1.5,
    effectiveBefore: 20,
    effectiveAfter: 30,
  },
  {
    type: 'DamageDealt',
    sourceId: HERO,
    targetId: DUMMY,
    rawDamage: 20.2,
    finalDamage: 20,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 950,
    damageSource: 'attack',
  },
  { type: 'TurnEnded', creatureId: HERO },
  { type: 'TurnStarted', creatureId: DUMMY },
  { type: 'Waited', creatureId: DUMMY },
  { type: 'TurnEnded', creatureId: DUMMY },
]
