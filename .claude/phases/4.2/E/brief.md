# 4.2-E — Condense combat, scripting

Phase brief: `.claude/phases/4.2/brief.md`. Loop: condense. Golden policy: **byte-identical**.

## Scope

Condense `spec/combat.md` (including its `## To fold` section) and `spec/scripting.md`.
`content/enemy-behaviour.md` stays a content doc; scripting links to it.

## Known from earlier slices

- **From 4.2-B:** `spec/scripting.md` "Role scripts" and `content/enemy-behaviour.md` "Role
  scripts" both carry the seven roles; keep one home.
- **From 4.2-C:** `spec/run.md` and `spec/creatures.md` link in label form to
  `spec/combat.md` "Encounters, rewards & wipes" (now the one home of per-kill banking and
  wipe → hub), "Affinity advantage", "Fight setup", "Resolution & timing" (the `alive: false`
  sentence) and "The stat a spell's magnitude scales off", and to `spec/scripting.md` "Role
  scripts". Keep those as headings or update the links.
- **From 4.2-C:** a whole subsystem designed for a later phase goes to the file's `## Not built`
  half (phase brief, rule 1), not to `## Design`.
- **From 4.2-D:** `spec/effects.md`, `spec/responses.md` and `spec/statuses.md` link in label form
  to `spec/combat.md` "Fight setup", "Action instance-list" (today both only as prefixes of longer
  headings), "Damage formula", "Damage channels and the Additional", "Turn structure",
  "Resolution & timing", "One action pipeline", "Every action source obeys the same rules", "An
  action ends when its actor dies", "adjacency targeting", "targeting-override", "Armor
  penetration" and "Cross-stat contribution". Keep those as headings or update the links.
- **From 4.2-D:** one home for each of these, now in the D files: the revive cap (combat Design
  "Revives are bounded" restates `spec/responses.md` "revive"); status timing in "Turn structure"
  (durations count the bearer's turns, round end has no status work: `spec/statuses.md` "Timing");
  "Phase structure"'s status-tick sentence (`spec/statuses.md` "Ticks are on-turn-end triggers");
  the history in "Damage channels" about ticks before 4.1-H2b2. combat's "Damage observation" link
  still resolves (`spec/effects.md` "Damage observation").
- **From 4.2-D:** "adjacency targeting" says Splashing recomputes in `executeAttack`/
  `executeCastSingle`; Splashing is attacks only (`spec/effects.md` "Splashing and Annihilate",
  `actions.ts` calls `splashTargetIds` from `executeAttack` only). Check it against the code.

## Done when

`inventory E` passes, no `## To fold` section is left, and a verify round has no findings.
