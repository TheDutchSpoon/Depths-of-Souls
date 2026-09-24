// Golden: Overgrowth's floor-10 boss, the Broodmother (species-locked.md's "Count-scales off
// living spiderling adds + periodically Webs the party") -- the real, shipped BROODMOTHER_TRAIT
// (Swarm Call) proving its `magnitudeSource: {kind:'count', of:'living-allies-of-species'}`
// count-scaling end to end against real content: 3 while every spiderling is alive, 2 the moment
// after one has died. This is the H1 "boss-encounter runner contract" golden that slice flagged
// as deferred (its own doc comment: "the boss-encounter RUNNER... is currently untested"),
// closed here by Slice I (PR #65 review).
//
// BROODMOTHER and two GENERIC adds (not the real Spider Weaver/Ambusher -- deliberately, mirroring
// golden-rot-sovereign's own precedent of a generic ADD: this golden's job is Swarm Call's count
// math, not Weaver's/Ambusher's own already-goldened mechanics) share speciesId 'spiders'
// (SPIDERS_SPECIES_ID), so `living-allies-of-species` counts all three together. Hand-derived
// (independent `node -e` calculator, verified via Bash for the mulberry32 replica below).
//
// Turn order (speed desc): BROODMOTHER(100) > STRIKER(50) > ADD1(10) > ADD2(5) -- STRIKER always
// acts second, after Broodmother's own attack for that round, before either add. Neutral affinity
// throughout: Broodmother/adds are 'wit', STRIKER is 'vitality' -- not adjacent in the cycle
// (Vitality>Violence>Wit>Endurance>Instinct>Vitality), so x1.0 everywhere, never a complication.
//
// Swarm Call fires on Broodmother's own on-attack, BEFORE her main hit lands (combat.ts's
// executeAttack: AttackDeclared -> fireHook('on-attack') -> dealDamage) -- targeting
// `triggering-source` (the creature she's attacking, since fireHook's `source` param for
// on-attack is the ATTACK's target, not the actor).
//
//   ROUND 1
//   BROODMOTHER's turn -> attacks STRIKER (lowest/only-HP player creature).
//     on-attack fires Swarm Call: living-allies-of-species(BROODMOTHER) = 3 (herself + ADD1 +
//     ADD2, all alive) -> spellPower = 0.25*3 = 0.75. offStat = getEffectiveStat(atk 24)*0.75 =
//     18. STRIKER def 0 -> core 18, chip 0.01*18=0.18, raw 18.18, affinity x1 -> final floor(18.18)
//     = 18. STRIKER 100-18 = 82.
//     Main attack: offStat = 24*1.0 = 24. core 24, chip 0.24, raw 24.24, final 24. STRIKER
//     82-24 = 58.
//   STRIKER's turn -> attacks lowest-HP enemy = ADD1 (health 10, lowest of {100,10,20}). offStat
//     = 50*1.0 = 50. ADD1 def 0 -> core 50, chip 0.5, raw 50.5, final floor(50.5)=50. ADD1
//     10-50 -> 0, dies.
//   ADD1's turn -> already dead (died on STRIKER's turn, above): an EMPTY TurnStarted/TurnEnded
//     bracket -- the documented skip signal for a dead-before-turn creature (combat.ts), no
//     action, no hooks.
//   ADD2's turn -> alive, scripted always-wait -> Waited. No damage, no RNG (no random selector
//     used by 'wait').
//
//   ROUND-END SWEEP (fires as part of the NEXT resolveTurn call, before Round 2 starts):
//   Swarm Call's OWN second trigger (on-round-end, chancePercent 40, apply Web to all-enemies =
//   STRIKER) rolls ONE `state.rng.next()` -- the fixture's only RNG draw anywhere. At SEED=7070,
//   an independent mulberry32 replica (below) gives the first draw as 0.854109511943534 (verified
//   via `node -e`), which is >= 0.4 -> the roll FAILS. Per resolution.ts: "a failed roll skips
//   silently, exactly like a false condition (no TriggerFired, no depth/truncation accounting)"
//   -- no event at all, Web never applies, nothing is ever Webbed in this whole fixture (so
//   rollWebBreakFree's own per-turn global check is a silent no-op at every turn-start,
//   "a board with no such bearer draws nothing").
//
//     node -e verification of the mulberry32 sequence at seed 7070 (rng.ts's own algorithm,
//     replicated independently):
//       function createSeededRng(seed) {
//         let state = seed >>> 0
//         return { next() {
//           state = (state + 0x6d2b79f5) | 0
//           let t = Math.imul(state ^ (state >>> 15), 1 | state)
//           t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
//           return ((t ^ (t >>> 14)) >>> 0) / 4294967296
//         } }
//       }
//       createSeededRng(7070).next() === 0.854109511943534  // >= 0.4 -> round-end roll fails
//
//   ROUND 2
//   BROODMOTHER's turn -> attacks STRIKER again (still her only living enemy).
//     on-attack fires Swarm Call again: living-allies-of-species(BROODMOTHER) = 2 now (herself +
//     ADD2 -- ADD1 died in round 1) -> spellPower = 0.25*2 = 0.5. offStat = 24*0.5 = 12. core 12,
//     chip 0.12, raw 12.12, final floor(12.12)=12. STRIKER 58-12 = 46.
//     Main attack: same as round 1 (no stat changes) -> offStat 24, core 24, chip 0.24, raw
//     24.24, final 24. STRIKER 46-24 = 22 (survives -- the golden stops here, mid-round-2, per
//     "keep it to the first couple of rounds").

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { BROODMOTHER_TRAIT, TRAIT_REGISTRY } from '../../data/traits'
import { SPIDERS_SPECIES_ID } from '../../data/species/overgrowth'
import { STATUS_REGISTRY } from '../../data/statuses'
import type { CombatEvent } from '../types'

