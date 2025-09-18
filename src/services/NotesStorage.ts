/**
 * Notes storage service for managing note persistence
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { Note, NotesData } from '../types';
import { UI_STRINGS } from '../constants';
import { getNotesFilePath, atomicWriteFile, safeReadFile, backupCorruptedFile } from '../utils/fileUtils';

export class NotesStorage {
    private notesFilePath: string | null = null;

    constructor() {
        // Don't initialize the path here, do it lazily when needed
    }

    /**
     * Get the notes file path, initializing it if necessary
     */
    private getNotesFilePathInternal(): string {
        if (!this.notesFilePath) {
            this.notesFilePath = getNotesFilePath();
            console.log(`[BUBULLE] Notes file path initialized: ${this.notesFilePath}`);
        }
        return this.notesFilePath;
    }

    /**
     * Load notes from storage
     */
    public loadNotes(): NotesData {
        try {
            const data = safeReadFile(this.getNotesFilePathInternal());
            
            if (!data) {
                console.log('No notes file found, starting with empty notes');
                return { notes: [] };
            }

            const parsed = JSON.parse(data);

            if (!this.isValidNotesData(parsed)) {
                console.warn('Invalid notes file structure, creating new one');
                this.backupAndReset();
                return { notes: [] };
            }

            const sanitizedNotes = this.sanitizeNotes(parsed.notes);
            console.log(`Loaded ${sanitizedNotes.length} notes from ${this.getNotesFilePathInternal()}`);
            
            return {
                notes: sanitizedNotes
            };
        } catch (error) {
            console.error('Error loading notes:', error);
            const message = error instanceof SyntaxError 
                ? UI_STRINGS.ERRORS.CORRUPTED_FILE 
                : UI_STRINGS.ERRORS.LOAD_ERROR;
            
            vscode.window.showWarningMessage(message);
            this.backupAndReset();
            return { notes: [] };
        }
    }

    /**
     * Save notes to storage
     */
    public saveNotes(notesData: NotesData): void {
        try {
            console.log(`[BUBULLE] saveNotes called with ${notesData.notes.length} notes`);
            const filePath = this.getNotesFilePathInternal();
            console.log(`[BUBULLE] Target file path: ${filePath}`);
            
            if (!this.isValidNotesData(notesData)) {
                throw new Error('Invalid notes data structure');
            }

            const jsonData = JSON.stringify(notesData, null, 2);
            console.log(`[BUBULLE] JSON data length: ${jsonData.length} characters`);
            console.log(`[BUBULLE] JSON content: ${jsonData}`);
            console.log(`[BUBULLE] Saving ${notesData.notes.length} notes to ${filePath}`);
            
            // Check if directory exists
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                console.log(`[BUBULLE] Directory does not exist, creating: ${dir}`);
                fs.mkdirSync(dir, { recursive: true });
            }
            
            atomicWriteFile(filePath, jsonData);
            console.log('[BUBULLE] Notes saved successfully');
            
            // Verify the file was written
            if (fs.existsSync(filePath)) {
                const fileSize = fs.statSync(filePath).size;
                const content = fs.readFileSync(filePath, 'utf8');
                console.log(`[BUBULLE] File verification: exists, size: ${fileSize} bytes`);
                console.log(`[BUBULLE] File content after save: ${content}`);
            } else {
                console.error('[BUBULLE] File verification failed: file does not exist after write');
            }
        } catch (error) {
            const errorMessage = `${UI_STRINGS.ERRORS.SAVE_ERROR}: ${error}`;
            console.error('[BUBULLE] Error saving notes:', error);
            vscode.window.showErrorMessage(errorMessage);
        }
    }

    /**
     * Get notes for a specific file
     */
    public getNotesForFile(filePath: string): Note[] {
        const notesData = this.loadNotes();
        const normalizedPath = path.resolve(filePath);
        return notesData.notes.filter(note => 
            path.resolve(note.filePath) === normalizedPath
        );
    }

    /**
     * Add or update a note
     */
    public addOrUpdateNote(filePath: string, line: number, text: string): boolean {
        try {
            console.log(`[BUBULLE] addOrUpdateNote called with filePath: ${filePath}, line: ${line}, text: "${text.substring(0, 50)}..."`);
            console.log(`[BUBULLE] Notes file path: ${this.notesFilePath}`);
            
            const notesData = this.loadNotes();
            console.log(`[BUBULLE] Loaded ${notesData.notes.length} existing notes`);
            
            const normalizedFilePath = path.resolve(filePath);
            console.log(`[BUBULLE] Normalized file path: ${normalizedFilePath}`);
            
            const existingNoteIndex = notesData.notes.findIndex(
                note => path.resolve(note.filePath) === normalizedFilePath && note.line === line
            );
            console.log(`[BUBULLE] Existing note index: ${existingNoteIndex}`);

            const newNote: Note = {
                filePath: normalizedFilePath,
                line,
                text: text.trim(),
                timestamp: new Date().toISOString(),
            };
            console.log(`[BUBULLE] Created new note object:`, newNote);

            if (existingNoteIndex >= 0) {
                notesData.notes[existingNoteIndex] = newNote;
                console.log(`[BUBULLE] Note updated for ${normalizedFilePath} at line ${line}`);
            } else {
                notesData.notes.push(newNote);
                console.log(`[BUBULLE] Note added for ${normalizedFilePath} at line ${line}`);
            }

            console.log(`[BUBULLE] About to save ${notesData.notes.length} notes`);
            this.saveNotes(notesData);
            console.log(`[BUBULLE] Notes saved successfully`);
            return true;
        } catch (error) {
            console.error('[BUBULLE] Error adding/updating note:', error);
            return false;
        }
    }

    /**
     * Check if a note exists for the given file and line
     */
    public noteExists(filePath: string, line: number): boolean {
        try {
            const notesData = this.loadNotes();
            const normalizedFilePath = path.resolve(filePath);
            return notesData.notes.some(
                note => path.resolve(note.filePath) === normalizedFilePath && note.line === line
            );
        } catch (error) {
            console.error('Error checking if note exists:', error);
            return false;
        }
    }

    /**
     * Delete a note
     */
    public deleteNote(filePath: string, line: number): boolean {
        try {
            const notesData = this.loadNotes();
            const originalLength = notesData.notes.length;
            const normalizedFilePath = path.resolve(filePath);

            notesData.notes = notesData.notes.filter(
                note => !(path.resolve(note.filePath) === normalizedFilePath && note.line === line)
            );

            if (notesData.notes.length === originalLength) {
                return false; // Note not found
            }

            this.saveNotes(notesData);
            return true;
        } catch (error) {
            console.error('Error deleting note:', error);
            return false;
        }
    }

    /**
     * Get all notes sorted by file and line
     */
    public getAllNotesSorted(): Note[] {
        const notesData = this.loadNotes();
        return notesData.notes.sort((a, b) => {
            const fileCompare = a.filePath.localeCompare(b.filePath);
            if (fileCompare !== 0) {
                return fileCompare;
            }
            return a.line - b.line;
        });
    }

    /**
     * Validate notes data structure
     */
    private isValidNotesData(data: any): data is NotesData {
        return data && Array.isArray(data.notes);
    }

    /**
     * Sanitize and validate individual notes
     */
    private sanitizeNotes(notes: any[]): Note[] {
        return notes
            .filter(note => this.isValidNote(note))
            .map(note => ({
                ...note,
                filePath: path.resolve(note.filePath),
                text: note.text.trim(),
            }));
    }

    /**
     * Validate individual note structure
     */
    private isValidNote(note: any): boolean {
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
    }

    /**
     * Get the notes file path (for debugging)
     */
    public getNotesFilePath(): string {
        return this.getNotesFilePathInternal();
    }

    /**
     * Initialize the notes file with empty data if it doesn't exist
     */
    public initializeNotesFile(): void {
        try {
            const filePath = this.getNotesFilePathInternal();
            console.log(`[BUBULLE] Initializing notes file at: ${filePath}`);
            
            // Check if the file already exists
            if (fs.existsSync(filePath)) {
                console.log(`[BUBULLE] Notes file already exists: ${filePath}`);
                // Verify the file content
                const content = fs.readFileSync(filePath, 'utf8');
                console.log(`[BUBULLE] Existing file content: ${content}`);
                return;
            }
            
            // Create the file with empty notes data
            const emptyNotesData: NotesData = { notes: [] };
            const jsonData = JSON.stringify(emptyNotesData, null, 2);
            
            console.log(`[BUBULLE] Creating new notes file with content: ${jsonData}`);
            fs.writeFileSync(filePath, jsonData, 'utf8');
            console.log(`[BUBULLE] Successfully initialized empty notes file: ${filePath}`);
            
            // Verify the file was created
            if (fs.existsSync(filePath)) {
                const fileSize = fs.statSync(filePath).size;
                const content = fs.readFileSync(filePath, 'utf8');
                console.log(`[BUBULLE] File verification: exists, size: ${fileSize} bytes, content: ${content}`);
            } else {
                console.error('[BUBULLE] File verification failed: file was not created');
            }
        } catch (error) {
            console.error('[BUBULLE] Error initializing notes file:', error);
        }
    }

    /**
     * Backup corrupted file and reset
     */
    private backupAndReset(): void {
        backupCorruptedFile(this.getNotesFilePathInternal());
    }
}
