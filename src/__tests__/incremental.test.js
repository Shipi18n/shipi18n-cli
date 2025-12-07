/**
 * Tests for incremental translation utilities
 */

import {
  flattenObject,
  unflattenObject,
  deepMerge,
  findMissingKeys,
  countKeys
} from '../utils/incremental.js';

describe('Incremental Translation Utilities', () => {
  describe('flattenObject', () => {
    test('flattens simple nested object', () => {
      const input = {
        nav: {
          home: 'Home',
          about: 'About'
        }
      };
      const expected = {
        'nav.home': 'Home',
        'nav.about': 'About'
      };
      expect(flattenObject(input)).toEqual(expected);
    });

    test('flattens deeply nested object', () => {
      const input = {
        a: {
          b: {
            c: {
              d: 'deep value'
            }
          }
        }
      };
      const expected = {
        'a.b.c.d': 'deep value'
      };
      expect(flattenObject(input)).toEqual(expected);
    });

    test('handles flat object (no nesting)', () => {
      const input = {
        home: 'Home',
        about: 'About'
      };
      expect(flattenObject(input)).toEqual(input);
    });

    test('preserves arrays as values', () => {
      const input = {
        tags: ['a', 'b', 'c']
      };
      expect(flattenObject(input)).toEqual({ tags: ['a', 'b', 'c'] });
    });

    test('handles empty object', () => {
      expect(flattenObject({})).toEqual({});
    });

    test('handles mixed nesting levels', () => {
      const input = {
        simple: 'value',
        nested: {
          deep: 'nested value'
        }
      };
      const expected = {
        'simple': 'value',
        'nested.deep': 'nested value'
      };
      expect(flattenObject(input)).toEqual(expected);
    });
  });

  describe('unflattenObject', () => {
    test('unflattens simple dot-notation keys', () => {
      const input = {
        'nav.home': 'Home',
        'nav.about': 'About'
      };
      const expected = {
        nav: {
          home: 'Home',
          about: 'About'
        }
      };
      expect(unflattenObject(input)).toEqual(expected);
    });

    test('unflattens deeply nested keys', () => {
      const input = {
        'a.b.c.d': 'deep value'
      };
      const expected = {
        a: {
          b: {
            c: {
              d: 'deep value'
            }
          }
        }
      };
      expect(unflattenObject(input)).toEqual(expected);
    });

    test('handles flat keys (no dots)', () => {
      const input = {
        home: 'Home',
        about: 'About'
      };
      expect(unflattenObject(input)).toEqual(input);
    });

    test('handles empty object', () => {
      expect(unflattenObject({})).toEqual({});
    });

    test('flatten and unflatten are inverse operations', () => {
      const original = {
        nav: {
          home: 'Home',
          about: 'About'
        },
        footer: {
          copyright: '© 2024'
        }
      };
      expect(unflattenObject(flattenObject(original))).toEqual(original);
    });
  });

  describe('deepMerge', () => {
    test('merges simple objects', () => {
      const target = { a: 1, b: 2 };
      const source = { c: 3 };
      expect(deepMerge(target, source)).toEqual({ a: 1, b: 2, c: 3 });
    });

    test('overwrites existing keys', () => {
      const target = { a: 1, b: 2 };
      const source = { b: 3 };
      expect(deepMerge(target, source)).toEqual({ a: 1, b: 3 });
    });

    test('merges nested objects', () => {
      const target = {
        nav: { home: 'Home' }
      };
      const source = {
        nav: { about: 'About' }
      };
      expect(deepMerge(target, source)).toEqual({
        nav: { home: 'Home', about: 'About' }
      });
    });

    test('does not mutate original objects', () => {
      const target = { a: 1 };
      const source = { b: 2 };
      const result = deepMerge(target, source);
      expect(target).toEqual({ a: 1 });
      expect(source).toEqual({ b: 2 });
      expect(result).toEqual({ a: 1, b: 2 });
    });

    test('handles arrays (replaces, does not merge)', () => {
      const target = { tags: ['a', 'b'] };
      const source = { tags: ['c'] };
      expect(deepMerge(target, source)).toEqual({ tags: ['c'] });
    });

    test('handles empty objects', () => {
      expect(deepMerge({}, { a: 1 })).toEqual({ a: 1 });
      expect(deepMerge({ a: 1 }, {})).toEqual({ a: 1 });
    });
  });

  describe('findMissingKeys', () => {
    test('finds keys in source but not in target', () => {
      const source = {
        nav: { home: 'Home', about: 'About', new: 'New Page' }
      };
      const target = {
        nav: { home: 'Inicio', about: 'Acerca de' }
      };
      const expected = {
        nav: { new: 'New Page' }
      };
      expect(findMissingKeys(source, target)).toEqual(expected);
    });

    test('returns empty object when all keys exist', () => {
      const source = {
        nav: { home: 'Home', about: 'About' }
      };
      const target = {
        nav: { home: 'Inicio', about: 'Acerca de' }
      };
      expect(findMissingKeys(source, target)).toEqual({});
    });

    test('returns all keys when target is empty', () => {
      const source = {
        nav: { home: 'Home', about: 'About' }
      };
      expect(findMissingKeys(source, {})).toEqual(source);
    });

    test('handles deeply nested missing keys', () => {
      const source = {
        a: {
          b: {
            c: 'existing',
            d: 'new'
          }
        }
      };
      const target = {
        a: {
          b: {
            c: 'existente'
          }
        }
      };
      expect(findMissingKeys(source, target)).toEqual({
        a: { b: { d: 'new' } }
      });
    });

    test('handles multiple missing keys at different levels', () => {
      const source = {
        nav: { home: 'Home', new: 'New' },
        footer: { copyright: 'Copyright', new: 'Also New' }
      };
      const target = {
        nav: { home: 'Inicio' },
        footer: { copyright: 'Derechos' }
      };
      expect(findMissingKeys(source, target)).toEqual({
        nav: { new: 'New' },
        footer: { new: 'Also New' }
      });
    });
  });

  describe('countKeys', () => {
    test('counts keys in flat object', () => {
      expect(countKeys({ a: 1, b: 2, c: 3 })).toBe(3);
    });

    test('counts keys in nested object', () => {
      const obj = {
        nav: { home: 'Home', about: 'About' },
        footer: { copyright: 'Copyright' }
      };
      expect(countKeys(obj)).toBe(3);
    });

    test('returns 0 for empty object', () => {
      expect(countKeys({})).toBe(0);
    });

    test('counts deeply nested keys', () => {
      const obj = {
        a: {
          b: {
            c: {
              d: 'deep'
            }
          }
        }
      };
      expect(countKeys(obj)).toBe(1);
    });
  });
});
