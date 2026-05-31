import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('KNOOTS Feature Screenshots', () => {
  // Ensure the screenshots directory exists in public folder
  test.beforeAll(() => {
    const dir = path.join(process.cwd(), 'public/screenshots');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  test('capture all feature screenshots', async ({ page }) => {
    // Listen to browser console logs to see what's happening
    page.on('console', msg => {
      console.log(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
    });

    // Intercept Google Drive API requests using a regex matching pattern
    await page.route(/.*googleapis\.com\/drive\/v3\/files.*/, async (route) => {
      console.log(`[MOCK ROUTE] Intercepted Google Drive API call: ${route.request().url()}`);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          files: [
            {
              id: '1',
              name: 'Product Roadmap 2026.gdoc',
              mimeType: 'application/vnd.google-apps.document',
              webViewLink: 'https://docs.google.com/document/d/1'
            },
            {
              id: '2',
              name: 'Q4 Budget & Forecasts.gsheet',
              mimeType: 'application/vnd.google-apps.spreadsheet',
              webViewLink: 'https://docs.google.com/spreadsheets/d/2'
            }
          ]
        })
      });
    });

    // Go to the app
    await page.goto('/');
    
    // Wait for the app main page to load
    await page.waitForSelector('text=K'); // Wait for the brand logo K
    await page.waitForTimeout(2000); // Wait for animations to settle

    // 1. Capture Main Editor
    const addNoteBtn = page.locator('button:has-text("Add Note")');
    if (await addNoteBtn.isVisible()) {
      await addNoteBtn.click();
      await page.waitForTimeout(500);
    }
    
    // Switch to Markdown mode
    const markdownOption = page.locator('button:has-text("Markdown")').first();
    if (await markdownOption.isVisible()) {
      await markdownOption.click();
      await page.waitForTimeout(300);
    }

    const editorTextarea = page.locator('#editor_textarea');
    if (await editorTextarea.isVisible()) {
      await editorTextarea.focus();
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Backspace');
      await page.keyboard.type('# Welcome to KNOOTS\n\nThis is a client-side encrypted note-taking app.\n\n```javascript\n// Syntax highlighting test\nconst security = "E2E AES-GCM";\nconsole.log(`Secured with: ${security}`);\n```\n');
      await page.waitForTimeout(500);
    }
    
    await page.screenshot({ path: 'public/screenshots/main_editor.png' });

    // 2. Capture Sidebar
    const sidebar = page.locator('.md\\:flex.h-full.shrink-0');
    if (await sidebar.isVisible()) {
      await sidebar.screenshot({ path: 'public/screenshots/sidebar.png' });
    } else {
      await page.screenshot({ path: 'public/screenshots/sidebar.png', clip: { x: 0, y: 0, width: 300, height: 800 } });
    }

    // 3. Capture AI Prompt Modal
    const aiBtn = page.getByTitle('Multi-Tone AI Prompt Block');
    if (await aiBtn.isVisible()) {
      await aiBtn.click();
      await page.waitForSelector('text=Source Hook / Idea');
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'public/screenshots/ai_prompt_modal.png' });
      await page.locator('.bg-indigo-50\\/50 button, .dark\\:bg-indigo-950\\/20 button').first().click();
      await page.waitForTimeout(500);
    }

    // 4. Capture LibreTranslate Modal
    const translateBtn = page.getByTitle('LibreTranslate');
    if (await translateBtn.isVisible()) {
      await translateBtn.click();
      await page.waitForSelector('text=Translate Note');
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'public/screenshots/translate_modal.png' });
      await page.locator('.bg-sky-50\\/50 button, .dark\\:bg-sky-950\\/20 button').first().click();
      await page.waitForTimeout(500);
    }

    // 5. Capture Google Workspace Picker Modal
    const pickerBtn = page.getByTitle('Embed Google Docs & Sheets');
    if (await pickerBtn.isVisible()) {
      // Inject mock token before opening the picker to prevent OAuth redirects
      await page.evaluate(() => {
        console.log('[PLAYWRIGHT TEST] Injecting mock token into window.__MOCK_TOKEN__');
        (window as any).__MOCK_TOKEN__ = 'mock-test-token';
      });
      await pickerBtn.click();
      await page.waitForSelector('text=Select Google Workspace File');
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'public/screenshots/workspace_picker.png' });
      await page.locator('.absolute.top-4.right-4').first().click();
      await page.waitForTimeout(500);
    }

    // 6. Capture Settings Modal
    const settingsBtn = page.getByTitle('Open Settings');
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await page.waitForSelector('text=Preferences & Security');
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'public/screenshots/settings_modal.png' });

      // 7. Capture Encryption Modal (Setup View)
      const enableEncBtn = page.getByRole('button', { name: 'Enable Encryption' });
      if (await enableEncBtn.isVisible()) {
        await enableEncBtn.click();
        await page.waitForSelector('text=Set Up End-to-End Encryption');
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'public/screenshots/encryption_modal.png' });
        await page.locator('button:has-text("Cancel")').first().click();
        await page.waitForTimeout(500);
      }
      
      // Close Settings Modal using the footer Done button
      await page.locator('button:has-text("Done")').click();
      await page.waitForTimeout(500);
    }
  });
});
