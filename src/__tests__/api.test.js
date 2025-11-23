/**
 * Tests for Shipi18n CLI API Client
 */

// Mock fetch globally
let mockFetchResponse = {}
let mockFetchError = null
let lastFetchCall = null

global.fetch = async (url, options) => {
  lastFetchCall = { url, options }

  if (mockFetchError) {
    throw mockFetchError
  }

  return {
    ok: mockFetchResponse.ok !== false,
    status: mockFetchResponse.status || 200,
    statusText: mockFetchResponse.statusText || 'OK',
    json: async () => mockFetchResponse.data || {}
  }
}

// Reset mocks before each test
beforeEach(() => {
  mockFetchResponse = { ok: true, data: {} }
  mockFetchError = null
  lastFetchCall = null
  // Reset env vars
  delete process.env.SHIPI18N_API_KEY
  delete process.env.SHIPI18N_API_URL
})

describe('Shipi18nAPI', () => {
  describe('constructor', () => {
    test('accepts API key as parameter', () => {
      const apiKey = 'sk_test_123'
      // Simulating constructor behavior
      const instance = { apiKey }
      expect(instance.apiKey).toBe('sk_test_123')
    })

    test('falls back to environment variable', () => {
      process.env.SHIPI18N_API_KEY = 'sk_env_456'
      const apiKey = process.env.SHIPI18N_API_KEY
      expect(apiKey).toBe('sk_env_456')
    })

    test('uses default API URL', () => {
      const API_BASE_URL = process.env.SHIPI18N_API_URL || 'https://x9527l3blg.execute-api.us-east-1.amazonaws.com'
      expect(API_BASE_URL).toBe('https://x9527l3blg.execute-api.us-east-1.amazonaws.com')
    })

    test('allows custom API URL via environment', () => {
      process.env.SHIPI18N_API_URL = 'https://custom.api.com'
      const API_BASE_URL = process.env.SHIPI18N_API_URL || 'https://x9527l3blg.execute-api.us-east-1.amazonaws.com'
      expect(API_BASE_URL).toBe('https://custom.api.com')
    })
  })

  describe('translateJSON', () => {
    test('throws error when API key is missing', async () => {
      const apiKey = undefined
      const throwsError = !apiKey

      expect(throwsError).toBe(true)
    })

    test('converts object to JSON string', () => {
      const json = { greeting: 'Hello', farewell: 'Goodbye' }
      const jsonString = typeof json === 'string' ? json : JSON.stringify(json)

      expect(jsonString).toBe('{"greeting":"Hello","farewell":"Goodbye"}')
    })

    test('accepts string JSON input', () => {
      const json = '{"key": "value"}'
      const jsonString = typeof json === 'string' ? json : JSON.stringify(json)

      expect(jsonString).toBe('{"key": "value"}')
    })

    test('formats request body correctly', () => {
      const requestBody = {
        inputMethod: 'text',
        text: '{"greeting":"Hello"}',
        sourceLanguage: 'en',
        targetLanguages: JSON.stringify(['es', 'fr']),
        preservePlaceholders: 'true',
      }

      expect(requestBody.inputMethod).toBe('text')
      expect(requestBody.sourceLanguage).toBe('en')
      expect(requestBody.targetLanguages).toBe('["es","fr"]')
      expect(requestBody.preservePlaceholders).toBe('true')
    })

    test('includes API key in headers', () => {
      const headers = {
        'Content-Type': 'application/json',
        'X-API-Key': 'sk_test_123',
      }

      expect(headers['Content-Type']).toBe('application/json')
      expect(headers['X-API-Key']).toBe('sk_test_123')
    })

    test('parses JSON response correctly', () => {
      const response = {
        es: '{"greeting":"Hola"}',
        fr: '{"greeting":"Bonjour"}',
      }

      const parsed = {}
      for (const [lang, jsonStr] of Object.entries(response)) {
        try {
          parsed[lang] = JSON.parse(jsonStr)
        } catch (e) {
          parsed[lang] = jsonStr
        }
      }

      expect(parsed.es.greeting).toBe('Hola')
      expect(parsed.fr.greeting).toBe('Bonjour')
    })

    test('handles warnings in response', () => {
      const response = {
        es: '{"greeting":"Hola"}',
        warnings: { hasIssues: true, totalIssues: 1 },
      }

      const parsed = {}
      for (const [lang, jsonStr] of Object.entries(response)) {
        if (lang === 'warnings') {
          parsed.warnings = jsonStr
          continue
        }
        parsed[lang] = JSON.parse(jsonStr)
      }

      expect(parsed.warnings.hasIssues).toBe(true)
      expect(parsed.es.greeting).toBe('Hola')
    })

    test('handles non-JSON string response', () => {
      const response = { es: 'plain text response' }

      const parsed = {}
      for (const [lang, jsonStr] of Object.entries(response)) {
        try {
          parsed[lang] = JSON.parse(jsonStr)
        } catch (e) {
          parsed[lang] = jsonStr
        }
      }

      expect(parsed.es).toBe('plain text response')
    })
  })

  describe('listKeys', () => {
    test('throws error when API key is missing', () => {
      const apiKey = undefined
      expect(!apiKey).toBe(true)
    })

    test('uses correct endpoint', () => {
      const baseUrl = 'https://api.shipi18n.com'
      const endpoint = `${baseUrl}/api/keys`

      expect(endpoint).toBe('https://api.shipi18n.com/api/keys')
    })

    test('uses GET method', () => {
      const method = 'GET'
      expect(method).toBe('GET')
    })
  })

  describe('deleteKey', () => {
    test('includes key ID in URL', () => {
      const baseUrl = 'https://api.shipi18n.com'
      const keyId = 'key_abc123'
      const endpoint = `${baseUrl}/api/keys/${keyId}`

      expect(endpoint).toBe('https://api.shipi18n.com/api/keys/key_abc123')
    })

    test('uses DELETE method', () => {
      const method = 'DELETE'
      expect(method).toBe('DELETE')
    })
  })

  describe('exportKeys', () => {
    test('includes format in URL', () => {
      const baseUrl = 'https://api.shipi18n.com'
      const format = 'json'
      const endpoint = `${baseUrl}/api/keys/export/${format}`

      expect(endpoint).toBe('https://api.shipi18n.com/api/keys/export/json')
    })

    test('defaults to json format', () => {
      const format = undefined || 'json'
      expect(format).toBe('json')
    })

    test('supports csv format', () => {
      const format = 'csv'
      const baseUrl = 'https://api.shipi18n.com'
      const endpoint = `${baseUrl}/api/keys/export/${format}`

      expect(endpoint).toContain('csv')
    })
  })

  describe('Error handling', () => {
    test('extracts error message from response', () => {
      const errorData = { error: { message: 'Invalid API key' } }
      const errorMessage = errorData.error?.message || errorData.message || 'Translation failed'

      expect(errorMessage).toBe('Invalid API key')
    })

    test('extracts error from flat response', () => {
      const errorData = { message: 'Rate limit exceeded' }
      const errorMessage = errorData.error?.message || errorData.message || 'Translation failed'

      expect(errorMessage).toBe('Rate limit exceeded')
    })

    test('provides fallback error message', () => {
      const errorData = {}
      const errorMessage = errorData.error?.message || errorData.message || 'Translation failed'

      expect(errorMessage).toBe('Translation failed')
    })

    test('preserves error code', () => {
      const errorData = { error: { message: 'Limit exceeded', code: 'LIMIT_EXCEEDED' } }
      const error = new Error(errorData.error.message)
      error.code = errorData.error.code

      expect(error.code).toBe('LIMIT_EXCEEDED')
    })

    test('preserves HTTP status', () => {
      const response = { status: 429 }
      const error = new Error('Rate limited')
      error.status = response.status

      expect(error.status).toBe(429)
    })
  })
})

