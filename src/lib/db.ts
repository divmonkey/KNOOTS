/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Note, Folder, UserPreferences, TagDefinition } from '../types';
import { get, set, del, clear } from 'idb-keyval';

const STORAGE_KEYS = {
  NOTES: 'memento_offline_notes',
  FOLDERS: 'memento_offline_folders',
  PREFS: 'memento_offline_prefs',
  PENDING_SYNC: 'memento_pending_sync',
  TAGS: 'memento_offline_tags'
};

export interface PendingSync {
  notesToPush: string[]; // IDs of notes modified locally
  notesToDelete: string[]; // IDs of notes deleted locally
  foldersToPush: string[]; // IDs of folders modified locally
  foldersToDelete: string[]; // IDs of folders deleted locally
}

// Load default preferences
export async function loadPreferences(): Promise<UserPreferences> {
  try {
    const saved = await get(STORAGE_KEYS.PREFS);
    if (saved) {
      const prefs: UserPreferences = {
        editorOption: 'editor2',
        paneNamingOption: 'raw-formatted',
        syntaxTheme: 'dracula',
        designStyle: 'minimalist',
        ...saved
      };
      
      // If a favorite design style is set, it becomes the default each time the app loads
      if (prefs.favoriteDesignStyle) {
        prefs.designStyle = prefs.favoriteDesignStyle;
      }
      
      return prefs;
    }
  } catch (e) {
    console.error("Failed to load user preferences", e);
  }
  return {
    theme: 'light',
    typography: {
      family: 'inter',
      fontSize: 'base',
      lineHeight: 'normal'
    },
    encryptionEnabled: false,
    editorOption: 'editor2',
    paneNamingOption: 'raw-formatted',
    syntaxTheme: 'dracula',
    designStyle: 'minimalist'
  };
}

// Save preferences
export async function savePreferences(prefs: UserPreferences): Promise<void> {
  try {
    await set(STORAGE_KEYS.PREFS, prefs);
  } catch (e) {
    console.error("Failed to save user preferences", e);
  }
}

// Load notes locally
export async function loadLocalNotes(): Promise<Note[]> {
  try {
    const saved = await get(STORAGE_KEYS.NOTES);
    if (saved) {
      return saved;
    }
  } catch (e) {
    console.error("Failed to load local notes", e);
  }
  return [];
}

// Save notes locally
export async function saveLocalNotes(notes: Note[]): Promise<void> {
  try {
    await set(STORAGE_KEYS.NOTES, notes);
  } catch (e) {
    console.error("Failed to save local notes", e);
    // If even IndexedDB fails (rare), we are in trouble, but it usually has GBs of space.
  }
}

// Load folders locally
export async function loadLocalFolders(): Promise<Folder[]> {
  try {
    const saved = await get(STORAGE_KEYS.FOLDERS);
    if (saved) {
      return saved;
    }
  } catch (e) {
    console.error("Failed to load local folders", e);
  }
  return [];
}

// Save folders locally
export async function saveLocalFolders(folders: Folder[]): Promise<void> {
  try {
    await set(STORAGE_KEYS.FOLDERS, folders);
  } catch (e) {
    console.error("Failed to save local folders", e);
  }
}

// Load tags locally
export async function loadLocalTags(): Promise<TagDefinition[]> {
  try {
    const saved = await get(STORAGE_KEYS.TAGS);
    if (saved) {
      return saved;
    }
  } catch (e) {
    console.error("Failed to load local tags", e);
  }
  return [
    { name: 'Markdown', color: 'emerald' },
    { name: 'To Do', color: 'indigo' },
    { name: 'Draft', color: 'amber' }
  ];
}

// Save tags locally
export async function saveLocalTags(tags: TagDefinition[]): Promise<void> {
  try {
    await set(STORAGE_KEYS.TAGS, tags);
  } catch (e) {
    console.error("Failed to save local tags", e);
  }
}

export async function clearAllLocalData(): Promise<void> {
  await clear();
  localStorage.clear();
}

/**
 * Migration helper to move data from localStorage to IndexedDB (idb-keyval)
 * This handles the transition for users who had data stored in the old system.
 */
export async function migrateLocalStorageToIDB(): Promise<void> {
  try {
    // 1. Migrate Notes
    const oldNotes = localStorage.getItem(STORAGE_KEYS.NOTES);
    if (oldNotes) {
      const existingInIDB = await get(STORAGE_KEYS.NOTES);
      if (!existingInIDB) {
        await set(STORAGE_KEYS.NOTES, JSON.parse(oldNotes));
        console.log("Migrated notes from localStorage to IndexedDB");
      }
      localStorage.removeItem(STORAGE_KEYS.NOTES);
    }

    // 2. Migrate Folders
    const oldFolders = localStorage.getItem(STORAGE_KEYS.FOLDERS);
    if (oldFolders) {
      const existingInIDB = await get(STORAGE_KEYS.FOLDERS);
      if (!existingInIDB) {
        await set(STORAGE_KEYS.FOLDERS, JSON.parse(oldFolders));
        console.log("Migrated folders from localStorage to IndexedDB");
      }
      localStorage.removeItem(STORAGE_KEYS.FOLDERS);
    }

    // 3. Migrate Prefs
    const oldPrefs = localStorage.getItem(STORAGE_KEYS.PREFS);
    if (oldPrefs) {
      const existingInIDB = await get(STORAGE_KEYS.PREFS);
      if (!existingInIDB) {
        await set(STORAGE_KEYS.PREFS, JSON.parse(oldPrefs));
        console.log("Migrated prefs from localStorage to IndexedDB");
      }
      localStorage.removeItem(STORAGE_KEYS.PREFS);
    }

    // 4. Migrate Tags
    const oldTags = localStorage.getItem(STORAGE_KEYS.TAGS);
    if (oldTags) {
      const existingInIDB = await get(STORAGE_KEYS.TAGS);
      if (!existingInIDB) {
        await set(STORAGE_KEYS.TAGS, JSON.parse(oldTags));
        console.log("Migrated tags from localStorage to IndexedDB");
      }
      localStorage.removeItem(STORAGE_KEYS.TAGS);
    }
  } catch (err) {
    console.error("Migration from localStorage failed", err);
  }
}

