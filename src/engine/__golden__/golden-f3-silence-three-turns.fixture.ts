// Golden: Silenced (Phase 4.1-F3, G2) -- the real Silence spell locks its target's Cast for the
// target's next THREE OWN turns, whether the target acts after its applier in round 1 or before it,
// and each lock expires in its own bearer's turn-end cleanup (F2: one born window, durations count
// the bearer's turns). A scoped lock never skips the turn: a Silenced always-cast creature falls through to the implicit fallback and ATTACKS.
// Hand-derived.
//
// Queue every round: FAST (enemy, speed 40), S1 (player, 36), S2 (player, 34), TANK (player, 20),
// SLOW (enemy, 10). S1 and S2 (violence) carry SILENCE in slot 0 and cast it in ROUND 1 ONLY (a
// `round-number == 1` rule, then Wait): under an always-cast script each cast would refresh the
// status to 3 and it would never expire. S1 targets the lowest-HP enemy (FAST 100 < SLOW 150), S2 the
// highest-HP enemy (SLOW). TANK (400 HP, defence 5, waits) is the lowest-HP player (S1 and S2 have
// 500), so every enemy action defaults to it.
//   Cast (unlocked): BOLT, spellPower 1, enemy Int 30: off 30, def 5 -> core 25, chip 0.01*30 = 0.3 -> raw 25.3 -> final 25.
//   Attack (the fallback while Silenced): enemy Attack 20 -> raw 15.2 -> final 15.
//   FAST acts BEFORE S1 in round 1, so the Silence lands after its R1 turn: locked rounds 2-4, expiring in
//   its R4 cleanup. SLOW acts AFTER S2, so it is locked rounds 1-3, expiring in its R3 cleanup.
//   TANK HP (400):
//     R1  FAST cast 25 -> 375; (S1, S2 apply); SLOW attack (locked) 15 -> 360
//     R2  FAST attack 15 -> 345; SLOW attack 15 -> 330
//     R3  FAST attack 15 -> 315; SLOW attack 15 -> 300, lock expires
//     R4  FAST attack 15 -> 285, lock expires; SLOW cast 25 -> 260
//     R5  FAST and SLOW both unlocked: cast 25 -> 235, cast 25 -> 210
//     R6  both unlocked again (a clean turn after the expiries)
// No RNG is consumed; the seed is inert.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import { STATUS_REGISTRY } from '../../data/statuses'
import { SILENCE } from '../../data/spells'
import type { CombatEvent, FightResult, Spell } from '../types'
import type { Script } from '../scripting-types'

export const SEED = 4301
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
    affinity: 'violence',
    scriptId: S1_SCRIPT.id,
    equippedSpells: [SILENCE, null, null],
  },
  {
    id: 's2',
    health: 500,
    speed: 34,
    affinity: 'violence',
    scriptId: S2_SCRIPT.id,
    equippedSpells: [SILENCE, null, null],
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
    scriptId: 'always-cast',
    equippedSpells: [BOLT, null, null],
  },
  {
    id: 'slow',
    health: 150,
    attack: 20,
    intelligence: 30,
    speed: 10,
    scriptId: 'always-cast',
    equippedSpells: [BOLT, null, null],
  },
])

export const scripts: ReadonlyMap<string, Script> = new Map([
  ...FIXTURE_SCRIPTS_BY_ID,
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
  statusId: 'silenced',
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
    statusId: 'silenced',
    stacks: 1,
    duration: 3,
    sourceId: caster,
  },
]
const cast = (who: Id, hp: number) => hit(who, 'cast', 25.3, 25, hp)
const attack = (who: Id, hp: number) => hit(who, 'attack', 15.2, 15, hp)

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  ...turn(FAST, ...cast(FAST, 375)),
  ...turn(S1, ...applyEvents(S1, FAST)),
  ...turn(S2, ...applyEvents(S2, SLOW)),
  ...turn(TANK, waited(TANK)),
  ...turn(SLOW, ...attack(SLOW, 360)),
  { type: 'RoundStarted', round: 2 },
  ...turn(FAST, ...attack(FAST, 345)),
  ...turn(S1, waited(S1)),
  ...turn(S2, waited(S2)),
  ...turn(TANK, waited(TANK)),
  ...turn(SLOW, ...attack(SLOW, 330)),
  { type: 'RoundStarted', round: 3 },
  ...turn(FAST, ...attack(FAST, 315)),
  ...turn(S1, waited(S1)),
  ...turn(S2, waited(S2)),
  ...turn(TANK, waited(TANK)),
  ...turn(SLOW, ...attack(SLOW, 300), expired(SLOW)),
  { type: 'RoundStarted', round: 4 },
  ...turn(FAST, ...attack(FAST, 285), expired(FAST)),
  ...turn(S1, waited(S1)),
  ...turn(S2, waited(S2)),
  ...turn(TANK, waited(TANK)),
  ...turn(SLOW, ...cast(SLOW, 260)),
  { type: 'RoundStarted', round: 5 },
  ...turn(FAST, ...cast(FAST, 235)),
  ...turn(S1, waited(S1)),
  ...turn(S2, waited(S2)),
  ...turn(TANK, waited(TANK)),
  ...turn(SLOW, ...cast(SLOW, 210)),
  { type: 'RoundStarted', round: 6 },
  ...turn(FAST, ...cast(FAST, 185)),
  ...turn(S1, waited(S1)),
  ...turn(S2, waited(S2)),
  ...turn(TANK, waited(TANK)),
  ...turn(SLOW, ...cast(SLOW, 160)),
]

export const expectedResult: FightResult | null = null
