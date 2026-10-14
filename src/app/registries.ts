import type { CreateCombatRegistries } from '../engine/combat'
import { STOCK_SCRIPTS_BY_ID } from '../data/scripts'
import { STATUS_REGISTRY } from '../data/statuses'
import { TRAIT_REGISTRY } from '../data/traits'

// The three registries `useGameStore` is built with. A fight is only reproducible through the
// registries it was played with (`spec/store.md#a-descents-outcome`), so the viewer rebuilds
// fight setup over the same objects the store resolved the fight with.
export const DEMO_REGISTRIES: Required<CreateCombatRegistries> = {
  scripts: STOCK_SCRIPTS_BY_ID,
  traits: TRAIT_REGISTRY,
  statuses: STATUS_REGISTRY,
}
