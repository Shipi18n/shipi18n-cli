import chalk from 'chalk';
import { getConfig, setConfigValue, saveConfig } from '../lib/config.js';
import { logger } from '../utils/logger.js';

export function configCommand(program) {
  const config = program.command('config')
    .description('Manage CLI configuration');

  // Get config
  config
    .command('get [key]')
    .description('Get configuration value(s)')
    .action((key) => {
      const currentConfig = getConfig();

      if (key) {
        const value = currentConfig[key];
        if (value !== undefined && value !== null) {
          logger.log(`${chalk.cyan(key)}: ${value}`);
        } else {
          logger.warn(`Config key "${key}" not found`);
        }
      } else {
        logger.log(chalk.cyan('Current configuration:'));
        logger.log('');
        Object.entries(currentConfig).forEach(([k, v]) => {
          if (v !== undefined && v !== null) {
            // Mask API key for security
            if (k === 'apiKey' && v) {
              logger.log(`  ${chalk.yellow(k)}: ${v.substring(0, 12)}...`);
            } else {
              logger.log(`  ${chalk.yellow(k)}: ${v}`);
            }
          }
        });
        logger.log('');
        logger.log(chalk.gray('Config file: ~/.shipi18n/config.yml'));
      }
    });

  // Set config
  config
    .command('set <key> <value>')
    .description('Set configuration value')
    .action((key, value) => {
      try {
        // Parse value if it's a boolean or array
        let parsedValue = value;
        if (value === 'true') parsedValue = true;
        if (value === 'false') parsedValue = false;
        if (value.includes(',')) parsedValue = value.split(',').map(v => v.trim());

        setConfigValue(key, parsedValue);
        logger.success(`Set ${chalk.cyan(key)} = ${parsedValue}`);

        // Show next steps for API key
        if (key === 'apiKey') {
          logger.log('');
          logger.info('API key saved! Try translating a file:');
          logger.log(`  ${chalk.yellow('shipi18n translate en.json --target es,fr')}`);
        }
      } catch (error) {
        logger.error(`Failed to set config: ${error.message}`);
        process.exit(1);
      }
    });

  // Init config
  config
    .command('init')
    .description('Initialize configuration file with defaults')
    .action(() => {
      try {
        const defaultConfig = {
          apiKey: '',
          sourceLanguage: 'en',
          targetLanguages: ['es', 'fr', 'de'],
          outputDir: './locales',
          saveKeys: true,
        };

        saveConfig(defaultConfig);
        logger.success('Created config file: ~/.shipi18n/config.yml');
        logger.log('');
        logger.info('Next steps:');
        logger.log(`  1. Get your API key at ${chalk.cyan('https://shipi18n.com')}`);
        logger.log(`  2. Set your API key: ${chalk.yellow('shipi18n config set apiKey YOUR_KEY')}`);
        logger.log(`  3. Translate: ${chalk.yellow('shipi18n translate en.json --target es,fr')}`);
      } catch (error) {
        logger.error(`Failed to initialize config: ${error.message}`);
        process.exit(1);
      }
    });
}
