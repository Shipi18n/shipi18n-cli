import chalk from 'chalk';
import { logger } from '../utils/logger.js';
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import inquirer from 'inquirer';

// Known i18n frameworks and their signatures
const I18N_FRAMEWORKS = {
  'i18next': {
    packages: ['i18next', 'react-i18next', 'next-i18next', 'i18next-http-backend', 'i18next-browser-languagedetector'],
    placeholderPattern: 'i18next',
  },
  'react-intl': {
    packages: ['react-intl', 'formatjs', '@formatjs/intl'],
    placeholderPattern: 'icu',
  },
  'vue-i18n': {
    packages: ['vue-i18n', '@intlify/vue-i18n'],
    placeholderPattern: 'i18next',
  },
  'next-intl': {
    packages: ['next-intl'],
    placeholderPattern: 'icu',
  },
  'lingui': {
    packages: ['@lingui/core', '@lingui/react', '@lingui/macro'],
    placeholderPattern: 'icu',
  },
  'polyglot': {
    packages: ['node-polyglot'],
    placeholderPattern: 'printf',
  }
};

// Common locale directory patterns
const LOCALE_DIR_PATTERNS = [
  'locales', 'locale', 'lang', 'langs', 'languages', 'i18n',
  'translations', 'messages', 'public/locales', 'src/locales',
  'src/i18n', 'src/translations', 'app/locales', 'assets/locales'
];

// Common language codes
const LANGUAGE_CODES = [
  'en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh', 'ru', 'ar', 'hi', 'nl', 'pl', 'tr', 'vi', 'th',
  'en-US', 'en-GB', 'es-ES', 'es-MX', 'fr-FR', 'fr-CA', 'de-DE', 'pt-BR', 'pt-PT', 'zh-CN', 'zh-TW'
];

/**
 * Detect i18n framework from package.json
 */
function detectFramework(packageJson) {
  const allDeps = {
    ...(packageJson.dependencies || {}),
    ...(packageJson.devDependencies || {})
  };

  const detected = [];

  for (const [framework, config] of Object.entries(I18N_FRAMEWORKS)) {
    const matchedPackages = config.packages.filter(pkg => allDeps[pkg]);
    if (matchedPackages.length > 0) {
      detected.push({
        framework,
        confidence: matchedPackages.length / config.packages.length,
        matchedPackages,
        placeholderPattern: config.placeholderPattern
      });
    }
  }

  detected.sort((a, b) => b.confidence - a.confidence);
  return { detected, primary: detected[0] || null };
}

/**
 * Recursively get all files in a directory
 */
function getAllFiles(dirPath, basePath = '', files = []) {
  if (!existsSync(dirPath)) return files;

  const items = readdirSync(dirPath);

  for (const item of items) {
    // Skip node_modules, .git, etc.
    if (item === 'node_modules' || item === '.git' || item === 'dist' || item === 'build') {
      continue;
    }

    const fullPath = join(dirPath, item);
    const relativePath = basePath ? `${basePath}/${item}` : item;

    if (statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, relativePath, files);
    } else {
      files.push(relativePath);
    }
  }

  return files;
}

/**
 * Detect locale file structure
 */
function detectFileStructure(files) {
  const result = {
    localeDirectories: [],
    sourceLanguage: null,
    targetLanguages: [],
    namespaces: [],
    fileFormat: 'json',
    structure: 'flat'
  };

  // Find locale directories
  const dirCounts = {};
  for (const file of files) {
    const parts = file.split('/');
    for (let i = 0; i < parts.length; i++) {
      const dir = parts.slice(0, i + 1).join('/');
      const dirName = parts[i].toLowerCase();
      if (LOCALE_DIR_PATTERNS.includes(dirName) || LANGUAGE_CODES.includes(parts[i])) {
        dirCounts[dir] = (dirCounts[dir] || 0) + 1;
      }
    }
  }

  const sortedDirs = Object.entries(dirCounts).sort((a, b) => b[1] - a[1]);
  if (sortedDirs.length > 0) {
    result.localeDirectories = sortedDirs.slice(0, 3).map(([dir]) => dir);
  }

  // Find language files
  const langFiles = files.filter(f => {
    const filename = f.split('/').pop();
    const ext = filename.split('.').pop();
    const name = filename.replace(`.${ext}`, '');
    return (ext === 'json' || ext === 'yaml' || ext === 'yml') &&
           (LANGUAGE_CODES.includes(name) || LANGUAGE_CODES.includes(name.toLowerCase()));
  });

  const languages = new Set();
  const namespaces = new Set();

  for (const file of langFiles) {
    const parts = file.split('/');
    const filename = parts.pop();
    const ext = filename.split('.').pop();
    const name = filename.replace(`.${ext}`, '');

    if (LANGUAGE_CODES.includes(name) || LANGUAGE_CODES.includes(name.toLowerCase())) {
      languages.add(name.toLowerCase());
      result.structure = 'flat';
    } else {
      const parentDir = parts[parts.length - 1];
      if (parentDir && (LANGUAGE_CODES.includes(parentDir) || LANGUAGE_CODES.includes(parentDir.toLowerCase()))) {
        languages.add(parentDir.toLowerCase());
        namespaces.add(name);
        result.structure = 'nested';
      }
    }

    if (ext === 'yaml' || ext === 'yml') {
      result.fileFormat = 'yaml';
    }
  }

  result.targetLanguages = Array.from(languages).filter(l => l !== 'en');
  result.sourceLanguage = languages.has('en') ? 'en' : Array.from(languages)[0] || 'en';
  result.namespaces = Array.from(namespaces);

  return result;
}

