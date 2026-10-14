import { useState } from 'react'
import { generateRunSeed } from '../app/newGame'
import { seedRefusalText } from '../app/refusals'
import { SPEC_CHOICES, startRun } from '../app/startRun'
import { useGameStore } from '../state/store'

export function StartScreen({ onStarted }: { onStarted: () => void }) {
  const [specId, setSpecId] = useState(SPEC_CHOICES[0]!.id)
  const [seedText, setSeedText] = useState('')
  const [refusal, setRefusal] = useState<string | null>(null)

  function start() {
    const result = startRun(useGameStore.getState(), specId, seedText)
    if (!result.ok) {
      setRefusal(seedRefusalText(result.reason))
      return
    }
    setRefusal(null)
    onStarted()
  }

  return (
    <section>
      <h2>New game</h2>
      <fieldset>
        <legend>Specialization</legend>
        {SPEC_CHOICES.map((spec) => (
          <label key={spec.id}>
            <input
              type="radio"
              name="spec"
              value={spec.id}
              checked={specId === spec.id}
              onChange={() => setSpecId(spec.id)}
            />{' '}
            {spec.name}
          </label>
        ))}
      </fieldset>
      <label>
        Seed (blank for a random one):{' '}
        <input
          type="text"
          value={seedText}
          onChange={(event) => setSeedText(event.target.value)}
        />
      </label>{' '}
      <button type="button" onClick={() => setSeedText(String(generateRunSeed()))}>
        Random
      </button>{' '}
      <button type="button" onClick={start}>
        Start
      </button>
      {refusal !== null && <p role="alert">{refusal}</p>}
    </section>
  )
}
