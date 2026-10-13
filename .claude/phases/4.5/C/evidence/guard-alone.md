# The guard alone, 4.5-C

`main` (`e8d0ffd`) in a scratch clone outside the repo, with only this added as the first statement
of `resolveTurn`:

```ts
if (state.result !== null) {
  throw new Error('resolveTurn: the fight already has a result')
}
```

`npx vitest run src/engine src/data src/state` on `main`: 211 files, 1401 passed, 1 skipped.
The same run with only the guard: 211 files, 1401 passed, 1 skipped, including
`corpus-digest.test.ts` against the committed digest. So the guard is byte-identical on its own:
no existing test and no corpus fight steps past the end.
