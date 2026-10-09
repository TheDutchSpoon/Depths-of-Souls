// Golden: Clear Mind and Aggressive -- the REAL perks, passed as the player side's effects through
// the golden runner (Phase 4.1-F3, ASSUMPTION 63). Immunity suppresses the EFFECT, not the
// application: Silence and Pacify still land (StatusApplied), `has-status` stays true, and the
// lock is ignored -- for the chosen action AND for a granted cast. Hand-derived.
//
// Player effects (resolveSpecializationEffects, one perk each): Clear Mind (Sorcerer) =
// status-immunity(silenced), Aggressive (Brute) = status-immunity(pacified). Both apply to every
// player creature.
// MAGE (player, speed 20, Int 30) and BRAWLER (player, speed 19, Attack 25), defence 0. MAGE's
// script: if has-status(self, silenced) cast BOLT slot 0, else wait. BRAWLER's: if
// has-status(self, pacified) attack, else wait. So a SpellCast / AttackDeclared at all proves BOTH
// that the status is present and that its lock was ignored. MAGE also carries a turn-end
// perform-action(self, cast 'random') at chance 100 (the granted cast).
// Enemies (round 1 only, then they wait): SILENCER (speed 40, 300 HP) casts Silence on the
// highest-Intelligence player (MAGE); PACIFIER (speed 39, 250 HP) casts Pacify on the
// highest-Attack player (BRAWLER). Everyone's defence is 0.
// BOLT (spellPower 1): MAGE off 30, def 0 -> core 30, chip 0.3 -> raw 30.3 -> final 30.
// BRAWLER attack: off 25, def 0 -> core 25, chip 0.25 -> raw 25.25 -> final 25.
// Targets default to the lowest-HP enemy: PACIFIER (250 < 300).
//   MAGE's turn: cast (30): PACIFIER 250 -> 220. Turn end: the grant's trigger fires (chance roll),
//     ActionGranted, the gem draw (pool of one), the granted cast lands (30): 220 -> 190. Under
//     Silenced without the perk the grant would be refused. Cleanup: Silenced counts down, no event.
//   BRAWLER's turn: attack (25): 190 -> 165.
// The only random draws are the chance roll and the one-slot gem draw (a pool of one: no outcome
// depends on the value), so the seed is inert.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import { STATUS_REGISTRY } from '../../data/statuses'
import { PACIFY, SILENCE } from '../../data/spells'
import { BRUTE, SORCERER, resolveSpecializationEffects } from '../../data/specializations'
import type { CombatEvent, FightResult, Spell } from '../types'
import type { EffectDef, Trait } from '../effect-types'
import type { Script } from '../scripting-types'

export const SEED = 4304
export const TURN_STEPS = 4 // SILENCER, PACIFIER, MAGE, BRAWLER

const MAGE = createCreatureId('mage')
const BRAWLER = createCreatureId('brawler')
const SILENCER = createCreatureId('silencer')
const PACIFIER = createCreatureId('pacifier')

export const BOLT: Spell = {
  id: 'f3-bolt-fixture',
  name: 'Bolt (fixture)',
  targetShape: 'single',
  affinity: 'vitality',
  targetSide: 'enemy',
  unlockedAtBiome: 1,
  effects: [
    {
      kind: 'deal-damage',
      target: { kind: 'cast-target' },
      offStat: 'cast',
      spellPower: 1,
    },
  ],
}

export const GRANTED_CAST_TRAIT: Trait = {
  id: 'f3-granted-cast-fixture',
  name: 'Granted Cast (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-end',
      chancePercent: 100,
      response: {
        kind: 'perform-action',
        actor: 'self',
        intent: { action: { kind: 'cast', gemSlot: 'random' } },
      },
    },
  ],
}

const MAGE_SCRIPT: Script = {
  id: 'f3-mage-if-silenced',
  rules: [
    {
      condition: { kind: 'has-status', subject: 'self', statusId: 'silenced' },
      action: { kind: 'cast', gemSlot: 0 },
      targeting: { kind: 'lowest-hp-enemy' },
    },
    { condition: { kind: 'always' }, action: { kind: 'wait' } },
  ],
}
const BRAWLER_SCRIPT: Script = {
  id: 'f3-brawler-if-pacified',
  rules: [
    {
      condition: { kind: 'has-status', subject: 'self', statusId: 'pacified' },
      action: { kind: 'attack' },
      targeting: { kind: 'lowest-hp-enemy' },
    },
    { condition: { kind: 'always' }, action: { kind: 'wait' } },
  ],
}
const castOnceAt = (
  id: string,
  targeting: 'highest-intelligence-enemy' | 'highest-attack-enemy',
): Script => ({
  id,
  rules: [
    {
      condition: { kind: 'round-number', comparator: '==', round: 1 },
      action: { kind: 'cast', gemSlot: 0 },
      targeting: { kind: targeting },
    },
    { condition: { kind: 'always' }, action: { kind: 'wait' } },
  ],
})
const SILENCER_SCRIPT = castOnceAt('f3-silencer-script', 'highest-intelligence-enemy')
const PACIFIER_SCRIPT = castOnceAt('f3-pacifier-script', 'highest-attack-enemy')

