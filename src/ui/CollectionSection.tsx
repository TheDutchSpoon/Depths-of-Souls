import { creatureLineText, HUB_CONTEXT } from '../app/creatureLine'
import { benchRows } from '../app/partyRows'
import { useGameStore } from '../state/store'

export function CollectionSection() {
  const game = useGameStore()
  const rows = benchRows(game, HUB_CONTEXT)
  return (
    <section>
      <h2>Collection</h2>
      <p>Creatures outside the party. The party's creatures are listed under Party.</p>
      {rows.length === 0 ? (
        <p>None.</p>
      ) : (
        <ul>
          {rows.map((line) => (
            <li key={line.label}>{creatureLineText(line)}</li>
          ))}
        </ul>
      )}
    </section>
  )
}
