/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string; // empty string for nocat or "uncategorized"
  ownerId: string;
  isEncrypted: boolean;
  createdAt: number; // local date timestamp (ms) or remote database timestamp
  updatedAt: number;
  // Optional custom note aesthetic styles
  color?: 'slate' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'violet' | string;
  fontSize?: 'sm' | 'base' | 'lg' | 'xl';
  fontFamily?: 'sans' | 'serif' | 'mono' | 'condensed' | 'heading';
  icon?: string;
  tags?: string[];
  primaryTag?: string;
}

export interface TagDefinition {
  name: string;
  color: string; // 'slate', 'indigo', 'emerald', 'amber', 'rose', 'violet', 'cyan' or any custom HEX code
  icon?: string;
}

export interface Folder {
  id: string;
  name: string;
  ownerId: string;
  isEncrypted: boolean;
  createdAt: number;
  updatedAt: number;
  // Optional folder styling custom features
  icon?: string;
  color?: string;
}

export type Theme = 'light' | 'dark';

export type FontFamily = 'inter' | 'serif' | 'mono' | 'condensed' | 'heading';

export interface TypographySettings {
  family: FontFamily;
  fontSize: 'sm' | 'base' | 'lg' | 'xl';
  lineHeight: 'snug' | 'normal' | 'relaxed';
}

export type EditorOption = 'editor1' | 'editor2'; // editor1 = Rich Text (Option 1), editor2 = Document Platform (Option 2)

export type PaneNamingOption = 'raw-formatted' | 'source-preview' | 'edit-render' | 'code-display';

export type SyntaxTheme = 'github-dark' | 'github-light' | 'monokai' | 'dracula' | 'synthwave' | 'solarized';

export type DesignStyle =
  | 'minimalist' | 'flat' | 'skeuomorphic' | 'neumorphic' | 'glassmorphism'
  | 'brutalist' | 'material' | 'metro' | 'retro' | 'cyberpunk'
  | 'futuristic' | 'organic' | 'corporate' | 'artistic' | 'dark_mode'
  | 'light_mode' | 'gradient_heavy' | 'monochrome' | 'typographic' | 'illustrated'
  | 'photographic' | '3d_isometric' | 'hand_drawn' | 'geometric' | 'abstract'
  | 'vintage' | 'high_tech' | 'playful' | 'elegant' | 'luxury' | 'industrial';

export interface UserPreferences {
  theme: Theme;
  typography: TypographySettings;
  encryptionEnabled: boolean;
  encryptionKeySalt?: string;
  encryptionKeyHash?: string;
  biometricEnabled?: boolean;
  biometricCredentialId?: string;
  editorOption?: EditorOption;
  paneNamingOption?: PaneNamingOption;
  syntaxTheme?: SyntaxTheme;
  designStyle?: DesignStyle;
  favoriteDesignStyle?: DesignStyle;
  noteListLayout?: 'normal' | 'compact';
}

export interface SyncStatus {
  state: 'synced' | 'syncing' | 'offline' | 'error';
  lastSyncedAt?: number;
  message?: string;
}
