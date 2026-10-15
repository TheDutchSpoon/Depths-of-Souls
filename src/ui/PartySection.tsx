import { useState } from 'react'
import { creatureLineText, HUB_CONTEXT } from '../app/creatureLine'
import { partyRows, pickParty } from '../app/partyRows'
import { partySlotRefusalText } from '../app/refusals'
import { useGameStore } from '../state/store'

export function PartySection() {
  const game = useGameStore()
  const [refusal, setRefusal] = useState<string | null>(null)
  const rows = partyRows(game, HUB_CONTEXT)

  function pick(slot: number, value: string) {
    const result = pickParty(useGameStore.getState(), slot, value)
    setRefusal(result.ok ? null : partySlotRefusalText(result.reason))
  }

  return (
    <section>
      <h2>Party</h2>
      {rows.map((row) => (
        <div key={row.slot}>
          <label>
            Slot {row.slot + 1}:{' '}
            <select
              aria-label={`Party slot ${row.slot + 1}`}
              value={row.selected ?? ''}
              onChange={(event) => pick(row.slot, event.target.value)}
            >
              {row.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {row.line !== null && <p>{creatureLineText(row.line)}</p>}
        </div>
      ))}
      {refusal !== null && <p role="status">{refusal}</p>}
    </section>
  )
}
