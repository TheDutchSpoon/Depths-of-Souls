# Hand-out r1 — 4.5-F: Level-ups after each fight, the per-fight record, and the intro's XP

Three cleanup items on branch `4.5-f`. No game behaviour changes: `src/state/store.ts` changes
only in a comment, one store test gains an assertion, and the docs check learns one doc name.
Every golden, the corpus digest and every existing test stay byte-identical; the only new test is
item 3's.

1. **`FightRecord`'s doc comment (`src/state/store.ts`) names what a replay needs.** It says
   `createCombat` over the seed, the two parties and the player's effects gives back `events`. That
   holds only with the same registries the store was given (`deps.scripts`, `deps.traits`,
   `deps.statuses`); a record from the balance simulator replays only with the simulator's own
   scripts (`buildSimScripts`). Rewrite the comment to say a record replays with the registries
   the store was given, and cite `spec/store.md#a-descents-outcome`. Present tense, no provenance.

2. **The intro test asserts its non-loss case (`src/state/store.test.ts`, "every active-party
   creature gets the grant, whatever the intro fight's result").** The overwhelming-Unicorn case
   asserts `'loss'`, but the stock intro's result is never asserted, so the "whatever the result"
   claim rests on an unstated fact. Assert that `crossing.outcome.result` and
   `below.outcome.result` are `'win'` (the stock fixture intro is a win today), with a one-line
   comment saying the two cases cover a won and a lost intro.

3. **The citations check knows `CI_CD.md` (`scripts/docs-check/citations.ts`).** The design
   docs gained a top-level living doc, `.claude/CI_CD.md`. Add `CI_CD` to `TOP_LEVEL_DOCS`, so
   its bare label form (the name followed by a quoted heading name) fails the check as it already
   does for `CONVENTIONS`, and add a case for it to `scripts/docs-check/citations.test.ts` beside
   the existing `CONVENTIONS` one.

Gates: `npm run test`, `lint`, `format:check`, `build`, `npx tsc -b`,
`npm run docs:check -- citations` and `-- comments`. In `report-r2.md`, list the two edits, the
gate results and the per-file test count (unchanged except item 3's test).
