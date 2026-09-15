// The library barrel (CONVENTIONS "Data layer — carriers vs. composition"): re-exports every
// individual spell const from its grouping file. No aggregated `STOCK_SPELLS` registry here --
// data-layer carrier reorg found it genuinely unreferenced (generation reads `biome.spellPool`,
// never a flat spell list), so it wasn't recreated.
export * from './core'
export * from './overgrowth'
