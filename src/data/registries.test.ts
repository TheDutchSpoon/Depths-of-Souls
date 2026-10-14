import { describe, expect, it } from 'vitest'
import { STOCK_SCRIPTS_BY_ID } from './scripts'
import { STATUS_REGISTRY } from './statuses'
import { TRAIT_REGISTRY } from './traits'
import { DEFAULT_REGISTRIES } from './registries'

describe('DEFAULT_REGISTRIES', () => {
  it('holds the shipped script, trait and status registries', () => {
    expect(DEFAULT_REGISTRIES.scripts).toBe(STOCK_SCRIPTS_BY_ID)
    expect(DEFAULT_REGISTRIES.traits).toBe(TRAIT_REGISTRY)
    expect(DEFAULT_REGISTRIES.statuses).toBe(STATUS_REGISTRY)
  })
})
