import type { CreateCombatRegistries } from '../engine/combat'
import { STOCK_SCRIPTS_BY_ID } from './scripts'
import { STATUS_REGISTRY } from './statuses'
import { TRAIT_REGISTRY } from './traits'

// The three registries the default store is built with. A fight is only reproducible through the
// registries it was played with (`spec/store.md#a-descents-outcome`), so anything that rebuilds a
// fight's set-up reads these same objects.
export const DEFAULT_REGISTRIES: Required<CreateCombatRegistries> = {
  scripts: STOCK_SCRIPTS_BY_ID,
  traits: TRAIT_REGISTRY,
  statuses: STATUS_REGISTRY,
}
