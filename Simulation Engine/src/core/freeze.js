/**
 * Deeply freezes an object, its nested objects, and arrays.
 * Traverses already-frozen parents to ensure nested mutable objects are frozen.
 * Employs a WeakSet to prevent infinite recursion on circular structures.
 *
 * Supported types: Plain objects, arrays, primitives, and functions.
 * Unsupported collection types (e.g. Map, Set) retain internal state semantics
 * and must not be used in serialized simulation execution traces.
 *
 * @template T
 * @param {T} obj
 * @param {WeakSet<object>} [visited=new WeakSet()]
 * @returns {Readonly<T>}
 */
export function deepFreeze(obj, visited = new WeakSet()) {
  if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function')) {
    return obj;
  }

  if (visited.has(obj)) {
    return obj;
  }
  visited.add(obj);

  // Traverse own properties, even if obj was already shallow-frozen
  const keys = Reflect.ownKeys(obj);
  for (const key of keys) {
    try {
      const desc = Object.getOwnPropertyDescriptor(obj, key);
      if (desc && 'value' in desc) {
        const val = desc.value;
        if (val !== null && (typeof val === 'object' || typeof val === 'function')) {
          deepFreeze(val, visited);
        }
      }
    } catch {
      // Ignore properties with throwing getters
    }
  }

  return Object.freeze(obj);
}
