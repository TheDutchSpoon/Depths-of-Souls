import type {
  CanSummonResult,
  GameActions,
  GameState,
  SummonResult,
} from '../state/store'
import { creatureName } from './names'

export interface SoulRow {
  readonly creatureId: string
  readonly name: string
  readonly percent: number
  readonly can: CanSummonResult
}

/** Every creature with soul progress above 0, in the map's order. */
export function soulRows(
  state: Pick<GameState, 'soulProgress'>,
  store: Pick<GameActions, 'canSummon'>,
  names: ReadonlyMap<string, string>,
): SoulRow[] {
  return [...state.soulProgress]
    .filter(([, percent]) => percent > 0)
    .map(([creatureId, percent]) => ({
      creatureId,
      name: creatureName(names, creatureId),
      percent,
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
