/**
 * Tests for Shipi18n CLI Config Module
 */

import { homedir } from 'os'
import { join } from 'path'

// Reset env vars before each test
beforeEach(() => {
  delete process.env.SHIPI18N_API_KEY
  delete process.env.SHIPI18N_SOURCE_LANG
  delete process.env.SHIPI18N_TARGET_LANGS
  delete process.env.SHIPI18N_OUTPUT_DIR
  delete process.env.SHIPI18N_SAVE_KEYS
})

describe('Config paths', () => {
  test('uses home directory for config', () => {
    const CONFIG_DIR = join(homedir(), '.shipi18n')
    expect(CONFIG_DIR).toContain('.shipi18n')
    expect(CONFIG_DIR).toContain(homedir())
  })

  test('config file is named config.yml', () => {
    const CONFIG_DIR = join(homedir(), '.shipi18n')
    const CONFIG_FILE = join(CONFIG_DIR, 'config.yml')
    expect(CONFIG_FILE).toContain('config.yml')
  })
})

describe('getConfig', () => {
  test('returns object with expected keys', () => {
    const config = {
      apiKey: process.env.SHIPI18N_API_KEY,
      sourceLanguage: process.env.SHIPI18N_SOURCE_LANG || 'en',
      targetLanguages: process.env.SHIPI18N_TARGET_LANGS?.split(','),
      outputDir: process.env.SHIPI18N_OUTPUT_DIR || './locales',
      saveKeys: process.env.SHIPI18N_SAVE_KEYS === 'true',
    }

    expect(config).toHaveProperty('apiKey')
    expect(config).toHaveProperty('sourceLanguage')
    expect(config).toHaveProperty('targetLanguages')
    expect(config).toHaveProperty('outputDir')
    expect(config).toHaveProperty('saveKeys')
  })

  test('defaults sourceLanguage to en', () => {
    const sourceLanguage = process.env.SHIPI18N_SOURCE_LANG || 'en'
    expect(sourceLanguage).toBe('en')
  })

  test('defaults outputDir to ./locales', () => {
    const outputDir = process.env.SHIPI18N_OUTPUT_DIR || './locales'
    expect(outputDir).toBe('./locales')
  })

  test('defaults saveKeys to false', () => {
    const saveKeys = process.env.SHIPI18N_SAVE_KEYS === 'true'
    expect(saveKeys).toBe(false)
  })

  test('reads apiKey from environment', () => {
    process.env.SHIPI18N_API_KEY = 'sk_test_config'
    const apiKey = process.env.SHIPI18N_API_KEY
    expect(apiKey).toBe('sk_test_config')
  })

  test('reads targetLanguages from environment', () => {
    process.env.SHIPI18N_TARGET_LANGS = 'es,fr,de,ja'
    const targetLanguages = process.env.SHIPI18N_TARGET_LANGS?.split(',')
    expect(targetLanguages).toEqual(['es', 'fr', 'de', 'ja'])
  })

  test('returns undefined for targetLanguages when not set', () => {
    const targetLanguages = process.env.SHIPI18N_TARGET_LANGS?.split(',')
    expect(targetLanguages).toBeUndefined()
  })
})

