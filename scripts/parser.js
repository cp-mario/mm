import { PATTERNS } from "./patterns.js";

// ============================================================================
// PARSER PRINCIPAL
// ============================================================================
export function mmxToHtml(mmx) {
  let result = mmx;

  // 1. Monoline
  for (const { regex, replace } of PATTERNS.monoline) {
    result = result.replace(regex, replace);
  }

  // 2. Multiline
  for (const block of PATTERNS.multiline) {
    result = parseMultilineBlocks(result, block);
  }

  // 3. PROTEGER RAW ANTES DE TODO LO DEMÁS
  const extracted = extractRawBlocks(result);
  result = extracted.html;

  // 4. Wrap paragraphs (ya no rompe <pre>)
  result = wrapParagraphs(result);

  // 5. Inline (solo fuera de code)
  for (const { regex, replace } of PATTERNS.inline) {
    result = result.replace(regex, replace);
  }

  // 6. Restaurar code
  result = restoreRawBlocks(result, extracted.blocks);

  if (globalThis.__MMX_RAW_IFRAMES__) {
    for (const item of globalThis.__MMX_RAW_IFRAMES__) {
      result = result.replace(item.key, item.value);
    }
  }


  // 7. Limpieza final
  return result.replace(/(<\/?(?:h[1-6]|div|p|ul|ol|li|blockquote)[^>]*>)\s*<br>\s*/gi, '$1');
}

// ============================================================================
// MULTILINE
// ============================================================================
function parseMultilineBlocks(text, config) {
  const lines = text.split('\n');
  const output = [];
  const stack = [];

  for (const line of lines) {

    if (config.close.test(line) && stack.length > 0) {
      config.close.lastIndex = 0;

      const block = stack.pop();
      let processed;
      let html;

      // En parseMultilineBlocks, cuando procesas bloques raw (code):
      if (block.raw) {
        let content = block.content.join('\n');
        content = content.replace(/^\n+/, '').replace(/\n+$/, '')
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;");

        let attrs = '';
        if (block.isAuto) attrs = ' auto="true"';

        const preClasses = (block.classes && block.classes.length) ? block.classes.join(' ') : block.class;

        processed = `<code>${content}</code>`;
        html = `<pre class="${preClasses}"${attrs}>${processed}</pre>`;
      } else {
          // Special handling for table-like blocks
          if (block.type === 'vtable' || block.type === 'htable' || block.type === 'table') {
            const rows = block.content
              .map(r => r.trim())
              .filter(r => r !== '')
              .map(r => {
                // allow optional leading/trailing | and split by |
                let row = r;
                if (row.startsWith('|')) row = row.slice(1);
                if (row.endsWith('|')) row = row.slice(0, -1);
                return row.split('|').map(c => c.trim());
              })
              .filter(r => r.length > 0);

            const processCell = (text) => {
              let content = text.replace(/^\n+/, '').replace(/\n+$/, '');
              // preserve line breaks inside cells as <br>
              content = content.split('\n').map(l => l).join('<br>');
              for (const { regex, replace } of PATTERNS.inline) {
                content = content.replace(regex, replace);
              }
              return content;
            };

            const classAttr = (block.classes && block.classes.length) ? ` class="${block.classes.join(' ').trim()}"` : '';

            if (block.type === 'vtable') {
              const trs = rows.map(cells => {
                const th = `<th>${processCell(cells[0] || '')}</th>`;
                const tds = cells.slice(1).map(c => `<td>${processCell(c)}</td>`).join('');
                return `<tr>${th}${tds}</tr>`;
              }).join('\n');
              html = `<table${classAttr}><tbody>${trs}</tbody></table>`;

            } else if (block.type === 'htable') {
              const header = rows[0] || [];
              const thead = `<thead><tr>${header.map(h => `<th>${processCell(h)}</th>`).join('')}</tr></thead>`;
              const bodyRows = rows.slice(1).map(cells => `<tr>${cells.map(c => `<td>${processCell(c)}</td>`).join('')}</tr>`).join('\n');
              html = `<table${classAttr}>${thead}<tbody>${bodyRows}</tbody></table>`;

            } else { // table with header top and footer bottom
              if (rows.length === 0) {
                html = `<table${classAttr}></table>`;
              } else if (rows.length === 1) {
                const thead = `<thead><tr>${rows[0].map(h => `<th>${processCell(h)}</th>`).join('')}</tr></thead>`;
                html = `<table${classAttr}>${thead}</table>`;
              } else {
                const thead = `<thead><tr>${rows[0].map(h => `<th>${processCell(h)}</th>`).join('')}</tr></thead>`;
                const tfoot = `<tfoot><tr>${rows[rows.length - 1].map(h => `<th>${processCell(h)}</th>`).join('')}</tr></tfoot>`;
                const body = rows.slice(1, -1).map(cells => `<tr>${cells.map(c => `<td>${processCell(c)}</td>`).join('')}</tr>`).join('\n');
                html = `<table${classAttr}>${thead}<tbody>${body}</tbody>${tfoot}</table>`;
              }
            }

          } else {
            processed = wrapParagraphs(block.content.join('\n'));

            for (const { regex, replace } of PATTERNS.inline) {
              processed = processed.replace(regex, replace);
            }

            // Only add the note label for note blocks
            if (block.type === 'note') {
              processed = `<span class="note-label">Note:</span>${processed}`;
              html = `<${block.tag} class="${block.classes ? block.classes.join(' ') : block.class}">${processed}</${block.tag}>`;
            } else {
              html = `<${block.tag} class="${block.classes ? block.classes.join(' ') : block.class}">${processed}</${block.tag}>`;
            }
          }
      }

      if (stack.length > 0) {
        stack[stack.length - 1].content.push(html);
      } else {
        output.push(html);
      }

    } else if (config.open.test(line)) {
        config.open.lastIndex = 0;
        const match = config.open.exec(line);
        config.open.lastIndex = 0;
        const params = match && match[1] ? match[1].trim() : '';
        const tokens = params ? params.split(/\s+/) : [];
        const isAuto = tokens.includes('auto');
        const extraClasses = tokens.filter(t => t !== 'auto');

        stack.push({
          type: config.name,
          content: [],
          tag: config.tag,
          class: config.class,
          raw: config.raw || false,
          flags: tokens,    // tokens found after :::code
          isAuto,
          classes: [config.class, ...extraClasses]
        });
      } else if (stack.length > 0) {
        stack[stack.length - 1].content.push(line);

    } else {
      output.push(line);
    }
  }

  return output.join('\n');
}

