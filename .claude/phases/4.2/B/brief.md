# 4.2-B — Condense the content docs (the pilot)

Phase brief: `.claude/phases/4.2/brief.md` ("Rules for the new spec", rule 7 especially;
"Condensing rules"; "Inventory format"; "Process for 4.2"). Loop: condense. Golden policy:
**byte-identical** (`.claude/` only).

## Scope

The content docs: `content/overgrowth.md`, `content/glimmerdark.md`, `content/rotcap-hollow.md`,
`content/enemy-behaviour.md`, `specializations/brute.md`, `specializations/shieldbarer.md`,
`specializations/sorcerer.md`, and `species/species-locked.md`. Not `species/_species-backlog.md`.

- **They describe `main`.** Each biome doc's "Phase 4.1 — decided changes (pending build)" section
  goes: items that landed are dropped as history (checked against the code); items not built move to
  the ROADMAP's Phase 4.5 entry under "Decided, not built". Known now: the Phase 4.5 clean-up (Ember
  Lance and Venom Bolt deleted, Cinder Nova promoted). Any "until <slice>" marker goes the same way.
- **No status headers and no provenance.** The "Status: shipped — …" lines and the phase, slice and
  ASSUMPTION tags go. The "Source: `src/data/…`" pointers stay: they say where the code is.
- **`species-locked.md` is folded in, then deleted.** Each unit is dropped as a duplicate of a biome
  doc (naming where), moved into the biome doc if the biome doc lacks it, or dropped as superseded
  (with the code that supersedes it). Its "Cumulative new mechanics" section duplicates the Phase 4
  addenda and is dropped (the spec covers it in 4.2-D). Duncan deletes the file; its `src/` citations
  are repointed in 4.2-G.
- The content docs keep their own shape (species, creatures, spells, statuses, bosses); they have no
  Design / Engine halves. Every entry is a heading, as in the spec.

As the pilot, this slice settles the inventory format and the shape of a condensed file. Any change
to either is written into the phase brief before 4.2-C starts.

## Done when

`inventory B` passes, no "pending build" section or "until" marker is left in the content docs, and
a verify round has no findings.
