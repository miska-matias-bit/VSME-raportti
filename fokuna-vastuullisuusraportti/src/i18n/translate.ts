import { translationsFi } from './fi';

/**
 * Fixes common text issues like missing spaces between sentences.
 * e.g., "service.It" -> "service. It"
 */
export function normalizeText(text: string | undefined): string | undefined {
  if (!text) return text;
  
  // Fix missing space after period if followed by a capital letter
  // but not in the middle of a number (e.g., 1.2)
  return text.replace(/([a-z])\.([A-Z])/g, '$1. $2');
}

/**
 * Translates text to Finnish if a mapping exists.
 * Falls back to the original text.
 */
export function translateFi(text: string | undefined): string | undefined {
  if (!text) return text;

  const normalized = normalizeText(text);
  if (!normalized) return normalized;

  // Check if we have a translation for the normalized text
  if (translationsFi[normalized]) {
    return translationsFi[normalized];
  }

  // Fallback to normalized original
  return normalized;
}
