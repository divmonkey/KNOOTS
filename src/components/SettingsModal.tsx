/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useMemo } from 'react';
import { 
  X, Type, Sun, Moon, Shield, Download, Upload, Trash2, Check, 
  RefreshCw, Layers, Sliders, Settings2, Code, Heart, Fingerprint, 
  Plus, Palette, HelpCircle, ChevronDown, Search, Sparkles, Tag
} from 'lucide-react';
import { 
  Note, Folder, UserPreferences, EditorOption, PaneNamingOption, 
  SyntaxTheme, DesignStyle, TagDefinition 
} from '../types';
import { designStyles, getStyle } from '../lib/designStyles';
import { registerBiometric, isWebAuthnSupported } from '../lib/webauthn';
import { TagIcon } from './TagIcon';
import { ColorPickerInput } from './ColorPickerInput';
import { PROFESSION_PRESETS, PresetTag } from '../lib/tagPresets';
import * as HeroOutlineIcons from '@heroicons/react/24/outline';

const heroIconKeys = Object.keys(HeroOutlineIcons).filter(k => k.endsWith('Icon'));

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
  tagDefinitions: TagDefinition[];
  onSaveTag: (tag: TagDefinition) => void | Promise<void>;
  onDeleteTag: (name: string) => void | Promise<void>;
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
  onDisableEncryption,
  tagDefinitions,
  onSaveTag,
  onDeleteTag
}: SettingsModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Style config from current designStyle selection
  const stylePrefs = getStyle(prefs.designStyle);
  const fontClass = stylePrefs.containerClass.match(/font-(sans|serif|mono|condensed|heading)/)?.[0] || 'font-sans';
  const isBrutalist = stylePrefs.id === 'brutalist' || stylePrefs.id === 'monochrome';
  const isRetro = stylePrefs.id === 'retro' || stylePrefs.id === 'cyberpunk' || stylePrefs.id === 'high_tech';

  const getInnerCardClass = () => {
    if (isBrutalist) {
      return "p-4 border-2 border-black dark:border-white bg-white dark:bg-zinc-900 shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(255,255,255,1)] space-y-4";
    }
    if (isRetro) {
      return "p-4 border border-[#33ff33]/30 bg-black/60 shadow-[0_0_10px_rgba(51,255,51,0.05)] space-y-4";
    }
    return "p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/20 space-y-4";
  };

  const getTabClass = (tabId: string) => {
    const isActive = activeTab === tabId;
    if (isActive) {
      if (isBrutalist) {
        return 'text-black dark:text-white border-b-4 border-black dark:border-white bg-slate-105 dark:bg-zinc-805 font-black';
      }
      if (isRetro) {
        return 'text-[#33ff33] border-b-2 border-[#33ff33] bg-[#33ff33]/10 font-bold';
      }
      return 'text-indigo-650 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 font-bold';
    } else {
      if (isBrutalist) {
        return 'text-slate-500 border-b-2 border-transparent hover:text-black dark:hover:text-white font-medium';
      }
      if (isRetro) {
        return 'text-[#33ff33]/60 border-b-2 border-transparent hover:text-[#33ff33] font-medium';
      }
      return 'text-slate-400 dark:text-zinc-500 border-b-2 border-transparent hover:text-slate-700 dark:hover:text-zinc-350';
    }
  };

  const getButtonClass = (variant: 'primary' | 'secondary' | 'danger' = 'secondary') => {
    const base = stylePrefs.buttonClass;
    
    if (variant === 'danger') {
      if (isBrutalist) {
        return 'bg-red-500 text-white border-2 border-black dark:border-white rounded-none font-black uppercase text-xs tracking-wider px-3 py-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer transition-all';
      }
      if (isRetro) {
        return 'bg-[#2b2b2a] border border-red-500 hover:bg-red-500 hover:text-black text-red-500 rounded-sm font-mono text-[10px] uppercase tracking-widest px-2.5 py-1 cursor-pointer transition-all';
      }
      return 'py-1.5 px-3 rounded-lg border border-red-200 dark:border-red-950/40 text-red-650 hover:bg-red-50 dark:hover:bg-red-950/15 text-xs font-semibold cursor-pointer';
    }
    
    if (variant === 'primary') {
      if (stylePrefs.id === 'minimalist' || stylePrefs.id === 'light_mode' || stylePrefs.id === 'dark_mode' || stylePrefs.id === 'corporate') {
        return 'py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer transition-colors shadow-xs';
      }
      if (stylePrefs.id === 'glassmorphism' || stylePrefs.id === 'gradient_heavy') {
        return 'backdrop-blur-md bg-indigo-600 hover:bg-indigo-700 text-white border border-white/20 rounded-xl cursor-pointer text-xs px-3 py-1.5 transition-all shadow-md';
      }
      if (stylePrefs.id === 'neumorphic') {
        return 'bg-[#e0e0e0] dark:bg-[#1e1e1e] rounded-xl shadow-[3px_3px_6px_#bebebe,-3px_-3px_6px_#ffffff] dark:shadow-[3px_3px_6px_#131313,-3px_-3px_6px_#292929] active:shadow-[inset_3px_3px_6px_#bebebe,inset_-3px_-3px_6px_#ffffff] dark:active:shadow-[inset_3px_3px_6px_#131313,inset_-3px_-3px_6px_#292929] text-indigo-650 dark:text-indigo-405 font-extrabold text-xs px-3 py-1.5 cursor-pointer border border-indigo-500/20';
      }
      if (stylePrefs.id === 'organic') {
        return 'bg-[#5b6b55] hover:bg-[#4a5845] text-[#eed] rounded-full text-xs font-serif px-3.5 py-1.5 cursor-pointer transition-colors shadow-sm';
      }
      if (stylePrefs.id === 'elegant') {
        return 'bg-[#3c2a21] hover:bg-[#1a120c] text-white rounded-none font-serif tracking-widest text-[9.5px] uppercase px-4 py-2 cursor-pointer transition-colors shadow-md';
      }
      if (stylePrefs.id === 'high_tech') {
        return 'bg-[#39ff14]/20 hover:bg-[#39ff14]/30 text-[#39ff14] border border-[#39ff14] rounded-lg text-xs font-mono px-3 py-1.5 cursor-pointer shadow-md transition-colors';
      }
    }
    
    return base;
  };

  const getBadgeClass = (type: 'success' | 'neutral') => {
    if (isBrutalist) {
      return `rounded-none border border-black dark:border-white font-black uppercase tracking-wider text-[9px] px-2 py-0.5 ${
        type === 'success' ? 'bg-green-400 text-black' : 'bg-slate-200 text-black dark:bg-zinc-800 dark:text-white'
      }`;
    }
    if (isRetro) {
      return `rounded-sm border font-mono text-[9px] px-2 py-0.5 ${
        type === 'success' ? 'border-[#33ff33] bg-[#33ff33]/20 text-[#33ff33]' : 'border-[#33ff33]/50 bg-black text-[#33ff33]/70'
      }`;
    }
    return `rounded-full text-[9px] font-black uppercase px-2 py-0.5 ${
      type === 'success'
        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-200/10'
        : 'bg-slate-200 text-slate-650 dark:bg-slate-800 dark:text-slate-400'
    }`;
  };

  const getListContainerClass = () => {
    if (isBrutalist) {
      return 'max-h-60 overflow-y-auto border-2 border-black dark:border-white rounded-none bg-white dark:bg-zinc-900 divide-y divide-black dark:divide-white custom-scrollbar pr-0.5';
    }
    if (isRetro) {
      return 'max-h-60 overflow-y-auto border border-[#33ff33]/45 rounded-sm bg-black divide-y divide-[#33ff33]/30 custom-scrollbar pr-0.5';
    }
    return 'max-h-60 overflow-y-auto border border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-950 divide-y divide-slate-105 dark:divide-zinc-900 custom-scrollbar pr-0.5';
  };

  const getLivePreviewClass = () => {
    if (isBrutalist) {
      return 'space-y-1 bg-white dark:bg-zinc-900 p-3.5 border-2 border-black dark:border-white flex-1 flex flex-col justify-center items-center';
    }
    if (isRetro) {
      return 'space-y-1 bg-black p-3.5 border border-[#33ff33]/30 flex-1 flex flex-col justify-center items-center';
    }
    return 'space-y-1 bg-white dark:bg-zinc-900/60 p-3.5 rounded-xl border border-slate-200/60 dark:border-zinc-800/60 flex-1 flex flex-col justify-center items-center';
  };

  const getToggleButtonClass = (isActive: boolean) => {
    if (isActive) {
      if (isBrutalist) {
        return `${stylePrefs.buttonClass} !bg-black !text-white dark:!bg-white dark:!text-black !shadow-none translate-x-[1px] translate-y-[1px] font-black`;
      }
      if (isRetro) {
        return `${stylePrefs.buttonClass} !bg-[#33ff33] !text-black font-bold shadow-[0_0_12px_rgba(51,255,51,0.6)]`;
      }
      if (stylePrefs.id === 'cyberpunk') {
        return `${stylePrefs.buttonClass} !bg-[#fff000] !text-black font-extrabold shadow-[3px_3px_0_#ff0055] border-0`;
      }
      if (stylePrefs.id === 'neumorphic') {
        return `${stylePrefs.buttonClass} !shadow-[inset_3px_3px_6px_#bebebe,inset_-3px_-3px_6px_#ffffff] dark:!shadow-[inset_3px_3px_6px_#131313,inset_-3px_-3px_6px_#292929] text-indigo-650 dark:text-indigo-400 font-extrabold`;
      }
      if (stylePrefs.id === 'glassmorphism') {
        return `${stylePrefs.buttonClass} !bg-white/40 dark:!bg-white/20 border-white/40 text-indigo-955 dark:text-white font-bold shadow-sm`;
      }
      if (stylePrefs.id === 'gradient_heavy') {
        return `${stylePrefs.buttonClass} !bg-gradient-to-r !from-pink-500 !via-purple-500 !to-indigo-500 text-white font-extrabold`;
      }
      if (stylePrefs.id === 'organic') {
        return `${stylePrefs.buttonClass} !bg-[#5b6b55] !text-[#eed] font-serif shadow-xs`;
      }
      if (stylePrefs.id === 'elegant') {
        return `${stylePrefs.buttonClass} !bg-[#3c2a21] !text-white border-[#3c2a21]`;
      }
      if (stylePrefs.id === 'luxury') {
        return `${stylePrefs.buttonClass} !bg-gradient-to-r !from-[#c5a881] !to-[#b19267] !text-black font-black`;
      }
      if (stylePrefs.id === 'flat') {
        return `${stylePrefs.buttonClass} !bg-indigo-600 !text-white border-0`;
      }
      if (stylePrefs.id === 'high_tech') {
        return `${stylePrefs.buttonClass} !bg-[#39ff14]/20 !border-[#39ff14] text-[#39ff14] shadow-[0_0_8px_rgba(57,255,20,0.25)]`;
      }
      if (stylePrefs.id === 'vintage') {
        return `${stylePrefs.buttonClass} !bg-[#3e2723] !text-white !border-[#3e2723]`;
      }
      if (stylePrefs.id === 'industrial') {
        return `${stylePrefs.buttonClass} !bg-[#f7931f] !text-[#151515] !border-t-[#ffb85d]`;
      }
      if (stylePrefs.id === 'artistic') {
        return `${stylePrefs.buttonClass} !bg-gradient-to-r !from-rose-500 !to-indigo-500 !text-white shadow-md`;
      }
      if (stylePrefs.id === 'material') {
        return `${stylePrefs.buttonClass} !bg-[#6200ee] dark:!bg-teal-500 !text-white`;
      }
      if (stylePrefs.id === 'playful') {
        return `${stylePrefs.buttonClass} !bg-[#ff4b73] !text-white`;
      }
      return `${stylePrefs.buttonClass} border-indigo-650 bg-indigo-50/15 dark:bg-indigo-950/10 shadow-sm ring-1 ring-indigo-500/10 font-bold`;
    } else {
      if (isBrutalist) {
        return `${stylePrefs.buttonClass} !bg-white dark:!bg-zinc-900 !text-black dark:!text-white opacity-60 hover:opacity-100`;
      }
      if (isRetro) {
        return `${stylePrefs.buttonClass} !text-[#33ff33]/50 !border-[#33ff33]/30 hover:!text-[#33ff33] hover:!border-[#33ff33]/60`;
      }
      if (stylePrefs.id === 'cyberpunk') {
        return `${stylePrefs.buttonClass} !bg-black/40 !text-[#ff0055]/70 !border-[#ff0055]/50 hover:!text-[#00ffcc] hover:!border-[#00ffcc]`;
      }
      if (stylePrefs.id === 'neumorphic') {
        return `${stylePrefs.buttonClass} opacity-60 hover:opacity-90`;
      }
      if (stylePrefs.id === 'glassmorphism') {
        return `${stylePrefs.buttonClass} !bg-white/10 dark:!bg-black/20 opacity-60 hover:opacity-90`;
      }
      if (stylePrefs.id === 'organic') {
        return `${stylePrefs.buttonClass} !bg-transparent !text-[#5b6b55] !border-[#c2cdc0] opacity-75 hover:opacity-100`;
      }
      if (stylePrefs.id === 'elegant') {
        return `${stylePrefs.buttonClass} !bg-transparent !text-[#1a120c] dark:!text-[#f3dfca]/80 opacity-60 hover:opacity-90`;
      }
      if (stylePrefs.id === 'luxury') {
        return `${stylePrefs.buttonClass} !bg-[#0d0e12] !text-[#c5a881]/70 !border-[#c5a881]/30 hover:!text-[#c5a881] hover:!border-[#c5a881]`;
      }
      if (stylePrefs.id === 'high_tech') {
        return `${stylePrefs.buttonClass} !bg-[#06080c] !text-[#39ff14]/50 !border-[#1b2029] hover:!text-[#39ff14] hover:!border-[#39ff14]/50`;
      }
      return `${stylePrefs.buttonClass} opacity-50 hover:opacity-90`;
    }
  };

  const toggleCheckedClass = useMemo(() => {
    if (isRetro) return 'peer-checked:bg-[#33ff33]';
    if (stylePrefs.id === 'cyberpunk' || stylePrefs.id === 'geometric') return 'peer-checked:bg-[#ff0055]';
    if (isBrutalist) return 'peer-checked:bg-black dark:peer-checked:bg-white';
    if (stylePrefs.id === 'organic') return 'peer-checked:bg-[#5b6b55]';
    if (stylePrefs.id === 'skeuomorphic') return 'peer-checked:bg-amber-600';
    return 'peer-checked:bg-indigo-600';
  }, [stylePrefs.id, isRetro, isBrutalist]);

  const headerClass = `flex flex-col shrink-0 border-b ${
    isBrutalist 
      ? 'border-black dark:border-zinc-800 bg-slate-105 dark:bg-zinc-950' 
      : isRetro
        ? 'border-[#33ff33]/40 bg-black/40'
        : 'border-slate-150 dark:border-zinc-800/60 bg-slate-50/50 dark:bg-zinc-955/20'
  }`;

  // Tab State
  const [activeTab, setActiveTab] = useState<'preferences' | 'security' | 'tags'>('preferences');

  // Tag creation states
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6366f1');
  const [newTagIcon, setNewTagIcon] = useState('🏷️');
  const [showNewTagColorPicker, setShowNewTagColorPicker] = useState(false);
  const [showNewTagIconPicker, setShowNewTagIconPicker] = useState(false);

  // Editing tag states
  const [editingTagColorName, setEditingTagColorName] = useState<string | null>(null);
  const [editingTagIconName, setEditingTagIconName] = useState<string | null>(null);

  // Profession preset loading state
  const [selectedProfession, setSelectedProfession] = useState<string>('Web Developer');

  // Heroicon search state
  const [iconSearch, setIconSearch] = useState('');

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

      const dataStr = JSON.stringify({ notes, folders }, null, 2);
      zip.file('memento_vault_index.json', dataStr);

      const notesFolder = zip.folder('notes');
      notes.forEach(note => {
        const safeTitle = (note.title || 'Untitled Note').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `${safeTitle}_${note.id.substring(0, 6)}.md`;
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

  // Custom Tag Creation
  const handleCreateTag = () => {
    const nameUpper = newTagName.trim().toUpperCase();
    if (!nameUpper) {
      showFeedback('Tag name cannot be empty.', true);
      return;
    }
    const exists = tagDefinitions.some(t => t.name === nameUpper);
    if (exists) {
      showFeedback('Tag name already exists in catalog.', true);
      return;
    }

    onSaveTag({
      name: nameUpper,
      color: newTagColor,
      icon: newTagIcon
    });

    setNewTagName('');
    setNewTagColor('#6366f1');
    setNewTagIcon('🏷️');
    showFeedback(`Tag #${nameUpper} registered successfully.`);
  };

  // Load preset tags
  const handleLoadPresets = () => {
    const list = PROFESSION_PRESETS[selectedProfession];
    if (!list) return;

    list.forEach(item => {
      onSaveTag({
        name: item.name.toUpperCase(),
        color: item.color,
        icon: item.icon
      });
    });

    showFeedback(`Merged ${list.length} preset tags for "${selectedProfession}"!`);
  };

  // Emoji Catalog List
  const quickEmojis = ['🏷️', '💻', '🎓', '✍️', '🚀', '💡', '🔌', '🪲', '📝', '⏱️', '📓', '👥', '🔬', '📊', '👤', '✂️', '📖', '📋', '⚡', '📱', '📣', '📈', '❤️', '🎯'];

  // Filtered Heroicon keys
  const filteredHeroIcons = useMemo(() => {
    return heroIconKeys
      .filter(k => k.toLowerCase().includes(iconSearch.toLowerCase()))
      .slice(0, 24);
  }, [iconSearch]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className={`w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden transition-all duration-300 ${stylePrefs.cardClass} ${fontClass}`}>
        
        {/* Header Tabs Navigation */}
        <div className={headerClass}>
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <h3 className={`text-md font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 ${stylePrefs.titleFontClass}`}>
              <Settings2 size={16} className={isRetro ? 'text-[#33ff33]' : 'text-indigo-650 dark:text-indigo-400'} />
              <span>System Settings</span>
            </h3>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isRetro 
                  ? 'text-[#33ff33] hover:bg-[#33ff33]/15' 
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex px-3">
            {[
              { id: 'preferences', label: 'Preferences', icon: Sliders },
              { id: 'security', label: 'Security & Data', icon: Shield },
              { id: 'tags', label: 'Tag Management', icon: Layers }
            ].map(tab => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs transition-all cursor-pointer ${getTabClass(tab.id)}`}
                >
                  <TabIcon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm relative">
          {successMsg && (
            <div className="p-3 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/40 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <Check size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-405 border border-red-100 dark:border-red-900/40 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <Trash2 size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: PREFERENCES */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              {/* Aesthetic Design Theme & Theme Mode side-by-side / inline structure */}
              <div className={getInnerCardClass()}>
                
                {/* Aesthetic Theme Dropdown */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Layers size={13} className="text-indigo-500" />
                      <span>Aesthetic Design Theme</span>
                    </div>
                    {prefs.favoriteDesignStyle && (
                      <div className="flex items-center gap-1 text-[9px] text-pink-500 font-black tracking-tighter uppercase">
                        <Heart size={10} fill="currentColor" />
                        <span>Favorite</span>
                      </div>
                    )}
                  </h4>
                  <div className="flex gap-2">
                    <select
                      value={prefs.designStyle || 'minimalist'}
                      onChange={(e) => onUpdatePrefs({
                        ...prefs,
                        designStyle: e.target.value as DesignStyle
                      })}
                      className={`flex-1 py-2 px-3 focus:outline-none text-xs font-semibold cursor-pointer ${stylePrefs.inputClass}`}
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
                        showFeedback(`"${designStyles.find(s => s.id === current)?.label}" marked as default favorite.`);
                      }}
                      title="Mark as default favorite theme"
                      className={
                        prefs.favoriteDesignStyle === (prefs.designStyle || 'minimalist')
                          ? 'px-3 rounded-xl border border-pink-200 dark:border-pink-900/40 text-pink-600 bg-pink-50 dark:bg-pink-950/20 flex items-center justify-center cursor-pointer transition-all'
                          : `${stylePrefs.buttonClass} px-3 flex items-center justify-center`
                      }
                    >
                      <Heart size={15} fill={prefs.favoriteDesignStyle === (prefs.designStyle || 'minimalist') ? "currentColor" : "none"} />
                    </button>
                  </div>
                </div>

                {/* Interface Theme Mode - Positioned directly below layout */}
                <div className="space-y-2 border-t border-slate-200/60 dark:border-zinc-800/60 pt-4">
                  <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Interface Theme Mode
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => onUpdatePrefs({ ...prefs, theme: 'light' })}
                      className={getToggleButtonClass(prefs.theme === 'light')}
                    >
                      <Sun size={14} />
                      <span>Light</span>
                    </button>
                    <button
                      onClick={() => onUpdatePrefs({ ...prefs, theme: 'dark' })}
                      className={getToggleButtonClass(prefs.theme === 'dark')}
                    >
                      <Moon size={14} />
                      <span>Dark</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Sidebar density Layout (Segmented Buttons) */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Sliders size={13} className="text-indigo-500" />
                  <span>Sidebar Catalog Display</span>
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => onUpdatePrefs({ ...prefs, noteListLayout: 'normal' })}
                    className={`${getToggleButtonClass((prefs.noteListLayout || 'normal') === 'normal')} flex flex-col items-center justify-center p-3 text-center`}
                  >
                    <span className="font-bold text-[10.5px] uppercase tracking-wider mb-0.5">Normal Layout</span>
                    <span className="text-[9px] opacity-70 text-center leading-tight">Large cards, centered iconography & metadata</span>
                  </button>
                  <button
                    onClick={() => onUpdatePrefs({ ...prefs, noteListLayout: 'compact' })}
                    className={`${getToggleButtonClass((prefs.noteListLayout || 'normal') === 'compact')} flex flex-col items-center justify-center p-3 text-center`}
                  >
                    <span className="font-bold text-[10.5px] uppercase tracking-wider mb-0.5">Compact List</span>
                    <span className="text-[9px] opacity-70 text-center leading-tight">High-density standard vertical listings</span>
                  </button>
                </div>
              </div>

              {/* Pane Naming Choices */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Settings2 size={13} className="text-indigo-500" />
                  <span>Split-View Pane Titles</span>
                </h4>
                <select
                  value={prefs.paneNamingOption || 'raw-formatted'}
                  onChange={(e) => onUpdatePrefs({
                    ...prefs,
                    paneNamingOption: e.target.value as PaneNamingOption
                  })}
                  className={`w-full py-2 px-3 focus:outline-none text-xs font-semibold cursor-pointer ${stylePrefs.inputClass}`}
                >
                  <option value="raw-formatted">Raw Input → Formatted Output</option>
                  <option value="source-preview">Source View → Preview View</option>
                  <option value="edit-render">Edit Mode → Render Mode</option>
                  <option value="code-display">Code/Text → Display/Preview</option>
                </select>
              </div>

              {/* Syntax Highlighter Theme Selection */}
              <div className="space-y-2">
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
                    { id: 'synthwave', label: 'Syntaxwave' },
                    { id: 'solarized', label: 'Solarized' }
                  ].map(syntax => (
                    <button
                      key={syntax.id}
                      onClick={() => onUpdatePrefs({
                        ...prefs,
                        syntaxTheme: syntax.id as SyntaxTheme
                      })}
                      className={getToggleButtonClass((prefs.syntaxTheme || 'dracula') === syntax.id)}
                    >
                      {syntax.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Typography setup */}
              <div className="space-y-3 pt-1">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Editor Typography
                </h4>
                
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">Font Family</span>
                  <div className="grid grid-cols-3 gap-2">
                    {fonts.map(font => (
                      <button
                        key={font.id}
                        onClick={() => onUpdatePrefs({
                          ...prefs,
                          typography: { ...prefs.typography, family: font.id }
                        })}
                        className={`${getToggleButtonClass(prefs.typography.family === font.id)} ${font.class}`}
                      >
                        {font.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-405">Size</span>
                    <select
                      value={prefs.typography.fontSize}
                      onChange={(e) => onUpdatePrefs({
                        ...prefs,
                        typography: { ...prefs.typography, fontSize: e.target.value as any }
                      })}
                      className={`w-full py-1.5 px-2 focus:outline-none text-xs cursor-pointer ${stylePrefs.inputClass}`}
                    >
                      {fontSizes.map(size => (
                        <option key={size.id} value={size.id}>{size.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-405">Line Spacing</span>
                    <select
                      value={prefs.typography.lineHeight}
                      onChange={(e) => onUpdatePrefs({
                        ...prefs,
                        typography: { ...prefs.typography, lineHeight: e.target.value as any }
                      })}
                      className={`w-full py-1.5 px-2 focus:outline-none text-xs cursor-pointer ${stylePrefs.inputClass}`}
                    >
                      {lineHeights.map(lh => (
                        <option key={lh.id} value={lh.id}>{lh.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SECURITY & DATA */}
          {activeTab === 'security' && (
            <div className="space-y-5">
              
              {/* E2E encryption card */}
              <div className={getInnerCardClass()}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold">
                    <Shield size={16} className="text-indigo-650 dark:text-indigo-400" />
                    <span>Client-Side Master Vault</span>
                  </div>
                  <span className={getBadgeClass(prefs.encryptionEnabled ? 'success' : 'neutral')}>
                    {prefs.encryptionEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Encryption keys are protected by your master key and derived strictly in-browser using PBKDF2/WebCrypto. The host never stores decrypted contents.
                </p>

                <div className="flex gap-2 pt-1">
                  {prefs.encryptionEnabled ? (
                    <button
                      onClick={onDisableEncryption}
                      className={getButtonClass('danger')}
                    >
                      Disable Encryption
                    </button>
                  ) : (
                    <button
                      onClick={onTriggerEncryptionSetup}
                      className={getButtonClass('primary')}
                    >
                      Enable Vault Encryption
                    </button>
                  )}
                  {prefs.encryptionEnabled && (
                    <button
                      onClick={onTriggerEncryptionSetup}
                      className={`${getButtonClass('secondary')} flex items-center gap-1`}
                    >
                      <RefreshCw size={11} />
                      <span>Change Master Key</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Biometrics */}
              <div className={getInnerCardClass()}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold">
                    <Fingerprint size={16} className="text-indigo-650 dark:text-indigo-400" />
                    <span>Biometric Quick-Unlock</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={!!prefs.biometricEnabled} 
                      onChange={handleToggleBiometrics} 
                    />
                    <div className={`w-8 h-4.5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all dark:border-zinc-650 ${toggleCheckedClass} ${isBrutalist ? 'border border-black dark:border-zinc-800' : ''}`}></div>
                  </label>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Authenticate securely using FaceID, Windows Hello, or touch biometrics to release vault salts without retyping your passphrase.
                </p>
              </div>

              {/* Data backups & clear */}
              <div className="space-y-2 pt-1.5">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Backup & Database Administration
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleExportBackup}
                    className={`${getButtonClass('secondary')} flex items-center justify-center gap-2`}
                  >
                    <Download size={13} />
                    <span>Export ZIP Archive</span>
                  </button>
                  
                  <button
                    onClick={handleImportClick}
                    className={`${getButtonClass('secondary')} flex items-center justify-center gap-2`}
                  >
                    <Upload size={13} />
                    <span>Import JSON Backups</span>
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
                    if (confirm("Are you absolutely sure you want to purge all local database tables? This action will permanently clean all synced and offline entries.")) {
                      onClearAllData();
                      showFeedback("Wiped all cached cache records successfully.");
                    }
                  }}
                  className={`${getButtonClass('danger')} w-full flex items-center justify-center gap-2 mt-2`}
                >
                  <Trash2 size={13} />
                  <span>Purge Local Database (Destructive Reset)</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: TAG MANAGEMENT */}
          {activeTab === 'tags' && (
            <div className="space-y-6">
              
              {/* Load Profession Presets */}
              <div className={getInnerCardClass()}>
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <Sparkles size={12} className="text-indigo-500" />
                  <span>Load Profession Preset Tags</span>
                </h4>
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <select
                      value={selectedProfession}
                      onChange={(e) => setSelectedProfession(e.target.value)}
                      className={`w-full py-2 pl-3 pr-8 focus:outline-none text-xs font-semibold cursor-pointer ${stylePrefs.inputClass}`}
                    >
                      {Object.keys(PROFESSION_PRESETS).map(prof => (
                        <option key={prof} value={prof}>
                          {prof}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Action trigger button */}
                  <button
                    onClick={handleLoadPresets}
                    className={`${getButtonClass('primary')} shrink-0`}
                  >
                    Load Tags
                  </button>
                </div>
                
                {/* Dots Preview Container */}
                <div className="flex items-center gap-1 text-[10px] text-slate-450 dark:text-zinc-500">
                  <span>Preview:</span>
                  <div className="flex gap-1.5 p-1 bg-white/70 dark:bg-zinc-900/60 rounded-[4px] border border-slate-200/50 dark:border-zinc-800/40">
                    {(PROFESSION_PRESETS[selectedProfession] || []).map(preset => (
                      <span
                        key={preset.name}
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ backgroundColor: preset.color }}
                        title={`${preset.name}: ${preset.icon}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Create Custom Tag Form */}
              <div className={getInnerCardClass()}>
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <Plus size={13} className="text-indigo-500" />
                  <span>Create Custom Tag</span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Left Column: Input and Triggers */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 block">Tag Label</label>
                      <input
                        type="text"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        placeholder="ENTER TAG NAME..."
                        className={`w-full py-1.5 px-2 text-xs font-semibold focus:outline-none ${stylePrefs.inputClass}`}
                      />
                    </div>

                    <div className="flex gap-2">
                      {/* Color Picker Swatch Button */}
                      <div className="flex-1 space-y-1 relative">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 block">Tag Color</label>
                        <button
                          type="button"
                          onClick={() => {
                            setShowNewTagColorPicker(!showNewTagColorPicker);
                            setShowNewTagIconPicker(false);
                          }}
                          className={`w-full py-1.5 px-3 flex items-center justify-between text-xs font-semibold cursor-pointer ${stylePrefs.buttonClass}`}
                        >
                          <span className="w-3.5 h-3.5 rounded-full border border-slate-300/35" style={{ backgroundColor: newTagColor }} />
                          <span className="font-mono text-[10px] text-slate-500">{newTagColor}</span>
                        </button>

                        {showNewTagColorPicker && (
                          <div className="absolute top-full left-0 z-50 mt-1 animate-in fade-in zoom-in-95 duration-100">
                            <ColorPickerInput
                              value={newTagColor}
                              onChange={(val) => {
                                setNewTagColor(val);
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Icon Picker Swatch Button */}
                      <div className="w-16 space-y-1 relative">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 block">Icon</label>
                        <button
                          type="button"
                          onClick={() => {
                            setShowNewTagIconPicker(!showNewTagIconPicker);
                            setShowNewTagColorPicker(false);
                          }}
                          className={`w-full py-1.5 px-2 flex items-center justify-center text-md cursor-pointer ${stylePrefs.buttonClass}`}
                        >
                          <TagIcon icon={newTagIcon} size={15} />
                        </button>

                        {showNewTagIconPicker && (
                          <div className="absolute top-full right-0 z-50 mt-1 w-64 p-3 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-100">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-1.5">
                              <span className="font-bold text-slate-500 uppercase tracking-widest text-[9px]">Select Tag Icon</span>
                              <button
                                type="button"
                                onClick={() => setShowNewTagIconPicker(false)}
                                className="p-0.5 hover:bg-slate-100 dark:hover:bg-zinc-850 rounded"
                              >
                                <X size={10} />
                              </button>
                            </div>
                            
                            {/* Emoji Library Grid */}
                            <div className="space-y-1.5">
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Quick Emojis</span>
                              <div className="grid grid-cols-6 gap-1 max-h-[76px] overflow-y-auto pr-0.5 custom-scrollbar">
                                {quickEmojis.map(emoji => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => {
                                      setNewTagIcon(emoji);
                                      setShowNewTagIconPicker(false);
                                    }}
                                    className="p-1 text-center hover:bg-slate-100 dark:hover:bg-zinc-900 rounded cursor-pointer"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Heroicons Search Filter */}
                            <div className="space-y-2 border-t border-slate-100 dark:border-zinc-800 pt-2.5">
                              <div className="relative">
                                <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                  type="text"
                                  value={iconSearch}
                                  onChange={(e) => setIconSearch(e.target.value)}
                                  placeholder="Filter outline icons..."
                                  className="w-full py-1 pl-6 pr-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-md text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                              </div>

                              <div className="grid grid-cols-6 gap-1.5 max-h-[82px] overflow-y-auto pr-0.5 custom-scrollbar">
                                {filteredHeroIcons.map(key => {
                                  const IconComponent = (HeroOutlineIcons as any)[key];
                                  return (
                                    <button
                                      key={key}
                                      type="button"
                                      onClick={() => {
                                        setNewTagIcon(key);
                                        setShowNewTagIconPicker(false);
                                      }}
                                      title={key}
                                      className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-900 rounded flex items-center justify-center cursor-pointer text-slate-600 dark:text-slate-350"
                                    >
                                      <IconComponent className="w-3.5 h-3.5 shrink-0" />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Raw SVG Paste Field */}
                            <div className="space-y-1 border-t border-slate-100 dark:border-zinc-800 pt-2">
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Raw &lt;svg&gt; Code</span>
                              <input
                                type="text"
                                placeholder='Paste <svg...>...</svg>'
                                className="w-full py-1 px-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-md text-[9px] font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300"
                                onChange={(e) => {
                                  const val = e.target.value.trim();
                                  if (val.toLowerCase().includes('<svg')) {
                                    setNewTagIcon(val);
                                    setShowNewTagIconPicker(false);
                                    showFeedback("Custom raw SVG icon configured!");
                                  }
                                }}
                              />
                            </div>

                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Dynamic tag badge live preview and Save Button */}
                  <div className="flex flex-col justify-end space-y-3">
                    <div className={getLivePreviewClass()}>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Live Preview</span>
                      
                      {/* Live styled badge preview utilizing our responsive soft transparent design */}
                      <span 
                        className="px-2.5 py-1 text-[11px] font-bold rounded border flex items-center gap-1.5 shrink-0"
                        style={{
                          backgroundColor: newTagColor + '12', // 7% opacity bg
                          borderColor: newTagColor + '26', // 15% opacity border
                          color: newTagColor,
                          borderStyle: 'solid',
                          borderWidth: '1px'
                        }}
                      >
                        <TagIcon icon={newTagIcon} size={11} />
                        <span>#{newTagName.trim().toUpperCase() || 'TAG'}</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleCreateTag}
                      className={`${getButtonClass('primary')} w-full flex items-center justify-center gap-1.5`}
                    >
                      <Plus size={14} />
                      <span>Register Custom Tag</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Current Tag Definitions Catalog List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Tag size={13} className="text-indigo-500" />
                  <span>Current Tag Definitions ({tagDefinitions.length})</span>
                </h4>
                
                <div className={getListContainerClass()}>
                  {tagDefinitions.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-405 dark:text-zinc-550 italic font-semibold">
                      No tags currently registered in database catalog.
                    </div>
                  ) : (
                    tagDefinitions.map(tag => {
                      const isColorPopoverActive = editingTagColorName === tag.name;
                      const isIconPopoverActive = editingTagIconName === tag.name;
                      
                      return (
                        <div key={tag.name} className="flex items-center justify-between p-3 gap-3 text-xs">
                          {/* Tag Chip displaying current visual state */}
                          <span
                            className="px-2 py-0.5 text-[10px] font-bold rounded border flex items-center gap-1.5 shrink-0"
                            style={{
                              backgroundColor: tag.color + '12',
                              borderColor: tag.color + '26',
                              color: tag.color,
                              borderStyle: 'solid',
                              borderWidth: '1px'
                            }}
                          >
                            <TagIcon icon={tag.icon || '🏷️'} size={11} />
                            <span>#{tag.name}</span>
                          </span>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Color Dot Button triggers color picker */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTagColorName(isColorPopoverActive ? null : tag.name);
                                  setEditingTagIconName(null);
                                }}
                                className={`w-5 h-5 rounded-full border cursor-pointer flex items-center justify-center transition-all hover:scale-110 shadow-xs ${
                                  isBrutalist ? 'border-black dark:border-white border-2' : 'border-slate-250 dark:border-zinc-800'
                                }`}
                                style={{ backgroundColor: tag.color }}
                                title="Edit tag base color"
                              />

                              {isColorPopoverActive && (
                                <div className="absolute right-0 top-full z-50 mt-1.5 animate-in fade-in zoom-in-95 duration-100">
                                  <ColorPickerInput
                                    value={tag.color}
                                    onChange={(newColor) => {
                                      onSaveTag({
                                        ...tag,
                                        color: newColor
                                      });
                                    }}
                                  />
                                </div>
                              )}
                            </div>

                            {/* Icon selector button */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTagIconName(isIconPopoverActive ? null : tag.name);
                                  setEditingTagColorName(null);
                                }}
                                className={`p-1 flex items-center justify-center cursor-pointer transition-colors ${stylePrefs.buttonClass}`}
                                title="Edit tag icon"
                              >
                                <Palette size={12} />
                              </button>

                              {isIconPopoverActive && (
                                <div className="absolute right-0 top-full z-50 mt-1.5 w-64 p-3 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-100">
                                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-1.5">
                                    <span className="font-bold text-slate-500 uppercase tracking-widest text-[9px]">Select Tag Icon</span>
                                    <button
                                      type="button"
                                      onClick={() => setEditingTagIconName(null)}
                                      className="p-0.5 hover:bg-slate-100 dark:hover:bg-zinc-850 rounded"
                                    >
                                      <X size={10} />
                                    </button>
                                  </div>

                                  {/* Quick Emojis Grid */}
                                  <div className="space-y-1.5">
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Quick Emojis</span>
                                    <div className="grid grid-cols-6 gap-1 max-h-[76px] overflow-y-auto pr-0.5 custom-scrollbar">
                                      {quickEmojis.map(emoji => (
                                        <button
                                          key={emoji}
                                          type="button"
                                          onClick={() => {
                                            onSaveTag({
                                              ...tag,
                                              icon: emoji
                                            });
                                            setEditingTagIconName(null);
                                          }}
                                          className="p-1 text-center hover:bg-slate-100 dark:hover:bg-zinc-900 rounded cursor-pointer"
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Heroicons Outline Search Filter */}
                                  <div className="space-y-2 border-t border-slate-100 dark:border-zinc-800 pt-2.5">
                                    <div className="relative">
                                      <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                      <input
                                        type="text"
                                        value={iconSearch}
                                        onChange={(e) => setIconSearch(e.target.value)}
                                        placeholder="Filter outline icons..."
                                        className="w-full py-1 pl-6 pr-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-md text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                      />
                                    </div>

                                    <div className="grid grid-cols-6 gap-1.5 max-h-[82px] overflow-y-auto pr-0.5 custom-scrollbar">
                                      {filteredHeroIcons.map(key => {
                                        const IconComponent = (HeroOutlineIcons as any)[key];
                                        return (
                                          <button
                                            key={key}
                                            type="button"
                                            onClick={() => {
                                              onSaveTag({
                                                ...tag,
                                                icon: key
                                              });
                                              setEditingTagIconName(null);
                                            }}
                                            title={key}
                                            className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-900 rounded flex items-center justify-center cursor-pointer text-slate-600 dark:text-slate-355"
                                          >
                                            <IconComponent className="w-3.5 h-3.5 shrink-0" />
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* SVG Paste Input */}
                                  <div className="space-y-1 border-t border-slate-100 dark:border-zinc-800 pt-2">
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Raw &lt;svg&gt; Code</span>
                                    <input
                                      type="text"
                                      placeholder='Paste <svg...>...</svg>'
                                      className="w-full py-1 px-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-md text-[9px] font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300"
                                      onChange={(e) => {
                                        const val = e.target.value.trim();
                                        if (val.toLowerCase().includes('<svg')) {
                                          onSaveTag({
                                            ...tag,
                                            icon: val
                                          });
                                          setEditingTagIconName(null);
                                          showFeedback(`Custom SVG configured for #${tag.name}!`);
                                        }
                                      }}
                                    />
                                  </div>

                                </div>
                              )}
                            </div>

                            {/* Delete tag button */}
                            <button
                              type="button"
                              onClick={async () => {
                                if (confirm(`Are you sure you want to delete tag #${tag.name} from the catalog? This removes it from all associated notes.`)) {
                                  await onDeleteTag(tag.name);
                                  showFeedback(`Deleted tag #${tag.name} globally.`);
                                }
                              }}
                              className={`p-1 flex items-center justify-center cursor-pointer transition-colors ${getButtonClass('danger')} !px-1.5 !py-1`}
                              title="Delete tag"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-zinc-800/60 text-center shrink-0 rounded-b-3xl">
          <button
            onClick={onClose}
            className="py-1.5 px-6 rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