// ============================================================================
// WRAP PARAGRAPHS
// ============================================================================
function wrapParagraphs(text) {
  const lines = text.split('\n');
  const output = [];
  let paragraph = [];

  const blockRegex = /^<(?:h[1-6]|div|p|ul|ol|li|blockquote|hr|img|pre|iframe|table|thead|tbody|tfoot|tr|th|td)/i;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const content = paragraph.join('<br>');
    output.push(`<p>${content}</p>`);
    paragraph = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    //placeholders RAW (no tocar)
    if (/^%%RAW_\d+%%$/.test(trimmed)) {
      flushParagraph();
      output.push(trimmed);
      continue;
    }

    if (trimmed === '%%HARD_BREAK%%') {
      flushParagraph();
      output.push('<br>');
      continue;
    }

    if (trimmed === '') {
      //IMPORTANTE: mantiene separación real entre párrafos
      flushParagraph();
      continue;
    }

    if (blockRegex.test(trimmed)) {
      flushParagraph();
      output.push(line);
      continue;
    }

    paragraph.push(line); // NO usar trimmed → mantiene espacios reales
  }

  flushParagraph();
  return output.join('\n');
}

// ============================================================================
// RAW BLOCK PROTECTION
// ============================================================================
function extractRawBlocks(html) {
  const blocks = [];
  let i = 0;

  html = html.replace(/<pre class="multiline-code">[\s\S]*?<\/pre>/g, (match) => {
    const key = `%%RAW_${i++}%%`;
    blocks.push({ key, value: match });
    return key;
  });

  // Match <pre> tags where "multiline-code" is one of several classes
  html = html.replace(/<pre[^>]*class="[^"]*\bmultiline-code\b[^"]*"[^>]*>[\s\S]*?<\/pre>/g, (match) => {
    const key = `%%RAW_${i++}%%`;
    blocks.push({ key, value: match });
    return key;
  });

  return { html, blocks };
}

function restoreRawBlocks(html, blocks) {
  for (const b of blocks) {
    html = html.replace(b.key, b.value);
  }
  return html;
}