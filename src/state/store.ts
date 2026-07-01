import { create } from 'zustand'

interface GameState {
  tick: number
  incrementTick: () => void
}

export const useGameStore = create<GameState>((set) => ({
  tick: 0,
  incrementTick: () => set((state) => ({ tick: state.tick + 1 })),
}))
