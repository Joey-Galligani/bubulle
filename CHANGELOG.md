# Change Log

All notable changes to the "bubulle" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.1.0] - 2025-09-18

### Architecture Refactoring - Code Professionalization

#### Added
- **Modular Architecture**: Complete code restructuring with clear separation of concerns
- **TypeScript Types**: Comprehensive type definitions for better type safety
- **Constants Management**: Centralized configuration and UI strings
- **Service Layer**: Dedicated services for notes storage and decoration management
- **Utility Functions**: Reusable utilities for file operations and text formatting
- **Error Handling**: Robust error management with user-friendly messages
- **Documentation**: Complete architecture documentation and contribution guide

#### Technical Improvements
- **NotesStorage Service**: Atomic file operations with corruption recovery
- **DecorationManager Service**: Optimized decoration rendering and management
- **WebviewManager**: Centralized webview creation with reusable templates
- **ClickHandler**: Improved click detection with debouncing
- **NotesManager**: High-level orchestration of all note operations

#### New File Structure
```
src/
├── constants.ts              # Global constants and configuration
├── types.ts                  # TypeScript type definitions
├── utils/                    # Reusable utilities
│   ├── fileUtils.ts         # File system operations
│   └── textUtils.ts         # Text formatting utilities
├── services/                 # Business logic services
│   ├── NotesStorage.ts      # Note persistence management
│   └── DecorationManager.ts # Editor decoration handling
├── webview/                  # User interface management
│   └── WebviewManager.ts    # Webview creation and management
└── managers/                 # High-level coordinators
    ├── ClickHandler.ts      # User interaction handling
    └── NotesManager.ts      # Note operations orchestration
```

#### Performance Improvements
- Debounced click handling to prevent multiple triggers
- Optimized decoration updates only when necessary
- Atomic file saves to prevent data corruption
- Lazy loading of note data

#### Reliability Improvements
- Comprehensive input validation
- Graceful error recovery with user feedback
- Automatic backup of corrupted files
- Type-safe operations throughout the codebase

#### Developer Experience
- Complete JSDoc documentation for all public APIs
- Contribution guide with coding standards
- Architecture documentation explaining design decisions
- Improved debugging with structured logging

#### Backwards Compatibility
- Maintains full compatibility with existing note files
- No breaking changes to user experience
- Existing notes automatically work with new architecture

### Code Quality
- **ESLint**: All code passes linting with zero warnings
- **TypeScript**: Strict type checking enabled
- **Formatting**: Consistent code formatting with Prettier
- **Modular Design**: Clear separation of responsibilities
- **Error Handling**: Comprehensive error management
- **Testing Ready**: Architecture designed for easy testing

This refactoring transforms Bubulle from a monolithic extension into a professional, maintainable, and extensible codebase suitable for open-source collaboration.

## [0.0.1] - Initial Release
- Basic note functionality
- Inline note decorations
- Note management interface