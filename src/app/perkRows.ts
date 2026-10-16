import {
  isFunctionalPerk,
  perkDescription,
  SPECIALIZATIONS_BY_ID,
} from '../data/specializations'
import type { Specialization } from '../data/specializations'
import type { GameActions, SetPerkLevelResult } from '../state/store'
import { parseFloorField } from './floorPicker'

export const INACTIVE_LABEL = "inactive (its system isn't built yet)"

/** The chosen specialization, `null` while none is chosen. An id the data doesn't hold throws:
 * the store only holds ids `setSpec` accepted, so an unknown one is a drift to surface. */
export function chosenSpecialization(chosenSpec: string | null): Specialization | null {
  if (chosenSpec === null) return null
  const spec = SPECIALIZATIONS_BY_ID.get(chosenSpec)
  if (spec === undefined) {
    throw new Error(`chosenSpecialization: unknown specialization ${chosenSpec}`)
  }
  return spec
}

export interface PerkRow {
  readonly id: string
  readonly name: string
  /** Shown for every perk, an inactive one included. */
  readonly description: string
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
    description: perkDescription(perk.id),
    level: perkSpend.get(perk.id) ?? 0,
    maxLevel: perk.maxLevel,
    costPerLevel: perk.costPerLevel,
    inactive: !isFunctionalPerk(perk),
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
