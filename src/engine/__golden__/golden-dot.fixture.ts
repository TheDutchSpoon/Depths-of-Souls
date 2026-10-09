// Golden: the DoT lifecycle end-to-end -- a spell-applied status (VENOM_BOLT -> Poison),
// StatusApplied, three on-turn-end ticks in the BEARER's own turn (indirect damage from the applier's
// snapshot, 4.1-H2b2, credited to the living applier CASTER, no TriggerFired, each carrying
// `statusId: 'poison'` -- the causing status), and the win
// check right after the killing tick's turn-end hook pass (Phase 4.1-F2: ticks moved from the
// round-end sweep to the bearer's turn end; a mid-turn wipe ends the turn at once). The cast's own
// DamageDealt carries no statusId (it isn't status-caused). Re-derived in 4.1-F2 (was the Phase 3
// round-end sweep golden).
//
// Hand-derived (independent `node -e` calculator). CASTER casts venom-bolt on round 1 only (a
// custom script), then waits forever so poison is never refreshed. TARGET always-waits.
//
// TARGET's max HP is 100 but the golden needs TARGET to start the fight already wounded to 20, to keep the exact same 3-tick
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
//   Poison (duration 3), snapshot at application: potency 20% of the applier CASTER's effective
//   Attack (20, the makeParty default) = floor(floor(20) * 20 / 100) = 4; affinity vitality.
//   Each tick = indirect: 4 x 1.0 (vitality vs vitality) x 1 (no taken factors) - 0.2 x TARGET's
//   Defence 5 = 4 - 1 = 3 -> floor 3 (min 1 not reached). Same 3 as the pre-H2b2 percent-of-Health
//   tick, but now sourced from CASTER (alive) not TARGET.
//   Speeds: CASTER 20 acts before TARGET 10. The Poison lands in CASTER's turn, so for its bearer
//   it is NOT born this turn: it ticks and counts down at TARGET's own turn end, every round.
//     R1 TARGET turn end: tick 9 -> 6; cleanup d3 -> 2.
//     R2 TARGET turn end: tick 6 -> 3; cleanup d2 -> 1.
//     R3 TARGET turn end: tick 3 -> 0, TARGET dies. A side is wiped, so the turn ends at once:
//     TurnEnded, then FightEnded win. The countdown never runs (a corpse's statuses are inert,
//     ASSUMPTION 51), so there is NO StatusExpired -- the expiry-on-the-killing-tick coverage
//     moved to golden-f2-dot-one-turn.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { VENOM_BOLT } from '../../data/spells'
import { STATUS_REGISTRY } from '../../data/statuses'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import type { CombatEvent, FightResult } from '../types'
import type { Script } from '../scripting-types'
import { updateCreature } from '../creature-lookup'
import type { CombatState } from '../types'

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
  ...FIXTURE_SCRIPTS_BY_ID,
  [castOnceThenWait.id, castOnceThenWait],
])
export const statuses = STATUS_REGISTRY

function dotTick(remainingHp: number): CombatEvent {
  return {
    type: 'DamageDealt',
    sourceId: CASTER,
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
    duration: 3,
    sourceId: CASTER,
  },
  { type: 'TurnEnded', creatureId: CASTER },
  { type: 'TurnStarted', creatureId: TARGET },
  { type: 'Waited', creatureId: TARGET },
  dotTick(6),
  { type: 'TurnEnded', creatureId: TARGET },
  { type: 'RoundStarted', round: 2 },
  { type: 'TurnStarted', creatureId: CASTER },
  { type: 'Waited', creatureId: CASTER },
  { type: 'TurnEnded', creatureId: CASTER },
  { type: 'TurnStarted', creatureId: TARGET },
  { type: 'Waited', creatureId: TARGET },
  dotTick(3),
  { type: 'TurnEnded', creatureId: TARGET },
  { type: 'RoundStarted', round: 3 },
  { type: 'TurnStarted', creatureId: CASTER },
  { type: 'Waited', creatureId: CASTER },
  { type: 'TurnEnded', creatureId: CASTER },
  { type: 'TurnStarted', creatureId: TARGET },
  { type: 'Waited', creatureId: TARGET },
  dotTick(0),
  { type: 'CreatureDied', creatureId: TARGET },
  { type: 'TurnEnded', creatureId: TARGET },
  { type: 'FightEnded', result: 'win' },
]

export const expectedResult: FightResult = 'win'

/** Post-`createCombat` step (createCombat resets HP/statuses at fight setup); runs before the first
 * frozen turn (see test-utils/golden-runner.ts). */
export const setup = (created: CombatState): CombatState => {
  // createCombat resets currentHp to effective max at fight-start (GAME_DESIGN), so TARGET's
  // wounded starting HP has to be applied here, after creation -- see golden-dot.fixture.ts's
  // header comment.
  const initial = updateCreature(created, TARGET, { currentHp: TARGET_STARTING_HP })
  return initial
}
