import { useState } from 'react'
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
        <SidePanel />
      </div>
    </main>
  )
}

export default App
