import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import chalk from 'chalk';
import { logger, formatError } from '../utils/logger.js';

describe('Logger', () => {
  let consoleLogSpy;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('success', () => {
    it('logs success message with green checkmark', () => {
      logger.success('Test success');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        chalk.green('✓'),
        'Test success'
      );
    });
  });

  describe('error', () => {
    it('logs error message with red X', () => {
      logger.error('Test error');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        chalk.red('✗'),
        'Test error'
      );
    });
  });

  describe('warn', () => {
    it('logs warning message with yellow warning sign', () => {
      logger.warn('Test warning');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        chalk.yellow('⚠'),
        'Test warning'
      );
    });
  });

  describe('info', () => {
    it('logs info message with blue info icon', () => {
      logger.info('Test info');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        chalk.blue('ℹ'),
        'Test info'
      );
    });
  });

  describe('log', () => {
    it('logs plain message', () => {
      logger.log('Test log');
      expect(consoleLogSpy).toHaveBeenCalledWith('Test log');
    });
  });

  describe('spinner', () => {
    it('returns a spinner object with start method', () => {
      const spinner = logger.spinner('Loading...');
      expect(spinner).toBeDefined();
      expect(typeof spinner.start).toBe('function');
      expect(typeof spinner.succeed).toBe('function');
      expect(typeof spinner.fail).toBe('function');
      spinner.stop();
    });
  });
});

describe('formatError', () => {
  it('formats network error (ENOTFOUND)', () => {
    const error = { code: 'ENOTFOUND', message: 'getaddrinfo ENOTFOUND' };
    const result = formatError(error);
    expect(result).toContain('Network error');
    expect(result).toContain('Could not connect to Shipi18n API');
  });

  it('formats language limit exceeded error', () => {
    const error = { message: 'Language limit exceeded for your plan' };
    const result = formatError(error);
    expect(result).toContain('Language limit exceeded');
    expect(result).toContain('Upgrade your plan');
    expect(result).toContain('https://shipi18n.com');
  });

  it('formats API key error', () => {
    const error = { message: 'Invalid API key' };
    const result = formatError(error);
    expect(result).toContain('Invalid API key');
    expect(result).toContain('Get your free API key');
    expect(result).toContain('shipi18n config set apiKey');
  });

  it('formats generic error', () => {
    const error = { message: 'Something went wrong' };
    const result = formatError(error);
    expect(result).toContain('Something went wrong');
  });

  it('handles error with missing message', () => {
    const error = {};
    const result = formatError(error);
    expect(result).toBeDefined();
  });
});
