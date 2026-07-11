/**
 * JSON.stringify that never throws.
 *
 * Handles the values that routinely appear in logged `data` / request bodies
 * but break `JSON.stringify`: circular references, BigInt, and Error objects
 * (whose useful fields are non-enumerable). Falls back to `String(value)` if
 * serialization still fails for any reason.
 */
export function safeStringify(value: any, indent?: number): string {
  const seen = new WeakSet();

  const replacer = (_key: string, val: any) => {
    if (typeof val === 'bigint') {
      return `${val.toString()}n`;
    }
    if (val instanceof Error) {
      return { name: val.name, message: val.message, stack: val.stack };
    }
    if (typeof val === 'object' && val !== null) {
      if (seen.has(val)) {
        return '[Circular]';
      }
      seen.add(val);
    }
    return val;
  };

  try {
    return JSON.stringify(value, replacer, indent);
  } catch {
    try {
      return String(value);
    } catch {
      return '[Unserializable]';
    }
  }
}
