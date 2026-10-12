# Hand-out r1 — 4.5-B2: every pass over the living creatures in turn order

Branch `4.5-b2`, reviewed at `de197d1`. The engine change is approved as built; this round is four
comment, title and evidence edits. No code, no test logic, no expected value changes. Every gate
must stay as it is (1898 tests, 1897 passed, 1 skipped), and the corpus fixture is not regenerated.

## Items

1. **`src/engine/__golden__/golden-round-end-interaction.fixture.ts:80`.** The comment reads
   `// -- round-end trait pass (turn order: P1, P2, E1) --`. The Speeds are P1 5, P2 20, E1 10, so
   turn order is P2, E1, P1. Rewrite it to state the real order and why only one creature acts in
   it, e.g. `// -- round-end trait pass (turn order P2 20, E1 10, P1 5; only P1 carries an
   on-round-end trait) --`.
2. **`src/engine/__golden__/golden-death-observed.fixture.ts`, header.**
   - Lines 3–4 say every Speed but the killer's is equal, "so the player side first then the enemy
     side". The killer (Speed 30) is first in turn order. Say so: the killer first, then the rest
     with the player side before the enemy side, each in slot order.
   - CASE 2 (`playerDies`, lines ~31–36) walks the observers with the enemy killer K after the
     player creatures. In turn order K comes first: list K (no trait) before V, PA, PE, PB. The
     firing order line (PA, PB, EE, EY) stays as it is.
3. **`src/engine/pass-order.test.ts:198`.** Retitle `'on-death-observed, the dead creature left
   out'` to `'on-death-observed'`. T carries no observer, so the test can't show the by-id
   exclusion; `death-observed.test.ts`'s self-revive test is what pins that. If you'd rather keep a
   comment, one line above the `it` saying where the by-id exclusion is pinned is fine.
4. **`.claude/phases/4.5/B2/evidence/reversal.md`.** The run that reports `corpus-digest.test.ts`
   passing used `main`'s committed `src/engine/__corpus__/corpus-digest.fixture.ts` (on the
   finished tree the committed fixture is the regenerated one, which the reversal can't match).
   Replace "changes nothing else" with what the run did: the patch below, plus `main`'s corpus
   fixture swapped in for the run and restored after. Keep the result counts.

## Proof for the report

- `npm run docs:check -- comment-proof origin/main`: items 1–2 come out `OK` (comment-only), as the
  other ten edited fixtures already do. `pass-order.test.ts` changes only a title.
- All gates as in `coding-rules.md`, with the counts above.
- `report-r2.md` lists the four items with the line each changed.
