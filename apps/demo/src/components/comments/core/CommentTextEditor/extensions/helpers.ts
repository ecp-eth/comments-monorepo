export function isValidQuery(
  query: string,
  minimumQueryLength: number,
): boolean {
  return query.trim().length >= minimumQueryLength && !query.startsWith(".");
}
