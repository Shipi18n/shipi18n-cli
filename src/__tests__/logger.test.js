/**
 * Tests for Shipi18n CLI Logger Utilities
 */

import { jest } from '@jest/globals';
import { logger, formatError } from '../utils/logger.js';

describe('Logger', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('logger.success outputs message', () => {
    logger.success('Test message');
    expect(consoleSpy).toHaveBeenCalled();
  });

  test('logger.error outputs message', () => {
    logger.error('Error message');
    expect(consoleSpy).toHaveBeenCalled();
  });

  test('logger.warn outputs message', () => {
    logger.warn('Warning message');
    expect(consoleSpy).toHaveBeenCalled();
  });

  test('logger.info outputs message', () => {
    logger.info('Info message');
    expect(consoleSpy).toHaveBeenCalled();
  });

  test('logger.log outputs message', () => {
    logger.log('Log message');
    expect(consoleSpy).toHaveBeenCalledWith('Log message');
  });

  test('logger.spinner returns spinner object', () => {
    const spinner = logger.spinner('Loading...');
    expect(spinner).toBeDefined();
    expect(typeof spinner.stop).toBe('function');
    spinner.stop();
  });
});

describe('formatError', () => {
  test('formats network error', () => {
    const error = new Error('Connection failed');
    error.code = 'ENOTFOUND';

    const formatted = formatError(error);
    expect(formatted).toContain('Network error');
  });

  test('formats language limit error', () => {
    const error = new Error('Language limit exceeded for your plan');

    const formatted = formatError(error);
    expect(formatted).toContain('Language limit exceeded');
    expect(formatted).toContain('Upgrade');
  });

  test('formats API key error', () => {
    const error = new Error('Invalid API key');

    const formatted = formatError(error);
    expect(formatted).toContain('API key');
    expect(formatted).toContain('shipi18n.com');
  });

  test('formats generic error', () => {
    const error = new Error('Something went wrong');

    const formatted = formatError(error);
    expect(formatted).toContain('Something went wrong');
  });
});
