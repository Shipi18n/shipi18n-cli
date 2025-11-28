/**
 * Tests for Shipi18n CLI API Client
 * These tests actually import and test the source files
 */

import { Shipi18nAPI } from '../lib/api.js';

// Mock fetch globally
const originalFetch = global.fetch;
let mockFetchResponse = {};
let mockFetchError = null;
let lastFetchCall = null;

beforeAll(() => {
  global.fetch = async (url, options) => {
    lastFetchCall = { url, options };

    if (mockFetchError) {
      throw mockFetchError;
    }

    return {
      ok: mockFetchResponse.ok !== false,
      status: mockFetchResponse.status || 200,
      statusText: mockFetchResponse.statusText || 'OK',
      json: mockFetchResponse.jsonError
        ? async () => { throw new Error('JSON parse error'); }
        : async () => mockFetchResponse.data || {},
    };
  };
});

afterAll(() => {
  global.fetch = originalFetch;
});

beforeEach(() => {
  mockFetchResponse = { ok: true, data: {} };
  mockFetchError = null;
  lastFetchCall = null;
  delete process.env.SHIPI18N_API_KEY;
  delete process.env.SHIPI18N_API_URL;
});

describe('Shipi18nAPI', () => {
  describe('constructor', () => {
    test('accepts API key as parameter', () => {
      const api = new Shipi18nAPI('sk_test_123');
      expect(api.apiKey).toBe('sk_test_123');
    });

    test('falls back to environment variable', () => {
      process.env.SHIPI18N_API_KEY = 'sk_env_456';
      const api = new Shipi18nAPI();
      expect(api.apiKey).toBe('sk_env_456');
    });

    test('uses default API URL', () => {
      const api = new Shipi18nAPI('test-key');
      expect(api.baseUrl).toBe('https://x9527l3blg.execute-api.us-east-1.amazonaws.com');
    });
  });

  describe('translateJSON', () => {
    test('throws error when API key is missing', async () => {
      const api = new Shipi18nAPI();
      await expect(
        api.translateJSON({ json: {}, targetLanguages: ['es'] })
      ).rejects.toThrow('API key is required');
    });

    test('converts object to JSON string', async () => {
      mockFetchResponse = { ok: true, data: { es: '{"greeting":"Hola"}' } };
      const api = new Shipi18nAPI('test-key');

      await api.translateJSON({
        json: { greeting: 'Hello' },
        targetLanguages: ['es'],
      });

      const body = JSON.parse(lastFetchCall.options.body);
      expect(body.text).toBe('{"greeting":"Hello"}');
    });

    test('accepts string JSON input', async () => {
      mockFetchResponse = { ok: true, data: { es: '{"key":"valor"}' } };
      const api = new Shipi18nAPI('test-key');

      await api.translateJSON({
        json: '{"key": "value"}',
        targetLanguages: ['es'],
      });

      const body = JSON.parse(lastFetchCall.options.body);
      expect(body.text).toBe('{"key": "value"}');
    });

    test('formats request body correctly', async () => {
      mockFetchResponse = { ok: true, data: { es: '{}' } };
      const api = new Shipi18nAPI('test-key');

      await api.translateJSON({
        json: { greeting: 'Hello' },
        sourceLanguage: 'en',
        targetLanguages: ['es', 'fr'],
        preservePlaceholders: true,
      });

      const body = JSON.parse(lastFetchCall.options.body);
      expect(body.inputMethod).toBe('text');
      expect(body.sourceLanguage).toBe('en');
      expect(body.targetLanguages).toBe('["es","fr"]');
      expect(body.preservePlaceholders).toBe('true');
    });

    test('includes API key in headers', async () => {
      mockFetchResponse = { ok: true, data: {} };
      const api = new Shipi18nAPI('sk_test_123');

      await api.translateJSON({
        json: {},
        targetLanguages: ['es'],
      });

      expect(lastFetchCall.options.headers['Content-Type']).toBe('application/json');
      expect(lastFetchCall.options.headers['X-API-Key']).toBe('sk_test_123');
    });

    test('parses JSON response correctly', async () => {
      mockFetchResponse = {
        ok: true,
        data: {
          es: '{"greeting":"Hola"}',
          fr: '{"greeting":"Bonjour"}',
        },
      };
      const api = new Shipi18nAPI('test-key');

      const result = await api.translateJSON({
        json: { greeting: 'Hello' },
        targetLanguages: ['es', 'fr'],
      });

      expect(result.es.greeting).toBe('Hola');
      expect(result.fr.greeting).toBe('Bonjour');
    });

    test('handles warnings in response', async () => {
      mockFetchResponse = {
        ok: true,
        data: {
          es: '{"greeting":"Hola"}',
          warnings: { hasIssues: true, totalIssues: 1 },
        },
      };
      const api = new Shipi18nAPI('test-key');

      const result = await api.translateJSON({
        json: { greeting: 'Hello' },
        targetLanguages: ['es'],
      });

      expect(result.warnings.hasIssues).toBe(true);
      expect(result.es.greeting).toBe('Hola');
    });

    test('handles non-JSON string response', async () => {
      mockFetchResponse = {
        ok: true,
        data: { es: 'plain text response' },
      };
      const api = new Shipi18nAPI('test-key');

      const result = await api.translateJSON({
        json: { text: 'Hello' },
        targetLanguages: ['es'],
      });

      expect(result.es).toBe('plain text response');
    });

    test('handles already parsed JSON response', async () => {
      mockFetchResponse = {
        ok: true,
        data: { es: { greeting: 'Hola' } },
      };
      const api = new Shipi18nAPI('test-key');

      const result = await api.translateJSON({
        json: { greeting: 'Hello' },
        targetLanguages: ['es'],
      });

      expect(result.es.greeting).toBe('Hola');
    });

    test('handles API error response', async () => {
      mockFetchResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        data: { error: { message: 'Invalid API key', code: 'INVALID_KEY' } },
      };
      const api = new Shipi18nAPI('bad-key');

      try {
        await api.translateJSON({ json: {}, targetLanguages: ['es'] });
        fail('Expected error');
      } catch (error) {
        expect(error.message).toBe('Invalid API key');
        expect(error.code).toBe('INVALID_KEY');
        expect(error.status).toBe(401);
      }
    });

    test('handles API error with flat message', async () => {
      mockFetchResponse = {
        ok: false,
        status: 400,
        data: { message: 'Bad request' },
      };
      const api = new Shipi18nAPI('test-key');

      await expect(
        api.translateJSON({ json: {}, targetLanguages: ['es'] })
      ).rejects.toThrow('Bad request');
    });

    test('handles API error when JSON parsing fails', async () => {
      mockFetchResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        jsonError: true,
      };
      const api = new Shipi18nAPI('test-key');

      await expect(
        api.translateJSON({ json: {}, targetLanguages: ['es'] })
      ).rejects.toThrow('Internal Server Error');
    });
  });

  describe('listKeys', () => {
    test('throws error when API key is missing', async () => {
      const api = new Shipi18nAPI();
      await expect(api.listKeys()).rejects.toThrow('API key is required');
    });

    test('uses correct endpoint and method', async () => {
      mockFetchResponse = { ok: true, data: { keys: [] } };
      const api = new Shipi18nAPI('test-key');

      await api.listKeys();

      expect(lastFetchCall.url).toContain('/api/keys');
      expect(lastFetchCall.options.method).toBe('GET');
    });

    test('returns keys data', async () => {
      mockFetchResponse = {
        ok: true,
        data: { keys: [{ id: 'key1', value: 'Hello' }] },
      };
      const api = new Shipi18nAPI('test-key');

      const result = await api.listKeys();
      expect(result.keys).toHaveLength(1);
    });

    test('handles error response', async () => {
      mockFetchResponse = {
        ok: false,
        status: 500,
        data: { error: { message: 'Server error' } },
      };
      const api = new Shipi18nAPI('test-key');

      await expect(api.listKeys()).rejects.toThrow('Server error');
    });

    test('handles error when JSON parsing fails', async () => {
      mockFetchResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        jsonError: true,
      };
      const api = new Shipi18nAPI('test-key');

      await expect(api.listKeys()).rejects.toThrow('Internal Server Error');
    });
  });

  describe('deleteKey', () => {
    test('throws error when API key is missing', async () => {
      const api = new Shipi18nAPI();
      await expect(api.deleteKey('key123')).rejects.toThrow('API key is required');
    });

    test('includes key ID in URL', async () => {
      mockFetchResponse = { ok: true, data: { success: true } };
      const api = new Shipi18nAPI('test-key');

      await api.deleteKey('key_abc123');

      expect(lastFetchCall.url).toContain('/api/keys/key_abc123');
    });

    test('uses DELETE method', async () => {
      mockFetchResponse = { ok: true, data: { success: true } };
      const api = new Shipi18nAPI('test-key');

      await api.deleteKey('key123');

      expect(lastFetchCall.options.method).toBe('DELETE');
    });

    test('handles error response', async () => {
      mockFetchResponse = {
        ok: false,
        status: 404,
        data: { error: { message: 'Key not found' } },
      };
      const api = new Shipi18nAPI('test-key');

      await expect(api.deleteKey('invalid')).rejects.toThrow('Key not found');
    });

    test('handles error when JSON parsing fails', async () => {
      mockFetchResponse = {
        ok: false,
        status: 500,
        statusText: 'Server Error',
        jsonError: true,
      };
      const api = new Shipi18nAPI('test-key');

      await expect(api.deleteKey('key123')).rejects.toThrow('Server Error');
    });
  });

  describe('exportKeys', () => {
    test('throws error when API key is missing', async () => {
      const api = new Shipi18nAPI();
      await expect(api.exportKeys()).rejects.toThrow('API key is required');
    });

    test('defaults to json format', async () => {
      mockFetchResponse = { ok: true, data: {} };
      const api = new Shipi18nAPI('test-key');

      await api.exportKeys();

      expect(lastFetchCall.url).toContain('/api/keys/export/json');
    });

    test('supports csv format', async () => {
      mockFetchResponse = { ok: true, data: {} };
      const api = new Shipi18nAPI('test-key');

      await api.exportKeys('csv');

      expect(lastFetchCall.url).toContain('/api/keys/export/csv');
    });

    test('uses GET method', async () => {
      mockFetchResponse = { ok: true, data: {} };
      const api = new Shipi18nAPI('test-key');

      await api.exportKeys();

      expect(lastFetchCall.options.method).toBe('GET');
    });

    test('handles error response', async () => {
      mockFetchResponse = {
        ok: false,
        status: 403,
        data: { message: 'Export not allowed' },
      };
      const api = new Shipi18nAPI('test-key');

      await expect(api.exportKeys()).rejects.toThrow('Export not allowed');
    });

    test('handles error when JSON parsing fails', async () => {
      mockFetchResponse = {
        ok: false,
        status: 500,
        statusText: 'Server Error',
        jsonError: true,
      };
      const api = new Shipi18nAPI('test-key');

      await expect(api.exportKeys()).rejects.toThrow('Server Error');
    });
  });
});
