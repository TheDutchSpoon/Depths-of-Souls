import { useEffect } from 'react'
import { useGameStore } from '../state/store'
import { TickCounter } from '../ui/TickCounter'

const TICK_INTERVAL_MS = 1000

function App() {
  const incrementTick = useGameStore((state) => state.incrementTick)

  useEffect(() => {
    const id = setInterval(incrementTick, TICK_INTERVAL_MS)
    return () => clearInterval(id)
  }, [incrementTick])

  return (
    <main>
      <h1>Depths of Souls</h1>
      <TickCounter />
    </main>
  )
}

export default App
