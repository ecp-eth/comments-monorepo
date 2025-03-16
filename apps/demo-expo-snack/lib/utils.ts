/**
 * Used in JSON.stringify top replaces all bigint values with their string representation
 * @param key
 * @param value
 * @returns
 */
export function bigintReplacer(_: string, value: unknown) {
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
}
