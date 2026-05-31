# Project Rules (Instruction Set)

## Execution
- Act immediately; avoid restating or summarizing before execution.
- Keep responses concise, direct, and modular.
- Use short, declarative sentences for clarity.

## Async Behavior
- All changes (folders, notes, icons, tags, editor actions) must be **asynchronous**.
- Apply **optimistic UI**: show updates instantly, sync in background.
- Provide **error handling**: revert or notify user if sync fails.
- Display clear status indicators (e.g., “Saved ✓”, “Syncing…”, “Error”).

## Editor Modes
- **Markdown Mode:**  
  - Raw Markdown pane on the right.  
  - Rendered/normal text pane on the left.  
  - Include a SAVE button with async optimistic UI.  
- **Rich Text Mode:**  
  - Remove Preview window.  
  - Include a SAVE button with async optimistic UI.  

## Save Logic
- SAVE button triggers `handleManualSave`.  
- Show status indicators: `saving`, `saved ✓`, `error`.  
- Placement: toolbar, consistent across modes.  

## Layout & Controls
- Platform switcher (Rich Text/Markdown) sits beside Composer button.  
- Control icon is next to Note Title.  
- Clicking Note Icon opens slide‑down panel with icon selection, color picker, and platform switcher.  
- Folder icons open dialog for icon + color selection.  
- Keep folder and note icon dialogs consistent.  

## Tags
- Notes support tags/categories.  
- Tags can carry color accents; notes inherit them.  
- Multi‑tag notes show multiple chips; allow one primary tag for main accent.  
- Tag input field includes color picker for quick assignment.  
- Remove unnecessary tag list dots; keep UI clean.  

## UI Consistency
- SAVE button placement consistent across modes.  
- Maintain accessibility: contrast ratios, theme adaptability.  
- Font family: Asap Condensed, normal weight, centered titles.  
- Group interactive elements logically in toolbars.  

## Implementation Practices
- Keep JSX structure clean; avoid misaligned divs.  
- Use conditional rendering to hide irrelevant controls (e.g., Preview in Rich Text).  
- Avoid verbose duplication; instructions should be modular and scoped.  

---

## Behavioral Guidelines (Karpathy)

> Derived from [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills).  
> Bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- Change only the lines required to implement the request.
