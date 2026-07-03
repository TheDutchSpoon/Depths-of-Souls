import { createCreatureId } from '../engine/ids'
import type { Creature } from '../engine/types'

// Hardcoded demo fight data -- not real game content (species/creature data doesn't
// exist yet, see GAME_DESIGN.md §13), just enough to run the real engine and show its
// output. This file and CombatDemo.tsx are a throwaway harness; Phase 7 replaces them.

export const DEMO_SEED = 20260702

export const demoPlayerParty: Creature[] = [
  {
    id: createCreatureId('aldric'),
    side: 'player',
    slot: 0,
    baseStats: { health: 40, attack: 20, intelligence: 6, defence: 12, speed: 15 },
    affinity: 'body',
    currentHp: 40,
    alive: true,
    scriptId: null,
    equippedSpells: [],
    defending: false,
    provoking: false,
  },
  {
    id: createCreatureId('mira'),
    side: 'player',
    slot: 1,
    baseStats: { health: 28, attack: 14, intelligence: 22, defence: 8, speed: 18 },
    affinity: 'spirit',
    currentHp: 28,
    alive: true,
    scriptId: null,
    equippedSpells: [],
    defending: false,
    provoking: false,
  },
]

export const demoEnemyParty: Creature[] = [
  {
    id: createCreatureId('cave-goblin'),
    side: 'enemy',
    slot: 0,
    baseStats: { health: 22, attack: 12, intelligence: 4, defence: 6, speed: 10 },
    affinity: 'primal',
    currentHp: 22,
    alive: true,
    scriptId: null,
    equippedSpells: [],
    defending: false,
    provoking: false,
  },
  {
    id: createCreatureId('bog-rat'),
    side: 'enemy',
    slot: 1,
    baseStats: { health: 16, attack: 8, intelligence: 2, defence: 4, speed: 8 },
    affinity: 'void',
    currentHp: 16,
    alive: true,
    scriptId: null,
    equippedSpells: [],
    defending: false,
    provoking: false,
  },
]
