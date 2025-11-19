import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import YAML from 'yaml';

const CONFIG_DIR = join(homedir(), '.shipi18n');
const CONFIG_FILE = join(CONFIG_DIR, 'config.yml');

/**
 * Get configuration from file or environment variables
 */
export function getConfig() {
  const config = {
    apiKey: process.env.SHIPI18N_API_KEY,
    sourceLanguage: process.env.SHIPI18N_SOURCE_LANG || 'en',
    targetLanguages: process.env.SHIPI18N_TARGET_LANGS?.split(','),
    outputDir: process.env.SHIPI18N_OUTPUT_DIR || './locales',
    saveKeys: process.env.SHIPI18N_SAVE_KEYS === 'true',
  };

  // Try to read from config file
  if (existsSync(CONFIG_FILE)) {
    try {
      const fileContent = readFileSync(CONFIG_FILE, 'utf8');
      const fileConfig = YAML.parse(fileContent);

      // Merge with priority: env vars > config file
      Object.keys(fileConfig).forEach((key) => {
        if (config[key] === undefined || config[key] === null) {
          config[key] = fileConfig[key];
        }
      });
    } catch (error) {
      console.warn(`Warning: Could not read config file: ${error.message}`);
    }
  }

  return config;
}

/**
 * Save configuration to file
 */
export function saveConfig(config) {
  try {
    // Create directory if it doesn't exist
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }

    const yamlContent = YAML.stringify(config);
    writeFileSync(CONFIG_FILE, yamlContent, 'utf8');
    return true;
  } catch (error) {
    throw new Error(`Failed to save config: ${error.message}`);
  }
}

/**
 * Get a specific config value
 */
export function getConfigValue(key) {
  const config = getConfig();
  return config[key];
}

/**
 * Set a specific config value
 */
export function setConfigValue(key, value) {
  const config = getConfig();
  config[key] = value;
  saveConfig(config);
}
