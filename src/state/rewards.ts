// Pure run-layer reward/lookup helpers, kept separate from store.ts's Zustand
// shape/actions so the actual reward math is independently unit-testable and mirrors the
// engine's own file-per-concern convention (curves.ts / leveling.ts alongside combat.ts).

import type { BalanceConfig } from '../engine/balance-types'
import type { BiomeData, SpeciesCreature } from '../engine/generation'
import { xpAwardForKill, xpForNextLevel } from '../engine/leveling'
import type { Creature } from '../engine/types'
import type { InstanceId } from './ids'

// ---- Owned instances ----

/** An Instance's recipe. Only `kind: 'creature'` is produced --
 * materializing from a `kind: 'fusion'` source throws (`spec/creatures.md#fusion`); the variant exists only so
 * save v1 never needs reshaping once fusion lands. */
export type InstanceSource =
  | { readonly kind: 'creature'; readonly creatureId: string }
  | {
      readonly kind: 'fusion'
      readonly identityParent: string
      readonly affinityParent: string
    }

export interface Instance {
  /** Opaque (`'inst-<n>'`, from the store's ordinal counter) -- NEVER embeds the creature id
   * (`spec/creatures.md#instance`). */
  readonly id: InstanceId
  readonly source: InstanceSource
  readonly level: number
  readonly xp: number
  /** `null` = "use the creature's default (role) script", resolved at materialization.
   * Nothing sets this non-null yet (no script assignment), but the
   * plumbing through `materializeCreature` is real. */
  readonly scriptId: string | null
  /** The gem set rolled ONCE when the instance was created (starter
   * grant, Unicorn, summon), as spell ids, slot-positional -- one entry per regular gem slot (3),
   * `null` for an empty slot. Resolved to `Spell`s through `deps.allSpells` when the party is
   * materialized (an unknown id throws). Equipping replaces the roll
   * (`spec/creatures.md#gems-as-items`). */
  readonly gems: readonly (string | null)[]
}

/** Resolves an Instance's static creature id from its `source`. Throws on a `fusion` source
 * -- deriving a fused creature is not built yet (`spec/creatures.md#fusion`); the variant exists only so the
 * save shape never needs reshaping once it lands. */
export function staticCreatureIdFor(instance: Instance): string {
  switch (instance.source.kind) {
    case 'creature':
      return instance.source.creatureId
    case 'fusion':
      throw new Error('staticCreatureIdFor: a fused instance has no static creature id')
  }
}

/**
 * Applies a flat XP gain (banked once per descend() call) and resolves any resulting level-ups
 * purely via xpForNextLevel -- level-ups NEVER happen mid-fight (`spec/run.md#rewards`); this is
 * the POST-fight application the run layer owns.
 */
export function applyXpGain(
  instance: Instance,
  xpGain: number,
  config: BalanceConfig,
): Instance {
  let level = instance.level
  let xp = instance.xp + xpGain
  while (xp >= xpForNextLevel(level, config)) {
    xp -= xpForNextLevel(level, config)
    level += 1
  }
  return { ...instance, level, xp }
}

// ---- Currencies ----
// `spec/run.md#currencies`: Essence (gems), Ore (equipment), Bricks (facilities, rarer), Lifeforce
// (leveling + fusion). Nothing spends them yet (`spec/run.md#facilities`) -- tracked
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
 * Banks per KILL (per CreatureDied enemy) -- the same treatment as soul%/XP, per `spec/combat.md#encounters-rewards--wipes`
 * and `spec/run.md#rewards` both grouping soul%/XP/currency together as banking per kill-event, never
 * held pending the fight's outcome. Creature-INDEPENDENT (`spec/run.md#currencies`: scaled by
 * depth): a flat per-kill amount, unlike soul%, doesn't skew by rarity. A flat, floor-scaled
 * placeholder; exact drop rates are
 * parked balance (`OPEN_QUESTIONS.md#drops-and-costs`). Parameterized by BalanceConfig.
 */
export function currencyDropForKill(floor: number, config: BalanceConfig): Currencies {
  return {
    essence: floor * config.currencyPerFloor,
    ore: floor * config.currencyPerFloor,
    bricks: Math.max(
      config.bricksMinimum,
      Math.floor(floor / 10) * config.bricksPerTenFloors,
    ), // "rarer" per `spec/run.md#currencies`
    lifeforce: floor * config.currencyPerFloor,
  }
}

// ---- Perk points ----
// `spec/progression.md#perk-points`: 100 points per first-cleared boss, derived, never stored.

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

// ---- Per-kill reward resolution ----

export interface KillReward {
  /** `deadEnemy.origin.templateId` -- the key `descend()`'s own `soulGained` map banks under. */
  readonly staticId: string
  readonly staticRef: StaticCreatureRef
  readonly soulGainPercent: number
  readonly xpAwarded: number
}

/**
 * The ordinary (non-boss) per-kill reward lookup, its own
 * pure, independently-testable function, so the "reads origin, not a parsed id suffix"
 * claim is testable without a full descend() run. Resolves via
 * `deadEnemy.origin.templateId` (raw data) -- never the
 * per-fight CreatureId. Boss handling stays in `descend()` (bosses aren't spawn-pool-drawn, so
 * there's no static entry to find and no soul% to bank).
 */
export function resolveKillReward(
  deadEnemy: Creature,
  standalone: readonly StaticCreatureRef[],
  biomes: readonly BiomeData[],
  config: BalanceConfig,
): KillReward {
  const staticId = deadEnemy.origin.templateId
  const staticRef = findStaticCreature(staticId, standalone, biomes)
  if (!staticRef) {
    // Every generated enemy is derived from static data by construction (generateFloor only
    // ever materializes creatures out of the biomes' own species pools) -- a miss here means
    // origin.templateId and the static registries have drifted apart. Not a normal skip: fail
    // loud rather than silently dropping rewards.
    throw new Error(
      `resolveKillReward: ${deadEnemy.id} has no resolvable static creature ` +
        `(origin.templateId: ${staticId})`,
    )
  }
  return {
    staticId,
    staticRef,
    soulGainPercent: config.soulGainPercent[staticRef.speciesCreature.rarity],
    xpAwarded: xpAwardForKill(deadEnemy.origin.level, config),
  }
}
