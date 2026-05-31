/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Eye, Edit3, SplitSquareVertical, Copy, Trash2, Calendar, FileDown, 
  Shield, ShieldOff, Save, Link, Bold, Italic, Strikethrough, Code, 
  Heading, CheckSquare, List, Highlighter, Table, Keyboard, HelpCircle, 
  ChevronDown, Settings2, Info, Check, Type, Sparkles, X, ListTodo, Image as ImageIcon, Palette, Mic, MicOff, Square, Pause, Play, Volume2, Video, Youtube, Cloud, HardDrive, Share2, ExternalLink, Globe,
  Undo, Redo, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, Indent, Outdent, ListOrdered
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import rehypeRaw from 'rehype-raw';
import { Note, Folder, UserPreferences, SyntaxTheme, TagDefinition } from '../types';
import { getStyle } from '../lib/designStyles';
import CodeHighlighter from './CodeHighlighter';
import NoteIcon, { BUILT_IN_ICONS, sanitizeSVG, getFallbackIconId } from './NoteIcon';
import MultitonePromptModal from './MultitonePromptModal';
import LibreTranslateModal from './LibreTranslateModal';
import GoogleWorkspacePicker from './GoogleWorkspacePicker';
import { htmlToMarkdown } from '../lib/converter';
import { uploadMediaToR2 } from '../lib/api';
import { getTagStyle, getActiveNoteColor, getTagColorClass, getTagStyleForColor } from './Sidebar';
import * as HeroOutlineIcons from '@heroicons/react/24/outline';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const heroIconKeys = Object.keys(HeroOutlineIcons).filter(k => k.endsWith('Icon') && k !== 'MagnifyingGlassIcon');

interface EditorProps {
  note: Note | null;
  folders: Folder[];
  prefs: UserPreferences;
  onUpdatePrefs?: (prefs: UserPreferences) => void;
  onUpdateNote: (updated: Note) => void | Promise<void>;
  onDeleteNote: (id: string) => void;
  encryptionUnlocked: boolean;
  onTriggerEncryptionSetup: () => void;
  tagDefinitions: TagDefinition[];
  onUpdateTagDefinitions: (defs: TagDefinition[]) => void;
}

const noteColors = ['slate', 'indigo', 'emerald', 'amber', 'rose', 'violet'] as const;
const fontFamilies = [
  { id: 'sans', label: 'Inter (Sans)' },
  { id: 'serif', label: 'Playfair (Serif)' },
  { id: 'mono', label: 'JetBrains (Mono)' }
] as const;
const fontSizes = [
  { id: 'sm', label: 'Small' },
  { id: 'base', label: 'Normal' },
  { id: 'lg', label: 'Large' },
  { id: 'xl', label: 'Huge' }
] as const;

function convertHTMLToMarkdown(html: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const walk = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.nodeValue || '';
      }
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return '';
      }
      
      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();
      
      let childrenMD = '';
      for (let i = 0; i < element.childNodes.length; i++) {
        childrenMD += walk(element.childNodes[i]);
      }
      
      switch (tagName) {
        case 'h1':
          return `\n# ${childrenMD.trim()}\n`;
        case 'h2':
          return `\n## ${childrenMD.trim()}\n`;
        case 'h3':
          return `\n### ${childrenMD.trim()}\n`;
        case 'p':
          return `\n${childrenMD.trim()}\n`;
        case 'b':
        case 'strong':
          return `**${childrenMD}**`;
        case 'i':
        case 'em':
          return `*${childrenMD}*`;
        case 'u':
          return `<u>${childrenMD}</u>`;
        case 'strike':
        case 's':
        case 'del':
          return `~~${childrenMD}~~`;
        case 'code':
          if (element.parentElement && element.parentElement.tagName.toLowerCase() === 'pre') {
            return childrenMD;
          }
          return `\`${childrenMD}\``;
        case 'pre':
          const lang = element.getAttribute('data-language') || 'javascript';
          return `\n\`\`\`${lang}\n${childrenMD.trim()}\n\`\`\`\n`;
        case 'ul':
          return `\n${childrenMD}\n`;
        case 'ol':
          return `\n${childrenMD}\n`;
        case 'li':
          const isOrdered = element.parentElement && element.parentElement.tagName.toLowerCase() === 'ol';
          if (isOrdered) {
            const siblings = Array.from(element.parentElement.children);
            const index = siblings.indexOf(element) + 1;
            return `${index}. ${childrenMD.trim()}\n`;
          }
          const hasCheckbox = element.querySelector('input[type="checkbox"]');
          if (hasCheckbox) {
            const isChecked = (hasCheckbox as HTMLInputElement).checked || (hasCheckbox as HTMLInputElement).hasAttribute('checked');
            return `- [${isChecked ? 'x' : ' '}] ${childrenMD.replace(/<input[^>]*>/i, '').trim()}\n`;
          }
          return `- ${childrenMD.trim()}\n`;
        case 'a':
          const href = element.getAttribute('href') || '#';
          return `[${childrenMD || href}](${href})`;
        case 'img':
          const src = element.getAttribute('src') || '';
          const alt = element.getAttribute('alt') || 'image';
          return `![${alt}](${src})`;
        case 'blockquote':
          return `\n> ${childrenMD.trim().replace(/\n/g, '\n> ')}\n`;
        case 'br':
          return '\n';
        case 'div':
          if (element.classList.contains('yt-attachment')) {
            const ytUrl = element.getAttribute('data-youtube-url') || element.querySelector('a')?.getAttribute('href') || '';
            const ytId = element.getAttribute('data-youtube-id') || '';
            return `\n[YouTube Video: ${ytId}](${ytUrl})\n`;
          }
          if (element.classList.contains('voice-attachment')) {
            const audioSrc = element.querySelector('audio')?.getAttribute('src') || '';
            return `\n<audio controls src="${audioSrc}"></audio>\n`;
          }
          if (element.classList.contains('flex') && element.querySelector('input[type="checkbox"]')) {
            const checkbox = element.querySelector('input[type="checkbox"]') as HTMLInputElement;
            const isChecked = checkbox.checked || checkbox.hasAttribute('checked');
            const textContent = element.textContent || '';
            return `\n- [${isChecked ? 'x' : ' '}] ${textContent.trim()}\n`;
          }
          return `\n${childrenMD}\n`;
        case 'table':
          return `\n${childrenMD}\n`;
        case 'thead':
          return `${childrenMD}`;
        case 'tbody':
          return `\n${childrenMD}`;
        case 'tr':
          const cells = Array.from(element.children);
          const cellMDs = cells.map(cell => walk(cell).trim().replace(/\|/g, '\\|'));
          const rowLines = `| ${cellMDs.join(' | ')} |`;
          const isHeader = element.parentElement && element.parentElement.tagName.toLowerCase() === 'thead';
          if (isHeader) {
            const dividers = cells.map(() => ':---');
            return `${rowLines}\n| ${dividers.join(' | ')} |\n`;
          }
          return `${rowLines}\n`;
        case 'td':
        case 'th':
          return childrenMD;
        default:
          return childrenMD;
      }
    };
    
    let markdown = '';
    const body = doc.body;
    for (let i = 0; i < body.childNodes.length; i++) {
      markdown += walk(body.childNodes[i]);
    }
    
    return markdown
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } catch (error) {
    console.error('Error converting HTML to Markdown:', error);
    return html.replace(/<[^>]*>/g, '').trim();
  }
}

// Component to render Rich Text HTML content with custom Code Highlighter blocks
function HTMLRenderer({ html, theme }: { html: string; theme: SyntaxTheme }) {
  if (!html) return null;
  
  const list: React.ReactNode[] = [];
  // Regex to find all <pre data-language="lang"><code>content</code></pre> tags
  const regex = /<pre(?:[^>]*?data-language="([^"]+)")?[^>]*?><code>([\s\S]*?)<\/code><\/pre>/gi;
  
  let match;
  let lastIndex = 0;
  let keyIdx = 0;
  
  while ((match = regex.exec(html)) !== null) {
    const prevHTML = html.substring(lastIndex, match.index);
    if (prevHTML) {
      list.push(
        <div 
          key={`html-${keyIdx++}`} 
          className="rich-text-html"
          dangerouslySetInnerHTML={{ __html: prevHTML }} 
        />
      );
    }
    
    const language = match[1] || 'javascript';
    const code = match[2]
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
      
    list.push(
      <CodeHighlighter 
        key={`code-${keyIdx++}`}
        code={code} 
        language={language} 
        theme={theme} 
      />
    );
    
    lastIndex = regex.lastIndex;
  }
  
  const remainingHTML = html.substring(lastIndex);
  if (remainingHTML) {
    list.push(
      <div 
        key={`html-${keyIdx++}`} 
        className="rich-text-html"
        dangerouslySetInnerHTML={{ __html: remainingHTML }} 
      />
    );
  }
  
  return <div className="space-y-4 my-2">{list}</div>;
}

const SLASH_TEMPLATES = [
  {
    id: 'meeting',
    icon: '👥',
    title: 'Meeting Notes',
    description: 'Standard agenda and action items',
    content: `## 👥 Meeting Notes
**Date:** ${new Date().toISOString().split('T')[0]}
**Attendees:** 

#### Agenda
- [ ] Topic 1
- [ ] Topic 2

#### Action Items
- [ ] Task 1 (@Name)
- [ ] Task 2 (@Name)
`
  },
  {
    id: 'journal',
    icon: '📝',
    title: 'Daily Journal',
    description: 'Morning thoughts and daily intentions',
    content: `## 📝 Daily Journal
**Date:** ${new Date().toISOString().split('T')[0]}

#### Morning Thoughts
...

#### Intentions for Today
1. 
2. 
3. 

#### Gratitude
- I am grateful for...
`
  },
  {
    id: 'code-log',
    icon: '💻',
    title: 'Code Log',
    description: 'Development progress and blockers',
    content: `## 💻 Code Log
**Date:** ${new Date().toISOString().split('T')[0]}

#### What I Did Today
- 

#### Blockers
- 

#### Next Steps
- 
`
  },
  {
    id: 'project',
    icon: '🚀',
    title: 'Project Planner',
    description: 'High-level project outline',
    content: `## 🚀 Project Outline
**Project:** [Project Name]
**Deadline:** [Date]

#### Objective
...

#### Phases
- [ ] **Phase 1:** Research
- [ ] **Phase 2:** Development
- [ ] **Phase 3:** Launch

#### Resources
- 
`
  }
];

