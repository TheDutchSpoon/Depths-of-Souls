// Throwaway demo: replaced by the real combat UI (`CONVENTIONS.md#every-feature-phase-ships-a-demo`).
import { useState } from 'react'
import { bossChoices, recordBoss } from '../app/debugBoss'
import { useGameStore } from '../state/store'
import { CollectionSection } from './CollectionSection'
import { PartySection } from './PartySection'
import { PerksSection } from './PerksSection'
import { SoulsSection } from './SoulsSection'
import { SpecSection } from './SpecSection'

const BOSSES = bossChoices()

export function Hub({ onNewGame }: { onNewGame: () => void }) {
  const [bossId, setBossId] = useState(BOSSES[0]!.id)
  return (
    <div>
      <PartySection />
      <CollectionSection />
      <SoulsSection />
      <PerksSection />
      <SpecSection />
      <section>
        <h2>Debug</h2>
        <select
          aria-label="Boss"
          value={bossId}
          onChange={(event) => setBossId(event.target.value)}
        >
          {BOSSES.map((boss) => (
            <option key={boss.id} value={boss.id}>
              {boss.name}
            </option>
          ))}
        </select>{' '}
        <button type="button" onClick={() => recordBoss(useGameStore.getState(), bossId)}>
          Debug: Record boss kill
        </button>
      </section>
      <button type="button" onClick={onNewGame}>
        New game
      </button>
    </div>
  )
}
