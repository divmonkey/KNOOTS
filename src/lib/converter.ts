/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Robust Utility to convert HTML string (from Rich Text Editor) to Markdown format with formatting fidelity
 */
export function htmlToMarkdown(html: string): string {
  if (!html) return '';

  let md = html;

  // 1. Convert comments
  md = md.replace(/<!--[\s\S]*?-->/g, '');

  // 2. Headings
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n');
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n');
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n');
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n');

  // 3. Convert code blocks (<pre data-language="javascript"><code>content</code></pre> or equivalent)
  md = md.replace(/<pre[^>]*data-language="([^"]+)"[^>]*>[\s\S]*?<code[^>]*>([\s\S]*?)<\/code>[\s\S]*?<\/pre>/gi, (match, lang, code) => {
    // Decode basic HTML entities for code block contents
    const cleanCode = code
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    return `\n\`\`\`${lang}\n${cleanCode.trim()}\n\`\`\`\n`;
  });
  
  md = md.replace(/<pre[^>]*>[\s\S]*?<code[^>]*>([\s\S]*?)<\/code>[\s\S]*?<\/pre>/gi, (match, code) => {
    const cleanCode = code
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    return `\n\`\`\`\n${cleanCode.trim()}\n\`\`\`\n`;
  });

  // 4. Inline code
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');

  // 5. Checkboxes (WYSIWYG layout has: <div class="flex..."><input type="checkbox"... /> <span>Checkbox Task</span></div>)
  // Let's recognize both checked and unchecked states
  md = md.replace(/<input[^>]*type="checkbox"[^>]*checked[^>]*>\s*(?:<span>)?([\s\S]*?)(?:<\/span>)?/gi, '- [x] $1');
  md = md.replace(/<input[^>]*type="checkbox"[^>]*>\s*(?:<span>)?([\s\S]*?)(?:<\/span>)?/gi, '- [ ] $1');

  // Also clean up any surrounding checklist flex containers if present
  md = md.replace(/<div[^>]*class="[^"]*(?:flex|checklist)[^"]*"[^>]*>\s*(- \[[ x]\] [^\n<]+)\s*<\/div>/gi, '$1\n');

  // 6. Unordered lists <ul><li>item</li></ul>
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (match, content) => {
    // If it's already a checkbox, don't double format
    if (content.trim().startsWith('- [ ]') || content.trim().startsWith('- [x]')) {
      return `${content.trim()}\n`;
    }
    return `- ${content.trim()}\n`;
  });
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, '\n$1\n');

  // 7. Ordered lists <ol><li>item</li></ol> (Let's map them to 1., 2. etc)
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, innerContent) => {
    let index = 1;
    // Replace the - markup inside ol back to numbers
    const lines = innerContent.split('\n').map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ')) {
        return `${index++}. ${trimmed.substring(2)}`;
      }
      return line;
    });
    return `\n${lines.join('\n')}\n`;
  });

  // 8. Strong/Bold
  md = md.replace(/<(b|strong)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**');

  // 9. Italics
  md = md.replace(/<(i|em)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*');

  // 10. Underline
  md = md.replace(/<u[^>]*>([\s\S]*?)<\/u>/gi, '<u>$2</u>');

  // 11. Strikethrough
  md = md.replace(/<(strike|del|s)[^>]*>([\s\S]*?)<\/\1>/gi, '~~$2~~');

  // 12. Marks / highlights
  md = md.replace(/<mark[^>]*>([\s\S]*?)<\/mark>/gi, '<mark>$1</mark>');

  // 13. Alignments / divs with styles
  md = md.replace(/<div style="text-align:\s*(left|center|right|justify);?"[^>]*>([\s\S]*?)<\/div>/gi, (match, alignment, text) => {
    return `\n<div style="text-align: ${alignment}">${text}</div>\n`;
  });

  // 14. Links <a href="url">text</a>
  md = md.replace(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');

  // 15. Images <img src="url" alt="text" />
  md = md.replace(/<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)');
  md = md.replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]+)"[^>]*\/?>/gi, '![$1]($2)');

  // 16. Tables
  // Strip simple lines tags inside table
  md = md.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (match, tableBody) => {
    let mdTable = '\n';
    const rows = tableBody.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
    
    rows.forEach((row, rowIndex) => {
      const cols = row.match(/<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi) || [];
      const colTexts = cols.map(col => {
        return col.replace(/<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi, '$2').trim();
      });
      
      mdTable += `| ${colTexts.join(' | ')} |\n`;
      
      if (rowIndex === 0) {
        // Add separator
        const separators = colTexts.map(() => '---');
        mdTable += `| ${separators.join(' | ')} |\n`;
      }
    });
    
    return mdTable + '\n';
  });

  // 17. Paragraph and line break conversions
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n');
  md = md.replace(/<br\s*\/?>/gi, '\n');

  // 18. Custom divs cleanup
  md = md.replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, '\n$1\n');

  // 19. Fix duplicates / clean up multiples empty lines
  md = md.replace(/\n{3,}/g, '\n\n');

  // 20. Decode basic visual formatting entities remaining
  md = md
    .replace(/&nbsp;/g, ' ')
    .trim();

  return md;
}
