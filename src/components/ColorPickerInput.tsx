/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';

interface ColorPickerInputProps {
  value: string;
  onChange: (val: string) => void;
}

export function ColorPickerInput({ value, onChange }: ColorPickerInputProps) {
  const [mode, setMode] = useState<'hex' | 'rgba'>(() => {
    return value.toLowerCase().startsWith('rgb') ? 'rgba' : 'hex';
  });

  const [textVal, setTextVal] = useState(value);

  useEffect(() => {
    setTextVal(value);
    if (value.toLowerCase().startsWith('rgb')) {
      setMode('rgba');
    } else {
      setMode('hex');
    }
  }, [value]);

  // Helper to convert hex to rgba
  const hexToRgba = (hex: string, alpha = 1) => {
    let cleanHex = hex.replace('#', '').trim();
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split('').map(c => c + c).join('');
    }
    const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
    const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
    const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Helper to convert rgba to hex
  const rgbaToHex = (rgba: string) => {
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!match) return '#6366f1';
    const r = parseInt(match[1]).toString(16).padStart(2, '0');
    const g = parseInt(match[2]).toString(16).padStart(2, '0');
    const b = parseInt(match[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  };

  // Parse color parts
  const getAlphaValue = (colorStr: string) => {
    if (colorStr.toLowerCase().startsWith('rgb')) {
      const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (match && match[4] !== undefined) {
        return parseFloat(match[4]);
      }
      return 1;
    }
    return 1;
  };

  const alpha = getAlphaValue(value);
  const hexColorVal = value.toLowerCase().startsWith('rgb') ? rgbaToHex(value) : value;

  const handleTextChange = (newVal: string) => {
    setTextVal(newVal);
    onChange(newVal);
  };

  const handleNativeColorChange = (newHex: string) => {
    if (mode === 'hex') {
      onChange(newHex);
    } else {
      const updated = hexToRgba(newHex, alpha);
      onChange(updated);
    }
  };

  const handleAlphaChange = (newAlpha: number) => {
    const hex = hexColorVal.startsWith('#') ? hexColorVal : '#6366f1';
    const updated = hexToRgba(hex, newAlpha);
    setMode('rgba');
    onChange(updated);
  };

  const toggleMode = () => {
    if (mode === 'hex') {
      const converted = hexToRgba(value.startsWith('#') ? value : '#6366f1', 1);
      setMode('rgba');
      onChange(converted);
    } else {
      const converted = rgbaToHex(value);
      setMode('hex');
      onChange(converted);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs shadow-md w-full max-w-[240px]">
      {/* Top Header Mode Toggle */}
      <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-zinc-800 pb-1.5 mb-1.5 shrink-0">
        <span className="font-bold text-slate-500 uppercase tracking-widest text-[9px]">Tag Color Specs</span>
        <button
          type="button"
          onClick={toggleMode}
          className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 font-extrabold text-[9px] hover:bg-indigo-200 dark:hover:bg-indigo-950/80 transition-colors uppercase cursor-pointer"
        >
          {mode} Mode
        </button>
      </div>

      {/* Main input layout: swatch + hex input */}
      <div className="flex items-center gap-2">
        <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-300 dark:border-zinc-700 shrink-0 shadow-inner">
          <input
            type="color"
            value={hexColorVal.startsWith('#') ? hexColorVal : '#6366f1'}
            onChange={(e) => handleNativeColorChange(e.target.value)}
            className="absolute -inset-1 w-10 h-10 cursor-pointer p-0 border-0 bg-transparent"
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ backgroundColor: value }}
          />
        </div>

        <input
          type="text"
          value={textVal}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="#6366f1"
          className="flex-1 min-w-0 py-1.5 px-2 bg-white dark:bg-zinc-900 border border-slate-250 dark:border-zinc-850 rounded-lg text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-200"
        />
      </div>

      {/* Opacity slider */}
      <div className="space-y-1 mt-1">
        <div className="flex items-center justify-between text-[10px] text-slate-450 dark:text-zinc-500 font-medium">
          <span>Opacity</span>
          <span>{Math.round(alpha * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={alpha}
          onChange={(e) => handleAlphaChange(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-650"
        />
      </div>
    </div>
  );
}
