import { otherSpecs, SPEC_SWITCH_NOTE, switchSpec } from '../app/specSwitcher'
import { useGameStore } from '../state/store'

export function SpecSection() {
  const game = useGameStore()
  return (
    <section>
      <h2>Specialization</h2>
      {otherSpecs(game.chosenSpec).map((spec) => (
        <button
          key={spec.id}
          type="button"
          onClick={() => switchSpec(useGameStore.getState(), spec.id)}
        >
          Switch to {spec.name}
        </button>
      ))}
      <p>{SPEC_SWITCH_NOTE}</p>
    </section>
  )
}