/**
 * Detect placeholder patterns from translation content
 */
function detectPlaceholderPatterns(content) {
  const PLACEHOLDER_PATTERNS = {
    i18next: { regex: /\{\{[^}]+\}\}/g },
    icu: { regex: /\{[a-zA-Z_][a-zA-Z0-9_]*(?:,\s*(?:number|date|time|plural|select|selectordinal))?[^}]*\}/g },
    printf: { regex: /%[sd@]|%\d+\$[sd]/g },
    ruby: { regex: /%\{[^}]+\}/g }
  };

  const flatContent = flattenObject(content);
  const values = Object.values(flatContent).filter(v => typeof v === 'string');

  const patternCounts = {};

  for (const [patternName, patternConfig] of Object.entries(PLACEHOLDER_PATTERNS)) {
    patternCounts[patternName] = 0;
    for (const value of values) {
      const matches = value.match(patternConfig.regex);
      if (matches) {
        patternCounts[patternName] += matches.length;
      }
    }
  }

  const sortedPatterns = Object.entries(patternCounts)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  return {
    patterns: patternCounts,
    primary: sortedPatterns[0]?.[0] || 'icu'
  };
}

function flattenObject(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey));
    } else {
      result[newKey] = value;
    }
  }
  return result;
}

/**
 * Generate GitHub Action workflow
 */
function generateGitHubActionWorkflow({ sourceDir, targetLanguages, sourceLanguage }) {
  return `name: Translate

on:
  push:
    branches: [main]
    paths:
      - '${sourceDir}/**'
  workflow_dispatch:

jobs:
  translate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Translate locale files
        uses: shipi18n/shipi18n-github-action@v1
        with:
          api-key: \${{ secrets.SHIPI18N_API_KEY }}
          source-dir: '${sourceDir}'
          target-languages: '${targetLanguages.join(',')}'
          source-language: '${sourceLanguage}'
          incremental: 'true'
          verify: 'true'
          create-pr: 'true'
`;
}

