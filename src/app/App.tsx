import { CombatDemo } from '../ui/CombatDemo'
import { demoPlayerParty, demoEnemyParty, DEMO_SEED } from './demoFight'

function App() {
  return (
    <main>
      <h1>Depths of Souls</h1>
      <CombatDemo
        playerParty={demoPlayerParty}
        enemyParty={demoEnemyParty}
        seed={DEMO_SEED}
      />
    </main>
  )
}

export default App
