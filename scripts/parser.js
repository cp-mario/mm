/**
 * MMX TO HTML PARSER
 * 
 * Converts custom MMX (custom markdown-like format) to valid HTML.
 * The parser works in specific steps to handle different syntax features:
 * - Headings, links, formatting (single-line patterns)
 * - Code blocks, tables, notes (multi-line blocks)
 * - Paragraphs and inline formatting
 * - Protection of raw code blocks from accidental processing
 */

import { PATTERNS } from "./patterns.js"; // Contains all regex patterns for MMX syntax

/**
 * MAIN CONVERSION FUNCTION
 * Orchestrates the entire MMX to HTML conversion pipeline.
 * 
 * Processing order (CRITICAL - order matters):
 * 1. Single-line patterns (headings, hard breaks, separators)
 * 2. Multi-line blocks (code, tables, notes, etc.)
 * 3. Extract and protect raw code blocks
 * 4. Wrap text in paragraphs
 * 5. Apply inline formatting (bold, italic, links, etc.)
 * 6. Restore protected raw code blocks
 * 7. Clean up unwanted <br> tags near block elements
 * 
 * @param {string} mmx - The raw MMX content to convert
 * @returns {string} - Valid HTML content
 */
export function mmxToHtml(mmx) {
  let result = mmx;

  // STEP 1: Process single-line patterns first
  // Handles: headings (#, ##, ###, etc.), hard breaks, separators
  for (const { regex, replace } of PATTERNS.monoline) {
    result = result.replace(regex, replace);
  }

  // STEP 2: Process multi-line blocks
  // Handles: code blocks, tables (vertical, horizontal, standard), notes, etc.
  for (const block of PATTERNS.multiline) {
    result = parseMultilineBlocks(result, block);
  }

  // STEP 3: Extract and protect raw code blocks from further processing
  // This prevents inline formatting from breaking code blocks
  const extracted = extractRawBlocks(result);
  result = extracted.html;

  // STEP 4: Wrap plain text in <p> tags (paragraph wrapping)
  // Smart wrapping that respects existing block-level HTML elements
  result = wrapParagraphs(result);

  // STEP 5: Apply inline formatting patterns
  // Handles: bold, italic, links, code snippets, etc. (only outside code blocks)
  for (const { regex, replace } of PATTERNS.inline) {
    result = result.replace(regex, replace);
  }

  // STEP 6: Restore protected raw code blocks
  // Insert back the code blocks we extracted earlier
  result = restoreRawBlocks(result, extracted.blocks);

  // STEP 7: Handle global iframe blocks (if any exist)
  // Some iframes are stored globally and need to be restored
  if (globalThis.__MMX_RAW_IFRAMES__) {
    for (const item of globalThis.__MMX_RAW_IFRAMES__) {
      result = result.replace(item.key, item.value);
    }
  }

  // STEP 8: Final cleanup
  // Remove unwanted <br> tags that appear right after block-level elements
  // Example: <h1>Title</h1>
  //          <br> ← this gets removed
  return result.replace(/(<\/?(?:h[1-6]|div|p|ul|ol|li|blockquote)[^>]*>)\s*<br>\s*/gi, '$1');
}


// ============================================================================
// MULTI-LINE BLOCK PARSING
// ============================================================================
/**
 * Parses multi-line blocks (code, tables, notes, etc.) using a stack-based approach.
 * 
 * Process:
 * 1. Line-by-line processing to detect block start/end
 * 2. Stack to handle nested blocks
 * 3. Different handling for raw blocks (code) vs formatted blocks (notes)
 * 4. Special table parsing for vertical, horizontal, and standard tables
 * 
 * @param {string} text - The text containing multi-line blocks
 * @param {Object} config - Block configuration with open/close patterns and properties
 * @returns {string} - HTML with parsed blocks
 */
