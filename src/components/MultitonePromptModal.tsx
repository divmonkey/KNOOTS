import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Linkedin, Twitter, MessageSquare, Copy, CheckCircle2 } from 'lucide-react';

interface MultitonePromptModalProps {
  onClose: () => void;
  onInsert: (content: string) => void;
  initialText?: string;
}

export default function MultitonePromptModal({ onClose, onInsert, initialText = '' }: MultitonePromptModalProps) {
  const [sourceText, setSourceText] = useState(initialText);
  const [isGenerating, setIsGenerating] = useState(false);
  const [variants, setVariants] = useState<{ tone: string; icon: React.ReactNode; content: string }[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleGenerate = () => {
    if (!sourceText.trim()) return;
    setIsGenerating(true);
    
    // Simulate AI generation delay
    setTimeout(() => {
      setVariants([
        {
          tone: 'Professional (LinkedIn)',
          icon: <Linkedin size={16} />,
          content: `I'm thrilled to share some insights on this topic. ${sourceText}\n\nCollaboration and continuous feedback are key to unlocking our full potential in the modern workspace. What are your thoughts?\n\n#Leadership #Innovation #Growth`
        },
        {
          tone: 'Punchy (X/Twitter)',
          icon: <Twitter size={16} />,
          content: `Hot take: ${sourceText.substring(0, 100)}${sourceText.length > 100 ? '...' : ''}\n\nIf you aren't optimizing for this daily, you're falling behind. 🚀👇\n\n1/3`
        },
        {
          tone: 'Casual (Threads)',
          icon: <MessageSquare size={16} />,
          content: `hey guys so just thinking about this today... ${sourceText} 😅 honestly it makes complete sense when you break it down like that.`
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

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-3xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
      >
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

        <div className="p-6 flex flex-col gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-widest">Source Hook / Idea</label>
            <textarea
              className="w-full h-24 p-4 text-sm bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none whitespace-pre-wrap placeholder-slate-400"
              placeholder="Enter your core thought, hook, or raw sentence here..."
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
            />
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

          <AnimatePresence>
            {variants.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-zinc-800"
              >
                {variants.map((v, i) => (
                  <div key={i} className="flex flex-col bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden hover:shadow-xl transition-shadow group">
                    <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-zinc-950 border-b border-slate-100 dark:border-zinc-800">
                      <div className="text-slate-500 dark:text-zinc-400">{v.icon}</div>
                      <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">{v.tone}</span>
                    </div>
                    <div className="p-4 flex-1 text-sm text-slate-600 dark:text-zinc-400 whitespace-pre-wrap leading-relaxed">
                      {v.content}
                    </div>
                    <div className="p-3 bg-slate-50/50 dark:bg-zinc-950/50 flex gap-2">
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
                        className="flex-1 py-1.5 flex justify-center items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
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
      </motion.div>
    </div>
  );
}