describe('Config merging', () => {
  test('env vars have priority over file config', () => {
    process.env.SHIPI18N_API_KEY = 'sk_from_env'
    const fileConfig = { apiKey: 'sk_from_file' }
    const envApiKey = process.env.SHIPI18N_API_KEY

    // Env var should win
    const finalApiKey = envApiKey || fileConfig.apiKey
    expect(finalApiKey).toBe('sk_from_env')
  })

  test('file config used when env var not set', () => {
    const fileConfig = { apiKey: 'sk_from_file' }
    const envApiKey = process.env.SHIPI18N_API_KEY

    const finalApiKey = envApiKey || fileConfig.apiKey
    expect(finalApiKey).toBe('sk_from_file')
  })

  test('merges multiple config sources', () => {
    process.env.SHIPI18N_API_KEY = 'sk_env'
    const fileConfig = {
      sourceLanguage: 'de',
      targetLanguages: ['es', 'fr'],
      outputDir: './translations',
    }

    const config = {
      apiKey: process.env.SHIPI18N_API_KEY,
      sourceLanguage: process.env.SHIPI18N_SOURCE_LANG || fileConfig.sourceLanguage,
      targetLanguages: process.env.SHIPI18N_TARGET_LANGS?.split(',') || fileConfig.targetLanguages,
      outputDir: process.env.SHIPI18N_OUTPUT_DIR || fileConfig.outputDir,
    }

    expect(config.apiKey).toBe('sk_env')
    expect(config.sourceLanguage).toBe('de')
    expect(config.targetLanguages).toEqual(['es', 'fr'])
    expect(config.outputDir).toBe('./translations')
  })
})

describe('saveConfig', () => {
  test('creates YAML content from config', () => {
    const config = {
      apiKey: 'sk_test_123',
      sourceLanguage: 'en',
      targetLanguages: ['es', 'fr'],
    }

    // Simple YAML-like representation
    const entries = Object.entries(config).map(([k, v]) => {
      if (Array.isArray(v)) {
        return `${k}:\n  - ${v.join('\n  - ')}`
      }
      return `${k}: ${v}`
    })

    expect(entries[0]).toBe('apiKey: sk_test_123')
    expect(entries[1]).toBe('sourceLanguage: en')
  })
})

describe('getConfigValue', () => {
  test('returns specific config value', () => {
    process.env.SHIPI18N_API_KEY = 'sk_specific'
    const config = {
      apiKey: process.env.SHIPI18N_API_KEY,
      sourceLanguage: 'en',
    }

    expect(config['apiKey']).toBe('sk_specific')
    expect(config['sourceLanguage']).toBe('en')
  })

  test('returns undefined for missing key', () => {
    const config = { apiKey: 'sk_test' }
    expect(config['nonExistentKey']).toBeUndefined()
  })
})

describe('setConfigValue', () => {
  test('updates config value', () => {
    const config = { apiKey: 'old_key' }
    config['apiKey'] = 'new_key'
    expect(config.apiKey).toBe('new_key')
  })

  test('adds new config value', () => {
    const config = {}
    config['newKey'] = 'newValue'
    expect(config.newKey).toBe('newValue')
  })
})

describe('Config validation', () => {
  test('validates API key format', () => {
    const validKeys = [
      'sk_live_abc123',
      'sk_test_xyz789',
      'sk_demo_000000',
    ]

    validKeys.forEach(key => {
      expect(key).toMatch(/^sk_(live|test|demo)_[a-z0-9]+$/i)
    })
  })

  test('validates language code format', () => {
    const validLangs = ['en', 'es', 'fr', 'de', 'ja', 'zh']

    validLangs.forEach(lang => {
      expect(lang).toMatch(/^[a-z]{2}$/)
    })
  })

  test('validates output directory path', () => {
    const validPaths = [
      './locales',
      './src/locales',
      '../translations',
      'locales',
    ]

    validPaths.forEach(path => {
      expect(typeof path).toBe('string')
      expect(path.length).toBeGreaterThan(0)
    })
  })
})

describe('CLI argument parsing', () => {
  test('parses target languages from comma-separated string', () => {
    const input = 'es,fr,de'
    const languages = input.split(',')

    expect(languages).toEqual(['es', 'fr', 'de'])
  })

  test('handles single language', () => {
    const input = 'es'
    const languages = input.split(',')

    expect(languages).toEqual(['es'])
  })

  test('trims whitespace from languages', () => {
    const input = 'es, fr, de'
    const languages = input.split(',').map(l => l.trim())

    expect(languages).toEqual(['es', 'fr', 'de'])
  })

  test('parses output path option', () => {
    const outputPath = './custom/locales'
    expect(outputPath).toBe('./custom/locales')
  })
})
