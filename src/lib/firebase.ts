/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, getDocs, deleteDoc, collection, query, where, onSnapshot, Timestamp, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

// Check if Firebase is configured in the environment
const hasConfig = !!(firebaseConfig && (firebaseConfig as any).apiKey);

export let app: any = null;
export let db: any = null;
export let auth: any = null;
export let isFirebaseEnabled = false;

if (hasConfig) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
    auth = getAuth(app);
    isFirebaseEnabled = true;
    console.log("Firebase initialized successfully with dynamic configuration!");
  } catch (error) {
    console.error("Firebase dynamic initialization failed:", error);
  }
} else {
  console.log("Firebase is not configured or terms pending. Operating in secure offline-first mode.");
}

// Returns true when running inside an iframe (e.g. AI Studio preview, embedded widget).
// Both signInWithPopup and signInWithRedirect are blocked by browsers in cross-origin iframes,
// so callers should open a new tab instead.
export const isInIframe = (): boolean => {
  try { return window.self !== window.top; } catch { return true; }
};

// Handle errors complying strictly with JSON-wrapped logging guidelines
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Cache the access token in memory/localStorage.
let cachedAccessToken: string | null = localStorage.getItem('knoots_google_access_token');

// Called once on app startup to capture the result of a redirect sign-in flow.
// When the popup is blocked, loginWithGoogle falls back to redirect; this picks up
// the credential after the page reloads from Google's OAuth page.
export async function handleRedirectResult(): Promise<{ user: User; accessToken: string } | null> {
  if (!isFirebaseEnabled || !auth) return null;
  try {
    const result = await getRedirectResult(auth);
    if (!result) return null;
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) return null;
    cachedAccessToken = credential.accessToken;
    localStorage.setItem('knoots_google_access_token', cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Redirect result error:', error);
    return null;
  }
}

// Social authentication — tries popup first, silently falls back to redirect
// if the popup is blocked (common in iframes / strict tracking-protection contexts).
export async function loginWithGoogle(): Promise<{ user: User; accessToken: string } | null> {
  if (!isFirebaseEnabled || !auth) {
    throw new Error("Cloud authentication is currently unavailable because Firebase is in offline mode.");
  }
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/documents.readonly');
  provider.addScope('https://www.googleapis.com/auth/spreadsheets.readonly');
  provider.addScope('https://www.googleapis.com/auth/drive.readonly');
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }
    cachedAccessToken = credential.accessToken;
    localStorage.setItem('knoots_google_access_token', cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    // Popup was blocked by the browser (iframe / tracking protection) — use redirect instead.
    const popupBlockedCodes = ['auth/popup-blocked', 'auth/popup-closed-by-user', 'auth/cancelled-popup-request'];
    if (popupBlockedCodes.includes(error?.code)) {
      console.warn('Popup blocked — falling back to redirect sign-in flow.');
      await signInWithRedirect(auth, provider);
      return null; // Page navigates away; result captured by handleRedirectResult() on return.
    }
    console.error("Auth failed:", error);
    throw error;
  }
}

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

// Global logout function
export async function logoutUser(): Promise<void> {
  if (!isFirebaseEnabled || !auth) return;
  await signOut(auth);
  cachedAccessToken = null;
  localStorage.removeItem('knoots_google_access_token');
}

export {
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  onAuthStateChanged
};
