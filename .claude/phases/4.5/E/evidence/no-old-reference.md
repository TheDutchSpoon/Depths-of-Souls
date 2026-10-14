# No old reference (4.5-E)

`grep -rniE "ember[-_ ]lance|cinder[-_ ]nova|venom[-_ ]bolt" src` (case-insensitive; covers the ids `ember-lance`, `cinder-nova`, `venom-bolt`, the names, and the const names `EMBER_LANCE`, `CINDER_NOVA`, `VENOM_BOLT`), run on the working tree with `src/data/spells/core.ts` deleted: **0 matching lines**.

`grep -rn "spells/core\|'./core'" src` : 0 lines.
