import { makeParty } from '../__fixtures__/creatures'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import { AOE_VIOLENCE_SPELL, SINGLE_VIOLENCE_SPELL } from '../__fixtures__/spells'
import { createCreatureId } from '../ids'
import type { CreatureId } from '../ids'
import type { CombatEvent, FightResult } from '../types'

// GENERATED then CHECKPOINT-VERIFIED -- an integration/regression golden per
// `CONVENTIONS.md#two-tier-golden-discipline` two-tier golden discipline. Per-mechanism correctness rests on the five
// focused hand-derived goldens (golden-scripted-1v1, golden-aoe-cast,
// golden-provoke-redirect, golden-random-selector, golden-skip-on-invalid), not on this
// fixture. This fixture only checkpoints structural properties of one real run (round-1
// turn order, per-event-type counts, final result, and a handful of spot-checked
// DamageDealt values) -- it does NOT assert a full deep-equal of the ~670-event log.

export const SEED = 6006

// The five `always-*` fixture scripts (__fixtures__/scripts.ts) -- this is the "mixed stock
// scripts both sides" integration scenario ROADMAP.md calls for.
export const scripts = FIXTURE_SCRIPTS_BY_ID

const PLAYER_BASE = {
  attack: 15,
  intelligence: 25,
  defence: 8,
  health: 30,
  affinity: 'vitality',
} as const
const ENEMY_BASE = {
  attack: 15,
  intelligence: 25,
  defence: 8,
  health: 30,
  affinity: 'vitality',
} as const

export const playerParty = makeParty('player', [
  { id: 'p0', speed: 60, scriptId: 'always-attack', ...PLAYER_BASE },
  {
    id: 'p1',
    speed: 55,
    scriptId: 'always-cast',
    equippedSpells: [SINGLE_VIOLENCE_SPELL],
    ...PLAYER_BASE,
  },
  { id: 'p2', speed: 50, scriptId: 'always-defend', ...PLAYER_BASE },
  { id: 'p3', speed: 45, scriptId: 'always-provoke', ...PLAYER_BASE },
  { id: 'p4', speed: 40, scriptId: 'always-wait', ...PLAYER_BASE },
  { id: 'p5', speed: 35, scriptId: 'always-attack', ...PLAYER_BASE },
])

export const enemyParty = makeParty('enemy', [
  { id: 'e0', speed: 58, scriptId: 'always-attack', ...ENEMY_BASE },
  {
    id: 'e1',
    speed: 53,
    scriptId: 'always-cast',
    equippedSpells: [AOE_VIOLENCE_SPELL],
    ...ENEMY_BASE,
  },
  { id: 'e2', speed: 48, scriptId: 'always-defend', ...ENEMY_BASE },
  { id: 'e3', speed: 43, scriptId: 'always-provoke', ...ENEMY_BASE },
  { id: 'e4', speed: 38, scriptId: 'always-wait', ...ENEMY_BASE },
  { id: 'e5', speed: 33, scriptId: 'always-attack', ...ENEMY_BASE },
])

// --- Checkpoints, captured from one real run at SEED 6006 (see the label above) ---

export const expectedResult: FightResult = 'loss'
export const expectedRoundCount = 28

/** Speed order (desc): 60,58,55,53,50,48,45,43,40,38,35,33 -- no ties, so a plain interleave. */
export const expectedRound1TurnOrder: readonly CreatureId[] = [
  'p0',
  'e0',
  'p1',
  'e1',
  'p2',
  'e2',
  'p3',
  'e3',
  'p4',
  'e4',
  'p5',
  'e5',
].map(createCreatureId)

/** Per-event-type counts across the full ~28-round fight. Sparse: only the event types that
 * actually occur are keys (event types this fight never fires are absent),
 * matching how the test tallies actual events. */
export const expectedEventTypeCounts: Partial<Record<CombatEvent['type'], number>> = {
  FightStarted: 1,
  RoundStarted: 28,
  TurnStarted: 173,
  TurnEnded: 173,
  AttackDeclared: 64,
  SpellCast: 14,
  Defended: 41,
  Provoked: 4,
  Waited: 50,
  // turn-start cleanup unconditionally emits ActionStateEnded
  // whenever a Defend/Provoke flag actually expires -- one per Defended/Provoked action whose
  // bearer survives to reach its own next turn (fewer than the 45 total Defended+Provoked here,
  // since a creature that dies before its own next turn never gets another turn-start cleanup to
  // close its flag out).
  // TurnStarted/TurnEnded: 173 = the 176 queue slots over the 28 rounds minus the 3 that come up
  // dead (a dead slot gets no bracket). No other count depends on a dead slot, so the other counts,
  // the result, the round count, the round-1 turn order, the spot checks and the redirects hold.
  ActionStateEnded: 41,
  DamageDealt: 102,
  CreatureDied: 11,
  FightEnded: 1,
}

/**
 * Spot-checked DamageDealt values, in order of first appearance. p0 vs e0 (Attack):
 * core=max(15-8,0)=7, chip=0.15, raw=7.15, final=7. p1's single Cast on e0 (SINGLE_VIOLENCE_SPELL,
 * spellPower 0.5): offStat=25*0.5=12.5, core=max(12.5-8,0)=4.5, chip=0.125, raw=4.625,
 * final=4. e1's AOE Cast (AOE_VIOLENCE_SPELL, spellPower 0.3) hits every living player: each hit
 * offStat=25*0.3=7.5, core=max(7.5-8,0)=0 (chip-only), chip=0.075, raw=0.075, final=1.
 */
export const expectedSpotCheckDamage: readonly CombatEvent[] = [
  {
    type: 'DamageDealt',
    sourceId: createCreatureId('p0'),
    targetId: createCreatureId('e0'),
    rawDamage: 7.15,
    finalDamage: 7,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 23,
    damageSource: 'attack',
  },
  {
    type: 'DamageDealt',
    sourceId: createCreatureId('p1'),
    targetId: createCreatureId('e0'),
    rawDamage: 4.625,
    finalDamage: 4,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 19,
    damageSource: 'cast',
  },
  {
    type: 'DamageDealt',
    sourceId: createCreatureId('e1'),
    targetId: createCreatureId('p0'),
    rawDamage: 0.075,
    finalDamage: 1,
    affinityMultiplier: 1,
    wasChipOnly: true,
    remainingHp: 22,
    damageSource: 'cast',
  },
]

/**
 * Confirms real Provoke redirects occurred on both sides: p3/e3 are the sole provokers
 * on their respective sides, so any AttackDeclared targeting them proves an
 * always-attack rule's natural lowest-hp-enemy selector was overridden.
 */
export const expectedProvokeRedirects: readonly {
  attackerId: CreatureId
  targetId: CreatureId
}[] = [
  { attackerId: createCreatureId('p5'), targetId: createCreatureId('e3') },
  { attackerId: createCreatureId('e5'), targetId: createCreatureId('p3') },
  { attackerId: createCreatureId('p0'), targetId: createCreatureId('e3') },
  { attackerId: createCreatureId('e0'), targetId: createCreatureId('p3') },
]
