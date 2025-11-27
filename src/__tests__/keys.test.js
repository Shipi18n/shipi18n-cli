import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { keysCommand } from '../commands/keys.js';
import { Shipi18nAPI } from '../lib/api.js';
import { getConfig } from '../lib/config.js';
import { logger } from '../utils/logger.js';
import { writeFileSync } from 'fs';

// Mock dependencies
jest.mock('../lib/api.js');
jest.mock('../lib/config.js');
jest.mock('../utils/logger.js');
jest.mock('fs');

describe('Keys Command', () => {
  let mockProgram;
  let mockCommand;
  let mockAction;
  let processExitSpy;

  beforeEach(() => {
    // Mock program structure
    mockAction = jest.fn();
    mockCommand = {
      description: jest.fn().mockReturnThis(),
      command: jest.fn().mockReturnThis(),
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

    // Mock process.exit
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    processExitSpy.mockRestore();
  });

  describe('list command', () => {
    it('lists translation keys successfully', async () => {
      const mockKeys = [
        {
          keyName: 'app.welcome',
          sourceValue: 'Welcome',
          translations: { es: 'Bienvenido', fr: 'Bienvenue' }
        },
        {
          keyName: 'app.goodbye',
          sourceValue: 'Goodbye',
          translations: { es: 'Adiós', fr: 'Au revoir' }
        }
      ];

      getConfig.mockReturnValue({ apiKey: 'test-api-key' });
      Shipi18nAPI.prototype.listKeys = jest.fn().mockResolvedValue({
        keys: mockKeys,
        limit: 100
      });

      keysCommand(mockProgram);

      // Simulate running the list command
      await mockAction({ apiKey: null });

      expect(Shipi18nAPI).toHaveBeenCalledWith('test-api-key');
      expect(logger.log).toHaveBeenCalled();
    });

    it('shows error when API key is missing', async () => {
      getConfig.mockReturnValue({});

      keysCommand(mockProgram);
      await mockAction({});

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('API key not found')
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('handles empty keys list', async () => {
      getConfig.mockReturnValue({ apiKey: 'test-api-key' });
      Shipi18nAPI.prototype.listKeys = jest.fn().mockResolvedValue({
        keys: [],
        limit: 100
      });

      keysCommand(mockProgram);
      await mockAction({});

      expect(logger.info).toHaveBeenCalledWith('No translation keys found');
    });

    it('handles API errors', async () => {
      getConfig.mockReturnValue({ apiKey: 'test-api-key' });
      Shipi18nAPI.prototype.listKeys = jest.fn().mockRejectedValue(
        new Error('API Error')
      );

      keysCommand(mockProgram);
      await mockAction({});

      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('delete command', () => {
    it('deletes a key successfully', async () => {
      getConfig.mockReturnValue({ apiKey: 'test-api-key' });
      Shipi18nAPI.prototype.deleteKey = jest.fn().mockResolvedValue();

      keysCommand(mockProgram);
      await mockAction('key-123', {});

      expect(Shipi18nAPI.prototype.deleteKey).toHaveBeenCalledWith('key-123');
    });

    it('shows error when API key is missing', async () => {
      getConfig.mockReturnValue({});

      keysCommand(mockProgram);
      await mockAction('key-123', {});

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('API key not found')
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('handles API errors during deletion', async () => {
      getConfig.mockReturnValue({ apiKey: 'test-api-key' });
      Shipi18nAPI.prototype.deleteKey = jest.fn().mockRejectedValue(
        new Error('Key not found')
      );

      keysCommand(mockProgram);
      await mockAction('key-123', {});

      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('export command', () => {
    it('exports keys to JSON file', async () => {
      const mockData = { keys: [{ id: '1', value: 'test' }] };
      getConfig.mockReturnValue({ apiKey: 'test-api-key' });
      Shipi18nAPI.prototype.exportKeys = jest.fn().mockResolvedValue(mockData);

      keysCommand(mockProgram);
      await mockAction({ format: 'json', output: 'keys.json' });

      expect(Shipi18nAPI.prototype.exportKeys).toHaveBeenCalledWith('json');
      expect(writeFileSync).toHaveBeenCalledWith(
        'keys.json',
        JSON.stringify(mockData, null, 2),
        'utf8'
      );
    });

    it('exports keys to console when no output file specified', async () => {
      const mockData = { keys: [{ id: '1', value: 'test' }] };
      getConfig.mockReturnValue({ apiKey: 'test-api-key' });
      Shipi18nAPI.prototype.exportKeys = jest.fn().mockResolvedValue(mockData);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      keysCommand(mockProgram);
      await mockAction({ format: 'json' });

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify(mockData, null, 2)
      );
      consoleSpy.mockRestore();
    });

    it('exports keys to CSV format', async () => {
      const mockCSV = 'id,value\n1,test';
      getConfig.mockReturnValue({ apiKey: 'test-api-key' });
      Shipi18nAPI.prototype.exportKeys = jest.fn().mockResolvedValue(mockCSV);

      keysCommand(mockProgram);
      await mockAction({ format: 'csv', output: 'keys.csv' });

      expect(Shipi18nAPI.prototype.exportKeys).toHaveBeenCalledWith('csv');
      expect(writeFileSync).toHaveBeenCalledWith('keys.csv', mockCSV, 'utf8');
    });

    it('handles export errors', async () => {
      getConfig.mockReturnValue({ apiKey: 'test-api-key' });
      Shipi18nAPI.prototype.exportKeys = jest.fn().mockRejectedValue(
        new Error('Export failed')
      );

      keysCommand(mockProgram);
      await mockAction({ format: 'json' });

      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});