export function initCommand(program) {
  program
    .command('init')
    .description('Analyze your project and generate shipi18n configuration')
    .option('-y, --yes', 'Skip prompts and use detected defaults')
    .option('--no-workflow', 'Skip GitHub Action workflow generation')
    .action(async (options) => {
      logger.log('');
      logger.log(chalk.cyan.bold('🔍 Shipi18n Project Analyzer'));
      logger.log(chalk.gray('Detecting your i18n setup...'));
      logger.log('');

      const cwd = process.cwd();

      // Step 1: Read package.json
      let packageJson = null;
      let frameworkResult = { detected: [], primary: null };
      const packageJsonPath = join(cwd, 'package.json');

      if (existsSync(packageJsonPath)) {
        try {
          packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
          frameworkResult = detectFramework(packageJson);

          if (frameworkResult.primary) {
            logger.success(`Framework: ${chalk.cyan(frameworkResult.primary.framework)}`);
            logger.log(chalk.gray(`  Detected packages: ${frameworkResult.primary.matchedPackages.join(', ')}`));
          } else {
            logger.warn('No i18n framework detected in package.json');
          }
        } catch (e) {
          logger.warn('Could not parse package.json');
        }
      } else {
        logger.warn('No package.json found');
      }

      // Step 2: Scan file structure
      logger.log('');
      const files = getAllFiles(cwd);
      const fileStructure = detectFileStructure(files);

      if (fileStructure.localeDirectories.length > 0) {
        logger.success(`Locale directory: ${chalk.cyan(fileStructure.localeDirectories[0])}`);
        logger.log(chalk.gray(`  Structure: ${fileStructure.structure}`));
        logger.log(chalk.gray(`  Format: ${fileStructure.fileFormat}`));
      } else {
        logger.warn('No locale directory detected');
        fileStructure.localeDirectories = ['locales'];
      }

      if (fileStructure.sourceLanguage) {
        logger.success(`Source language: ${chalk.cyan(fileStructure.sourceLanguage)}`);
      }

      if (fileStructure.targetLanguages.length > 0) {
        logger.success(`Target languages: ${chalk.cyan(fileStructure.targetLanguages.join(', '))}`);
      } else {
        logger.info('No target languages detected - using defaults (es, fr, de)');
        fileStructure.targetLanguages = ['es', 'fr', 'de'];
      }

      if (fileStructure.namespaces.length > 0) {
        logger.log(chalk.gray(`  Namespaces: ${fileStructure.namespaces.join(', ')}`));
      }

      // Step 3: Detect placeholder patterns from sample file
      let placeholderResult = { primary: 'icu' };

      if (fileStructure.localeDirectories.length > 0) {
        const localeDir = fileStructure.localeDirectories[0];
        const sourceFile = files.find(f =>
          f.startsWith(localeDir) &&
          f.endsWith('.json') &&
          (f.includes('/en') || f.includes('/en.') || f.endsWith('en.json'))
        );

        if (sourceFile) {
          try {
            const content = JSON.parse(readFileSync(join(cwd, sourceFile), 'utf8'));
            placeholderResult = detectPlaceholderPatterns(content);
            logger.success(`Placeholder format: ${chalk.cyan(placeholderResult.primary)}`);
          } catch (e) {
            // Use framework default if available
            if (frameworkResult.primary?.placeholderPattern) {
              placeholderResult.primary = frameworkResult.primary.placeholderPattern;
              logger.info(`Placeholder format: ${chalk.cyan(placeholderResult.primary)} (from framework)`);
            }
          }
        }
      }

      logger.log('');

      // Build configuration
      const sourceDir = fileStructure.structure === 'nested'
        ? `${fileStructure.localeDirectories[0]}/${fileStructure.sourceLanguage || 'en'}`
        : fileStructure.localeDirectories[0];

      const config = {
        sourceLanguage: fileStructure.sourceLanguage || 'en',
        targetLanguages: fileStructure.targetLanguages.length > 0
          ? fileStructure.targetLanguages
          : ['es', 'fr', 'de'],
        sourceDir,
        outputDir: fileStructure.localeDirectories[0] || 'locales',
        fileFormat: fileStructure.fileFormat || 'json',
        placeholderFormat: placeholderResult.primary,
        incremental: true,
        verify: true,
        selfCorrect: false
      };

      // Confirmation or auto-accept
      let confirmed = options.yes;

      if (!confirmed) {
        logger.log(chalk.cyan.bold('📝 Proposed Configuration:'));
        logger.log('');
        logger.log(JSON.stringify(config, null, 2));
        logger.log('');

        const { proceed } = await inquirer.prompt([{
          type: 'confirm',
          name: 'proceed',
          message: 'Create shipi18n.config.json with these settings?',
          default: true
        }]);
        confirmed = proceed;
      }

      if (!confirmed) {
        logger.info('Cancelled. Run again with different options or manually create config.');
        return;
      }

      // Write config file
      const configPath = join(cwd, 'shipi18n.config.json');
      writeFileSync(configPath, JSON.stringify(config, null, 2));
      logger.success(`Created ${chalk.cyan('shipi18n.config.json')}`);

      // GitHub Action workflow
      if (options.workflow !== false) {
        let createWorkflow = options.yes;

        if (!createWorkflow) {
          const { workflow } = await inquirer.prompt([{
            type: 'confirm',
            name: 'workflow',
            message: 'Create GitHub Action workflow for automatic translations?',
            default: true
          }]);
          createWorkflow = workflow;
        }

        if (createWorkflow) {
          const workflowDir = join(cwd, '.github', 'workflows');
          const workflowPath = join(workflowDir, 'translate.yml');

          // Create directories if needed
          const { mkdirSync } = await import('fs');
          mkdirSync(workflowDir, { recursive: true });

          const workflow = generateGitHubActionWorkflow({
            sourceDir: config.sourceDir,
            targetLanguages: config.targetLanguages,
            sourceLanguage: config.sourceLanguage
          });

          writeFileSync(workflowPath, workflow);
          logger.success(`Created ${chalk.cyan('.github/workflows/translate.yml')}`);
        }
      }

      // Next steps
      logger.log('');
      logger.log(chalk.cyan.bold('🚀 Next Steps:'));
      logger.log('');
      logger.log(`  1. Get your API key at ${chalk.underline('https://shipi18n.com')}`);
      logger.log(`  2. Add secret: ${chalk.yellow('SHIPI18N_API_KEY')} to your GitHub repository`);
      logger.log(`  3. Push changes to trigger automatic translations`);
      logger.log('');
      logger.log(chalk.gray('Or translate manually:'));
      logger.log(`  ${chalk.yellow(`shipi18n config set apiKey YOUR_KEY`)}`);
      logger.log(`  ${chalk.yellow(`shipi18n translate ${config.sourceDir} --target ${config.targetLanguages.join(',')}`)}`);
      logger.log('');
    });
}
