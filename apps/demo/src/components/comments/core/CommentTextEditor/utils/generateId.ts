const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/**
 * Generates a unique ID using timestamp and random characters
 * Format: timestamp-randomString
 * Example: 1710851234567-x7y2z9
 */
export function generateId(length: number = 6): string {
  const timestamp = Date.now().toString();
  let randomStr = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * CHARS.length);

    randomStr += CHARS[randomIndex];
  }

  return `${timestamp}-${randomStr}`;
}