export const playerParty = makeParty('player', [
  {
    id: 'mage',
    health: 100,
    attack: 5,
    intelligence: 30,
    defence: 0,
    speed: 20,
    scriptId: MAGE_SCRIPT.id,
    equippedSpells: [BOLT, null, null],
    innateTraitIds: [GRANTED_CAST_TRAIT.id],
  },
  {
    id: 'brawler',
    health: 100,
    attack: 25,
    intelligence: 5,
    defence: 0,
    speed: 19,
    scriptId: BRAWLER_SCRIPT.id,
  },
])
export const enemyParty = makeParty('enemy', [
  {
    id: 'silencer',
    health: 300,
    defence: 0,
    speed: 40,
    scriptId: SILENCER_SCRIPT.id,
    equippedSpells: [SILENCE, null, null],
  },
  {
    id: 'pacifier',
    health: 250,
    defence: 0,
    speed: 39,
    scriptId: PACIFIER_SCRIPT.id,
    equippedSpells: [PACIFY, null, null],
  },
])

export const scripts: ReadonlyMap<string, Script> = new Map([
  ...FIXTURE_SCRIPTS_BY_ID,
  [MAGE_SCRIPT.id, MAGE_SCRIPT],
  [BRAWLER_SCRIPT.id, BRAWLER_SCRIPT],
  [SILENCER_SCRIPT.id, SILENCER_SCRIPT],
  [PACIFIER_SCRIPT.id, PACIFIER_SCRIPT],
])
export const traits: ReadonlyMap<string, Trait> = new Map([
  [GRANTED_CAST_TRAIT.id, GRANTED_CAST_TRAIT],
])
export const statuses = STATUS_REGISTRY
export const playerEffects: readonly EffectDef[] = [
  ...resolveSpecializationEffects(SORCERER, new Map([['clear-mind', 1]])),
  ...resolveSpecializationEffects(BRUTE, new Map([['aggressive', 1]])),
]

const dmg = (
  who: typeof MAGE,
  kind: 'attack' | 'cast',
  raw: number,
  final: number,
  remainingHp: number,
): CombatEvent => ({
  type: 'DamageDealt',
  sourceId: who,
  targetId: PACIFIER,
  rawDamage: raw,
  finalDamage: final,
  affinityMultiplier: 1,
  wasChipOnly: false,
  remainingHp,
  damageSource: kind,
  statusId: undefined,
})

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: SILENCER },
  {
    type: 'SpellCast',
    targetShape: 'single',
    casterId: SILENCER,
    gemSlot: 0,
    targetId: MAGE,
  },
  {
    type: 'StatusApplied',
    targetId: MAGE,
    statusId: 'silenced',
    duration: 3,
    sourceId: SILENCER,
  },
  { type: 'TurnEnded', creatureId: SILENCER },
  { type: 'TurnStarted', creatureId: PACIFIER },
  {
    type: 'SpellCast',
    targetShape: 'single',
    casterId: PACIFIER,
    gemSlot: 0,
    targetId: BRAWLER,
  },
  {
    type: 'StatusApplied',
    targetId: BRAWLER,
    statusId: 'pacified',
    duration: 3,
    sourceId: PACIFIER,
  },
  { type: 'TurnEnded', creatureId: PACIFIER },
  { type: 'TurnStarted', creatureId: MAGE },
  {
    type: 'SpellCast',
    targetShape: 'single',
    casterId: MAGE,
    gemSlot: 0,
    targetId: PACIFIER,
  },
  dmg(MAGE, 'cast', 30.3, 30, 220),
  {
    type: 'TriggerFired',
    sourceId: MAGE,
    hook: 'on-turn-end',
    effectId: GRANTED_CAST_TRAIT.id,
  },
  {
    type: 'ActionGranted',
    sourceId: MAGE,
    actorId: MAGE,
    effectId: GRANTED_CAST_TRAIT.id,
  },
  {
    type: 'SpellCast',
    targetShape: 'single',
    casterId: MAGE,
    gemSlot: 0,
    targetId: PACIFIER,
  },
  dmg(MAGE, 'cast', 30.3, 30, 190),
  { type: 'TurnEnded', creatureId: MAGE },
  { type: 'TurnStarted', creatureId: BRAWLER },
  { type: 'AttackDeclared', attackerId: BRAWLER, targetId: PACIFIER },
  dmg(BRAWLER, 'attack', 25.25, 25, 165),
  { type: 'TurnEnded', creatureId: BRAWLER },
]

export const expectedResult: FightResult | null = null
