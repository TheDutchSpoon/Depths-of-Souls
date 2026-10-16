# 4.5-G3 — The demo: adjustments, trait and perk text

Phase brief: `.claude/phases/4.5/brief.md`. Golden policy: goldens, the corpus digest, existing
engine and store tests and the end-to-end smoke test byte-identical; existing demo tests in
`src/app` change only where the waiting phase or a moved line requires it, each change listed in
the report; data changes are additive (`phases/4.5/brief.md#demo-golden-rule`). Builds on 4.5-G2.

## Scope

From `phases/4.5/brief.md#demo-adjustments-g3`: results under the log, playback starting at once,
the scrolling log box, trait lines on souls and description lines on perks. From
`phases/4.5/brief.md#trait-and-perk-text`: a `description` on every stock trait and perk, with
its tests and verification.

## Known

- The playback reducer loses its `waiting` phase; the single-timer structure
  (`timerKey`, one timeout effect) stays as G1 built it.
- The engine's `Trait` and the data's `PerkDef` are unchanged; the described type is data-owned.
- Every description is transcribed from its content-doc entry, with the code's numbers.

## Done when

A descent plays from fight 1 at once with the results below the log, the log box follows and
holds as specified and fits a 1920×1080 screen, every soul row shows its creature's trait text and
every perk row its description, the compiler refuses a stock trait or perk without one, and the
click-through and screenshots in the report are complete.
