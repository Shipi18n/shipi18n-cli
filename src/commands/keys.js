import chalk from 'chalk';
import { Shipi18nAPI } from '../lib/api.js';
import { getConfig } from '../lib/config.js';
import { logger, formatError } from '../utils/logger.js';
import { writeFileSync } from 'fs';

export function keysCommand(program) {
  const keys = program.command('keys')
    .description('Manage translation keys');

  // List keys
  keys
    .command('list')
    .description('List all translation keys')
    .option('--api-key <key>', 'API key (overrides config)')
    .action(async (options) => {
      const spinner = logger.spinner('Fetching keys...');

      try {
        const config = getConfig();
        const apiKey = options.apiKey || config.apiKey;

        if (!apiKey) {
          spinner.fail();
          logger.error('API key not found. Run: shipi18n config set apiKey YOUR_KEY');
          process.exit(1);
        }

        const api = new Shipi18nAPI(apiKey);
        const result = await api.listKeys();

        spinner.succeed(chalk.green(`Found ${result.keys?.length || 0} keys`));

        if (!result.keys || result.keys.length === 0) {
          logger.info('No translation keys found');
          logger.log(chalk.gray('  Create keys by translating JSON files with --save-keys flag'));
          return;
        }

        // Display keys in a table
        logger.log('');
        result.keys.forEach((key, index) => {
          logger.log(chalk.cyan(`${index + 1}. ${key.keyName}`));
          logger.log(chalk.gray(`   Source: ${key.sourceValue}`));
          logger.log(chalk.gray(`   Languages: ${Object.keys(key.translations || {}).join(', ')}`));
          logger.log('');
        });

        logger.log(chalk.gray(`Total: ${result.keys.length} keys | Limit: ${result.limit || 'unlimited'}`));

      } catch (error) {
        spinner.fail();
        logger.log(formatError(error));
        process.exit(1);
      }
    });

  // Delete key
  keys
    .command('delete <keyId>')
    .description('Delete a translation key')
    .option('--api-key <key>', 'API key (overrides config)')
    .action(async (keyId, options) => {
      const spinner = logger.spinner(`Deleting key ${keyId}...`);

      try {
        const config = getConfig();
        const apiKey = options.apiKey || config.apiKey;

        if (!apiKey) {
          spinner.fail();
          logger.error('API key not found. Run: shipi18n config set apiKey YOUR_KEY');
          process.exit(1);
        }

        const api = new Shipi18nAPI(apiKey);
        await api.deleteKey(keyId);

        spinner.succeed(chalk.green(`Deleted key: ${keyId}`));

      } catch (error) {
        spinner.fail();
        logger.log(formatError(error));
        process.exit(1);
      }
    });

  // Export keys
  keys
    .command('export')
    .description('Export all translation keys')
    .option('-f, --format <format>', 'Export format (json, csv)', 'json')
    .option('-o, --output <file>', 'Output file')
    .option('--api-key <key>', 'API key (overrides config)')
    .action(async (options) => {
      const spinner = logger.spinner(`Exporting keys as ${options.format}...`);

      try {
        const config = getConfig();
        const apiKey = options.apiKey || config.apiKey;

        if (!apiKey) {
          spinner.fail();
          logger.error('API key not found. Run: shipi18n config set apiKey YOUR_KEY');
          process.exit(1);
        }

        const api = new Shipi18nAPI(apiKey);
        const result = await api.exportKeys(options.format);

        if (options.output) {
          const content = options.format === 'json'
            ? JSON.stringify(result, null, 2)
            : result;
          writeFileSync(options.output, content, 'utf8');
          spinner.succeed(chalk.green(`Exported to: ${options.output}`));
        } else {
          spinner.succeed(chalk.green('Export complete'));
          console.log(JSON.stringify(result, null, 2));
        }

      } catch (error) {
        spinner.fail();
        logger.log(formatError(error));
        process.exit(1);
      }
    });
}
