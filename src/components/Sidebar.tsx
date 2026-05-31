/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Folder as FolderIcon, Plus, Settings, Search, FileText, Hash, Trash2, ShieldCheck, Lock, FolderPlus, Cloud, FileDown, X, Check } from 'lucide-react';
import { Note, Folder, UserPreferences, SyncStatus, TagDefinition } from '../types';
import { getStyle } from '../lib/designStyles';
import NoteIcon, { BUILT_IN_ICONS, sanitizeSVG } from './NoteIcon';

interface FolderIconRendererProps {
  folder: Folder;
  className?: string;
  size?: number;
}

export function FolderIconRenderer({ folder, className = '', size = 14 }: FolderIconRendererProps) {
  const iconValue = folder.icon || '';

  // Case 1: Custom raw SVG string
  if (iconValue.trim().toLowerCase().includes('<svg')) {
    const sanitized = sanitizeSVG(iconValue);
    if (sanitized) {
      return (
        <span 
          className={`inline-flex items-center justify-center shrink-0 [&_svg]:w-full [&_svg]:h-full [&_svg]:block ${className}`}
          style={{ width: size, height: size }}
          dangerouslySetInnerHTML={{ __html: sanitized }}
        />
      );
    }
  }

  // Case 2: Custom built-in icon ID
  if (iconValue) {
    const matched = BUILT_IN_ICONS.find(item => item.id === iconValue);
    if (matched) {
      const IconComponent = matched.component;
      return <IconComponent size={size} className={`shrink-0 ${className}`} />;
    }
  }

  // Fallback: standard lucide Folder icon
  return <FolderIcon size={size} className={`shrink-0 ${className}`} />;
}

interface SidebarProps {
  notes: Note[];
  folders: Folder[];
  activeNoteId: string | null;
  selectedFolderId: string | null;
  onSelectNote: (id: string) => void;
  onSelectFolder: (id: string | null) => void;
  onCreateFolder: (name: string) => void;
  onDeleteFolder: (id: string) => void;
  onCreateNote: () => void;
  onOpenSettings: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  encryptionUnlocked: boolean;
  prefs: UserPreferences;
  onDeleteNote?: (id: string) => void;
  user?: any | null;
  syncStatus?: SyncStatus;
  tagDefinitions: TagDefinition[];
  onUpdateTagDefinitions?: (defs: TagDefinition[]) => void;
  onUpdateFolder?: (updatedFolder: Folder) => void;
  onUpdatePrefs: (prefs: UserPreferences) => void;
  onUpdateNote?: (note: Note) => void | Promise<void>;
}

// Get primary tag color of a note, or explicit note level color if none
export function getActiveNoteColor(note: Note, tagDefinitions: TagDefinition[]): string {
  if (note.tags && note.tags.length > 0) {
    const primaryName = note.primaryTag || note.tags[0];
    const def = tagDefinitions.find(d => d.name.toLowerCase() === primaryName.toLowerCase());
    if (def) {
      return def.color;
    }
  }
  return note.color || 'slate';
}

// Aesthetic note card styling helper
const getThemeClasses = (note: Note, isActive: boolean, tagDefinitions: TagDefinition[]) => {
  const colorNameOrHex = getActiveNoteColor(note, tagDefinitions);

  const colors: Record<string, { active: string; inactive: string }> = {
    slate: {
      active: 'border-slate-400 dark:border-zinc-550 bg-slate-100/50 dark:bg-zinc-805/45 shadow-sm',
      inactive: 'border-slate-100 dark:border-zinc-850 bg-slate-50/30 dark:bg-zinc-900/15 hover:border-slate-205 dark:hover:border-zinc-800'
    },
    indigo: {
      active: 'border-indigo-505 dark:border-indigo-500/80 bg-indigo-50/35 dark:bg-indigo-950/15 shadow-sm',
      inactive: 'border-indigo-550/20 dark:border-indigo-500/10 bg-indigo-500/[0.02] hover:bg-indigo-500/[0.06] hover:border-indigo-500/40'
    },
    emerald: {
      active: 'border-emerald-500 dark:border-emerald-550 bg-emerald-50/35 dark:bg-emerald-950/15 shadow-sm',
      inactive: 'border-emerald-550/20 dark:border-emerald-500/10 bg-emerald-500/[0.02] hover:bg-emerald-550/[0.06] hover:border-emerald-500/40'
    },
    amber: {
      active: 'border-amber-500 dark:border-amber-550 bg-amber-50/40 dark:bg-amber-950/15 shadow-sm',
      inactive: 'border-amber-550/20 dark:border-amber-500/10 bg-amber-500/[0.02] hover:bg-amber-500/[0.06] hover:border-amber-500/40'
    },
    rose: {
      active: 'border-rose-500 dark:border-rose-550 bg-rose-50/35 dark:bg-rose-950/15 shadow-sm',
      inactive: 'border-rose-550/20 dark:border-rose-500/10 bg-rose-500/[0.02] hover:bg-rose-500/[0.06] hover:border-rose-500/40'
    },
    violet: {
      active: 'border-violet-500 dark:border-violet-550 bg-violet-50/35 dark:bg-violet-950/15 shadow-sm',
      inactive: 'border-violet-550/20 dark:border-violet-500/10 bg-violet-500/[0.02] hover:bg-violet-500/[0.06] hover:border-violet-500/40'
    },
    cyan: {
      active: 'border-cyan-500 dark:border-cyan-550 bg-cyan-100/15 dark:bg-cyan-950/10 shadow-sm',
      inactive: 'border-cyan-550/25 dark:border-cyan-500/10 bg-cyan-500/[0.02] hover:bg-cyan-505/[0.06] hover:border-cyan-500/40'
    }
  };

  const preset = colors[colorNameOrHex];
  if (preset) {
    return { className: isActive ? preset.active : preset.inactive };
  } else {
    // Custom Color Hex mapping dynamically
    if (isActive) {
      return {
        className: 'shadow-sm',
        style: {
          borderColor: colorNameOrHex,
          backgroundColor: colorNameOrHex + '18', // soft alpha background
        }
      };
    } else {
      return {
        className: 'hover:opacity-95',
        style: {
          borderColor: colorNameOrHex + '30', // soft border
          backgroundColor: colorNameOrHex + '08', // transparent backdrop
        }
      };
    }
  }
};

