/**
 * Click handler for managing note icon clicks and interactions
 */

import * as vscode from 'vscode';
import { NotesStorage } from '../services/NotesStorage';
import { DEFAULT_CONFIG } from '../constants';

export class ClickHandler {
    private clickTimeout: NodeJS.Timeout | null = null;
    private lastClickPosition: { line: number; character: number } | null = null;

    constructor(
        private context: vscode.ExtensionContext,
        private notesStorage: NotesStorage,
        private onNoteClick: (filePath: string, line: number) => void
    ) {
        this.setupClickHandler();
    }

    /**
     * Set up click handling for note icons
     */
    private setupClickHandler(): void {
        this.registerClickCommand();
        this.registerSelectionHandler();
    }

    /**
     * Register the click command for note icons
     */
    private registerClickCommand(): void {
        const clickCommand = vscode.commands.registerCommand('bubulle.clickIcon', (args: any) => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return;
            }

            const line = args?.line !== undefined ? args.line : editor.selection.active.line;
            const filePath = editor.document.uri.fsPath;
            const notes = this.notesStorage.getNotesForFile(filePath);
            const note = notes.find(n => n.line === line);

            if (note) {
                this.onNoteClick(filePath, line);
            }
        });

        this.context.subscriptions.push(clickCommand);
    }

    /**
     * Register selection change handler for click detection
     */
    private registerSelectionHandler(): void {
        const selectionHandler = vscode.window.onDidChangeTextEditorSelection(event => {
            const editor = event.textEditor;
            const selection = event.selections[0];

            if (
                !editor ||
                !selection.isEmpty ||
                event.kind !== vscode.TextEditorSelectionChangeKind.Mouse
            ) {
                return;
            }

            const line = selection.active.line;
            const character = selection.active.character;

            // Avoid repeated clicks on the same position
            if (this.isSamePosition(line, character)) {
                return;
            }

            this.lastClickPosition = { line, character };

            // Debounce to avoid multiple clicks
            this.debounceClick(() => {
                this.handlePotentialNoteClick(editor, line, character);
            });
        });

        this.context.subscriptions.push(selectionHandler);
    }

    /**
     * Check if click is on the same position as last click
     */
    private isSamePosition(line: number, character: number): boolean {
        return Boolean(this.lastClickPosition &&
            this.lastClickPosition.line === line &&
            this.lastClickPosition.character === character);
    }

    /**
     * Debounce click handling
     */
    private debounceClick(callback: () => void): void {
        if (this.clickTimeout) {
            clearTimeout(this.clickTimeout);
        }

        this.clickTimeout = setTimeout(() => {
            callback();
            this.clickTimeout = null;
        }, DEFAULT_CONFIG.CLICK_DEBOUNCE_TIME);
    }

    /**
     * Handle potential note icon click
     */
    private handlePotentialNoteClick(
        editor: vscode.TextEditor,
        line: number,
        character: number
    ): void {
        try {
            const lineText = editor.document.lineAt(line).text;
            const isNearEndOfLine = character >= Math.max(0, lineText.length - 10);

            if (isNearEndOfLine) {
                const filePath = editor.document.uri.fsPath;
                const notes = this.notesStorage.getNotesForFile(filePath);
                const note = notes.find(n => n.line === line);

                if (note) {
                    this.onNoteClick(filePath, line);
                }
            }
        } catch (error) {
            console.error('Error in click handler:', error);
        }
    }
}
