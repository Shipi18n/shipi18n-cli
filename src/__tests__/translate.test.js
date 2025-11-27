import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { translateCommand } from '../commands/translate.js';
import { Shipi18nAPI } from '../lib/api.js';
import { getConfig } from '../lib/config.js';
import { logger } from '../utils/logger.js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';

// Mock dependencies
jest.mock('../lib/api.js');
jest.mock('../lib/config.js');
jest.mock('../utils/logger.js');
jest.mock('fs');

describe('Translate Command', () => {
  let mockProgram;
  let mockCommand;
  let mockAction;
  let processExitSpy;

  beforeEach(() => {
    // Mock program structure
    mockAction = jest.fn();
    mockCommand = {
      description: jest.fn().mockReturnThis(),
      option: jest.fn().mockReturnThis(),
      action: function(fn) {
        mockAction = fn;
        return this;
      }
    };
    mockProgram = {
      command: jest.fn().mockReturnValue(mockCommand)
    };

    // Mock logger
    logger.spinner = jest.fn().mockReturnValue({
      succeed: jest.fn(),
      fail: jest.fn()
    });
    logger.error = jest.fn();
    logger.info = jest.fn();
    logger.log = jest.fn();
    logger.success = jest.fn();

    // Mock process.exit
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});

    // Mock filesystem
    existsSync.mockReturnValue(true);
    readFileSync.mockReturnValue(JSON.stringify({ app: { title: 'My App' } }));
    writeFileSync.mockImplementation(() => {});
    mkdirSync.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    processExitSpy.mockRestore();
  });

  it('translates JSON file successfully', async () => {
    const mockTranslations = {
      es: { app: { title: 'Mi Aplicación' } },
      fr: { app: { title: 'Mon Application' } }
    };

    getConfig.mockReturnValue({ apiKey: 'test-api-key' });
    Shipi18nAPI.prototype.translateJSON = jest.fn().mockResolvedValue(mockTranslations);

    translateCommand(mockProgram);
    await mockAction('en.json', {
      target: 'es,fr',
      source: 'en',
      output: './locales',
      preservePlaceholders: true
    });

    expect(Shipi18nAPI).toHaveBeenCalledWith('test-api-key');
    expect(Shipi18nAPI.prototype.translateJSON).toHaveBeenCalledWith({
      content: { app: { title: 'My App' } },
      sourceLanguage: 'en',
      targetLanguages: ['es', 'fr'],
      preservePlaceholders: true
    });
    expect(writeFileSync).toHaveBeenCalledTimes(2);
  });

  it('shows error when API key is missing', async () => {
    getConfig.mockReturnValue({});

    translateCommand(mockProgram);
    await mockAction('en.json', { target: 'es' });

    expect(logger.error).toHaveBeenCalledWith('API key not found');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('shows error when input file does not exist', async () => {
    getConfig.mockReturnValue({ apiKey: 'test-api-key' });
    existsSync.mockReturnValue(false);

    translateCommand(mockProgram);
    await mockAction('missing.json', { target: 'es' });

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Input file not found')
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('shows error when JSON is invalid', async () => {
    getConfig.mockReturnValue({ apiKey: 'test-api-key' });
    readFileSync.mockReturnValue('{ invalid json');

    translateCommand(mockProgram);
    await mockAction('invalid.json', { target: 'es' });

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Invalid JSON')
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('creates output directory if it does not exist', async () => {
    const mockTranslations = {
      es: { app: { title: 'Mi Aplicación' } }
    };

    getConfig.mockReturnValue({ apiKey: 'test-api-key' });
    Shipi18nAPI.prototype.translateJSON = jest.fn().mockResolvedValue(mockTranslations);
    existsSync.mockReturnValueOnce(true).mockReturnValueOnce(false);

    translateCommand(mockProgram);
    await mockAction('en.json', {
      target: 'es',
      output: './new-locales'
    });

    expect(mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('new-locales'),
      expect.objectContaining({ recursive: true })
    );
  });

  it('uses API key from options over config', async () => {
    const mockTranslations = {
      es: { app: { title: 'Mi Aplicación' } }
    };

    getConfig.mockReturnValue({ apiKey: 'config-key' });
    Shipi18nAPI.prototype.translateJSON = jest.fn().mockResolvedValue(mockTranslations);

    translateCommand(mockProgram);
    await mockAction('en.json', {
      target: 'es',
      apiKey: 'option-key'
    });

    expect(Shipi18nAPI).toHaveBeenCalledWith('option-key');
  });

  it('parses target languages from comma-separated string', async () => {
    const mockTranslations = {
      es: { test: 'test' },
      fr: { test: 'test' },
      de: { test: 'test' }
    };

    getConfig.mockReturnValue({ apiKey: 'test-api-key' });
    Shipi18nAPI.prototype.translateJSON = jest.fn().mockResolvedValue(mockTranslations);

    translateCommand(mockProgram);
    await mockAction('en.json', {
      target: 'es, fr, de',
      output: './locales'
    });

    expect(Shipi18nAPI.prototype.translateJSON).toHaveBeenCalledWith(
      expect.objectContaining({
        targetLanguages: ['es', 'fr', 'de']
      })
    );
  });

  it('handles translation API errors', async () => {
    getConfig.mockReturnValue({ apiKey: 'test-api-key' });
    Shipi18nAPI.prototype.translateJSON = jest.fn().mockRejectedValue(
      new Error('Translation failed')
    );

    translateCommand(mockProgram);
    await mockAction('en.json', { target: 'es' });

    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('preserves placeholders by default', async () => {
    const mockTranslations = {
      es: { greeting: 'Hola, {name}!' }
    };

    getConfig.mockReturnValue({ apiKey: 'test-api-key' });
    readFileSync.mockReturnValue(JSON.stringify({ greeting: 'Hello, {name}!' }));
    Shipi18nAPI.prototype.translateJSON = jest.fn().mockResolvedValue(mockTranslations);

    translateCommand(mockProgram);
    await mockAction('en.json', {
      target: 'es',
      preservePlaceholders: true
    });

    expect(Shipi18nAPI.prototype.translateJSON).toHaveBeenCalledWith(
      expect.objectContaining({
        preservePlaceholders: true
      })
    );
  });
});
