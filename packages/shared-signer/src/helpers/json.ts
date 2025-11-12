/**
 * Replaces bigint values with their string representation
 * usually used in JSON.stringify
 * @param key
 * @param value
 * @returns
 */
export function bigintReplacer(key: string, value: unknown) {
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
}
