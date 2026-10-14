# Hand-out r2 — 4.5-F: Level-ups after each fight, the per-fight record, and the intro's XP

Three cleanup items on branch `4.5-f`: two comments and one test case. No game behaviour changes;
`src/state/store.ts` changes only in a comment. Every golden, the corpus digest and every test
count stay as they are (1992 passed, 1 skipped; `citations.test.ts` stays at 69).

1. **The intro test's Unicorn comment (`src/state/store.test.ts`, "every active-party creature
   gets the grant, whatever the intro fight's result").** In `runScriptedIntro` the Unicorn is the
   *enemy*: it is materialized with `side: 'enemy'`, and `spec/run.md#scripted-intro` calls the
   intro "a fixed fight against a level-1 Unicorn". `outcome.result` is the player's result. So an
   overwhelming Unicorn wins the fight, and the player's result is `'loss'`. The comment above that
   case says "An overwhelming Unicorn loses the intro fight", which is false. Make it say the
   Unicorn wins, a loss for the player, and that the grant is the same, e.g.
   `// An overwhelming enemy Unicorn wins the intro fight (a loss for the player); the grant is the same.`
   Leave the assertions as they are.

2. **The `CI_CD` label-form case pins `TOP_LEVEL_DOCS` (`scripts/docs-check/citations.test.ts`, `(c)
   label forms`).** The `CI_CD` case (label `Deploy`) is the backticked form: `CI_CD.md` wrapped in
   backticks, then the quoted label. The backticked-path label regex in `labelForms` catches it
   whatever `TOP_LEVEL_DOCS` holds, and `scanText` skips a bare match that a backticked match
   covers. So removing `CI_CD` from `TOP_LEVEL_DOCS` in `scripts/docs-check/citations.ts` leaves
   every test green. Replace that case with the bare form: the same string without the backticks
   around `CI_CD.md`, which only the `TOP_LEVEL_DOCS` regex matches. Replace it, don't add a new
   one: the backticked `CONVENTIONS.md` case in the same list already covers the backticked form.
   Then check the pin: with `CI_CD` removed from `TOP_LEVEL_DOCS`, the case must fail in both
   describe blocks (`citations in src/` and `citations in .claude/`), and it must pass with `CI_CD`
   restored.

3. **`FightRecord`'s doc comment (`src/state/store.ts`) names `resolveFight`.** It says
   `createCombat` over the seed, the two parties and the player's effects, with the store's
   registries, "gives back `events`". `createCombat` returns a `CombatState`; the events come from
   `resolveFight` over it, as the cited `spec/store.md#a-descents-outcome` says. Make it
   "`createCombat` over …, with the registries the store was given (`deps.scripts`, `deps.traits`,
   `deps.statuses`), then `resolveFight`, gives back `events`", keeping the citation. Present
   tense, no provenance; a comment-only change.

Gates: `npm run test`, `lint`, `format:check`, `build`, `npx tsc -b`,
`npm run docs:check -- citations` and `-- comments`. In `report-r3.md`, list the three edits, the
gate results, the per-file test count (unchanged), and item 2's mutation result: which tests fail
with `CI_CD` removed from `TOP_LEVEL_DOCS`.
