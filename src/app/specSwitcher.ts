import type { GameActions } from '../state/store'
import { SPEC_CHOICES } from './startRun'

export const SPEC_SWITCH_NOTE = 'Switching refunds every perk.'

/** The specs a switch can go to, in the data's order: re-picking the current one is not a swap
 * (`spec/progression.md#swapping-specialization`). All of them while none is chosen. */
export function otherSpecs(
  chosenSpec: string | null,
  specs: readonly { readonly id: string; readonly name: string }[] = SPEC_CHOICES,
): { readonly id: string; readonly name: string }[] {
  return specs.filter((spec) => spec.id !== chosenSpec)
}

/** `setSpec` throws on an unknown id, so this is only called with an id from `otherSpecs`. */
export function switchSpec(store: Pick<GameActions, 'setSpec'>, specId: string): void {
  store.setSpec(specId)
}
