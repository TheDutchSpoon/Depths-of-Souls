// Throwaway demo: replaced by the real combat UI (`CONVENTIONS.md#every-feature-phase-ships-a-demo`).
import { BIOMES } from '../data/biomes'
import { SPECIALIZATIONS_BY_ID } from '../data/specializations'
import { CURRENCY_NOTE, SAVE_NOTE, sidePanelRows } from '../app/sidePanel'
import { useGameStore } from '../state/store'

export function SidePanel() {
  const game = useGameStore()
  const rows = sidePanelRows(game, { specs: SPECIALIZATIONS_BY_ID, biomes: BIOMES })
  return (
    <aside>
      <h2>Run</h2>
      <dl>
        {rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
      <p>{CURRENCY_NOTE}</p>
      <p>{SAVE_NOTE}</p>
    </aside>
  )
}
