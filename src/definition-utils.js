/**
 * Parses an English definition string, extracting the part of speech
 * (if present in leading parentheses) and the definition text,
 * separated by a full-width colon and space.
 */
export function parseEnglishDefinition(raw) {
  const posMatch = raw.match(/^\(([^)]+)\)\s*/);
  if (posMatch) {
    return {
      pos: posMatch[1],
      separator: '\uFF1A ',
      definition: raw.slice(posMatch[0].length),
    };
  }
  return {
    pos: null,
    separator: '',
    definition: raw,
  };
}
