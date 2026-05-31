/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Note, Folder, UserPreferences, SyncStatus, TagDefinition } from './types';
import {
  loadPreferences,
  savePreferences,
  loadLocalNotes,
  saveLocalNotes,
  loadLocalFolders,
  saveLocalFolders,
  loadLocalTags,
  saveLocalTags,
  clearAllLocalData,
  migrateLocalStorageToIDB
} from './lib/db';
import {
  encryptText,
  decryptText,
  hashPassphrase
} from './lib/crypto';
import {
  CustomUser,
  getCachedUser,
  logoutUser,
  fetchSyncState,
  saveNoteOnServer,
  deleteNoteOnServer,
  saveFolderOnServer,
  deleteFolderOnServer
} from './lib/api';

// Components
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import AuthBar from './components/AuthBar';
import EncryptionModal from './components/EncryptionModal';
import SettingsModal from './components/SettingsModal';
import { Menu, X, Plus, CalendarDays } from 'lucide-react';
import { getStyle } from './lib/designStyles';

export default function App() {
  // Shared Prefs
  const [prefs, setPrefs] = useState<UserPreferences>(() => ({
    theme: 'light',
    typography: { family: 'inter', fontSize: 'base', lineHeight: 'normal' },
    encryptionEnabled: false,
    editorOption: 'editor2',
    paneNamingOption: 'raw-formatted',
    syntaxTheme: 'dracula',
    designStyle: 'futuristic'
  }));
  const [user, setUser] = useState<CustomUser | null>(() => getCachedUser());
  const isLoadedRef = useRef(false);

  // Decrypted states in active React memory for typing and searching
  const [decryptedNotes, setDecryptedNotes] = useState<Note[]>([]);
  const [decryptedFolders, setDecryptedFolders] = useState<Folder[]>([]);
  const [tagDefinitions, setTagDefinitions] = useState<TagDefinition[]>([]);

  // Initial data loading from IndexedDB
  useEffect(() => {
    const initData = async () => {
      // First, migrate any data from old localStorage to the new IndexedDB
      await migrateLocalStorageToIDB();

      const savedPrefs = await loadPreferences();
      setPrefs(savedPrefs);
      isLoadedRef.current = true;
      
      const savedTags = await loadLocalTags();
      setTagDefinitions(savedTags);
      
      if (savedPrefs.encryptionEnabled) {
        setShowPassphraseModal('unlock');
      } else {
        setDecryptedNotes(await loadLocalNotes());
        setDecryptedFolders(await loadLocalFolders());
      }
    };
    initData();
  }, []);

  // Save tags locally if they change
  useEffect(() => {
    if (tagDefinitions.length > 0) {
      saveLocalTags(tagDefinitions);
    }
  }, [tagDefinitions]);

  // Navigation and Search states
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Security locks
  const [passphrase, setPassphrase] = useState<string | null>(null);
  const [showPassphraseModal, setShowPassphraseModal] = useState<'setup' | 'unlock' | null>(null);

  // Settings & Navigation Modals
  const [showSettings, setShowSettings] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Synchronization Indicators
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ state: 'offline' });

  // Prevent multiple concurrent sync writes / reads
  const isSyncingRef = useRef(false);

  // Track deleted IDs locally to bypass Firestore sync snapshot race conditions
  const deletedNoteIdsRef = useRef<Set<string>>(new Set());
  const deletedFolderIdsRef = useRef<Set<string>>(new Set());

  // Apply visual theme & styles to document body
  useEffect(() => {
    const root = window.document.documentElement;
    if (prefs.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    if (isLoadedRef.current) {
      savePreferences(prefs);
    }
  }, [prefs]);

  // Initial load when unencrypted or unlocked
  useEffect(() => {
    const loadPlaintextData = async () => {
      if (!prefs.encryptionEnabled) {
        // Load raw plaintext direct from cache
        setDecryptedNotes(await loadLocalNotes());
        setDecryptedFolders(await loadLocalFolders());
      } else if (passphrase && prefs.encryptionKeySalt) {
        // Decrypt local records on unlocked passphrase input
        const lockedNotes = await loadLocalNotes();
        const lockedFolders = await loadLocalFolders();

        const decNotes: Note[] = [];
        const decFolders: Folder[] = [];

        // Decrypt Folders
        for (const item of lockedFolders) {
          if (item.isEncrypted) {
            try {
              const name = await decryptText(item.name, passphrase, prefs.encryptionKeySalt!);
              decFolders.push({ ...item, name });
            } catch (err) {
              console.error("Local folder dec failed", err);
              decFolders.push({ ...item, name: `[Locked Folder: ${item.id}]` });
            }
          } else {
            decFolders.push(item);
          }
        }

        // Decrypt Notes
        for (const note of lockedNotes) {
          if (note.isEncrypted) {
            try {
              const title = await decryptText(note.title, passphrase, prefs.encryptionKeySalt!);
              const content = await decryptText(note.content, passphrase, prefs.encryptionKeySalt!);
              decNotes.push({ ...note, title, content });
            } catch (err) {
              console.error("Local note dec failed", err);
              decNotes.push({
                ...note,
                title: `[Encrypted Draft]`,
                content: "Locked in E2E. Provide master vault passphrase."
              });
            }
          } else {
            decNotes.push(note);
          }
        }

        setDecryptedNotes(decNotes);
        setDecryptedFolders(decFolders);
      }
    };
    loadPlaintextData();
  }, [passphrase, prefs.encryptionEnabled]);

  // Handle Backend auth state sync status updates
  useEffect(() => {
    if (user) {
      setSyncStatus({ state: 'synced', message: 'Connected to SQLite backend.' });
    } else {
      setSyncStatus({ state: 'offline', message: 'Offline mode is active. Log in to sync.' });
    }
  }, [user]);

  const triggerSync = async () => {
    if (!user || isSyncingRef.current) return;
    isSyncingRef.current = true;
    setSyncStatus({ state: 'syncing', message: 'Syncing with SQLite backend...' });

    try {
      // 1. Fetch remote folders and notes from SQLite server
      const remote = await fetchSyncState();

      // --- Folders Sync Merge ---
      const localFolders = await loadLocalFolders();
      const folderIdsMap = new Map<string, Folder>();
      const foldersToPush: Folder[] = [];

      const allFolderIds = new Set(
        [...localFolders.map(f => f.id), ...remote.folders.map(f => f.id)]
          .filter(id => !deletedFolderIdsRef.current.has(id))
      );

      for (const id of allFolderIds) {
        const localF = localFolders.find(f => f.id === id);
        const remoteF = remote.folders.find(f => f.id === id);

        if (localF && remoteF) {
          if (localF.updatedAt > remoteF.updatedAt) {
            folderIdsMap.set(id, localF);
            foldersToPush.push(localF);
          } else {
            folderIdsMap.set(id, remoteF);
          }
        } else if (localF) {
          folderIdsMap.set(id, localF);
          foldersToPush.push(localF);
        } else if (remoteF) {
          folderIdsMap.set(id, remoteF);
        }
      }

      const mergedFolders = Array.from(folderIdsMap.values());
      await saveLocalFolders(mergedFolders);

      // Decrypt folders
      const decFolders: Folder[] = [];
      for (const f of mergedFolders) {
        if (f.isEncrypted && prefs.encryptionEnabled && passphrase && prefs.encryptionKeySalt) {
          try {
            const name = await decryptText(f.name, passphrase, prefs.encryptionKeySalt);
            decFolders.push({ ...f, name });
          } catch {
            decFolders.push({ ...f, name: '[Locked Folder]' });
          }
        } else {
          decFolders.push(f);
        }
      }
      setDecryptedFolders(decFolders);

      // Push folders to SQLite backend
      for (const f of foldersToPush) {
        await saveFolderOnServer(f).catch(err => console.error("Sync push folder failed", err));
      }

      // --- Notes Sync Merge ---
      const localNotes = await loadLocalNotes();
      const noteIdsMap = new Map<string, Note>();
      const notesToPush: Note[] = [];

      const allNoteIds = new Set(
        [...localNotes.map(n => n.id), ...remote.notes.map(n => n.id)]
          .filter(id => !deletedNoteIdsRef.current.has(id))
      );

      for (const id of allNoteIds) {
        const localN = localNotes.find(n => n.id === id);
        const remoteN = remote.notes.find(n => n.id === id);

        if (localN && remoteN) {
          if (localN.updatedAt > remoteN.updatedAt) {
            noteIdsMap.set(id, localN);
            notesToPush.push(localN);
          } else {
            noteIdsMap.set(id, remoteN);
          }
        } else if (localN) {
          noteIdsMap.set(id, localN);
          notesToPush.push(localN);
        } else if (remoteN) {
          noteIdsMap.set(id, remoteN);
        }
      }

      const mergedNotes = Array.from(noteIdsMap.values());
      await saveLocalNotes(mergedNotes);

      // Decrypt notes
      const decNotes: Note[] = [];
      for (const n of mergedNotes) {
        if (n.isEncrypted && prefs.encryptionEnabled && passphrase && prefs.encryptionKeySalt) {
          try {
            const title = await decryptText(n.title, passphrase, prefs.encryptionKeySalt);
            const content = await decryptText(n.content, passphrase, prefs.encryptionKeySalt);
            decNotes.push({ ...n, title, content });
          } catch {
            decNotes.push({
              ...n,
              title: '[Locked Note]',
              content: 'Vault is currently secured. Enter password to decrypt.'
            });
          }
        } else {
          decNotes.push(n);
        }
      }
      setDecryptedNotes(decNotes);

      // Push notes to SQLite backend
      for (const n of notesToPush) {
        await saveNoteOnServer(n).catch(err => console.error("Sync push note failed", err));
      }

      setSyncStatus({ state: 'synced', lastSyncedAt: Date.now(), message: 'Cloud synchronization complete!' });
    } catch (err) {
      console.error('Synchronization failed:', err);
      setSyncStatus({ state: 'error', message: 'Synchronization failed or offline' });
    } finally {
      isSyncingRef.current = false;
    }
  };

  // Trigger sync on mount / when user changes, and run a periodic poll interval
  useEffect(() => {
    if (user) {
      triggerSync();
      const interval = setInterval(triggerSync, 30000);
      return () => clearInterval(interval);
    }
  }, [user, passphrase, prefs.encryptionEnabled]);

  // Handle local state updates (saves encrypted versions both locally and targets Cloud)
  const saveAndSyncNote = async (note: Note) => {
    // 1. Update decoded/UI memory state instantly
    setDecryptedNotes(prev => prev.map(n => n.id === note.id ? note : n));

    // 2. Wrap encrypted data for persistent writes
    let encNote = { ...note };
    if (note.isEncrypted && prefs.encryptionEnabled && passphrase && prefs.encryptionKeySalt) {
      try {
        const title = await encryptText(note.title, passphrase, prefs.encryptionKeySalt);
        const content = await encryptText(note.content, passphrase, prefs.encryptionKeySalt);
        encNote = { ...note, title, content };
      } catch (err) {
        console.error("E2E encryption wrapping failed:", err);
      }
    }

    // Write to offline IndexedDB
    const cachedNotes = await loadLocalNotes();
    const updatedCache = cachedNotes.map(n => n.id === note.id ? encNote : n);
    if (!updatedCache.some(n => n.id === note.id)) {
      updatedCache.push(encNote);
    }
    await saveLocalNotes(updatedCache);

    // 3. Sync immediately to Cloud if online (asynchronous/background to avoid blocking UI save status)
    if (user) {
      saveNoteOnServer(encNote).catch(err => {
        console.error("Background sync note failed:", err);
        setSyncStatus({ 
          state: 'error', 
          message: 'Cloud sync failed for this update.' 
        });
      });
    }
  };

  const saveAndSyncFolder = async (folder: Folder) => {
    // UI state
    setDecryptedFolders(prev => {
      if (prev.some(f => f.id === folder.id)) {
        return prev.map(f => f.id === folder.id ? folder : f);
      }
      return [...prev, folder];
    });

    let encFolder = { ...folder };
    if (folder.isEncrypted && prefs.encryptionEnabled && passphrase && prefs.encryptionKeySalt) {
      try {
        const name = await encryptText(folder.name, passphrase, prefs.encryptionKeySalt);
        encFolder = { ...folder, name };
      } catch (err) {
        console.error("E2E encryption failed on folder name:", err);
      }
    }

    // Local Disk
    const cachedFolders = await loadLocalFolders();
    const updatedCache = cachedFolders.map(f => f.id === folder.id ? encFolder : f);
    if (!updatedCache.some(f => f.id === folder.id)) {
      updatedCache.push(encFolder);
    }
    await saveLocalFolders(updatedCache);

    // Cloud Database
    if (user) {
      saveFolderOnServer(encFolder).catch(error => {
        console.error("Sync folder addition failed:", error);
      });
    }
  };

  // Create clean blank note structure
  const handleCreateNote = () => {
    const newNote: Note = {
      id: 'note_' + Math.random().toString(36).substring(2, 11),
      title: 'Untitled Note',
      content: '',
      folderId: selectedFolderId || '',
      ownerId: user?.uid || 'offline_user',
      isEncrypted: prefs.encryptionEnabled, // auto-encrypt if vault is active
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    setDecryptedNotes(prev => [newNote, ...prev]);
    saveAndSyncNote(newNote);
    setActiveNoteId(newNote.id);
    setMobileMenuOpen(false);
  };

  const handleCreateDailyNote = () => {
    const today = new Date().toISOString().split('T')[0];
    const newNote: Note = {
      id: 'note_' + Math.random().toString(36).substring(2, 11),
      title: today,
      content: '# ' + today + '\n\n',
      folderId: selectedFolderId || '',
      ownerId: user?.uid || 'offline_user',
      isEncrypted: prefs.encryptionEnabled,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setDecryptedNotes(prev => [newNote, ...prev]);
    saveAndSyncNote(newNote);
    setActiveNoteId(newNote.id);
    setMobileMenuOpen(false);
  };

  // Create folder notebook structure
  const handleCreateFolder = (name: string) => {
    const newFolder: Folder = {
      id: 'folder_' + Math.random().toString(36).substring(2, 11),
      name,
      ownerId: user?.uid || 'offline_user',
      isEncrypted: prefs.encryptionEnabled,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    saveAndSyncFolder(newFolder);
  };

  // Asynchronously update folder properties (color, icon) and sync in background
  const handleUpdateFolder = async (updatedFolder: Folder) => {
    // 1. Optimistic UI update
    setDecryptedFolders(prev => prev.map(f => f.id === updatedFolder.id ? updatedFolder : f));

    // 2. Encryption if needed
    let encFolder = { ...updatedFolder, updatedAt: Date.now() };
    if (updatedFolder.isEncrypted && prefs.encryptionEnabled && passphrase && prefs.encryptionKeySalt) {
      try {
        const name = await encryptText(updatedFolder.name, passphrase, prefs.encryptionKeySalt);
        encFolder = { ...updatedFolder, name, updatedAt: Date.now() };
      } catch (err) {
        console.error("E2E encryption failed on folder update:", err);
      }
    }

    // 3. Update IndexedDB
    const cachedFolders = await loadLocalFolders();
    const updatedCached = cachedFolders.map(f => f.id === updatedFolder.id ? encFolder : f);
    if (!cachedFolders.some(f => f.id === updatedFolder.id)) {
      updatedCached.push(encFolder);
    }
    await saveLocalFolders(updatedCached);

    // 4. Remote Sync
    if (user) {
      saveFolderOnServer(encFolder).catch(error => {
        console.error("Sync folder update failed:", error);
      });
    }
  };

  // Delete folder notebook (orphaned notes move to uncategorized)
  const handleDeleteFolder = async (folderId: string) => {
    deletedFolderIdsRef.current.add(folderId);
    setDecryptedFolders(prev => prev.filter(f => f.id !== folderId));
    
    const cachedFolders = (await loadLocalFolders()).filter(f => f.id !== folderId);
    await saveLocalFolders(cachedFolders);

    // Filter folder dependencies
    const updatedNotes = decryptedNotes.map(note => 
      note.folderId === folderId ? { ...note, folderId: '', updatedAt: Date.now() } : note
    );
    setDecryptedNotes(updatedNotes);
    
    // Save each newly uncategorized note
    for (const note of updatedNotes) {
      if (note.folderId === '') {
        await saveAndSyncNote(note);
      }
    }

    if (user) {
      deleteFolderOnServer(folderId).catch(err => {
        console.error("Remote folder delete error:", err);
      });
    }

    if (selectedFolderId === folderId) {
      setSelectedFolderId(null);
    }
  };

  // Delete note completely
  const handleDeleteNote = async (noteId: string) => {
    deletedNoteIdsRef.current.add(noteId);
    setDecryptedNotes(prev => prev.filter(n => n.id !== noteId));
    
    const cachedNotes = (await loadLocalNotes()).filter(n => n.id !== noteId);
    await saveLocalNotes(cachedNotes);

    if (activeNoteId === noteId) {
      setActiveNoteId(null);
    }

    if (user) {
      deleteNoteOnServer(noteId).catch(err => {
        console.error("Remote note deletion failure:", err);
      });
    }
  };

  // Import Backup logic
  const handleImportBackup = async (backup: { notes: Note[]; folders: Folder[] }) => {
    // 1. Wipe current offline cache and merge
    const mergedNotes = [...decryptedNotes];
    const mergedFolders = [...decryptedFolders];

    // Merge notes by unique ID
    backup.notes.forEach(note => {
      if (!mergedNotes.some(n => n.id === note.id)) {
        mergedNotes.push(note);
      }
    });

    backup.folders.forEach(folder => {
      if (!mergedFolders.some(f => f.id === folder.id)) {
        mergedFolders.push(folder);
      }
    });

    setDecryptedNotes(mergedNotes);
    setDecryptedFolders(mergedFolders);

    // Save locally
    for (const note of mergedNotes) {
      await saveAndSyncNote(note);
    }
  };

  // Full master reset
  const handleClearAllData = async () => {
    await clearAllLocalData();
    setDecryptedNotes([]);
    setDecryptedFolders([]);
    setActiveNoteId(null);
    setSelectedFolderId(null);
    setPassphrase(null);
    setPrefs({
      theme: 'light',
      typography: { family: 'inter', fontSize: 'base', lineHeight: 'normal' },
      encryptionEnabled: false
    });
    setShowPassphraseModal(null);
  };

  // Re-encrypt/E2E trigger disables
  const handleDisableEncryption = async () => {
    // Decrypt all existing locked notes back to normal local formats
    const plainNotes = [...decryptedNotes].map(note => ({ ...note, isEncrypted: false }));
    const plainFolders = [...decryptedFolders].map(folder => ({ ...folder, isEncrypted: false }));

    setDecryptedNotes(plainNotes);
    setDecryptedFolders(plainFolders);

    // Update state settings
    const updatedPrefs = {
      ...prefs,
      encryptionEnabled: false,
      encryptionKeySalt: undefined,
      encryptionKeyHash: undefined
    };
    setPrefs(updatedPrefs);
    setPassphrase(null);
    savePreferences(updatedPrefs);

    // Overwrite cached values
    saveLocalNotes(plainNotes);
    saveLocalFolders(plainFolders);

    // Sync changes to Cloud directly
    for (const note of plainNotes) {
      await saveAndSyncNote(note);
    }
  };

  const handleManualSyncTrigger = () => {
    if (!user) {
      setSyncStatus({ state: 'offline', message: 'In offline mode. Log in to sync.' });
      return;
    }
    triggerSync();
  };

  const activeNote = decryptedNotes.find(n => n.id === activeNoteId) || null;
  const stylePrefs = getStyle(prefs.designStyle);

  return (
    <div className={`flex flex-col md:flex-row p-4 md:p-5 h-screen w-screen overflow-hidden ${stylePrefs.containerClass} font-sans text-slate-800 dark:text-zinc-100 transition-all duration-300 gap-4 pb-[80px] md:pb-5`}>
      
      {/* Side Rail / Bottom Nav (formerly Primary Top Access Bar) */}
      <div className={`fixed bottom-0 left-0 right-0 md:relative md:w-[76px] md:h-full flex flex-row md:flex-col items-center justify-between px-6 py-3 md:px-0 md:py-6 bg-slate-50/80 dark:bg-zinc-900/80 backdrop-blur-xl md:backdrop-blur-none md:bg-transparent md:dark:bg-transparent z-50 md:z-auto border-t md:border-t-0 md:border-r border-slate-200/50 dark:border-zinc-800/50 shrink-0 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] md:shadow-none`}>
        <div className="flex flex-row md:flex-col items-center gap-3 md:gap-5 w-full md:w-auto">
          {/* Mobile navigation toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          {/* App Brand Logo */}
          <div className="flex flex-row md:flex-col items-center gap-3">
            <div className={`h-9 w-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-500/20 font-black tracking-tight text-base select-none ${stylePrefs.titleFontClass} shrink-0`}>
              K
            </div>
          </div>
        </div>

        {/* Global Network details */}
        <div className="flex items-center justify-center md:pb-4 w-full md:w-auto">
          <AuthBar
            user={user}
            syncStatus={syncStatus}
            onUserChanged={setUser}
            onTriggerSync={handleManualSyncTrigger}
          />
        </div>
      </div>

      {/* Main Container Stage splits Sidebar vs Editor */}
      <div className="flex-1 flex overflow-hidden min-h-0 min-w-0 relative gap-4">
        
         {/* SIDEBAR VIEWPORT */}
        {/* Desktop Sidebar */}
        <div className="hidden md:flex h-full shrink-0">
          <Sidebar
            notes={decryptedNotes}
            folders={decryptedFolders}
            activeNoteId={activeNoteId}
            selectedFolderId={selectedFolderId}
            onSelectNote={onSelectNoteId => {
              setActiveNoteId(onSelectNoteId);
              setMobileMenuOpen(false);
            }}
            onSelectFolder={setSelectedFolderId}
            onCreateFolder={handleCreateFolder}
            onDeleteFolder={handleDeleteFolder}
            onCreateNote={handleCreateNote}
            onOpenSettings={() => setShowSettings(true)}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            encryptionUnlocked={!!passphrase}
            prefs={prefs}
            onUpdatePrefs={setPrefs}
            onDeleteNote={handleDeleteNote}
            onUpdateFolder={handleUpdateFolder}
            user={user}
            syncStatus={syncStatus}
            tagDefinitions={tagDefinitions}
            onUpdateTagDefinitions={setTagDefinitions}
            onUpdateNote={saveAndSyncNote}
          />
        </div>

        {/* Mobile Sidebar overlay Drawer slider */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-30 flex md:hidden bg-slate-950/40 backdrop-blur-xs">
            <div className="w-[85vw] max-w-xs bg-white dark:bg-slate-900 h-full animate-slide-in shadow-2xl">
              <Sidebar
                notes={decryptedNotes}
                folders={decryptedFolders}
                activeNoteId={activeNoteId}
                selectedFolderId={selectedFolderId}
                onSelectNote={onSelectNoteId => {
                  setActiveNoteId(onSelectNoteId);
                  setMobileMenuOpen(false);
                }}
                onSelectFolder={setSelectedFolderId}
                onCreateFolder={handleCreateFolder}
                onDeleteFolder={handleDeleteFolder}
                onCreateNote={handleCreateNote}
                onOpenSettings={() => {
                  setShowSettings(true);
                  setMobileMenuOpen(false);
                }}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                encryptionUnlocked={!!passphrase}
                prefs={prefs}
                onUpdatePrefs={setPrefs}
                onDeleteNote={handleDeleteNote}
                onUpdateFolder={handleUpdateFolder}
                user={user}
                syncStatus={syncStatus}
                tagDefinitions={tagDefinitions}
                onUpdateTagDefinitions={setTagDefinitions}
                onUpdateNote={saveAndSyncNote}
              />
            </div>
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="flex-1 h-full cursor-default"
            />
          </div>
        )}

        {/* DISTRACTION-FREE WRITING CANVAS WORKSPACE */}
        <div className="flex-1 h-full min-w-0 z-10 flex flex-col gap-4">
          {/* ADD NEW NOTE & PLATFORM SWITCHER CARD */}
          <div className="h-[52px] shrink-0 flex items-center gap-1.5 p-1 rounded-xl bg-white shadow-xl z-20 self-start text-slate-900 whitespace-nowrap min-w-max">
            {/* Left Segment: Add Note */}
            <button
              onClick={handleCreateNote}
              className="px-5 h-full bg-transparent hover:bg-slate-100 rounded-lg flex items-center justify-center gap-2 group cursor-pointer active:scale-95 transition-all duration-200"
            >
              <Plus size={18} className="text-slate-900" strokeWidth={2.5} />
              <span className="text-slate-900 font-condensed font-bold tracking-tight uppercase whitespace-nowrap pt-[2px]">Add Note</span>
            </button>

            <button
              onClick={handleCreateDailyNote}
              className="px-5 h-full bg-slate-50 border border-slate-100 hover:bg-slate-100 rounded-lg flex items-center justify-center gap-2 group cursor-pointer active:scale-95 transition-all duration-200"
              title="Create Daily Note Scratchpad"
            >
              <CalendarDays size={16} className="text-indigo-600" strokeWidth={2.5} />
              <span className="text-slate-900 font-condensed font-bold tracking-tight uppercase whitespace-nowrap pt-[2px]">Daily</span>
            </button>

            {/* Middle divider */}
            <div className="w-[1px] h-3/5 bg-slate-200 shrink-0"></div>

            {/* Right Segment: Switcher */}
            <div className="h-full bg-transparent rounded-lg flex items-center p-1 relative overflow-hidden flex-nowrap">
              <button
                onClick={() => setPrefs({ ...prefs, editorOption: 'editor1' })}
                className={`flex-1 h-full rounded-md flex items-center justify-center px-4 font-condensed font-bold transition-all z-10 whitespace-nowrap pt-[2px] ${
                  prefs.editorOption === 'editor1' 
                    ? 'bg-[#5B56F5] text-white shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Rich Text
              </button>
              <div className="px-1 text-slate-400 flex items-center justify-center z-10 scale-90">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left-right opacity-80"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>
              </div>
              <button
                onClick={() => setPrefs({ ...prefs, editorOption: 'editor2' })}
                className={`flex-1 h-full rounded-md flex items-center justify-center px-4 font-condensed font-bold transition-all z-10 whitespace-nowrap pt-[2px] ${
                  prefs.editorOption === 'editor2' 
                    ? 'bg-[#5B56F5] text-white shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Markdown
              </button>
            </div>
          </div>
          
          <div className="flex-1 min-h-0 relative">
            <Editor
              note={activeNote}
              folders={decryptedFolders}
              prefs={prefs}
              onUpdatePrefs={setPrefs}
              onUpdateNote={saveAndSyncNote}
              onDeleteNote={handleDeleteNote}
              encryptionUnlocked={!!passphrase}
              onTriggerEncryptionSetup={() => setShowPassphraseModal('setup')}
              tagDefinitions={tagDefinitions}
              onUpdateTagDefinitions={setTagDefinitions}
            />
          </div>
        </div>
      </div>

      {/* OVERLAY SYSTEM POPUPS */}
      
      {/* Cryptographic Key/Passphrase Setup or Vault lockscreen overlay */}
      {showPassphraseModal && (
        <EncryptionModal
          prefs={prefs}
          onUpdatePrefs={(updatedPrefs) => {
            setPrefs(updatedPrefs);
            savePreferences(updatedPrefs);
          }}
          onSetPassphrase={(pw) => {
            setPassphrase(pw);
            setShowPassphraseModal(null);
          }}
          mode={showPassphraseModal}
          onClose={prefs.encryptionEnabled ? undefined : () => setShowPassphraseModal(null)}
        />
      )}

      {/* Settings Options panel overlay */}
      {showSettings && (
        <SettingsModal
          prefs={prefs}
          onUpdatePrefs={(updatedPrefs) => {
            // Handle biometric enabling/disabling
            if (updatedPrefs.biometricEnabled && !prefs.biometricEnabled && passphrase) {
              localStorage.setItem('memento_vault_bio_key', passphrase);
            } else if (!updatedPrefs.biometricEnabled && prefs.biometricEnabled) {
              localStorage.removeItem('memento_vault_bio_key');
            }
            setPrefs(updatedPrefs);
            savePreferences(updatedPrefs);
          }}
          notes={decryptedNotes}
          folders={decryptedFolders}
          onImportBackup={handleImportBackup}
          onClearAllData={handleClearAllData}
          onTriggerEncryptionSetup={() => setShowPassphraseModal('setup')}
          onDisableEncryption={handleDisableEncryption}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
