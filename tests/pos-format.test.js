/**
 * TDD tests for part-of-speech formatting in English definitions.
 * Verifies that a full-width colon and space separates POS from definition text.
 */
import { describe, test, expect } from 'vitest';
import { parseEnglishDefinition } from '../src/definition-utils.js';

describe('parseEnglishDefinition', () => {
  test('extracts POS and adds full-width colon separator', () => {
    const result = parseEnglishDefinition('(Adverb) in a manner that is clear');
    expect(result).toEqual({
      pos: 'Adverb',
      separator: '\uFF1A ',
      definition: 'in a manner that is clear',
    });
  });

  test('handles multi-word POS like "Noun phrase"', () => {
    const result = parseEnglishDefinition('(Noun phrase) a group of words');
    expect(result).toEqual({
      pos: 'Noun phrase',
      separator: '\uFF1A ',
      definition: 'a group of words',
    });
  });

  test('returns null POS when no parenthesized POS is present', () => {
    const result = parseEnglishDefinition('in a manner that is clear');
    expect(result).toEqual({
      pos: null,
      separator: '',
      definition: 'in a manner that is clear',
    });
  });

  test('handles POS with extra whitespace after closing paren', () => {
    const result = parseEnglishDefinition('(Verb)   to move quickly');
    expect(result).toEqual({
      pos: 'Verb',
      separator: '\uFF1A ',
      definition: 'to move quickly',
    });
  });

  test('does not treat mid-text parentheses as POS', () => {
    const result = parseEnglishDefinition('to feel (something) deeply');
    expect(result).toEqual({
      pos: null,
      separator: '',
      definition: 'to feel (something) deeply',
    });
  });

  test('handles empty input', () => {
    const result = parseEnglishDefinition('');
    expect(result).toEqual({
      pos: null,
      separator: '',
      definition: '',
    });
  });

  test('handles POS-only input with no definition', () => {
    const result = parseEnglishDefinition('(Adjective)');
    expect(result).toEqual({
      pos: 'Adjective',
      separator: '\uFF1A ',
      definition: '',
    });
  });
});