export const getTagColorClass = (colorNameOrHex?: string) => {
  if (!colorNameOrHex) {
    return { className: 'bg-slate-350 dark:bg-zinc-650 ring-2 ring-slate-400/20' };
  }
  const presets: Record<string, string> = {
    indigo: 'bg-indigo-500 ring-2 ring-indigo-500/15',
    emerald: 'bg-emerald-500 ring-2 ring-emerald-500/15',
    amber: 'bg-amber-500 ring-2 ring-amber-500/15',
    rose: 'bg-rose-500 ring-2 ring-rose-500/15',
    violet: 'bg-violet-500 ring-2 ring-violet-500/15',
    cyan: 'bg-cyan-500 ring-2 ring-cyan-500/15',
    slate: 'bg-slate-500 ring-2 ring-slate-500/15'
  };
  if (presets[colorNameOrHex]) {
    return { className: presets[colorNameOrHex] };
  } else {
    return {
      className: '',
      style: {
        backgroundColor: colorNameOrHex,
        boxShadow: `0 0 0 2px ${colorNameOrHex}25`
      }
    };
  }
};

// Returns style classes or direct border-text styling rules for tag chips in the UI
export function getTagStyle(tagName: string, tagDefinitions: TagDefinition[]): {
  className: string;
  style?: React.CSSProperties;
  colorNameOrHex: string;
  colorHex: string;
} {
  const def = tagDefinitions.find(d => d.name.toLowerCase() === tagName.toLowerCase());
  const col = def ? def.color : 'slate';

  const presets: Record<string, { className: string; hex: string }> = {
    slate: { className: 'bg-slate-100 dark:bg-zinc-805 text-slate-800 dark:text-zinc-200 border-slate-205 dark:border-zinc-750', hex: '#64748b' },
    indigo: { className: 'bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200/20 dark:border-indigo-900/10', hex: '#4f46e5' },
    emerald: { className: 'bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/20 dark:border-emerald-900/10', hex: '#10b981' },
    amber: { className: 'bg-amber-50/70 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200/20 dark:border-amber-900/10', hex: '#f59e0b' },
    rose: { className: 'bg-rose-50/70 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200/20 dark:border-rose-900/10', hex: '#f43f5e' },
    violet: { className: 'bg-violet-50/70 dark:bg-violet-950/40 text-violet-605 dark:text-violet-400 border-violet-200/20 dark:border-violet-900/10', hex: '#8b5cf6' },
    cyan: { className: 'bg-cyan-50/70 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 border-cyan-200/20 dark:border-cyan-900/10', hex: '#06b6d4' }
  };

  if (presets[col]) {
    return { className: presets[col].className, colorNameOrHex: col, colorHex: presets[col].hex };
  } else {
    return {
      className: 'border shadow-xxs',
      style: {
        backgroundColor: col,
        color: '#ffffff',
        borderColor: col
      },
      colorNameOrHex: col,
      colorHex: col
    };
  }
}

export function getTagStyleForColor(colorNameOrHex: string): {
  className: string;
  style?: React.CSSProperties;
  colorNameOrHex: string;
  colorHex: string;
} {
  const col = colorNameOrHex || 'slate';

  const presets: Record<string, { className: string; hex: string }> = {
    slate: { className: 'bg-slate-100 dark:bg-zinc-805 text-slate-800 dark:text-zinc-200 border-slate-205 dark:border-zinc-750', hex: '#64748b' },
    indigo: { className: 'bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200/20 dark:border-indigo-900/10', hex: '#4f46e5' },
    emerald: { className: 'bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/20 dark:border-emerald-900/10', hex: '#10b981' },
    amber: { className: 'bg-amber-50/70 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200/20 dark:border-amber-900/10', hex: '#f59e0b' },
    rose: { className: 'bg-rose-50/70 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200/20 dark:border-rose-900/10', hex: '#f43f5e' },
    violet: { className: 'bg-violet-50/70 dark:bg-violet-950/40 text-violet-605 dark:text-violet-400 border-violet-200/20 dark:border-violet-900/10', hex: '#8b5cf6' },
    cyan: { className: 'bg-cyan-50/70 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 border-cyan-200/20 dark:border-cyan-900/10', hex: '#06b6d4' }
  };

  if (presets[col]) {
    return { className: presets[col].className, colorNameOrHex: col, colorHex: presets[col].hex };
  } else {
    // Ensure hex format safety if there is a raw hex color
    return {
      className: 'border shadow-xxs',
      style: {
        backgroundColor: col,
        color: '#ffffff',
        borderColor: col
      },
      colorNameOrHex: col,
      colorHex: col
    };
  }
}

