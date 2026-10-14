import { fightCount } from '../engine/curves'
import type { BalanceConfig } from '../engine/balance-types'
import { biomeForFloor, isBossFloor } from '../engine/generation'
import type { BiomeData } from '../engine/generation'
import type { BiomeId } from '../engine/ids'

/** The field takes any text. Only trimmed digits are a floor: `Number()` would read `""` as 0 and
 * `"0x10"` or `"1e1"` as real floors. Anything else is `NaN`, which `canDescend` refuses. */
export function parseFloorField(text: string): number {
  const trimmed = text.trim()
  return /^\d+$/.test(trimmed) ? Number(trimmed) : Number.NaN
}

/** Nothing has been fought while `lastFloor` is 0, so the field starts at 1. */
export function prefillFloor(lastFloor: number): number {
  return lastFloor >= 1 ? lastFloor : 1
}

export function deepestPlusOne(deepestFloor: number): number {
  return deepestFloor + 1
}

export interface FloorInfoContext {
  readonly atlasPins: ReadonlyMap<number, BiomeId>
  readonly runSeed: number
  readonly biomes: readonly BiomeData[]
  readonly config: BalanceConfig
}

export interface FloorInfo {
  readonly biomeName: string
  readonly fights: number
  readonly boss: boolean
}

/** Restates `generateFloor`'s branch, which the engine doesn't export: a boss floor is a tenth
 * floor whose resolved biome has a boss, with one fight; any other floor has `fightCount`. Null
 * unless the floor is a whole number >= 1: that guard keeps `biomeForFloor`, which throws below
 * floor 1 and on `NaN`, from being called with anything the field can hold. */
export function floorInfo(floor: number, ctx: FloorInfoContext): FloorInfo | null {
  if (!Number.isInteger(floor) || floor < 1) return null
  const biomeId = biomeForFloor(floor, ctx.biomes, ctx.atlasPins, ctx.runSeed)
  const biome = ctx.biomes.find((candidate) => candidate.id === biomeId)
  if (!biome) throw new Error(`floorInfo: no biome data for ${String(biomeId)}`)
  const boss = isBossFloor(floor) && biome.boss !== undefined
  return {
    biomeName: biome.name,
    fights: boss ? 1 : fightCount(floor, ctx.config),
    boss,
  }
}

export function floorInfoText(info: FloorInfo): string {
  const fights = `${info.fights} ${info.fights === 1 ? 'fight' : 'fights'}`
  return info.boss
    ? `${info.biomeName}: boss floor, ${fights}`
    : `${info.biomeName}: ${fights}`
}
