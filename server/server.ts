/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 5000;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET || 'knoots-super-secret-key-change-me';

// Configure S3 Client for Cloudflare R2
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
  },
});

const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || '';
const R2_PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL || '';

const googleClient = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'postmessage'
);

// SQLite Database Setup
let db: any;

async function initDB() {
  db = await open({
    filename: path.join(__dirname, '../knoots.db'),
    driver: sqlite3.Database
  });

  // Enable foreign keys
  await db.run('PRAGMA foreign_keys = ON');

  // Create tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      displayName TEXT,
      photoURL TEXT,
      createdAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT,
      ownerId TEXT,
      isEncrypted INTEGER,
      createdAt INTEGER,
      updatedAt INTEGER,
      icon TEXT,
      color TEXT,
      FOREIGN KEY(ownerId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT,
      content TEXT,
      folderId TEXT,
      ownerId TEXT,
      isEncrypted INTEGER,
      createdAt INTEGER,
      updatedAt INTEGER,
      color TEXT,
      fontSize TEXT,
      fontFamily TEXT,
      icon TEXT,
      tags TEXT,
      primaryTag TEXT,
      FOREIGN KEY(ownerId) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  console.log('SQLite database initialized successfully!');
}

initDB().catch(err => {
  console.error('Failed to initialize database:', err);
});

// Middleware for JWT Verification
interface AuthRequest extends express.Request {
  user?: {
    id: string;
    email: string;
  };
}

const authenticateToken = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// --- API ROUTES ---

// 1. Google OAuth Authentication
app.post('/api/auth/google', async (req, res) => {
  const { idToken: initialIdToken, code } = req.body;
  if (!initialIdToken && !code) {
    return res.status(400).json({ error: 'idToken or authorization code is required' });
  }

  try {
    let idToken = initialIdToken;
    let googleAccessToken = '';
    if (code) {
      const { tokens } = await googleClient.getToken(code);
      idToken = tokens.id_token;
      googleAccessToken = tokens.access_token || '';
    }

    if (!idToken) {
      return res.status(400).json({ error: 'Failed to obtain ID token from Google' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) {
      return res.status(400).json({ error: 'Invalid Google token payload' });
    }

    const { sub: googleId, email, name, picture } = payload;

    // Find or create user in SQLite
    let user = await db.get('SELECT * FROM users WHERE id = ?', [googleId]);
    if (!user) {
      await db.run(
        'INSERT INTO users (id, email, displayName, photoURL, createdAt) VALUES (?, ?, ?, ?, ?)',
        [googleId, email, name || '', picture || '', Date.now()]
      );
      user = { id: googleId, email, displayName: name, photoURL: picture };
    }

    // Generate custom JWT
    const token = jwt.sign({ id: googleId, email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      googleAccessToken,
      user: {
        uid: googleId,
        email,
        displayName: name || '',
        photoURL: picture || ''
      }
    });
  } catch (error) {
    console.error('Google verification failed:', error);
    res.status(401).json({ error: 'Invalid Google login' });
  }
});

// 2. Sync Folders & Notes (Full state dump & pull merge)
app.get('/api/sync', authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  try {
    const notes = await db.all('SELECT * FROM notes WHERE ownerId = ?', [userId]);
    const folders = await db.all('SELECT * FROM folders WHERE ownerId = ?', [userId]);
    
    // Parse tags JSON string back to arrays
    const formattedNotes = notes.map((n: any) => ({
      ...n,
      isEncrypted: !!n.isEncrypted,
      tags: n.tags ? JSON.parse(n.tags) : []
    }));

    const formattedFolders = folders.map((f: any) => ({
      ...f,
      isEncrypted: !!f.isEncrypted
    }));

    res.json({ notes: formattedNotes, folders: formattedFolders });
  } catch (error) {
    console.error('Sync pull failed:', error);
    res.status(500).json({ error: 'Failed to fetch cloud sync state' });
  }
});

// 3. Save / Update Note
app.post('/api/notes/:id', authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const noteId = req.params.id;
  const note = req.body;

  try {
    // Check ownership if note already exists
    const existing = await db.get('SELECT ownerId FROM notes WHERE id = ?', [noteId]);
    if (existing && existing.ownerId !== userId) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    await db.run(`
      INSERT INTO notes (
        id, title, content, folderId, ownerId, isEncrypted, createdAt, updatedAt, 
        color, fontSize, fontFamily, icon, tags, primaryTag
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title=excluded.title,
        content=excluded.content,
        folderId=excluded.folderId,
        isEncrypted=excluded.isEncrypted,
        updatedAt=excluded.updatedAt,
        color=excluded.color,
        fontSize=excluded.fontSize,
        fontFamily=excluded.fontFamily,
        icon=excluded.icon,
        tags=excluded.tags,
        primaryTag=excluded.primaryTag
    `, [
      noteId,
      note.title,
      note.content,
      note.folderId || '',
      userId,
      note.isEncrypted ? 1 : 0,
      note.createdAt,
      note.updatedAt,
      note.color || '',
      note.fontSize || '',
      note.fontFamily || '',
      note.icon || '',
      JSON.stringify(note.tags || []),
      note.primaryTag || ''
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error('Save note failed:', error);
    res.status(500).json({ error: 'Failed to save note' });
  }
});

// 4. Delete Note
app.delete('/api/notes/:id', authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const noteId = req.params.id;

  try {
    const existing = await db.get('SELECT ownerId FROM notes WHERE id = ?', [noteId]);
    if (!existing) {
      return res.json({ success: true }); // Already gone
    }
    if (existing.ownerId !== userId) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    await db.run('DELETE FROM notes WHERE id = ?', [noteId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete note failed:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// 5. Save / Update Folder
app.post('/api/folders/:id', authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const folderId = req.params.id;
  const folder = req.body;

  try {
    const existing = await db.get('SELECT ownerId FROM folders WHERE id = ?', [folderId]);
    if (existing && existing.ownerId !== userId) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    await db.run(`
      INSERT INTO folders (id, name, ownerId, isEncrypted, createdAt, updatedAt, icon, color)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name,
        isEncrypted=excluded.isEncrypted,
        updatedAt=excluded.updatedAt,
        icon=excluded.icon,
        color=excluded.color
    `, [
      folderId,
      folder.name,
      userId,
      folder.isEncrypted ? 1 : 0,
      folder.createdAt,
      folder.updatedAt,
      folder.icon || '',
      folder.color || ''
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error('Save folder failed:', error);
    res.status(500).json({ error: 'Failed to save folder' });
  }
});

// 6. Delete Folder
app.delete('/api/folders/:id', authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const folderId = req.params.id;

  try {
    const existing = await db.get('SELECT ownerId FROM folders WHERE id = ?', [folderId]);
    if (!existing) {
      return res.json({ success: true });
    }
    if (existing.ownerId !== userId) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    await db.run('DELETE FROM folders WHERE id = ?', [folderId]);
    // Optionally: cascade update notes inside folder
    await db.run('UPDATE notes SET folderId = "" WHERE folderId = ?', [folderId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete folder failed:', error);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

// 7. Request Presigned URL for Cloudflare R2 Upload
app.post('/api/media/presigned', authenticateToken, async (req: AuthRequest, res) => {
  const { fileName, fileType } = req.body;
  if (!fileName || !fileType) {
    return res.status(400).json({ error: 'fileName and fileType are required' });
  }

  // Create a clean, unique file path scoped to the user
  const fileKey = `${req.user!.id}/${Date.now()}-${path.basename(fileName)}`;

  try {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileKey,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
    const publicUrl = `${R2_PUBLIC_URL.replace(/\/$/, '')}/${fileKey}`;

    res.json({ uploadUrl, publicUrl });
  } catch (error) {
    console.error('Failed to generate presigned R2 URL:', error);
    res.status(500).json({ error: 'Failed to initiate file upload storage' });
  }
});

app.listen(PORT, () => {
  console.log(`Knoots SQLite backend server is running on http://localhost:${PORT}`);
});
