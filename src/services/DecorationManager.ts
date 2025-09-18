/**
 * Decoration manager for handling note decorations in the editor
 */

import * as vscode from 'vscode';
import { Note } from '../types';
import { NotesStorage } from './NotesStorage';
import { formatTextForDisplay } from '../utils/textUtils';

export class DecorationManager {
    private readonly decorationType: vscode.TextEditorDecorationType;
    private readonly notesStorage: NotesStorage;

    constructor(notesStorage: NotesStorage) {
        this.notesStorage = notesStorage;
        this.decorationType = this.createDecorationType();
    }

    /**
     * Create the decoration type for notes
     */
    private createDecorationType(): vscode.TextEditorDecorationType {
        return vscode.window.createTextEditorDecorationType({
            overviewRulerColor: '#0366d6',
            overviewRulerLane: vscode.OverviewRulerLane.Right,
            after: {
                contentText: ' 💬',
                color: '#0366d6',
                backgroundColor: 'rgba(3, 102, 214, 0.1)',
                textDecoration: 'none',
                fontWeight: 'normal',
                margin: '0 0 0 12px',
                fontStyle: 'normal',
            },
        });
    }

    /**
     * Update decorations for the active editor or a specific file
     */
    public updateDecorations(targetFilePath?: string): void {
        if (targetFilePath) {
            this.updateDecorationsForFile(targetFilePath);
        } else {
            this.updateDecorationsForActiveEditor();
        }
    }

    /**
     * Update decorations for the active editor
     */
    private updateDecorationsForActiveEditor(): void {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        const filePath = editor.document.uri.fsPath;
        this.updateDecorationsForEditor(editor, filePath);
    }

    /**
     * Update decorations for a specific file
     */
    private updateDecorationsForFile(filePath: string): void {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.uri.fsPath !== filePath) {
            return;
        }

        this.updateDecorationsForEditor(editor, filePath);
    }

    /**
     * Update decorations for all visible editors
     */
    public updateDecorationsForAllEditors(): void {
        vscode.window.visibleTextEditors.forEach(editor => {
            const filePath = editor.document.uri.fsPath;
            this.updateDecorationsForEditor(editor, filePath);
        });
    }

    /**
     * Update decorations for a specific editor and file
     */
    private updateDecorationsForEditor(editor: vscode.TextEditor, filePath: string): void {
        try {
            const notes = this.notesStorage.getNotesForFile(filePath);

            console.log(`Updating decorations for ${filePath}, found ${notes.length} notes`);

            const validNotes = this.filterValidNotes(notes, editor);
            const decorations = this.createDecorations(validNotes, editor);

            console.log(`Setting ${decorations.length} decorations for ${validNotes.length} valid notes`);
            editor.setDecorations(this.decorationType, decorations);
        } catch (error) {
            console.error('Error updating decorations:', error);
        }
    }

    /**
     * Filter notes to only include those with valid line numbers
     */
    private filterValidNotes(notes: Note[], editor: vscode.TextEditor): Note[] {
        return notes.filter(note => {
            const isValid = note.line >= 0 && note.line < editor.document.lineCount;
            if (!isValid) {
                console.warn(
                    `Invalid note on line ${note.line}, document has ${editor.document.lineCount} lines`
                );
            }
            return isValid;
        });
    }

    /**
     * Create decoration options for valid notes
     */
    private createDecorations(notes: Note[], editor: vscode.TextEditor): vscode.DecorationOptions[] {
        return notes.map(note => {
            const hoverMessage = this.createHoverMessage(note);
            const lineLength = editor.document.lineAt(note.line).text.length;

            return {
                range: new vscode.Range(note.line, lineLength, note.line, lineLength),
                hoverMessage: hoverMessage,
            };
        });
    }

    /**
     * Create hover message for a note
     */
    private createHoverMessage(note: Note): vscode.MarkdownString {
        const date = new Date(note.timestamp);
        const formattedDate = isNaN(date.getTime())
            ? 'Date inconnue'
            : date.toLocaleString();

        const formattedText = formatTextForDisplay(note.text, 60);

        const hoverMessage = new vscode.MarkdownString();
        hoverMessage.supportHtml = true;
        hoverMessage.appendMarkdown('🫧\n\n');
        hoverMessage.appendMarkdown(
            `<span style="color: #0366d6;">${formattedText.replace(/\n/g, '<br>')}</span>`
        );
        hoverMessage.appendMarkdown(`\n\nAjoutée le ${formattedDate}`);

        return hoverMessage;
    }

    /**
     * Dispose of the decoration type
     */
    public dispose(): void {
        this.decorationType.dispose();
    }
}
