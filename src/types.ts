/**
 * Core types for the Bubulle extension
 */

export interface Note {
    filePath: string;
    line: number;
    text: string;
    timestamp: string;
}

export interface NotesData {
    notes: Note[];
}

export interface WebviewMessage {
    command: string;
    text?: string;
    filePath?: string;
    line?: number;
}

export interface DecorationConfig {
    overviewRulerColor: string;
    iconText: string;
    iconColor: string;
    backgroundColor: string;
    margin: string;
}

export interface ExtensionConfig {
    notesFile: string;
}
