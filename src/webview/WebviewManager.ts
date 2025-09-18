/**
 * Webview manager for handling note creation and editing interfaces
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { Note, WebviewMessage } from '../types';
import { WEBVIEW_TYPES, DEFAULT_CONFIG, UI_STRINGS } from '../constants';
import { getRelativeDisplayPath } from '../utils/fileUtils';
import { escapeHtml } from '../utils/textUtils';

export class WebviewManager {
    /**
     * Show add note editor
     */
    public static async showAddNoteEditor(filePath: string, line: number): Promise<string | undefined> {
        const fileName = getRelativeDisplayPath(filePath);

        return new Promise(resolve => {
            const panel = vscode.window.createWebviewPanel(
                WEBVIEW_TYPES.ADD_NOTE,
                `Nouvelle note - ${fileName} (Ligne ${line + 1})`,
                vscode.ViewColumn.Beside,
                {
                    enableScripts: true,
                    retainContextWhenHidden: false,
                }
            );

            panel.webview.html = this.getAddNoteWebviewContent(fileName, line);

            panel.webview.onDidReceiveMessage((message: WebviewMessage) => {
                console.log(`[BUBULLE] Webview message received:`, message);
                switch (message.command) {
                    case 'save':
                        console.log(`[BUBULLE] Save command received with text: "${message.text}"`);
                        resolve(message.text);
                        panel.dispose();
                        break;
                    case 'cancel':
                        console.log(`[BUBULLE] Cancel command received`);
                        resolve(undefined);
                        panel.dispose();
                        break;
                }
            });

            panel.onDidDispose(() => {
                resolve(undefined);
            });
        });
    }

    /**
     * Show edit note dialog
     */
    public static async showEditNoteDialog(note: Note): Promise<string | undefined> {
        const fileName = getRelativeDisplayPath(note.filePath);

        return new Promise(resolve => {
            const panel = vscode.window.createWebviewPanel(
                WEBVIEW_TYPES.EDIT_NOTE,
                `Modifier la note - ${fileName} (Ligne ${note.line + 1})`,
                vscode.ViewColumn.Beside,
                {
                    enableScripts: true,
                    retainContextWhenHidden: false,
                }
            );

            panel.webview.html = this.getEditNoteWebviewContent(note);

            panel.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
                console.log(`[BUBULLE] Edit webview message received:`, message);
                switch (message.command) {
                    case 'save':
                        console.log(`[BUBULLE] Edit save command received with text: "${message.text}"`);
                        resolve(message.text?.trim());
                        panel.dispose();
                        break;
                    case 'cancel':
                        console.log(`[BUBULLE] Edit cancel command received`);
                        resolve(undefined);
                        panel.dispose();
                        break;
                }
            });

            panel.onDidDispose(() => {
                resolve(undefined);
            });
        });
    }

    /**
     * Show all notes in a webview
     */
    public static showAllNotesWebview(
        notes: Note[], 
        onOpenFile: (filePath: string, line: number) => void,
        onDeleteNote: (filePath: string, line: number) => void
    ): vscode.WebviewPanel {
        const panel = vscode.window.createWebviewPanel(
            WEBVIEW_TYPES.NOTES_LIST,
            `💬 Notes (${notes.length})`,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            }
        );

        panel.webview.html = this.getNotesListWebviewContent(notes);

        panel.webview.onDidReceiveMessage((message: WebviewMessage) => {
            switch (message.command) {
                case 'openFile':
                    if (message.filePath !== undefined && message.line !== undefined) {
                        onOpenFile(message.filePath, message.line);
                    }
                    break;
                case 'deleteNote':
                    if (message.filePath !== undefined && message.line !== undefined) {
                        onDeleteNote(message.filePath, message.line);
                        // Refresh the view after deletion
                        setTimeout(() => {
                            // This would need to be updated with fresh notes from the caller
                        }, 100);
                    }
                    break;
            }
        });

        return panel;
    }

    /**
     * Get webview content for adding a note
     */
    private static getAddNoteWebviewContent(fileName: string, line: number): string {
        return this.getNoteEditorTemplate({
            title: '💬 Nouvelle note',
            fileName,
            line: line + 1,
            initialText: '',
            saveButtonText: 'Sauvegarder'
        });
    }

    /**
     * Get webview content for editing a note
     */
    private static getEditNoteWebviewContent(note: Note): string {
        const fileName = path.basename(note.filePath) || 'Fichier inconnu';
        
        return this.getNoteEditorTemplate({
            title: '💬 Modifier la note',
            fileName,
            line: note.line + 1,
            initialText: note.text,
            saveButtonText: 'Sauvegarder'
        });
    }

    /**
     * Get note editor template
     */
    private static getNoteEditorTemplate(config: {
        title: string;
        fileName: string;
        line: number;
        initialText: string;
        saveButtonText: string;
    }): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    ${this.getCommonStyles()}
                    ${this.getNoteEditorStyles()}
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>${config.title}</h2>
                    <div class="file-info">
                        ${config.fileName} • Ligne ${config.line}
                    </div>
                </div>
                
                <textarea id="noteText" placeholder="Tapez votre note ici...">${config.initialText}</textarea>
                <div class="char-counter">
                    <span id="charCount">${config.initialText.length}</span>/${DEFAULT_CONFIG.MAX_NOTE_LENGTH} caractères
                </div>
                
                <div class="buttons">
                    <button class="save-btn" onclick="saveNote()">${config.saveButtonText}</button>
                    <button class="cancel-btn" onclick="cancel()">Annuler</button>
                </div>

                <script>
                    ${this.getNoteEditorScript()}
                </script>
            </body>
            </html>
        `;
    }

    /**
     * Get webview content for notes list
     */
    private static getNotesListWebviewContent(notes: Note[]): string {
        const groupedNotes = this.groupNotesByFile(notes);
        const filesHtml = Object.entries(groupedNotes)
            .map(([filePath, fileNotes]) => {
                const relativeFilePath = getRelativeDisplayPath(filePath);
                const notesHtml = fileNotes
                    .map(note => this.getNoteItemHtml(note))
                    .join('');

                return `
                <div class="file-group">
                    <div class="file-header">
                        <span class="codicon codicon-file"></span>
                        <span class="file-path">${relativeFilePath}</span>
                        <span class="note-count">${fileNotes.length} note${fileNotes.length > 1 ? 's' : ''}</span>
                    </div>
                    <div class="file-notes">
                        ${notesHtml}
                    </div>
                </div>
            `;
            })
            .join('');

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    ${this.getCommonStyles()}
                    ${this.getNotesListStyles()}
                </style>
            </head>
            <body>
                <h1>💬 Mes Notes</h1>
                ${notes.length > 0 ? filesHtml : '<div class="empty-state">Aucune note trouvée</div>'}
                
                <script>
                    ${this.getNotesListScript()}
                </script>
            </body>
            </html>
        `;
    }

    /**
     * Get HTML for a single note item
     */
    private static getNoteItemHtml(note: Note): string {
        return `
            <div class="note-item" data-file="${note.filePath}" data-line="${note.line}">
                <div class="note-header">
                    <span class="line-number">Ligne ${note.line + 1}</span>
                    <div class="note-actions">
                        <button class="action-btn open-btn" onclick="openFile('${note.filePath}', ${note.line})" title="Ouvrir le fichier">
                            <span class="codicon codicon-go-to-file"></span>
                        </button>
                        <button class="action-btn delete-btn" onclick="deleteNote('${note.filePath}', ${note.line})" title="Supprimer la note">
                            <span class="codicon codicon-trash"></span>
                        </button>
                    </div>
                </div>
                <div class="note-text">${escapeHtml(note.text)}</div>
                <div class="note-timestamp">${new Date(note.timestamp).toLocaleString()}</div>
            </div>
        `;
    }

    /**
     * Group notes by file path
     */
    private static groupNotesByFile(notes: Note[]): Record<string, Note[]> {
        return notes.reduce((groups, note) => {
            const filePath = note.filePath;
            if (!groups[filePath]) {
                groups[filePath] = [];
            }
            groups[filePath].push(note);
            return groups;
        }, {} as Record<string, Note[]>);
    }

    /**
     * Common CSS styles for all webviews
     */
    private static getCommonStyles(): string {
        return `
            body { 
                font-family: var(--vscode-font-family);
                padding: 20px;
                background: var(--vscode-editor-background);
                color: var(--vscode-editor-foreground);
                margin: 0;
            }
            
            .codicon {
                font-family: codicon;
                font-size: 14px;
            }
        `;
    }

    /**
     * CSS styles for note editor
     */
    private static getNoteEditorStyles(): string {
        return `
            .header {
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 1px solid var(--vscode-panel-border);
            }
            
            .file-info {
                font-size: 14px;
                color: var(--vscode-descriptionForeground);
                margin-bottom: 10px;
            }
            
            textarea {
                width: 100%;
                height: 200px;
                padding: 15px;
                border: 1px solid var(--vscode-input-border);
                background: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                font-family: var(--vscode-font-family);
                font-size: 14px;
                line-height: 1.4;
                border-radius: 4px;
                resize: vertical;
                min-height: 100px;
                box-sizing: border-box;
            }
            
            textarea:focus {
                outline: 1px solid var(--vscode-focusBorder);
            }
            
            .buttons {
                margin-top: 20px;
                display: flex;
                gap: 10px;
            }
            
            button {
                padding: 8px 16px;
                border: 1px solid var(--vscode-button-border);
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                cursor: pointer;
                border-radius: 4px;
                font-size: 13px;
            }
            
            button:hover {
                background: var(--vscode-button-hoverBackground);
            }
            
            .cancel-btn {
                background: var(--vscode-button-secondaryBackground);
                color: var(--vscode-button-secondaryForeground);
            }
            
            .char-counter {
                font-size: 12px;
                color: var(--vscode-descriptionForeground);
                margin-top: 5px;
                text-align: right;
            }
            
            .error {
                color: var(--vscode-errorForeground);
            }
        `;
    }

    /**
     * CSS styles for notes list
     */
    private static getNotesListStyles(): string {
        return `
            h1 {
                color: var(--vscode-foreground);
                border-bottom: 1px solid var(--vscode-panel-border);
                padding-bottom: 10px;
                margin-bottom: 25px;
            }
            
            .file-group {
                margin-bottom: 25px;
                border: 1px solid var(--vscode-panel-border);
                border-radius: 6px;
                overflow: hidden;
            }
            
            .file-header {
                background: var(--vscode-list-hoverBackground);
                padding: 12px 15px;
                display: flex;
                align-items: center;
                gap: 8px;
                font-weight: 600;
                border-bottom: 1px solid var(--vscode-panel-border);
            }
            
            .file-path {
                color: var(--vscode-textLink-foreground);
                flex-grow: 1;
            }
            
            .note-count {
                color: var(--vscode-descriptionForeground);
                font-size: 0.9em;
                font-weight: normal;
            }
            
            .note-item { 
                padding: 15px;
                border-bottom: 1px solid var(--vscode-panel-border);
                transition: background-color 0.2s;
            }
            
            .note-item:last-child {
                border-bottom: none;
            }
            
            .note-item:hover {
                background: var(--vscode-list-hoverBackground);
            }
            
            .note-header { 
                display: flex; 
                justify-content: space-between; 
                align-items: center;
                margin-bottom: 10px;
            }
            
            .line-number { 
                color: var(--vscode-descriptionForeground);
                font-weight: 600;
            }
            
            .note-actions {
                display: flex;
                gap: 5px;
                opacity: 0.7;
                transition: opacity 0.2s;
            }
            
            .note-item:hover .note-actions {
                opacity: 1;
            }
            
            .action-btn {
                background: transparent;
                border: 1px solid var(--vscode-button-border);
                color: var(--vscode-button-foreground);
                cursor: pointer;
                padding: 4px 6px;
                border-radius: 3px;
                font-size: 12px;
                transition: all 0.2s;
            }
            
            .action-btn:hover {
                background: var(--vscode-button-hoverBackground);
            }
            
            .delete-btn:hover {
                background: var(--vscode-errorBackground);
                border-color: var(--vscode-errorBorder);
            }
            
            .note-text { 
                margin-bottom: 10px; 
                padding: 12px;
                background: var(--vscode-textBlockQuote-background);
                border-left: 3px solid #0366d6;
                border-radius: 0 4px 4px 0;
                white-space: pre-wrap;
                line-height: 1.4;
            }
            
            .note-timestamp { 
                font-size: 0.85em; 
                color: var(--vscode-descriptionForeground);
                font-style: italic;
            }
            
            .empty-state {
                text-align: center;
                padding: 40px;
                color: var(--vscode-descriptionForeground);
            }
        `;
    }

    /**
     * JavaScript for note editor
     */
    private static getNoteEditorScript(): string {
        return `
            const vscode = acquireVsCodeApi();
            const textarea = document.getElementById('noteText');
            const charCount = document.getElementById('charCount');
            
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
            
            textarea.addEventListener('input', function() {
                const length = this.value.length;
                charCount.textContent = length;
                charCount.className = length > ${DEFAULT_CONFIG.MAX_NOTE_LENGTH} ? 'char-counter error' : 'char-counter';
            });
            
            textarea.addEventListener('keydown', function(e) {
                if (e.ctrlKey && e.key === 'Enter') {
                    saveNote();
                }
                if (e.key === 'Escape') {
                    cancel();
                }
            });
            
            function saveNote() {
                const text = textarea.value.trim();
                console.log('[BUBULLE] saveNote() called with text:', text);
                if (!text) {
                    console.log('[BUBULLE] Empty text, showing alert');
                    alert('${UI_STRINGS.PROMPTS.EMPTY_NOTE}');
                    return;
                }
                if (text.length > ${DEFAULT_CONFIG.MAX_NOTE_LENGTH}) {
                    console.log('[BUBULLE] Text too long, showing alert');
                    alert('${UI_STRINGS.PROMPTS.NOTE_TOO_LONG}');
                    return;
                }
                console.log('[BUBULLE] Sending save message to extension');
                vscode.postMessage({
                    command: 'save',
                    text: text
                });
            }
            
            function cancel() {
                vscode.postMessage({
                    command: 'cancel'
                });
            }
        `;
    }

    /**
     * JavaScript for notes list
     */
    private static getNotesListScript(): string {
        return `
            const vscode = acquireVsCodeApi();
            
            function openFile(filePath, line) {
                vscode.postMessage({
                    command: 'openFile',
                    filePath: filePath,
                    line: line
                });
            }
            
            function deleteNote(filePath, line) {
                if (confirm('${UI_STRINGS.PROMPTS.DELETE_FROM_LIST}')) {
                    vscode.postMessage({
                        command: 'deleteNote',
                        filePath: filePath,
                        line: line
                    });
                }
            }
        `;
    }
}
