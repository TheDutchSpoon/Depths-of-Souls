import { CombatDemo } from '../ui/CombatDemo'
import {
  demoPlayerParty,
  demoEnemyParty,
  demoScripts,
  demoTraits,
  demoStatuses,
  DEMO_SEED,
} from './demoFight'

function App() {
  return (
    <main>
      <h1>Depths of Souls</h1>
      <CombatDemo
        playerParty={demoPlayerParty}
        enemyParty={demoEnemyParty}
        initialSeed={DEMO_SEED}
        scripts={demoScripts}
        traits={demoTraits}
        statuses={demoStatuses}
      />
    </main>
  )
}

export default App
