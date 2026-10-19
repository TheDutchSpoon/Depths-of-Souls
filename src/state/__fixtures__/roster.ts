import { makeParty } from '../../engine/__fixtures__/creatures'
import type { Roster } from '../balance-sim'

/** One side's entry: an opaque combat id, or an id with the template it was materialized from. A
 * bare id's template is the id itself. */
export type RosterEntry = string | { readonly id: string; readonly templateId: string }

function partyOf(side: 'player' | 'enemy', entries: readonly RosterEntry[]) {
  return makeParty(
    side,
    entries.map((entry) => {
      const { id, templateId } =
        typeof entry === 'string' ? { id: entry, templateId: entry } : entry
      return { id, origin: { templateId, level: 1 } }
    }),
  )
}

/** A fight's two parties for the analysis functions, which read sides and templates from the
 * record's parties and never from the shape of an id. Ids are opaque on purpose: nothing here
 * encodes a side or a slot in one. */
export function rosterOf(
  playerEntries: readonly RosterEntry[],
  enemyEntries: readonly RosterEntry[],
): Roster {
  return {
    playerParty: partyOf('player', playerEntries),
    enemyParty: partyOf('enemy', enemyEntries),
  }
}
