# Bubulle Architecture

This document describes the refactored architecture of the Bubulle VS Code extension.

## Project Structure

```
src/
├── constants.ts              # Global constants and configuration
├── types.ts                  # TypeScript type definitions
├── index.ts                  # Main exports
├── extension.ts              # Extension entry point
├── utils/                    # Reusable utilities
│   ├── fileUtils.ts         # File management utilities
│   └── textUtils.ts         # Text formatting utilities
├── services/                 # Business services
│   ├── NotesStorage.ts      # Note persistence management
│   └── DecorationManager.ts # Editor decoration handling
├── webview/                  # User interface management
│   └── WebviewManager.ts    # Webview creation and management
└── managers/                 # High-level managers
    ├── ClickHandler.ts      # User interaction handling
    └── NotesManager.ts      # General note operations orchestration
```

## Design Principles

### 1. Separation of Concerns
- **Services**: Pure business logic (storage, decorations)
- **Managers**: Orchestration and coordination between services
- **Utils**: Reusable utility functions
- **Webview**: User interface and presentation

### 2. Dependency Inversion
- Managers depend on abstractions, not implementations
- Dependency injection for easier testing
- Clear interfaces between layers

### 3. Robust Error Handling
- Centralized error handling with appropriate user messages
- Detailed logging for debugging
- Graceful recovery in case of error

### 4. Centralized Configuration
- Constants grouped in a dedicated file
- Centralized user interface messages
- Clear default configuration

## Main Components

### NotesStorage
**Responsibility**: Note persistence and retrieval
- Atomic save with temporary files
- Data validation and cleanup
- Corrupted file handling with backup

### DecorationManager
**Responsibility**: Display of note icons in the editor
- Creation and update of VS Code decorations
- Hover message formatting
- Invalid note filtering

### WebviewManager
**Responsibility**: User interfaces for creating/editing notes
- HTML/CSS/JS generation for webviews
- Message handling between webview and extension
- Reusable templates for different interface types

### ClickHandler
**Responsibility**: Detection and handling of clicks on icons
- Debouncing to prevent multiple triggers
- Position detection for clicks near icons
- Integration with VS Code commands

### NotesManager
**Responsibility**: General orchestration of all features
- Main entry point for note operations
- Coordination between all other components
- Component lifecycle management

## Improvements Made

### Code Quality
- **Strict TypeScript**: Explicit types everywhere
- **Modularity**: Clearly separated responsibilities
- **Reusability**: Extracted utility functions
- **Readability**: Explicit names and documentation

### Robustness
- **Error Handling**: Appropriate try-catch with user messages
- **Validation**: Input and output data validation
- **Recovery**: Automatic backup of corrupted files
- **Logging**: Detailed debug messages

### Maintainability
- **Clear Architecture**: Separation of concerns
- **Centralized Configuration**: Grouped constants and messages
- **Testability**: Injectable dependencies
- **Documentation**: Inline comments and documentation

### Performance
- **Debouncing**: Avoids repetitive operations
- **Optimized Updates**: Decorations updated only when necessary
- **Atomic Saves**: Prevents data corruption
- **Lazy Loading**: Data loaded only when needed

## Future Extensibility

The modular architecture easily allows adding:
- **New Storage Formats**: Database, cloud
- **New Decoration Types**: Custom colors, icons
- **New Interfaces**: Panels, quick picks
- **External Integrations**: GitHub, GitLab, etc.
- **Collaborative Features**: Note sharing

## Code Standards

- **Naming**: camelCase for variables/functions, PascalCase for classes
- **Imports**: Absolute imports from src/, grouped by type
- **Exports**: Named exports preferred over default exports
- **Documentation**: JSDoc for all public functions
- **Error Handling**: Always handle errors with appropriate messages