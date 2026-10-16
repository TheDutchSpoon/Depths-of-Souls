import type {
  CanSummonResult,
  GameActions,
  GameState,
  SummonResult,
} from '../state/store'
import { traitDescription } from '../data/traits'
import { HUB_CONTEXT, templateOf } from './creatureLine'
import type { HubContext } from './creatureLine'
import { creatureName } from './names'

export interface SoulRow {
  readonly creatureId: string
  readonly name: string
  readonly percent: number
  /** One description per innate trait of the creature, in the template's order. */
  readonly traitLines: readonly string[]
  readonly can: CanSummonResult
}

/** Every creature with soul progress above 0, in the map's order. */
export function soulRows(
  state: Pick<GameState, 'soulProgress'>,
  store: Pick<GameActions, 'canSummon'>,
  names: ReadonlyMap<string, string>,
  ctx: Pick<HubContext, 'templates'> = HUB_CONTEXT,
): SoulRow[] {
  return [...state.soulProgress]
    .filter(([, percent]) => percent > 0)
    .map(([creatureId, percent]) => ({
      creatureId,
      name: creatureName(names, creatureId),
      percent,
      traitLines: templateOf(ctx, creatureId).innateTraitIds.map(traitDescription),
      can: store.canSummon(creatureId),
    }))
}

export function percentText(percent: number): string {
  return `${percent}%`
}

/** Duplicates are allowed: soul progress is not spent by a summon (`spec/creatures.md#souls`). */
export function summonCreature(
  store: Pick<GameActions, 'summon'>,
  creatureId: string,
): SummonResult {
  return store.summon(creatureId)
}