const getFontClass = (family?: string) => {
  switch (family) {
    case 'serif': return 'font-serif';
    case 'mono': return 'font-mono';
    case 'condensed': return 'font-condensed';
    case 'heading': return 'font-heading';
    default: return 'font-sans';
  }
};

const getSizeClass = (size?: string) => {
  switch (size) {
    case 'sm': return 'text-[10px]';
    case 'lg': return 'text-[12.5px]';
    case 'xl': return 'text-[13.5px]';
    default: return 'text-xs';
  }
};

export default function Sidebar({
  notes,
  folders,
  activeNoteId,
  selectedFolderId,
  onSelectNote,
  onSelectFolder,
  onCreateFolder,
  onDeleteFolder,
  onCreateNote,
  onOpenSettings,
  searchQuery,
  onSearchChange,
  encryptionUnlocked,
  prefs,
  onDeleteNote,
  user,
  syncStatus,
  tagDefinitions,
  onUpdateTagDefinitions,
  onUpdateFolder,
  onUpdatePrefs,
  onUpdateNote
}: SidebarProps) {
  const [newFolderInput, setNewFolderInput] = useState('');
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; noteId: string } | null>(null);
  const [deleteConfirmNoteId, setDeleteConfirmNoteId] = useState<string | null>(null);
  const [deleteConfirmFolderId, setDeleteConfirmFolderId] = useState<string | null>(null);
  const [dragHoverFolderId, setDragHoverFolderId] = useState<string | null>(null);
  const stylePrefs = getStyle(prefs.designStyle);

  // Drag-to-scroll for tags
  const tagsRef = useRef<HTMLDivElement>(null);
  const [isDraggingTags, setIsDraggingTags] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleTagsMouseDown = (e: React.MouseEvent) => {
    if (!tagsRef.current) return;
    setIsDraggingTags(true);
    setStartX(e.pageX - tagsRef.current.offsetLeft);
    setScrollLeft(tagsRef.current.scrollLeft);
  };

  const handleTagsMouseLeave = () => {
    setIsDraggingTags(false);
  };

  const handleTagsMouseUp = () => {
    setIsDraggingTags(false);
  };

  const handleTagsMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingTags || !tagsRef.current) return;
    e.preventDefault();
    const x = e.pageX - tagsRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // scroll speed multiplier
    tagsRef.current.scrollLeft = scrollLeft - walk;
  };

  // Close context menu on any global click action
  useEffect(() => {
    const handleOutsideClick = () => setContextMenu(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, noteId: string) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      noteId
    });
  };

  // Folder submission
  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderInput.trim()) {
      onCreateFolder(newFolderInput.trim());
      setNewFolderInput('');
      setShowFolderForm(false);
    }
  };

  // Compute notes counts per folder
  const noteCountsByFolder = useMemo(() => {
    const counts: { [id: string]: number } = {};
    notes.forEach(note => {
      const fId = note.folderId || 'uncat';
      counts[fId] = (counts[fId] || 0) + 1;
    });
    return counts;
  }, [notes]);

  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);

  // Helper to match the border radius of search input box exactly
  const tagRoundedClass = useMemo(() => {
    const parts = stylePrefs.inputClass.split(/\s+/);
    const roundedParts = parts.filter(p => p.startsWith('rounded') || p === 'rounded');
    return roundedParts.length > 0 ? roundedParts.join(' ') : 'rounded-full';
  }, [stylePrefs.inputClass]);

  // Collect unique categories / tags
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    tagDefinitions.forEach(d => tagsSet.add(d.name));
    if (tagsSet.size === 0) {
      ['Markdown', 'To Do', 'Draft'].forEach(t => tagsSet.add(t));
    }
    notes.forEach(note => {
      if (note.tags && Array.isArray(note.tags)) {
        note.tags.forEach(t => {
          if (t && typeof t === 'string' && t.trim()) {
            tagsSet.add(t.trim());
          }
        });
      }
    });
    return Array.from(tagsSet);
  }, [notes, tagDefinitions]);

  // Robust offline search directly inside memory
  const filteredNotes = useMemo(() => {
    let list = notes;

    // Filter by Folder first
    if (selectedFolderId) {
      list = list.filter(note => note.folderId === selectedFolderId);
    }

    // Filter by Tag
    if (selectedTagFilter) {
      list = list.filter(note => (note.tags || []).includes(selectedTagFilter));
    }

    // Search query matches title or content
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      list = list.filter(
        note =>
          note.title.toLowerCase().includes(query) ||
          note.content.toLowerCase().includes(query)
      );
    }

    // Sort by recent first
    return [...list].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notes, selectedFolderId, selectedTagFilter, searchQuery]);

  // Format timestamp helper
  const formatDate = (ms: number) => {
    const date = new Date(ms);
    const now = new Date();
    const diffMs = now.getTime() - ms;
    
    if (diffMs < 60000) return 'Just now';
    if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
    if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h ago`;
    
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Get note excerpt
  const getExcerpt = (content: string) => {
    if (!content) return 'Empty note';
    // Strip HTML tags for clean pure text content list excerpt
    let clean = content.replace(/<[^>]*>/g, '');
    // Remove markdown symbols for clean snippet
    clean = clean
      .replace(/[#*`_\[\]]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return clean.length > 55 ? clean.substring(0, 55) + '...' : clean;
  };

  return (
    <div className="w-full md:w-[280px] flex flex-col h-full shrink-0 gap-[5px] bg-transparent p-0 md:pr-1 select-none">
      
      {/* BENTO CARD 1: Folders Directory */}
      <div className={`${stylePrefs.cardClass} py-4 px-5 flex flex-col shrink-0 max-h-[35%] overflow-hidden`}>
        <div className="flex items-center justify-between mb-3 shrink-0">
          <h2 className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
            Folders
          </h2>
          <button
            onClick={() => setShowFolderForm(!showFolderForm)}
            className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-zinc-800/80 rounded-lg transition-colors cursor-pointer"
            title="Add Folder"
          >
            <FolderPlus size={14} />
          </button>
        </div>

        {showFolderForm && (
          <form onSubmit={handleCreateFolderSubmit} className="flex gap-2 mb-3 shrink-0">
            <input
              type="text"
              autoFocus
              value={newFolderInput}
              onChange={(e) => setNewFolderInput(e.target.value)}
              placeholder="Folder name..."
              required
              className={`flex-1 py-1 px-2.5 text-xs focus:outline-none ${stylePrefs.inputClass}`}
            />
            <button
              type="submit"
              className={`py-1 px-2.5 text-xs font-semibold cursor-pointer ${stylePrefs.buttonClass}`}
            >
              Add
            </button>
          </form>
        )}

        <div className="flex-1 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
          {/* Uncategorized All Notes folder */}
          <button
            onDragOver={(e) => {
              e.preventDefault();
              setDragHoverFolderId('null');
            }}
            onDragLeave={() => setDragHoverFolderId(null)}
            onDrop={(e) => {
              e.preventDefault();
              setDragHoverFolderId(null);
              const noteId = e.dataTransfer.getData('application/json');
              if (noteId && onUpdateNote) {
                try {
                  const data = JSON.parse(noteId);
                  if (data.type === 'note') {
                    const droppedNote = notes.find(n => n.id === data.id);
                    if (droppedNote && droppedNote.folderId !== null) {
                      onUpdateNote({ ...droppedNote, folderId: null, updatedAt: Date.now() });
                    }
                  }
                } catch (e) {}
              }
            }}
            onClick={() => onSelectFolder(null)}
            className={`w-full flex items-center justify-between text-xs py-2 px-3 rounded-xl font-semibold transition-all cursor-pointer border ${
              selectedFolderId === null
                ? 'bg-slate-100 dark:bg-zinc-800/60 text-indigo-600 dark:text-indigo-400 border-slate-200/55 dark:border-zinc-700/55 shadow-xs'
                : dragHoverFolderId === 'null'
                ? 'bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 border-dashed'
                : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-850 border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileText size={14} className={selectedFolderId === null ? 'text-indigo-600 dark:text-indigo-450' : 'text-slate-400'} />
              <span>All Notes</span>
            </div>
            <span className="text-[11px] font-condensed bg-transparent border border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-500 px-2 py-0.5 flex items-center justify-center rounded-full font-bold tracking-wide">
              {notes.length}
            </span>
          </button>

          {/* Folders List */}
          {folders.map(folder => {
            const count = noteCountsByFolder[folder.id] || 0;
            const isSelected = selectedFolderId === folder.id;
            const isDragHover = dragHoverFolderId === folder.id;
            return (
              <div
                key={folder.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragHoverFolderId(folder.id);
                }}
                onDragLeave={() => setDragHoverFolderId(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragHoverFolderId(null);
                  const noteId = e.dataTransfer.getData('application/json');
                  if (noteId && onUpdateNote) {
                    try {
                      const data = JSON.parse(noteId);
                      if (data.type === 'note') {
                        const droppedNote = notes.find(n => n.id === data.id);
                        if (droppedNote && droppedNote.folderId !== folder.id) {
                          onUpdateNote({ ...droppedNote, folderId: folder.id, updatedAt: Date.now() });
                        }
                      }
                    } catch (e) {}
                  }
                }}
                className={`group flex items-center justify-between rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-slate-100 dark:bg-zinc-800/60 text-indigo-600 dark:text-indigo-400 border-slate-200/55 dark:border-zinc-700/55 shadow-xs'
                    : isDragHover
                    ? 'bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 border-dashed'
                    : 'text-slate-650 dark:text-zinc-450 hover:bg-slate-50 dark:hover:bg-zinc-850 border-transparent'
                }`}
              >
                <div className="flex-1 flex items-center min-w-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingFolder(folder);
                    }}
                    className={`p-1.5 ml-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700/60 cursor-pointer transition-all shrink-0 ${
                      folder.color ? '' : (isSelected ? 'text-indigo-600 dark:text-indigo-450' : 'text-slate-400 dark:text-zinc-500')
                    }`}
                    style={folder.color ? { color: folder.color } : undefined}
                    title="Change folder icon & color accent"
                  >
                    <FolderIconRenderer folder={folder} size={14} />
                  </button>
                  <button
                    onClick={() => onSelectFolder(folder.id)}
                    className="flex-1 text-xs py-2 pr-3 pl-1.5 font-semibold text-left truncate cursor-pointer bg-transparent border-0 focus:outline-none"
                  >
                    <span className="truncate">{folder.name}</span>
                  </button>
                </div>
                <div className="flex items-center gap-1.5 pr-2 shrink-0">
                  <span className="text-[11px] font-condensed bg-transparent border border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-500 px-2 py-0.5 flex items-center justify-center rounded-full font-bold tracking-wide group-hover:hidden">
                    {count}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmFolderId(folder.id);
                    }}
                    className="hidden group-hover:inline-flex p-1 text-slate-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                    title="Delete Folder"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* BENTO CARD 2: Secured Notes List */}
      <div className={`flex-1 ${stylePrefs.cardClass} py-4 px-5 flex flex-col overflow-hidden`}>
        
        {/* Actions inside Note Bento */}
        <div className="flex items-center gap-2.5 mb-4 shrink-0">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-405 dark:text-zinc-501">
              <Search size={13} />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search secured notes..."
              className={`w-full py-2 pl-9 pr-8 text-xs focus:outline-none focus:ring-0 font-medium transition-all ${stylePrefs.inputClass}`}
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-450 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-300 font-bold text-sm cursor-pointer"
              >
                ×
              </button>
            )}
          </div>

          <button
            onClick={onCreateNote}
            className={`p-2 shadow-sm flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-all duration-200 rounded-lg ${stylePrefs.buttonClass}`}
            style={{ width: '32px', height: '32px' }}
            title="Create New Markdown Note"
          >
            <Plus size={15} strokeWidth={2.5} />
          </button>
        </div>        {/* Tags filter chips list */}
        {allTags.length > 0 && (
          <div 
            ref={tagsRef}
            onMouseDown={handleTagsMouseDown}
            onMouseLeave={handleTagsMouseLeave}
            onMouseUp={handleTagsMouseUp}
            onMouseMove={handleTagsMouseMove}
            className={`flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 select-none shrink-0 flex-nowrap custom-scrollbar-h ${isDraggingTags ? 'cursor-grabbing' : 'cursor-grab active:cursor-grabbing'}`} 
            style={{ maxWidth: '100%' }}
          >
            <button
              onClick={() => !isDraggingTags && setSelectedTagFilter(null)}
              className={`px-3.5 py-1.5 ${tagRoundedClass} text-[13px] font-normal font-condensed tracking-wide shrink-0 transition-all cursor-pointer flex items-center justify-center text-center whitespace-nowrap ${
                !selectedTagFilter 
                  ? 'bg-indigo-600 text-white shadow-xxs' 
                  : 'bg-slate-100 dark:bg-zinc-900 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-350 border border-slate-205/60 dark:border-zinc-800'
              }`}
            >
              All Tags
            </button>
            {allTags.map(tag => {
              const isSelected = selectedTagFilter === tag;
              const tagStyle = getTagStyle(tag, tagDefinitions);
              
              let inlineStyle: React.CSSProperties = {};
              let classNames = `px-3.5 py-1.5 ${tagRoundedClass} text-[13px] font-normal font-condensed tracking-wide shrink-0 transition-all cursor-pointer flex items-center justify-center text-center border whitespace-nowrap`;
              
              if (isSelected) {
                if (tagStyle.style) {
                  inlineStyle = {
                    backgroundColor: tagStyle.style.color,
                    color: '#ffffff',
                    borderColor: tagStyle.style.color
                  };
                } else {
                  const presetColors: Record<string, string> = {
                    indigo: 'bg-indigo-600 text-white border-indigo-600 shadow-xxs',
                    emerald: 'bg-emerald-600 text-white border-emerald-600 shadow-xxs',
                    amber: 'bg-amber-600 text-white border-amber-600 shadow-xxs',
                    rose: 'bg-rose-600 text-white border-rose-600 shadow-xxs',
                    violet: 'bg-violet-600 text-white border-violet-600 shadow-xxs',
                    cyan: 'bg-cyan-600 text-white border-cyan-600 shadow-xxs',
                    slate: 'bg-slate-600 text-white border-slate-600 shadow-xxs'
                  };
                  classNames += ` ${presetColors[tagStyle.colorNameOrHex] || 'bg-indigo-600 text-white border-indigo-600'}`;
                }
              } else {
                classNames += ' bg-slate-100 dark:bg-zinc-900 hover:text-slate-800 dark:hover:text-zinc-350';
                if (tagStyle.style) {
                  inlineStyle = {
                    borderColor: tagStyle.style.color + '30',
                    color: tagStyle.style.color
                  };
                } else {
                  const presetColorText: Record<string, string> = {
                    indigo: 'text-indigo-600 dark:text-indigo-400 border-indigo-250/30 dark:border-indigo-900/40',
                    emerald: 'text-emerald-600 dark:text-emerald-405 border-emerald-250/30 dark:border-emerald-900/40',
                    amber: 'text-amber-655 dark:text-amber-400 border-amber-250/30 dark:border-amber-900/40',
                    rose: 'text-rose-600 dark:text-rose-455 border-rose-250/30 dark:border-rose-900/40',
                    violet: 'text-violet-600 dark:text-violet-405 border-violet-250/30 dark:border-violet-900/40',
                    cyan: 'text-cyan-600 dark:text-cyan-405 border-cyan-250/30 dark:border-cyan-900/40',
                    slate: 'text-slate-500 dark:text-zinc-400 border-slate-205/60 dark:border-zinc-800'
                  };
                  classNames += ` ${presetColorText[tagStyle.colorNameOrHex] || 'text-slate-500 dark:text-zinc-500 border-slate-200 dark:border-zinc-800'}`;
                }
              }

              return (
                <button
                  key={tag}
                  onClick={() => !isDraggingTags && setSelectedTagFilter(isSelected ? null : tag)}
                  className={classNames}
                  style={inlineStyle}
                >
                  <span>{tag}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between mb-3 shrink-0">
          <h2 className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
            Recent Notes
          </h2>
          {notes.length > 0 && (
            <span className="text-[10px] font-mono text-slate-450 dark:text-zinc-500 font-semibold uppercase">{filteredNotes.length} matched</span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto pr-0.5 space-y-[5px] custom-scrollbar">
          {filteredNotes.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 dark:text-zinc-500 space-y-1">
              <p className="font-semibold text-slate-500 dark:text-zinc-400">No secured draft found.</p>
              <p className="text-[10px] text-slate-400/80">Draft a new note to start writing!</p>
            </div>
          ) : (
            <div className="space-y-[5px]">
              {filteredNotes.map(note => {
                const isActive = activeNoteId === note.id;
                const noteFamilyClass = getFontClass(note.fontFamily);
                const noteSizeClass = getSizeClass(note.fontSize);
                const cardTheme = getThemeClasses(note, isActive, tagDefinitions);
                const activeColor = getActiveNoteColor(note, tagDefinitions);
                const colorIndicator = getTagColorClass(activeColor);
                const isCompact = prefs.noteListLayout === 'compact';

                return (
                  <button
                    key={note.id}
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/json', JSON.stringify({ type: 'note', id: note.id }));
                    }}
                    onClick={() => onSelectNote(note.id)}
                    onContextMenu={(e) => handleContextMenu(e, note.id)}
                    className={`w-full text-left rounded-2xl border transition-all duration-200 cursor-grab active:cursor-grabbing flex flex-col relative overflow-hidden ${
                      isCompact ? 'py-[5px] px-3 gap-1.5' : 'p-4 gap-1'
                    } ${cardTheme.className || ''}`}
                    style={cardTheme.style}
                  >
                    {!isCompact ? (
                      // NORMAL MODE: Large centered bento-style card
                      <>
                        {/* Date and Status Bar */}
                        <div className="flex items-center justify-center text-[10px] uppercase tracking-widest font-extrabold pb-2 shrink-0 select-none w-full border-b border-slate-100 dark:border-zinc-800/40 mb-3">
                             <span className={`font-condensed text-[11px] tracking-widest ${isActive ? 'text-indigo-650 dark:text-indigo-350' : 'text-slate-400 dark:text-zinc-500'}`}>
                              {formatDate(note.updatedAt)}
                            </span>
                          
                          {note.isEncrypted && (
                            <span 
                              className={`ml-2 shrink-0 ${isActive ? 'text-indigo-500' : 'text-slate-400 dark:text-zinc-550'}`}
                              title={encryptionUnlocked ? "End-to-End Encrypted & Decrypted" : "Locked E2E Encrypted Note"}
                            >
                              {encryptionUnlocked ? <ShieldCheck size={12} className="text-emerald-500" /> : <Lock size={12} />}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col items-center gap-3 mt-1 shrink-0 w-full">
                          <NoteIcon note={note} className={`${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-zinc-500'} shrink-0`} size={26} />
                          <div className={`text-[26px] font-condensed font-normal leading-tight text-center text-slate-900 dark:text-zinc-100 tracking-tight w-full break-words`}>
                            {note.title.trim() || 'Untitled Note'}
                          </div>
                        </div>

                        <p className={`text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed font-normal mt-2 ${noteFamilyClass} ${noteSizeClass}`}>
                          {getExcerpt(note.content)}
                        </p>
                      </>
                    ) : (
                      // COMPACT MODE: High-density list layout
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-xl border flex items-center justify-center shrink-0 ${
                          isActive 
                            ? 'bg-indigo-600 text-white border-indigo-500' 
                            : 'bg-slate-100 dark:bg-zinc-805 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-750'
                        }`}>
                          <NoteIcon note={note} size={15} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className={`text-[10px] font-condensed uppercase tracking-widest font-black leading-none ${isActive ? 'text-indigo-650 dark:text-indigo-350' : 'text-slate-400 dark:text-zinc-500'}`}>
                              {formatDate(note.updatedAt)}
                            </span>
                            {note.isEncrypted && (
                              <span className={isActive ? 'text-indigo-505' : 'text-slate-350 dark:text-zinc-650'}>
                                {encryptionUnlocked ? <ShieldCheck size={9} /> : <Lock size={9} />}
                              </span>
                            )}
                          </div>
                          <h3 className={`text-[13px] font-bold truncate leading-tight select-none ${isActive ? 'text-slate-950 dark:text-white' : 'text-slate-800 dark:text-zinc-200'} ${noteFamilyClass}`}>
                            {note.title.trim() || 'Untitled Document'}
                          </h3>
                        </div>
                      </div>
                    )}

                    {note.folderId && (
                      <div className={`flex items-center gap-0.5 text-[10px] text-slate-405 dark:text-zinc-550 font-bold tracking-tight italic select-none ${isCompact ? 'mt-0 pl-11' : 'pt-1'}`}>
                        <FolderIcon size={10} className="opacity-70" />
                        <span className="truncate">
                          {folders.find(f => f.id === note.folderId)?.name || 'unlinked'}
                        </span>
                      </div>
                    )}

                    {note.tags && note.tags.length > 0 && (
                      <div className={`flex flex-wrap gap-1 pb-0.5 ${isCompact ? 'mt-0 pl-11' : 'mt-1'}`}>
                        {note.tags.slice(0, isCompact ? 2 : undefined).map(t => {
                          const noteColor = getActiveNoteColor(note, tagDefinitions);
                          const tagStyle = getTagStyleForColor(noteColor);
                          const isPrimary = note.primaryTag ? note.primaryTag === t : note.tags?.[0] === t;
                          return (
                            <span 
                              key={t} 
                              className={`px-1.5 py-0.5 text-[8.5px] font-extrabold rounded border ${tagStyle.className}`}
                              style={tagStyle.style}
                              title={isPrimary ? 'Primary tag defining note accent' : undefined}
                            >
                              #{t}{isPrimary && note.tags!.length > 1 && !isCompact && ' *'}
                            </span>
                          );
                        })}
                        {isCompact && note.tags.length > 2 && (
                          <span className="text-[8px] font-bold text-slate-400">+ {note.tags.length - 2}</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* FOOTER TOOL BAR */}
      <div className={`p-3.5 ${stylePrefs.cardClass} flex items-center justify-between shrink-0`}>
        <div className="text-[9px] text-slate-400 dark:text-zinc-550 font-extrabold uppercase tracking-widest select-none">
          Knoots v1.1.0
        </div>
        <button
          onClick={onOpenSettings}
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-805 rounded-lg cursor-pointer transition-colors"
          title="Open Settings"
        >
          <Settings size={14} />
        </button>
      </div>

      {/* FLOATABLE CUSTOM CONTEXT MENU SYSTEM */}
      {contextMenu && (
        <div 
          className="fixed z-[100] py-1 w-44 bg-white dark:bg-zinc-900 border border-slate-205 dark:border-zinc-800 rounded-2xl shadow-xl font-sans text-xs outline-none animate-in fade-in zoom-in-95 duration-100"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={(e) => {
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
          }}
        >
          <button
            onClick={() => {
              onSelectNote(contextMenu.noteId);
              setContextMenu(null);
            }}
            className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-705 dark:text-zinc-200 flex items-center gap-2 cursor-pointer font-extrabold"
          >
            <NoteIcon note={notes.find(n => n.id === contextMenu.noteId)!} size={13} className="text-indigo-500" />
            <span>Open Document</span>
          </button>
          {onDeleteNote && (
            <button
              onClick={() => {
                setDeleteConfirmNoteId(contextMenu.noteId);
                setContextMenu(null);
              }}
              className="w-full text-left px-3.5 py-2.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-650 dark:text-red-400 flex items-center gap-2 cursor-pointer font-extrabold border-t border-slate-100 dark:border-zinc-805"
            >
              <Trash2 size={13} className="text-red-500" />
              <span>Delete Note</span>
            </button>
          )}
        </div>
      )}

      {/* ASYNC DELETION SECURED NOTE CONFIRMATION OVERLAY */}
      {deleteConfirmNoteId && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/60 dark:bg-black/85 backdrop-blur-xs font-sans">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-950 border border-slate-205 dark:border-zinc-850 rounded-2xl shadow-xl relative overflow-hidden flex flex-col p-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <span className="font-extrabold text-xs uppercase tracking-widest text-red-500 dark:text-red-400 flex items-center gap-2">
                <Trash2 size={14} />
                Delete Secured Note
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed mb-6">
              Are you sure you want to delete <strong className="text-slate-800 dark:text-zinc-150">"{notes.find(n => n.id === deleteConfirmNoteId)?.title || 'this note'}"</strong>? This note will be removed from your list, local storage, and cloud backup. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 text-[11px]">
              <button
                onClick={() => setDeleteConfirmNoteId(null)}
                className="px-3.5 py-1.5 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900 rounded-xl font-bold cursor-pointer text-slate-600 dark:text-zinc-350 transition-colors text-[10px]"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (onDeleteNote && deleteConfirmNoteId) {
                    await onDeleteNote(deleteConfirmNoteId);
                  }
                  setDeleteConfirmNoteId(null);
                }}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl shadow-xxs transition-colors text-[10px] cursor-pointer"
              >
                Delete Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASYNC DELETION SECURED FOLDER CONFIRMATION OVERLAY */}
      {deleteConfirmFolderId && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/60 dark:bg-black/85 backdrop-blur-xs font-sans">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-950 border border-slate-205 dark:border-zinc-850 rounded-2xl shadow-xl relative overflow-hidden flex flex-col p-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <span className="font-extrabold text-xs uppercase tracking-widest text-red-500 dark:text-red-400 flex items-center gap-2">
                <Trash2 size={14} />
                Delete Folder Block
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed mb-6">
              Are you sure you want to delete folder <strong className="text-slate-800 dark:text-zinc-150">"{folders.find(f => f.id === deleteConfirmFolderId)?.name || 'this folder'}"</strong>? Any notes inside will reside as uncategorized system items.
            </p>

            <div className="flex items-center justify-end gap-2 text-[11px]">
              <button
                onClick={() => setDeleteConfirmFolderId(null)}
                className="px-3.5 py-1.5 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900 rounded-xl font-bold cursor-pointer text-slate-600 dark:text-zinc-350 transition-colors text-[10px]"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (deleteConfirmFolderId) {
                    await onDeleteFolder(deleteConfirmFolderId);
                  }
                  setDeleteConfirmFolderId(null);
                }}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl shadow-xxs transition-colors text-[10px] cursor-pointer"
              >
                Delete Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Folder Icon & Color Accent Dialog Box */}
      {editingFolder && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-xs select-none animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 max-w-sm w-full mx-4 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: editingFolder.color || '#6366f1' }}
                />
                <h3 className="text-sm font-black text-slate-805 dark:text-zinc-100 italic tracking-tight uppercase">
                  Customize Folder
                </h3>
              </div>
              <button
                onClick={() => setEditingFolder(null)}
                className="p-1 text-slate-405 hover:text-slate-650 dark:hover:text-zinc-350 rounded-lg cursor-pointer transition-colors"
                title="Dismiss Dialog"
              >
                <X size={15} />
              </button>
            </div>

            {/* Folder Name (Non-editable view context) */}
            <div className="bg-slate-50 dark:bg-zinc-950 px-3 py-2 rounded-xl border border-slate-150/80 dark:border-zinc-850/60 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-widest font-bold">Folder Tag</span>
              <span className="text-xs text-slate-800 dark:text-zinc-250 font-bold truncate max-w-[180px]">{editingFolder.name}</span>
            </div>

            {/* Folder Color Preset Selection Grid */}
            <div className="space-y-1.5 text-left">
              <span className="text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
                Color Accent
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Indigo', hex: '#6366f1' },
                  { label: 'Emerald', hex: '#10b981' },
                  { label: 'Amber', hex: '#f59e0b' },
                  { label: 'Rose', hex: '#f43f5e' },
                  { label: 'Violet', hex: '#8b5cf6' },
                  { label: 'Cyan', hex: '#06b6d4' },
                  { label: 'Slate', hex: '#64748b' }
                ].map((preset) => {
                  const isColorActive = editingFolder.color === preset.hex || (!editingFolder.color && preset.hex === '#64748b');
                  return (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => {
                        const updated = { ...editingFolder, color: preset.hex };
                        setEditingFolder(updated);
                        onUpdateFolder && onUpdateFolder(updated);
                      }}
                      className={`w-6 h-6 rounded-full cursor-pointer transition-all flex items-center justify-center border-2 ${
                        isColorActive ? 'border-slate-800 dark:border-white scale-110 shadow-xs' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: preset.hex }}
                      title={preset.label}
                    >
                      {isColorActive && <Check size={11} className="text-white drop-shadow-sm font-black" />}
                    </button>
                  );
                })}
              </div>

              {/* Custom HEX code input */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-extrabold font-mono">Custom Hex:</span>
                <input
                  type="text"
                  value={editingFolder.color || ''}
                  placeholder="#6366f1"
                  onChange={(e) => {
                    const rawVal = e.target.value;
                    const updated = { ...editingFolder, color: rawVal };
                    setEditingFolder(updated);
                    if (rawVal.match(/^#([0-9a-fA-F]{3}){1,2}$/)) {
                      onUpdateFolder && onUpdateFolder(updated);
                    }
                  }}
                  className="px-2 py-0.5 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded text-xs font-mono text-slate-800 dark:text-zinc-100 max-w-[100px] focus:outline-none focus:ring-0"
                />
              </div>
            </div>

            {/* Icon selection options */}
            <div className="space-y-1.5 pt-2.5 border-t border-slate-100 dark:border-zinc-855/65 text-left">
              <span className="text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
                Folder Icon Preset
              </span>
              <div className="grid grid-cols-8 gap-1 p-2 rounded-xl border border-slate-150 dark:border-zinc-850/65 bg-slate-50/70 dark:bg-zinc-950">
                {BUILT_IN_ICONS.map((item) => {
                  const IconComp = item.component;
                  const isIconActive = editingFolder.icon === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        const updated = { ...editingFolder, icon: item.id };
                        setEditingFolder(updated);
                        onUpdateFolder && onUpdateFolder(updated);
                      }}
                      className={`p-1.5 rounded flex items-center justify-center cursor-pointer transition-all hover:bg-slate-202 dark:hover:bg-zinc-800 ${
                        isIconActive
                          ? 'bg-white dark:bg-zinc-90 shadow-xxs scale-110 text-indigo-600 dark:text-indigo-400 border border-indigo-505/20'
                          : 'text-slate-400 hover:text-slate-705 dark:hover:text-zinc-200'
                      }`}
                      title={item.label}
                    >
                      <IconComp size={13} />
                    </button>
                  );
                })}
              </div>

              {/* SVG uploader and Paste Area */}
              <div className="flex items-center gap-3 pt-2">
                <label className="text-[9px] font-black uppercase cursor-pointer text-slate-500 hover:text-indigo-650 dark:hover:text-indigo-450 transition-colors flex items-center gap-1 shrink-0 select-none">
                  <FileDown size={12} />
                  <span>Upload SVG</span>
                  <input
                    type="file"
                    accept=".svg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          const raw = evt.target?.result as string;
                          if (raw) {
                            const sanitized = sanitizeSVG(raw);
                            if (sanitized) {
                              const updated = { ...editingFolder, icon: sanitized };
                              setEditingFolder(updated);
                              onUpdateFolder && onUpdateFolder(updated);
                            }
                          }
                        };
                        reader.readAsText(file);
                      }
                    }}
                  />
                </label>
                <span className="text-slate-200 dark:text-zinc-805 shrink-0">|</span>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Paste <svg> markup..."
                    className="w-full text-[9px] py-1 px-2 border border-slate-150/80 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded-lg text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-0 placeholder-slate-400 dark:placeholder-zinc-650 font-mono"
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw.trim().toLowerCase().includes('<svg')) {
                        const sanitized = sanitizeSVG(raw);
                        if (sanitized) {
                          const updated = { ...editingFolder, icon: sanitized };
                          setEditingFolder(updated);
                          onUpdateFolder && onUpdateFolder(updated);
                          e.target.value = '';
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-zinc-850 flex justify-end">
              <button
                type="button"
                onClick={() => setEditingFolder(null)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all w-full text-center"
              >
                Close & Sync System
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
