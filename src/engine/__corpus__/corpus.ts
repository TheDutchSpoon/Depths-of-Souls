// Phase 4.1-C2a (PR #71 review): the test-only corpus builder behind the behaviour-tripwire
// digest (`corpus-digest.fixture.ts` / `corpus-digest.test.ts`). Pinned exactly per the review's
// own spec -- do not reshape without regenerating the digest in a deliberate-change PR.
//
// This module imports `src/data`, exactly like `__golden__` fixtures do. Engine SOURCE must
// never import it (it lives outside `src/engine`'s own files, in a leaf-only, test-facing
// directory) -- `src/engine` stays pure per CONVENTIONS' "engine purity" rule. It sits outside
// `__golden__/` on purpose, so `frozen-replay-sweep.test.ts`'s fixture glob doesn't pick it up.

import { generateFloor, materializeCreature } from '../generation'
import { createSeededRng } from '../rng'
import { createCreatureId } from '../ids'
import { BIOMES } from '../../data/biomes'
import { ALL_SPELLS } from '../../data/spells'
import { DEFAULT_BALANCE_CONFIG } from '../../data/balance'
import {
  BRUTE_STARTER,
  BRUTE_STARTER_SPECIES_ID,
  SHIELDBARER_STARTER,
  SHIELDBARER_STARTER_SPECIES_ID,
  SORCERER_STARTER,
  SORCERER_STARTER_SPECIES_ID,
  UNICORN,
  UNICORN_SPECIES_ID,
} from '../../data/species/starters'
import { RESONANT_OVERTONE, RESONANTS_SPECIES_ID } from '../../data/species/glimmerdark'
import { HOLLOWKIN_SPECIES_ID, HOLLOWKIN_WRETCH } from '../../data/species/rotcap-hollow'
import type { Creature } from '../types'

export interface CorpusFight {
  readonly seed: number
  readonly player: readonly Creature[]
  readonly enemy: readonly Creature[]
}

/** `gen(floor, seed)`, per the review's own spec: `b = floor((floor-1)/10)`, one generated
 * floor's `[0].enemyParty`. Every corpus floor reference stays within floors 1-30 (biomes 1-3,
 * the only biomes with real content), so `BIOMES[b]` is always defined here. */
function gen(floor: number, seed: number): readonly Creature[] {
  const b = Math.floor((floor - 1) / 10)
  const biome = BIOMES[b]
  if (!biome) {
    throw new Error(`corpus: no biome at index ${b} for floor ${floor}`)
  }
  const [fight] = generateFloor(
    floor,
    biome,
    b + 1,
    ALL_SPELLS,
    createSeededRng(seed),
    DEFAULT_BALANCE_CONFIG,
  )
  if (!fight) {
    throw new Error(
      `corpus: generateFloor produced no fight for floor ${floor}, seed ${seed}`,
    )
  }
  return fight.enemyParty
}

/** Part A's own player-side re-siding: an enemy-generated party, flipped to the player side with
 * its ids rewritten (`-enemy-` -> `-player-`) so they don't collide with the real enemy party's
 * own ids in the same fight. */
function reSideToPlayer(party: readonly Creature[]): Creature[] {
  return party.map((c) => ({
    ...c,
    side: 'player' as const,
    id: createCreatureId((c.id as string).replace('-enemy-', '-player-')),
  }))
}

function buildPartA(i: number): CorpusFight {
  const enemy = gen(1 + (i % 30), 10000 + i)
  const player = reSideToPlayer(gen(1 + ((i * 7 + 3) % 30), 20000 + i))
  return { seed: i, player, enemy }
}

function withShieldbarerAtSlot0(party: readonly Creature[], level: number): Creature[] {
  return [
    materializeCreature(SHIELDBARER_STARTER, {
      level,
      side: 'enemy',
      slot: 0,
      speciesId: SHIELDBARER_STARTER_SPECIES_ID,
    }),
    ...party.slice(1),
  ]
}

/** Slot 1: replacing it if the party already has one, appending it (as the new slot 1) if the
 * party had only one creature -- per the review's own spec. */
function withWretchAtSlot1(party: readonly Creature[], level: number): Creature[] {
  const wretch = materializeCreature(HOLLOWKIN_WRETCH, {
    level,
    side: 'enemy',
    slot: 1,
    speciesId: HOLLOWKIN_SPECIES_ID,
  })
  if (party.length === 1) return [...party, wretch]
  return [party[0]!, wretch, ...party.slice(2)]
}

function buildPartB(i: number): CorpusFight {
  const level = 1 + (i % 25)
  const player: Creature[] = [
    materializeCreature(SORCERER_STARTER, {
      level,
      side: 'player',
      slot: 0,
      speciesId: SORCERER_STARTER_SPECIES_ID,
    }),
    materializeCreature(BRUTE_STARTER, {
      level,
      side: 'player',
      slot: 1,
      speciesId: BRUTE_STARTER_SPECIES_ID,
    }),
    materializeCreature(SHIELDBARER_STARTER, {
      level,
      side: 'player',
      slot: 2,
      speciesId: SHIELDBARER_STARTER_SPECIES_ID,
    }),
    materializeCreature(UNICORN, {
      level,
      side: 'player',
      slot: 3,
      speciesId: UNICORN_SPECIES_ID,
    }),
  ]
  if (i % 2 === 1) {
    player.push(
      materializeCreature(RESONANT_OVERTONE, {
        level,
        side: 'player',
        slot: 4,
        speciesId: RESONANTS_SPECIES_ID,
      }),
    )
  }

  const generated = gen(1 + (i % 30), 30000 + i)
  const first = generated[0]
  if (!first) throw new Error(`corpus: generated enemy party empty for i=${i}`)
  const lvl = first.origin.level

  let enemy = generated
  switch (i % 4) {
    case 0:
      enemy = withShieldbarerAtSlot0(enemy, lvl)
      break
    case 1:
      enemy = withWretchAtSlot1(enemy, lvl)
      break
    case 2:
      enemy = withWretchAtSlot1(withShieldbarerAtSlot0(enemy, lvl), lvl)
      break
    case 3:
      break
    default:
      throw new Error(`corpus: unreachable i % 4 = ${i % 4}`)
  }

  return { seed: 1000 + i, player, enemy }
}

/** The ordered list of fights the digest hashes -- Part A (300 generated fights) then Part B
 * (200 fights with the shipped player creatures), exactly per the review's own spec. */
export function buildCorpus(): readonly CorpusFight[] {
  const partA = Array.from({ length: 300 }, (_, i) => buildPartA(i))
  const partB = Array.from({ length: 200 }, (_, i) => buildPartB(i))
  return [...partA, ...partB]
}
