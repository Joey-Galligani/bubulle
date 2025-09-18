/**
 * Bubulle - GitHub-style inline code review notes for VS Code
 * 
 * This extension allows developers to add, edit, and manage contextual notes
 * directly on any line of their code, similar to GitHub's review system.
 */

import * as vscode from 'vscode';
import { COMMANDS, UI_STRINGS } from './constants';
import { NotesManager } from './managers/NotesManager';

/**
 * Extension activation function
 */
export function activate(context: vscode.ExtensionContext): void {
    console.log('Bubulle extension is now active!');

    try {
        const notesManager = new NotesManager(context);
        registerCommands(context, notesManager);
        registerEventHandlers(context, notesManager);

        // Add the notes manager to subscriptions for proper cleanup
        context.subscriptions.push(notesManager);
    } catch (error) {
        console.error('Error activating Bubulle extension:', error);
        vscode.window.showErrorMessage('Failed to activate Bubulle extension');
    }
}

/**
 * Register all extension commands
 */
function registerCommands(context: vscode.ExtensionContext, notesManager: NotesManager): void {
    const addNoteCommand = vscode.commands.registerCommand(
        COMMANDS.ADD_NOTE,
        async (uri: vscode.Uri, line: number) => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage(UI_STRINGS.ERRORS.NO_ACTIVE_EDITOR);
                return;
            }

            const filePath = editor.document.uri.fsPath;
            const currentLine = line !== undefined ? line : editor.selection.active.line;

            await notesManager.addNote(filePath, currentLine);
        }
    );

    const showNotesCommand = vscode.commands.registerCommand(
        COMMANDS.SHOW_NOTES, 
        () => {
            notesManager.showAllNotes();
        }
    );

    const showBubbleCommand = vscode.commands.registerCommand(
        COMMANDS.SHOW_BUBBLE,
        (uri: vscode.Uri, line: number) => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const currentLine = line !== undefined ? line : editor.selection.active.line;
                notesManager.showBubbleForLine(currentLine);
            }
        }
    );

    const debugCommand = vscode.commands.registerCommand(
        'bubulle.debug',
        () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const filePath = editor.document.uri.fsPath;
                const notes = notesManager.getNotesForFile(filePath);
                const notesFilePath = notesManager.getNotesFilePath();
                vscode.window.showInformationMessage(
                    `Debug: Found ${notes.length} notes for ${filePath}\nNotes file: ${notesFilePath}`
                );
                console.log('Debug - Notes for file:', notes);
                console.log('Debug - Notes file path:', notesFilePath);
            }
        }
    );

    context.subscriptions.push(
        addNoteCommand,
        showNotesCommand,
        showBubbleCommand,
        debugCommand
    );
}

/**
 * Register event handlers for editor changes and configuration updates
 */
function registerEventHandlers(context: vscode.ExtensionContext, notesManager: NotesManager): void {
    // Handle active editor changes
    const onDidChangeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor(() => {
        if (notesManager) {
            // Add delay to let the editor stabilize
            setTimeout(() => {
                try {
                    notesManager.updateDecorations();
                } catch (error) {
                    console.error('Error updating decorations on editor change:', error);
                }
            }, 100);
        }
    });

    // Handle configuration changes
    const onDidChangeConfiguration = vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration('bubulle')) {
            try {
                // Configuration changes require extension restart for now
                vscode.window.showInformationMessage(
                    'Configuration changed. Please reload the window for changes to take effect.',
                    'Reload'
                ).then(selection => {
                    if (selection === 'Reload') {
                        vscode.commands.executeCommand('workbench.action.reloadWindow');
                    }
                });
            } catch (error) {
                console.error('Error handling configuration change:', error);
            }
        }
    });

    // Handle workspace folder changes
    const onDidChangeWorkspaceFolders = vscode.workspace.onDidChangeWorkspaceFolders(() => {
        try {
            notesManager.updateDecorations();
        } catch (error) {
            console.error('Error updating decorations on workspace change:', error);
        }
    });

    // Handle document open events
    const onDidOpenTextDocument = vscode.workspace.onDidOpenTextDocument((document) => {
        if (notesManager) {
            setTimeout(() => {
                try {
                    notesManager.updateDecorations(document.uri.fsPath);
                } catch (error) {
                    console.error('Error updating decorations on document open:', error);
                }
            }, 100);
        }
    });

    context.subscriptions.push(
        onDidChangeActiveTextEditor,
        onDidChangeConfiguration,
        onDidChangeWorkspaceFolders,
        onDidOpenTextDocument
    );
}

/**
 * Extension deactivation function
 */
export function deactivate(): void {
    console.log('Bubulle extension is being deactivated');
}
