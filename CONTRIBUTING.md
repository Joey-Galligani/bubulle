# Contributing Guide - Bubulle

Thank you for your interest in contributing to Bubulle! This guide will help you understand the project structure and best practices to follow.

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm 8+
- VS Code (for testing the extension)

### Installation
```bash
git clone https://github.com/Joey-Galligani/bubulle.git
cd bubulle
npm install
```

### Development
```bash
# Compilation in watch mode
npm run watch

# Linting
npm run lint
npm run lint:fix

# Code formatting
npm run format
npm run format:check

# Tests
npm run test

# Packaging
npm run package
```

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the project structure.

### Folder Structure
```
src/
├── constants.ts              # Constants and configuration
├── types.ts                  # TypeScript types
├── utils/                    # Utilities
├── services/                 # Business logic
├── webview/                  # User interfaces
└── managers/                 # Orchestration
```

## Code Standards

### TypeScript
- Use explicit types everywhere
- Prefer interfaces over types for objects
- Document public functions with JSDoc
- Use `const assertions` when appropriate

### Naming Conventions
- **Variables/Functions**: `camelCase`
- **Classes/Interfaces**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Files**: `camelCase.ts`

### Imports/Exports
```typescript
// ✅ Good
import { COMMANDS } from '../constants';
export { NotesManager } from './NotesManager';

// ❌ Avoid
import * as constants from '../constants';
export default NotesManager;
```

### Error Handling
```typescript
// ✅ Good
try {
    const result = await riskyOperation();
    return result;
} catch (error) {
    console.error('Operation failed:', error);
    vscode.window.showErrorMessage(UI_STRINGS.ERRORS.OPERATION_FAILED);
    return null;
}

// ❌ Avoid
const result = await riskyOperation(); // No error handling
```

## Testing

### Test Structure
```
src/test/
├── unit/                     # Unit tests
├── integration/              # Integration tests
└── fixtures/                 # Test data
```

### Writing Tests
```typescript
import * as assert from 'assert';
import { NotesStorage } from '../services/NotesStorage';

suite('NotesStorage', () => {
    test('should load empty notes when file does not exist', () => {
        const storage = new NotesStorage();
        const notes = storage.loadNotes();
        assert.strictEqual(notes.notes.length, 0);
    });
});
```

## User Interfaces

### Webviews
- Use VS Code CSS variables for theming
- Implement standard keyboard shortcuts
- Handle loading and error states
- Respect accessibility guidelines

### User Messages
- Use constants from `UI_STRINGS`
- Prefer informative messages over technical errors
- Suggest corrective actions when possible

## Adding Features

### 1. Simple New Feature
1. Add types in `types.ts`
2. Add constants in `constants.ts`
3. Implement logic in the appropriate service
4. Expose via the corresponding manager
5. Add tests

### 2. New Service
1. Create file in `src/services/`
2. Define public interface
3. Implement business logic
4. Add unit tests
5. Integrate via managers

### 3. New Interface
1. Add templates in `WebviewManager`
2. Define message types
3. Implement interaction logic
4. Test with different VS Code themes

## Debugging

### Development Logs
```typescript
// In development
console.log('Debug info:', data);

// In production, use VS Code Output Channel
const outputChannel = vscode.window.createOutputChannel('Bubulle');
outputChannel.appendLine('Debug info: ' + JSON.stringify(data));
```

### Testing in VS Code
1. Open the project in VS Code
2. Press `F5` to launch in debug mode
3. A new VS Code window opens with the extension
4. Test the features
5. Check the Debug Console for logs

## PR Checklist

Before submitting a Pull Request:

- [ ] Code compiles without errors (`npm run compile`)
- [ ] Linting passed (`npm run lint`)
- [ ] Correct formatting (`npm run format:check`)
- [ ] Tests passed (`npm run test`)
- [ ] Documentation updated if necessary
- [ ] Descriptive commit messages
- [ ] Feature manually tested in VS Code

## Common Issues

### Extension doesn't load
- Check errors in the Debug Console
- Ensure `package.json` is valid
- Recompile with `npm run compile`

### Decorations don't appear
- Check that notes are saved
- Force decoration update
- Check line numbers in logs

### Webview doesn't display
- Check JavaScript errors in the webview
- Ensure HTML is valid
- Test with different VS Code themes

## Best Practices

### Performance
- Avoid expensive operations in event handlers
- Use debouncing for user interactions
- Load data lazily

### Security
- Always escape HTML content in webviews
- Validate user input data
- Use atomic saves to prevent corruption

### Accessibility
- Use appropriate labels
- Support keyboard navigation
- Respect color contrast

## Support

- **Issues**: [GitHub Issues](https://github.com/Joey-Galligani/bubulle/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Joey-Galligani/bubulle/discussions)
- **Email**: galliganijoey@gmail.com

Thank you for contributing to Bubulle!