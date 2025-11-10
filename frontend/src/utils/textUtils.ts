/**
 * Truncate text to a specified length and add ellipsis
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
};

/**
 * Check if text is truncated
 * @param text - The original text
 * @param maxLength - Maximum length before truncation
 * @returns True if text would be truncated
 */
export const isTruncated = (text: string, maxLength: number): boolean => {
  if (!text) return false;
  return text.length > maxLength;
};
