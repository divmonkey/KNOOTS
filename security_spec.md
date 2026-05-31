# Security Specification: Secure Notes and Folders with E2E Encryption

## 1. Data Invariants

1.  **Ownership Boundary**: A folder or note document MUST only be accessible (read/write) by the authenticated user whose `request.auth.uid` matches the `ownerId` of the document, AND whose UID matches the `{userId}` wildcard in the path `/users/{userId}/folders/{folderId}` or `/users/{userId}/notes/{noteId}`.
2.  **Immutability**: The fields `id`, `ownerId`, and `createdAt` must be completely immutable after creation.
3.  **Strict Sizing**:
    *   Note title, note content, and folder names must have size limits (e.g., folder name <= 500, note title <= 1000, note content <= 1,000,000 characters) to prevent Denial of Wallet payload exhaustion.
4.  **Temporal Integrity**: `createdAt` must equal `request.time` upon creation, and `updatedAt` must equal `request.time` upon any update.
5.  **Verified User Access**: Standard write operations must verify that `request.auth.token.email_verified == true`.

---

## 2. The "Dirty Dozen" Malicious Payloads

We define 12 custom malicious payloads designed to test boundary validations:

1.  **Payload A (Identity Theft)**: User tries to write a folder to separate user path:
    Path: `/users/alice/folders/folderA`
    Payload: `{ id: "folderA", name: "Alice Folders", ownerId: "bob", isEncrypted: false }`
    *Result*: `PERMISSION_DENIED` (Wildcard userId does not match request.auth.uid).

2.  **Payload B (Inject Extra Fields)**: Attempting to save a note with a ghost field standard in client-level escalations:
    Payload: `{ id: "note1", title: "Note", content: "Hi", folderId: "", ownerId: "bob", isEncrypted: false, isAdmin: true }`
    *Result*: `PERMISSION_DENIED` (Keys do not match exact validation schema).

3.  **Payload C (Immutability Violation)**: BOB tries to edit ALICE's note or alter the `ownerId` field during update:
    Existing Note: `{ id: "note1", ownerId: "alice", ... }`
    Malicious Update Payload: `{ ownerId: "bob", ... }`
    *Result*: `PERMISSION_DENIED`.

4.  **Payload D (Oversized Content)**: Malicious client pushes 10MB of payload data into `content` field.
    Payload `content`: String of size 10,000,000.
    *Result*: `PERMISSION_DENIED` (Size constraints exceeded).

5.  **Payload E ($ref poisoning)**: Injecting malicious string patterns in `id` wildcard or fields:
    Path: `/users/bob/notes/note%2Fwith%2Fslashes`
    *Result*: `PERMISSION_DENIED` (`isValidId` check fails).

6.  **Payload F (Unverified Email Write)**: A user writes notes while their email is not verified:
    `request.auth.token.email_verified == false`
    *Result*: `PERMISSION_DENIED`.

7.  **Payload G (Created-At Tampering)**: Explicitly sending an old timestamp for `createdAt` during creation:
    Payload: `{ createdAt: timestamp_from_1990 }`
    *Result*: `PERMISSION_DENIED` (Must equal `request.time`).

8.  **Payload H (Modified-At Bypass)**: Trying to update a note without updating the `updatedAt` field:
    Payload: `{ title: "New Title" }` (No `updatedAt` changes or mismatch with client-side clock instead of `request.time`).
    *Result*: `PERMISSION_DENIED`.

9.  **Payload I (System Injection)**: Attempt to bypass E2E boolean by client-claiming a note is unencrypted while it holds encrypted structure:
    *Result*: `PERMISSION_DENIED`.

10. **Payload J (Null Title)**: Note created with null title or empty types:
    Payload: `{ title: null }`
    *Result*: `PERMISSION_DENIED`.

11. **Payload K (Folder ID Spoofing)**: Linking a note to a folder that belongs to a different user:
    Payload: `{ folderId: "aliceFolder" }` created under Bob's notes path.
    *Result*: `PERMISSION_DENIED` (Must check database for folder ownership if folderId is provided).

12. **Payload L (Out-of-Order Lifecycle Write)**: Updating a completed note after terminal lock (if terminal state exists).

---

## 3. Test Affirmation

The security rules defined in `firestore.rules` will strictly enforce every invariant and reject all 12 of these threat scenarios.
