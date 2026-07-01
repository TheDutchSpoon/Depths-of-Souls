import { useGameStore } from '../state/store'

export function TickCounter() {
  const tick = useGameStore((state) => state.tick)

  return <p>Ticks: {tick}</p>
}
