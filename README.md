# Bubulle - Code Review Notes

> Let your ideas bubble inside your code

**Bubulle** is a Visual Studio Code extension that brings GitHub-style inline code review notes to your development workflow. Add, edit, and manage contextual notes directly on any line of your code with a beautiful, intuitive interface.

![Bubulle Demo](https://via.placeholder.com/800x400/0366d6/ffffff?text=Bubulle+Extension+Demo)

## Features

### Inline Code Notes
- Add notes to any line of code with a simple right-click
- GitHub-style comment indicators appear at the end of lines
- Clean, non-intrusive design that doesn't interfere with your code

### Beautiful Interface
- Hover to preview notes with a soap bubble indicator
- Multi-line text support with automatic formatting
- Professional color scheme matching GitHub's review system
- Responsive editors for creating and editing notes

### Smart Organization
- Notes are automatically organized by file and line number
- View all notes in a comprehensive dashboard
- Quick navigation to any noted line with one click
- Persistent storage across VSCode sessions

### Developer-Friendly
- Configurable notes file location
- Atomic file operations for data safety
- Automatic backup of corrupted files
- Robust error handling and validation

## Getting Started

### Installation
1. Open VSCode
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "Bubulle"
4. Click Install

### Usage

#### Adding a Note
1. Right-click on any line number in your code
2. Select **"Add Note"** from the context menu
3. Type your note in the multi-line editor
4. Click **"Save"** or press `Ctrl+Enter`

#### Viewing Notes
- **Hover** over the icon to preview a note
- **Click** near the end of a line with a note to open the action menu
- Use **Command Palette** (`Ctrl+Shift+P`) → "Show Notes" to see all notes

#### Managing Notes
- **Edit**: Click on a note → Select "Modify"
- **Delete**: Click on a note → Select "Delete" → Confirm
- **Navigate**: Use the notes dashboard to jump to any file:line

## Configuration

This extension contributes the following settings:

- `bubulle.notesFile`: Path to the notes configuration file (default: `.bubulle-notes.json`)

### Example Configuration
```json
{
    "bubulle.notesFile": ".my-project-notes.json"
}
```

## File Structure

### Notes Storage Location
Notes are stored globally in VS Code's extension directory, allowing you to share notes across different projects:

- **Global storage**: `~/.vscode/extensions/Joey-Galligani.bubulle/.bubulle-notes.json`
- **Fallback**: `~/.bubulle-notes.json` (if extension directory cannot be created)

This means your notes are available across all your projects and workspaces!

### File Structure
```json
{
    "notes": [
        {
            "filePath": "/path/to/your/file.js",
            "line": 42,
            "text": "This function needs optimization",
            "timestamp": "2025-09-11T14:30:00.000Z"
        }
    ]
}
```

### Finding Your Notes File
To locate your notes file:
1. Open Command Palette (`Ctrl+Shift+P`)
2. Type "Bubulle: Debug Notes"
3. This will show you the file path and number of notes

## Use Cases

- **Code Reviews**: Leave detailed feedback on specific lines
- **Documentation**: Add contextual explanations to complex code
- **TODOs**: Track improvements and refactoring tasks
- **Learning**: Annotate code while studying new codebases
- **Collaboration**: Share insights with team members

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Save note | `Ctrl+Enter` |
| Cancel editing | `Escape` |
| Show all notes | `Ctrl+Shift+P` → "Show Notes" |

## Known Issues

- Notes are tied to specific line numbers and may become misaligned if code above them is modified
- Large note files (1000+ notes) may experience slower loading times

## Release Notes

### 0.1.0
- Initial release
- Basic note creation and management
- GitHub-style interface
- Multi-line note support
- Notes dashboard with file grouping

## Contributing

Found a bug or have a feature request? Please open an issue on our [GitHub repository](https://github.com/Joey-Galligani/bubulle).

## License

This extension is licensed under the MIT License. See LICENSE file for details.

---

**Enjoy bubbling your ideas!**