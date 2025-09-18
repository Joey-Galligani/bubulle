/**
 * Text formatting utilities for the Bubulle extension
 */

import { DEFAULT_CONFIG } from '../constants';

/**
 * Format text for multi-line display with word wrapping
 */
export function formatTextForDisplay(text: string, maxLineLength: number = DEFAULT_CONFIG.MAX_LINE_LENGTH_DISPLAY): string {
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

/**
 * Truncate text for preview display
 */
export function truncateText(text: string, maxLength: number = DEFAULT_CONFIG.TRUNCATE_PREVIEW_LENGTH): string {
    if (text.length <= maxLength) {
        return text;
    }
    return text.substring(0, maxLength) + '...';
}

/**
 * Escape HTML characters
 */
export function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

/**
 * Format template string with variables
 */
export function formatString(template: string, variables: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
        return variables[key]?.toString() || match;
    });
}
