/**
 * Escapes special characters in a string for use in Telegram Markdown V1.
 * This function replaces characters that have special meaning in Telegram Markdown V1 with their escaped versions.
 * It ensures that the text can be safely used in Telegram messages without formatting issues.
 *
 * @param text - The text to escape
 * @returns The escaped text.
 */
export function escapeTelegramMarkdownTextElement(text: string): string {
  return text.replace(/([_*`[])/g, "\\$1"); // escape special characters
}
