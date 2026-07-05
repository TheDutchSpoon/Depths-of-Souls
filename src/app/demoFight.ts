import { createCreatureId } from '../engine/ids'
import type { Creature } from '../engine/types'
import type { Script } from '../engine/scripting-types'
import type { Trait } from '../engine/effect-types'
import { STOCK_SCRIPTS_BY_ID } from '../data/scripts'
import { CINDER_NOVA, VENOM_BOLT } from '../data/spells'
import { STATUS_REGISTRY } from '../data/statuses'
import {
  TRAIT_REGISTRY,
  RETALIATE,
  VENGEFUL,
  REELING,
  GRUDGE,
  CATASTROPHIC_COLLAPSE,
} from '../data/traits'

// Hardcoded demo fight data -- not real game content (species/creature data doesn't
// exist yet, see GAME_DESIGN.md §13), just enough to run the real engine and show its
// output. This file and CombatDemo.tsx are a throwaway harness; Phase 7 replaces them.
// Successor to the Phase 2.5 harness: Phase 3.5 wires real trait/status/spell content
// (src/data/traits.ts, src/data/statuses.ts, src/data/spells.ts) onto the same scripted
// parties so triggers, DoT, stun, and stat-modifier statuses actually fire in the log.

export const DEMO_SEED = 20260702

// Real shipped stock scripts, not demo-only scripts -- see src/data/scripts.ts.
export const demoScripts: ReadonlyMap<string, Script> = STOCK_SCRIPTS_BY_ID

// Real shipped statuses -- see src/data/statuses.ts. Needed so poison/stun/weaken/regen
// resolve when a trait or spell applies them.
export const demoStatuses = STATUS_REGISTRY

// Demo-only trait: NOT part of the shipped src/data/traits.ts roster, clearly scoped here
// like the demo parties themselves. Grants self Regen whenever hit, so a HealApplied event
// arises naturally in-fight (per the Phase 3.5 brief's recommendation) rather than being
// seeded. Merged into a demo-scoped trait registry below, never touching real content.
const DEMO_ONLY_REGEN_ON_HIT: Trait = {
  id: 'demo-regen-on-hit',
  name: '(Demo) Regen on Hit',
  effects: [
    {
      category: 'triggered',
      hook: 'on-damage-taken',
      response: {
        kind: 'apply-status',
        target: { kind: 'self' },
        status: { statusId: 'regen', duration: 3 },
      },
    },
  ],
}

// Demo-scoped trait registry: the real STOCK_TRAITS plus the one throwaway demo trait above.
export const demoTraits: ReadonlyMap<string, Trait> = new Map([
  ...TRAIT_REGISTRY,
  [DEMO_ONLY_REGEN_ON_HIT.id, DEMO_ONLY_REGEN_ON_HIT],
])

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
    innateTraitIds: [],
    activeEffects: [],
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
    // Slot 0 holds Venom Bolt so always-cast applies poison (a real appliesStatus spell).
    equippedSpells: [VENOM_BOLT],
    defending: false,
    provoking: false,
    innateTraitIds: [],
    activeEffects: [],
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
    // Durable front-liner: strikes back for 30% Attack whenever hit, and regenerates from
    // the demo-only regen-on-hit trait (kept off liora below so Vengeful can actually dip
    // below 50% HP instead of being topped back up every round).
    innateTraitIds: [RETALIATE.id, DEMO_ONLY_REGEN_ON_HIT.id],
    activeEffects: [],
  },
  {
    id: createCreatureId('liora'),
    side: 'player',
    slot: 3,
    baseStats: { health: 35, attack: 12, intelligence: 8, defence: 7, speed: 22 },
    affinity: 'void',
    currentHp: 35,
    alive: true,
    scriptId: 'always-provoke',
    equippedSpells: [],
    defending: false,
    provoking: false,
    // The provoking tank: draws fire and stays silent until wounded, then retaliates once
    // below half HP -- the read-time condition made visible (Vengeful).
    innateTraitIds: [VENGEFUL.id],
    activeEffects: [],
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
    // Reeling: stunned for 1 round whenever hit -- shows a suppressed, empty-bracket turn.
    innateTraitIds: [REELING.id],
    activeEffects: [],
  },
]

export const demoEnemyParty: Creature[] = [
  {
    id: createCreatureId('cave-goblin'),
    side: 'enemy',
    slot: 0,
    baseStats: { health: 22, attack: 17, intelligence: 4, defence: 6, speed: 12 },
    affinity: 'primal',
    currentHp: 22,
    alive: true,
    scriptId: 'always-attack',
    equippedSpells: [],
    defending: false,
    provoking: false,
    innateTraitIds: [],
    activeEffects: [],
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
    innateTraitIds: [],
    activeEffects: [],
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
    innateTraitIds: [],
    activeEffects: [],
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
    // When an ally dies (the self-destructing sleepy-slime below), permanently +50% Attack.
    innateTraitIds: [GRUDGE.id],
    activeEffects: [],
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
    // Self-destructs at round-end (999 self damage), applying Weaken to its lowest-HP ally
    // on death -- the real-content showcase for the damage-modifier status category.
    innateTraitIds: [CATASTROPHIC_COLLAPSE.id],
    activeEffects: [],
  },
]
