import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Linkedin, Facebook, Instagram, MessageSquare, Music, Copy, CheckCircle2 } from 'lucide-react';

interface MultitonePromptModalProps {
  onClose: () => void;
  onInsert: (content: string) => void;
  initialText?: string;
}

export default function MultitonePromptModal({ onClose, onInsert, initialText = '' }: MultitonePromptModalProps) {
  const [sourceText, setSourceText] = useState(initialText);
  const [isImproving, setIsImproving] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [variants, setVariants] = useState<{ id: string; tone: string; icon: React.ReactNode; content: string }[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const initialSuggestions = [
    "Stop scroll-shifting your users. Here is how we fixed dynamic content layout jumps.",
    "Optimistic UI isn't a feature—it's a critical workflow requirement.",
    "Zero-knowledge encryption inside the browser? Yes, it's possible with AES-GCM.",
    "How to build an offline-first app without losing sync indicators.",
    "What if your styling tokens were fully locked at 6px radius?"
  ];

  const moreSuggestions = [
    "Vibrant dark modes and glassmorphism: how modern aesthetics boost web engagement.",
    "WebCrypto AES-GCM pipelines: locking down IndexedDB caches for good.",
    "Say goodbye to layout jumps. The ultimate developer guide to split-pane scaling.",
    "Offline sync shouldn't be mystery code. Here's our background queue implementation.",
    "Designing a premium SaaS dashboard from scratch: color contrast & font rules."
  ];

  const handleImproveHook = () => {
    setIsImproving(true);
    setTimeout(() => {
      setSuggestions(initialSuggestions);
      setIsImproving(false);
    }, 600);
  };

  const handleViewMore = () => {
    setSuggestions(prev => [...prev, ...moreSuggestions]);
  };

  const handleSelectSuggestion = (text: string) => {
    setSourceText(text);
  };

  const handleGenerate = () => {
    if (!sourceText.trim()) return;
    setIsGenerating(true);
    
    // Simulate AI generation delay
    setTimeout(() => {
      setVariants([
        {
          id: 'linkedin',
          tone: 'Professional (LinkedIn)',
          icon: <Linkedin size={16} />,
          content: `I'm thrilled to share some insights on this topic. ${sourceText}\n\nCollaboration and continuous feedback are key to unlocking our full potential in the modern workspace. What are your thoughts?\n\n#Leadership #Innovation #Growth`
        },
        {
          id: 'facebook',
          tone: 'Engaging (Facebook)',
          icon: <Facebook size={16} />,
          content: `Check this out: ${sourceText}\n\nDo you agree with this approach? Let us know in the comments below! 👇\n\n#community #marketing`
        },
        {
          id: 'threads',
          tone: 'Casual (Meta Threads)',
          icon: <MessageSquare size={16} />,
          content: `hey guys so just thinking about this today... ${sourceText} 😅 honestly it makes complete sense when you break it down like that.`
        },
        {
          id: 'instagram',
          tone: 'Visual (Instagram)',
          icon: <Instagram size={16} />,
          content: `Highlight of the day: ${sourceText}\n\nRead more via the link in our bio! 📸✨\n\n#visuals #picoftheday #daily`
        },
        {
          id: 'tiktok',
          tone: 'Script (TikTok)',
          icon: <Music size={16} />,
          content: `[Visual Hook: Text overlay on screen reading "${sourceText.substring(0, 40)}..."]\n\nVoiceover: "Here is a quick breakdown of how this changes everything..."`
        }
      ]);
      setIsGenerating(false);
    }, 1200);
  };

  const copyToClipboard = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleInsertAll = () => {
    const linkedinVal = variants.find(v => v.id === 'linkedin')?.content || '';
    const facebookVal = variants.find(v => v.id === 'facebook')?.content || '';
    const threadsVal = variants.find(v => v.id === 'threads')?.content || '';
    const instagramVal = variants.find(v => v.id === 'instagram')?.content || '';
    const tiktokVal = variants.find(v => v.id === 'tiktok')?.content || '';

    const formattedOutput = `### 📱 Multi-Channel Social Campaign

#### 💼 LinkedIn
${linkedinVal}

---

#### 👥 Facebook
${facebookVal}

---

#### 🧵 Meta Threads
${threadsVal}

---

#### 📸 Instagram
${instagramVal}

---

#### 🎵 TikTok Video Script
${tiktokVal}`;

    onInsert(formattedOutput);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-zinc-900 bg-indigo-50/50 dark:bg-indigo-950/20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Multi-Tone AI Prompt Block</h3>
              <p className="text-[10px] text-slate-500 font-medium">Instantly generate cross-channel variants</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-widest">Source Hook / Idea</label>
              <button 
                onClick={handleImproveHook}
                disabled={isImproving || !sourceText.trim()}
                className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-650 dark:text-indigo-400 text-xs font-bold rounded-lg border border-indigo-100 dark:border-indigo-900/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isImproving ? (
                  <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-indigo-600 rounded-full animate-spin" />
                ) : (
                  <Sparkles size={13} />
                )}
                Improve Hook/Idea
              </button>
            </div>
            
            <textarea
              className="w-full h-24 p-4 text-sm bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none whitespace-pre-wrap placeholder-slate-400 text-slate-800 dark:text-slate-155"
              placeholder="Enter your core thought, hook, or raw sentence here..."
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
            />

            {/* Improved Hook Suggestions List */}
            <AnimatePresence>
              {suggestions.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/80 rounded-2xl p-4 space-y-3"
                >
                  <div className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wide">Optimized Hook Suggestions</div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectSuggestion(s)}
                        className="w-full text-left p-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 hover:border-indigo-400 dark:hover:border-indigo-800 rounded-xl text-xs text-slate-700 dark:text-zinc-300 transition-colors font-medium shadow-2xs hover:shadow-xs block"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  {suggestions.length < 10 && (
                    <button 
                      onClick={handleViewMore}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                    >
                      View More Suggestions
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !sourceText.trim()}
              className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md flex items-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-300 border-t-white dark:border-t-slate-900 rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Generate Variants
                </>
              )}
            </button>
          </div>

          {/* Variants grid */}
          <AnimatePresence>
            {variants.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-zinc-800"
              >
                {variants.map((v, i) => (
                  <div key={v.id} className="flex flex-col bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow group">
                    <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-zinc-950 border-b border-slate-100 dark:border-zinc-800">
                      <div className="text-slate-500 dark:text-zinc-400">{v.icon}</div>
                      <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">{v.tone}</span>
                    </div>
                    {/* Editable inline textarea */}
                    <textarea 
                      className="p-4 flex-1 text-sm text-slate-600 dark:text-zinc-400 bg-transparent resize-none focus:outline-none min-h-[120px] leading-relaxed border-0"
                      value={v.content}
                      onChange={(e) => {
                        const newText = e.target.value;
                        setVariants(prev => prev.map(variant => variant.id === v.id ? { ...variant, content: newText } : variant));
                      }}
                    />
                    <div className="p-3 bg-slate-50/50 dark:bg-zinc-950/50 flex gap-2 border-t border-slate-100 dark:border-zinc-800/80">
                      <button
                        onClick={() => copyToClipboard(v.content, i)}
                        className="flex-1 py-1.5 flex justify-center items-center gap-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 transition-colors"
                      >
                        {copiedIndex === i ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} />}
                        {copiedIndex === i ? 'Copied' : 'Copy'}
                      </button>
                      <button
                        onClick={() => {
                          onInsert(v.content);
                          onClose();
                        }}
                        className="flex-1 py-1.5 flex justify-center items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-650 dark:text-indigo-400 rounded-lg text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                      >
                        Insert
                      </button>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Modal Footer Actions */}
        {variants.length > 0 && (
          <div className="p-4 border-t border-slate-100 dark:border-zinc-900 bg-slate-50 dark:bg-zinc-950/50 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 text-xs font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleInsertAll}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5"
            >
              <Sparkles size={14} />
              INSERT ALL
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
