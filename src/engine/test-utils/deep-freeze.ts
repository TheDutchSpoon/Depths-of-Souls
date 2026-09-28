// Phase 4.1-B (B3): a test-only helper. Freezes a value recursively (plain objects, arrays,
// and their own nested values) so any write anywhere in the tree throws (strict mode) --
// engine tests that resolve the same snapshot more than once, or assert on a snapshot AFTER
// resolving it, wrap it in this helper to prove the input was never mutated.
//
// `Map`/`Set` instances (CombatState.scripts/statuses) are frozen at the top level only --
// Object.freeze doesn't block Map.prototype.set/delete, but the resolver never mutates these
// registries in place anywhere (they're read-only for the whole fight), so this is a
// non-issue in practice, not a gap this helper needs to close.

export function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value
  if (Object.isFrozen(value)) return value

  Object.freeze(value)

  if (value instanceof Map) {
    for (const entry of value.values()) deepFreeze(entry)
    return value
  }
  if (value instanceof Set) {
    for (const entry of value.values()) deepFreeze(entry)
    return value
  }
  for (const key of Object.keys(value)) {
    deepFreeze((value as Record<string, unknown>)[key])
  }
  return value
}
