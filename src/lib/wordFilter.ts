const NOT_ALLOWED_WORDS = [
  'spam',
  'scam',
  'phishing',
  'malware',
  'hack',
  'casino',
  'porn',
  'viagra',
  'xxx',
  'free_money',
  'get_rich'
];

/**
 * Checks if the given text contains any of the prohibited/not allowed words.
 */
export function containsProhibitedWords(text: string | null | undefined): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return NOT_ALLOWED_WORDS.some(word => lower.includes(word));
}

/**
 * Helper to clean or detect prohibited words specifically
 */
export function getProhibitedWordsPresent(text: string | null | undefined): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  return NOT_ALLOWED_WORDS.filter(word => lower.includes(word));
}
