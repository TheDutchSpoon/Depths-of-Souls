import type { StoreApi } from 'zustand'
import type {
  DescendFailureReason,
  FloorOutcome,
  GameActions,
  GameState,
} from '../state/store'

export type DescentRun =
  | {
      readonly ok: true
      readonly outcome: FloorOutcome
      readonly bossesBefore: ReadonlySet<string>
      readonly bossesAfter: ReadonlySet<string>
    }
  | { readonly ok: false; readonly reason: DescendFailureReason }

/** Takes the store itself, not a state object: `bossesBefore` is read before `descend` and
 * `bossesAfter` from a fresh `getState()` after it, because the store replaces the `Set` rather
 * than mutating it (a state object read before the call keeps the old one). */
export function runDescent(
  store: Pick<StoreApi<GameState & GameActions>, 'getState'>,
  floor: number,
): DescentRun {
  const bossesBefore = store.getState().bossesCleared
  const result = store.getState().descend(floor)
  if (!result.ok) return result
  return {
    ok: true,
    outcome: result.outcome,
    bossesBefore,
    bossesAfter: store.getState().bossesCleared,
  }
}
