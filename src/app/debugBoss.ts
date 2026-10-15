import { BOSS_CREATURES_BY_ID } from '../data/creatures'
import type { GameActions } from '../state/store'
import { bossName } from './names'

/** The bosses the data has, by name: the earned perk points count every id `recordBossKill` is
 * given, so the Debug control offers only real boss ids. */
export function bossChoices(): { readonly id: string; readonly name: string }[] {
  return [...BOSS_CREATURES_BY_ID.keys()].map((id) => ({ id, name: bossName(id) }))
}

export function recordBoss(
  store: Pick<GameActions, 'recordBossKill'>,
  bossId: string,
): void {
  store.recordBossKill(bossId)
}
