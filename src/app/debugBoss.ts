// Throwaway demo: replaced by the real combat UI (`CONVENTIONS.md#every-feature-phase-ships-a-demo`).
import { BOSS_CREATURES_BY_ID } from '../data/creatures'
import type { GameActions, RecordBossKillResult } from '../state/store'
import { bossName } from './names'

/** The bosses the data has, by name: the Debug control offers real boss ids, the ones
 * `recordBossKill` accepts. */
export function bossChoices(): { readonly id: string; readonly name: string }[] {
  return [...BOSS_CREATURES_BY_ID.keys()].map((id) => ({ id, name: bossName(id) }))
}

export function recordBoss(
  store: Pick<GameActions, 'recordBossKill'>,
  bossId: string,
): RecordBossKillResult {
  return store.recordBossKill(bossId)
}
