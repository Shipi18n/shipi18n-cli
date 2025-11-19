#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { translateCommand } from '../src/commands/translate.js';
import { keysCommand } from '../src/commands/keys.js';
import { configCommand } from '../src/commands/config.js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf8')
);

const program = new Command();

program
  .name('shipi18n')
  .description('🌍 Translate your locale files with Shipi18n')
  .version(packageJson.version, '-v, --version', 'Output the current version')
  .addHelpText('after', `
${chalk.cyan('Examples:')}
  $ shipi18n translate en.json --target es,fr,de
  $ shipi18n keys list
  $ shipi18n config set apiKey sk_live_...

${chalk.cyan('Get started:')}
  1. Sign up at ${chalk.underline('https://shipi18n.com')}
  2. Get your API key (free tier: 100 keys, 3 languages)
  3. Run: ${chalk.yellow('shipi18n config set apiKey YOUR_KEY')}
  4. Translate: ${chalk.yellow('shipi18n translate en.json --target es,fr')}

${chalk.gray('Documentation: https://shipi18n.com/docs/cli')}
  `);

// Add commands
translateCommand(program);
keysCommand(program);
configCommand(program);

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
