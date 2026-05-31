/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  FileText, Code, Image as ImageIcon, CheckSquare, 
  Book, Sparkles, Trophy, Star, Lightbulb, Bell, 
  Lock, Shield, Coffee, Heart, CheckCircle, HelpCircle
} from 'lucide-react';
import * as HeroOutlineIcons from '@heroicons/react/24/outline';
import { Note } from '../types';

// Exported list of default built-in icons mapping to Lucide
export const BUILT_IN_ICONS = [
  { id: 'document', label: 'Document', component: FileText },
  { id: 'code', label: 'Code', component: Code },
  { id: 'image', label: 'Image', component: ImageIcon },
  { id: 'checklist', label: 'Checklist', component: CheckSquare },
  { id: 'notebook', label: 'Notebook', component: Book },
  { id: 'sparkles', label: 'Sparkles', component: Sparkles },
  { id: 'trophy', label: 'Trophy', component: Trophy },
  { id: 'star', label: 'Star', component: Star },
  { id: 'lightbulb', label: 'Lightbulb', component: Lightbulb },
  { id: 'bell', label: 'Bell', component: Bell },
  { id: 'lock', label: 'Lock', component: Lock },
  { id: 'shield', label: 'Shield', component: Shield },
  { id: 'coffee', label: 'Coffee', component: Coffee },
  { id: 'heart', label: 'Heart', component: Heart },
  { id: 'check', label: 'Check Circle', component: CheckCircle },
  { id: 'question', label: 'Question', component: HelpCircle }
];

export function getFallbackIconId(content: string): string {
  const cnt = content || '';
  // Check for checklist items
  if (cnt.includes('- [ ]') || cnt.includes('- [x]') || cnt.includes('[ ]') || cnt.includes('[x]')) {
    return 'checklist';
  }
  // Check for code blocks
  if (cnt.includes('```') || cnt.includes('<code>') || cnt.includes('<pre>')) {
    return 'code';
  }
  // Check for markdown images
  if (/!\[.*?\]\(.*?\)/.test(cnt) || cnt.includes('<img')) {
    return 'image';
  }
  return 'document';
}

// Sanitization of SVG markup to prevent XSS payloads
export function sanitizeSVG(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.trim();
  
  // Find index of <svg tag start
  const svgStartIndex = cleaned.toLowerCase().indexOf('<svg');
  if (svgStartIndex === -1) {
    return '';
  }
  cleaned = cleaned.substring(svgStartIndex);

  // 1. Strip script tags
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // 2. Strip event handlers (e.g. onload, onerror, onclick, etc.)
  cleaned = cleaned.replace(/\s+on[a-z]+\s*=\s*(["'])(.*?)\1/gi, '');
  cleaned = cleaned.replace(/\s+on[a-z]+\s*=\s*([^\s>]+)/gi, '');
  
  // 3. Strip javascript hrefs
  cleaned = cleaned.replace(/\s+(?:xlink:)?href\s*=\s*(["'])javascript:(.*?)\1/gi, '');
  
  // 4. Strip iframe and object embedding
  cleaned = cleaned.replace(/<iframe\b[^<]*>.*?<\/iframe>/gi, '');
  cleaned = cleaned.replace(/<object\b[^<]*>.*?<\/object>/gi, '');

  // 5. Inject theme color overrides: convert hex shapes/strokes/fills to currentTextColor
  cleaned = cleaned.replace(/stroke=(["'])(#(?:[0-9a-fA-F]{3,8})|red|blue|black|green|yellow|purple)\1/gi, 'stroke="currentColor"');
  cleaned = cleaned.replace(/fill=(["'])(#(?:[0-9a-fA-F]{3,8})|red|blue|black|green|yellow|purple)\1/gi, 'fill="currentColor"');

  // Ensure ended with closing </svg>
  if (!cleaned.toLowerCase().endsWith('</svg>')) {
    cleaned += '</svg>';
  }

  // 6. Ensure viewBox exists if width/height exist, and then override width/height attributes and styles
  let svgTagMatch = cleaned.match(/<svg\b([^>]*)>/i);
  if (svgTagMatch) {
    let attrs = svgTagMatch[1];
    const hasViewBox = /\bviewBox\s*=\s*(["'])(.*?)\1/i.test(attrs);
    const widthMatch = attrs.match(/\bwidth\s*=\s*(["'])(.*?)\1/i);
    const heightMatch = attrs.match(/\bheight\s*=\s*(["'])(.*?)\1/i);
    
    if (!hasViewBox && widthMatch && heightMatch) {
      const w = widthMatch[2].replace(/px/gi, '').trim();
      const h = heightMatch[2].replace(/px/gi, '').trim();
      attrs += ` viewBox="0 0 ${w} ${h}"`;
    }
    
    // Override width & height to 100% to let CSS rules scale it properly
    attrs = attrs.replace(/\bwidth\s*=\s*(["'])(.*?)\1/gi, 'width="100%"');
    attrs = attrs.replace(/\bheight\s*=\s*(["'])(.*?)\1/gi, 'height="100%"');
    attrs += ' style="width: 100% !important; height: 100% !important; max-width: 100% !important; max-height: 100% !important;"';
    
    cleaned = cleaned.replace(/<svg\b([^>]*)>/i, `<svg ${attrs}>`);
  }

  return cleaned;
}

interface NoteIconProps {
  note: Note;
  className?: string;
  size?: number;
}

export default function NoteIcon({ note, className = '', size = 16 }: NoteIconProps) {
  const iconValue = note.icon || '';

  // Case 1: Custom raw SVG string
  if (iconValue.trim().toLowerCase().includes('<svg')) {
    const sanitized = sanitizeSVG(iconValue);
    if (sanitized) {
      // Direct insertion of cleansed elements with theme-aware text sizing and color context classes
      return (
        <span 
          className={`inline-flex items-center justify-center shrink-0 [&_svg]:w-full [&_svg]:h-full [&_svg]:block ${className}`}
          style={{ width: size, height: size }}
          dangerouslySetInnerHTML={{ __html: sanitized }}
        />
      );
    }
  }

  // Case 2: Heroicons from @heroicons/react/24/outline
  if (iconValue && iconValue.endsWith('Icon') && (HeroOutlineIcons as any)[iconValue]) {
    const IconComponent = (HeroOutlineIcons as any)[iconValue];
    return (
      <IconComponent 
        className={`shrink-0 ${className}`} 
        style={{ width: size, height: size }}
      />
    );
  }

  // Case 3: Defined or Fallback built-in lookup
  const resolvedIconId = iconValue || getFallbackIconId(note.content);
  const matched = BUILT_IN_ICONS.find(item => item.id === resolvedIconId) || BUILT_IN_ICONS[0];
  const IconComponent = matched.component;

  return (
    <IconComponent 
      size={size} 
      className={`shrink-0 ${className}`} 
    />
  );
}
