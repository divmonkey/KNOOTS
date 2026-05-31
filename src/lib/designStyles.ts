/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DesignStyle } from '../types';

export interface StyleProperties {
  id: DesignStyle;
  label: string;
  containerClass: string;
  cardClass: string;
  buttonClass: string;
  inputClass: string;
  badgeClass: string;
  titleFontClass: string;
  editorBgClass: string;
  decorations?: string; // Additional classes for details
}

export const designStyles: StyleProperties[] = [
  {
    id: 'minimalist',
    label: 'Minimalist',
    containerClass: 'bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 font-sans',
    cardClass: 'bg-white dark:bg-zinc-90 w-full border border-zinc-200 dark:border-zinc-850 rounded-xl shadow-none',
    buttonClass: 'border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-xs font-medium cursor-pointer transition-colors',
    inputClass: 'bg-transparent border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-0 focus:border-indigo-500 rounded-lg',
    badgeClass: 'bg-zinc-100 text-zinc-650 dark:bg-zinc-900 dark:text-zinc-400 text-[10px] font-bold rounded-full',
    titleFontClass: 'font-sans font-extrabold tracking-tight',
    editorBgClass: 'bg-white dark:bg-zinc-900'
  },
  {
    id: 'flat',
    label: 'Flat',
    containerClass: 'bg-slate-100 text-slate-850 dark:bg-zinc-950 dark:text-zinc-50 font-sans',
    cardClass: 'bg-white dark:bg-zinc-900 border-2 border-slate-300 dark:border-zinc-800 rounded-none shadow-none',
    buttonClass: 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-none text-xs px-3 py-1.5 cursor-pointer transition-colors',
    inputClass: 'bg-slate-50 dark:bg-zinc-950 border-2 border-slate-300 dark:border-zinc-800 rounded-none text-slate-800 dark:text-slate-200',
    badgeClass: 'bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 text-[10.5px] font-black rounded-none',
    titleFontClass: 'font-sans font-black tracking-normal uppercase',
    editorBgClass: 'bg-white dark:bg-zinc-900'
  },
  {
    id: 'skeuomorphic',
    label: 'Skeuomorphic',
    containerClass: 'bg-[#f2efe9] dark:bg-[#1a1813] text-stone-900 dark:text-stone-100 font-sans [background-image:radial-gradient(#e4dfd3_1px,transparent_1px)] [background-size:16px_16px]',
    cardClass: 'bg-[#faf8f5] dark:bg-[#25221c] border-2 border-stone-300 dark:border-stone-800 rounded-2xl shadow-[inset_0_2px_4px_rgba(255,255,255,0.7),0_10px_20px_-5px_rgba(0,0,0,0.15)] dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.15),0_6px_12px_rgba(0,0,0,0.35)]',
    buttonClass: 'bg-gradient-to-b from-stone-50 to-stone-200 hover:from-stone-100 hover:to-stone-300 dark:from-stone-800 dark:to-stone-900 border border-stone-300 dark:border-stone-850 rounded-xl shadow-[0_3px_5px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.6)] font-bold text-stone-700 dark:text-stone-300 active:translate-y-[1px] cursor-pointer text-xs px-3 py-1.5',
    inputClass: 'bg-white dark:bg-stone-950 border border-stone-350 dark:border-stone-800 rounded-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] focus:ring-1 focus:ring-amber-500',
    badgeClass: 'bg-stone-200 text-stone-750 dark:bg-stone-850 dark:text-stone-400 text-[10px] font-extrabold rounded-lg shadow-inner',
    titleFontClass: 'font-sans font-bold tracking-tight',
    editorBgClass: 'bg-[#fdfcfb] dark:bg-[#201d18]'
  },
  {
    id: 'neumorphic',
    label: 'Neumorphic',
    containerClass: 'bg-[#e0e0e0] dark:bg-[#1e1e1e] text-[#4a4a4a] dark:text-[#c0c0c0] font-sans',
    cardClass: 'bg-[#e0e0e0] dark:bg-[#1e1e1e] rounded-[24px] shadow-[8px_8px_16px_#bebebe,-8px_-8px_16px_#ffffff] dark:shadow-[8px_8px_16px_#131313,-8px_-8px_16px_#292929] border-0',
    buttonClass: 'bg-[#e0e0e0] dark:bg-[#1e1e1e] rounded-xl shadow-[3px_3px_6px_#bebebe,-3px_-3px_6px_#ffffff] dark:shadow-[3px_3px_6px_#131313,-3px_-3px_6px_#292929] active:shadow-[inset_3px_3px_6px_#bebebe,inset_-3px_-3px_6px_#ffffff] dark:active:shadow-[inset_3px_3px_6px_#131313,inset_-3px_-3px_6px_#292929] text-indigo-650 dark:text-indigo-400 font-bold text-xs px-3 py-1.5 cursor-pointer',
    inputClass: 'bg-[#e0e0e0] dark:bg-[#1e1e1e] rounded-xl shadow-[inset_3px_3px_6px_#bebebe,inset_-3px_-3px_6px_#ffffff] dark:shadow-[inset_3px_3px_6px_#131313,inset_-3px_-3px_6px_#292929] border-0 focus:ring-0',
    badgeClass: 'bg-[#d0d0d0] text-[#333] dark:bg-[#2a2a2a] dark:text-[#ccc] text-[9.5px] font-bold rounded-full',
    titleFontClass: 'font-sans font-extrabold tracking-tight text-[#333] dark:text-slate-100',
    editorBgClass: 'bg-[#e0e0e0] dark:bg-[#1e1e1e]'
  },
  {
    id: 'glassmorphism',
    label: 'Glassmorphism',
    containerClass: 'bg-gradient-to-tr from-[#fbc2eb] via-[#a18cd1] to-[#e6e6fa] dark:from-[#2e0854] dark:via-[#150a30] dark:to-[#04122d] text-indigo-950 dark:text-indigo-100 font-sans',
    cardClass: 'backdrop-blur-xl bg-white/20 dark:bg-black/30 border border-white/30 dark:border-white/10 rounded-3xl shadow-xl',
    buttonClass: 'backdrop-blur-md bg-white/30 dark:bg-white/10 hover:bg-white/40 dark:hover:bg-white/15 text-indigo-950 dark:text-white border border-white/20 rounded-xl cursor-pointer text-xs px-3 py-1.5 transition-all shadow-xs',
    inputClass: 'backdrop-blur-md bg-white/15 dark:bg-black/25 border border-white/25 dark:border-white/10 text-indigo-950 dark:text-white rounded-xl focus:border-white/50 focus:ring-0',
    badgeClass: 'bg-white/30 text-indigo-900 dark:bg-white/5 dark:text-indigo-300 text-[10px] font-bold rounded-full border border-white/10',
    titleFontClass: 'font-sans font-bold tracking-tight',
    editorBgClass: 'bg-white/10 dark:bg-black/20'
  },
  {
    id: 'brutalist',
    label: 'Brutalist',
    containerClass: 'bg-[#f0f0f0] dark:bg-[#121212] text-black dark:text-white font-mono',
    cardClass: 'bg-white dark:bg-zinc-900 border-4 border-black dark:border-zinc-100 rounded-none shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] dark:shadow-[5px_5px_0px_0px_rgba(255,255,255,1)]',
    buttonClass: 'bg-[#ff5555] text-white hover:bg-black dark:hover:bg-white dark:hover:text-black border-2 border-black dark:border-white rounded-none font-black uppercase text-xs tracking-wider px-3 py-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer transition-all',
    inputClass: 'bg-white dark:bg-zinc-950 border-2 border-black dark:border-white rounded-none font-mono py-1.5 px-3 focus:outline-none text-black dark:text-white',
    badgeClass: 'bg-black text-white dark:bg-white dark:text-black text-[10px] font-black uppercase rounded-none tracking-wider px-2 py-0.5 border border-black',
    titleFontClass: 'font-mono font-black tracking-normal uppercase text-lg',
    editorBgClass: 'bg-white dark:bg-zinc-900'
  },
  {
    id: 'material',
    label: 'Material Design',
    containerClass: 'bg-slate-50 text-slate-800 dark:bg-zinc-950 dark:text-zinc-100 font-sans',
    cardClass: 'bg-white dark:bg-zinc-90 w-full rounded-2xl shadow-md border-0',
    buttonClass: 'bg-[#6200ee] hover:bg-[#5000c8] dark:bg-teal-555 dark:hover:bg-teal-600 text-white rounded-full uppercase tracking-wider font-extrabold text-[10px] px-4 py-2 hover:shadow-lg active:scale-98 transition-all cursor-pointer',
    inputClass: 'bg-slate-150/60 dark:bg-zinc-900/60 border-b-2 border-slate-350 dark:border-zinc-750 focus:border-[#6200ee] dark:focus:border-teal-500 transition-colors rounded-t-lg rounded-b-none',
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 text-[9px] font-extrabold uppercase rounded-full px-2.5 py-1',
    titleFontClass: 'font-sans font-bold tracking-tight',
    editorBgClass: 'bg-white dark:bg-zinc-900'
  },
  {
    id: 'metro',
    label: 'Metro (Tiles)',
    containerClass: 'bg-[#1d1d1d] text-white font-sans',
    cardClass: 'bg-[#1f1f1f] border-0 rounded-none shadow-none text-white',
    buttonClass: 'bg-[#0078d7] hover:bg-[#106ebe] text-white rounded-none border-0 text-xs px-4 py-2 font-light uppercase tracking-wide cursor-pointer transition-colors',
    inputClass: 'bg-[#2d2d2d] border-2 border-[#555] hover:border-[#0078d7] text-white rounded-none focus:border-[#0078d7] focus:ring-0',
    badgeClass: 'bg-[#3e3e3e] text-white text-[10px] font-semibold rounded-none px-2 py-0.5',
    titleFontClass: 'font-sans font-light tracking-wide uppercase',
    editorBgClass: 'bg-[#1a1a1a]'
  },
  {
    id: 'retro',
    label: 'Retro (Terminal)',
    containerClass: 'bg-[#2b2b2a] text-[#33ff33] font-mono [background-image:linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.04),rgba(0,255,0,0.02),rgba(0,0,255,0.04))] [background-size:100%_4px,3px_100%]',
    cardClass: 'bg-[#181817] border-2 border-[#33ff33] rounded-sm shadow-[0_0_15px_rgba(51,255,51,0.25)]',
    buttonClass: 'bg-[#2b2b2a] border border-[#33ff33] hover:bg-[#33ff33] hover:text-[#181817] text-[#33ff33] rounded-sm font-mono text-[10px] uppercase tracking-widest px-2.5 py-1 cursor-pointer transition-all',
    inputClass: 'bg-black border border-[#33ff33] text-[#33ff33] font-mono focus:ring-1 focus:ring-[#33ff33]',
    badgeClass: 'border border-[#33ff33] text-[#33ff33] text-[9px] font-mono px-2 py-0.5 rounded-sm',
    titleFontClass: 'font-mono font-bold tracking-widest uppercase text-[#33ff33]',
    editorBgClass: 'bg-[#101010]'
  },
  {
    id: 'cyberpunk',
    label: 'Cyberpunk',
    containerClass: 'bg-[#0a0512] text-[#00ffcc] font-mono',
    cardClass: 'bg-[#120c1f] border-2 border-[#ff0055] rounded-none shadow-[4px_4px_0_#00ffcc] relative before:content-[""] before:absolute before:top-0 before:left-0 before:w-1.5 before:h-1.5 before:bg-[#ff0055]',
    buttonClass: 'bg-[#fff000] hover:bg-[#ff0055] text-black hover:text-white border-0 font-extrabold uppercase rounded-none px-3.5 py-1.5 skew-x-[-8deg] text-xs shadow-[2px_2px_0_#ff0055] cursor-pointer transition-colors',
    inputClass: 'bg-black border border-[#00ffcc] text-[#00ffcc] focus:border-[#ff0055] rounded-none focus:ring-0',
    badgeClass: 'bg-[#ff0055]/20 text-[#ff0055] border border-[#ff0055] text-[10px] font-bold rounded-none px-2 py-0.5',
    titleFontClass: 'font-mono font-black tracking-widest text-[#00ffcc] uppercase',
    editorBgClass: 'bg-[#0c0716]'
  },
  {
    id: 'futuristic',
    label: 'Futuristic HUD',
    containerClass: 'bg-[#040914] text-[#00d2ff] font-sans [background-image:linear-gradient(to_bottom,rgba(0,210,255,0.03)_1px,transparent_1px),linear-gradient(to_right,rgba(0,210,255,0.03)_1px,transparent_1px)] [background-size:40px_40px]',
    cardClass: 'bg-[rgba(5,18,35,0.8)] border border-[#00d2ff]/40 rounded-2xl shadow-[0_0_15px_rgba(0,210,255,0.1),inset_0_0_10px_rgba(0,210,255,0.08)] relative overflow-hidden',
    buttonClass: 'bg-transparent hover:bg-[#00d2ff]/15 text-[#00d2ff] border border-[#00d2ff]/50 hover:border-[#00d2ff] rounded-lg tracking-wider text-[11px] font-mono uppercase px-3 py-1.5 shadow-[0_0_8px_rgba(0,210,255,0.05)] cursor-pointer transition-all',
    inputClass: 'bg-[#030d19] border border-[#00d2ff]/35 text-[#00d2ff] focus:border-[#00d2ff] rounded-lg focus:shadow-[0_0_8px_rgba(0,210,255,0.2)] focus:ring-0',
    badgeClass: 'bg-[#00d2ff]/10 text-[#00d2ff] border border-[#00d2ff]/25 text-[10px] font-mono rounded-md px-2 py-0.5',
    titleFontClass: 'font-sans font-bold tracking-widest text-white uppercase',
    editorBgClass: 'bg-[#040b17]/85'
  },
  {
    id: 'organic',
    label: 'Organic (Sage)',
    containerClass: 'bg-[#f4f2ea] dark:bg-[#1a1c18] text-[#3c4135] dark:text-[#cbd2bf] font-sans',
    cardClass: 'bg-[#e6ebd9]/55 dark:bg-[#252821]/60 border border-[#c2cdc0] dark:border-[#384334] rounded-[24px] shadow-sm',
    buttonClass: 'bg-[#5b6b55] hover:bg-[#4a5845] text-[#eed] dark:text-[#eed] rounded-full text-xs font-serif px-3.5 py-1.5 cursor-pointer transition-colors shadow-xs',
    inputClass: 'bg-[#fafaf6] dark:bg-[#1a1d17] border border-[#bbc8b5] dark:border-[#3a4435] rounded-xl focus:border-[#5b6b55]',
    badgeClass: 'bg-[#dfebd6] text-[#4d5c48] dark:bg-[#1f281b] dark:text-[#a8b89e] text-[9.5px] font-extrabold rounded-full px-2.5 py-0.5',
    titleFontClass: 'font-serif font-black italic tracking-tight text-[#45503f] dark:text-[#cbd2bf]',
    editorBgClass: 'bg-[#fafaf7] dark:bg-[#20231d]'
  },
  {
    id: 'corporate',
    label: 'Corporate',
    containerClass: 'bg-slate-50 text-slate-800 dark:bg-zinc-950 dark:text-zinc-100 font-sans',
    cardClass: 'bg-white dark:bg-zinc-90 border border-slate-200 dark:border-zinc-850 rounded-lg shadow-xs',
    buttonClass: 'bg-slate-800 hover:bg-slate-900 text-white rounded-md text-xs font-semibold px-3 py-1.5 cursor-pointer transition-colors',
    inputClass: 'bg-white dark:bg-zinc-950 border border-slate-350 dark:border-zinc-800 rounded-md text-xs',
    badgeClass: 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-350 text-[10px] font-bold rounded-md px-2 py-0.5',
    titleFontClass: 'font-sans font-bold text-slate-900 dark:text-white',
    editorBgClass: 'bg-white dark:bg-zinc-900'
  },
  {
    id: 'artistic',
    label: 'Artistic Fluid',
    containerClass: 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-100 via-rose-100 to-indigo-100 dark:from-zinc-950 dark:via-[#221021] dark:to-zinc-900 text-rose-955 dark:text-rose-100 font-sans',
    cardClass: 'bg-white/45 dark:bg-zinc-900/35 border-2 border-dashed border-rose-350 dark:border-rose-950/60 rounded-[30px] shadow-lg',
    buttonClass: 'bg-gradient-to-r from-rose-500 to-indigo-500 hover:from-rose-600 hover:to-indigo-600 text-white rounded-2xl font-bold px-3.5 py-1.5 rotate-1 hover:rotate-0 transition-transform cursor-pointer shadow-md',
    inputClass: 'bg-white/60 dark:bg-zinc-900/30 border border-indigo-250 dark:border-zinc-820 rounded-[22px]',
    badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-350 text-[9.5px] font-black rounded-full px-2.5 py-0.5',
    titleFontClass: 'font-serif font-black italic tracking-wide text-rose-950 dark:text-rose-100',
    editorBgClass: 'bg-white/30 dark:bg-zinc-900/20'
  },
  {
    id: 'dark_mode',
    label: 'Dark Mode Master',
    containerClass: 'bg-zinc-950 text-zinc-100 font-sans',
    cardClass: 'bg-zinc-900 border border-zinc-850 rounded-2xl shadow-xl',
    buttonClass: 'bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700 rounded-xl px-3 py-1.5 cursor-pointer text-xs font-semibold',
    inputClass: 'bg-zinc-950 border border-zinc-805 rounded-xl text-zinc-100 focus:border-zinc-650',
    badgeClass: 'bg-zinc-800 text-zinc-400 text-[10px] font-bold rounded-lg px-2',
    titleFontClass: 'font-sans font-extrabold tracking-tight',
    editorBgClass: 'bg-zinc-900'
  },
  {
    id: 'light_mode',
    label: 'Light Mode Pro',
    containerClass: 'bg-[#f8fafc] text-slate-900 font-sans',
    cardClass: 'bg-white border border-slate-200/80 rounded-2xl shadow-sm',
    buttonClass: 'bg-slate-100 hover:bg-slate-200 text-slate-850 border border-slate-205 rounded-xl px-3 py-1.5 cursor-pointer text-xs font-semibold',
    inputClass: 'bg-white border border-slate-250 text-slate-900 rounded-xl',
    badgeClass: 'bg-slate-200 text-slate-650 text-[10px] font-bold rounded-full px-2.5 py-0.5',
    titleFontClass: 'font-sans font-extrabold tracking-tight',
    editorBgClass: 'bg-white'
  },
  {
    id: 'gradient_heavy',
    label: 'Gradient Heavy',
    containerClass: 'bg-gradient-to-tr from-[#ff9a9e] via-[#fecfef] to-[#a1c4fd] dark:from-[#350d54] dark:via-[#160e32] dark:to-[#04112e] text-zinc-900 dark:text-zinc-100 font-sans',
    cardClass: 'bg-white/75 dark:bg-black/45 border-0 rounded-3xl shadow-2xl backdrop-blur-md',
    buttonClass: 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-505 hover:opacity-90 text-white rounded-full font-extrabold px-4 py-2 cursor-pointer text-xs transition-opacity shadow-md',
    inputClass: 'bg-white/50 dark:bg-black/35 border border-purple-250 dark:border-purple-900/35 rounded-2xl text-zinc-900 dark:text-white',
    badgeClass: 'bg-white/40 dark:bg-purple-950/40 text-purple-900 dark:text-purple-300 text-[10px] font-extrabold rounded-full px-2.5',
    titleFontClass: 'font-sans font-black tracking-tight',
    editorBgClass: 'bg-white/40 dark:bg-black/20'
  },
  {
    id: 'monochrome',
    label: 'Monochrome',
    containerClass: 'bg-white text-black dark:bg-black dark:text-white font-mono',
    cardClass: 'bg-white dark:bg-black border border-black dark:border-zinc-800 rounded-none shadow-none',
    buttonClass: 'border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-none text-xs px-3 py-1.5 font-bold cursor-pointer uppercase transition-colors',
    inputClass: 'bg-white dark:bg-black border border-gray-400 dark:border-zinc-800 rounded-none',
    badgeClass: 'border border-black dark:border-white text-black dark:text-white text-[9px] font-bold rounded-none px-2',
    titleFontClass: 'font-mono font-black uppercase text-base',
    editorBgClass: 'bg-white dark:bg-black'
  },
  {
    id: 'typographic',
    label: 'Typographic (Serif)',
    containerClass: 'bg-[#fdfdfd] text-[#111111] dark:bg-[#111111] dark:text-[#eeeeee] font-serif',
    cardClass: 'bg-transparent border-t border-b border-black dark:border-zinc-800 rounded-none py-6 shadow-none',
    buttonClass: 'bg-transparent underline text-xs font-serif hover:text-indigo-650 dark:hover:text-indigo-400 p-1 cursor-pointer font-bold',
    inputClass: 'bg-transparent border-0 border-b border-gray-300 dark:border-zinc-800 rounded-none font-serif',
    badgeClass: 'bg-black text-white dark:bg-white dark:text-black text-[9px] font-serif px-2',
    titleFontClass: 'font-serif font-black tracking-tight text-xl italic',
    editorBgClass: 'bg-transparent'
  },
  {
    id: 'illustrated',
    label: 'Illustrated (Notebook)',
    containerClass: 'bg-[#fdf8f0] dark:bg-[#1e1d1a] text-[#554c3c] dark:text-[#d3cabf] font-sans [background-image:radial-gradient(#eeddb9_1.5px,transparent_1.5px)] [background-size:24px_24px]',
    cardClass: 'bg-white/95 dark:bg-zinc-900/90 border-3 border-solid border-[#eeddb9] dark:border-[#3c3629] rounded-[20px] shadow-[4px_4px_0_#9a8a65] dark:shadow-[3px_3px_0_#2b271d]',
    buttonClass: 'bg-[#f0c38f] hover:bg-[#ebbb82] dark:bg-[#a67c52] text-zinc-900 dark:text-zinc-100 rounded-xl border-b-4 border-solid border-[#92663a] font-bold px-3 py-1.5 active:border-b active:translate-y-0.5 cursor-pointer text-xs transition-all',
    inputClass: 'bg-white dark:bg-zinc-950 border-2 border-[#eeddc0] dark:border-[#4a4234] rounded-xl',
    badgeClass: 'bg-[#ebd4be] text-[#704d2b] text-[9.5px] font-black rounded-lg px-2 py-0.5',
    titleFontClass: 'font-sans font-extrabold tracking-tight text-[#634e35] dark:text-[#d3cabf]',
    editorBgClass: 'bg-white/95 dark:bg-zinc-900/90'
  },
  {
    id: 'photographic',
    label: 'Photographic Mood',
    containerClass: 'bg-[url("https://images.unsplash.com/photo-1542281286-9e0a16bb7366?auto=format&fit=crop&q=80&w=1200")] bg-cover bg-center text-white font-sans',
    cardClass: 'backdrop-blur-lg bg-black/45 border border-white/20 rounded-3xl shadow-2xl',
    buttonClass: 'bg-white/10 hover:bg-white/20 text-white border border-white/25 rounded-xl cursor-pointer text-xs px-3 py-1.5 backdrop-blur-xs transition-all shadow-xs',
    inputClass: 'bg-black/35 border border-white/20 text-white rounded-xl focus:border-white/50 focus:ring-0',
    badgeClass: 'bg-white/20 text-white text-[10px] font-semibold rounded-full px-2',
    titleFontClass: 'font-sans font-extrabold tracking-tight text-white shadow-sm',
    editorBgClass: 'bg-black/35'
  },
  {
    id: '3d_isometric',
    label: '3D / Isometric',
    containerClass: 'bg-[#eaebef] dark:bg-[#1d2025] text-slate-800 dark:text-zinc-200 font-sans',
    cardClass: 'bg-white dark:bg-[#282b30] border-2 border-[#ccd0d9] dark:border-[#141517] rounded-2xl shadow-[5px_5px_0px_0px_#ccd0d9,10px_10px_15px_-5px_rgba(0,0,0,0.1)] dark:shadow-[5px_5px_0px_0px_#101113] translate-y-[-4px] translate-x-[-4px] hover:translate-y-0 hover:translate-x-0 transition-all duration-300',
    buttonClass: 'bg-white dark:bg-[#2c2f35] border-2 border-slate-700 dark:border-[#151617] text-slate-800 dark:text-zinc-100 rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,0.95)] hover:bg-slate-50 cursor-pointer active:translate-y-0.5 active:translate-x-0.5 active:shadow-[1px_1px_0px_rgba(0,0,0,0.95)] text-xs px-3 py-1.5 transition-all',
    inputClass: 'bg-white dark:bg-[#1f2125] border-2 border-slate-300 dark:border-zinc-800 rounded-xl shadow-[inset_2px_2px_4px_rgba(0,0,0,0.06)]',
    badgeClass: 'bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 text-[10px] font-black rounded-lg border border-slate-350 dark:border-zinc-700',
    titleFontClass: 'font-sans font-black tracking-wide uppercase',
    editorBgClass: 'bg-white dark:bg-[#282b30]'
  },
  {
    id: 'hand_drawn',
    label: 'Hand-drawn Ink',
    containerClass: 'bg-[#fafaf0] text-[#2c2c26] font-sans',
    cardClass: 'bg-white border-2 border-[#3c3c34] rounded-[15px_30px_15px_24px]/[24px_15px_22px_15px] shadow-[4px_5px_1px_rgba(60,60,52,0.15)]',
    buttonClass: 'border-2 border-[#3c3c34] rounded-[10px_16px_10px_12px]/[14px_10px_14px_10px] hover:bg-amber-50/55 text-slate-800 font-bold px-3 py-1.5 text-xs cursor-pointer transition-transform duration-100',
    inputClass: 'bg-white border-2 border-[#3c3c34] rounded-[10px_18px_10px_14px]',
    badgeClass: 'border border-[#3c3c34] text-[#3c3c34] text-[9.5px] font-bold rounded-full px-2',
    titleFontClass: 'font-serif font-black tracking-tight text-slate-805',
    editorBgClass: 'bg-white'
  },
  {
    id: 'geometric',
    label: 'Geometric Grid',
    containerClass: 'bg-[#0f172a] text-[#38bdf8] font-sans [background-image:radial-gradient(#1e293b_1.5px,transparent_1.5px)] [background-size:24px_24px]',
    cardClass: 'bg-[#1e293b] border border-[#38bdf8]/35 rounded-none shadow-[4px_4px_0_0_#38bdf8] [clip-path:polygon(100%_0,100%_calc(100%_-_12px),calc(100%_-_12px)_100%,0_100%,0_0)]',
    buttonClass: 'bg-[#38bdf8] hover:bg-[#0ea5e9] text-slate-950 border-0 rounded-none font-black uppercase text-[11px] tracking-wider px-3.5 py-1.5 cursor-pointer transition-colors',
    inputClass: 'bg-[#0f172a] border border-[#38bdf8]/40 text-[#38bdf8] focus:border-[#38bdf8] rounded-none focus:ring-0',
    badgeClass: 'bg-[#38bdf8]/20 border border-[#38bdf8]/30 text-[#38bdf8] text-[9.5px] font-mono rounded-none',
    titleFontClass: 'font-mono font-extrabold uppercase tracking-widest text-[#3aebff]',
    editorBgClass: 'bg-[#182335]'
  },
  {
    id: 'abstract',
    label: 'Abstract Modern',
    containerClass: 'bg-[#eef9ff] dark:bg-[#000a12] text-teal-950 dark:text-teal-100 font-sans',
    cardClass: 'bg-white dark:bg-[#071321] border-b-6 border-r-6 border-l border-t border-teal-500/80 rounded-br-none rounded-tl-none rounded-2xl shadow-xl',
    buttonClass: 'bg-teal-500 hover:bg-teal-600 text-white rounded-[15px_4px] font-bold text-xs px-3.5 py-1.5 cursor-pointer transition-all hover:scale-103',
    inputClass: 'bg-teal-50/50 dark:bg-teal-950/20 border-2 border-teal-200/60 rounded-xl focus:border-teal-500',
    badgeClass: 'bg-[#e6fbf4] text-[#1b735c] dark:bg-teal-950/30 dark:text-teal-350 text-[10px] font-black rounded-tl-lg rounded-br-lg px-2',
    titleFontClass: 'font-sans font-black italic tracking-wide text-teal-900 dark:text-teal-100',
    editorBgClass: 'bg-white dark:bg-[#071220]'
  },
  {
    id: 'vintage',
    label: 'Vintage Typewriter',
    containerClass: 'bg-[#ebdcb9] text-[#3e2723] font-serif',
    cardClass: 'bg-[#f4e6c3] border-3 border-[#3e2723] rounded-sm shadow-[6px_6px_0px_#3e2723]',
    buttonClass: 'bg-[#8d6e63] hover:bg-[#5d4037] text-white border border-[#3e2723] rounded-sm font-serif text-xs px-3 py-1.cursor-pointer transition-colors shadow-xs',
    inputClass: 'bg-[#ebdcb9] border-2 border-[#3e2723] text-[#3e2723] font-serif uppercase-none',
    badgeClass: 'border border-[#3e2723] text-[#3e2723] text-[9.5px] font-serif px-2 font-black',
    titleFontClass: 'font-serif font-black tracking-normal uppercase text-[#3e2723]',
    editorBgClass: 'bg-[#f4e6c3]'
  },
  {
    id: 'high_tech',
    label: 'High Tech Slate',
    containerClass: 'bg-[#0a0a0f] text-[#39ff14] font-mono',
    cardClass: 'bg-[#0d1017] border border-[#1f242e] rounded-xl shadow-[inset_0_1px_3px_rgba(255,255,255,0.03),0_0_15px_rgba(57,255,20,0.08)] relative before:content-[""] before:absolute before:right-0 before:top-0 before:w-1.5 before:h-1.5 before:bg-[#39ff14]',
    buttonClass: 'bg-[#151c2c] hover:bg-[#39ff14]/20 text-[#39ff14] border border-[#39ff14]/50 rounded-lg text-xs font-mono px-3 py-1.5 cursor-pointer shadow-xs transition-colors',
    inputClass: 'bg-[#06080c] border border-[#1b2029] focus:border-[#39ff14] text-[#39ff14] rounded-lg focus:ring-0 font-mono',
    badgeClass: 'bg-[#39ff14]/10 text-[#39ff14] border border-[#39ff14]/30 text-[9.5px] font-mono rounded-lg px-1.5',
    titleFontClass: 'font-mono font-bold tracking-widest text-white uppercase',
    editorBgClass: 'bg-[#0d1017]'
  },
  {
    id: 'playful',
    label: 'Playful Bubble',
    containerClass: 'bg-[#ffeef3] text-[#ff4b73] font-sans',
    cardClass: 'bg-white border-3 border-[#ff4b73] rounded-[26px] shadow-[4px_4px_0_#ffc4d1]',
    buttonClass: 'bg-[#ff4b73] hover:bg-[#f32d5b] text-white rounded-full font-black text-xs px-4 py-2 cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-xs',
    inputClass: 'bg-[#fff5f7] border-3 border-[#ffc4d1] text-[#ff4b73] rounded-2xl focus:border-[#ff4b73]',
    badgeClass: 'bg-[#ffd3dd] text-[#ff4b73] text-[10px] font-black rounded-full px-2.5 py-0.5',
    titleFontClass: 'font-sans font-black tracking-tight text-[#f0325d]',
    editorBgClass: 'bg-white'
  },
  {
    id: 'elegant',
    label: 'Elegant Serif',
    containerClass: 'bg-[#faf6f1] dark:bg-[#11100f] text-[#1a120c] dark:text-[#f3dfca] font-serif',
    cardClass: 'bg-[#ffffff] dark:bg-[#171614] border border-[#e7ded4] dark:border-[#2b241e] rounded-xl shadow-md',
    buttonClass: 'bg-[#3c2a21] hover:bg-[#1a120c] text-white hover:text-[#f3dfca] rounded-none font-serif tracking-widest text-[9.5px] uppercase px-4 py-2 cursor-pointer transition-colors shadow-xs',
    inputClass: 'bg-[#faf6f1] dark:bg-[#11100f] border border-[#cbd2ce] dark:border-[#3a332a] text-stone-900 dark:text-stone-150 rounded-none focus:outline-none focus:border-stone-500',
    badgeClass: 'bg-[#eae0d5] text-[#4f382a] dark:bg-[#201d19] dark:text-[#f3dfca] text-[9.5px] font-bold rounded-none px-2',
    titleFontClass: 'font-serif font-semibold tracking-tight text-stone-900 dark:text-white',
    editorBgClass: 'bg-[#ffffff] dark:bg-[#171614]'
  },
  {
    id: 'luxury',
    label: 'Luxury Velvet',
    containerClass: 'bg-[#0c0d12] text-[#c5a881] font-serif',
    cardClass: 'bg-[#14161b] border-t-2 border-b-2 border-r border-l border-[#c5a881] rounded-none shadow-[0_12px_36px_rgba(0,0,0,0.55)]',
    buttonClass: 'bg-gradient-to-r from-[#c5a881] to-[#b19267] hover:from-[#d6ba94] hover:to-[#c5a881] text-black rounded-none font-serif font-black tracking-widest text-[9px] uppercase px-4 py-3 shadow-md cursor-pointer duration-150',
    inputClass: 'bg-[#0d0e12] border border-[#c5a881]/25 text-white focus:border-[#c5a881] rounded-none focus:ring-0',
    badgeClass: 'border border-[#c5a881]/40 text-[#c5a881] text-[9px] font-serif tracking-widest uppercase rounded-none px-2',
    titleFontClass: 'font-serif font-extrabold tracking-widest uppercase text-[#c5a881]',
    editorBgClass: 'bg-[#14161b]'
  },
  {
    id: 'industrial',
    label: 'Industrial Steel',
    containerClass: 'bg-[#2a2d2d] text-[#f7931f] font-mono',
    cardClass: 'bg-[#1f2121] border-2 border-[#383d3c] rounded-none shadow-inner relative overflow-hidden before:content-[""] before:absolute before:bottom-0 before:left-0 before:w-full before:h-1 before:bg-gradient-to-r before:from-orange-500 before:via-yellow-405 before:to-orange-500',
    buttonClass: 'bg-[#f7931f] hover:bg-[#df8011] text-[#151515] rounded-none border-t border-[#ffb85d] font-black uppercase text-[10px] tracking-widest px-3 py-1.5 cursor-pointer transition-colors',
    inputClass: 'bg-[#141616] border border-[#383d3c] text-stone-100 rounded-none focus:border-[#f7931f] font-mono',
    badgeClass: 'bg-[#f7931f]/20 border border-[#f7931f]/35 text-[#f7931f] text-[9px] font-mono rounded-none',
    titleFontClass: 'font-mono font-black tracking-widest text-orange-500 uppercase',
    editorBgClass: 'bg-[#1e2020]'
  }
];

export function getStyle(id?: DesignStyle): StyleProperties {
  const s = designStyles.find(item => item.id === id);
  return s || designStyles[0];
}
