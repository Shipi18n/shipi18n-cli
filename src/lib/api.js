import dotenv from 'dotenv';
dotenv.config();

const API_BASE_URL = process.env.SHIPI18N_API_URL || 'https://x9527l3blg.execute-api.us-east-1.amazonaws.com';

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
   */
  async translateJSON({ json, sourceLanguage = 'en', targetLanguages, preservePlaceholders = true }) {
    if (!this.apiKey) {
      throw new Error('API key is required. Set SHIPI18N_API_KEY or run: shipi18n config set apiKey YOUR_KEY');
    }

    const jsonString = typeof json === 'string' ? json : JSON.stringify(json);

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
        targetLanguages: JSON.stringify(targetLanguages),
        preservePlaceholders: String(preservePlaceholders),
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
      if (lang === 'warnings') {
        parsed.warnings = jsonStr;
        continue;
      }
      try {
        parsed[lang] = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
      } catch (e) {
        parsed[lang] = jsonStr;
      }
    }

    return parsed;
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
