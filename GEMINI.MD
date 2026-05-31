# KNOOTS — Project Context for AI Assistants

## What This Is
KNOOTS is a React + Vite + TypeScript note-taking web app with:
- **End-to-end encryption** (AES-GCM via WebCrypto, key protected by WebAuthn)
- **Firebase Auth** (Google Sign-In via popup)
- **Firestore** (user-scoped notes and folders under `/users/{userId}/notes` and `/users/{userId}/folders`)
- **Google Gemini AI** integration (`@google/genai`)
- **Tailwind CSS v4** for styling

## Firebase Project
- **Project ID**: `gen-lang-client-0556439728`
- **Config file**: `firebase-applet-config.json`
- **Firestore rules**: `firestore.rules`
- **Data blueprint**: `firebase-blueprint.json`
- **Firebase CLI config**: `firebase.json`, `.firebaserc`

## Key Source Files
| File | Purpose |
|---|---|
| `src/lib/firebase.ts` | Firebase init, Auth helpers, Firestore re-exports |
| `src/lib/crypto.ts` | WebCrypto AES-GCM encryption/decryption |
| `src/lib/webauthn.ts` | WebAuthn key protection |
| `src/lib/db.ts` | Firestore CRUD operations |
| `src/lib/designStyles.ts` | Shared design tokens and style helpers |
| `src/components/Editor.tsx` | Main note editor |
| `src/components/Sidebar.tsx` | Folder/note navigation sidebar |
| `src/components/AuthBar.tsx` | Auth UI bar |
| `src/App.tsx` | Root component and app state |
| `src/types.ts` | Shared TypeScript types |

## Firestore Data Model
```
/users/{userId}/folders/{folderId}   → Folder documents
/users/{userId}/notes/{noteId}       → Note documents
```
Both collections are user-scoped. All reads/writes require ownership (`request.auth.uid == userId`).

## Dev Setup

### Prerequisites
- Node.js 20+
- Firebase CLI (`npm install -g firebase-tools`)
- A `.env` file (copy from `.env.example`)

### Environment Variables
```
GEMINI_API_KEY=<your Gemini API key from AI Studio>
APP_URL=http://localhost:3000
```

### Commands
```bash
npm install          # Install dependencies
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build → dist/
npm run lint         # TypeScript type check
```

### Firebase CLI (deploy rules)
```bash
firebase login                              # Authenticate once (opens browser)
firebase deploy --only firestore:rules      # Deploy Firestore security rules
```

## Notes for AI Assistants
- Firebase is gracefully degraded: if `firebase-applet-config.json` has no `apiKey`, the app runs in offline-only mode.
- Never store decrypted note content server-side. Encryption/decryption is strictly client-side.
- Firestore rules enforce ownership and field-level validation — always keep them in sync with the data model.
- The `firebase-blueprint.json` is the source of truth for the Firestore schema.
