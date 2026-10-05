// Golden: Pacified (Phase 4.1-F3, G2) -- the real Pacify spell locks its target's Attack for the
// target's next THREE OWN turns, whether the target acts after its applier in round 1 or before it,
// and each lock expires in its own bearer's turn-end cleanup (F2: one born window, durations count
// the bearer's turns). A scoped lock never skips the turn: a Pacified always-attack creature has no legal attack, so the implicit fallback WAITS.
// Hand-derived.
//
// Queue every round: FAST (enemy, speed 40), S1 (player, 36), S2 (player, 34), TANK (player, 20),
// SLOW (enemy, 10). S1 and S2 (wit) carry PACIFY in slot 0 and cast it in ROUND 1 ONLY (a
// `round-number == 1` rule, then Wait): under an always-cast script each cast would refresh the
// status to 3 and it would never expire. S1 targets the lowest-HP enemy (FAST 100 < SLOW 150), S2 the
// highest-HP enemy (SLOW). TANK (400 HP, defence 5, waits) is the lowest-HP player (S1 and S2 have
// 500), so every enemy action defaults to it.
//   Attack (unlocked): enemy Attack 20: off 20, def 5 -> core 15, chip 0.2 -> raw 15.2 -> final 15.
//   FAST acts BEFORE S1 in round 1, so the Pacify lands after its R1 turn: locked rounds 2-4, expiring in
//   its R4 cleanup. SLOW acts AFTER S2, so it is locked rounds 1-3, expiring in its R3 cleanup.
//   TANK HP (400):
//     R1  FAST attack 15 -> 385; (S1, S2 apply); SLOW waits (locked)
//     R2  FAST waits; SLOW waits
//     R3  FAST waits; SLOW waits, lock expires
//     R4  FAST waits, lock expires; SLOW attack 15 -> 370
//     R5  FAST and SLOW both unlocked: attack 15 each (355, 340)
//     R6  both unlocked again (a clean turn after the expiries)
// No RNG is consumed; the seed is inert.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { STATUS_REGISTRY } from '../../data/statuses'
import { PACIFY } from '../../data/spells'
import type { CombatEvent, FightResult, Spell } from '../types'
import type { Script } from '../scripting-types'

export const SEED = 4302
export const TURN_STEPS = 30 // six rounds of five turns

const S1 = createCreatureId('s1')
const S2 = createCreatureId('s2')
const TANK = createCreatureId('tank')
const FAST = createCreatureId('fast')
const SLOW = createCreatureId('slow')
type Id = typeof S1

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

const applyOnce = (
  id: string,
  targeting: 'lowest-hp-enemy' | 'highest-hp-enemy',
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
const S1_SCRIPT = applyOnce('f3-apply-lowest', 'lowest-hp-enemy')
const S2_SCRIPT = applyOnce('f3-apply-highest', 'highest-hp-enemy')

export const playerParty = makeParty('player', [
  {
    id: 's1',
    health: 500,
    speed: 36,
    affinity: 'wit',
    scriptId: S1_SCRIPT.id,
    equippedSpells: [PACIFY, null, null],
  },
  {
    id: 's2',
    health: 500,
    speed: 34,
    affinity: 'wit',
    scriptId: S2_SCRIPT.id,
    equippedSpells: [PACIFY, null, null],
  },
  { id: 'tank', health: 400, defence: 5, speed: 20, scriptId: 'always-wait' },
])
export const enemyParty = makeParty('enemy', [
  {
    id: 'fast',
    health: 100,
    attack: 20,
    intelligence: 30,
    speed: 40,
    scriptId: 'always-attack',
    equippedSpells: [BOLT, null, null],
  },
  {
    id: 'slow',
    health: 150,
    attack: 20,
    intelligence: 30,
    speed: 10,
    scriptId: 'always-attack',
    equippedSpells: [BOLT, null, null],
  },
])

export const scripts: ReadonlyMap<string, Script> = new Map([
  ...STOCK_SCRIPTS_BY_ID,
  [S1_SCRIPT.id, S1_SCRIPT],
  [S2_SCRIPT.id, S2_SCRIPT],
])
export const statuses = STATUS_REGISTRY

const turn = (who: Id, ...body: CombatEvent[]): CombatEvent[] => [
  { type: 'TurnStarted', creatureId: who },
  ...body,
  { type: 'TurnEnded', creatureId: who },
]
const waited = (who: Id): CombatEvent => ({ type: 'Waited', creatureId: who })
const hit = (
  who: Id,
  kind: 'attack' | 'cast',
  raw: number,
  final: number,
  remainingHp: number,
): CombatEvent[] => [
  kind === 'attack'
    ? { type: 'AttackDeclared', attackerId: who, targetId: TANK }
    : {
        type: 'SpellCast',
        targetShape: 'single',
        casterId: who,
        gemSlot: 0,
        targetId: TANK,
      },
  {
    type: 'DamageDealt',
    sourceId: who,
    targetId: TANK,
    rawDamage: raw,
    finalDamage: final,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp,
    damageSource: kind,
    statusId: undefined,
  },
]
const expired = (who: Id): CombatEvent => ({
  type: 'StatusExpired',
  creatureId: who,
  statusId: 'pacified',
})
const applyEvents = (caster: Id, target: Id): CombatEvent[] => [
  {
    type: 'SpellCast',
    targetShape: 'single',
    casterId: caster,
    gemSlot: 0,
    targetId: target,
  },
  {
    type: 'StatusApplied',
    targetId: target,
    statusId: 'pacified',
    stacks: 1,
    duration: 3,
    sourceId: caster,
  },
]
const attack = (who: Id, hp: number) => hit(who, 'attack', 15.2, 15, hp)

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  ...turn(FAST, ...attack(FAST, 385)),
  ...turn(S1, ...applyEvents(S1, FAST)),
  ...turn(S2, ...applyEvents(S2, SLOW)),
  ...turn(TANK, waited(TANK)),
  ...turn(SLOW, waited(SLOW)),
  { type: 'RoundStarted', round: 2 },
  ...turn(FAST, waited(FAST)),
  ...turn(S1, waited(S1)),
  ...turn(S2, waited(S2)),
  ...turn(TANK, waited(TANK)),
  ...turn(SLOW, waited(SLOW)),
  { type: 'RoundStarted', round: 3 },
  ...turn(FAST, waited(FAST)),
  ...turn(S1, waited(S1)),
  ...turn(S2, waited(S2)),
  ...turn(TANK, waited(TANK)),
  ...turn(SLOW, waited(SLOW), expired(SLOW)),
  { type: 'RoundStarted', round: 4 },
  ...turn(FAST, waited(FAST), expired(FAST)),
  ...turn(S1, waited(S1)),
  ...turn(S2, waited(S2)),
  ...turn(TANK, waited(TANK)),
  ...turn(SLOW, ...attack(SLOW, 370)),
  { type: 'RoundStarted', round: 5 },
  ...turn(FAST, ...attack(FAST, 355)),
  ...turn(S1, waited(S1)),
  ...turn(S2, waited(S2)),
  ...turn(TANK, waited(TANK)),
  ...turn(SLOW, ...attack(SLOW, 340)),
  { type: 'RoundStarted', round: 6 },
  ...turn(FAST, ...attack(FAST, 325)),
  ...turn(S1, waited(S1)),
  ...turn(S2, waited(S2)),
  ...turn(TANK, waited(TANK)),
  ...turn(SLOW, ...attack(SLOW, 310)),
]

export const expectedResult: FightResult | null = null
