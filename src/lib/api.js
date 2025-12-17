import dotenv from 'dotenv';
dotenv.config();

const API_BASE_URL = process.env.SHIPI18N_API_URL || 'https://ydjkwckq3f.execute-api.us-east-1.amazonaws.com';

/**
 * Shipi18n API Client
 */
export class Shipi18nAPI {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.SHIPI18N_API_KEY;
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Translate JSON file
   * @param {Object} options
   * @param {Object|string} options.json - JSON content to translate
   * @param {string} options.sourceLanguage - Source language code
   * @param {string[]} options.targetLanguages - Target language codes
   * @param {boolean} options.preservePlaceholders - Preserve placeholders
   * @param {string} options.htmlHandling - How to handle HTML: none, strip, decode, preserve
   * @param {Object} options.fallback - Fallback options
   * @param {boolean} options.fallback.fallbackToSource - Use source content when translation missing (default: true)
   * @param {boolean} options.fallback.regionalFallback - Enable pt-BR -> pt fallback (default: true)
   * @param {string} options.fallback.fallbackLanguage - Custom fallback language
   * @param {string[]} options.skipKeys - Exact key paths to skip from translation
   * @param {string[]} options.skipPaths - Glob patterns to skip (e.g., "nav.*", "config.*.secret")
   */
  async translateJSON({
    json,
    sourceLanguage = 'en',
    targetLanguages,
    preservePlaceholders = true,
    htmlHandling = 'none',
    fallback = {},
    skipKeys = [],
    skipPaths = [],
  }) {
    if (!this.apiKey) {
      throw new Error('API key is required. Set SHIPI18N_API_KEY or run: shipi18n config set apiKey YOUR_KEY');
    }

    const {
      fallbackToSource = true,
      regionalFallback = true,
      fallbackLanguage,
    } = fallback;

    const sourceContent = typeof json === 'string' ? JSON.parse(json) : json;
    const jsonString = typeof json === 'string' ? json : JSON.stringify(json);

    // Process regional languages - add base languages for fallback
    const { processedTargets, regionalMap } = this.processRegionalLanguages(targetLanguages, regionalFallback);

    const response = await fetch(`${this.baseUrl}/api/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      body: JSON.stringify({
        inputMethod: 'text',
        text: jsonString,
        sourceLanguage,
        targetLanguages: JSON.stringify(processedTargets),
        preservePlaceholders: String(preservePlaceholders),
        htmlHandling,
        skipKeys,
        skipPaths,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
      const error = new Error(errorData.error?.message || errorData.message || `Translation failed: ${response.statusText}`);
      error.code = errorData.error?.code;
      error.status = response.status;
      throw error;
    }

    const result = await response.json();

    // Parse JSON strings back to objects
    const parsed = {};
    for (const [lang, jsonStr] of Object.entries(result)) {
      if (lang === 'warnings' || lang === 'namespaceInfo' || lang === 'skipped') {
        parsed[lang] = jsonStr;
        continue;
      }
      try {
        parsed[lang] = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
      } catch (e) {
        parsed[lang] = jsonStr;
      }
    }

    // Apply fallback logic
    return this.applyFallbacks(
      parsed,
      sourceContent,
      targetLanguages,
      sourceLanguage,
      fallbackToSource,
      regionalFallback,
      fallbackLanguage,
      regionalMap
    );
  }

  /**
   * Process regional language codes for fallback support
   */
  processRegionalLanguages(targetLanguages, regionalFallback) {
    const regionalMap = {};
    const processedTargets = [];
    const baseLanguagesAdded = new Set();

    for (const lang of targetLanguages) {
      if (lang.includes('-') && regionalFallback) {
        const baseLang = lang.split('-')[0];
        regionalMap[lang] = baseLang;

        if (!baseLanguagesAdded.has(baseLang) && !targetLanguages.includes(baseLang)) {
          processedTargets.push(baseLang);
          baseLanguagesAdded.add(baseLang);
        }
      }

      if (!processedTargets.includes(lang)) {
        processedTargets.push(lang);
      }
    }

    return { processedTargets, regionalMap };
  }

  /**
   * Apply fallback logic to translation results
   */
  applyFallbacks(result, sourceContent, targetLanguages, sourceLanguage, fallbackToSource, regionalFallback, fallbackLanguage, regionalMap) {
    const fallbackInfo = {
      used: false,
      languagesFallbackToSource: [],
      regionalFallbacks: {},
      keysFallback: {},
    };

    for (const lang of targetLanguages) {
      const translation = result[lang];

      // Case 1: Entire language missing
      if (!translation || Object.keys(translation).length === 0) {
        // Try regional fallback first
        if (regionalFallback && regionalMap[lang]) {
          const baseLang = regionalMap[lang];
          const baseTranslation = result[baseLang];

          if (baseTranslation && Object.keys(baseTranslation).length > 0) {
            result[lang] = { ...baseTranslation };
            fallbackInfo.used = true;
            fallbackInfo.regionalFallbacks[lang] = baseLang;
            continue;
          }
        }

        // Fall back to source
        if (fallbackToSource) {
          result[lang] = { ...sourceContent };
          fallbackInfo.used = true;
          fallbackInfo.languagesFallbackToSource.push(lang);
        }
        continue;
      }

      // Case 2: Check for missing keys
      if (fallbackToSource && typeof translation === 'object') {
        const missingKeys = this.findMissingKeys(sourceContent, translation);

        if (missingKeys.length > 0) {
          fallbackInfo.used = true;
          fallbackInfo.keysFallback[lang] = missingKeys;

          for (const key of missingKeys) {
            const fallbackValue = this.getNestedValue(sourceContent, key);

            // Try regional fallback first
            if (regionalFallback && regionalMap[lang]) {
              const baseLang = regionalMap[lang];
              const baseTranslation = result[baseLang];
              const baseValue = baseTranslation ? this.getNestedValue(baseTranslation, key) : undefined;

              if (baseValue !== undefined) {
                this.setNestedValue(translation, key, baseValue);
                continue;
              }
            }

            if (fallbackValue !== undefined) {
              this.setNestedValue(translation, key, fallbackValue);
            }
          }
        }
      }
    }

    if (fallbackInfo.used) {
      result.fallbackInfo = fallbackInfo;
    }

    return result;
  }

  /**
   * Find missing keys in translation
   */
  findMissingKeys(source, translation, prefix = '') {
    const missing = [];

    for (const key of Object.keys(source)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const sourceValue = source[key];
      const translationValue = translation[key];

      if (translationValue === undefined || translationValue === null || translationValue === '') {
        missing.push(fullKey);
      } else if (
        typeof sourceValue === 'object' &&
        sourceValue !== null &&
        !Array.isArray(sourceValue) &&
        typeof translationValue === 'object' &&
        translationValue !== null
      ) {
        missing.push(...this.findMissingKeys(sourceValue, translationValue, fullKey));
      }
    }

    return missing;
  }

  /**
   * Get nested value from object using dot notation
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      if (current && typeof current === 'object' && key in current) {
        return current[key];
      }
      return undefined;
    }, obj);
  }

  /**
   * Set nested value in object using dot notation
   */
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * List translation keys
   */
  async listKeys() {
    if (!this.apiKey) {
      throw new Error('API key is required');
    }

    const response = await fetch(`${this.baseUrl}/api/keys`, {
      method: 'GET',
      headers: {
        'X-API-Key': this.apiKey,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(errorData.error?.message || errorData.message || 'Failed to list keys');
    }

    return response.json();
  }

  /**
   * Delete a translation key
   */
  async deleteKey(keyId) {
    if (!this.apiKey) {
      throw new Error('API key is required');
    }

    const response = await fetch(`${this.baseUrl}/api/keys/${keyId}`, {
      method: 'DELETE',
      headers: {
        'X-API-Key': this.apiKey,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(errorData.error?.message || errorData.message || 'Failed to delete key');
    }

    return response.json();
  }

  /**
   * Export translation keys
   */
  async exportKeys(format = 'json') {
    if (!this.apiKey) {
      throw new Error('API key is required');
    }

    const response = await fetch(`${this.baseUrl}/api/keys/export/${format}`, {
      method: 'GET',
      headers: {
        'X-API-Key': this.apiKey,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(errorData.error?.message || errorData.message || 'Failed to export keys');
    }

    return response.json();
  }
}
