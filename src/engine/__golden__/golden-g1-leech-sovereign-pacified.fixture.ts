// Golden: a Pacified Leech Sovereign casts instead of waiting (Phase 4.1-G1, 6v6 boss floors and
// boss loadouts; CONVENTIONS "Role scripts"). Real content: the real LEECH_SOVEREIGN, on her real
// role script (`striker`, from `defaultScriptId`), holding one gem (Stinger Swarm: she is Instinct),
// Pacified by the real Pacify spell.
//
// Why it exists. Before G1 she fought alone on `always-attack` with no gem, so once Pacified she
// could only wait, and one creature casting Pacify every round switched off the whole enemy side.
// A role script that ends in "cast random gem", and a boss that holds a gem, turn a lock into a
// downgraded turn instead of an empty one.
//
// Setup. PACIFIER (player, Wit, speed 30) is the only player creature; it has Pacify in slot 0 and
// runs the fixture `always-cast` script. SOVEREIGN (enemy, level 1, so her stats are the species'
// own: Health 30, Attack 26, Intelligence 20, Defence 20, Speed 22) acts after it (22 < 30). The
// player's single creature has no allies, so every default target is PACIFIER.
//
// Round 1, PACIFIER's turn. `always-cast` casts slot 0, so no gem draw; Pacify is an enemy-side
// single-target spell, so the default target is the lowest-HP enemy, SOVEREIGN (the only one); no
// Confusion, Tunnel Vision or Provoke applies. StatusApplied: Pacified, 3 turns. It lands
// before SOVEREIGN's action slot, so it is already in force on her turn.
//
// Round 1, SOVEREIGN's turn. The `striker` rules, top first:
//   1. "any enemy below 80% HP -> Attack the lowest-HP enemy". PACIFIER is at 100/100: false.
//   2. "Attack a random enemy". The condition is `always`, but the action is illegal under
//      Pacified's `attack` lock. `checkLegality` is pure: it draws NOTHING, so this rule costs no
//      random draw even though its selector (`random-enemy`) is the one that would draw.
//   3. "Cast a random gem". Legal: she holds Stinger Swarm in slot 0, castable (single-target, a
//      living enemy). This rule wins.
// The ONE random draw of the whole fight happens in `resolveIntent` for rule 3: the gem draw over
// her castable slots, [0], is `floor(r * 1) = 0`, so slot 0 whatever r is. The gem's target is the
// side-aware default, the lowest-HP enemy (no draw, no Confusion, no Provoke). The fight therefore
// consumes exactly one draw (the test asserts it from the RNG bookmark).
//
// Damage. Stinger Swarm: `offStat 'cast'` reads Intelligence, spellPower 1.0: off = 20 * 1.0 = 20.
// PACIFIER's Defence is 0: core = max(20 - 0, 0) = 20, chip = 0.01 * 20 = 0.2, raw = 20.2.
// Affinity: Instinct vs Wit are not adjacent on the cycle (Vitality > Violence > Wit > Endurance >
// Instinct > Vitality), so x1.0. No dealt or taken modifiers. final = floor(20.2) = 20.
// A Cast is DIRECT damage, so the Additional (4.1-H2a) follows the floor: SOVEREIGN is a
// materialized level-1 creature, so the cap is 10 - (1 - 1) = 10; 20% of PACIFIER's max Health 100
// is 20; min(20, 10) = 10. finalDamage = 20 + 10 = 30 (rawDamage stays 20.2); PACIFIER 100 - 30 = 70.
//
// Vital Siphon (her trait, `on-attack`) does not fire: she cast, she did not attack, so no
// `AttackDeclared`, no `TriggerFired`, no steal. Her turn's end counts Pacified down from 3 to 2;
// the status was applied before her action slot, so it is not "born this turn" and counts. Nothing
// is logged for a countdown that does not expire.

import { makeParty } from '../__fixtures__/creatures'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import { createCreatureId } from '../ids'
import { materializeCreature } from '../generation'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { STATUS_REGISTRY } from '../../data/statuses'
import { TRAIT_REGISTRY } from '../../data/traits'
import { PACIFY, STINGER_SWARM } from '../../data/spells'
import { LEECH_SOVEREIGN } from '../../data/species/glimmerdark'
import type { CombatEvent } from '../types'

export const SEED = 4401

const PACIFIER = createCreatureId('pacifier')
const SOVEREIGN = createCreatureId('leech-sovereign-enemy-0')

export const playerParty = makeParty('player', [
  {
    id: 'pacifier',
    affinity: 'wit',
    health: 100,
    attack: 10,
    intelligence: 10,
    defence: 0,
    speed: 30,
    equippedSpells: [PACIFY, null, null],
    scriptId: 'always-cast',
  },
])

// No `scriptId` override: she runs her creature's own `defaultScriptId`, `striker`.
export const enemyParty = [
  materializeCreature(LEECH_SOVEREIGN, {
    level: 1,
    side: 'enemy',
    slot: 0,
    speciesId: LEECH_SOVEREIGN.id,
    gems: [STINGER_SWARM, null, null],
  }),
]

/** The shipped role scripts (hers) and the fixture `always-cast` (the pacifier's). */
export const scripts = new Map([...STOCK_SCRIPTS_BY_ID, ...FIXTURE_SCRIPTS_BY_ID])
export const traits = TRAIT_REGISTRY
export const statuses = STATUS_REGISTRY

// PACIFIER (casts Pacify), SOVEREIGN (Pacified: casts a gem instead of waiting).
export const TURN_STEPS = 2

/** The one random draw of the fight: SOVEREIGN's `cast random gem` over her single castable slot. */
export const EXPECTED_DRAWS = 1

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: PACIFIER },
  {
    type: 'SpellCast',
    targetShape: 'single',
    casterId: PACIFIER,
    gemSlot: 0,
    targetId: SOVEREIGN,
  },
  {
    type: 'StatusApplied',
    targetId: SOVEREIGN,
    statusId: 'pacified',
    duration: 3,
    sourceId: PACIFIER,
  },
  { type: 'TurnEnded', creatureId: PACIFIER },
  { type: 'TurnStarted', creatureId: SOVEREIGN },
  {
    type: 'SpellCast',
    targetShape: 'single',
    casterId: SOVEREIGN,
    gemSlot: 0,
    targetId: PACIFIER,
  },
  {
    type: 'DamageDealt',
    sourceId: SOVEREIGN,
    targetId: PACIFIER,
    rawDamage: 20.2,
    finalDamage: 30,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 70,
    damageSource: 'cast',
    statusId: undefined,
  },
  { type: 'TurnEnded', creatureId: SOVEREIGN },
]
