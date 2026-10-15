import type { InstanceId } from '../state/ids'
import type { GameActions, GameState, SetPartySlotResult } from '../state/store'
import { creatureLine } from './creatureLine'
import type { CreatureLine, HubContext } from './creatureLine'
import { labelInstances, labelOf } from './instanceLabels'

/** The option value for "empty": an instance id is never blank. */
export const EMPTY_SLOT_VALUE = ''

export interface PartyOption {
  readonly value: string
  readonly label: string
}

export interface PartyRow {
  readonly slot: number
  readonly selected: InstanceId | null
  /** "empty" plus every owned instance, party members included: picking a member swaps. */
  readonly options: readonly PartyOption[]
  readonly line: CreatureLine | null
}

type PartyState = Pick<GameState, 'collection' | 'activeParty'>

/** One row per `activeParty` entry, so the row count is the store's party size. */
export function partyRows(state: PartyState, ctx: HubContext): PartyRow[] {
  const labels = labelInstances(state.collection, ctx.names)
  const options: PartyOption[] = [
    { value: EMPTY_SLOT_VALUE, label: 'empty' },
    ...[...state.collection.keys()].map((id) => ({
      value: id,
      label: labelOf(labels, id),
    })),
  ]
  return state.activeParty.map((id, slot) => {
    if (id === null) return { slot, selected: null, options, line: null }
    const instance = state.collection.get(id)
    if (instance === undefined)
      throw new Error(`partyRows: slot ${slot} holds unowned instance ${id}`)
    return {
      slot,
      selected: id,
      options,
      line: creatureLine(instance, labelOf(labels, id), ctx),
    }
  })
}

/** Every owned instance outside the party, in collection order. */
export function benchRows(state: PartyState, ctx: HubContext): CreatureLine[] {
  const labels = labelInstances(state.collection, ctx.names)
  const inParty = new Set(state.activeParty)
  return [...state.collection.values()]
    .filter((instance) => !inParty.has(instance.id))
    .map((instance) => creatureLine(instance, labelOf(labels, instance.id), ctx))
}

/** A dropdown pick is one `setPartySlot` call: the store owns the swap and the bench
 * (`spec/store.md#store-actions`), so nothing is emptied or moved here. */
export function pickParty(
  store: Pick<GameActions, 'setPartySlot'>,
  slot: number,
  value: string,
): SetPartySlotResult {
  return store.setPartySlot(
    slot,
    value === EMPTY_SLOT_VALUE ? null : (value as InstanceId),
  )
}
