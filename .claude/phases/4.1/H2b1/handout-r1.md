# Hand-out r1 — Phase 4.1 — Slice H2b1: Flickerlings and damage observation

One fix, comment only. Branch `phase-4.1-slice-h2b1`. Everything else in the PR is approved; change
nothing else.

## Fix 1: the `Hook` header comment's count

In `src/engine/effect-types.ts`, the comment above `export type Hook` reads:

```ts
// The v1 hook vocabulary (13, pinned) plus Phase 4 Slice B's on-[action] family (+4) and Phase
// 4.1-H2b1's on-damage-observed (+1), 17 in all.
```

13 + 4 + 1 is 18. The count skips Slice E2, which removed the never-wired `on-ally-action` /
`on-enemy-action` pair (−2) and added `on-action-observed` (+1), a net −1 (the next lines of the same
comment describe that change). The `Hook` union itself has 17 members, which is correct; only the
arithmetic in the comment is wrong. Reword the first two lines so the steps add up, for example:

```ts
// The v1 hook vocabulary (13, pinned) plus Phase 4 Slice B's on-[action] family (+4, -> 17), one
// fewer after Slice E2 (below: the never-wired pair out, on-action-observed in, -> 16), plus Phase
// 4.1-H2b1's on-damage-observed (+1), 17 in all.
```

Keep the rest of the comment as it is.

## Expected changed set

`src/engine/effect-types.ts` (comments only) and the slice's phase-record section if you mention the
fix there. **No** test, golden, fixture or corpus digest change: with comments stripped, the file is
identical to before. A change anywhere else is a stop-and-say.

## Gates

`npm run test`, `npm run lint`, `npm run format:check`, `npm run build`, `npx tsc -b`, all green, with
the same test count as r1 (182 files, 1266 tests: 1265 passed, 1 skipped).

## Report

`report-r2.md` in this mailbox: the fix with the before/after lines, the gates, the test count, and
the changed set against the one above.
