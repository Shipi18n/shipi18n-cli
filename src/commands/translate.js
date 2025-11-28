import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, parse, dirname } from 'path';
import chalk from 'chalk';
import { Shipi18nAPI } from '../lib/api.js';
import { getConfig } from '../lib/config.js';
import { logger, formatError } from '../utils/logger.js';

export function translateCommand(program) {
  program
    .command('translate <input>')
    .description('Translate a JSON locale file to multiple languages')
    .option('-t, --target <languages>', 'Target languages (comma-separated)', 'es,fr')
    .option('-s, --source <language>', 'Source language', 'en')
    .option('-o, --output <dir>', 'Output directory', './locales')
    .option('--api-key <key>', 'API key (overrides config)')
    .option('--preserve-placeholders', 'Preserve placeholders like {name}, {{value}}, etc.', true)
    .option('--no-fallback', 'Disable fallback to source language for missing translations')
    .option('--no-regional-fallback', 'Disable regional fallback (e.g., pt-BR -> pt)')
    .action(async (input, options) => {
      const spinner = logger.spinner('Translating...');

      try {
        // Get config
        const config = getConfig();
        const apiKey = options.apiKey || config.apiKey;

        if (!apiKey) {
          spinner.fail();
          logger.error('API key not found');
          logger.info('Set your API key:');
          logger.log(`  ${chalk.yellow('shipi18n config set apiKey YOUR_KEY')}`);
          logger.log(`  ${chalk.gray('Get your free key at https://shipi18n.com')}`);
          process.exit(1);
        }

        // Read input file
        if (!existsSync(input)) {
          spinner.fail();
          logger.error(`Input file not found: ${input}`);
          process.exit(1);
        }

        const fileContent = readFileSync(input, 'utf8');
        let json;
        try {
          json = JSON.parse(fileContent);
        } catch (error) {
          spinner.fail();
          logger.error(`Invalid JSON in ${input}: ${error.message}`);
          process.exit(1);
        }

        // Parse target languages
        const targetLanguages = options.target.split(',').map(lang => lang.trim());
        const sourceLanguage = options.source;

        spinner.text = `Translating to ${targetLanguages.length} language${targetLanguages.length > 1 ? 's' : ''}...`;

        // Translate with fallback support
        const api = new Shipi18nAPI(apiKey);
        const translations = await api.translateJSON({
          json,
          sourceLanguage,
          targetLanguages,
          preservePlaceholders: options.preservePlaceholders,
          fallback: {
            fallbackToSource: options.fallback !== false,
            regionalFallback: options.regionalFallback !== false,
          },
        });

        spinner.succeed(chalk.green(`Translated to ${targetLanguages.length} language${targetLanguages.length > 1 ? 's' : ''}!`));

        // Save translated files
        const outputDir = options.output;
        if (!existsSync(outputDir)) {
          mkdirSync(outputDir, { recursive: true });
        }

        let savedCount = 0;
        for (const [langCode, content] of Object.entries(translations)) {
          if (langCode === 'warnings' || langCode === 'fallbackInfo' || langCode === 'namespaceInfo') continue;

          const outputFile = join(outputDir, `${langCode}.json`);
          writeFileSync(outputFile, JSON.stringify(content, null, 2), 'utf8');
          logger.success(`Saved: ${chalk.cyan(outputFile)}`);
          savedCount++;
        }

        // Show fallback info if any fallbacks were used
        if (translations.fallbackInfo && translations.fallbackInfo.used) {
          const fallbackInfo = translations.fallbackInfo;
          logger.log('');
          logger.info('Fallback information:');

          // Regional fallbacks
          if (Object.keys(fallbackInfo.regionalFallbacks).length > 0) {
            for (const [lang, baseLang] of Object.entries(fallbackInfo.regionalFallbacks)) {
              logger.log(`  ${chalk.blue('•')} ${lang} → ${baseLang} ${chalk.gray('(regional fallback)')}`);
            }
          }

          // Languages that fell back to source
          if (fallbackInfo.languagesFallbackToSource.length > 0) {
            for (const lang of fallbackInfo.languagesFallbackToSource) {
              logger.log(`  ${chalk.yellow('•')} ${lang} → ${sourceLanguage} ${chalk.gray('(source fallback)')}`);
            }
          }

          // Keys that used fallback
          if (Object.keys(fallbackInfo.keysFallback).length > 0) {
            for (const [lang, keys] of Object.entries(fallbackInfo.keysFallback)) {
              logger.log(`  ${chalk.yellow('•')} ${lang}: ${keys.length} key${keys.length > 1 ? 's' : ''} used fallback`);
              if (keys.length <= 5) {
                keys.forEach(key => {
                  logger.log(`    ${chalk.gray('- ' + key)}`);
                });
              }
            }
          }
        }

        // Show warnings if any
        if (translations.warnings && translations.warnings.length > 0) {
          logger.log('');
          logger.warn('Warnings:');
          translations.warnings.forEach(warning => {
            logger.log(`  ${chalk.yellow('•')} ${warning.message}`);
          });
        }

        logger.log('');
        logger.log(chalk.green(`✨ Successfully translated ${savedCount} file${savedCount > 1 ? 's' : ''}!`));
        logger.log(chalk.gray(`   Output: ${outputDir}`));

      } catch (error) {
        spinner.fail();
        logger.log('');
        logger.log(formatError(error));
        process.exit(1);
      }
    });
}
