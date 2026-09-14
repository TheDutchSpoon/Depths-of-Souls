// Phase 4 Slice G: pure run-layer reward/lookup helpers, kept separate from store.ts's Zustand
// shape/actions so the actual reward math is independently unit-testable and mirrors the
// engine's own file-per-concern convention (curves.ts / leveling.ts alongside combat.ts).

import type { BiomeData, SpeciesCreature } from '../engine/generation'
import { xpForNextLevel } from '../engine/leveling'
import type { InstanceId } from './ids'

// ---- Owned instances ----

export interface Instance {
  readonly id: InstanceId
  /** References a SpeciesCreature.id (a starter, the Unicorn, or a biome-spawnable creature).
   * A plain string -- ASSUMPTION 25 only pins branding for InstanceId itself; the brief's own
   * `Map<CreatureId, Instance[]>` collection shorthand is read as using "CreatureId" loosely for
   * this static id, NOT the engine's branded per-fight CreatureId (src/engine/ids.ts) -- see
   * store.ts's GameState.collection doc comment for the full disambiguation. */
  readonly creatureId: string
  readonly level: number
  readonly xp: number
}

/**
 * Applies a flat XP gain (banked once per descend() call, per CONVENTIONS "XP goes to the
 * whole active party regardless of survival") and resolves any resulting level-ups purely via
 * xpForNextLevel -- level-ups NEVER happen mid-fight (CONVENTIONS: "the engine never sees a
 * mid-fight level change"); this is the POST-fight application the run layer owns.
 */
export function applyXpGain(instance: Instance, xpGain: number): Instance {
  let level = instance.level
  let xp = instance.xp + xpGain
  while (xp >= xpForNextLevel(level)) {
    xp -= xpForNextLevel(level)
    level += 1
  }
  return { ...instance, level, xp }
}

// ---- Currencies ----
// GAME_DESIGN §4/§10: Essence (gems), Ore (equipment), Bricks (facilities, rarer), Lifeforce
// (leveling + fusion). Nothing spends them until Phase 8 (ASSUMPTION 26, the brief) -- tracked
// now, unbounded, no cap logic.

export interface Currencies {
  readonly essence: number
  readonly ore: number
  readonly bricks: number
  readonly lifeforce: number
}

export const ZERO_CURRENCIES: Currencies = { essence: 0, ore: 0, bricks: 0, lifeforce: 0 }

export function addCurrencies(a: Currencies, b: Currencies): Currencies {
  return {
    essence: a.essence + b.essence,
    ore: a.ore + b.ore,
    bricks: a.bricks + b.bricks,
    lifeforce: a.lifeforce + b.lifeforce,
  }
}

/**
 * Banks per KILL (per CreatureDied enemy) -- the same treatment as soul%/XP, per GAME_DESIGN §7
 * and CONVENTIONS both grouping soul%/XP/currency together as banking per kill-event, never
 * held pending the fight's outcome. Creature-INDEPENDENT (GAME_DESIGN §4's "global depth-scaled
 * drop table... independent of which specific creature was defeated" -- that clause scopes to
 * recipe drops, but the creature-independence itself still applies here: a flat per-kill amount,
 * unlike soul%, doesn't skew by rarity). A flat, floor-scaled placeholder; exact drop rates are
 * parked balance (GAME_DESIGN §13).
 */
export function currencyDropForKill(floor: number): Currencies {
  return {
    essence: floor,
    ore: floor,
    bricks: Math.max(1, Math.floor(floor / 10)), // "rarer" per GAME_DESIGN §4
    lifeforce: floor,
  }
}

// ---- Perk points ----
// GAME_DESIGN §9: "100 points per boss... perk points are NOT dropped -- derived, never stored."

export function perkPointsFor(bossesCleared: ReadonlySet<string>): number {
  return bossesCleared.size * 100
}

// ---- Static creature lookup ----
// Starters/the Unicorn live OUTSIDE any biome spawn pool (their own species sits below the
// >=3-creature minimum on purpose, per data/species/starters.ts's own header comment) -- a
// standalone list is checked before falling back to a scan of every biome's species pool.

export interface StaticCreatureRef {
  readonly speciesCreature: SpeciesCreature
  readonly speciesId: string
}

export function findStaticCreature(
  creatureId: string,
  standalone: readonly StaticCreatureRef[],
  biomes: readonly BiomeData[],
): StaticCreatureRef | undefined {
  for (const ref of standalone) {
    if (ref.speciesCreature.id === creatureId) return ref
  }
  for (const biome of biomes) {
    for (const species of biome.speciesPool) {
      const found = species.creatures.find((c) => c.id === creatureId)
      if (found) return { speciesCreature: found, speciesId: species.id }
    }
  }
  return undefined
}
