import { useState } from 'react'
import { DEMO_NAMES } from '../app/names'
import { summonRefusalText } from '../app/refusals'
import { percentText, soulRows, summonCreature } from '../app/soulRows'
import { useGameStore } from '../state/store'

export function SoulsSection() {
  const game = useGameStore()
  const [refusal, setRefusal] = useState<string | null>(null)
  const rows = soulRows(game, game, DEMO_NAMES)

  function summon(creatureId: string) {
    const result = summonCreature(useGameStore.getState(), creatureId)
    setRefusal(result.ok ? null : summonRefusalText(result.reason))
  }

  return (
    <section>
      <h2>Souls</h2>
      {rows.length === 0 && <p>No soul progress yet.</p>}
      <ul>
        {rows.map((row) => (
          <li key={row.creatureId}>
            {row.name}: {percentText(row.percent)}{' '}
            <button
              type="button"
              aria-label={`Summon ${row.name}`}
              disabled={!row.can.ok}
              onClick={() => summon(row.creatureId)}
            >
              Summon
            </button>
            {!row.can.ok && <span> {summonRefusalText(row.can.reason)}</span>}
          </li>
        ))}
      </ul>
      {refusal !== null && <p role="status">{refusal}</p>}
    </section>
  )
}
