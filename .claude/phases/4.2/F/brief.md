# 4.2-F — Condense the top-level docs

Phase brief: `.claude/phases/4.2/brief.md`. Loop: condense. Golden policy: **byte-identical**.

## Scope

- **`CONVENTIONS.md`:** no halves; its rules are `##` sections with `###` rules. "Where each number
  lives" and the balance simulator stay here.
- **`VISION.md`** (retitled from GAME_DESIGN's title) and **`OPEN_QUESTIONS.md`**.
- **`CLAUDE.md`:** shrinks to orientation, the doc map and the non-negotiables. Each rule it
  summarises must already have a home in the spec, or it can't be dropped.
- **`ROADMAP.md`:** each finished phase (0 to 4.1) becomes one line: what shipped, with links to its
  brief and record. Any rule still living only there is moved to the spec. "Guidance for AI-assisted
  work" is checked line by line: stale items dropped, rules that duplicate `CONVENTIONS` or
  `WORKFLOWS` dropped as duplicates, anything else moved. Future phases stay, minus stale items.
  Phase 4.2's own entry stays until the phase closes.
- **`WORKFLOWS.md`:** the overview of the process; the step rules live in `workflow/*.md`, so a rule
  stated in both keeps one home. The 4.1 transition paragraph shrinks to the one sentence a reader
  of the 4.1 mailboxes needs (the old file names map to `phases/4.1/brief.md` and `record.md`).

## Known from earlier slices

- **From 4.2-B:** `OPEN_QUESTIONS.md` still parks the "entrance-hub prelude", while the deleted
  `species-locked.md` said the Unicorn's scripted intro un-parks it. They differ (several weak
  fights against one rigged fight): decide with Duncan whether the parked item stays.
- **From 4.2-C:** ROADMAP Phase 5 ("Inputs already decided") and Phase 8 restate
  `spec/saves.md` and the `## Not built` halves of `spec/creatures.md` and `spec/run.md`; keep one
  home. The ROADMAP's partition list and the IndexedDB-name env module aren't in `spec/saves.md`
  yet, so move them there rather than drop them.
- **From 4.2-C:** `CONVENTIONS.md` "Where each number lives" restates the XP curve's rationale,
  whose home is now `spec/creatures.md` "Levels and XP".
- **From 4.2-C:** the spec rules (phase brief "Rules for the new spec") now include the
  `## Not built` half. Wherever those rules live after 4.2, it goes with them.
- **From 4.2-D:** `OPEN_QUESTIONS.md` "Behavioral traits" parks "scripting-altering /
  extra-action traits", but extra actions are built (`perform-action`); only extra turns,
  scripting options and decision-altering traits stay parked. `spec/effects.md` "Traits" links that
  item by its label. The "DoT and Regen potencies" item restates numbers whose home is the content
  docs (`content/rotcap-hollow.md` "Damage over time", `content/glimmerdark.md` "Regen").
- **From 4.2-D:** ROADMAP gains two "Decided, not built" entries moved out of the effects spec:
  Phase 7 "Effective stats on screen" and Phase 4.5 `on-death-observed`. Condense them with the
  rest.
- **From 4.2-E:** `CLAUDE.md`'s rule summary restates combat and scripting, whose homes are now
  `spec/combat.md` and `spec/scripting.md`. `OPEN_QUESTIONS.md` "Balance numbers" cites "§7" for
  the round cap (now `spec/combat.md` "Turn queue", `ROUND_CAP`), and its "Status-only AoE
  recasts" item names the "target lacks the status" condition that `ROADMAP.md` Phase 6 and
  `content/enemy-behaviour.md` "Known limit" also carry. ROADMAP Phase 4.5 gains "HP% qualifiers
  pick by HP%" (a bug fix); Phase 6 is now the one home of the editor's candidate conditions and the
  script-level default target, which `spec/scripting.md` links.

## Done when

`inventory F` passes and a verify round has no findings. After F, no file carries a `## To fold`
section.
