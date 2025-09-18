/**
 * Constants used throughout the Bubulle extension
 */

export const EXTENSION_ID = 'bubulle';

export const COMMANDS = {
    ADD_NOTE: 'bubulle.addNote',
    SHOW_NOTES: 'bubulle.showNotes',
    SHOW_BUBBLE: 'bubulle.showBubble',
    CLICK_ICON: 'bubulle.clickIcon'
} as const;

export const WEBVIEW_TYPES = {
    ADD_NOTE: 'bubulleAddNote',
    EDIT_NOTE: 'bubulleEditNote',
    NOTES_LIST: 'bubulleNotes'
} as const;

export const DEFAULT_CONFIG = {
    NOTES_FILE: '.bubulle-notes.json',
    MAX_NOTE_LENGTH: 1000,
    CLICK_DEBOUNCE_TIME: 100,
    DECORATION_UPDATE_DELAY: 200,
    MAX_LINE_LENGTH_DISPLAY: 60,
    TRUNCATE_PREVIEW_LENGTH: 50
} as const;

export const UI_STRINGS = {
    ERRORS: {
        NO_ACTIVE_EDITOR: 'No active editor found.',
        INVALID_PARAMS: 'Paramètres invalides pour la note',
        ADD_NOTE_ERROR: "Erreur lors de l'ajout de la note",
        DELETE_NOTE_ERROR: 'Erreur lors de la suppression de la note',
        UPDATE_NOTE_ERROR: 'Erreur lors de la mise à jour de la note',
        SAVE_ERROR: 'Erreur lors de la sauvegarde des notes',
        LOAD_ERROR: 'Erreur lors du chargement des notes',
        CORRUPTED_FILE: 'Fichier de notes corrompu (JSON invalide)',
        OPEN_FILE_ERROR: "Impossible d'ouvrir le fichier"
    },
    SUCCESS: {
        NOTE_ADDED: 'Note ajoutée',
        NOTE_UPDATED: 'Note mise à jour',
        NOTE_DELETED: 'Note supprimée'
    },
    PROMPTS: {
        DELETE_CONFIRM: 'Supprimer la note de {fileName} (Ligne {line}) ?\n\n"{text}"',
        DELETE_FROM_LIST: 'Êtes-vous sûr de vouloir supprimer cette note ?',
        EMPTY_NOTE: 'La note ne peut pas être vide',
        NOTE_TOO_LONG: 'La note ne peut pas dépasser 1000 caractères'
    },
    INFO: {
        NO_NOTES_FOUND: 'Aucune note trouvée.',
        NOTE_NOT_FOUND: 'Note non trouvée, elle a peut-être déjà été supprimée'
    }
} as const;
