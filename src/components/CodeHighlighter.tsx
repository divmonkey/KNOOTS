/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SyntaxTheme } from '../types';

interface CodeHighlighterProps {
  key?: React.Key;
  code: string;
  language?: string;
  theme: SyntaxTheme;
}

export default function CodeHighlighter({ code, language = 'javascript', theme }: CodeHighlighterProps) {
  const getThemeClasses = (t: SyntaxTheme) => {
    switch (t) {
      case 'github-light':
        return {
          bg: 'bg-[#f6f8fa] border border-gray-250',
          text: 'text-[#24292f]',
          comment: 'text-[#6e7781] italic',
          keyword: 'text-[#cf222e] font-semibold',
          string: 'text-[#0a3069]',
          number: 'text-[#0550ae]',
          func: 'text-[#8250df]',
          labelBg: 'bg-gray-200 text-gray-700'
        };
      case 'monokai':
        return {
          bg: 'bg-[#272822] border border-stone-800',
          text: 'text-[#f8f8f2]',
          comment: 'text-[#75715e] italic',
          keyword: 'text-[#f92672] font-semibold',
          string: 'text-[#e6db74]',
          number: 'text-[#ae81ff]',
          func: 'text-[#66d9ef]',
          labelBg: 'bg-[#3e3d32] text-amber-100'
        };
      case 'synthwave':
        return {
          bg: 'bg-[#2b213a] border border-[#ff0055]/20',
          text: 'text-[#fede5d]',
          comment: 'text-[#848bb3] italic',
          keyword: 'text-[#f92aad] font-semibold',
          string: 'text-[#36f9f6]',
          number: 'text-[#f97e72]',
          func: 'text-[#fe4450]',
          labelBg: 'bg-[#ff0055]/20 text-[#ff0055]'
        };
      case 'solarized':
        return {
          bg: 'bg-[#002b36] border border-[#073642]',
          text: 'text-[#839496]',
          comment: 'text-[#586e75] italic',
          keyword: 'text-[#859900] font-semibold',
          string: 'text-[#2aa198]',
          number: 'text-[#cb4b16]',
          func: 'text-[#268bd2]',
          labelBg: 'bg-[#073642] text-[#93a1a1]'
        };
      case 'github-dark':
        return {
          bg: 'bg-[#0d1117] border border-[#21262d]',
          text: 'text-[#c9d1d9]',
          comment: 'text-[#8b949e] italic',
          keyword: 'text-[#ff7b72] font-semibold',
          string: 'text-[#a5d6ff]',
          number: 'text-[#79c0ff]',
          func: 'text-[#d2a8ff]',
          labelBg: 'bg-[#161b22] text-[#c9d1d9]'
        };
      case 'dracula':
      default:
        return {
          bg: 'bg-[#282a36] border border-[#44475a]',
          text: 'text-[#f8f8f2]',
          comment: 'text-[#6272a4] italic',
          keyword: 'text-[#ff79c6] font-semibold',
          string: 'text-[#f1fa8c]',
          number: 'text-[#bd93f9]',
          func: 'text-[#50fa7b]',
          labelBg: 'bg-[#44475a] text-[#f8f8f2]'
        };
    }
  };

  const themeStyle = getThemeClasses(theme);

  // Escapes safe signs for string matching
  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };

  // Highly robust custom lexical parser for styling code block strings
  const highlightCode = (rawCode: string) => {
    if (!rawCode) return '';
    
    // Use rawCode directly as JSX values will automatically be escaped securely by React
    const escaped = rawCode;
    
    // Regular expression to identify comments, strings, keywords, numbers, methods
    const regex = /((\/\/[^\n]*|\/\*[\s\S]*?\*\/))|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^\`\\])*`)|(\b(?:break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|function|if|import|in|instanceof|new|return|super|switch|this|throw|try|typeof|var|void|while|with|yield|let|package|private|protected|public|static|any|string|number|boolean|unknown|never|void|interface|type|from|as|import|export)\b)|(\b(true|false|null|\d+)\b)|(\b\w+(?=\s*\())/g;

    let match;
    let lastIndex = 0;
    const parts: React.ReactNode[] = [];
    let keyIndex = 0;

    // Reset lastIndex on regex
    regex.lastIndex = 0;

    while ((match = regex.exec(escaped)) !== null) {
      // Add preceding plain text
      if (match.index > lastIndex) {
        parts.push(<span key={`text-${keyIndex++}`}>{escaped.substring(lastIndex, match.index)}</span>);
      }

      const comment = match[1];
      const str = match[3];
      const keyword = match[4];
      const literal = match[5];
      const fn = match[7];

      if (comment) {
        parts.push(<span key={`comment-${keyIndex++}`} className={themeStyle.comment}>{comment}</span>);
      } else if (str) {
        parts.push(<span key={`str-${keyIndex++}`} className={themeStyle.string}>{str}</span>);
      } else if (keyword) {
        parts.push(<span key={`kw-${keyIndex++}`} className={themeStyle.keyword}>{keyword}</span>);
      } else if (literal) {
        parts.push(<span key={`literal-${keyIndex++}`} className={themeStyle.number}>{literal}</span>);
      } else if (fn) {
        parts.push(<span key={`fn-${keyIndex++}`} className={themeStyle.func}>{fn}</span>);
      }

      lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < escaped.length) {
      parts.push(<span key={`text-${keyIndex++}`}>{escaped.substring(lastIndex)}</span>);
    }

    return parts;
  };

  return (
    <div className={`my-4 overflow-hidden rounded-xl shadow-md ${themeStyle.bg} font-mono text-[12.5px] relative group`}>
      <div className="flex items-center justify-between px-4 py-2 bg-black/15 border-b border-white/5 select-none shrink-0 text-xxs font-extrabold uppercase tracking-widest text-[#a0a0a0]">
        <span>{language}</span>
        <span className={`px-1.5 py-0.5 rounded ${themeStyle.labelBg}`}>{theme}</span>
      </div>
      <pre className="p-4 overflow-x-auto leading-relaxed whitespace-pre font-mono scrollbar-thin">
        <code className={themeStyle.text}>{highlightCode(code)}</code>
      </pre>
    </div>
  );
}