function parseMultilineBlocks(text, config) {
  const lines = text.split('\n'); // Split text into individual lines
  const output = []; // Accumulator for processed output
  const stack = []; // Stack for nested block structures

  // Process each line
  for (const line of lines) {

    // Check if this line closes a block
    if (config.close.test(line) && stack.length > 0) {
      config.close.lastIndex = 0; // Reset regex state for next use

      // Pop the current block from the stack
      const block = stack.pop();
      let processed; // Will hold processed content
      let html; // Will hold the final HTML string

      // Different processing based on block type
      if (block.raw) {
        // RAW CODE BLOCK: Escape HTML entities and wrap in <pre><code> tags
        let content = block.content.join('\n');
        
        // Remove leading/trailing whitespace
        content = content.replace(/^\n+/, '').replace(/\n+$/, '')
                        // Escape HTML special characters to preserve them literally
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;");

        // Add auto-highlighting flag if specified
        let attrs = '';
        if (block.isAuto) attrs = ' auto="true"';

        // Get class names for syntax highlighting
        const preClasses = (block.classes && block.classes.length) ? block.classes.join(' ') : block.class;

        // Build the HTML
        processed = `<code>${content}</code>`;
        html = `<pre class="${preClasses}"${attrs}>${processed}</pre>`;

      } else {
        // FORMATTED BLOCKS: Tables or notes (not raw code)
        
        // Special handling for table blocks (vtable, htable, table)
        if (block.type === 'vtable' || block.type === 'htable' || block.type === 'table') {
          // Parse table rows separated by line breaks
          const rows = block.content
            .map(r => r.trim())
            .filter(r => r !== '') // Remove empty rows
            .map(r => {
              // Parse cells separated by | (pipe character)
              let row = r;
              if (row.startsWith('|')) row = row.slice(1); // Remove leading |
              if (row.endsWith('|')) row = row.slice(0, -1); // Remove trailing |
              return row.split('|').map(c => c.trim()); // Split and trim each cell
            })
            .filter(r => r.length > 0); // Remove processed empty rows

          // Helper function to process cell content (handle inline formatting and HTML)
          const processCell = (text) => {
            let content = text.replace(/^\n+/, '').replace(/\n+$/, '');
            // Preserve line breaks inside cells as <br>
            content = content.split('\n').map(l => l).join('<br>');
            // Apply inline formatting within cells
            for (const { regex, replace } of PATTERNS.inline) {
              content = content.replace(regex, replace);
            }
            return content;
          };

          // Build class attribute if classes are specified
          const classAttr = (block.classes && block.classes.length) ? ` class="${block.classes.join(' ').trim()}"` : '';

          // VERTICAL TABLE: First column is headers, rest are data rows
          if (block.type === 'vtable') {
            const trs = rows.map(cells => {
              const th = `<th>${processCell(cells[0] || '')}</th>`;
              const tds = cells.slice(1).map(c => `<td>${processCell(c)}</td>`).join('');
              return `<tr>${th}${tds}</tr>`;
            }).join('\n');
            html = `<table${classAttr}><tbody>${trs}</tbody></table>`;

          // HORIZONTAL TABLE: First row is header, rest are data rows
          } else if (block.type === 'htable') {
            const header = rows[0] || [];
            const thead = `<thead><tr>${header.map(h => `<th>${processCell(h)}</th>`).join('')}</tr></thead>`;
            const bodyRows = rows.slice(1).map(cells => `<tr>${cells.map(c => `<td>${processCell(c)}</td>`).join('')}</tr>`).join('\n');
            html = `<table${classAttr}>${thead}<tbody>${bodyRows}</tbody></table>`;

          // STANDARD TABLE: First row is header, last row is footer, middle rows are body
          } else { 
            if (rows.length === 0) {
              html = `<table${classAttr}></table>`;
            } else if (rows.length === 1) {
              // Single row → just header
              const thead = `<thead><tr>${rows[0].map(h => `<th>${processCell(h)}</th>`).join('')}</tr></thead>`;
              html = `<table${classAttr}>${thead}</table>`;
            } else {
              // Multiple rows → header, body, footer structure
              const thead = `<thead><tr>${rows[0].map(h => `<th>${processCell(h)}</th>`).join('')}</tr></thead>`;
              const tfoot = `<tfoot><tr>${rows[rows.length - 1].map(h => `<th>${processCell(h)}</th>`).join('')}</tr></tfoot>`;
              const body = rows.slice(1, -1).map(cells => `<tr>${cells.map(c => `<td>${processCell(c)}</td>`).join('')}</tr>`).join('\n');
              html = `<table${classAttr}>${thead}<tbody>${body}</tbody>${tfoot}</table>`;
            }
          }

        } else {
          // NON-TABLE BLOCKS: Notes, divs, etc.
          // Join content lines and wrap in paragraphs
          processed = wrapParagraphs(block.content.join('\n'));

          // Apply inline formatting
          for (const { regex, replace } of PATTERNS.inline) {
            processed = processed.replace(regex, replace);
          }

          // Add special styling for note blocks (add "Note:" label)
          if (block.type === 'note') {
            processed = `<span class="note-label">Note:</span>${processed}`;
            html = `<${block.tag} class="${block.classes ? block.classes.join(' ') : block.class}">${processed}</${block.tag}>`;
          } else {
            html = `<${block.tag} class="${block.classes ? block.classes.join(' ') : block.class}">${processed}</${block.tag}>`;
          }
        }
      }

      // Add the completed block to the parent or output
      if (stack.length > 0) {
        // Nested block: add to parent block's content
        stack[stack.length - 1].content.push(html);
      } else {
        // Top-level block: add to output
        output.push(html);
      }

    } else if (config.open.test(line)) {
      // This line opens a new block
      config.open.lastIndex = 0; // Reset regex state
      const match = config.open.exec(line); // Get the matched line
      config.open.lastIndex = 0; // Reset again

      // Extract parameters from the opening tag (e.g., :::code python auto)
      const params = match && match[1] ? match[1].trim() : '';
      const tokens = params ? params.split(/\s+/) : []; // Split parameters by whitespace
      
      // Check for special flags
      const isAuto = tokens.includes('auto'); // For syntax highlighting
      const extraClasses = tokens.filter(t => t !== 'auto'); // Other tokens are CSS classes

      // Push new block onto stack
      stack.push({
        type: config.name, // Block type (code, note, table, etc.)
        content: [], // Lines within this block
        tag: config.tag, // HTML tag to use
        class: config.class, // Base CSS class
        raw: config.raw || false, // Is this a raw/code block?
        flags: tokens, // All tokens found (for debugging)
        isAuto, // Auto syntax highlighting?
        classes: [config.class, ...extraClasses] // Combined class list
      });

    } else if (stack.length > 0) {
      // Inside a block: accumulate this line as content
      stack[stack.length - 1].content.push(line);

    } else {
      // Normal line (not in a block): pass through to output
      output.push(line);
    }
  }

  // Join all output lines with newlines
  return output.join('\n');
}


