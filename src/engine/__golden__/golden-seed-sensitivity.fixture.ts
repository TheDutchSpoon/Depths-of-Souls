// Reuses the random-enemy-targeting party/script setup from golden-random-selector --
// genuinely RNG-sensitive (three equally-valid enemy targets each turn), so different
// seeds are expected to produce different logs. No hand-derivation needed here beyond
// "differs and is stable" -- the mechanism itself is already proven correct by
// golden-random-selector's hand-derived fixture.
export { playerParty, enemyParty, scripts } from './golden-random-selector.fixture'

export const SEED_A = 7007
export const SEED_B = 424242
