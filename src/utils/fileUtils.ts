/**
 * File system utilities for the Bubulle extension
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';
import { EXTENSION_ID, DEFAULT_CONFIG } from '../constants';
import { ExtensionConfig } from '../types';

/**
 * Get the configuration for the extension
 */
export function getExtensionConfig(): ExtensionConfig {
    const config = vscode.workspace.getConfiguration(EXTENSION_ID);
    return {
        notesFile: config.get<string>('notesFile') || DEFAULT_CONFIG.NOTES_FILE
    };
}

/**
 * Get the path to the notes file
 */
export function getNotesFilePath(): string {
    const config = getExtensionConfig();
    
    // Store notes in the extension directory
    const extensionPath = getExtensionPath();
    const bubulleNotesDir = path.join(extensionPath, 'bubulle-notes');
    
    try {
        // Create the bubulle-notes directory if it doesn't exist
        if (!fs.existsSync(bubulleNotesDir)) {
            fs.mkdirSync(bubulleNotesDir, { recursive: true });
            console.log(`Created bubulle-notes directory: ${bubulleNotesDir}`);
        }
        
        const notesPath = path.join(bubulleNotesDir, config.notesFile);
        console.log(`Using extension notes file: ${notesPath}`);
        return notesPath;
    } catch (error) {
        console.warn('Could not create bubulle-notes directory, falling back to home directory');
        const notesPath = path.join(os.homedir(), config.notesFile);
        console.log(`Using fallback notes file: ${notesPath}`);
        return notesPath;
    }
}

/**
 * Get the extension installation path
 */
export function getExtensionPath(): string {
    // Try to find the extension path by looking for the extension directory
    const possiblePaths = [
        // Development path
        path.join(os.homedir(), '.vscode', 'extensions', 'Joey-Galligani.bubulle'),
        // Installed extension path (case insensitive)
        path.join(os.homedir(), '.vscode', 'extensions', 'joey-galligani.bubulle-0.1.0'),
        // Alternative development path
        path.join(os.homedir(), '.vscode', 'extensions', 'bubulle'),
    ];
    
    for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
            console.log(`Found extension path: ${possiblePath}`);
            return possiblePath;
        }
    }
    
    // If no extension directory found, create one in the first possible location
    const fallbackPath = possiblePaths[0];
    console.log(`Extension directory not found, using fallback: ${fallbackPath}`);
    return fallbackPath;
}

/**
 * Get relative display path for a file
 */
export function getRelativeDisplayPath(filePath: string): string {
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const relativePath = path.relative(workspaceRoot, filePath);
        return relativePath.startsWith('..') ? path.basename(filePath) : relativePath;
    }
    return path.basename(filePath);
}

/**
 * Ensure directory exists
 */
export function ensureDirectoryExists(filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/**
 * Create backup of corrupted file
 */
export function backupCorruptedFile(filePath: string): void {
    try {
        if (fs.existsSync(filePath)) {
            const backupPath = `${filePath}.backup.${Date.now()}`;
            fs.copyFileSync(filePath, backupPath);
            console.log(`Corrupted file backed up to: ${backupPath}`);
        }
    } catch (error) {
        console.error('Failed to backup corrupted file:', error);
    }
}

/**
 * Atomic file write using temporary file
 */
export function atomicWriteFile(filePath: string, data: string): void {
    ensureDirectoryExists(filePath);
    
    const tempPath = filePath + '.tmp';
    fs.writeFileSync(tempPath, data);
    fs.renameSync(tempPath, filePath);
}

/**
 * Safe file read with error handling
 */
export function safeReadFile(filePath: string): string | null {
    try {
        if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath, 'utf8').trim();
        }
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
    }
    return null;
}
