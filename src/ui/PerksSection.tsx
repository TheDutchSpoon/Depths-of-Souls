// Throwaway demo: replaced by the real combat UI (`CONVENTIONS.md#every-feature-phase-ships-a-demo`).
import { useState } from 'react'
import {
  checkPerkField,
  chosenSpecialization,
  INACTIVE_LABEL,
  perkRows,
  setPerkFromField,
} from '../app/perkRows'
import type { PerkRow as PerkRowData } from '../app/perkRows'
import { perkRefusalText } from '../app/refusals'
import { useGameStore } from '../state/store'

function PerkRow({ perk }: { perk: PerkRowData }) {
  const game = useGameStore()
  // A draft only: the level shown beside it is read from the store's spend.
  const [text, setText] = useState(String(perk.level))
  const check = checkPerkField(game, perk.id, text)

  return (
    <li>
      {perk.name}: {perk.level} / {perk.maxLevel}, {perk.costPerLevel} per level
      {perk.inactive && ` (${INACTIVE_LABEL})`}
      <p>{perk.description}</p>
      <input
        type="text"
        aria-label={`Level of ${perk.name}`}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />{' '}
      <button
        type="button"
        aria-label={`Set ${perk.name}`}
        disabled={!check.ok}
        onClick={() => setPerkFromField(useGameStore.getState(), perk.id, text)}
      >
        Set
      </button>
      {!check.ok && <span> {perkRefusalText(check.reason)}</span>}
    </li>
  )
}

export function PerksSection() {
  const game = useGameStore()
  const spec = chosenSpecialization(game.chosenSpec)
  return (
    <section>
      <h2>Perks</h2>
      {spec === null ? (
        <p>{perkRefusalText('no-spec')}</p>
      ) : (
        <>
          <button type="button" onClick={() => game.refundAllPerks()}>
            Refund all
          </button>
          <ul>
            {perkRows(spec, game.perkSpend).map((perk) => (
              // Keyed by spec and perk, so a switch drops the old spec's drafts.
              <PerkRow key={spec.id + perk.id} perk={perk} />
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
