import { jest } from '@jest/globals'
import { Shipi18nAPI } from '../lib/api.js'

// Mock fetch globally
global.fetch = jest.fn()

describe('Shipi18nAPI', () => {
  let api

  beforeEach(() => {
    api = new Shipi18nAPI('test-api-key')
    jest.clearAllMocks()
  })

  describe('constructor', () => {
    test('initializes with API key', () => {
      expect(api.apiKey).toBe('test-api-key')
    })

    test('uses environment variable if no key provided', () => {
      process.env.SHIPI18N_API_KEY = 'env-api-key'
      const envApi = new Shipi18nAPI()
      expect(envApi.apiKey).toBe('env-api-key')
      delete process.env.SHIPI18N_API_KEY
    })
  })

  describe('translateJSON', () => {
    test('throws error without API key', async () => {
      const noKeyApi = new Shipi18nAPI()
      delete process.env.SHIPI18N_API_KEY

      await expect(noKeyApi.translateJSON({
        json: { greeting: 'Hello' },
        targetLanguages: ['es'],
      })).rejects.toThrow('API key is required')
    })

    test('sends skipKeys and skipPaths to API', async () => {
      const mockResponse = {
        es: '{"greeting":"Hola"}',
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      await api.translateJSON({
        json: { greeting: 'Hello', brandName: 'Acme' },
        sourceLanguage: 'en',
        targetLanguages: ['es'],
        skipKeys: ['brandName'],
        skipPaths: ['config.*'],
      })

      expect(global.fetch).toHaveBeenCalledTimes(1)

      const [url, options] = global.fetch.mock.calls[0]
      const body = JSON.parse(options.body)

      expect(body.skipKeys).toEqual(['brandName'])
      expect(body.skipPaths).toEqual(['config.*'])
    })

    test('sends empty arrays when skip options not provided', async () => {
      const mockResponse = {
        es: '{"greeting":"Hola"}',
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      await api.translateJSON({
        json: { greeting: 'Hello' },
        sourceLanguage: 'en',
        targetLanguages: ['es'],
      })

      const [url, options] = global.fetch.mock.calls[0]
      const body = JSON.parse(options.body)

      expect(body.skipKeys).toEqual([])
      expect(body.skipPaths).toEqual([])
    })

    test('preserves skipped info in response', async () => {
      const mockResponse = {
        es: '{"greeting":"Hola"}',
        skipped: {
          count: 2,
          keys: ['brandName', 'states.CA'],
        },
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await api.translateJSON({
        json: { greeting: 'Hello', brandName: 'Acme' },
        sourceLanguage: 'en',
        targetLanguages: ['es'],
        skipKeys: ['brandName'],
      })

      expect(result.skipped).toEqual({
        count: 2,
        keys: ['brandName', 'states.CA'],
      })
    })

    test('parses JSON strings in response', async () => {
      const mockResponse = {
        es: '{"greeting":"Hola"}',
        fr: '{"greeting":"Bonjour"}',
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await api.translateJSON({
        json: { greeting: 'Hello' },
        sourceLanguage: 'en',
        targetLanguages: ['es', 'fr'],
      })

      expect(result.es).toEqual({ greeting: 'Hola' })
      expect(result.fr).toEqual({ greeting: 'Bonjour' })
    })

    test('handles API errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: { message: 'Invalid API key' } }),
      })

      await expect(api.translateJSON({
        json: { greeting: 'Hello' },
        targetLanguages: ['es'],
      })).rejects.toThrow('Invalid API key')
    })
  })

  describe('processRegionalLanguages', () => {
    test('extracts base languages for regional variants', () => {
      const { processedTargets, regionalMap } = api.processRegionalLanguages(
        ['es', 'pt-BR', 'zh-TW'],
        true
      )

      expect(processedTargets).toContain('pt')
      expect(processedTargets).toContain('zh')
      expect(processedTargets).toContain('pt-BR')
      expect(processedTargets).toContain('zh-TW')
      expect(regionalMap).toEqual({
        'pt-BR': 'pt',
        'zh-TW': 'zh',
      })
    })

    test('does not add base languages when regionalFallback is false', () => {
      const { processedTargets, regionalMap } = api.processRegionalLanguages(
        ['pt-BR', 'zh-TW'],
        false
      )

      expect(processedTargets).not.toContain('pt')
      expect(processedTargets).not.toContain('zh')
      expect(regionalMap).toEqual({})
    })
  })
})
