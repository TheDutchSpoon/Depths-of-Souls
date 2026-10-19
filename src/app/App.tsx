// Throwaway demo: replaced by the real combat UI (`CONVENTIONS.md#every-feature-phase-ships-a-demo`).
import { useState } from 'react'
import { Hub } from '../ui/Hub'
import { RunScreen } from '../ui/RunScreen'
import { SidePanel } from '../ui/SidePanel'
import { StartScreen } from '../ui/StartScreen'

// UI state only: which screen is showing. Game state lives in the store.
function App() {
  const [started, setStarted] = useState(false)
  return (
    <main className="layout">
      <h1>Depths of Souls</h1>
      <div className="columns">
        <div>
          {started ? <RunScreen /> : <StartScreen onStarted={() => setStarted(true)} />}
        </div>
        {/* A sibling of the run screen, never its parent: a hub action can't re-key the viewer. */}
        {started && (
          <div className="hub">
            <Hub onNewGame={() => setStarted(false)} />
          </div>
        )}
        <SidePanel />
      </div>
    </main>
  )
}

export default App
