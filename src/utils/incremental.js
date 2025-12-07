/**
 * Utilities for incremental translation
 */

/**
 * Flatten a nested object into dot-notation keys
 * @param {Object} obj - Nested object
 * @param {string} prefix - Key prefix (used for recursion)
 * @returns {Object} Flattened object with dot-notation keys
 */
export function flattenObject(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey));
    } else {
      result[newKey] = value;
    }
  }
  return result;
}

/**
 * Unflatten dot-notation keys back into nested object
 * @param {Object} obj - Flattened object with dot-notation keys
 * @returns {Object} Nested object
 */
export function unflattenObject(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const keys = key.split('.');
    let current = result;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
  }
  return result;
}

/**
 * Deep merge two objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object to merge in
 * @returns {Object} Merged object
 */
export function deepMerge(target, source) {
  const result = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = deepMerge(result[key] || {}, value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Find keys that exist in source but not in target
 * @param {Object} sourceJson - Source JSON object
 * @param {Object} targetJson - Target JSON object
 * @returns {Object} Object containing only missing keys
 */
export function findMissingKeys(sourceJson, targetJson) {
  const sourceFlat = flattenObject(sourceJson);
  const targetFlat = flattenObject(targetJson);

  const missingKeys = {};
  for (const [key, value] of Object.entries(sourceFlat)) {
    if (!(key in targetFlat)) {
      missingKeys[key] = value;
    }
  }

  return unflattenObject(missingKeys);
}

/**
 * Count the number of leaf keys in a nested object
 * @param {Object} obj - Object to count keys in
 * @returns {number} Number of leaf keys
 */
export function countKeys(obj) {
  return Object.keys(flattenObject(obj)).length;
}
