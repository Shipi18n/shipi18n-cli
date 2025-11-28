# @shipi18n/cli

[![npm version](https://img.shields.io/npm/v/@shipi18n/cli)](https://www.npmjs.com/package/@shipi18n/cli)
[![npm downloads](https://img.shields.io/npm/dw/@shipi18n/cli)](https://www.npmjs.com/package/@shipi18n/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub last commit](https://img.shields.io/github/last-commit/Shipi18n/shipi18n-cli)](https://github.com/Shipi18n/shipi18n-cli)
[![CI](https://github.com/Shipi18n/shipi18n-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/Shipi18n/shipi18n-cli/actions)
[![codecov](https://codecov.io/gh/Shipi18n/shipi18n-cli/branch/main/graph/badge.svg)](https://codecov.io/gh/Shipi18n/shipi18n-cli)

Command-line tool for translating locale files with [Shipi18n](https://shipi18n.com).

> **🚀 Translate JSON files in seconds** - One command, multiple languages!

## Features

- ✅ **Translate JSON files** to 100+ languages with one command
- ✅ **Preserve JSON structure** - Nested objects, arrays, everything
- ✅ **Placeholder preservation** - Keep `{name}`, `{{value}}`, `%s`, etc. intact
- ✅ **Key-based pricing** - 100 free translation keys (unlimited characters!)
- ✅ **Language limits enforced** - FREE: 3 languages, STARTER: 10, PRO: unlimited
- ✅ **Config file support** - Save settings in `~/.shipi18n/config.yml`
- ✅ **Translation Memory** - Manage keys with `shipi18n keys` commands
- ✅ **Beautiful output** - Colored, formatted terminal output

## Quick Start

### 1. Install

```bash
npm install -g @shipi18n/cli
```

### 2. Get Your Free API Key

Sign up at [shipi18n.com](https://shipi18n.com) - it takes 30 seconds!

**Free tier includes:**
- 100 translation keys
- 3 languages
- 10 requests/minute
- Unlimited characters

### 3. Configure

```bash
shipi18n config set apiKey YOUR_API_KEY
```

### 4. Translate!

```bash
shipi18n translate en.json --target es,fr,de
```

Done! You now have `es.json`, `fr.json`, and `de.json` in your `./locales` folder.

## Installation

### Global (recommended)

```bash
npm install -g @shipi18n/cli
```

### Local project

```bash
npm install --save-dev @shipi18n/cli
```

Then use via npx:
```bash
npx shipi18n translate en.json --target es,fr
```

## Usage

### Translate Command

Translate a JSON locale file to multiple languages:

```bash
shipi18n translate <input> [options]
```

**Options:**
- `-t, --target <languages>` - Target languages (comma-separated, default: `es,fr`)
- `-s, --source <language>` - Source language (default: `en`)
- `-o, --output <dir>` - Output directory (default: `./locales`)
- `--api-key <key>` - API key (overrides config)
- `--preserve-placeholders` - Preserve placeholders (default: `true`)
- `--no-fallback` - Disable fallback to source for missing translations
- `--no-regional-fallback` - Disable regional fallback (e.g., pt-BR → pt)

**Examples:**

```bash
# Basic usage
shipi18n translate en.json --target es,fr

# Custom output directory
shipi18n translate en.json --target es,fr,de --output ./translations

# Specify source language
shipi18n translate ja.json --source ja --target en,es

# Use inline API key
shipi18n translate en.json --target es --api-key sk_live_...

# Translate with regional variants (pt-BR will fallback to pt if needed)
shipi18n translate en.json --target es,pt-BR,zh-TW

# Disable fallback (strict mode - fail if translation missing)
shipi18n translate en.json --target es --no-fallback
```

### Fallback Behavior

By default, the CLI handles missing translations gracefully:

| Scenario | Default Behavior |
|----------|-----------------|
| Missing translation for a language | Uses source content (English) |
| Missing regional variant (pt-BR) | Falls back to base language (pt), then source |
| Missing translation for a key | Fills from source content |

**Fallback output example:**
```
✓ Translated to 3 languages!
✓ Saved: ./locales/es.json
✓ Saved: ./locales/pt-BR.json
✓ Saved: ./locales/zh-TW.json

Fallback information:
  • pt-BR → pt (regional fallback)
  • zh-TW → en (source fallback)
  • es: 2 keys used fallback
    - checkout.terms
    - checkout.privacy

✨ Successfully translated 3 files!
```

**Disable fallback:**
```bash
# Strict mode - no fallback to source
shipi18n translate en.json --target es --no-fallback

# Disable regional fallback only (pt-BR won't fall back to pt)
shipi18n translate en.json --target pt-BR --no-regional-fallback
```

### Keys Management

Manage your translation keys in Translation Memory:

```bash
# List all saved keys
shipi18n keys list

# Export keys to JSON
shipi18n keys export --format json --output keys.json

# Delete a specific key
shipi18n keys delete <keyId>
```

### Configuration

Manage CLI settings:

```bash
# Show current configuration
shipi18n config get

# Set API key
shipi18n config set apiKey YOUR_KEY

# Set default target languages
shipi18n config set targetLanguages es,fr,de

# Initialize config file with defaults
shipi18n config init
```

### Help

```bash
# General help
shipi18n --help

# Command-specific help
shipi18n translate --help
shipi18n keys --help
shipi18n config --help
```

## Configuration File

The CLI stores settings in `~/.shipi18n/config.yml`:

```yaml
apiKey: sk_live_your_api_key_here
sourceLanguage: en
targetLanguages:
  - es
  - fr
  - de
outputDir: ./locales
saveKeys: true
```

**Priority:** Environment variables > Config file > Command-line options

## Environment Variables

You can also configure via environment variables:

```bash
export SHIPI18N_API_KEY=sk_live_your_api_key_here
export SHIPI18N_SOURCE_LANG=en
export SHIPI18N_TARGET_LANGS=es,fr,de
export SHIPI18N_OUTPUT_DIR=./locales
```

## Supported Languages

Shipi18n supports **100+ languages** including:

**Popular:**
- 🇪🇸 Spanish (es)
- 🇫🇷 French (fr)
- 🇩🇪 German (de)
- 🇯🇵 Japanese (ja)
- 🇨🇳 Chinese Simplified (zh)
- 🇨🇳 Chinese Traditional (zh-TW)
- 🇵🇹 Portuguese (pt)
- 🇷🇺 Russian (ru)
- 🇰🇷 Korean (ko)
- 🇮🇹 Italian (it)

[See full list of 100+ supported languages](https://shipi18n.com/docs/languages)

## Pricing

| Tier | Price | Keys | Languages | Rate Limit |
|------|-------|------|-----------|------------|
| **FREE** | $0/mo | 100 | 3 | 10 req/min |
| **STARTER** | $9/mo | 500 | 10 | 60 req/min |
| **PRO** | $29/mo | 10K | 100+ | 300 req/min |
| **ENTERPRISE** | Custom | Unlimited | Custom | 1000+ req/min |

**What's a "key"?** Each unique translation path (e.g., `app.welcome`) counts as one key. Translating to multiple languages doesn't multiply the count!

## Examples

### Real-World Workflow

```bash
# Your project structure
my-app/
├── locales/
│   └── en.json        # ✅ You have this
└── src/

# Translate to multiple languages
$ shipi18n translate locales/en.json --target es,fr,de,ja

# Result
my-app/
├── locales/
│   ├── en.json        # ✅ Original
│   ├── es.json        # ✅ Spanish
│   ├── fr.json        # ✅ French
│   ├── de.json        # ✅ German
│   └── ja.json        # ✅ Japanese
└── src/
```

### Input File (`en.json`)

```json
{
  "app": {
    "title": "My Application",
    "welcome": "Welcome, {username}!",
    "description": "This is a demo"
  },
  "auth": {
    "login": "Log In",
    "logout": "Log Out"
  }
}
```

### Output (`es.json`)

```json
{
  "app": {
    "title": "Mi Aplicación",
    "welcome": "¡Bienvenido, {username}!",
    "description": "Esta es una demostración"
  },
  "auth": {
    "login": "Iniciar Sesión",
    "logout": "Cerrar Sesión"
  }
}
```

Notice how:
- ✅ JSON structure is preserved
- ✅ Placeholders like `{username}` are kept intact
- ✅ Only values are translated, keys stay in English

## CI/CD Integration

### GitHub Actions

```yaml
name: Translate Locales
on: [push]

jobs:
  translate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Shipi18n CLI
        run: npm install -g @shipi18n/cli

      - name: Translate
        env:
          SHIPI18N_API_KEY: ${{ secrets.SHIPI18N_API_KEY }}
        run: shipi18n translate locales/en.json --target es,fr,de

      - name: Commit translations
        run: |
          git config user.name "github-actions"
          git config user.email "github-actions@github.com"
          git add locales/
          git commit -m "Update translations" || echo "No changes"
          git push
```

### NPM Scripts

Add to your `package.json`:

```json
{
  "scripts": {
    "translate": "shipi18n translate locales/en.json --target es,fr,de",
    "translate:dev": "shipi18n translate locales/en.json --target es",
    "translate:all": "shipi18n translate locales/en.json --target es,fr,de,ja,zh,pt,ru,ko"
  }
}
```

Then run:
```bash
npm run translate
```

## Troubleshooting

### "API key not found"

```bash
# Set your API key
shipi18n config set apiKey YOUR_KEY

# Or use environment variable
export SHIPI18N_API_KEY=YOUR_KEY

# Get your key at https://shipi18n.com
```

### "Language limit exceeded"

The FREE tier allows 3 languages. Upgrade your plan:
- **STARTER** ($9/mo) - 10 languages
- **PRO** ($29/mo) - 100+ languages

### "Rate limit exceeded"

Wait a minute or upgrade your plan for higher rate limits.

### "Invalid JSON"

Make sure your input file is valid JSON:
```bash
# Validate JSON
cat en.json | jq .
```

## Development

```bash
# Clone the repo
git clone https://github.com/Shipi18n/shipi18n-cli.git
cd shipi18n-cli

# Install dependencies
npm install

# Test locally
node bin/shipi18n.js translate test.json --target es,fr

# Link globally for testing
npm link
shipi18n --help
```

## License

MIT

## Links

- [Shipi18n Website](https://shipi18n.com)
- [Documentation](https://shipi18n.com/docs)
- [API Reference](https://shipi18n.com/docs/api)
- [GitHub](https://github.com/Shipi18n/shipi18n-cli)
- [Support](https://github.com/Shipi18n/shipi18n-cli/issues)

---

Built with ❤️ by [Shipi18n](https://shipi18n.com) - Smart translation API for developers

