// A test-only helper. Freezes a value recursively (plain objects, arrays, Maps, Sets and their
// nested values) so any write anywhere in the tree throws (strict mode) -- engine tests that
// resolve the same snapshot more than once, or assert on a snapshot AFTER resolving it, wrap it in
// this helper to prove the input was never mutated (`CONVENTIONS.md#snapshots-are-never-written-to`).
//
// `Object.freeze` doesn't block `Map.prototype.set/delete/clear` or `Set.prototype.add/delete/
// clear`, so a Map or Set gets throwing own methods installed first (non-enumerable, so an equality
// check on a frozen Map is unaffected), then is frozen like any object. That holds
// `CombatState.scripts` and `.statuses` to "never written to" like the rest of the state.
//
// A registry shared by a whole test file (a module-level `Map` handed to a fixture) is locked for
// the rest of that file once any frozen state carries it; a test that writes to one copies it first.

const MAP_WRITES = ['set', 'delete', 'clear'] as const
const SET_WRITES = ['add', 'delete', 'clear'] as const

function lockWrites(collection: Map<unknown, unknown> | Set<unknown>): void {
  const writes: readonly string[] = collection instanceof Map ? MAP_WRITES : SET_WRITES
  for (const method of writes) {
    Object.defineProperty(collection, method, {
      value: () => {
        throw new TypeError(
          `cannot call ${method}() on a frozen ${collection instanceof Map ? 'Map' : 'Set'}`,
        )
      },
      enumerable: false,
    })
  }
}

function isLocked(collection: Map<unknown, unknown> | Set<unknown>): boolean {
  return Object.hasOwn(collection, collection instanceof Map ? 'set' : 'add')
}

export function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value
  const isCollection = value instanceof Map || value instanceof Set
  if (Object.isFrozen(value)) {
    // A Map/Set frozen without the lock can't be given one any more (a frozen object takes no
    // new properties), so its writes would pass silently: refuse it instead.
    if (isCollection && !isLocked(value)) {
      throw new Error(
        'deepFreeze: a Map/Set was frozen with Object.freeze before deepFreeze, so its writes cannot be locked; hand deepFreeze the unfrozen collection',
      )
    }
    return value
  }

  if (isCollection) lockWrites(value)
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
