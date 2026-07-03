import { createCreatureId } from '../engine/ids'
import type { Creature } from '../engine/types'
import type { Script } from '../engine/scripting-types'
import { STOCK_SCRIPTS_BY_ID } from '../data/scripts'
import { CINDER_NOVA } from '../data/spells'

// Hardcoded demo fight data -- not real game content (species/creature data doesn't
// exist yet, see GAME_DESIGN.md §13), just enough to run the real engine and show its
// output. This file and CombatDemo.tsx are a throwaway harness; Phase 7 replaces them.
// Successor to the Phase 1.5 harness: both sides now run real scripts (the five stock
// scripts from src/data/scripts.ts) through the Phase 2 interpreter instead of a single
// hardcoded Attack.

export const DEMO_SEED = 20260702

// Real shipped stock scripts, not demo-only scripts -- see src/data/scripts.ts.
export const demoScripts: ReadonlyMap<string, Script> = STOCK_SCRIPTS_BY_ID

export const demoPlayerParty: Creature[] = [
  {
    id: createCreatureId('aldric'),
    side: 'player',
    slot: 0,
    baseStats: { health: 40, attack: 22, intelligence: 6, defence: 12, speed: 18 },
    affinity: 'body',
    currentHp: 40,
    alive: true,
    scriptId: 'always-attack',
    equippedSpells: [],
    defending: false,
    provoking: false,
  },
  {
    id: createCreatureId('mira'),
    side: 'player',
    slot: 1,
    baseStats: { health: 28, attack: 10, intelligence: 32, defence: 8, speed: 20 },
    affinity: 'spirit',
    currentHp: 28,
    alive: true,
    scriptId: 'always-cast',
    // Slot 0 holds Cinder Nova (AOE, 30% Intelligence) so always-cast fires it for real.
    equippedSpells: [CINDER_NOVA],
    defending: false,
    provoking: false,
  },
  {
    id: createCreatureId('tomas'),
    side: 'player',
    slot: 2,
    baseStats: { health: 50, attack: 14, intelligence: 5, defence: 16, speed: 10 },
    affinity: 'primal',
    currentHp: 50,
    alive: true,
    scriptId: 'always-defend',
    equippedSpells: [],
    defending: false,
    provoking: false,
  },
  {
    id: createCreatureId('liora'),
    side: 'player',
    slot: 3,
    baseStats: { health: 35, attack: 12, intelligence: 8, defence: 14, speed: 22 },
    affinity: 'void',
    currentHp: 35,
    alive: true,
    scriptId: 'always-provoke',
    equippedSpells: [],
    defending: false,
    provoking: false,
  },
  {
    id: createCreatureId('wendel'),
    side: 'player',
    slot: 4,
    baseStats: { health: 24, attack: 9, intelligence: 10, defence: 9, speed: 6 },
    affinity: 'mind',
    currentHp: 24,
    alive: true,
    scriptId: 'always-wait',
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
    baseStats: { health: 22, attack: 12, intelligence: 4, defence: 6, speed: 12 },
    affinity: 'primal',
    currentHp: 22,
    alive: true,
    scriptId: 'always-attack',
    equippedSpells: [],
    defending: false,
    provoking: false,
  },
  {
    id: createCreatureId('bog-witch'),
    side: 'enemy',
    slot: 1,
    baseStats: { health: 26, attack: 8, intelligence: 28, defence: 7, speed: 16 },
    affinity: 'void',
    currentHp: 26,
    alive: true,
    scriptId: 'always-cast',
    equippedSpells: [CINDER_NOVA],
    defending: false,
    provoking: false,
  },
  {
    id: createCreatureId('stone-troll'),
    side: 'enemy',
    slot: 2,
    baseStats: { health: 45, attack: 16, intelligence: 3, defence: 14, speed: 7 },
    affinity: 'body',
    currentHp: 45,
    alive: true,
    scriptId: 'always-defend',
    equippedSpells: [],
    defending: false,
    provoking: false,
  },
  {
    id: createCreatureId('alpha-wolf'),
    side: 'enemy',
    slot: 3,
    baseStats: { health: 30, attack: 15, intelligence: 5, defence: 8, speed: 24 },
    affinity: 'mind',
    currentHp: 30,
    alive: true,
    scriptId: 'always-provoke',
    equippedSpells: [],
    defending: false,
    provoking: false,
  },
  {
    id: createCreatureId('sleepy-slime'),
    side: 'enemy',
    slot: 4,
    baseStats: { health: 18, attack: 5, intelligence: 4, defence: 5, speed: 3 },
    affinity: 'spirit',
    currentHp: 18,
    alive: true,
    scriptId: 'always-wait',
    equippedSpells: [],
    defending: false,
    provoking: false,
  },
]
