/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { X, Type, Sun, Moon, Shield, Download, Upload, Trash2, Check, RefreshCw, Layers, Sliders, Settings2, Code, Heart, Fingerprint } from 'lucide-react';
import { Note, Folder, UserPreferences, EditorOption, PaneNamingOption, SyntaxTheme, DesignStyle } from '../types';
import { designStyles } from '../lib/designStyles';
import { registerBiometric, isWebAuthnSupported } from '../lib/webauthn';

interface SettingsModalProps {
  prefs: UserPreferences;
  onUpdatePrefs: (prefs: UserPreferences) => void;
  onClose: () => void;
  notes: Note[];
  folders: Folder[];
  onImportBackup: (backup: { notes: Note[]; folders: Folder[] }) => void;
  onClearAllData: () => void;
  onTriggerEncryptionSetup: () => void;
  onDisableEncryption: () => void;
}

export default function SettingsModal({
  prefs,
  onUpdatePrefs,
  onClose,
  notes,
  folders,
  onImportBackup,
  onClearAllData,
  onTriggerEncryptionSetup,
  onDisableEncryption
}: SettingsModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const showFeedback = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 4000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const fonts: { id: 'inter' | 'serif' | 'mono' | 'condensed' | 'heading'; label: string; class: string }[] = [
    { id: 'inter', label: 'Inter Sans', class: 'font-sans' },
    { id: 'serif', label: 'Playfair Serif', class: 'font-serif' },
    { id: 'mono', label: 'JetBrains Mono', class: 'font-mono' },
    { id: 'condensed', label: 'Asap Condensed', class: 'font-condensed' },
    { id: 'heading', label: 'Plus Jakarta', class: 'font-heading' }
  ];

  const fontSizes: { id: 'sm' | 'base' | 'lg' | 'xl'; label: string }[] = [
    { id: 'sm', label: 'Small' },
    { id: 'base', label: 'Standard' },
    { id: 'lg', label: 'Large' },
    { id: 'xl', label: 'Headers' }
  ];

  const lineHeights: { id: 'snug' | 'normal' | 'relaxed'; label: string }[] = [
    { id: 'snug', label: 'Compact' },
    { id: 'normal', label: 'Comfortable' },
    { id: 'relaxed', label: 'Spacious' }
  ];

  // Backup Export
  const handleExportBackup = async () => {
    try {
      const JSZip = (await import('jszip')).default;
      const { saveAs } = await import('file-saver');

      const zip = new JSZip();
      
      // Structure:
      // index.json -> raw complete metadata
      // /notes/ -> individual markdown files
      
      const dataStr = JSON.stringify({ notes, folders }, null, 2);
      zip.file('memento_vault_index.json', dataStr);

      const notesFolder = zip.folder('notes');
      notes.forEach(note => {
        // we write the md file
        const safeTitle = (note.title || 'Untitled Note').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `${safeTitle}_${note.id.substring(0,6)}.md`;
        notesFolder?.file(filename, note.content || '');
      });

      const content = await zip.generateAsync({ type: 'blob' });
      const exportFileDefaultName = `memento_vault_backup_${new Date().toISOString().split('T')[0]}.zip`;
      
      saveAs(content, exportFileDefaultName);
      showFeedback('Vault ZIP Backup exported successfully.');
    } catch (e) {
      showFeedback('Failed to export ZIP backup data.', true);
      console.error(e);
    }
  };

  // Backup Import
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result as string;
        const parsed = JSON.parse(result);
        
        if (parsed && (Array.isArray(parsed.notes) || Array.isArray(parsed.folders))) {
          onImportBackup({
            notes: parsed.notes || [],
            folders: parsed.folders || []
          });
          showFeedback('Backup file loaded & merged.');
        } else {
          showFeedback('Invalid backup structure. Must contain notes or folders arrays.', true);
        }
      } catch (err) {
        showFeedback('Failed to parse backup JSON file.', true);
      }
    };
    reader.readAsText(file);
  };

  const handleToggleBiometrics = async () => {
    if (prefs.biometricEnabled) {
      onUpdatePrefs({ ...prefs, biometricEnabled: false, biometricCredentialId: undefined });
      showFeedback('Biometrics disabled.');
    } else {
      if (!isWebAuthnSupported()) {
        showFeedback('WebAuthn not supported by this browser.', true);
        return;
      }
      try {
        const id = await registerBiometric();
        onUpdatePrefs({ ...prefs, biometricEnabled: true, biometricCredentialId: id });
        showFeedback('Biometrics successfully registered!');
      } catch (err: any) {
        showFeedback(err.message || 'Failed to register biometrics.', true);
        console.error(err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-lg bg-white/95 dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-800 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] backdrop-blur-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-150 dark:border-zinc-800/60 shrink-0 bg-slate-50/50 dark:bg-zinc-950/40 rounded-t-3xl">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 font-sans tracking-tight">
            Preferences & Security
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Panel */}
        <div className="flex-1 overflow-y-auto p-6 space-y-7 text-sm">
          {successMsg && (
            <div className="p-3 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/40 rounded-xl flex items-center gap-2">
              <Check size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-405 border border-red-100 dark:border-red-900/40 rounded-xl flex items-center gap-2">
              <Trash2 size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Editor Mode selection (Option 1 vs Option 2) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <Sliders size={13} className="text-indigo-500" />
              <span>Editor Setup Preference</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => onUpdatePrefs({ ...prefs, editorOption: 'editor1' })}
                className={`text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                  (prefs.editorOption || 'editor2') === 'editor1'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-xs ring-1 ring-indigo-500'
                    : 'border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-850'
                }`}
              >
                <div className="font-bold text-xs text-slate-850 dark:text-slate-200">Option 1: Rich Text</div>
                <div className="text-[10px] text-slate-500 dark:text-zinc-500 mt-1 leading-relaxed">No Markdown markup. Draft visually using real-time interactive formatting.</div>
              </button>
              <button
                onClick={() => onUpdatePrefs({ ...prefs, editorOption: 'editor2' })}
                className={`text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                  (prefs.editorOption || 'editor2') === 'editor2'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-xs ring-1 ring-indigo-500'
                    : 'border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-850'
                }`}
              >
                <div className="font-bold text-xs text-slate-850 dark:text-slate-200">Option 2: Document Platform</div>
                <div className="text-[10px] text-slate-500 dark:text-zinc-500 mt-1 leading-relaxed">Type unrendered Markdown text using dynamic dual split-view render engine.</div>
              </button>
            </div>
          </div>

          {/* Sidebar Note List Layout (Normal vs Compact) */}
          <div className="space-y-3 pt-1">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <Layers size={13} className="text-indigo-500" />
              <span>Sidebar Catalog Display</span>
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onUpdatePrefs({ ...prefs, noteListLayout: 'normal' })}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all cursor-pointer ${
                  (prefs.noteListLayout || 'normal') === 'normal'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-xs ring-1 ring-indigo-500'
                    : 'border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-850'
                }`}
              >
                <div className="font-bold text-[11px] uppercase tracking-wider mb-1">Normal Layout</div>
                <div className="text-[9px] text-slate-500 dark:text-zinc-500 text-center leading-tight">Large cards with centered iconography and titles.</div>
              </button>
              <button
                onClick={() => onUpdatePrefs({ ...prefs, noteListLayout: 'compact' })}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all cursor-pointer ${
                  (prefs.noteListLayout || 'normal') === 'compact'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-xs ring-1 ring-indigo-500'
                    : 'border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-850'
                }`}
              >
                <div className="font-bold text-[11px] uppercase tracking-wider mb-1">Compact List</div>
                <div className="text-[9px] text-slate-500 dark:text-zinc-500 text-center leading-tight">High-density standard vertical listing layout.</div>
              </button>
            </div>
          </div>

          {/* Aesthetic Theme Selection (31 styles!) */}
          <div className="space-y-3 pt-1">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Layers size={13} className="text-indigo-500" />
                <span>Aesthetic Design Theme ({designStyles.length} Styles)</span>
              </div>
              {prefs.favoriteDesignStyle && (
                <div className="flex items-center gap-1 text-[9px] text-pink-500 font-black tracking-tighter uppercase animate-pulse">
                  <Heart size={10} fill="currentColor" />
                  <span>Favorite Set</span>
                </div>
              )}
            </h4>
            <div className="space-y-2">
              <div className="flex gap-2">
                <select
                  value={prefs.designStyle || 'minimalist'}
                  onChange={(e) => onUpdatePrefs({
                    ...prefs,
                    designStyle: e.target.value as DesignStyle
                  })}
                  className="flex-1 py-2.5 px-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-semibold cursor-pointer"
                >
                  {designStyles.map(style => (
                    <option key={style.id} value={style.id}>
                      {style.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    const current = prefs.designStyle || 'minimalist';
                    onUpdatePrefs({
                      ...prefs,
                      favoriteDesignStyle: current
                    });
                    showFeedback(`"${designStyles.find(s => s.id === current)?.label}" set as default favorite!`);
                  }}
                  title="Make this theme your favorite default"
                  className={`px-3 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                    prefs.favoriteDesignStyle === (prefs.designStyle || 'minimalist')
                      ? 'bg-pink-50 dark:bg-pink-950/20 border-pink-200 dark:border-pink-900/40 text-pink-600'
                      : 'bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-400 hover:text-pink-500'
                  }`}
                >
                  <Heart size={16} fill={prefs.favoriteDesignStyle === (prefs.designStyle || 'minimalist') ? "currentColor" : "none"} />
                </button>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-zinc-500 italic leading-relaxed">
                Applying a design style adapts the entire layout beautifully. Setting a <span className="text-pink-500 font-bold">Favorite</span> will load it automatically on next launch.
              </div>
            </div>
          </div>

          {/* Pane Naming Choices (Req 5) */}
          <div className="space-y-3 pt-1">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Settings2 size={13} className="text-indigo-550" />
              <span>Split Split-View Pane Titles</span>
            </h4>
            <select
              value={prefs.paneNamingOption || 'raw-formatted'}
              onChange={(e) => onUpdatePrefs({
                ...prefs,
                paneNamingOption: e.target.value as PaneNamingOption
              })}
              className="w-full py-2.5 px-3 bg-slate-50 dark:bg-zinc-950 border border-slate-205 dark:border-zinc-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-505 text-xs font-semibold cursor-pointer"
            >
              <option value="raw-formatted">Raw Input → Formatted Output</option>
              <option value="source-preview">Source View → Preview View</option>
              <option value="edit-render">Edit Mode → Render Mode</option>
              <option value="code-display">Code/Text → Display/Preview</option>
            </select>
          </div>

          {/* Code blocks highlighter themes (Req 4) */}
          <div className="space-y-3 pt-1">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <Code size={13} className="text-indigo-500" />
              <span>Syntax Highlighter Theme</span>
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                { id: 'dracula', label: 'Dracula' },
                { id: 'github-dark', label: 'GitHub Dark' },
                { id: 'github-light', label: 'GitHub Light' },
                { id: 'monokai', label: 'Monokai' },
                { id: 'synthwave', label: 'Synthwave' },
                { id: 'solarized', label: 'Solarized' }
              ].map(syntax => (
                <button
                  key={syntax.id}
                  onClick={() => onUpdatePrefs({
                    ...prefs,
                    syntaxTheme: syntax.id as SyntaxTheme
                  })}
                  className={`py-2 px-2.5 text-xxs text-center font-bold rounded-lg border cursor-pointer uppercase tracking-tight transition-all ${
                    (prefs.syntaxTheme || 'dracula') === syntax.id
                      ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/15 text-indigo-600 dark:text-indigo-400'
                      : 'border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-zinc-850'
                  }`}
                >
                  {syntax.label}
                </button>
              ))}
            </div>
          </div>

          {/* Theme selection */}
          <div className="space-y-3 pt-1">
            <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Interface Theme Mode
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onUpdatePrefs({ ...prefs, theme: 'light' })}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border font-medium cursor-pointer ${
                  prefs.theme === 'light'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
                }`}
              >
                <Sun size={16} />
                <span>Light</span>
              </button>
              <button
                onClick={() => onUpdatePrefs({ ...prefs, theme: 'dark' })}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border font-medium cursor-pointer ${
                  prefs.theme === 'dark'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
                }`}
              >
                <Moon size={16} />
                <span>Dark</span>
              </button>
            </div>
          </div>

          {/* Typography setup */}
          <div className="space-y-4 pt-1">
            <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Editor Typography
            </h4>
            
            {/* Font Family */}
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Font Family</span>
              <div className="grid grid-cols-3 gap-2">
                {fonts.map(font => (
                  <button
                    key={font.id}
                    onClick={() => onUpdatePrefs({
                      ...prefs,
                      typography: { ...prefs.typography, family: font.id }
                    })}
                    className={`py-2 px-3 text-xs rounded-lg border text-center ${font.class} ${
                      prefs.typography.family === font.id
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/10 text-indigo-600 dark:text-indigo-400 font-semibold'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
                    }`}
                  >
                    {font.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size & Spacing */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Size</span>
                <select
                  value={prefs.typography.fontSize}
                  onChange={(e) => onUpdatePrefs({
                    ...prefs,
                    typography: { ...prefs.typography, fontSize: e.target.value as any }
                  })}
                  className="w-full py-1.5 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-850 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                >
                  {fontSizes.map(size => (
                    <option key={size.id} value={size.id}>{size.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Line Spacing</span>
                <select
                  value={prefs.typography.lineHeight}
                  onChange={(e) => onUpdatePrefs({
                    ...prefs,
                    typography: { ...prefs.typography, lineHeight: e.target.value as any }
                  })}
                  className="w-full py-1.5 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-850 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                >
                  {lineHeights.map(lh => (
                    <option key={lh.id} value={lh.id}>{lh.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Encryption E2E controls */}
          <div className="space-y-3 pt-1">
            <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Security & Privacy
            </h4>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-medium">
                  <Shield size={18} className="text-indigo-600 dark:text-indigo-400" />
                  <span>End-to-End Encryption</span>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xxs font-semibold uppercase ${
                  prefs.encryptionEnabled
                    ? 'bg-indigo-100 text-indigo-805 dark:bg-indigo-950/30 dark:text-indigo-300'
                    : 'bg-slate-200 text-slate-650 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {prefs.encryptionEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-450 leading-relaxed">
                Vault handles on-device encryption using cryptographic standard AES-GCM-256 before synchronization or storage.
              </p>
              <div className="flex gap-2 pt-1.5">
                {prefs.encryptionEnabled ? (
                  <button
                    onClick={onDisableEncryption}
                    className="py-1.5 px-3 rounded-lg border border-red-200 dark:border-red-900/30 text-red-650 hover:bg-red-50 dark:hover:bg-red-950/10 text-xs font-medium"
                  >
                    Disable Encryption
                  </button>
                ) : (
                  <button
                    onClick={onTriggerEncryptionSetup}
                    className="py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium"
                  >
                    Enable Encryption
                  </button>
                )}
                {prefs.encryptionEnabled && (
                  <button
                    onClick={onTriggerEncryptionSetup}
                    className="py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850 text-xs font-medium flex items-center gap-1"
                  >
                    <RefreshCw size={12} />
                    <span>Change Key</span>
                  </button>
                )}
              </div>
            </div>

            {/* Biometric quick lock */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-medium">
                  <Fingerprint size={18} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Biometric Vault Quick-Lock</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={!!prefs.biometricEnabled} onChange={handleToggleBiometrics} />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-450 leading-relaxed">
                Unlock your encrypted vault using TouchID, FaceID, or Windows Hello instead of entering your master passphrase every time.
              </p>
            </div>
          </div>

          {/* Backup Management & Reset */}
          <div className="space-y-3 pt-1">
            <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Data Management
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleExportBackup}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 font-medium"
              >
                <Download size={14} />
                <span>Export ZIP Backup</span>
              </button>
              
              <button
                onClick={handleImportClick}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 font-medium whitespace-nowrap"
              >
                <Upload size={14} />
                <span>Import Database</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportFileChange}
                className="hidden"
              />
            </div>

            <button
              onClick={() => {
                if(confirm("Are you absolutely sure you want to clear all notes and folders from your local cache? This action is permanent!")) {
                  onClearAllData();
                  showFeedback("Wiped all cached cache records successfully.");
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-red-200 dark:border-red-900/30 text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 font-medium text-xs mt-1"
            >
              <Trash2 size={14} />
              <span>Full Cache Reset (Destructive)</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-805 text-center shrink-0 rounded-b-2xl">
          <button
            onClick={onClose}
            className="py-1.5 px-6 rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
