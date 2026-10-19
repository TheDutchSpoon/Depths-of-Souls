// Throwaway demo: replaced by the real combat UI (`CONVENTIONS.md#every-feature-phase-ships-a-demo`).
import type { BiomeData } from '../engine/generation'
import type { Specialization } from '../data/specializations'
import type { GameActions, GameState } from '../state/store'
import { bossName } from './names'

export interface SidePanelRow {
  readonly label: string
  readonly value: string
}

export interface SidePanelContext {
  readonly specs: ReadonlyMap<string, Specialization>
  readonly biomes: readonly BiomeData[]
}

export const CURRENCY_NOTE = 'Nothing spends these yet'
export const SAVE_NOTE = 'No saving yet: reloading the page starts over'

function listOrNone(items: readonly string[]): string {
  return items.length === 0 ? 'none' : items.join(', ')
}

export function sidePanelRows(
  state: Pick<
    GameState,
    | 'chosenSpec'
    | 'runSeed'
    | 'deepestFloor'
    | 'lastFloor'
    | 'discoveredBiomes'
    | 'bossesCleared'
    | 'currencies'
  > &
    Pick<GameActions, 'perkPointSummary'>,
  ctx: SidePanelContext,
): SidePanelRow[] {
  const spec = state.chosenSpec === null ? undefined : ctx.specs.get(state.chosenSpec)
  const points = state.perkPointSummary()
  const biomeNames = ctx.biomes
    .filter((biome) => state.discoveredBiomes.has(biome.id))
    .map((biome) => biome.name)
  return [
    { label: 'Specialization', value: spec?.name ?? 'none' },
    { label: 'Seed', value: String(state.runSeed) },
    { label: 'Deepest floor', value: String(state.deepestFloor) },
    { label: 'Last floor', value: String(state.lastFloor) },
    { label: 'Discovered biomes', value: listOrNone(biomeNames) },
    {
      label: 'Bosses cleared',
      value: listOrNone([...state.bossesCleared].map((id) => bossName(id))),
    },
    {
      label: 'Perk points',
      value: `${points.earned} earned, ${points.spent} spent, ${points.free} free`,
    },
    { label: 'Essence', value: String(state.currencies.essence) },
    { label: 'Ore', value: String(state.currencies.ore) },
    { label: 'Bricks', value: String(state.currencies.bricks) },
    { label: 'Lifeforce', value: String(state.currencies.lifeforce) },
  ]
}
