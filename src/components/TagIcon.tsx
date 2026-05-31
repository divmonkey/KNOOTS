/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import * as HeroOutlineIcons from '@heroicons/react/24/outline';
import { sanitizeSVG } from './NoteIcon';

interface TagIconProps {
  icon?: string;
  className?: string;
  size?: number;
}

export function TagIcon({ icon, className = '', size = 12 }: TagIconProps) {
  if (!icon) return null;
  const iconValue = icon.trim();

  // Case 1: Custom raw SVG string
  if (iconValue.toLowerCase().includes('<svg')) {
    const sanitized = sanitizeSVG(iconValue);
    if (sanitized) {
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
  if (iconValue.endsWith('Icon') && (HeroOutlineIcons as any)[iconValue]) {
    const IconComponent = (HeroOutlineIcons as any)[iconValue];
    return (
      <IconComponent 
        className={`shrink-0 ${className}`} 
        style={{ width: size, height: size }}
      />
    );
  }

  // Case 3: Emoji or custom character text
  return (
    <span 
      className={`inline-flex items-center justify-center shrink-0 font-sans leading-none select-none ${className}`}
      style={{ fontSize: size, width: size, height: size }}
    >
      {iconValue}
    </span>
  );
}