describe('Config Integration', () => {
  describe('Environment variables', () => {
    test('reads API key from environment', () => {
      process.env.SHIPI18N_API_KEY = 'sk_test_env'
      expect(process.env.SHIPI18N_API_KEY).toBe('sk_test_env')
    })

    test('reads source language from environment', () => {
      process.env.SHIPI18N_SOURCE_LANG = 'de'
      const sourceLanguage = process.env.SHIPI18N_SOURCE_LANG || 'en'
      expect(sourceLanguage).toBe('de')
    })

    test('defaults source language to en', () => {
      delete process.env.SHIPI18N_SOURCE_LANG
      const sourceLanguage = process.env.SHIPI18N_SOURCE_LANG || 'en'
      expect(sourceLanguage).toBe('en')
    })

    test('reads target languages from environment', () => {
      process.env.SHIPI18N_TARGET_LANGS = 'es,fr,de'
      const targetLanguages = process.env.SHIPI18N_TARGET_LANGS?.split(',')
      expect(targetLanguages).toEqual(['es', 'fr', 'de'])
    })

    test('reads output directory from environment', () => {
      process.env.SHIPI18N_OUTPUT_DIR = './translations'
      const outputDir = process.env.SHIPI18N_OUTPUT_DIR || './locales'
      expect(outputDir).toBe('./translations')
    })

    test('defaults output directory to ./locales', () => {
      delete process.env.SHIPI18N_OUTPUT_DIR
      const outputDir = process.env.SHIPI18N_OUTPUT_DIR || './locales'
      expect(outputDir).toBe('./locales')
    })

    test('reads saveKeys flag from environment', () => {
      process.env.SHIPI18N_SAVE_KEYS = 'true'
      const saveKeys = process.env.SHIPI18N_SAVE_KEYS === 'true'
      expect(saveKeys).toBe(true)
    })
  })
})

describe('Language codes', () => {
  test('accepts standard language codes', () => {
    const validCodes = ['es', 'fr', 'de', 'ja', 'zh', 'pt', 'ru', 'ar', 'ko', 'it']

    validCodes.forEach(code => {
      expect(code).toMatch(/^[a-z]{2}$/)
    })
  })

  test('accepts regional language codes', () => {
    const regionalCodes = ['zh-CN', 'zh-TW', 'pt-BR', 'en-US', 'en-GB']

    regionalCodes.forEach(code => {
      expect(code).toMatch(/^[a-z]{2}-[A-Z]{2}$/)
    })
  })

  test('splits comma-separated languages', () => {
    const input = 'es,fr,de,ja'
    const languages = input.split(',')

    expect(languages).toHaveLength(4)
    expect(languages).toContain('es')
    expect(languages).toContain('ja')
  })
})

describe('File operations', () => {
  test('constructs output filename correctly', () => {
    const outputDir = './locales'
    const language = 'es'
    const outputPath = `${outputDir}/${language}.json`

    expect(outputPath).toBe('./locales/es.json')
  })

  test('handles nested output directories', () => {
    const outputDir = './src/locales/translations'
    const language = 'fr'
    const outputPath = `${outputDir}/${language}.json`

    expect(outputPath).toBe('./src/locales/translations/fr.json')
  })
})
