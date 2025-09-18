import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface Note {
    filePath: string;
    line: number;
    text: string;
    timestamp: string;
}

interface NotesData {
    notes: Note[];
}

class NotesManager {
    private notesFilePath: string;
    private decorationType: vscode.TextEditorDecorationType;

    constructor(private context: vscode.ExtensionContext) {
        this.notesFilePath = this.getNotesFilePath();
        this.decorationType = vscode.window.createTextEditorDecorationType({
            overviewRulerColor: '#0366d6',
            overviewRulerLane: vscode.OverviewRulerLane.Right,
            after: {
                contentText: ' 💬',
                color: '#0366d6',
                backgroundColor: 'rgba(3, 102, 214, 0.1)',
                textDecoration: 'none',
                fontWeight: 'normal',
                margin: '0 0 0 12px',
                fontStyle: 'normal'
            }
        });
        
        this.updateDecorations();
        this.setupClickHandler();
    }

    private getNotesFilePath(): string {
        const config = vscode.workspace.getConfiguration('bubulle');
        const notesFileName = config.get<string>('notesFile') || '.bubulle-notes.json';
        
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            return path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, notesFileName);
        }
        
        return path.join(os.homedir(), notesFileName);
    }

    private loadNotes(): NotesData {
        try {
            if (fs.existsSync(this.notesFilePath)) {
                const data = fs.readFileSync(this.notesFilePath, 'utf8').trim();
                
                if (!data) {
                    return { notes: [] };
                }
                
                const parsed = JSON.parse(data);
                
                // Validation de la structure
                if (!parsed || !Array.isArray(parsed.notes)) {
                    console.warn('Invalid notes file structure, creating new one');
                    this.backupCorruptedFile();
                    return { notes: [] };
                }
                
                // Validation et nettoyage des notes individuelles
                const validNotes = parsed.notes.filter((note: any) => {
                    const isValid = note && 
                           typeof note.filePath === 'string' && 
                           typeof note.line === 'number' && 
                           note.line >= 0 &&
                           typeof note.text === 'string' && 
                           note.text.trim().length > 0 &&
                           typeof note.timestamp === 'string';
                    
                    if (!isValid) {
                        console.warn('Invalid note found and removed:', note);
                    }
                    
                    return isValid;
                }).map((note: any) => ({
                    ...note,
                    filePath: path.resolve(note.filePath), // Normaliser le chemin
                    text: note.text.trim()
                }));
                
                return { notes: validNotes };
            }
        } catch (error) {
            console.error('Error loading notes:', error);
            const message = error instanceof SyntaxError ? 
                'Fichier de notes corrompu (JSON invalide)' : 
                'Erreur lors du chargement des notes';
            vscode.window.showWarningMessage(message);
            this.backupCorruptedFile();
        }
        return { notes: [] };
    }

    private backupCorruptedFile(): void {
        try {
            if (fs.existsSync(this.notesFilePath)) {
                const backupPath = `${this.notesFilePath}.backup.${Date.now()}`;
                fs.copyFileSync(this.notesFilePath, backupPath);
                console.log(`Corrupted file backed up to: ${backupPath}`);
            }
        } catch (error) {
            console.error('Failed to backup corrupted file:', error);
        }
    }

    private saveNotes(notesData: NotesData): void {
        try {
            // Validation avant sauvegarde
            if (!notesData || !Array.isArray(notesData.notes)) {
                throw new Error('Invalid notes data structure');
            }
            
            const dir = path.dirname(this.notesFilePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            // Sauvegarde atomique avec fichier temporaire
            const tempPath = this.notesFilePath + '.tmp';
            fs.writeFileSync(tempPath, JSON.stringify(notesData, null, 2));
            fs.renameSync(tempPath, this.notesFilePath);
            
        } catch (error) {
            vscode.window.showErrorMessage(`Erreur lors de la sauvegarde des notes: ${error}`);
            console.error('Error saving notes:', error);
        }
    }

    async addNote(filePath: string, line: number): Promise<void> {
        // Validation des paramètres
        if (!filePath || typeof line !== 'number' || line < 0) {
            vscode.window.showErrorMessage('Paramètres invalides pour la note');
            return;
        }
        
        // Ouvrir directement l'éditeur multi-ligne
        const noteText = await this.showAddNoteEditor(filePath, line);

        if (noteText && noteText.trim()) {
            try {
                const notesData = this.loadNotes();
                const existingNoteIndex = notesData.notes.findIndex(
                    note => note.filePath === filePath && note.line === line
                );

                const newNote: Note = {
                    filePath: path.resolve(filePath), // Normaliser le chemin
                    line,
                    text: noteText.trim(),
                    timestamp: new Date().toISOString()
                };

                if (existingNoteIndex >= 0) {
                    notesData.notes[existingNoteIndex] = newNote;
                    vscode.window.showInformationMessage('Note mise à jour');
                } else {
                    notesData.notes.push(newNote);
                    vscode.window.showInformationMessage('Note ajoutée');
                }

                this.saveNotes(notesData);
                this.updateDecorations();
                
                // Force une mise à jour après un délai pour s'assurer que les décorations sont visibles
                setTimeout(() => {
                    this.updateDecorations();
                }, 200);
            } catch (error) {
                vscode.window.showErrorMessage('Erreur lors de l\'ajout de la note');
                console.error('Error adding note:', error);
            }
        }
    }

    getNotesForFile(filePath: string): Note[] {
        const notesData = this.loadNotes();
        const normalizedPath = path.resolve(filePath);
        return notesData.notes.filter(note => 
            path.resolve(note.filePath) === normalizedPath
        );
    }

    private getRelativeDisplayPath(filePath: string): string {
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
            const relativePath = path.relative(workspaceRoot, filePath);
            return relativePath.startsWith('..') ? path.basename(filePath) : relativePath;
        }
        return path.basename(filePath);
    }


    private setupClickHandler(): void {
        // Créer une commande pour gérer les clics sur l'icône
        const clickCommand = vscode.commands.registerCommand('bubulle.clickIcon', (args: any) => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return;
            }
            
            const line = args?.line !== undefined ? args.line : editor.selection.active.line;
            const filePath = editor.document.uri.fsPath;
            const notes = this.getNotesForFile(filePath);
            const note = notes.find(n => n.line === line);
            
            if (note) {
                this.showSpeechBubble(note);
            }
        });
        
        this.context.subscriptions.push(clickCommand);
        
        // Détection de clics améliorée avec debounce
        let clickTimeout: NodeJS.Timeout | null = null;
        let lastClickPosition: { line: number; character: number } | null = null;
        
        const selectionHandler = vscode.window.onDidChangeTextEditorSelection((event) => {
            const editor = event.textEditor;
            const selection = event.selections[0];
            
            if (!editor || !selection.isEmpty || event.kind !== vscode.TextEditorSelectionChangeKind.Mouse) {
                return;
            }
            
            const line = selection.active.line;
            const character = selection.active.character;
            
            // Éviter les clics répétés sur la même position
            if (lastClickPosition && 
                lastClickPosition.line === line && 
                lastClickPosition.character === character) {
                return;
            }
            
            lastClickPosition = { line, character };
            
            // Debounce pour éviter les clics multiples
            if (clickTimeout) {
                clearTimeout(clickTimeout);
            }
            
            clickTimeout = setTimeout(() => {
                this.handlePotentialNoteClick(editor, line, character);
                clickTimeout = null;
            }, 100);
        });
        
        this.context.subscriptions.push(selectionHandler);
    }

    private handlePotentialNoteClick(editor: vscode.TextEditor, line: number, character: number): void {
        try {
            const lineText = editor.document.lineAt(line).text;
            const isNearEndOfLine = character >= Math.max(0, lineText.length - 10);
            
            if (isNearEndOfLine) {
                const filePath = editor.document.uri.fsPath;
                const notes = this.getNotesForFile(filePath);
                const note = notes.find(n => n.line === line);
                
                if (note) {
                    this.showSpeechBubble(note);
                }
            }
        } catch (error) {
            console.error('Error in click handler:', error);
        }
    }

    showBubbleForLine(line: number): void {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        const filePath = editor.document.uri.fsPath;
        const notes = this.getNotesForFile(filePath);
        const note = notes.find(n => n.line === line);
        
        if (note) {
            this.showSpeechBubble(note);
        }
    }

    private showSpeechBubble(note: Note): void {
        this.showEditableNoteDialog(note);
    }

    private async showEditableNoteDialog(note: Note): Promise<void> {
        const fileName = this.getRelativeDisplayPath(note.filePath);
        const truncatedText = note.text.length > 50 ? note.text.substring(0, 50) + '...' : note.text;
        const date = new Date(note.timestamp);
        const formattedDate = isNaN(date.getTime()) ? 'Date inconnue' : date.toLocaleDateString();
        
        const actions = [
            {
                label: '$(edit) Modifier',
                description: 'Éditer le contenu de cette note'
            },
            {
                label: '$(trash) Supprimer',
                description: 'Supprimer définitivement cette note'
            },
            {
                label: '$(close) Annuler',
                description: 'Fermer sans action'
            }
        ];
        
        const choice = await vscode.window.showQuickPick(actions, {
            placeHolder: `💬 ${fileName} (Ligne ${note.line + 1}) • ${formattedDate}`,
            matchOnDescription: true,
            ignoreFocusOut: true
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


    private async editNote(note: Note): Promise<void> {
        const fileName = this.getRelativeDisplayPath(note.filePath);
        
        return new Promise((resolve) => {
            const panel = vscode.window.createWebviewPanel(
                'bubulleEditNote',
                `Modifier la note - ${fileName} (Ligne ${note.line + 1})`,
                vscode.ViewColumn.Beside,
                {
                    enableScripts: true,
                    retainContextWhenHidden: false
                }
            );

            panel.webview.html = this.getEditNoteWebviewContent(note);

            panel.webview.onDidReceiveMessage(async (message) => {
                switch (message.command) {
                    case 'save':
                        if (message.text && message.text.trim() !== note.text) {
                            await this.updateNote(note, message.text.trim());
                        }
                        panel.dispose();
                        resolve();
                        break;
                    case 'cancel':
                        panel.dispose();
                        resolve();
                        break;
                }
            });

            panel.onDidDispose(() => {
                resolve();
            });
        });
    }

    private getEditNoteWebviewContent(note: Note): string {
        const fileName = path.basename(note.filePath) || 'Fichier inconnu';
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { 
                        font-family: var(--vscode-font-family);
                        padding: 20px;
                        background: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                    }
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
                    .save-btn {
                        background: var(--vscode-button-background);
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
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>💬 Modifier la note</h2>
                    <div class="file-info">
                        ${fileName} • Ligne ${note.line + 1}
                    </div>
                </div>
                
                <textarea id="noteText" placeholder="Tapez votre note ici...">${note.text}</textarea>
                <div class="char-counter">
                    <span id="charCount">${note.text.length}</span>/1000 caractères
                </div>
                
                <div class="buttons">
                    <button class="save-btn" onclick="saveNote()">Sauvegarder</button>
                    <button class="cancel-btn" onclick="cancel()">Annuler</button>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    const textarea = document.getElementById('noteText');
                    const charCount = document.getElementById('charCount');
                    
                    textarea.focus();
                    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
                    
                    textarea.addEventListener('input', function() {
                        const length = this.value.length;
                        charCount.textContent = length;
                        charCount.className = length > 1000 ? 'char-counter error' : 'char-counter';
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
                        if (!text) {
                            alert('La note ne peut pas être vide');
                            return;
                        }
                        if (text.length > 1000) {
                            alert('La note ne peut pas dépasser 1000 caractères');
                            return;
                        }
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
                </script>
            </body>
            </html>
        `;
    }

    private async showAddNoteEditor(filePath: string, line: number): Promise<string | undefined> {
        const fileName = this.getRelativeDisplayPath(filePath);
        
        return new Promise((resolve) => {
            const panel = vscode.window.createWebviewPanel(
                'bubulleAddNote',
                `Nouvelle note - ${fileName} (Ligne ${line + 1})`,
                vscode.ViewColumn.Beside,
                {
                    enableScripts: true,
                    retainContextWhenHidden: false
                }
            );

            panel.webview.html = this.getAddNoteWebviewContent(fileName, line);

            panel.webview.onDidReceiveMessage((message) => {
                switch (message.command) {
                    case 'save':
                        panel.dispose();
                        resolve(message.text);
                        break;
                    case 'cancel':
                        panel.dispose();
                        resolve(undefined);
                        break;
                }
            });

            panel.onDidDispose(() => {
                resolve(undefined);
            });
        });
    }

    private getAddNoteWebviewContent(fileName: string, line: number): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { 
                        font-family: var(--vscode-font-family);
                        padding: 20px;
                        background: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                    }
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
                    .save-btn {
                        background: var(--vscode-button-background);
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
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>💬 Nouvelle note</h2>
                    <div class="file-info">
                        ${fileName} • Ligne ${line + 1}
                    </div>
                </div>
                
                <textarea id="noteText" placeholder="Tapez votre note ici..."></textarea>
                <div class="char-counter">
                    <span id="charCount">0</span>/1000 caractères
                </div>
                
                <div class="buttons">
                    <button class="save-btn" onclick="saveNote()">Sauvegarder</button>
                    <button class="cancel-btn" onclick="cancel()">Annuler</button>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    const textarea = document.getElementById('noteText');
                    const charCount = document.getElementById('charCount');
                    
                    textarea.focus();
                    
                    textarea.addEventListener('input', function() {
                        const length = this.value.length;
                        charCount.textContent = length;
                        charCount.className = length > 1000 ? 'char-counter error' : 'char-counter';
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
                        if (!text) {
                            alert('La note ne peut pas être vide');
                            return;
                        }
                        if (text.length > 1000) {
                            alert('La note ne peut pas dépasser 1000 caractères');
                            return;
                        }
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
                </script>
            </body>
            </html>
        `;
    }

    private async deleteNote(note: Note): Promise<void> {
        const fileName = path.basename(note.filePath) || 'Fichier inconnu';
        const truncatedText = note.text.length > 50 ? note.text.substring(0, 50) + '...' : note.text;
        
        const confirm = await vscode.window.showWarningMessage(
            `Supprimer la note de ${fileName} (Ligne ${note.line + 1}) ?\n\n"${truncatedText}"`,
            { modal: true },
            'Supprimer',
            'Annuler'
        );

        if (confirm === 'Supprimer') {
            try {
                const notesData = this.loadNotes();
                const originalLength = notesData.notes.length;
                
                notesData.notes = notesData.notes.filter(
                    n => !(n.filePath === note.filePath && n.line === note.line)
                );
                
                if (notesData.notes.length === originalLength) {
                    vscode.window.showWarningMessage('Note non trouvée, elle a peut-être déjà été supprimée');
                    return;
                }
                
                this.saveNotes(notesData);
                this.updateDecorations();
                
                vscode.window.showInformationMessage('Note supprimée');
            } catch (error) {
                vscode.window.showErrorMessage('Erreur lors de la suppression de la note');
                console.error('Error deleting note:', error);
            }
        }
    }

    private async updateNote(originalNote: Note, newText: string): Promise<void> {
        const notesData = this.loadNotes();
        const noteIndex = notesData.notes.findIndex(
            n => n.filePath === originalNote.filePath && n.line === originalNote.line
        );

        if (noteIndex >= 0) {
            notesData.notes[noteIndex].text = newText;
            notesData.notes[noteIndex].timestamp = new Date().toISOString();
            
            this.saveNotes(notesData);
            this.updateDecorations();
            
            vscode.window.showInformationMessage('Note mise à jour');
        }
    }


    updateDecorations(): void {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        try {
            const filePath = editor.document.uri.fsPath;
            const notes = this.getNotesForFile(filePath);
            
            console.log(`Updating decorations for ${filePath}, found ${notes.length} notes`);
            
            // Filtrer les notes avec des numéros de ligne valides
            const validNotes = notes.filter(note => {
                const isValid = note.line >= 0 && note.line < editor.document.lineCount;
                if (!isValid) {
                    console.warn(`Invalid note on line ${note.line}, document has ${editor.document.lineCount} lines`);
                }
                return isValid;
            });
            
            console.log(`${validNotes.length} valid notes found`);
            
            const decorations: vscode.DecorationOptions[] = validNotes.map(note => {
                const date = new Date(note.timestamp);
                const formattedDate = isNaN(date.getTime()) ? 'Date inconnue' : date.toLocaleString();
                
                // Formater le texte pour l'affichage multi-ligne
                const formattedText = this.formatTextForDisplay(note.text, 60);
                
                const hoverMessage = new vscode.MarkdownString();
                hoverMessage.supportHtml = true;
                hoverMessage.appendMarkdown('🫧\n\n');
                hoverMessage.appendMarkdown(`<span style="color: #0366d6;">${formattedText.replace(/\n/g, '<br>')}</span>`);
                hoverMessage.appendMarkdown(`\n\nAjoutée le ${formattedDate}`);
                
                const lineLength = editor.document.lineAt(note.line).text.length;
                return {
                    range: new vscode.Range(note.line, lineLength, note.line, lineLength),
                    hoverMessage: hoverMessage
                };
            });

            console.log(`Setting ${decorations.length} decorations`);
            editor.setDecorations(this.decorationType, decorations);
        } catch (error) {
            console.error('Error updating decorations:', error);
        }
    }

    private formatTextForDisplay(text: string, maxLineLength: number = 60): string {
        if (!text) {
            return '';
        }
        
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';
        
        for (const word of words) {
            if (currentLine.length + word.length + 1 <= maxLineLength) {
                currentLine += (currentLine ? ' ' : '') + word;
            } else {
                if (currentLine) {
                    lines.push(currentLine);
                }
                currentLine = word;
            }
        }
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines.join('\n');
    }

    showAllNotes(): void {
        const notesData = this.loadNotes();
        
        if (notesData.notes.length === 0) {
            vscode.window.showInformationMessage('Aucune note trouvée.');
            return;
        }

        // Trier les notes par fichier puis par ligne
        const sortedNotes = notesData.notes.sort((a, b) => {
            const fileCompare = a.filePath.localeCompare(b.filePath);
            if (fileCompare !== 0) {
                return fileCompare;
            }
            return a.line - b.line;
        });

        const panel = vscode.window.createWebviewPanel(
            'bubulleNotes',
            `💬 Notes (${notesData.notes.length})`,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        panel.webview.html = this.getWebviewContent(sortedNotes);
        
        // Gérer les messages de la webview
        panel.webview.onDidReceiveMessage((message) => {
            switch (message.command) {
                case 'openFile':
                    this.openFileAtLine(message.filePath, message.line);
                    break;
                case 'deleteNote':
                    this.deleteNoteById(message.filePath, message.line);
                    // Rafraîchir la vue
                    setTimeout(() => {
                        const updatedNotes = this.loadNotes().notes.sort((a, b) => {
                            const fileCompare = a.filePath.localeCompare(b.filePath);
                            if (fileCompare !== 0) {
                                return fileCompare;
                            }
                            return a.line - b.line;
                        });
                        panel.webview.html = this.getWebviewContent(updatedNotes);
                    }, 100);
                    break;
            }
        });
    }

    private async openFileAtLine(filePath: string, line: number): Promise<void> {
        try {
            const document = await vscode.workspace.openTextDocument(filePath);
            const editor = await vscode.window.showTextDocument(document);
            const position = new vscode.Position(line, 0);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(new vscode.Range(position, position));
        } catch (error) {
            vscode.window.showErrorMessage(`Impossible d'ouvrir le fichier: ${path.basename(filePath)}`);
            console.error('Error opening file:', error);
        }
    }

    private async deleteNoteById(filePath: string, line: number): Promise<void> {
        try {
            const notesData = this.loadNotes();
            const normalizedPath = path.resolve(filePath);
            const originalLength = notesData.notes.length;
            
            notesData.notes = notesData.notes.filter(
                note => !(path.resolve(note.filePath) === normalizedPath && note.line === line)
            );
            
            if (notesData.notes.length < originalLength) {
                this.saveNotes(notesData);
                this.updateDecorations();
                vscode.window.showInformationMessage('Note supprimée');
            }
        } catch (error) {
            vscode.window.showErrorMessage('Erreur lors de la suppression');
            console.error('Error deleting note:', error);
        }
    }

    private getWebviewContent(notes: Note[]): string {
        const groupedNotes = this.groupNotesByFile(notes);
        const filesHtml = Object.entries(groupedNotes).map(([filePath, fileNotes]) => {
            const relativeFilePath = this.getRelativeDisplayPath(filePath);
            const notesHtml = fileNotes.map(note => `
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
                    <div class="note-text">${this.escapeHtml(note.text)}</div>
                    <div class="note-timestamp">${new Date(note.timestamp).toLocaleString()}</div>
                </div>
            `).join('');

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
        }).join('');

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { 
                        font-family: var(--vscode-font-family); 
                        padding: 20px; 
                        background: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                        margin: 0;
                    }
                    
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
                    
                    .file-notes {
                        padding: 0;
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
                    
                    .codicon {
                        font-family: codicon;
                        font-size: 14px;
                    }
                    
                    .empty-state {
                        text-align: center;
                        padding: 40px;
                        color: var(--vscode-descriptionForeground);
                    }
                </style>
            </head>
            <body>
                <h1>💬 Mes Notes</h1>
                ${notes.length > 0 ? filesHtml : '<div class="empty-state">Aucune note trouvée</div>'}
                
                <script>
                    const vscode = acquireVsCodeApi();
                    
                    function openFile(filePath, line) {
                        vscode.postMessage({
                            command: 'openFile',
                            filePath: filePath,
                            line: line
                        });
                    }
                    
                    function deleteNote(filePath, line) {
                        if (confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) {
                            vscode.postMessage({
                                command: 'deleteNote',
                                filePath: filePath,
                                line: line
                            });
                        }
                    }
                </script>
            </body>
            </html>
        `;
    }

    private groupNotesByFile(notes: Note[]): Record<string, Note[]> {
        return notes.reduce((groups, note) => {
            const filePath = note.filePath;
            if (!groups[filePath]) {
                groups[filePath] = [];
            }
            groups[filePath].push(note);
            return groups;
        }, {} as Record<string, Note[]>);
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
    }

    dispose(): void {
        this.decorationType.dispose();
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Bubulle extension is now active!');

    const notesManager = new NotesManager(context);

    const addNoteCommand = vscode.commands.registerCommand('bubulle.addNote', async (uri: vscode.Uri, line: number) => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor found.');
            return;
        }

        const filePath = editor.document.uri.fsPath;
        const currentLine = line !== undefined ? line : editor.selection.active.line;
        
        await notesManager.addNote(filePath, currentLine);
    });

    const showNotesCommand = vscode.commands.registerCommand('bubulle.showNotes', () => {
        notesManager.showAllNotes();
    });

    const showBubbleCommand = vscode.commands.registerCommand('bubulle.showBubble', (uri: vscode.Uri, line: number) => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const currentLine = line !== undefined ? line : editor.selection.active.line;
            notesManager.showBubbleForLine(currentLine);
        }
    });

    const onDidChangeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor(() => {
        if (notesManager) {
            // Délai pour laisser l'éditeur se stabiliser
            setTimeout(() => {
                try {
                    notesManager.updateDecorations();
                } catch (error) {
                    console.error('Error updating decorations on editor change:', error);
                }
            }, 100);
        }
    });

    // Écouter les changements de configuration
    const onDidChangeConfiguration = vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('bubulle')) {
            try {
                // Recréer le gestionnaire de notes avec la nouvelle configuration
                const newNotesManager = new NotesManager(context);
                context.subscriptions.push(newNotesManager);
            } catch (error) {
                console.error('Error updating configuration:', error);
            }
        }
    });

    // Écouter les changements de workspace
    const onDidChangeWorkspaceFolders = vscode.workspace.onDidChangeWorkspaceFolders(() => {
        try {
            notesManager.updateDecorations();
        } catch (error) {
            console.error('Error updating decorations on workspace change:', error);
        }
    });

    context.subscriptions.push(
        addNoteCommand,
        showNotesCommand,
        showBubbleCommand,
        onDidChangeActiveTextEditor,
        onDidChangeConfiguration,
        onDidChangeWorkspaceFolders,
        notesManager
    );
}

export function deactivate() {}