export default function Editor({
  note,
  folders,
  prefs,
  onUpdatePrefs,
  onUpdateNote,
  onDeleteNote,
  encryptionUnlocked,
  onTriggerEncryptionSetup,
  tagDefinitions,
  onUpdateTagDefinitions
}: EditorProps) {
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('edit');
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Custom interactive editor and helper states
  const [shortcutMessage, setShortcutMessage] = useState<string | null>(null);
  const [showShortcutsGuide, setShowShortcutsGuide] = useState(false);
  const [showColorHighlightMenu, setShowColorHighlightMenu] = useState(false);
  const [showNoteSettings, setShowNoteSettings] = useState(false);
  const [showStylesPanel, setShowStylesPanel] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [iconSearch, setIconSearch] = useState('');

  // Slash Command Templates
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashIndex, setSlashIndex] = useState(0);

  // Cloud Upsell State
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [upsellFile, setUpsellFile] = useState<{ name: string; size: number; base64?: string } | null>(null);
  const [isConnectingProvider, setIsConnectingProvider] = useState<string | null>(null);

  // Multi-tone AI & Translate feature states
  const [showAIPromptModal, setShowAIPromptModal] = useState(false);
  const [showTranslateModal, setShowTranslateModal] = useState(false);
  const [showWorkspacePicker, setShowWorkspacePicker] = useState(false);
  const [selectedText, setSelectedText] = useState('');

  // YouTube Metadata Cache
  const [youtubeMeta, setYoutubeMeta] = useState<Record<string, { title: string; thumb: string }>>({});
  const [loadingVideos, setLoadingVideos] = useState<Set<string>>(new Set());

  // Auto-scan note for YouTube links to populate metadata on load
  useEffect(() => {
    if (!note?.content) return;
    
    const ytRegexGlobal = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/gi;
    const matches = Array.from(note.content.matchAll(ytRegexGlobal));
    
    matches.forEach(match => {
      const url = match[0];
      const videoId = match[1];
      if (videoId && !youtubeMeta[videoId] && !loadingVideos.has(videoId)) {
        fetchYoutubeMetadata(url, true); // skipInsert = true
      }
    });
  }, [note?.id]); // Re-scan when switching notes
  
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRecording && !isPaused) {
      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRecording, isPaused]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start();
      
      // Start Speech Recognition too
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }

          if (finalTranscript && note) {
            const textToInsert = finalTranscript.trim() + ' ';
            insertTextAtCursor(textToInsert);
          }
        };

        recognition.onend = () => {
          if (isRecording && !isPaused) {
            recognition.start(); // Keep it going if we're still recording
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      }

      setIsRecording(true);
      setIsPaused(false);
      setRecordingDuration(0);
      setShowRecordingModal(true);
      showShortcutsPulse("Recording voice and transcribing...");
    } catch (err) {
      console.error("Failed to start recording:", err);
      alert("Could not access microphone.");
    }
  };

  const insertTextAtCursor = (textToInsert: string) => {
    if (!note) return;
    if ((prefs.editorOption || 'editor2') === 'editor1') {
      // Rich Text
      const editorDiv = document.getElementById('editor_contenteditable');
      if (editorDiv) {
        editorDiv.focus();
        document.execCommand('insertText', false, textToInsert);
        handleContentEditableInput();
      }
    } else {
      // Markdown
      const txtArea = document.getElementById('editor_textarea') as HTMLTextAreaElement;
      if (txtArea) {
        const start = txtArea.selectionStart;
        const end = txtArea.selectionEnd;
        const value = txtArea.value;
        const updatedText = value.substring(0, start) + textToInsert + value.substring(end);
        onUpdateNote({ ...note, content: updatedText, updatedAt: Date.now() });
        pushHistory(note.id, updatedText);
        setTimeout(() => {
          txtArea.focus();
          txtArea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
        }, 50);
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (recognitionRef.current) recognitionRef.current.stop();
    } else if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      if (recognitionRef.current) recognitionRef.current.start();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        if (audioBlob.size > 5 * 1024 * 1024) {
          showShortcutsPulse("Audio too large (>5MB). Please record shorter clips.");
          return;
        }

        let mediaUrl = '';
        try {
          showShortcutsPulse("Uploading voice note to Cloudflare R2...");
          mediaUrl = await uploadMediaToR2(audioBlob, "voice-note.webm");
          showShortcutsPulse("Voice note uploaded successfully!");
        } catch (err) {
          console.warn("R2 upload failed, falling back to local base64:", err);
          mediaUrl = await blobToBase64(audioBlob);
          showShortcutsPulse("Saved locally. (Cloud upload failed)");
        }
        
        // Insert audio player visual or markdown
        if ((prefs.editorOption || 'editor2') === 'editor1') {
          const audioHTML = `<div class="p-4 my-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800/50 flex flex-col gap-3 voice-attachment" contenteditable="false">
              <div class="flex items-center gap-3">
                <div class="p-2 rounded-full bg-indigo-500 text-white shadow-sm">
                  <Volume2 size={16} />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">Voice Recording</div>
                  <div class="text-[10px] text-slate-500 dark:text-zinc-500">${new Date().toLocaleString()}</div>
                </div>
                <button onclick="this.closest('.voice-attachment').remove(); document.dispatchEvent(new Event('input', { bubbles: true }));" class="p-1.5 hover:bg-rose-100 hover:text-rose-600 rounded-lg text-slate-400 dark:text-zinc-500 transition-colors cursor-pointer" title="Delete Recording">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
              </div>
              <audio controls class="w-full h-10 filter dark:invert contrast-75" src="${mediaUrl}"></audio>
            </div><p><br></p>`;
          insertHTMLAtCursor(audioHTML);
        } else {
          const audioMD = `\n<audio controls src="${mediaUrl}"></audio>\n`;
          insertTextAtCursor(audioMD);
        }
        
        // Clean up stream
        if (mediaRecorderRef.current?.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
      };
      mediaRecorderRef.current.stop();
    }
    
    if (recognitionRef.current) recognitionRef.current.stop();
    
    setIsRecording(false);
    setShowRecordingModal(false);
  };

  const deleteRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsRecording(false);
    setShowRecordingModal(false);
    showShortcutsPulse("Recording discarded.");
  };

  const insertHTMLAtCursor = (html: string) => {
    if (!note) return;
    if ((prefs.editorOption || 'editor2') === 'editor1') {
      const editorDiv = document.getElementById('editor_contenteditable');
      if (editorDiv) {
        editorDiv.focus();
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          
          const el = document.createElement("div");
          el.innerHTML = html;
          const frag = document.createDocumentFragment();
          let node;
          let lastNode;
          while ((node = el.firstChild)) {
            lastNode = frag.appendChild(node);
          }
          range.insertNode(frag);
          
          // Preserve cursor position after insertion
          if (lastNode) {
            range.setStartAfter(lastNode);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        } else {
          document.execCommand('insertHTML', false, html);
        }
        handleContentEditableInput();
      }
    } else {
      const txtArea = document.getElementById('editor_textarea') as HTMLTextAreaElement;
      if (txtArea) {
        const start = txtArea.selectionStart;
        const end = txtArea.selectionEnd;
        const value = txtArea.value;
        const updatedText = value.substring(0, start) + '\n' + html + '\n' + value.substring(end);
        onUpdateNote({ ...note, content: updatedText, updatedAt: Date.now() });
        pushHistory(note.id, updatedText);
      }
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && note) {
      if (file.size > 20 * 1024 * 1024) {
        setUpsellFile({ name: file.name, size: file.size });
        setShowUpsellModal(true);
        return;
      }

      const insertVideoHTML = (urlSrc: string) => {
        const videoHTML = `<div class="p-3 my-4 bg-slate-50 dark:bg-zinc-800/20 rounded-2xl border border-slate-200 dark:border-zinc-700/50 flex flex-col gap-2 video-attachment group max-w-sm">
            <div class="flex items-center justify-between gap-3 px-1">
              <div class="flex items-center gap-2.5">
                <div class="p-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-500 shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-[10px] font-black text-slate-900 dark:text-zinc-200 uppercase tracking-tighter truncate">${file.name}</div>
                  <div class="text-[9px] text-slate-500 dark:text-zinc-500 font-medium">${(file.size / (1024 * 1024)).toFixed(1)} MB</div>
                </div>
              </div>
              <button onclick="this.closest('.video-attachment').remove(); document.dispatchEvent(new Event('input', { bubbles: true }));" class="p-1 hover:bg-rose-100 hover:text-rose-600 rounded-lg text-slate-400 dark:text-zinc-600 transition-colors cursor-pointer" title="Remove Video">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              </button>
            </div>
            <div class="relative rounded-xl overflow-hidden aspect-video bg-black/5 flex items-center justify-center">
               <video controls class="w-full h-full object-cover shadow-xs" src="${urlSrc}"></video>
            </div>
          </div>`;
        insertHTMLAtCursor(videoHTML);
        showShortcutsPulse(`Video "${file.name}" attached successfully.`);
      };

      showShortcutsPulse("Uploading video to Cloudflare R2...");
      uploadMediaToR2(file, file.name)
        .then((publicUrl) => {
          showShortcutsPulse("Video uploaded successfully!");
          insertVideoHTML(publicUrl);
        })
        .catch(async (err) => {
          console.warn("R2 upload failed, falling back to local base64:", err);
          const reader = new FileReader();
          reader.onload = async (evt) => {
            const base64 = evt.target?.result as string;
            insertVideoHTML(base64);
            showShortcutsPulse("Saved locally. (Cloud upload failed)");
          };
          reader.readAsDataURL(file);
        });
    }
  };

  const fetchYoutubeMetadata = async (url: string, skipInsert = false) => {
    const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (!videoIdMatch) return;
    const videoId = videoIdMatch[1];
    
    if (youtubeMeta[videoId] || loadingVideos.has(videoId)) return;

    setLoadingVideos(prev => new Set(prev).add(videoId));

    // Capture range for Rich Text insertion if not skipping
    let savedRange: Range | null = null;
    if (!skipInsert && (prefs.editorOption || 'editor2') === 'editor1') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        savedRange = selection.getRangeAt(0).cloneRange();
      }
    }

    try {
      // Simulate/Trigger async metadata fetch
      await new Promise(r => setTimeout(r, 600)); // Quicker responsive feel
      
      const meta = {
        title: `YouTube Video: ${videoId}`,
        thumb: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
      };

      setYoutubeMeta(prev => ({ ...prev, [videoId]: meta }));

      if (skipInsert) return;

      const ytHTML = `<div class="p-3 my-4 bg-slate-50 dark:bg-zinc-800/20 rounded-2xl border border-slate-200 dark:border-zinc-700/50 flex flex-col gap-2 yt-attachment max-w-sm group" data-youtube-id="${videoId}" data-youtube-url="${url}" contenteditable="false">
          <div class="relative rounded-xl overflow-hidden aspect-video shadow-xs bg-slate-200 dark:bg-zinc-800 animate-in fade-in zoom-in-95 duration-300">
            <img src="${meta.thumb}" class="w-full h-full object-cover" referrerPolicy="no-referrer" />
            <div class="absolute inset-0 bg-black/10 flex items-center justify-center group-hover:bg-black/20 transition-colors">
              <a href="${url}" target="_blank" class="w-12 h-12 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
              </a>
            </div>
          </div>
          <div class="px-1 space-y-0.5">
            <h4 class="text-[11px] font-bold text-slate-850 dark:text-zinc-100 line-clamp-1 leading-snug tracking-tight">${meta.title}</h4>
            <div class="flex items-center gap-1 text-[9px] text-slate-500 font-medium">
              <span class="uppercase tracking-widest opacity-60">Source:</span>
              <a href="${url}" target="_blank" class="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5">
                ${new URL(url).hostname} <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            </div>
          </div>
        </div><p><br></p>`;
      
      // For Rich Text, replace current selection or target with this HTML
      if ((prefs.editorOption || 'editor2') === 'editor1') {
        const selection = window.getSelection();
        if (selection && savedRange) {
          selection.removeAllRanges();
          selection.addRange(savedRange);
        }
        insertHTMLAtCursor(ytHTML);
      }
      // Note: For Markdown, we satisfy the "thumbnail" requirement in the previewer component instead of the raw text
    } catch (err) {
      console.error("YouTube metadata fetch failed", err);
    } finally {
      setLoadingVideos(prev => {
        const next = new Set(prev);
        next.delete(videoId);
        return next;
      });
    }
  };

  const handleProviderConnect = async (provider: string) => {
    setIsConnectingProvider(provider);
    showShortcutsPulse(`Opening secure authorization for ${provider}...`);
    
    // Simulate OAuth & Secure Fetch
    await new Promise(r => setTimeout(r, 2000));
    
    setIsConnectingProvider(null);
    setShowUpsellModal(false);
    
    if (upsellFile) {
      const link = `https://${provider.toLowerCase().replace(' ', '')}.com/shared/v${Math.random().toString(36).substring(7)}`;
      const thumb = `https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400&q=80`; // generic video placeholder

      const cloudHTML = `<div class="p-3 my-4 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-2xl border border-indigo-200/50 dark:border-indigo-800/30 flex flex-col gap-2 cloud-attachment max-w-sm animate-in slide-in-from-bottom-2 duration-500">
          <div class="flex items-center justify-between gap-3 px-1">
            <div class="flex items-center gap-2.5">
              <div class="p-1.5 rounded-xl bg-indigo-500 text-white shadow-sm ring-4 ring-indigo-500/10">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19c.7 0 1.3-.2 1.8-.7s.7-1.1.7-1.8c0-1.2-.9-2.3-2.1-2.4-.2-1.9-1.8-3.3-3.7-3.3-.8 0-1.5.2-2.1.7C11.5 10.1 10 9 8.3 9c-2.4 0-4.3 1.9-4.3 4.3 0 .4.1.8.2 1.2-.8.5-1.2 1.3-1.2 2.2 0 1.7 1.3 3 3 3h11.5Z"/></svg>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-[10px] font-black text-slate-900 dark:text-zinc-200 uppercase tracking-tighter truncate">${upsellFile.name}</div>
                <div class="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest">Optimized ∙ ${provider} Cloud Storage</div>
              </div>
            </div>
            <button onclick="this.closest('.cloud-attachment').remove(); document.dispatchEvent(new Event('input', { bubbles: true }));" class="p-1 hover:bg-rose-100 hover:text-rose-600 rounded-lg text-slate-400 dark:text-zinc-600 transition-colors cursor-pointer" title="Unlink Cloud Asset">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
          </div>
          <div class="relative rounded-xl overflow-hidden aspect-video shadow-xs bg-slate-100 dark:bg-zinc-800 group">
             <img src="${thumb}" class="w-full h-full object-cover blur-[1px] group-hover:blur-0 transition-all duration-700" />
             <div class="absolute inset-0 bg-indigo-600/10 flex items-center justify-center">
               <a href="${link}" target="_blank" class="px-4 py-2 bg-white text-indigo-600 font-black text-[10px] uppercase tracking-widest rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                 Play Securely <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
               </a>
             </div>
          </div>
        </div>`;
      insertHTMLAtCursor(cloudHTML);
      setUpsellFile(null);
    }
  };

  const toggleSpeechRecognition = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const captureSelectedText = () => {
    let text = window.getSelection()?.toString() || '';
    if (!text && (prefs.editorOption || 'editor2') === 'editor2') {
      const txtArea = document.getElementById('editor_textarea') as HTMLTextAreaElement;
      if (txtArea && txtArea.selectionStart !== txtArea.selectionEnd) {
        text = txtArea.value.substring(txtArea.selectionStart, txtArea.selectionEnd);
      }
    }
    return text;
  };

  const handleOpenAIPrompt = () => {
    saveSelection();
    saveTextareaSelection();
    setSelectedText(captureSelectedText());
    setShowAIPromptModal(true);
  };

  const handleWorkspacePickerSelect = (url: string, title: string, type: 'doc' | 'sheet' | 'drive') => {
    const iconBase = type === 'doc' ? 'text-blue-500' : type === 'sheet' ? 'text-green-500' : 'text-slate-500';
    const tag = type === 'doc' ? 'Google Doc' : type === 'sheet' ? 'Google Sheet' : 'Google Drive';

    const embedHTML = `<div class="p-3 my-4 bg-slate-50 dark:bg-zinc-900/50 rounded-2xl border border-slate-200 dark:border-zinc-800 flex flex-col gap-2 workspace-attachment max-w-2xl animate-in slide-in-from-bottom-2 duration-500" contenteditable="false">
      <div class="flex items-center justify-between gap-3 px-1">
        <div class="flex items-center gap-2.5">
          <div class="p-1.5 rounded-xl bg-white dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 shadow-sm border border-slate-100 dark:border-zinc-800">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${iconBase}"><path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M3 15h6"/><path d="M3 18h6"/></svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-[11px] font-black text-slate-900 dark:text-zinc-200 uppercase tracking-tighter truncate">${title}</div>
            <div class="text-[9px] text-slate-500 dark:text-zinc-500 font-bold uppercase tracking-widest">${tag} ∙ Embedded Asset</div>
          </div>
        </div>
        <button onclick="this.closest('.workspace-attachment').remove(); document.dispatchEvent(new Event('input', { bubbles: true }));" class="p-1 hover:bg-rose-100 hover:text-rose-600 rounded-lg text-slate-400 dark:text-zinc-600 transition-colors cursor-pointer" title="Unlink Workspace Asset">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </button>
      </div>
      <div class="relative rounded-xl overflow-hidden shadow-inner bg-slate-100 dark:bg-zinc-800" style="height: 400px; resize: vertical;">
         <iframe src="${url.replace(/\/edit|#gid/g, '/preview')}" class="w-full h-full border-none pointer-events-auto" allowfullscreen="true" sandbox="allow-scripts allow-same-origin allow-popups opacity-100 placeholder-slate-200"></iframe>
      </div>
    </div>`;
    
    insertHTMLAtCursor(embedHTML);
    setShowWorkspacePicker(false);
  };

  const handleOpenTranslate = () => {
    saveSelection();
    saveTextareaSelection();
    setSelectedText(captureSelectedText());
    setShowTranslateModal(true);
  };

  const handleManualSave = async () => {
    if (!note) return;
    setSaveStatus('saving');
    try {
      // Optimistic behavior: instant visual update
      await onUpdateNote({
        ...note,
        updatedAt: Date.now()
      });
      setSaveStatus('saved');
      if (!note.tags || note.tags.length === 0) {
        showShortcutsPulse('Note saved without a tag. Add a tag to improve organization.');
      }
      setShowStylesPanel(false); // Close control drawer after saving process (Req 3)
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (err) {
      console.error('Save failed:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // States & Refs for Link and Image custom insertion dialog overrides
  const [insertDialog, setInsertDialog] = useState<{
    type: 'link' | 'image' | null;
    targetUrl: string;
    altText: string;
    onSuccess: (url: string, alt: string) => void;
  }>({
    type: null,
    targetUrl: '',
    altText: '',
    onSuccess: () => {}
  });

  const savedRangeRef = useRef<Range | null>(null);
  const savedTxtRangeRef = useRef<{ start: number; end: number } | null>(null);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    } else {
      savedRangeRef.current = null;
    }
  };

  const restoreSelection = () => {
    if (!savedRangeRef.current) return;
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  };

  const saveTextareaSelection = () => {
    const txtArea = document.getElementById('editor_textarea') as HTMLTextAreaElement;
    if (txtArea) {
      savedTxtRangeRef.current = {
        start: txtArea.selectionStart,
        end: txtArea.selectionEnd
      };
    }
  };

  // Reference to ContentEditable div for Option 1
  const editorRef = useRef<HTMLDivElement>(null);
  
  // Obtain dynamic visual style classes applied to bento panels
  const stylePrefs = getStyle(prefs.designStyle);

  // References / Local history states for rich text levels of Undo & Redo (Max 50 levels)
  const historyRef = useRef<{ [noteId: string]: { list: string[]; index: number } }>({});
  const historyDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize history stack on first note load
  useEffect(() => {
    if (note && note.id) {
      if (!historyRef.current[note.id]) {
        historyRef.current[note.id] = {
          list: [note.content],
          index: 0
        };
      }
    }
  }, [note?.id]);

  const filteredTemplates = useMemo(() => {
    return SLASH_TEMPLATES.filter(t => t.title.toLowerCase().includes(slashQuery.toLowerCase()) || Boolean(t.id.includes(slashQuery.toLowerCase())));
  }, [slashQuery]);

  const handleInsertText = (text: string) => {
    if (!note) return;
    
    if ((prefs.editorOption || 'editor2') === 'editor1') {
      if (editorRef.current) {
         editorRef.current.focus();
         restoreSelection();
      }
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        document.execCommand('insertText', false, text);
      } else if (editorRef.current) {
        editorRef.current.innerHTML += text;
        onUpdateNote({
          ...note,
          content: editorRef.current.innerHTML,
          updatedAt: Date.now()
        });
      }
    } else {
        const txtArea = document.getElementById('editor_textarea') as HTMLTextAreaElement;
        
        let cursorStart = note.content.length;
        let cursorEnd = note.content.length;
        
        if (savedTxtRangeRef.current) {
            cursorStart = savedTxtRangeRef.current.start;
            cursorEnd = savedTxtRangeRef.current.end;
        } else if (txtArea) {
            cursorStart = txtArea.selectionStart;
            cursorEnd = txtArea.selectionEnd;
        }

        const before = note.content.substring(0, cursorStart);
        const after = note.content.substring(cursorEnd);
        
        const updated = before + text + after;
        onUpdateNote({
            ...note,
            content: updated,
            updatedAt: Date.now()
        });
        setTimeout(() => {
            if (txtArea) {
                txtArea.focus();
                txtArea.selectionStart = txtArea.selectionEnd = before.length + text.length;
            }
        }, 50);
    }
  };

  const injectTemplate = (templateContent: string) => {
    if (!note) return;
    
    if ((prefs.editorOption || 'editor2') === 'editor1') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const textNode = range.startContainer;
        if (textNode.nodeType === Node.TEXT_NODE) {
            const text = textNode.textContent || '';
            const slashPos = text.lastIndexOf('/', range.startOffset - 1);
            if (slashPos !== -1) {
                range.setStart(textNode, slashPos);
                range.deleteContents();
            }
        } else if (editorRef.current && editorRef.current.innerText.trim() === '/') {
            editorRef.current.innerHTML = '';
        }
        
        document.execCommand('insertText', false, templateContent);
      }
    } else {
        const txtArea = document.getElementById('editor_textarea') as HTMLTextAreaElement;
        const cursorPosition = txtArea ? txtArea.selectionStart : note.content.length;
        
        const textBeforeCursor = note.content.substring(0, cursorPosition);
        const textAfterCursor = note.content.substring(cursorPosition);
        
        const lineStartIndex = textBeforeCursor.lastIndexOf('\n') + 1;
        const currentLine = textBeforeCursor.substring(lineStartIndex);
        
        const slashIndex = currentLine.indexOf('/');
        if (slashIndex !== -1) {
            const beforeSlash = textBeforeCursor.substring(0, lineStartIndex + slashIndex);
            const updated = beforeSlash + templateContent + textAfterCursor;
            onUpdateNote({
                ...note,
                content: updated,
                updatedAt: Date.now()
            });
            setTimeout(() => {
                if (txtArea) {
                    txtArea.focus();
                    txtArea.selectionStart = txtArea.selectionEnd = beforeSlash.length + templateContent.length;
                }
            }, 50);
        }
    }
    
    setShowSlashMenu(false);
  };

  const handleSlashMenuKeyDown = (e: KeyboardEvent) => {
    if (!showSlashMenu) return;
    
    // Prevent default editor keydown
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      setSlashIndex(prev => Math.min(prev + 1, filteredTemplates.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      setSlashIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (filteredTemplates[slashIndex]) {
        injectTemplate(filteredTemplates[slashIndex].content);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setShowSlashMenu(false);
    }
  };

  useEffect(() => {
    if (showSlashMenu) {
      document.addEventListener('keydown', handleSlashMenuKeyDown, true);
      return () => document.removeEventListener('keydown', handleSlashMenuKeyDown, true);
    }
  }, [showSlashMenu, slashIndex, filteredTemplates]);

  const pushHistory = (noteId: string, content: string) => {
    const h = historyRef.current[noteId];
    if (!h) {
      historyRef.current[noteId] = { list: [content], index: 0 };
      return;
    }
    // If the content is identical to the current index, don't push
    if (h.index >= 0 && h.list[h.index] === content) return;

    // Truncate any future history (if we were in middle of undo/redo)
    const newList = h.list.slice(0, h.index + 1);
    newList.push(content);

    // Limit to up to 50 levels of undo / redo (51 stamps total including orig)
    if (newList.length > 51) {
      newList.shift();
    }

    historyRef.current[noteId] = {
      list: newList,
      index: newList.length - 1
    };
  };

  const undo = () => {
    if (!note) return;
    const h = historyRef.current[note.id];
    if (!h || h.index <= 0) {
      showShortcutsPulse('No more undos available');
      return;
    }

    const nextIndex = h.index - 1;
    const nextContent = h.list[nextIndex];
    h.index = nextIndex;

    onUpdateNote({
      ...note,
      content: nextContent,
      updatedAt: Date.now()
    });

    // Also update any living editor refs
    if ((prefs.editorOption || 'editor2') === 'editor1' && editorRef.current) {
      editorRef.current.innerHTML = nextContent;
    }
    showShortcutsPulse(`Undone (${h.index + 1}/${h.list.length})`);
  };

  const redo = () => {
    if (!note) return;
    const h = historyRef.current[note.id];
    if (!h || h.index >= h.list.length - 1) {
      showShortcutsPulse('No more redos available');
      return;
    }

    const nextIndex = h.index + 1;
    const nextContent = h.list[nextIndex];
    h.index = nextIndex;

    onUpdateNote({
      ...note,
      content: nextContent,
      updatedAt: Date.now()
    });

    // Also update any living editor refs
    if ((prefs.editorOption || 'editor2') === 'editor1' && editorRef.current) {
      editorRef.current.innerHTML = nextContent;
    }
    showShortcutsPulse(`Redone (${h.index + 1}/${h.list.length})`);
  };

  // Auto-saved helper on title updates
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!note) return;
    onUpdateNote({
      ...note,
      title: e.target.value,
      updatedAt: Date.now()
    });
  };

  const updateTagColor = (tagName: string, color: string) => {
    const updatedDefs = tagDefinitions.map(def => {
      if (def.name.toLowerCase() === tagName.toLowerCase()) {
        return { ...def, color };
      }
      return def;
    });
    onUpdateTagDefinitions(updatedDefs);
  };

  const createNewTag = (tagName: string, color: string = '#374151') => {
    if (!note) return;
    const trimmed = tagName.trim();
    if (!trimmed) return;
    const exists = tagDefinitions.some(d => d.name.toLowerCase() === trimmed.toLowerCase());
    if (!exists) {
      const newTagDef: TagDefinition = {
        name: trimmed,
        color: color
      };
      onUpdateTagDefinitions([...tagDefinitions, newTagDef]);
    }
    
    const currentTags = note.tags || [];
    if (!currentTags.includes(trimmed)) {
      const newTags = [...currentTags, trimmed];
      const primaryTag = note.primaryTag || trimmed;
      onUpdateNote({ ...note, tags: newTags, primaryTag, updatedAt: Date.now() });
    }
  };

  const deleteTagFromCatalog = (tagName: string) => {
    const updatedDefs = tagDefinitions.filter(d => d.name.toLowerCase() !== tagName.toLowerCase());
    onUpdateTagDefinitions(updatedDefs);
    
    // Also remove from current note if present
    if (note && note.tags && note.tags.includes(tagName)) {
      const newTags = note.tags.filter(t => t !== tagName);
      let primaryTag = note.primaryTag;
      if (primaryTag === tagName) {
        primaryTag = newTags.length > 0 ? newTags[0] : undefined;
      }
      onUpdateNote({ ...note, tags: newTags, primaryTag, updatedAt: Date.now() });
    }
  };

  const toggleTagOnNote = (tagName: string) => {
    if (!note) return;
    const currentTags = note.tags || [];
    let newTags: string[];
    let primaryTag = note.primaryTag;

    if (currentTags.includes(tagName)) {
      newTags = currentTags.filter(t => t !== tagName);
      if (primaryTag === tagName) {
        primaryTag = newTags.length > 0 ? newTags[0] : undefined;
      }
    } else {
      newTags = [...currentTags, tagName];
      if (!primaryTag) {
        primaryTag = tagName;
      }
    }

    onUpdateNote({ ...note, tags: newTags, primaryTag, updatedAt: Date.now() });
  };

  const setPrimaryTagOnNote = (tagName: string) => {
    if (!note) return;
    onUpdateNote({ ...note, primaryTag: tagName, updatedAt: Date.now() });
  };

  // Option 2 standard Markdown content change
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!note) return;
    const val = e.target.value;
    
    // Slash command detection
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = val.substring(0, cursorPosition);
    const lineStartIndex = textBeforeCursor.lastIndexOf('\n') + 1;
    const currentLine = textBeforeCursor.substring(lineStartIndex);
    
    if (currentLine.startsWith('/')) {
      const query = currentLine.substring(1);
      setShowSlashMenu(true);
      setSlashQuery(query);
      setSlashIndex(0);
    } else {
      setShowSlashMenu(false);
    }

    onUpdateNote({
      ...note,
      content: val,
      updatedAt: Date.now()
    });

    if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    historyDebounceRef.current = setTimeout(() => {
      pushHistory(note.id, val);
    }, 1000);
  };

  // Option 1 contentEditable synchronization input handler
  const handleContentEditableInput = () => {
    if (!note || !editorRef.current) return;
    const htmlVal = editorRef.current.innerHTML;
    
    // Slash command detection for contentEditable
    const selection = window.getSelection();
    let slashDetected = false;
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const textNode = range.startContainer;
      if (textNode.nodeType === Node.TEXT_NODE) {
        const textBeforeCursor = textNode.textContent?.substring(0, range.startOffset) || '';
        if (textBeforeCursor.startsWith('/')) {
          const query = textBeforeCursor.substring(1);
          setShowSlashMenu(true);
          setSlashQuery(query);
          setSlashIndex(0);
          slashDetected = true;
        }
      } else if (editorRef.current.innerText.trim() === '/') {
        setShowSlashMenu(true);
        setSlashQuery('');
        setSlashIndex(0);
        slashDetected = true;
      }
    }
    
    if (!slashDetected) {
      setShowSlashMenu(false);
    }
    
    onUpdateNote({
      ...note,
      content: htmlVal,
      updatedAt: Date.now()
    });

    if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    historyDebounceRef.current = setTimeout(() => {
      pushHistory(note.id, htmlVal);
    }, 1000);
  };

  const handleRichTextPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const html = e.clipboardData.getData('text/html');
    const plainText = e.clipboardData.getData('text/plain');
    
    // YouTube detection
    const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
    if (plainText && ytRegex.test(plainText)) {
      e.preventDefault();
      fetchYoutubeMetadata(plainText.trim());
      return;
    }

    if (html) {
      e.preventDefault();
      // Insert HTML at cursor
      document.execCommand('insertHTML', false, html);
    } else if (plainText) {
      e.preventDefault();
      document.execCommand('insertText', false, plainText);
    }
  };

  const handleMarkdownPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const html = e.clipboardData.getData('text/html');
    const plainText = e.clipboardData.getData('text/plain');

    const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
    if (plainText && ytRegex.test(plainText)) {
      e.preventDefault();
      // For Markdown, insert as a clean markdown link so the previewer processes it correctly
      const videoId = plainText.match(ytRegex)?.[1];
      const linkText = videoId ? `[YouTube Video: ${videoId}](${plainText.trim()})` : plainText.trim();
      
      const txtArea = e.currentTarget;
      const start = txtArea.selectionStart;
      const end = txtArea.selectionEnd;
      const value = txtArea.value;
      
      const updatedText = value.substring(0, start) + linkText + value.substring(end);
      onUpdateNote({
        ...note,
        content: updatedText,
        updatedAt: Date.now()
      });
      fetchYoutubeMetadata(plainText.trim());
      
      setTimeout(() => {
        txtArea.focus();
        txtArea.setSelectionRange(start + linkText.length, start + linkText.length);
      }, 20);
      return;
    }

    if (html) {
      e.preventDefault();
      const markdown = convertHTMLToMarkdown(html);
      
      const txtArea = e.currentTarget;
      const start = txtArea.selectionStart;
      const end = txtArea.selectionEnd;
      const value = txtArea.value;
      
      const updatedText = value.substring(0, start) + markdown + value.substring(end);
      onUpdateNote({
        ...note,
        content: updatedText,
        updatedAt: Date.now()
      });
      pushHistory(note.id, updatedText);
      
      setTimeout(() => {
        txtArea.focus();
        txtArea.setSelectionRange(start + markdown.length, start + markdown.length);
      }, 20);
      showShortcutsPulse('HTML pasted & auto-converted to raw Markdown format!');
    }
  };

  // Synchronize ContentEditable DOM value selectively if the active NoteId translates
  useEffect(() => {
    if (editorRef.current && (prefs.editorOption || 'editor2') === 'editor1' && note) {
      if (editorRef.current.innerHTML !== note.content) {
        editorRef.current.innerHTML = note.content;
      }
    }
  }, [note?.id, prefs.editorOption]);

  // Document formatting pane metrics calculations helper
  const stats = useMemo(() => {
    if (!note) return { words: 0, chars: 0, minutes: 0 };
    // Quick regex strip for clean plaintext visual check
    const text = note.content.replace(/<[^>]*>/g, ' '); 
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const minutes = Math.max(1, Math.ceil(words / 200));
    return { words, chars, minutes };
  }, [note?.content]);

  // Compute layout overrides for customizable fonts and scales
  const fontClass = useMemo(() => {
    const family = note?.fontFamily || prefs.typography.family;
    switch (family) {
      case 'serif': return 'font-serif';
      case 'mono': return 'font-mono text-xs';
      default: return 'font-sans';
    }
  }, [note?.fontFamily, prefs.typography.family]);

  const sizeClass = useMemo(() => {
    const size = note?.fontSize || prefs.typography.fontSize;
    switch (size) {
      case 'sm': return 'text-xs md:text-sm';
      case 'lg': return 'text-base md:text-lg';
      case 'xl': return 'text-lg md:text-xl';
      default: return 'text-sm md:text-base';
    }
  }, [note?.fontSize, prefs.typography.fontSize]);

  const lhClass = useMemo(() => {
    switch (prefs.typography.lineHeight) {
      case 'snug': return 'leading-snug';
      case 'relaxed': return 'leading-relaxed';
      default: return 'leading-normal';
    }
  }, [prefs.typography.lineHeight]);

  // Return specific title header titles depending on Pane Naming option preferences (Req 5)
  const getPaneLabels = (option?: string) => {
    switch (option) {
      case 'source-preview':
        return { raw: 'Source View', formatted: 'Preview View' };
      case 'edit-render':
        return { raw: 'Edit Mode', formatted: 'Render Mode' };
      case 'code-display':
        return { raw: 'Code/Text', formatted: 'Display/Preview' };
      case 'raw-formatted':
      default:
        return { raw: 'Raw Input', formatted: 'Formatted Output' };
    }
  };

  // Dynamic formatting applicator for BOTH Option 1 (Rich WYSIWYG) and Option 2 (Markdown)
  const applyFormatting = (
    style: 'bold' | 'italic' | 'strikethrough' | 'highlight' | 'heading' | 'h2' | 'h3' | 'checklist' | 'link' | 'code' | 'table' | 'bullet' | 'color' | 'image' | 'underline' | 'ordered' | 'indent' | 'outdent' | 'align-left' | 'align-center' | 'align-right' | 'align-justify' | 'inline-code', 
    colorValue?: string
  ) => {
    if (!note) return;

    // Custom non-blocking interactive Link and Image modal intercept
    if (style === 'link' || style === 'image') {
      if ((prefs.editorOption || 'editor2') === 'editor1') {
        saveSelection();
      } else {
        saveTextareaSelection();
      }

      setInsertDialog({
        type: style,
        targetUrl: style === 'link' ? 'https://' : 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600',
        altText: '',
        onSuccess: (url, alt) => {
          if ((prefs.editorOption || 'editor2') === 'editor1') {
            restoreSelection();
            const html = style === 'link' 
              ? `<a href="${url}" class="text-indigo-650 hover:underline font-bold" target="_blank">${alt || url}</a>`
              : `<img src="${url}" alt="${alt || 'Visual Card'}" class="my-4 max-w-full rounded-2xl shadow-md border border-slate-205/50" />`;
            
            const editorDiv = document.getElementById('editor_contenteditable');
            if (editorDiv) {
              editorDiv.focus();
              document.execCommand('insertHTML', false, html);
              onUpdateNote({
                ...note,
                content: editorDiv.innerHTML,
                updatedAt: Date.now()
              });
              pushHistory(note.id, editorDiv.innerHTML);
            }
          } else {
            // Markdown Option
            const txtArea = document.getElementById('editor_textarea') as HTMLTextAreaElement;
            const start = savedTxtRangeRef.current?.start ?? 0;
            const end = savedTxtRangeRef.current?.end ?? 0;
            const val = txtArea ? txtArea.value : note.content;
            const selectedText = val.substring(start, end);
            const title = alt || selectedText || (style === 'link' ? 'link title' : 'visual asset');
            const replacement = style === 'link' ? `[${title}](${url})` : `![${title}](${url})`;
            const nextContent = val.substring(0, start) + replacement + val.substring(end);
            
            onUpdateNote({
              ...note,
              content: nextContent,
              updatedAt: Date.now()
            });
            pushHistory(note.id, nextContent);
          }
        }
      });
      return;
    }

    // --- ENGINE 1: Option 1 Visual WYSIWYG Formatting ---
    if ((prefs.editorOption || 'editor2') === 'editor1') {
      const editorDiv = document.getElementById('editor_contenteditable');
      if (!editorDiv) return;
      editorDiv.focus();

      switch (style) {
        case 'bold':
          document.execCommand('bold', false);
          break;
        case 'italic':
          document.execCommand('italic', false);
          break;
        case 'underline':
          document.execCommand('underline', false);
          break;
        case 'strikethrough':
          document.execCommand('strikeThrough', false);
          break;
        case 'highlight':
          const markHTML = `<mark class="bg-amber-150 text-slate-900 px-1 py-0.5 rounded">${window.getSelection()?.toString() || 'highlighted text'}</mark>`;
          document.execCommand('insertHTML', false, markHTML);
          break;
        case 'color':
          const hex = colorValue || '#e11d48';
          const coloredHTML = `<span style="color: ${hex}">${window.getSelection()?.toString() || 'colored text'}</span>`;
          document.execCommand('insertHTML', false, coloredHTML);
          break;
        case 'heading':
          document.execCommand('formatBlock', false, '<h1>');
          break;
        case 'h2':
          document.execCommand('formatBlock', false, '<h2>');
          break;
        case 'h3':
          document.execCommand('formatBlock', false, '<h3>');
          break;
        case 'checklist':
          const checkHTML = `<div class="flex items-start gap-2.5 my-1.5"><input type="checkbox" class="mt-1 h-3.5 w-3.5 text-indigo-600 rounded" /> <span class="text-sm">${window.getSelection()?.toString() || 'Checkbox Task'}</span></div>`;
          document.execCommand('insertHTML', false, checkHTML);
          break;
        case 'bullet':
          document.execCommand('insertUnorderedList', false);
          break;
        case 'ordered':
          document.execCommand('insertOrderedList', false);
          break;
        case 'indent':
          document.execCommand('indent', false);
          break;
        case 'outdent':
          document.execCommand('outdent', false);
          break;
        case 'align-left':
          document.execCommand('justifyLeft', false);
          break;
        case 'align-center':
          document.execCommand('justifyCenter', false);
          break;
        case 'align-right':
          document.execCommand('justifyRight', false);
          break;
        case 'align-justify':
          document.execCommand('justifyFull', false);
          break;
        case 'inline-code':
          const range = window.getSelection()?.getRangeAt(0);
          const selText = range ? range.toString() : '';
          const inlineHTML = `<code class="bg-slate-100 dark:bg-zinc-850 px-1.5 py-0.5 rounded font-mono text-xs text-indigo-605 dark:text-indigo-400 font-semibold">${selText || 'code snippet'}</code>`;
          document.execCommand('insertHTML', false, inlineHTML);
          break;
        case 'code':
          const codeLang = prompt('Configure coding language (e.g. javascript, html, python, json):', 'javascript') || 'javascript';
          const preRange = window.getSelection()?.getRangeAt(0);
          const blockText = preRange ? preRange.toString() : '';
          const codeHTML = `<pre class="my-4 shrink-0" data-language="${codeLang}"><code>${blockText || '// Enter custom code snippet here'}</code></pre>`;
          document.execCommand('insertHTML', false, codeHTML);
          break;
        case 'table':
          const tableHTML = `<table class="border-collapse border border-slate-200 dark:border-zinc-800 my-4 w-full text-xs"><thead><tr class="bg-slate-50 dark:bg-zinc-900"><th class="border border-slate-200 dark:border-zinc-800 p-2 text-left font-bold">Standard Metric 1</th><th class="border border-slate-200 dark:border-zinc-800 p-2 text-left font-bold">Standard Metric 2</th></tr></thead><tbody><tr><td class="border border-slate-200 dark:border-zinc-800 p-2">Row 1 value A</td><td class="border border-slate-200 dark:border-zinc-800 p-2">Row 1 value B</td></tr><tr><td class="border border-slate-200 dark:border-zinc-800 p-2">Row 2 value A</td><td class="border border-slate-200 dark:border-zinc-800 p-2">Row 2 value B</td></tr></tbody></table>`;
          document.execCommand('insertHTML', false, tableHTML);
          break;
        default:
          break;
      }

      onUpdateNote({
        ...note,
        content: editorDiv.innerHTML,
        updatedAt: Date.now()
      });
      pushHistory(note.id, editorDiv.innerHTML);
      return;
    }

    // --- ENGINE 2: Option 2 standard Markdown Selection Replacement ---
    const txtArea = document.getElementById('editor_textarea') as HTMLTextAreaElement;
    if (!txtArea) return;

    const start = txtArea.selectionStart;
    const end = txtArea.selectionEnd;
    const value = txtArea.value;
    const selectedText = value.substring(start, end);

    let replacement = '';
    let cursorOffset = 0;

    switch (style) {
      case 'bold':
        replacement = `**${selectedText || 'bold text'}**`;
        cursorOffset = selectedText ? replacement.length : 2;
        break;
      case 'italic':
        replacement = `*${selectedText || 'italic text'}*`;
        cursorOffset = selectedText ? replacement.length : 1;
        break;
      case 'underline':
        replacement = `<u>${selectedText || 'underlined text'}</u>`;
        cursorOffset = selectedText ? replacement.length : 3;
        break;
      case 'strikethrough':
        replacement = `~~${selectedText || 'strikethrough text'}~~`;
        cursorOffset = selectedText ? replacement.length : 2;
        break;
      case 'highlight':
        replacement = `<mark>${selectedText || 'highlighted text'}</mark>`;
        cursorOffset = selectedText ? replacement.length : 6;
        break;
      case 'color':
        const hex = colorValue || '#e11d48';
        replacement = `<span style="color: ${hex}">${selectedText || 'colored text'}</span>`;
        cursorOffset = selectedText ? replacement.length : `<span style="color: ${hex}">`.length;
        break;
      case 'heading':
        replacement = `\n# ${selectedText || 'Heading 1'}\n`;
        cursorOffset = selectedText ? replacement.length : 3;
        break;
      case 'h2':
        replacement = `\n## ${selectedText || 'Heading 2'}\n`;
        cursorOffset = selectedText ? replacement.length : 4;
        break;
      case 'h3':
        replacement = `\n### ${selectedText || 'Heading 3'}\n`;
        cursorOffset = selectedText ? replacement.length : 5;
        break;
      case 'checklist':
        replacement = `\n- [ ] ${selectedText || 'Task item'}\n`;
        cursorOffset = selectedText ? replacement.length : 7;
        break;
      case 'bullet':
        replacement = `\n- ${selectedText || 'List item'}\n`;
        cursorOffset = selectedText ? replacement.length : 3;
        break;
      case 'ordered':
        replacement = `\n1. ${selectedText || 'Numbered item'}\n`;
        cursorOffset = selectedText ? replacement.length : 3;
        break;
      case 'indent':
        replacement = selectedText.split('\n').map(line => '    ' + line).join('\n');
        cursorOffset = replacement.length;
        break;
      case 'outdent':
        replacement = selectedText.split('\n').map(line => line.startsWith('    ') ? line.substring(4) : line.startsWith('\t') ? line.substring(1) : line).join('\n');
        cursorOffset = replacement.length;
        break;
      case 'align-left':
        replacement = `<div style="text-align: left">${selectedText || 'left aligned'}</div>`;
        cursorOffset = selectedText ? replacement.length : `<div style="text-align: left">`.length;
        break;
      case 'align-center':
        replacement = `<div style="text-align: center">${selectedText || 'center aligned'}</div>`;
        cursorOffset = selectedText ? replacement.length : `<div style="text-align: center">`.length;
        break;
      case 'align-right':
        replacement = `<div style="text-align: right">${selectedText || 'right aligned'}</div>`;
        cursorOffset = selectedText ? replacement.length : `<div style="text-align: right">`.length;
        break;
      case 'align-justify':
        replacement = `<div style="text-align: justify">${selectedText || 'justified text'}</div>`;
        cursorOffset = selectedText ? replacement.length : `<div style="text-align: justify">`.length;
        break;
      case 'inline-code':
        replacement = `\`${selectedText || 'code'}\``;
        cursorOffset = selectedText ? replacement.length : 1;
        break;
      case 'code':
        replacement = `\`\`\`javascript\n${selectedText || '// write snippet here'}\n\`\`\``;
        cursorOffset = selectedText ? replacement.length : 15;
        break;
      case 'table':
        replacement = `\n| Column 1 | Column 2 | Column 3 |\n| :--- | :--- | :--- |\n| Row A | Cell B | Cell C |\n| Row D | Cell E | Cell F |\n`;
        cursorOffset = replacement.length;
        break;
      default:
        break;
    }

    const updatedText = value.substring(0, start) + replacement + value.substring(end);
    onUpdateNote({
      ...note,
      content: updatedText,
      updatedAt: Date.now()
    });
    pushHistory(note.id, updatedText);

    setTimeout(() => {
      txtArea.focus();
      txtArea.setSelectionRange(start + cursorOffset, start + cursorOffset);
    }, 20);
  };

  const showShortcutsPulse = (msg: string) => {
    setShortcutMessage(msg);
    setTimeout(() => {
      setShortcutMessage(null);
    }, 1800);
  };

  // Capture standard keyboard hotkey overrides for Markdown composing
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMac = navigator.userAgent.indexOf('Mac') !== -1;
    const hasCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

    if (hasCmdOrCtrl) {
      if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key.toLowerCase() === 'b') {
        e.preventDefault();
        applyFormatting('bold');
        showShortcutsPulse('Bold Formatted (⌘+B)');
      } else if (e.key.toLowerCase() === 'i') {
        e.preventDefault();
        applyFormatting('italic');
        showShortcutsPulse('Italic Formatted (⌘+I)');
      } else if (e.key.toLowerCase() === 'h') {
        e.preventDefault();
        applyFormatting('heading');
        showShortcutsPulse('H1 Heading Added (⌘+H)');
      } else if (e.key === '/') {
        e.preventDefault();
        applyFormatting('checklist');
        showShortcutsPulse('Checklist Added (⌘+/)');
      } else if (e.key.toLowerCase() === 't' && e.shiftKey) {
        e.preventDefault();
        applyFormatting('table');
        showShortcutsPulse('Table Inserted (⌘+Shift+T)');
      } else if (e.key.toLowerCase() === 'k') {
        e.preventDefault();
        applyFormatting('link');
        showShortcutsPulse('Link Added (⌘+K)');
      }
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const value = e.currentTarget.value;
      const updated = value.substring(0, start) + '  ' + value.substring(end);
      onUpdateNote({
        ...note,
        content: updated,
        updatedAt: Date.now()
      });
      setTimeout(() => {
        const txtArea = document.getElementById('editor_textarea') as HTMLTextAreaElement;
        if (txtArea) {
          txtArea.focus();
          txtArea.selectionStart = txtArea.selectionEnd = start + 2;
        }
      }, 10);
    }
  };

  // Keyboard shortcut listener for Option 1 Visual contentEditable div
  const handleContentEditableKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const isMac = navigator.userAgent.indexOf('Mac') !== -1;
    const hasCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

    if (hasCmdOrCtrl) {
      if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key.toLowerCase() === 'b') {
        showShortcutsPulse('Bold Stylized (⌘+B)');
      } else if (e.key.toLowerCase() === 'i') {
        showShortcutsPulse('Italic Stylized (⌘+I)');
      } else if (e.key.toLowerCase() === 'u') {
        showShortcutsPulse('Underline Stylized (⌘+U)');
      } else if (e.key === '/') {
        e.preventDefault();
        applyFormatting('checklist');
        showShortcutsPulse('Interactive checkbox added (⌘+/)');
      } else if (e.key.toLowerCase() === 't' && e.shiftKey) {
        e.preventDefault();
        applyFormatting('table');
        showShortcutsPulse('Table matrix grid inserted (⌘+Shift+T)');
      } else if (e.key.toLowerCase() === 'k') {
        e.preventDefault();
        applyFormatting('link');
        showShortcutsPulse('Secure Anchor link configured (⌘+K)');
      }
    }
  };

  // Interactive checklist toggle inside formatted markdown preview option (Option 2)
  const handleCheckboxToggleInPreview = (index: number) => {
    let count = 0;
    const newContent = note.content.replace(/(- \[[ xX]\])/g, (match) => {
      if (count === index) {
        count++;
        return match.includes(' ') ? '- [x]' : '- [ ]';
      }
      count++;
      return match;
    });
    onUpdateNote({
      ...note,
      content: newContent,
      updatedAt: Date.now()
    });
    showShortcutsPulse('Interactive checkbox matched & toggled!');
  };

  // Click detector inside preview stage
  const handlePreviewContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    // Checkboxes ticking logic (for checklists)
    if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'checkbox') {
      if ((prefs.editorOption || 'editor2') === 'editor1') {
        const container = e.currentTarget;
        const checkboxes = Array.from(container.querySelectorAll('input[type="checkbox"]'));
        const index = checkboxes.indexOf(target as HTMLInputElement);
        if (index !== -1) {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = note.content;
          const domCheckboxes = tempDiv.querySelectorAll('input[type="checkbox"]');
          if (domCheckboxes[index]) {
            const cb = domCheckboxes[index] as HTMLInputElement;
            if (cb.hasAttribute('checked')) {
              cb.removeAttribute('checked');
            } else {
              cb.setAttribute('checked', 'checked');
            }
            const updatedHTML = tempDiv.innerHTML;
            onUpdateNote({
              ...note,
              content: updatedHTML,
              updatedAt: Date.now()
            });
            if (editorRef.current) {
              editorRef.current.innerHTML = updatedHTML;
            }
            showShortcutsPulse('Interactive visual checklist toggled!');
          }
        }
      } else {
        const container = e.currentTarget;
        const checkboxes = Array.from(container.querySelectorAll('input[type="checkbox"]'));
        const index = checkboxes.indexOf(target as HTMLInputElement);
        if (index !== -1) {
          handleCheckboxToggleInPreview(index);
        }
      }
    }

    // Secure link opening helper
    const anchor = target.closest('a');
    if (anchor && anchor.getAttribute('href')) {
      e.preventDefault();
      const href = anchor.getAttribute('href');
      if (href) {
        window.open(href, '_blank', 'noopener,noreferrer');
        showShortcutsPulse('Opening secure link in new tab...');
      }
    }
  };

  // Copy drafts seamlessly to native OS clipboard
  const handleCopyClipboard = async () => {
    try {
      // Strips outer HTML brackets nicely if copy is initiated from Option 1 HTML editor
      const rawText = note.content.replace(/<[^>]*>/g, '');
      await navigator.clipboard.writeText(rawText || note.content);
      setCopySuccess(true);
      showShortcutsPulse('Draft text copy copied securely.');
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Clipboard copy error:', err);
    }
  };

  // Blank display guard card
  if (!note) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-transparent p-0 text-slate-400 dark:text-zinc-500">
        <div className={`${stylePrefs.cardClass} flex-1 w-full h-full flex flex-col items-center justify-center p-10 text-center space-y-4 shadow-sm border border-slate-200 dark:border-zinc-800 rounded-3xl`}>
          <div className="mx-auto flex items-center justify-center h-16 w-16 bg-slate-100 dark:bg-zinc-805 rounded-2xl shadow-xs text-indigo-600 dark:text-indigo-450 mb-2">
            <Edit3 size={28} />
          </div>
          <h2 className={`text-lg font-bold text-slate-800 dark:text-zinc-200 tracking-tight ${stylePrefs.titleFontClass}`}>
            No Note Selected
          </h2>
          <p className="text-xs leading-relaxed text-slate-500 dark:text-zinc-455 font-medium max-w-sm mx-auto">
            Select a secure document from the side index or initiate a blank encrypted notebook page. Choose between real-time inline Rich Text Visual editing or Markdown dual formatting platform.
          </p>
        </div>
      </div>
    );
  }

  const activeColor = getActiveNoteColor(note, tagDefinitions);
  const resolvedColorValue = activeColor.startsWith('#') ? activeColor : {
    indigo: '#6366f1',
    emerald: '#10b981',
    amber: '#f59e0b',
    rose: '#f43f5e',
    violet: '#8b5cf6',
    cyan: '#06b6d4',
    slate: '#64748b'
  }[activeColor] || '#64748b';

  return (
    <div className={`flex-1 ${stylePrefs.cardClass} flex flex-col h-full min-w-0 overflow-hidden relative shadow-xs`} id="editor_root">
      {/* Real-time Dynamic Top Accent Ribbon */}
      <div 
        className="h-[3px] w-full shrink-0 transition-colors duration-300"
        style={{ backgroundColor: resolvedColorValue }}
      />
      
      {/* Editor Action Header */}
      <div className="px-6 py-4 border-b border-slate-150 dark:border-zinc-800/80 flex flex-wrap gap-4 items-center justify-between bg-white/50 dark:bg-zinc-900/20 shrink-0">
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          {/* Interactive Note Icon triggers styles slide-down */}
          <button
            type="button"
            onClick={() => setShowStylesPanel(!showStylesPanel)}
            className={`p-2 rounded-xl border cursor-pointer transition-all shrink-0 ${
              showStylesPanel
                ? 'border-indigo-650 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 scale-105 shadow-xxs'
                : !note.icon 
                  ? 'border-orange-500 animate-pulse ring-4 ring-orange-500/20 bg-orange-50/10 dark:bg-orange-900/10 shadow-[0_0_15px_rgba(249,115,22,0.5)]' 
                  : 'border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-850 text-slate-550'
            }`}
            title="Note custom layout & icon styles"
          >
            <NoteIcon note={note} className={
              note.color === 'indigo' ? 'text-indigo-600 dark:text-indigo-455' :
              note.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-455' :
              note.color === 'amber' ? 'text-amber-600 dark:text-amber-455' :
              note.color === 'rose' ? 'text-rose-600 dark:text-rose-455' :
              note.color === 'violet' ? 'text-violet-605 dark:text-violet-455' :
              'text-slate-500 dark:text-zinc-455'
            } size={18} />
          </button>

          {/* Active Note Title input */}
          <input
            type="text"
            value={note.title}
            onChange={handleTitleChange}
            placeholder="Document title tag..."
            className={`text-slate-850 dark:text-slate-50 bg-transparent text-lg md:text-xl font-bold placeholder-slate-400 dark:placeholder-zinc-650 focus:outline-none flex-1 min-w-0 tracking-tight ${stylePrefs.titleFontClass}`}
          />

          {/* Control Switcher / settings override icon toggled next to title */}
          <button
            onClick={() => setShowStylesPanel(!showStylesPanel)}
            className={`p-1.5 rounded-lg border cursor-pointer transition-all shrink-0 ${
              showStylesPanel
                ? 'border-indigo-650 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 font-bold scale-105 shadow-xxs'
                : 'border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-850 text-slate-500'
            }`}
            title="Configure Note aesthetics, colors & scales override"
          >
            {showStylesPanel ? <X size={14} className="text-indigo-600 dark:text-indigo-400" /> : <Settings2 size={14} className="text-slate-500" />}
          </button>
        </div>

        {/* Dynamic header tool switcher & layout selectors */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Edit vs Preview tab toggle buttons - Hidden in Rich Text mode per request */}
          {(prefs.editorOption || 'editor2') === 'editor2' && (
            <div className="flex items-center bg-slate-100 dark:bg-zinc-905 p-0.5 rounded-xl border border-slate-205 dark:border-zinc-850 select-none">
              <button
                onClick={() => setViewMode('edit')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 ${
                  viewMode === 'edit'
                    ? 'bg-white dark:bg-zinc-800 text-indigo-650 dark:text-indigo-400 shadow-xxs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-zinc-300'
                }`}
                title="Edit layout mode"
              >
                <Edit3 size={11} />
                <span>Compose</span>
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 ${
                  viewMode === 'preview'
                    ? 'bg-white dark:bg-zinc-800 text-indigo-650 dark:text-indigo-400 shadow-xxs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-zinc-300'
                }`}
                title="Render Preview mode"
              >
                <Eye size={11} />
                <span>Output</span>
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`p-1.5 px-2 rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 ${
                  viewMode === 'split'
                    ? 'bg-white dark:bg-zinc-800 text-indigo-655 dark:text-indigo-400 shadow-xxs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-zinc-300'
                }`}
                title="Split dual side workspace"
              >
                <SplitSquareVertical size={11} />
                <span>Split</span>
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Note-level Interactive Slide-Down Customizer Panel */}
      {showStylesPanel && (
        <div className="px-6 py-4 bg-slate-50/90 dark:bg-zinc-950/90 border-b border-slate-200/60 dark:border-zinc-855/60 flex flex-col gap-4 select-none animate-fadeIn shrink-0 backdrop-blur-xs font-sans text-xs" id="editor_styles_panel">
          
          {/* Top Control Settings Row */}
          <div className="flex flex-wrap gap-5 items-start justify-between">
            
            {/* Note Icon Selection Grid */}
            <div className="flex flex-col gap-1.5 min-w-[280px] flex-1 text-left">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-550">Note Symbol Icon</span>
              <div className="flex flex-col gap-2.5 bg-slate-50/50 dark:bg-zinc-900/50 backdrop-blur-md p-2.5 rounded-xl">
                <div className="grid grid-cols-8 gap-1 p-1 bg-slate-50 dark:bg-zinc-950/60 rounded-lg">
                  {BUILT_IN_ICONS.map(item => {
                    const IconComp = item.component;
                    const isIconActive = note.icon === item.id || (!note.icon && getFallbackIconId(note.content) === item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onUpdateNote({ ...note, icon: item.id, updatedAt: Date.now() });
                          showShortcutsPulse(`Icon mapped to: ${item.label}`);
                        }}
                        className={`p-1.5 rounded flex items-center justify-center cursor-pointer transition-all hover:bg-slate-100 dark:hover:bg-zinc-800 ${
                          isIconActive
                            ? 'bg-white dark:bg-zinc-80 text-indigo-155 dark:text-indigo-400 border border-indigo-505/20 shadow-xxs scale-110 font-bold'
                            : 'text-slate-405 hover:text-slate-705 dark:hover:text-zinc-200'
                        }`}
                        title={item.label}
                      >
                        <IconComp size={13} />
                      </button>
                    );
                  })}
                </div>

                {/* Custom SVG Icon loader */}
                <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-zinc-850/60 font-medium">
                  <label className="text-[9px] font-black uppercase cursor-pointer text-slate-500 hover:text-indigo-650 dark:hover:text-indigo-455 transition-colors flex items-center gap-1 shrink-0">
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
                                onUpdateNote({ ...note, icon: sanitized, updatedAt: Date.now() });
                                showShortcutsPulse('Custom SVG note icon loaded successfully');
                              }
                            }
                          };
                          reader.readAsText(file);
                        }
                      }}
                    />
                  </label>
                  <span className="text-slate-200 dark:text-zinc-800 shrink-0">|</span>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Paste <svg> markup..."
                      className="w-full text-[9px] py-1 px-2 border border-slate-150 dark:border-zinc-800 rounded-lg text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-0 placeholder-slate-400 dark:placeholder-zinc-650 font-mono"
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw.trim().toLowerCase().includes('<svg')) {
                          const sanitized = sanitizeSVG(raw);
                          if (sanitized) {
                            onUpdateNote({ ...note, icon: sanitized, updatedAt: Date.now() });
                            showShortcutsPulse('Custom inline SVG applied');
                            e.target.value = '';
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Heroicons loader */}
                <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-zinc-850/60 font-medium">
                  <div className="flex items-center gap-1.5 focus-within:ring-1 ring-indigo-500 rounded-lg overflow-hidden border border-slate-150 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950">
                    <div className="pl-2">
                       <MagnifyingGlassIcon className="w-3 h-3 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search heroicons.com..."
                      className="w-full text-xs py-1.5 px-2 bg-transparent text-slate-700 dark:text-zinc-300 focus:outline-none placeholder-slate-400 dark:placeholder-zinc-650"
                      value={iconSearch}
                      onChange={(e) => setIconSearch(e.target.value)}
                    />
                  </div>
                  {iconSearch && (
                    <div className="grid grid-cols-8 gap-1 p-1 bg-slate-50 dark:bg-zinc-950/60 rounded-lg max-h-[120px] overflow-y-auto custom-scrollbar">
                      {heroIconKeys.filter(k => k.toLowerCase().includes(iconSearch.toLowerCase().replace(/[\s-]/g, ''))).slice(0, 32).map(k => {
                        const IconComp = (HeroOutlineIcons as any)[k];
                        const isIconActive = note.icon === k;
                        return (
                          <button
                            key={k}
                            type="button"
                            onClick={() => {
                              onUpdateNote({ ...note, icon: k, updatedAt: Date.now() });
                              showShortcutsPulse(`Icon mapped to: ${k}`);
                            }}
                            className={`p-1.5 rounded flex items-center justify-center cursor-pointer transition-all hover:bg-slate-100 dark:hover:bg-zinc-800 ${
                              isIconActive
                                ? 'bg-white dark:bg-zinc-800 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 shadow-xxs scale-110 font-bold'
                                : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200'
                            }`}
                            title={k}
                          >
                            <IconComp className="w-3.5 h-3.5" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Typography Section */}
            <div className="flex flex-col gap-1.5 min-w-[200px] text-left">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-555">Typography & Styling</span>
              <div className="flex flex-col gap-2 bg-slate-50/50 dark:bg-zinc-900/50 backdrop-blur-md p-2.5 rounded-xl h-full justify-center">
                {/* Font Overrides */}
                <div className="text-[9px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Font Override</div>
                <div className="flex items-center gap-1 bg-slate-50 dark:bg-zinc-950 p-0.5 rounded-xl border border-slate-200 dark:border-zinc-850">
                  {fontFamilies.map(f => (
                    <button
                      key={f.id}
                      onClick={() => {
                        onUpdateNote({ ...note, fontFamily: f.id, updatedAt: Date.now() });
                        showShortcutsPulse(`Typography customized: ${f.label}`);
                      }}
                      className={`flex-1 py-1 px-2 rounded-lg text-[9px] font-bold cursor-pointer transition-colors text-center ${
                        (note.fontFamily || 'sans') === f.id
                          ? 'bg-white dark:bg-zinc-800 text-indigo-650 dark:text-indigo-400 font-extrabold shadow-xxs'
                          : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300'
                      }`}
                    >
                      {f.id === 'sans' ? 'Sans' : f.id === 'serif' ? 'Serif' : 'Mono'}
                    </button>
                  ))}
                </div>

                {/* Size Overrides */}
                <div className="text-[9px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mt-1">Size</div>
                <div className="flex items-center gap-1 bg-slate-50 dark:bg-zinc-950 p-0.5 rounded-xl border border-slate-200 dark:border-zinc-850">
                  {fontSizes.map(sz => (
                    <button
                      key={sz.id}
                      onClick={() => {
                        onUpdateNote({ ...note, fontSize: sz.id as any, updatedAt: Date.now() });
                        showShortcutsPulse(`Size scaling: ${sz.label}`);
                      }}
                      className={`flex-1 py-1 rounded-lg text-[9px] font-bold cursor-pointer transition-colors text-center ${
                        (note.fontSize || 'base') === sz.id
                          ? 'bg-white dark:bg-zinc-800 text-indigo-650 dark:text-indigo-400 font-extrabold shadow-xxs'
                          : 'text-slate-400 hover:text-slate-705 dark:hover:text-zinc-350'
                      }`}
                    >
                      {sz.id === 'sm' ? 'S' : sz.id === 'base' ? 'M' : sz.id === 'lg' ? 'L' : 'XL'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="w-full h-[1px] bg-slate-200/50 dark:bg-zinc-800/40 my-1"></div>

          {/* Bottom Tags Selection Row merged here */}
          <div className="flex flex-col gap-1.5 text-left w-full">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-555">Document Tags & Ambient Accents</span>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 dark:bg-zinc-900/50 backdrop-blur-md p-4 rounded-xl">
              
              {/* Attached tags list with note primary designation */}
              <div className="space-y-2">
                <span className="text-[9px] font-black text-slate-400 dark:text-zinc-505 uppercase tracking-wider block">Tags attached to note</span>
                <div className="flex flex-wrap gap-1.5 min-h-[36px] items-center">
                  {(note.tags || []).length === 0 ? (
                    <span className="text-[10px] text-slate-405 dark:text-zinc-550 italic font-medium">No tags attached to this note. Select from the catalog or type below to register.</span>
                  ) : (
                    (note.tags || []).map(t => {
                      const isPrimary = note.primaryTag ? note.primaryTag === t : note.tags?.[0] === t;
                      const colStyle = getTagStyle(t, tagDefinitions);
                      return (
                        <div 
                          key={t}
                          className={`px-2 py-1 rounded-lg border flex items-center gap-1.5 transition-all text-[10px] font-bold ${colStyle.className}`}
                          style={colStyle.style}
                        >
                          <span>#{t}</span>
                          
                          {/* Primary Tag designation button */}
                          <button
                            type="button"
                            onClick={() => setPrimaryTagOnNote(t)}
                            className={`p-0.5 rounded transition-all cursor-pointer ${
                              isPrimary 
                                ? 'bg-slate-900/10 dark:bg-white/10 text-slate-950 dark:text-white font-black' 
                                : 'text-slate-400 hover:text-slate-600 opacity-60 hover:opacity-100'
                            }`}
                            title={isPrimary ? "Primary accent tag" : "Click to mark as primary accent"}
                          >
                            <Sparkles size={9} className={isPrimary ? "fill-current scale-110" : ""} />
                          </button>

                          {/* Detach button */}
                          <button
                            type="button"
                            onClick={() => toggleTagOnNote(t)}
                            className="hover:text-red-500 text-[9px] font-black cursor-pointer hover:bg-red-50/50 dark:hover:bg-red-955/40 h-3.5 w-3.5 flex items-center justify-center rounded-full"
                            title="Remove Tag"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Catalog tags with color selection */}
              <div className="space-y-2 border-t md:border-t-0 md:border-l border-slate-100 dark:border-zinc-800 md:pl-4 pt-4 md:pt-0">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-slate-400 dark:text-zinc-505 uppercase tracking-wider">Tags Catalog</span>
                  <span className="text-[8px] text-slate-400 dark:text-zinc-550">Click to assign, hover to preview styles</span>
                </div>
                
                <div className="flex flex-wrap gap-1.5 pr-1">
                  {tagDefinitions.map(def => {
                    const isAttached = (note.tags || []).includes(def.name);
                    const tStyle = getTagStyle(def.name, tagDefinitions);
                    const activeNoteColor = getActiveNoteColor(note, tagDefinitions);
                    const activeStyle = getTagStyleForColor(activeNoteColor);
                    
                    let itemStyle: React.CSSProperties = {};
                    const buttonClassNames = "px-2 py-0.5 text-[9px] font-extrabold rounded-md transition-all cursor-pointer border";

                    if (isAttached) {
                      itemStyle = {
                        backgroundColor: tStyle.colorHex,
                        color: '#ffffff',
                        borderColor: tStyle.colorHex,
                        borderWidth: '1px',
                        borderStyle: 'solid'
                      };
                    } else {
                      itemStyle = tStyle.style || {};
                    }

                    return (
                      <div 
                        key={def.name} 
                        className="flex items-center gap-1.5 bg-slate-50/50 dark:bg-zinc-900/50 backdrop-blur-md p-1 px-1.5 rounded-lg"
                      >
                        <button
                          type="button"
                          onClick={() => toggleTagOnNote(def.name)}
                          className={buttonClassNames}
                          style={itemStyle}
                          title={isAttached ? "Attached. Click to detach." : "Click to attach tag."}
                        >
                          {def.name}
                        </button>

                        <div className="relative group/color-picker flex items-center">
                          <button
                            type="button"
                            onClick={() => {
                              const input = document.getElementById(`tag-color-input-${def.name}`);
                              if (input) (input as HTMLInputElement).click();
                            }}
                            className="p-1 rounded-md text-slate-350 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors shrink-0"
                            style={{ color: tStyle.colorHex }}
                            title="Customize catalog tag base color"
                          >
                            <Palette size={10} />
                          </button>
                          <input 
                            id={`tag-color-input-${def.name}`}
                            type="color"
                            className="sr-only"
                            value={tStyle.colorHex.startsWith('#') ? tStyle.colorHex : '#475569'}
                            onChange={(e) => {
                              updateTagColor(def.name, e.target.value);
                              showShortcutsPulse(`Tag mood color refined: ${e.target.value}`);
                            }}
                          />

                          <button
                            type="button"
                            onClick={() => deleteTagFromCatalog(def.name)}
                            className="p-1 rounded-md text-slate-350 hover:text-rose-500 cursor-pointer transition-colors shrink-0"
                            title="Delete tag from catalog"
                          >
                            <X size={10} />
                          </button>
                          
                          <div className="hidden group-hover/color-picker:flex hover:flex absolute pt-2 top-full left-1/2 -translate-x-1/2 z-[99999] flex-col gap-1.5 items-center">
                            <div className="bg-slate-50/50 dark:bg-zinc-900/50 backdrop-blur-xl p-2 rounded-xl shadow-2xl flex flex-col gap-1.5 items-center">
                              <div className="flex items-center gap-1 shrink-0">
                                {Array.from(new Set(tagDefinitions.map(t => getTagStyle(t.name, tagDefinitions).colorNameOrHex))).map(colorKey => {
                                  const isHex = colorKey.startsWith('#');
                                  return (
                                    <button
                                      key={colorKey}
                                      type="button"
                                      onClick={() => updateTagColor(def.name, colorKey)}
                                      className={`w-3.5 h-3.5 rounded-full hover:scale-115 transition-all cursor-pointer ${
                                        !isHex ? (
                                          colorKey === 'slate' ? 'bg-slate-500' :
                                          colorKey === 'indigo' ? 'bg-indigo-500' :
                                          colorKey === 'emerald' ? 'bg-emerald-500' :
                                          colorKey === 'amber' ? 'bg-amber-500' :
                                          colorKey === 'rose' ? 'bg-rose-500' :
                                          colorKey === 'violet' ? 'bg-violet-500' :
                                          'bg-cyan-500'
                                        ) : ''
                                      }`}
                                      style={isHex ? { backgroundColor: colorKey } : undefined}
                                      title={colorKey}
                                    />
                                  );
                                })}
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[8px] font-mono text-slate-400">#</span>
                                <input
                                  type="text"
                                  maxLength={6}
                                  placeholder={tStyle.colorHex.startsWith('#') ? tStyle.colorHex.slice(1) : 'HEX'}
                                  className="w-12 text-[8px] font-mono py-0.5 px-1 border border-slate-205 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 rounded text-slate-705 dark:text-zinc-300 uppercase outline-none"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const val = (e.currentTarget.value || '').trim();
                                      if (/^[0-9A-Fa-f]{6}$/.test(val)) {
                                        updateTagColor(def.name, '#' + val);
                                        showShortcutsPulse(`Tag base accent updated: #${val}`);
                                        e.currentTarget.value = '';
                                      } else {
                                        alert('Invalid HEX color. Format must be FF5733');
                                      }
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const name = (fd.get('newTagName') as string || '').trim();
                    if (name) {
                      createNewTag(name, '#374151');
                      showShortcutsPulse(`Created and attached tag: ${name}`);
                    }
                    e.currentTarget.reset();
                  }}
                  className="flex items-center gap-1.5"
                >
                  <input
                    type="text"
                    name="newTagName"
                    placeholder="Register new tag catalog tag + hit Enter..."
                    className="flex-1 text-[10px] py-1 px-2 border border-slate-150 dark:border-zinc-805 bg-slate-50 dark:bg-zinc-950 rounded-lg text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-0 placeholder-slate-400 dark:placeholder-zinc-650"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-indigo-600 dark:text-indigo-400 text-[10px] font-extrabold rounded-lg border border-indigo-200/20 dark:border-zinc-800 transition-colors cursor-pointer shrink-0"
                  >
                    Add Tag
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={() => {
                onUpdateNote({
                  ...note,
                  color: 'slate',
                  fontFamily: undefined,
                  fontSize: undefined,
                  icon: undefined,
                  updatedAt: Date.now()
                });
                showShortcutsPulse('Restored default note aesthetic settings');
              }}
              className="text-[9px] font-bold uppercase tracking-wider text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
            >
              Reset to Defaults
            </button>
          </div>

        </div>
      )}

      {/* Formatting Standard elements Toolbar */}
      <div className="px-6 py-2 border-b border-slate-150 dark:border-zinc-800/60 bg-slate-50/25 dark:bg-zinc-950/20 flex flex-wrap gap-1 items-center select-none shrink-0 font-sans" id="editor_formatting_toolbar">
        {(prefs.editorOption || 'editor2') === 'editor1' ? (
          // VISUAL RICH TEXT PLATFORM TOOLBAR
          <>
            {/* Undo, Redo */}
            <button
              onClick={undo}
              disabled={!historyRef.current[note?.id || ''] || historyRef.current[note?.id || '']?.index <= 0}
              className={`p-1.5 rounded-lg transition-colors ${
                historyRef.current[note?.id || ''] && historyRef.current[note?.id || '']?.index > 0
                  ? 'text-slate-550 hover:text-indigo-650 hover:bg-slate-100 dark:hover:bg-zinc-850 cursor-pointer'
                  : 'text-slate-205 dark:text-zinc-800 cursor-not-allowed opacity-40'
              }`}
              title="Undo previous edit (⌘+Z)"
            >
              <Undo size={14} />
            </button>
            <button
              onClick={redo}
              disabled={!historyRef.current[note?.id || ''] || historyRef.current[note?.id || '']?.index >= historyRef.current[note?.id || '']?.list.length - 1}
              className={`p-1.5 rounded-lg transition-colors ${
                historyRef.current[note?.id || ''] && historyRef.current[note?.id || '']?.index < historyRef.current[note?.id || '']?.list.length - 1
                  ? 'text-slate-550 hover:text-indigo-650 hover:bg-slate-100 dark:hover:bg-zinc-850 cursor-pointer'
                  : 'text-slate-205 dark:text-zinc-800 cursor-not-allowed opacity-40'
              }`}
              title="Redo previous edit (⌘+Shift+Z)"
            >
              <Redo size={14} />
            </button>

            <div className="h-4 w-[1px] bg-slate-200 dark:bg-zinc-800 mx-1"></div>

            {/* Bold, Italic, Underline, Strikethrough */}
            <button
              onClick={() => applyFormatting('bold')}
              className="p-1.5 text-slate-500 hover:text-indigo-655 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
              title="Bold text (⌘+B)"
            >
              <Bold size={14} />
            </button>
            <button
              onClick={() => applyFormatting('italic')}
              className="p-1.5 text-slate-500 hover:text-indigo-655 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
              title="Italic text (⌘+I)"
            >
              <Italic size={14} />
            </button>
            <button
              onClick={() => applyFormatting('underline')}
              className="p-1.5 text-slate-500 hover:text-indigo-655 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
              title="Underline text (⌘+U)"
            >
              <Underline size={14} />
            </button>
            <button
              onClick={() => applyFormatting('strikethrough')}
              className="p-1.5 text-slate-500 hover:text-indigo-655 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
              title="Strikethrough text"
            >
              <Strikethrough size={14} />
            </button>

            <div className="h-4 w-[1px] bg-slate-200 dark:bg-zinc-800 mx-1"></div>

            {/* Color & Highlight */}
            <button
              onClick={() => applyFormatting('highlight')}
              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-100/30 dark:hover:bg-amber-950/25 rounded-lg cursor-pointer transition-colors"
              title="Highlight markup block"
            >
              <Highlighter size={14} />
            </button>

            {/* Highlight Color dropdown selector */}
            <div className="relative">
              <button
                onClick={() => setShowColorHighlightMenu(!showColorHighlightMenu)}
                className="p-1.5 text-slate-500 hover:text-indigo-650 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors flex items-center gap-0.5"
                title="Configure text spans colors highlight"
              >
                <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gradient-to-tr from-rose-500 to-indigo-500 text-[10px]" />
                <ChevronDown size={8} className="opacity-60" />
              </button>
              
              {showColorHighlightMenu && (
                <div className="absolute left-0 mt-2.5 z-50 bg-white dark:bg-zinc-900 border border-slate-205 dark:border-zinc-850 p-2.5 rounded-2xl shadow-2xl flex gap-1.5 items-center">
                  {[
                    { color: '#e11d48', label: 'Red' },
                    { color: '#0d9488', label: 'Teal' },
                    { color: '#2563eb', label: 'Blue' },
                    { color: '#7c3aed', label: 'Purple' },
                    { color: '#ea580c', label: 'Orange' },
                    { color: '#db2777', label: 'Rose' }
                  ].map(hl => (
                    <button
                      key={hl.color}
                      onClick={() => {
                        applyFormatting('color', hl.color);
                        setShowColorHighlightMenu(false);
                        showShortcutsPulse(`Text color applied: ${hl.label}`);
                      }}
                      className="h-5.5 w-5.5 rounded-full border border-slate-200 dark:border-zinc-700 cursor-pointer hover:scale-120 hover:rotate-12 transition-all shadow-xs"
                      style={{ backgroundColor: hl.color }}
                      title={hl.label}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="h-4 w-[1px] bg-slate-200 dark:bg-zinc-800 mx-1"></div>

            {/* Headings (H1-H3) */}
            <button
              onClick={() => applyFormatting('heading')}
              className="px-2 py-1 text-slate-550 hover:text-indigo-650 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-xs font-bold cursor-pointer transition-all"
              title="Heading 1"
            >
              H1
            </button>
            <button
              onClick={() => applyFormatting('h2')}
              className="px-2 py-1 text-slate-555 hover:text-indigo-650 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-xs font-bold cursor-pointer transition-all"
              title="Heading 2"
            >
              H2
            </button>
            <button
              onClick={() => applyFormatting('h3')}
              className="px-2 py-1 text-slate-555 hover:text-indigo-655 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-xs font-bold cursor-pointer transition-all"
              title="Heading 3"
            >
              H3
            </button>

            <div className="h-4 w-[1px] bg-slate-200 dark:bg-zinc-800 mx-1"></div>

            {/* Lists: Unordered, Ordered, Checklist */}
            <button
              onClick={() => applyFormatting('bullet')}
              className="p-1.5 text-slate-500 hover:text-indigo-655 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
              title="Unordered List"
            >
              <List size={14} />
            </button>
            <button
              onClick={() => applyFormatting('ordered')}
              className="p-1.5 text-slate-500 hover:text-indigo-655 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
              title="Ordered List"
            >
              <ListOrdered size={14} />
            </button>
            <button
              onClick={() => {
                applyFormatting('checklist');
                showShortcutsPulse('Inserted checkbox layout');
              }}
              className="p-1.5 text-slate-500 hover:text-indigo-650 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
              title="Insert Checklist (⌘+/)"
            >
              <ListTodo size={14} />
            </button>

            <div className="h-4 w-[1px] bg-slate-200 dark:bg-zinc-800 mx-1"></div>

            {/* Indentation (Indent/Outdent) */}
            <button
              onClick={() => applyFormatting('outdent')}
              className="p-1.5 text-slate-500 hover:text-indigo-655 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
              title="Decrease Indent"
            >
              <Outdent size={14} />
            </button>
            <button
              onClick={() => applyFormatting('indent')}
              className="p-1.5 text-slate-500 hover:text-indigo-655 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
              title="Increase Indent"
            >
              <Indent size={14} />
            </button>

            <div className="h-4 w-[1px] bg-slate-200 dark:bg-zinc-800 mx-1"></div>

            {/* Alignment (Left/Center/Right/Justify) */}
            <button
              onClick={() => applyFormatting('align-left')}
              className="p-1.5 text-slate-500 hover:text-indigo-655 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
              title="Align Left"
            >
              <AlignLeft size={14} />
            </button>
            <button
              onClick={() => applyFormatting('align-center')}
              className="p-1.5 text-slate-500 hover:text-indigo-655 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
              title="Align Center"
            >
              <AlignCenter size={14} />
            </button>
            <button
              onClick={() => applyFormatting('align-right')}
              className="p-1.5 text-slate-500 hover:text-indigo-655 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
              title="Align Right"
            >
              <AlignRight size={14} />
            </button>
            <button
              onClick={() => applyFormatting('align-justify')}
              className="p-1.5 text-slate-500 hover:text-indigo-655 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
              title="Justify"
            >
              <AlignJustify size={14} />
            </button>

            <div className="h-4 w-[1px] bg-slate-200 dark:bg-zinc-800 mx-1"></div>

            {/* Links, Images, Tables */}
            <button
              onClick={() => applyFormatting('link')}
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
              title="Insert Link ([title](url)) (⌘+K)"
            >
              <Link size={14} />
            </button>
            <button
              onClick={() => applyFormatting('image')}
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
              title="Insert Image (![alt](url))"
            >
              <ImageIcon size={14} />
            </button>
            <button
              onClick={handleOpenAIPrompt}
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
              title="Multi-Tone AI Prompt Block"
            >
              <Sparkles size={14} />
            </button>
            <button
              onClick={handleOpenTranslate}
              className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
              title="LibreTranslate"
            >
              <Globe size={14} />
            </button>
            <button
              onClick={toggleSpeechRecognition}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                isRecording 
                  ? 'bg-rose-500 text-white animate-pulse shadow-md' 
                  : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
              title={isRecording ? "Stop Voice-to-Text" : "Start Voice-to-Text"}
            >
              {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
            </button>
            <button
              onClick={() => setShowWorkspacePicker(true)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              title="Embed Google Docs & Sheets"
            >
              <HardDrive size={14} />
            </button>
            <button
              onClick={() => {
                const input = document.getElementById('video_upload');
                if (input) (input as HTMLInputElement).click();
              }}
              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              title="Embed Video Clip"
            >
              <Video size={14} />
              <input
                id="video_upload"
                type="file"
                accept="video/mp4,video/avi,video/mpeg,video/webm"
                className="hidden"
                onChange={handleVideoUpload}
              />
            </button>
            <button
              onClick={() => {
                applyFormatting('table');
                showShortcutsPulse('Table grid configured.');
              }}
              className="px-2.5 py-1 text-slate-555 hover:text-indigo-655 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer transition-all flex items-center gap-1 text-[11px] font-bold border border-slate-200 dark:border-zinc-800 shadow-xxs bg-white dark:bg-zinc-950"
              title="Insert Table (⌘+Shift+T)"
            >
              <Table size={12} className="text-indigo-505" />
              <span>Table</span>
            </button>
          </>
        ) : (
          // MARKDOWN PLATFORM TOOLBAR
          <>
            {/* Undo, Redo */}
            <button
              onClick={undo}
              disabled={!historyRef.current[note?.id || ''] || historyRef.current[note?.id || '']?.index <= 0}
              className={`p-1.5 rounded-lg transition-colors ${
                historyRef.current[note?.id || ''] && historyRef.current[note?.id || '']?.index > 0
                  ? 'text-slate-550 hover:text-indigo-650 hover:bg-slate-100 dark:hover:bg-zinc-850 cursor-pointer'
                  : 'text-slate-205 dark:text-zinc-800 cursor-not-allowed opacity-40'
              }`}
              title="Undo previous edit (⌘+Z)"
            >
              <Undo size={14} />
            </button>
            <button
              onClick={redo}
              disabled={!historyRef.current[note?.id || ''] || historyRef.current[note?.id || '']?.index >= historyRef.current[note?.id || '']?.list.length - 1}
              className={`p-1.5 rounded-lg transition-colors ${
                historyRef.current[note?.id || ''] && historyRef.current[note?.id || '']?.index < historyRef.current[note?.id || '']?.list.length - 1
                  ? 'text-slate-550 hover:text-indigo-650 hover:bg-slate-100 dark:hover:bg-zinc-850 cursor-pointer'
                  : 'text-slate-205 dark:text-zinc-800 cursor-not-allowed opacity-40'
              }`}
              title="Redo previous edit (⌘+Shift+Z)"
            >
              <Redo size={14} />
            </button>

            <div className="h-4 w-[1px] bg-slate-200 dark:bg-zinc-800 mx-1.5"></div>

            {/* Bold, Italic, Strikethrough */}
            <button
              onClick={() => applyFormatting('bold')}
              className="p-1.5 text-slate-500 hover:text-indigo-655 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
              title="Bold text (⌘+B)"
            >
              <Bold size={14} />
            </button>
            <button
              onClick={() => applyFormatting('italic')}
              className="p-1.5 text-slate-500 hover:text-indigo-655 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
              title="Italic text (⌘+I)"
            >
              <Italic size={14} />
            </button>
            <button
              onClick={() => applyFormatting('strikethrough')}
              className="p-1.5 text-slate-500 hover:text-indigo-655 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
              title="Strikethrough text"
            >
              <Strikethrough size={14} />
            </button>

            <div className="h-4 w-[1px] bg-slate-200 dark:bg-zinc-800 mx-1.5"></div>

            {/* Headings (H1–H3) */}
            <button
              onClick={() => applyFormatting('heading')}
              className="px-2 py-0.5 text-slate-550 hover:text-indigo-650 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-xs font-bold cursor-pointer transition-all"
              title="Heading 1 (#)"
            >
              H1
            </button>
            <button
              onClick={() => applyFormatting('h2')}
              className="px-2 py-0.5 text-slate-555 hover:text-indigo-650 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-xs font-bold cursor-pointer transition-all"
              title="Heading 2 (##)"
            >
              H2
            </button>
            <button
              onClick={() => applyFormatting('h3')}
              className="px-2 py-0.5 text-slate-555 hover:text-indigo-650 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-xs font-bold cursor-pointer transition-all"
              title="Heading 3 (###)"
            >
              H3
            </button>

            <div className="h-4 w-[1px] bg-slate-200 dark:bg-zinc-800 mx-1.5"></div>

            {/* Lists: ordered / unordered */}
            <button
              onClick={() => applyFormatting('bullet')}
              className="p-1.5 text-slate-500 hover:text-indigo-655 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
              title="Unordered List (-)"
            >
              <List size={14} />
            </button>
            <button
              onClick={() => applyFormatting('ordered')}
              className="p-1.5 text-slate-500 hover:text-indigo-655 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
              title="Ordered List (1.)"
            >
              <ListOrdered size={14} />
            </button>
            <button
              onClick={() => {
                applyFormatting('checklist');
                showShortcutsPulse('Inserted checklist');
              }}
              className="p-1.5 text-slate-500 hover:text-indigo-650 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
              title="Insert Checklist (- [ ]) (⌘+/)"
            >
              <ListTodo size={14} />
            </button>

            <div className="h-4 w-[1px] bg-slate-200 dark:bg-zinc-800 mx-1.5"></div>

            {/* Code block, Inline Code */}
            <button
              onClick={() => applyFormatting('inline-code')}
              className="p-1.5 text-slate-500 hover:text-indigo-655 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
              title="Inline Code (`)"
            >
              <span className="font-mono text-xs font-black">`c`</span>
            </button>
            <button
              onClick={() => applyFormatting('code')}
              className="p-1.5 text-slate-500 hover:text-indigo-655 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
              title="Code Block (```)"
            >
              <Code size={14} />
            </button>

            <div className="h-4 w-[1px] bg-slate-200 dark:bg-zinc-805 mx-1.5"></div>

            {/* Links, Images, Tables */}
            <button
              onClick={() => applyFormatting('link')}
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
              title="Insert Link ([title](url)) (⌘+K)"
            >
              <Link size={14} />
            </button>
            <button
              onClick={() => applyFormatting('image')}
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
              title="Insert Image (![alt](url))"
            >
              <ImageIcon size={14} />
            </button>
            <button
              onClick={handleOpenAIPrompt}
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
              title="Multi-Tone AI Prompt Block"
            >
              <Sparkles size={14} />
            </button>
            <button
              onClick={handleOpenTranslate}
              className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
              title="LibreTranslate"
            >
              <Globe size={14} />
            </button>
            <button
              onClick={toggleSpeechRecognition}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                isRecording 
                  ? 'bg-rose-500 text-white animate-pulse shadow-md' 
                  : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
              title={isRecording ? "Stop Voice-to-Text" : "Start Voice-to-Text"}
            >
              {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
            </button>

            <button
              onClick={() => setShowWorkspacePicker(true)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              title="Embed Google Docs & Sheets"
            >
              <HardDrive size={14} />
            </button>

            <button
              onClick={() => {
                const input = document.getElementById('video_upload_md');
                if (input) (input as HTMLInputElement).click();
              }}
              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              title="Embed Video Clip"
            >
              <Video size={14} />
              <input
                id="video_upload_md"
                type="file"
                accept="video/mp4,video/avi,video/mpeg,video/webm"
                className="hidden"
                onChange={handleVideoUpload}
              />
            </button>

            <button
              onClick={() => {
                applyFormatting('table');
                showShortcutsPulse('Standard table grid configured.');
              }}
              className="px-2.5 py-1 text-slate-555 hover:text-indigo-650 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer transition-all flex items-center gap-1 text-[11px] font-bold border border-slate-200 dark:border-zinc-800 shadow-xxs bg-white dark:bg-zinc-950"
              title="Insert Table (⌘+Shift+T)"
            >
              <Table size={12} className="text-indigo-505" />
              <span>Table</span>
            </button>
          </>
        )}

        <div className="flex-1 text-right"></div>

        {/* Keyboard shortcut list toggle trigger */}
        <button
          onClick={() => setShowShortcutsGuide(true)}
          className="p-1.5 text-slate-400 hover:text-indigo-650 hover:bg-slate-100 dark:hover:bg-zinc-805 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 text-[11px] font-extrabold select-none"
          title="Keyboard key mapping list guidelines"
        >
          <Keyboard size={13} className="text-slate-450 dark:text-zinc-500 animate-pulse animate-bounce" />
          <span className="hidden sm:inline"> Shortcuts</span>
        </button>
      </div>

      {/* Editor Main Content Stage Split layout engine */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 min-w-0" id="editor_writing_stage">
        
        {/* RENDERED PREVIEW OUTPUT LAYOUT WITH INLINE HIGH-DENSITY HIGHLIGHTING */}
        {(prefs.editorOption || 'editor2') === 'editor2' && (viewMode === 'preview' || viewMode === 'split') && (() => {
          const getNoteAccentColors = (c?: string) => {
            switch (c) {
              case 'indigo': return { bg: 'bg-indigo-50/40 dark:bg-indigo-950/20', border: 'border-indigo-500/15 dark:border-indigo-500/10', text: 'text-indigo-850 dark:text-indigo-400', badge: 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300' };
              case 'emerald': return { bg: 'bg-emerald-50/40 dark:bg-emerald-950/20', border: 'border-emerald-500/15 dark:border-emerald-500/10', text: 'text-emerald-850 dark:text-emerald-400', badge: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300' };
              case 'amber': return { bg: 'bg-amber-50/40 dark:bg-amber-950/20', border: 'border-amber-500/15 dark:border-amber-500/10', text: 'text-amber-850 dark:text-amber-400', badge: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300' };
              case 'rose': return { bg: 'bg-rose-50/40 dark:bg-rose-950/20', border: 'border-rose-500/15 dark:border-rose-500/10', text: 'text-rose-850 dark:text-rose-400', badge: 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300' };
              case 'violet': return { bg: 'bg-violet-50/40 dark:bg-violet-950/20', border: 'border-violet-500/15 dark:border-violet-500/10', text: 'text-violet-850 dark:text-violet-400', badge: 'bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300' };
              default: return { bg: 'bg-slate-50 dark:bg-zinc-800/15', border: 'border-slate-205 dark:border-zinc-800/60', text: 'text-slate-705 dark:text-zinc-300', badge: 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300' };
            }
          };
          const accColors = getNoteAccentColors(note.color);

          return (
            <div 
              onClick={(prefs.editorOption || 'editor2') === 'editor1' ? undefined : handlePreviewContainerClick}
              className={`flex-1 overflow-y-auto flex flex-col h-full min-w-0 font-sans custom-scrollbar transition-all ${
                stylePrefs.id === 'glassmorphism' || stylePrefs.id === 'gradient_heavy' || stylePrefs.id === 'artistic'
                  ? 'bg-white/94 dark:bg-zinc-950/90 shadow-inner backdrop-blur-md'
                  : stylePrefs.editorBgClass || 'bg-white dark:bg-zinc-900'
              } border-l border-slate-150 dark:border-zinc-850`}
            >
              <div className="px-5 py-2.5 bg-slate-100/40 dark:bg-zinc-950/30 border-b border-slate-150 dark:border-zinc-850 select-none font-mono text-[10px] font-bold uppercase tracking-widest text-slate-420 dark:text-zinc-500 shrink-0 flex justify-between items-center bg-white/50 dark:bg-zinc-900/20">
                <span>{getPaneLabels(prefs.paneNamingOption).formatted} ({prefs.editorOption === 'editor1' ? 'Rich Text' : 'Markdown'})</span>
              </div>
              
              <div className="flex-1 p-6 overflow-y-auto">
                <div className={`prose dark:prose-invert max-w-none text-slate-850 dark:text-slate-202 ${fontClass} ${sizeClass} ${lhClass} focus:outline-none`}>
                  {(prefs.editorOption || 'editor2') === 'editor1' ? (
                    // Engine 1 Visual rendering of HTML output
                    note.content.trim() ? (
                      <HTMLRenderer html={note.content} theme={prefs.syntaxTheme || 'dracula'} />
                    ) : (
                      <p className="text-slate-400 dark:text-zinc-550 italic leading-relaxed">No note content written. Enter custom visual fields in composer panel representation sheets.</p>
                    )
                  ) : (
                    // Engine 2 Markdown compile rendering using reactant processors
                    note.content.trim() ? (
                      <div className="markdown-body">
                        <ReactMarkdown
                          rehypePlugins={[rehypeRaw]}
                          components={{
                            p({ children }) {
                              return <div className="mb-4 last:mb-0">{children}</div>;
                            },
                            a({ href, children, ...props }) {
                              const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
                              const match = href?.match(ytRegex);
                              if (match && href) {
                                const videoId = match[1];
                                const meta = youtubeMeta[videoId];
                                return (
                                  <div className="p-3 my-4 bg-slate-50 dark:bg-zinc-800/20 rounded-2xl border border-slate-200 dark:border-zinc-700/50 flex flex-col gap-2 yt-attachment max-w-sm group not-prose">
                                    <div className="relative rounded-xl overflow-hidden aspect-video shadow-xs bg-slate-200 dark:bg-zinc-800">
                                      <img src={meta?.thumb || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                      <div className="absolute inset-0 bg-black/10 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                                        <button 
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            window.open(href, '_blank');
                                          }}
                                          className="w-12 h-12 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all cursor-pointer"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
                                        </button>
                                      </div>
                                    </div>
                                    <div className="px-1 space-y-0.5">
                                      <div className="text-[11px] font-bold text-slate-850 dark:text-zinc-100 line-clamp-1 leading-snug tracking-tight">
                                        {meta?.title || `YouTube Video: ${videoId}`}
                                      </div>
                                      <div className="flex items-center gap-1 text-[9px] text-slate-500 font-medium">
                                        <span className="uppercase tracking-widest opacity-60">Source:</span>
                                        <button 
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            window.open(href, '_blank');
                                          }}
                                          className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer bg-transparent border-none p-0"
                                        >
                                          {new URL(href).hostname} <ExternalLink size={8} strokeWidth={3} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              return <a href={href} {...props}>{children}</a>;
                            },
                            code({ className, children, ...props }) {
                              const match = /language-(\w+)/.exec(className || '');
                              const codeString = String(children).replace(/\n$/, '');
                              if (match) {
                                return (
                                  <CodeHighlighter
                                    code={codeString}
                                    language={match[1]}
                                    theme={prefs.syntaxTheme || 'dracula'}
                                  />
                                );
                              }
                              return (
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              );
                            }
                          }}
                        >
                          {note.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-slate-400 dark:text-zinc-550 italic leading-relaxed font-semibold">No note content has been written yet. Draft notes seamlessly in the workspace.</p>
                    )
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* TEXT EDITOR AREA - BOTH ENGINES (Option 1 contentEditable, Option 2 markdown textarea) */}
        {((prefs.editorOption || 'editor2') === 'editor1' || viewMode === 'edit' || viewMode === 'split') && (
          <div className="flex-1 flex flex-col h-full min-w-0 bg-slate-50/10 dark:bg-slate-950/5 relative border-r border-slate-150/40 dark:border-zinc-850/40">
            {viewMode === 'split' && (prefs.editorOption || 'editor2') === 'editor2' && (
              <div className="px-6 py-2 bg-slate-100/40 dark:bg-zinc-950/30 border-b border-slate-200 dark:border-zinc-805 text-[10px] font-bold uppercase tracking-widest text-slate-420 dark:text-zinc-500 shrink-0 flex justify-between select-none font-mono">
                <span>{getPaneLabels(prefs.paneNamingOption).raw}</span>
                <span className="text-slate-350 dark:text-zinc-650">Draft Stage</span>
              </div>
            )}
            
            <div className="flex-1 flex flex-col min-h-0 min-w-0 relative">
              {(prefs.editorOption || 'editor2') === 'editor1' ? (
                // ENGINE 1 Option 1 Visual WYSIWYG Editor
                <div
                  id="editor_contenteditable"
                  ref={editorRef}
                  contentEditable={true}
                  onInput={handleContentEditableInput}
                  onKeyDown={handleContentEditableKeyDown}
                  onPaste={handleRichTextPaste}
                  data-placeholder="Draft visual document content beautifully here... Formatting buttons, link creators, code block snippet loaders, checklist checkboxes and standard tables are fully supported visually."
                  className={`flex-1 w-full p-6 outline-none overflow-y-auto ${fontClass} ${sizeClass} ${lhClass} prose dark:prose-invert max-w-none bg-transparent custom-scrollbar`}
                  style={{ minHeight: '100px' }}
                />
              ) : (
                // ENGINE 2 Option 2 dynamic markdown textarea
                <textarea
                  id="editor_textarea"
                  value={note.content}
                  onChange={handleContentChange}
                  onKeyDown={handleKeyDown}
                  onPaste={handleMarkdownPaste}
                  placeholder="Draft encrypted Markdown content beautifully... Fully responsive double pane Split Rendering is active. Enter Cmd+Shift+T to load matrices data grids."
                  spellCheck="true"
                  className={`flex-1 w-full p-6 resize-none bg-transparent text-slate-850 dark:text-slate-205 focus:outline-none overflow-y-auto ${fontClass} ${sizeClass} ${lhClass} custom-scrollbar`}
                />
              )}
              
              {/* SLASH COMMAND TEMPLATES MENU */}
              {showSlashMenu && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-72 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col">
                  <div className="px-3 py-2 bg-slate-50 dark:bg-zinc-950 border-b border-slate-100 dark:border-zinc-800 flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Slash Commands</span>
                  </div>
                  <div className="flex-1 overflow-y-auto max-h-64 p-1">
                    {filteredTemplates.length > 0 ? (
                      filteredTemplates.map((template, idx) => (
                        <div
                          key={template.id}
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${
                            idx === slashIndex
                              ? 'bg-indigo-50 dark:bg-indigo-900/30 ring-1 ring-indigo-200 dark:ring-indigo-800'
                              : 'hover:bg-slate-50 dark:hover:bg-zinc-800/50'
                          }`}
                          onClick={() => {
                            injectTemplate(template.content);
                            if ((prefs.editorOption || 'editor2') === 'editor1' && editorRef.current) {
                                editorRef.current.focus();
                            }
                          }}
                        >
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                            {template.icon}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900 dark:text-white">{template.title}</div>
                            <div className="text-xs text-slate-500 dark:text-zinc-400">{template.description}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-slate-500 dark:text-zinc-400">
                        No templates found
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* FLOATING ACTION NOTIFICATION SHORTCUT TOAST */}
      {shortcutMessage && (
        <div className="absolute bottom-16 right-6 z-55 bg-slate-900/90 dark:bg-zinc-950/95 border border-slate-700 p-2.5 px-4.5 rounded-2xl text-[10px] font-bold text-slate-50 dark:text-zinc-200 tracking-wider flex items-center gap-1.5 shadow-2xl animate-fadeIn">
          <Sparkles size={11} className="text-amber-400" />
          <span>{shortcutMessage}</span>
        </div>
      )}

      {/* FOOTER METRICS BAR */}
      <div className="px-6 py-2.5 bg-slate-50/50 dark:bg-slate-950/50 border-t border-slate-150/40 dark:border-slate-805/40 flex items-center justify-between text-xs text-slate-450 dark:text-slate-500 shrink-0 select-none font-medium">
        {/* Document Stats */}
        <div className="flex items-center gap-4 font-condensed tracking-wider">
          <span><strong className="text-slate-700 dark:text-zinc-300 font-bold">{stats.words}</strong> words</span>
          <span><strong className="text-slate-700 dark:text-zinc-300 font-bold">{stats.chars}</strong> characters</span>
          <span><strong className="text-slate-700 dark:text-zinc-300 font-bold">{stats.minutes}</strong> min read</span>
        </div>

        {/* Extra operational tools */}
        <div className="flex items-center gap-3">
          {/* SAVE BUTTON - Moved from Top Header */}
          <button
            onClick={handleManualSave}
            disabled={saveStatus === 'saving'}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 shrink-0 ${
              saveStatus === 'saved'
                ? 'bg-emerald-500 text-white shadow-emerald-500/20 shadow-md'
                : saveStatus === 'saving'
                ? 'bg-amber-500 text-white shadow-amber-500/20 shadow-md animate-pulse'
                : saveStatus === 'error'
                ? 'bg-rose-500 text-white shadow-md'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/25 border border-indigo-500/30 shadow-md'
            }`}
          >
            {saveStatus === 'saved' ? <Check size={14} strokeWidth={3} /> : <Save size={14} />}
            <span>
              {saveStatus === 'saving' ? 'Syncing...' : saveStatus === 'saved' ? 'Saved ✓' : 'SAVE'}
            </span>
          </button>
          
          <div className="h-3 w-[1px] bg-slate-200 dark:bg-zinc-800"></div>

          <button
            onClick={handleCopyClipboard}
            className="flex items-center gap-1 hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors cursor-pointer font-bold"
          >
            <Copy size={11} />
            <span>{copySuccess ? 'Copied!' : 'Copy Draft'}</span>
          </button>
          
          <div className="h-3 w-[1px] bg-slate-200 dark:bg-zinc-800"></div>

          <button
            onClick={() => {
              setShowDeleteConfirm(true);
            }}
            className="flex items-center gap-1 hover:text-red-500 transition-colors text-red-400 cursor-pointer font-bold"
            title="Delete this note"
          >
            <Trash2 size={11} />
            <span>Delete Note</span>
          </button>
        </div>
      </div>

      {/* INSTRUCTIONAL SHORTCUTS SYSTEM MODEL OVERLAY */}
      {showShortcutsGuide && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
          <div className="w-full max-w-sm bg-white/95 dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] backdrop-blur-lg">
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 px-5 border-b border-slate-150 dark:border-zinc-800/60 shrink-0 bg-slate-50/55 dark:bg-zinc-950/40 select-none">
              <div className="flex items-center gap-2">
                <Keyboard size={16} className="text-indigo-500" />
                <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  Keyboard Shortcuts Guide
                </h3>
              </div>
              <button
                onClick={() => setShowShortcutsGuide(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-650 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* List */}
            <div className="p-5 overflow-y-auto space-y-3 font-sans">
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed font-semibold">
                Elevate your writing speed with Knoots' native hotkeys commands:
              </p>

              <div className="space-y-2">
                {[
                  { keys: ['Ctrl', 'Z'], desc: 'Undo last editing command' },
                  { keys: ['Ctrl', 'Y'], desc: 'Redo last undone command' },
                  { keys: ['Ctrl', 'B'], desc: 'Toggle Bold Style on selection' },
                  { keys: ['Ctrl', 'I'], desc: 'Toggle Italic Style on selection' },
                  { keys: ['Ctrl', 'H'], desc: 'Add Header (Heading 1) Tag' },
                  { keys: ['Ctrl', 'K'], desc: 'Insert Safe Hyperlink pattern' },
                  { keys: ['Ctrl', '/'], desc: 'Insert Checklist checkboxes' },
                  { keys: ['Ctrl', 'Shift', 'T'], desc: 'Insert Standard Table grids' },
                  { keys: ['Tab'], desc: 'Indent block alignment in editor code' }
                ].map((sc, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-zinc-800/40 text-[11px] text-slate-650 dark:text-zinc-300">
                    <span className="font-semibold">{sc.desc}</span>
                    <div className="flex gap-1">
                      {sc.keys.map(k => (
                        <kbd key={k} className="px-1 py-0.5 bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-[8px] font-mono font-extrabold text-slate-750 dark:text-zinc-350 shadow-xxs">
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-indigo-505/10 dark:bg-indigo-500/10 rounded-2xl border border-indigo-500/15 text-[11px] text-indigo-850 dark:text-indigo-400 leading-relaxed font-semibold flex gap-2">
                <Info size={13} className="shrink-0 mt-0.5 text-indigo-500" />
                <p>On Apple macOS systems, you can also use <kbd className="font-mono bg-slate-50 dark:bg-zinc-900 p-0.5 px-1 rounded text-[9px] font-bold">⌘ Command</kbd> instead of <kbd className="font-mono bg-slate-50 dark:bg-zinc-900 p-0.5 px-1 rounded text-[9px] font-bold">Ctrl</kbd> for all operations seamlessly!</p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setShowShortcutsGuide(false)}
                  className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-550 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-500/15 cursor-pointer active:scale-95 transition-transform"
                >
                  Got it, close guide
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* CUSTOM INSERT DIALOG OVERLAY */}
      {insertDialog.type && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/60 dark:bg-black/85 backdrop-blur-xs font-sans">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-950 border border-slate-205 dark:border-zinc-850 rounded-2xl shadow-xl relative overflow-hidden flex flex-col p-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <span className="font-extrabold text-xs uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                Insert {insertDialog.type === 'link' ? 'Hyperlink' : 'Visual Image'}
              </span>
              <button
                onClick={() => setInsertDialog({ type: null, targetUrl: '', altText: '', onSuccess: () => {} })}
                className="text-slate-405 hover:text-slate-605 dark:hover:text-zinc-300 font-bold"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-705 dark:text-zinc-300">
                  {insertDialog.type === 'link' ? 'Destination Address (URL)' : 'Image Address (URL)'}
                </label>
                <input
                  type="text"
                  value={insertDialog.targetUrl}
                  onChange={(e) => setInsertDialog(prev => ({ ...prev, targetUrl: e.target.value }))}
                  placeholder={insertDialog.type === 'link' ? 'https://example.com' : 'https://images.unsplash.com/...'}
                  className="w-full py-2 px-3 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg text-slate-805 dark:text-zinc-300 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-705 dark:text-zinc-300">
                  {insertDialog.type === 'link' ? 'Display Text (Optional)' : 'Hover / Alt Tag Description'}
                </label>
                <input
                  type="text"
                  value={insertDialog.altText}
                  onChange={(e) => setInsertDialog(prev => ({ ...prev, altText: e.target.value }))}
                  placeholder={insertDialog.type === 'link' ? 'Visit website' : 'Description of image'}
                  className="w-full py-2 px-3 border border-slate-200 dark:border-zinc-805 bg-white dark:bg-zinc-900 rounded-lg text-slate-805 dark:text-zinc-300 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5 text-[11px]">
              <button
                onClick={() => setInsertDialog({ type: null, targetUrl: '', altText: '', onSuccess: () => {} })}
                className="px-3.5 py-1.5 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900 rounded-xl font-bold cursor-pointer text-slate-600 dark:text-zinc-350 transition-colors text-[10px]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (insertDialog.targetUrl.trim()) {
                    insertDialog.onSuccess(insertDialog.targetUrl.trim(), insertDialog.altText.trim());
                  }
                  setInsertDialog({ type: null, targetUrl: '', altText: '', onSuccess: () => {} });
                }}
                disabled={!insertDialog.targetUrl.trim()}
                className={`px-3.5 py-1.5 text-white font-extrabold rounded-xl shadow-xxs transition-colors text-[10px] ${
                  insertDialog.targetUrl.trim()
                    ? 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer'
                    : 'bg-indigo-305 dark:bg-zinc-800 cursor-not-allowed opacity-50'
                }`}
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VOICE RECORDING MODAL */}
      <AnimatePresence>
        {showRecordingModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={deleteRecording}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`relative z-10 w-full max-w-sm ${stylePrefs.cardClass} p-8 flex flex-col items-center gap-8 shadow-2xl border border-indigo-500/30 dark:bg-zinc-900`}
            >
              <div className="relative">
                <AnimatePresence>
                  {!isPaused && (
                    <motion.div 
                      initial={{ scale: 1, opacity: 0.5 }}
                      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.2, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 rounded-full bg-rose-500"
                    />
                  )}
                </AnimatePresence>
                <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 relative z-10 ${
                  isPaused ? 'bg-amber-500' : 'bg-rose-500 shadow-lg shadow-rose-500/40'
                }`}>
                  <Mic size={40} className="text-white" />
                </div>
              </div>

              <div className="text-center space-y-1">
                <div className="text-3xl font-condensed font-black tracking-widest text-slate-900 dark:text-white tabular-nums text-center w-full">
                  {formatTime(recordingDuration)}
                </div>
                <div className="text-xs uppercase tracking-[0.2em] font-bold text-rose-500 animate-pulse text-center">
                  {isPaused ? 'Recording Paused' : 'Listening & Recording...'}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={deleteRecording}
                  className="p-4 rounded-full bg-slate-100 dark:bg-zinc-805 text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer group"
                  title="Discard Recording"
                >
                  <Trash2 size={20} className="group-hover:scale-110 transition-transform" />
                </button>

                <button
                  onClick={pauseRecording}
                  className={`p-4 rounded-full border transition-all cursor-pointer group ${
                    isPaused 
                      ? 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100' 
                      : 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100 dark:bg-zinc-805 dark:border-zinc-700 dark:text-indigo-400'
                  }`}
                  title={isPaused ? "Resume Recording" : "Pause Recording"}
                >
                  {isPaused ? <Play size={24} fill="currentColor" /> : <Pause size={24} fill="currentColor" />}
                </button>

                <button
                  onClick={stopRecording}
                  className="p-4 rounded-full bg-indigo-600 text-white shadow-md hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all cursor-pointer group"
                  title="Stop and Save"
                >
                  <Square size={20} fill="currentColor" className="group-hover:rotate-90 transition-transform duration-500" />
                </button>
              </div>

              <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium px-4 text-center leading-relaxed">
                Speak clearly into your microphone. Your voice is being transcribed in real-time and audio is being captured for playback.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CLOUD STORAGE UPSELL DIALOG */}
      <AnimatePresence>
        {showUpsellModal && (
          <div className="fixed inset-0 z-[170] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (!isConnectingProvider) setShowUpsellModal(false); }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="relative z-10 w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-8 flex flex-col gap-8 font-sans overflow-hidden"
            >
              {/* Animated Background Decor */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-rose-500/5 blur-2xl rounded-full translate-y-1/2 -translate-x-1/2" />

              <div className="flex flex-col items-center text-center gap-4 relative z-10">
                <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600">
                  <Cloud size={32} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-condensed font-black tracking-tight text-slate-900 dark:text-white uppercase leading-none">
                    Performance Intercept Active
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-zinc-400 font-medium leading-relaxed px-4">
                    This video is <span className="text-slate-900 dark:text-white font-bold">{(upsellFile?.size || 0) / (1024 * 1024) > 1 ? `${((upsellFile?.size || 0) / (1024 * 1024)).toFixed(1)}MB` : '20MB+'}</span>. 
                    To keep your <span className="text-indigo-600 font-bold uppercase tracking-widest text-[10px]">Knoots</span> blazing fast, lightweight, and free, large media files are stored directly inside your own secure cloud drive.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 relative z-10">
                {[
                  { name: 'Google Drive', icon: <Share2 size={20} />, color: 'hover:bg-blue-50 hover:text-blue-600' },
                  { name: 'OneDrive', icon: <Cloud size={20} />, color: 'hover:bg-indigo-50 hover:text-indigo-600' },
                  { name: 'Mega', icon: <HardDrive size={20} />, color: 'hover:bg-rose-50 hover:text-rose-600' }
                ].map((provider) => (
                  <button
                    key={provider.name}
                    disabled={!!isConnectingProvider}
                    onClick={() => handleProviderConnect(provider.name)}
                    className={`flex flex-col items-center gap-3 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-850/30 transition-all cursor-pointer group ${provider.color} ${isConnectingProvider === provider.name ? 'ring-2 ring-indigo-500 animate-pulse' : ''}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-white dark:bg-zinc-800 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                      {isConnectingProvider === provider.name ? (
                        <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      ) : provider.icon}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-tighter opacity-70 group-hover:opacity-100">{provider.name}</span>
                  </button>
                ))}
              </div>

              <div className="flex flex-col items-center gap-4 relative z-10">
                <button
                  disabled={!!isConnectingProvider}
                  onClick={() => setShowUpsellModal(false)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  Discard and Cancel Upload
                </button>
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-full">
                  <Shield size={12} className="text-emerald-500" />
                  <span className="text-[9px] uppercase tracking-[0.2em] font-black text-slate-400">Zero-Trust Cloud Encryption Enabled</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ASYNC DELETION ACTIVE NOTE CONFIRMATION OVERLAY */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/60 dark:bg-black/85 backdrop-blur-xs font-sans">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-950 border border-slate-205 dark:border-zinc-850 rounded-2xl shadow-xl relative overflow-hidden flex flex-col p-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <span className="font-extrabold text-xs uppercase tracking-widest text-red-500 dark:text-red-400 flex items-center gap-2">
                <Trash2 size={14} />
                Delete Secured Note
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed mb-6">
              Are you sure you want to delete <strong className="text-slate-800 dark:text-zinc-150">"{note?.title || 'this note'}"</strong>? This note will be removed from your list, local storage, and cloud backup. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 text-[11px]">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3.5 py-1.5 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900 rounded-xl font-bold cursor-pointer text-slate-600 dark:text-zinc-350 transition-colors text-[10px]"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (note) {
                    await onDeleteNote(note.id);
                  }
                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl shadow-xxs transition-colors text-[10px] cursor-pointer"
              >
                Delete Note
              </button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showWorkspacePicker && (
          <GoogleWorkspacePicker
            onClose={() => setShowWorkspacePicker(false)}
            onSelect={handleWorkspacePickerSelect}
          />
        )}
      </AnimatePresence>

      {showAIPromptModal && (
        <MultitonePromptModal 
          onClose={() => setShowAIPromptModal(false)}
          initialText={selectedText}
          onInsert={handleInsertText}
        />
      )}

      {showTranslateModal && (
        <LibreTranslateModal
          onClose={() => setShowTranslateModal(false)}
          initialText={selectedText}
          onInsert={handleInsertText}
        />
      )}

    </div>
  );
}
