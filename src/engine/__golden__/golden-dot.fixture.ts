// Golden: the DoT lifecycle end-to-end -- a spell-applied status (VENOM_BOLT -> Poison),
// StatusApplied, three on-round-end ticks (flat, bypassing Defence/affinity/pools, no
// TriggerFired, each carrying `statusId: 'poison'` -- the causing status, per GAME_DESIGN's
// event contract), StatusExpired on the tick that also happens to kill the target, and win/loss
// checked once after that round-end sweep (GAME_DESIGN's round-end status lifecycle). The
// cast's own DamageDealt carries no statusId (it isn't status-caused).
//
// Hand-derived (independent `node -e` calculator). CASTER casts venom-bolt on round 1 only (a
// custom script), then waits forever so poison is never refreshed. TARGET always-waits.
//
// TARGET's max HP is 100 (so Poison's percentage tick still lands cleanly -- see below) but the
// golden needs TARGET to start the fight already wounded to 20, to keep the exact same 3-round
// kill this golden exists to exercise. `createCombat` unconditionally resets every creature's
// currentHp to its effective max at fight-start (GAME_DESIGN: "currentHp inits to effective max
// Health at fight-start") -- so a `currentHp` override on the raw creature object below would be
// silently discarded. `TARGET_STARTING_HP` is exported so golden-dot.test.ts can apply the wound
// via `updateCreature` AFTER `createCombat`, the same idiom every other "wounded creature" test
// in this codebase already uses (e.g. resolution.test.ts's heal-scaling/Necromoss tests).
//
//   Cast: offStat = 40 (int) * 0.4 (spellPower) = 16. core = max(16-5,0) = 11. chip = 0.01*16 =
//   0.16. raw = 11.16 -> final 11. TARGET's currentHp 20 -> 9 (cast damage doesn't read HP, so
//   this is unaffected by TARGET's max HP below -- percent-hp-condition-ticks brief).
//   TARGET's max HP is 100 specifically so Poison's percentage tick still kills it on the R3 tick,
//   preserving this golden's lifecycle coverage (StatusExpired on the killing tick + win checked
//   after the sweep) -- at TARGET's OLD 20 max HP, 3% would floor to 0 (min-1'd to 1) and never
//   finish it off in 3 ticks.
//   Poison (duration 3, 1 stack): flatAmount { ofStat: 'health', percent: 3 } -> each tick =
//   floor(floor(100) * 3 * 1 / 100) = floor(3) = 3 (integer, no float; same per-tick value as the
//   old flat-3 literal, by construction of the new max HP).
//     R1 end: 9 -> 6, duration 3 -> 2.
//     R2 end: 6 -> 3, duration 2 -> 1.
//     R3 end: 3 -> 0 (dies), duration 1 -> 0 -> StatusExpired. Enemy wiped -> win, checked
//     right after the sweep (no round-4 ever starts).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { VENOM_BOLT } from '../../data/spells'
import { STATUS_REGISTRY } from '../../data/statuses'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import type { CombatEvent, FightResult } from '../types'
import type { Script } from '../scripting-types'

export const SEED = 8008 // No RNG consumed (deterministic targeting); seed is inert.

const CASTER = createCreatureId('caster')
export const TARGET = createCreatureId('target')

/** Applied post-createCombat by golden-dot.test.ts -- see the header comment above for why. */
export const TARGET_STARTING_HP = 20

const castOnceThenWait: Script = {
  id: 'cast-once-then-wait',
  rules: [
    {
      condition: { kind: 'round-number', comparator: '==', round: 1 },
      action: { kind: 'cast', gemSlot: 0 },
      targeting: { kind: 'lowest-hp-enemy' },
    },
    { condition: { kind: 'always' }, action: { kind: 'wait' } },
  ],
}

export const playerParty = makeParty('player', [
  {
    id: 'caster',
    intelligence: 40,
    speed: 20,
    scriptId: 'cast-once-then-wait',
    equippedSpells: [VENOM_BOLT],
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'target',
    health: 100,
    defence: 5,
    speed: 10,
    scriptId: 'always-wait',
  },
])

export const scripts: ReadonlyMap<string, Script> = new Map([
  ...STOCK_SCRIPTS_BY_ID,
  [castOnceThenWait.id, castOnceThenWait],
])
export const statuses = STATUS_REGISTRY

function dotTick(remainingHp: number): CombatEvent {
  return {
    type: 'DamageDealt',
    sourceId: TARGET,
    targetId: TARGET,
    rawDamage: 3,
    finalDamage: 3,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp,
    damageSource: 'dot',
    statusId: 'poison',
  }
}

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: CASTER },
  {
    type: 'SpellCast',
    targetShape: 'single',
    casterId: CASTER,
    gemSlot: 0,
    targetId: TARGET,
  },
  {
    type: 'DamageDealt',
    sourceId: CASTER,
    targetId: TARGET,
    rawDamage: 11.16,
    finalDamage: 11,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 9,
    damageSource: 'cast',
  },
  {
    type: 'StatusApplied',
    targetId: TARGET,
    statusId: 'poison',
    stacks: 1,
    duration: 3,
    sourceId: CASTER,
  },
  { type: 'TurnEnded', creatureId: CASTER },
  { type: 'TurnStarted', creatureId: TARGET },
  { type: 'Waited', creatureId: TARGET },
  { type: 'TurnEnded', creatureId: TARGET },
  dotTick(6),
  { type: 'RoundStarted', round: 2 },
  { type: 'TurnStarted', creatureId: CASTER },
  { type: 'Waited', creatureId: CASTER },
  { type: 'TurnEnded', creatureId: CASTER },
  { type: 'TurnStarted', creatureId: TARGET },
  { type: 'Waited', creatureId: TARGET },
  { type: 'TurnEnded', creatureId: TARGET },
  dotTick(3),
  { type: 'RoundStarted', round: 3 },
  { type: 'TurnStarted', creatureId: CASTER },
  { type: 'Waited', creatureId: CASTER },
  { type: 'TurnEnded', creatureId: CASTER },
  { type: 'TurnStarted', creatureId: TARGET },
  { type: 'Waited', creatureId: TARGET },
  { type: 'TurnEnded', creatureId: TARGET },
  dotTick(0),
  { type: 'CreatureDied', creatureId: TARGET },
  { type: 'StatusExpired', creatureId: TARGET, statusId: 'poison' },
  { type: 'FightEnded', result: 'win' },
]

export const expectedResult: FightResult = 'win'
