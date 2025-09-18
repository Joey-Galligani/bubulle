/**
 * Main notes manager that orchestrates all note-related functionality
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { Note } from '../types';
import { UI_STRINGS, DEFAULT_CONFIG } from '../constants';
import { NotesStorage } from '../services/NotesStorage';
import { DecorationManager } from '../services/DecorationManager';
import { WebviewManager } from '../webview/WebviewManager';
import { ClickHandler } from './ClickHandler';
import { getRelativeDisplayPath } from '../utils/fileUtils';
import { truncateText, formatString } from '../utils/textUtils';

export class NotesManager {
    private readonly notesStorage: NotesStorage;
    private readonly decorationManager: DecorationManager;
    private readonly clickHandler: ClickHandler;

    constructor(private context: vscode.ExtensionContext) {
        this.notesStorage = new NotesStorage();
        this.decorationManager = new DecorationManager(this.notesStorage);
        this.clickHandler = new ClickHandler(
            context, 
            this.notesStorage, 
            this.handleNoteClick.bind(this)
        );

        // Initialize the notes directory
        this.initializeNotesDirectory();
        
        // Update decorations with a delay to ensure editor is ready
        this.updateDecorationsOnStartup();
    }

    /**
     * Add a new note or update existing one
     */
    public async addNote(filePath: string, line: number): Promise<void> {
        console.log(`[BUBULLE] Starting addNote process for file: ${filePath}, line: ${line}`);
        
        if (!this.validateNoteParameters(filePath, line)) {
            console.log('[BUBULLE] Note parameters validation failed');
            return;
        }

        console.log(`[BUBULLE] Opening webview for note creation`);
        const noteText = await WebviewManager.showAddNoteEditor(filePath, line);
        console.log(`[BUBULLE] Webview returned text: ${noteText ? `"${noteText.substring(0, 50)}..."` : 'null/undefined'}`);

        if (noteText && noteText.trim()) {
            try {
                console.log(`[BUBULLE] Checking if note already exists`);
                const noteExisted = this.notesStorage.noteExists(filePath, line);
                console.log(`[BUBULLE] Note existed: ${noteExisted}`);
                
                console.log(`[BUBULLE] Attempting to add/update note in storage`);
                const success = this.notesStorage.addOrUpdateNote(filePath, line, noteText);
                console.log(`[BUBULLE] Add/update success: ${success}`);
                
                if (success) {
                    const message = noteExisted ? UI_STRINGS.SUCCESS.NOTE_UPDATED : UI_STRINGS.SUCCESS.NOTE_ADDED;
                    vscode.window.showInformationMessage(message);
                    console.log(`[BUBULLE] Success message shown: ${message}`);

                    console.log('[BUBULLE] Updating decorations after note addition/update');
                    this.updateDecorations(filePath);
                    this.updateDecorationsForAllEditors();
                    this.updateDecorationsWithDelay(filePath);
                } else {
                    console.error('[BUBULLE] Failed to add/update note in storage');
                    vscode.window.showErrorMessage(UI_STRINGS.ERRORS.ADD_NOTE_ERROR);
                }
            } catch (error) {
                console.error('[BUBULLE] Exception during note addition:', error);
                vscode.window.showErrorMessage(UI_STRINGS.ERRORS.ADD_NOTE_ERROR);
            }
        } else {
            console.log('[BUBULLE] No note text provided or empty text, skipping note creation');
        }
    }

    /**
     * Show all notes in a webview
     */
    public showAllNotes(): void {
        const notes = this.notesStorage.getAllNotesSorted();

        if (notes.length === 0) {
            vscode.window.showInformationMessage(UI_STRINGS.INFO.NO_NOTES_FOUND);
            return;
        }

        WebviewManager.showAllNotesWebview(
            notes,
            this.openFileAtLine.bind(this),
            this.deleteNoteAndRefresh.bind(this)
        );
    }

    /**
     * Show bubble for a specific line
     */
    public showBubbleForLine(line: number): void {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        const filePath = editor.document.uri.fsPath;
        const notes = this.notesStorage.getNotesForFile(filePath);
        const note = notes.find(n => n.line === line);

        if (note) {
            this.handleNoteClick(filePath, line);
        }
    }

    /**
     * Update decorations in the active editor
     */
    public updateDecorations(targetFilePath?: string): void {
        this.decorationManager.updateDecorations(targetFilePath);
    }

    /**
     * Update decorations for all visible editors
     */
    public updateDecorationsForAllEditors(): void {
        this.decorationManager.updateDecorationsForAllEditors();
    }

    /**
     * Get notes for a specific file (for debugging)
     */
    public getNotesForFile(filePath: string): Note[] {
        return this.notesStorage.getNotesForFile(filePath);
    }

    /**
     * Handle note icon click
     */
    private async handleNoteClick(filePath: string, line: number): Promise<void> {
        const notes = this.notesStorage.getNotesForFile(filePath);
        const note = notes.find(n => n.line === line);

        if (note) {
            await this.showNoteDialog(note);
        }
    }

    /**
     * Show note dialog with edit/delete options
     */
    private async showNoteDialog(note: Note): Promise<void> {
        const fileName = getRelativeDisplayPath(note.filePath);
        const truncatedText = truncateText(note.text);
        const date = new Date(note.timestamp);
        const formattedDate = isNaN(date.getTime()) ? 'Date inconnue' : date.toLocaleDateString();

        const actions = [
            {
                label: '$(edit) Modifier',
                description: 'Éditer le contenu de cette note',
            },
            {
                label: '$(trash) Supprimer',
                description: 'Supprimer définitivement cette note',
            },
            {
                label: '$(close) Annuler',
                description: 'Fermer sans action',
            },
        ];

        const choice = await vscode.window.showQuickPick(actions, {
            placeHolder: `💬 ${fileName} (Ligne ${note.line + 1}) • ${formattedDate}`,
            matchOnDescription: true,
            ignoreFocusOut: true,
        });

        switch (choice?.label) {
            case '$(edit) Modifier':
                await this.editNote(note);
                break;
            case '$(trash) Supprimer':
                await this.deleteNote(note);
                break;
        }
    }

    /**
     * Edit an existing note
     */
    private async editNote(note: Note): Promise<void> {
        console.log(`Editing note for file: ${note.filePath}, line: ${note.line}`);
        const newText = await WebviewManager.showEditNoteDialog(note);

        if (newText && newText.trim()) {
            console.log(`New text received: ${newText.substring(0, 50)}...`);
            const success = this.notesStorage.addOrUpdateNote(note.filePath, note.line, newText);
            console.log(`Edit success: ${success}`);
            
            if (success) {
                vscode.window.showInformationMessage(UI_STRINGS.SUCCESS.NOTE_UPDATED);
                console.log('Updating decorations after note edit');
                this.updateDecorations(note.filePath);
                this.updateDecorationsForAllEditors();
                this.updateDecorationsWithDelay(note.filePath);
            } else {
                vscode.window.showErrorMessage(UI_STRINGS.ERRORS.UPDATE_NOTE_ERROR);
            }
        } else {
            console.log('No new text provided for edit');
        }
    }

    /**
     * Delete a note with confirmation
     */
    private async deleteNote(note: Note): Promise<void> {
        const fileName = path.basename(note.filePath) || 'Fichier inconnu';
        const truncatedText = truncateText(note.text);

        const confirmMessage = formatString(UI_STRINGS.PROMPTS.DELETE_CONFIRM, {
            fileName,
            line: note.line + 1,
            text: truncatedText
        });

        const confirm = await vscode.window.showWarningMessage(
            confirmMessage,
            { modal: true },
            'Supprimer',
            'Annuler'
        );

        if (confirm === 'Supprimer') {
            const success = this.notesStorage.deleteNote(note.filePath, note.line);
            
            if (success) {
                vscode.window.showInformationMessage(UI_STRINGS.SUCCESS.NOTE_DELETED);
                this.updateDecorations(note.filePath);
                this.updateDecorationsForAllEditors();
                this.updateDecorationsWithDelay(note.filePath);
            } else {
                vscode.window.showWarningMessage(UI_STRINGS.INFO.NOTE_NOT_FOUND);
            }
        }
    }

    /**
     * Open file at specific line
     */
    private async openFileAtLine(filePath: string, line: number): Promise<void> {
        try {
            const document = await vscode.workspace.openTextDocument(filePath);
            const editor = await vscode.window.showTextDocument(document);
            const position = new vscode.Position(line, 0);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(new vscode.Range(position, position));
        } catch (error) {
            const fileName = path.basename(filePath);
            vscode.window.showErrorMessage(`${UI_STRINGS.ERRORS.OPEN_FILE_ERROR}: ${fileName}`);
            console.error('Error opening file:', error);
        }
    }

    /**
     * Delete note and refresh webview
     */
    private async deleteNoteAndRefresh(filePath: string, line: number): Promise<void> {
        const success = this.notesStorage.deleteNote(filePath, line);
        
        if (success) {
            vscode.window.showInformationMessage(UI_STRINGS.SUCCESS.NOTE_DELETED);
            this.updateDecorations(filePath);
            this.updateDecorationsForAllEditors();
            this.updateDecorationsWithDelay(filePath);
        } else {
            vscode.window.showErrorMessage(UI_STRINGS.ERRORS.DELETE_NOTE_ERROR);
        }
    }

    /**
     * Validate note parameters
     */
    private validateNoteParameters(filePath: string, line: number): boolean {
        if (!filePath || typeof line !== 'number' || line < 0) {
            vscode.window.showErrorMessage(UI_STRINGS.ERRORS.INVALID_PARAMS);
            return false;
        }
        return true;
    }

    /**
     * Update decorations with a delay to ensure visibility
     */
    private updateDecorationsWithDelay(targetFilePath?: string): void {
        console.log(`Updating decorations with delay for: ${targetFilePath || 'all files'}`);
        this.updateDecorations(targetFilePath);
        
        setTimeout(() => {
            console.log(`Delayed decoration update for: ${targetFilePath || 'all files'}`);
            this.updateDecorations(targetFilePath);
            this.updateDecorationsForAllEditors();
        }, DEFAULT_CONFIG.DECORATION_UPDATE_DELAY);
    }

    /**
     * Initialize the notes directory
     */
    private initializeNotesDirectory(): void {
        try {
            // This will trigger the creation of the bubulle-notes directory
            const notesFilePath = this.notesStorage.getNotesFilePath();
            console.log(`[BUBULLE] Notes directory initialized at: ${notesFilePath}`);
            
            // Initialize the notes file with empty data if it doesn't exist
            this.notesStorage.initializeNotesFile();
        } catch (error) {
            console.error('[BUBULLE] Error initializing notes directory:', error);
        }
    }

    /**
     * Update decorations on startup with proper timing
     */
    private updateDecorationsOnStartup(): void {
        console.log('[BUBULLE] Updating decorations on startup');
        
        // Immediate update
        this.updateDecorations();
        
        // Update after a short delay to ensure editor is ready
        setTimeout(() => {
            console.log('[BUBULLE] Delayed startup decoration update');
            this.updateDecorations();
            this.updateDecorationsForAllEditors();
        }, 500);
        
        // Additional update after editor events settle
        setTimeout(() => {
            console.log('[BUBULLE] Final startup decoration update');
            this.updateDecorations();
            this.updateDecorationsForAllEditors();
        }, 1000);
    }

    /**
     * Get the notes file path (for debugging)
     */
    public getNotesFilePath(): string {
        return this.notesStorage.getNotesFilePath();
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        this.decorationManager.dispose();
    }
}