// ============================================================================
// PARAGRAPH WRAPPING
// ============================================================================
/**
 * Wraps plain text lines in <p> tags while respecting block-level HTML elements.
 * 
 * Smart behavior:
 * - Groups adjacent text lines into a single <p> tag
 * - Preserves existing block-level HTML (h1-h6, div, p, ul, ol, etc.)
 * - Handles hard breaks (%%HARD_BREAK%%) and paragraph separators (empty lines)
 * - Preserves line breaks within paragraphs as <br> tags
 * 
 * @param {string} text - Text potentially containing both plain text and HTML blocks
 * @returns {string} - Text with plain text wrapped in <p> tags
 */
function wrapParagraphs(text) {
  const lines = text.split('\n'); // Process line by line
  const output = []; // Accumulator for output
  let paragraph = []; // Current paragraph being built

  // Regex to detect block-level HTML elements
  const blockRegex = /^<(?:h[1-6]|div|p|ul|ol|li|blockquote|hr|img|pre|iframe|table|thead|tbody|tfoot|tr|th|td)/i;

  /**
   * Flushes accumulated paragraph lines into a <p> tag
   */
  const flushParagraph = () => {
    if (paragraph.length === 0) return; // Nothing to flush
    
    // Join lines with <br> to preserve line breaks within the paragraph
    const content = paragraph.join('<br>');
    output.push(`<p>${content}</p>`);
    paragraph = []; // Clear for next paragraph
  };

  // Process each line
  for (const line of lines) {
    const trimmed = line.trim();

    // CASE 1: RAW placeholder (%%RAW_123%%) - preserve as-is
    // These are placeholders for protected code blocks
    if (/^%%RAW_\d+%%$/.test(trimmed)) {
      flushParagraph();
      output.push(trimmed);
      continue;
    }

    // CASE 2: Hard break marker (%%HARD_BREAK%%)
    // Insert a <br> element and end the paragraph
    if (trimmed === '%%HARD_BREAK%%') {
      flushParagraph();
      output.push('<br>');
      continue;
    }

    // CASE 3: Empty line
    // Signals end of a paragraph
    if (trimmed === '') {
      flushParagraph(); // End current paragraph
      continue; // Skip adding the empty line
    }

    // CASE 4: Block-level HTML element
    // These should not be wrapped in <p> tags
    if (blockRegex.test(trimmed)) {
      flushParagraph(); // End current paragraph first
      output.push(line); // Add the block element as-is
      continue;
    }

    // CASE 5: Regular text
    // Accumulate in current paragraph (preserve original spacing, don't use trimmed)
    paragraph.push(line);
  }

  // Don't forget to flush the last paragraph
  flushParagraph();
  
  return output.join('\n');
}

