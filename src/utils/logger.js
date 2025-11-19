import chalk from 'chalk';
import ora from 'ora';

export const logger = {
  success: (message) => {
    console.log(chalk.green('✓'), message);
  },

  error: (message) => {
    console.log(chalk.red('✗'), message);
  },

  warn: (message) => {
    console.log(chalk.yellow('⚠'), message);
  },

  info: (message) => {
    console.log(chalk.blue('ℹ'), message);
  },

  log: (message) => {
    console.log(message);
  },

  spinner: (text) => {
    return ora(text).start();
  },
};

export function formatError(error) {
  if (error.code === 'ENOTFOUND') {
    return chalk.red('Network error: Could not connect to Shipi18n API');
  }

  if (error.message.includes('Language limit exceeded')) {
    return chalk.red(error.message) + '\n' +
      chalk.yellow('💡 Upgrade your plan at https://shipi18n.com to translate to more languages');
  }

  if (error.message.includes('API key')) {
    return chalk.red(error.message) + '\n' +
      chalk.yellow('💡 Get your free API key at https://shipi18n.com or run: shipi18n config set apiKey YOUR_KEY');
  }

  return chalk.red(error.message);
}
