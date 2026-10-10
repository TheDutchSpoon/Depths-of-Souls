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

## Done when

`inventory E` passes, no `## To fold` section is left, and a verify round has no findings.
