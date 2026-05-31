import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Globe, X, ArrowRightLeft, Sparkles } from 'lucide-react';

interface LibreTranslateModalProps {
  onClose: () => void;
  onInsert: (content: string) => void;
  initialText?: string;
}

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' }
];

export default function LibreTranslateModal({ onClose, onInsert, initialText = '' }: LibreTranslateModalProps) {
  const [sourceText, setSourceText] = useState(initialText);
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('es');
  const [isTranslating, setIsTranslating] = useState(false);

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;
    setIsTranslating(true);
    
    try {
      if (sourceLang === targetLang) {
          setTranslatedText(sourceText);
          setIsTranslating(false);
          return;
      }

      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang === 'auto' ? 'auto' : sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(sourceText)}`;
      const res = await fetch(url);
      
      if (!res.ok) {
         throw new Error("Translation failed");
      }
      
      const data = await res.json();
      let translated = "";
      if (data && data[0]) {
        for (let i = 0; i < data[0].length; i++) {
          if (data[0][i][0]) translated += data[0][i][0];
        }
      }
      setTranslatedText(translated);
    } catch (err) {
      console.error(err);
      setTranslatedText("Translation failed. Please try again.");
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-zinc-900 bg-sky-50/50 dark:bg-sky-950/20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <Globe size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Translate Note</h3>
              <p className="text-[10px] text-slate-500 font-medium">Powered by LibreTranslate</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between bg-slate-50 dark:bg-zinc-900 p-2 rounded-xl border border-slate-200 dark:border-zinc-800">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-500 px-2 uppercase tracking-wide">Source</label>
              <select 
                value={sourceLang} 
                onChange={(e) => setSourceLang(e.target.value)}
                className="w-full bg-transparent text-sm font-semibold text-slate-800 dark:text-zinc-200 focus:outline-none p-2 border-r border-slate-200 dark:border-zinc-800"
              >
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
              </select>
            </div>
            
            <button 
              onClick={() => {
                setSourceLang(targetLang);
                setTargetLang(sourceLang);
                setSourceText(translatedText);
                setTranslatedText('');
              }}
              className="p-3 mx-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/30 rounded-full transition-colors"
            >
              <ArrowRightLeft size={16} />
            </button>
            
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-500 px-2 uppercase tracking-wide">Target</label>
              <select 
                value={targetLang} 
                onChange={(e) => setTargetLang(e.target.value)}
                className="w-full bg-transparent text-sm font-semibold text-slate-800 dark:text-zinc-200 focus:outline-none p-2"
              >
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-64">
            <textarea
              className="w-full h-full p-4 text-sm bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none whitespace-pre-wrap"
              placeholder="Text to translate..."
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
            />
            <div className="w-full h-full p-4 text-sm bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-850 rounded-xl overflow-y-auto whitespace-pre-wrap text-slate-700 dark:text-zinc-300">
              {isTranslating ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-slate-300 border-t-sky-600 rounded-full animate-spin" />
                </div>
              ) : translatedText ? (
                translatedText
              ) : (
                <span className="text-slate-400 italic">Translation will appear here...</span>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={handleTranslate}
              disabled={isTranslating || !sourceText.trim()}
              className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              <Globe size={16} />
              Translate
            </button>
            
            {translatedText && (
              <button
                onClick={() => {
                  onInsert(translatedText);
                  onClose();
                }}
                className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md flex items-center gap-2"
              >
                <Sparkles size={16} />
                Insert Response
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
