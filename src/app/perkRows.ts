import { resolvePerkEffects } from '../data/specializations'
import type { PerkDef, Specialization } from '../data/specializations'
import type { GameActions, SetPerkLevelResult } from '../state/store'
import { parseFloorField } from './floorPicker'

export const INACTIVE_LABEL = "inactive (its system isn't built yet)"

/** A perk whose max-level effects are empty has no engine system behind it yet
 * (`spec/progression.md#inert-perks`). */
export function isInactivePerk(perk: PerkDef): boolean {
  return resolvePerkEffects(perk, perk.maxLevel).length === 0
}

export interface PerkRow {
  readonly id: string
  readonly name: string
  /** Read from `perkSpend`, never from a field draft; a perk absent from it is at 0. */
  readonly level: number
  readonly maxLevel: number
  readonly costPerLevel: number
  readonly inactive: boolean
}

/** In the spec's data order. */
export function perkRows(
  spec: Specialization,
  perkSpend: ReadonlyMap<string, number>,
): PerkRow[] {
  return spec.perks.map((perk) => ({
    id: perk.id,
    name: perk.name,
    level: perkSpend.get(perk.id) ?? 0,
    maxLevel: perk.maxLevel,
    costPerLevel: perk.costPerLevel,
    inactive: isInactivePerk(perk),
  }))
}

/** The level field takes what a whole-number field takes (`parseFloorField`); anything else is
 * `NaN`, which the store refuses as `invalid-level`. */
export function parsePerkLevelField(text: string): number {
  return parseFloorField(text)
}

export function checkPerkField(
  store: Pick<GameActions, 'canSetPerkLevel'>,
  perkId: string,
  text: string,
): SetPerkLevelResult {
  return store.canSetPerkLevel(perkId, parsePerkLevelField(text))
}

export function setPerkFromField(
  store: Pick<GameActions, 'setPerkLevel'>,
  perkId: string,
  text: string,
): SetPerkLevelResult {
  return store.setPerkLevel(perkId, parsePerkLevelField(text))
}
