# 4.5-G1 — The demo: descent loop and viewer

Phase brief: `.claude/phases/4.5/brief.md`. Golden policy: **byte-identical**
(`phases/4.5/brief.md#demo-golden-rule`). Needs 4.5-F's per-fight record.

## Scope

From `phases/4.5/brief.md#the-demo`: store use, the start screen, the floor picker, the descent
result and viewer, the side panel, Debug "Copy fight as JSON", and the tests and verification that
cover them. Replaces the stub on the live site. Not the hub (4.5-G2).

## Known

- The 3.5 viewer's event text, beat grouping and timer handling (`src/ui/CombatDemo.tsx`) are moved
  and reused, not rewritten.
- Player-facing strings carry no phase ids (`phases/4.5/brief.md#assumptions`).

## Done when

A new game reaches the hub-less descent loop, a floor plays back fight by fight at three speeds,
the presence test passes, and the click-through checklist in the report is complete.
