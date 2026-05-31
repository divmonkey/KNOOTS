/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Note, Folder } from '../types';

export interface CustomUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

// Token key names
const TOKEN_KEY = 'knoots_jwt_session_token';
const USER_KEY = 'knoots_logged_in_user';

// Helpers to get token
export function getSessionToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getCachedUser(): CustomUser | null {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// Check if Backend Sync is possible (i.e. we have a backend URL & token)
export function isBackendEnabled(): boolean {
  return !!getSessionToken();
}

// Headers builder helper
function getAuthHeaders(): HeadersInit {
  const token = getSessionToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

// 1. Authenticate with OAuth code from Google Identity Services
export async function authenticateWithGoogle(code: string): Promise<{ user: CustomUser; token: string }> {
  const res = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });

  if (!res.ok) {
    throw new Error('Google Sign-In failed on backend verification.');
  }

  const data = await res.json();
  
  // Cache in localStorage
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  if (data.googleAccessToken) {
    localStorage.setItem('knoots_google_access_token', data.googleAccessToken);
  }

  return { user: data.user, token: data.token };
}

// 2. Logout
export function logoutUser(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('knoots_google_access_token');
}

export function getAccessToken(): string | null {
  return localStorage.getItem('knoots_google_access_token');
}

// Prompt OAuth code client and exchange for Google access token
export function loginWithGoogle(): Promise<{ accessToken: string } | null> {
  return new Promise((resolve, reject) => {
    if (typeof (window as any).google === 'undefined') {
      reject(new Error('Google Identity Services client is not loaded.'));
      return;
    }

    try {
      const client = (window as any).google.accounts.oauth2.initCodeClient({
        client_id: '694650125615-5qmlq66g9q6l97m8q3u1b8j9p6t18p1p.apps.googleusercontent.com',
        scope: 'openid email profile https://www.googleapis.com/auth/documents.readonly https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/drive.readonly',
        ux_mode: 'popup',
        callback: async (response: any) => {
          if (response.code) {
            try {
              await authenticateWithGoogle(response.code);
              const googleToken = getAccessToken();
              resolve(googleToken ? { accessToken: googleToken } : null);
            } catch (err) {
              reject(err);
            }
          } else {
            resolve(null);
          }
        }
      });
      client.requestCode();
    } catch (e) {
      reject(e);
    }
  });
}

// 3. Fetch Sync State (pull full backup of notes & folders)
export async function fetchSyncState(): Promise<{ notes: Note[]; folders: Folder[] }> {
  const res = await fetch('/api/sync', {
    headers: getAuthHeaders()
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      logoutUser(); // Token expired/invalid
    }
    throw new Error('Sync pull from cloud failed.');
  }

  return res.json();
}

// 4. Save/Update Note
export async function saveNoteOnServer(note: Note): Promise<void> {
  const res = await fetch(`/api/notes/${note.id}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(note)
  });

  if (!res.ok) {
    throw new Error(`Failed to save note: ${res.statusText}`);
  }
}

// 5. Delete Note
export async function deleteNoteOnServer(id: string): Promise<void> {
  const res = await fetch(`/api/notes/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });

  if (!res.ok) {
    throw new Error(`Failed to delete note: ${res.statusText}`);
  }
}

// 6. Save/Update Folder
export async function saveFolderOnServer(folder: Folder): Promise<void> {
  const res = await fetch(`/api/folders/${folder.id}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(folder)
  });

  if (!res.ok) {
    throw new Error(`Failed to save folder: ${res.statusText}`);
  }
}

// 7. Delete Folder
export async function deleteFolderOnServer(id: string): Promise<void> {
  const res = await fetch(`/api/folders/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });

  if (!res.ok) {
    throw new Error(`Failed to delete folder: ${res.statusText}`);
  }
}

// 8. R2 Media Upload
export async function uploadMediaToR2(file: File | Blob, fileName: string): Promise<string> {
  // Request presigned URL from backend
  const res = await fetch('/api/media/presigned', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ fileName, fileType: file.type })
  });

  if (!res.ok) {
    throw new Error('Failed to request presigned upload URL.');
  }

  const { uploadUrl, publicUrl } = await res.json();

  // Perform binary upload directly to Cloudflare R2
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type
    },
    body: file
  });

  if (!uploadRes.ok) {
    throw new Error('Failed to upload file to Cloudflare R2 bucket.');
  }

  return publicUrl;
}