// ============================================================================
// RAW BLOCK PROTECTION AND RESTORATION
// ============================================================================
/**
 * Extracts raw code blocks before processing and replaces them with placeholders.
 * This prevents inline formatting (bold, italic, links) from accidentally
 * modifying content inside code blocks.
 * 
 * Strategy:
 * - Find all <pre> tags with "multiline-code" class
 * - Replace with placeholder (%%RAW_0%%, %%RAW_1%%, etc.)
 * - Store original content for later restoration
 * 
 * @param {string} html - HTML content potentially containing code blocks
 * @returns {Object} - { html: modified HTML, blocks: array of original blocks }
 */
function extractRawBlocks(html) {
  const blocks = []; // Store extracted blocks
  let i = 0; // Counter for unique placeholder IDs

  // Match <pre class="multiline-code">...</pre> blocks
  html = html.replace(/<pre class="multiline-code">[\s\S]*?<\/pre>/g, (match) => {
    const key = `%%RAW_${i++}%%`; // Create unique placeholder
    blocks.push({ key, value: match }); // Store the original block
    return key; // Replace with placeholder
  });

  // Also match <pre> tags where "multiline-code" is one of several classes
  // This handles: class="code multiline-code python" or class="multiline-code special"
  html = html.replace(/<pre[^>]*class="[^"]*\bmultiline-code\b[^"]*"[^>]*>[\s\S]*?<\/pre>/g, (match) => {
    const key = `%%RAW_${i++}%%`;
    blocks.push({ key, value: match });
    return key;
  });

  return { html, blocks };
}

/**
 * Restores protected code blocks by replacing placeholders with original content.
 * This is called after inline formatting has been applied.
 * 
 * @param {string} html - HTML with placeholders
 * @param {Array} blocks - Array of extracted blocks with original content
 * @returns {string} - HTML with restored code blocks
 */
function restoreRawBlocks(html, blocks) {
  // Replace each placeholder with its original content
  for (const b of blocks) {
    html = html.replace(b.key, b.value);
  }
  return html;
}