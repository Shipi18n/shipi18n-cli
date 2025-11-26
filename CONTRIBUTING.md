# Contributing to Shipi18n CLI

Thank you for your interest in contributing to the Shipi18n CLI! This document provides guidelines and instructions for contributing.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected vs actual behavior
- Your environment (OS, Node version)
- Command output or error messages
- Sample locale files if applicable

### Suggesting Enhancements

We welcome suggestions for new features or improvements! Please create an issue with:

- A clear description of the enhancement
- Why this would be useful
- Example use cases
- Any implementation ideas

### Pull Requests

1. **Fork the repository** and create your branch from `main`

```bash
git checkout -b feature/my-new-feature
```

2. **Make your changes**

   - Follow the existing code style
   - Add JSDoc comments for functions
   - Update documentation if needed

3. **Test your changes**

```bash
npm install
npm test
```

4. **Commit your changes**

Use clear, descriptive commit messages:

```bash
git commit -m "feat: add support for YAML locale files"
```

5. **Push to your fork**

```bash
git push origin feature/my-new-feature
```

6. **Open a Pull Request**

   - Describe what your PR does
   - Reference any related issues
   - Include examples of CLI usage

## Code Style Guidelines

### JavaScript/Node.js

- Use ES modules (`import`/`export`)
- Use clear, descriptive variable names
- Add JSDoc comments for functions
- Handle errors gracefully with try/catch
- Provide helpful error messages to users

**Example:**

```javascript
/**
 * Translate locale files to target languages
 * @param {Object} options - Translation options
 * @param {string} options.input - Input file path
 * @param {string[]} options.languages - Target languages
 * @returns {Promise<void>}
 */
async function translateFiles(options) {
  try {
    const spinner = ora('Translating files...').start()
    // Translation logic
    spinner.succeed('Translation complete!')
  } catch (error) {
    console.error(chalk.red('Translation failed:'), error.message)
    process.exit(1)
  }
}
```

### CLI Design

- Provide clear help text for commands
- Use descriptive option names
- Show progress for long operations
- Use colors to highlight important info
- Validate inputs before processing

### File Organization

```
shipi18n-cli/
├── bin/
│   └── shipi18n.js      # CLI entry point
├── src/
│   ├── commands/        # Command implementations
│   ├── lib/             # Core logic
│   ├── utils/           # Helper functions
│   └── index.js         # Main exports
└── __tests__/           # Jest tests
```

## Adding New Commands

To add a new CLI command:

1. **Create command file** in `src/commands/yourCommand.js`
2. **Register it** in `bin/shipi18n.js`
3. **Add tests** in `__tests__/`
4. **Update README.md** with usage examples
5. **Test thoroughly**

Example command template:

```javascript
import chalk from 'chalk'
import ora from 'ora'

export async function yourCommand(options) {
  const spinner = ora('Processing...').start()

  try {
    // Validate options
    if (!options.required) {
      throw new Error('Missing required option: --required')
    }

    // Command logic here

    spinner.succeed('Command completed!')
  } catch (error) {
    spinner.fail('Command failed')
    console.error(chalk.red('Error:'), error.message)
    process.exit(1)
  }
}
```

## Development Setup

### Prerequisites

- Node.js 18+
- npm
- A Shipi18n API key (for testing)

### Local Development

1. Clone your fork

```bash
git clone https://github.com/YOUR_USERNAME/shipi18n-cli.git
cd shipi18n-cli
```

2. Install dependencies

```bash
npm install
```

3. Create `.env` file

```bash
# Add your API key
SHIPI18N_API_KEY=sk_live_your_api_key_here
```

4. Test CLI locally

```bash
npm run dev -- translate --help
```

Or link globally:

```bash
npm link
shipi18n translate --help
```

## Testing

Before submitting a PR:

1. Run the full test suite

```bash
npm test
```

2. Test commands manually

```bash
npm run dev -- translate en.json --to es,fr
```

3. Check for errors and warnings
4. Verify help text is accurate
5. Test error handling

### Writing Tests

We use Jest for testing. Example test:

```javascript
import { translateFiles } from '../src/commands/translate.js'

describe('translate command', () => {
  it('should translate JSON files', async () => {
    const result = await translateFiles({
      input: 'test/fixtures/en.json',
      languages: ['es', 'fr']
    })
    expect(result).toBeDefined()
  })

  it('should handle missing files', async () => {
    await expect(translateFiles({
      input: 'nonexistent.json',
      languages: ['es']
    })).rejects.toThrow()
  })
})
```

## Documentation

If you add new features:

- Update README.md with usage examples
- Add JSDoc comments to functions
- Document new CLI options
- Include examples in help text

## Questions?

- Open an issue for questions
- Check existing issues and PRs
- Read the [Shipi18n documentation](https://shipi18n.com/docs)

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Keep discussions focused and professional

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Shipi18n CLI! 🎉
