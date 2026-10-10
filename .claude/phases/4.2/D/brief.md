# 4.2-D — Condense effects, responses, statuses

Phase brief: `.claude/phases/4.2/brief.md`. Loop: condense. Golden policy: **byte-identical**.

## Scope

Condense `spec/effects.md`, `spec/responses.md` and `spec/statuses.md`, folding their `## To fold`
sections (most of the Phase 4 addenda) into the halves. This is the largest slice: it holds the
heaviest duplication (the hook execution model, loop safety, the trait model and the status
lifecycle are each in both old files). The v1 status content and the status numbers go to the
content docs (rule 7). If the inventory passes 250 rows, split the slice per file before writing.

## Known from earlier slices

- **From 4.2-B:** `spec/statuses.md` "Status effects" restates the DoT potencies, now in
  `content/rotcap-hollow.md` "Damage over time"; Weaken, Vulnerability and Regen have no content
  home beyond their spells' entries; `spec/statuses.md` cites `species/species-locked.md`, which is
  deleted.
- **From 4.2-C:** `spec/effects.md`'s specializations bullet (under "Unspecified magnitude ⇒
  100%.": specs are data, the Σ = 1000 load check, derived perk points, `setPerkLevel` /
  `refundAllPerks`, no phase tag on `PerkDef`) is progression engine rules. Move it to
  `spec/progression.md` `## Engine rules`, and the store-action details to `spec/store.md` "Store
  actions".
- **From 4.2-C:** a whole subsystem designed for a later phase goes to the file's `## Not built`
  half (phase brief, rule 1), not to `## Design`.

## Done when

`inventory D` passes, no `## To fold` section is left in the three files, and a verify round has no
findings.