export const SEED = 7070 // The round-end 40% Web roll's only draw; verified to FAIL (see header).

export const BROODMOTHER = createCreatureId('broodmother')
export const STRIKER = createCreatureId('striker')
export const ADD1 = createCreatureId('add1')
export const ADD2 = createCreatureId('add2')

export const playerParty = makeParty('player', [
  {
    id: 'striker',
    health: 100,
    attack: 50,
    defence: 0,
    speed: 50,
    affinity: 'vitality',
    scriptId: 'always-attack',
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'broodmother',
    health: 100,
    attack: 24,
    defence: 20,
    speed: 100,
    affinity: 'wit',
    scriptId: 'always-attack',
    innateTraitIds: [BROODMOTHER_TRAIT.id],
    speciesId: SPIDERS_SPECIES_ID,
  },
  {
    id: 'add1',
    health: 10,
    defence: 0,
    speed: 10,
    affinity: 'wit',
    scriptId: 'always-wait',
    speciesId: SPIDERS_SPECIES_ID,
  },
  {
    id: 'add2',
    health: 20,
    defence: 0,
    speed: 5,
    affinity: 'wit',
    scriptId: 'always-wait',
    speciesId: SPIDERS_SPECIES_ID,
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY
export const statuses = STATUS_REGISTRY

export const TURN_STEPS = 5 // Round 1's 4 turns (Broodmother/Striker/Add1-empty/Add2-wait) + the
// resolveTurn call that runs Round 1's end-sweep and then Round 2's Broodmother turn.

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },

  { type: 'TurnStarted', creatureId: BROODMOTHER },
  { type: 'AttackDeclared', attackerId: BROODMOTHER, targetId: STRIKER },
  {
    type: 'TriggerFired',
    sourceId: BROODMOTHER,
    hook: 'on-attack',
    effectId: 'broodmother-swarm-call',
  },
  {
    type: 'DamageDealt',
    sourceId: BROODMOTHER,
    targetId: STRIKER,
    rawDamage: 18.18,
    finalDamage: 18,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 82,
    damageSource: 'attack',
  },
  {
    type: 'DamageDealt',
    sourceId: BROODMOTHER,
    targetId: STRIKER,
    rawDamage: 24.24,
    finalDamage: 24,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 58,
    damageSource: 'attack',
  },
  { type: 'TurnEnded', creatureId: BROODMOTHER },

  { type: 'TurnStarted', creatureId: STRIKER },
  { type: 'AttackDeclared', attackerId: STRIKER, targetId: ADD1 },
  {
    type: 'DamageDealt',
    sourceId: STRIKER,
    targetId: ADD1,
    rawDamage: 50.5,
    finalDamage: 50,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
  },
  { type: 'CreatureDied', creatureId: ADD1 },
  { type: 'TurnEnded', creatureId: STRIKER },

  // ADD1 is already dead -- an empty bracket, the documented skip signal.
  { type: 'TurnStarted', creatureId: ADD1 },
  { type: 'TurnEnded', creatureId: ADD1 },

  { type: 'TurnStarted', creatureId: ADD2 },
  { type: 'Waited', creatureId: ADD2 },
  { type: 'TurnEnded', creatureId: ADD2 },

  // Round-end sweep: Swarm Call's 40% Web roll fails silently (no event at all -- see header).
  { type: 'RoundStarted', round: 2 },

  { type: 'TurnStarted', creatureId: BROODMOTHER },
  { type: 'AttackDeclared', attackerId: BROODMOTHER, targetId: STRIKER },
  {
    type: 'TriggerFired',
    sourceId: BROODMOTHER,
    hook: 'on-attack',
    effectId: 'broodmother-swarm-call',
  },
  {
    type: 'DamageDealt',
    sourceId: BROODMOTHER,
    targetId: STRIKER,
    rawDamage: 12.12,
    finalDamage: 12,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 46,
    damageSource: 'attack',
  },
  {
    type: 'DamageDealt',
    sourceId: BROODMOTHER,
    targetId: STRIKER,
    rawDamage: 24.24,
    finalDamage: 24,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 22,
    damageSource: 'attack',
  },
  { type: 'TurnEnded', creatureId: BROODMOTHER },
]
