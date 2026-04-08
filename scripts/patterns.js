/**
 * MMX Pattern Definitions
 * Regex patterns for MMX to HTML conversion
 */

export const PATTERNS = {
  monoline: [
    // Heading level 6: ###### Title %{id}%
    { 
      regex: /^###### (.*?)\s*(?:%\{(.+?)\}%\s*)?$/gm, 
      replace: (match, text, id) => id 
        ? `<h6 id="${id}">${text}</h6>` 
        : `<h6>${text}</h6>`
    },

    // Heading level 5: ##### Title %{id}%
    { 
      regex: /^##### (.*?)\s*(?:%\{(.+?)\}%\s*)?$/gm, 
      replace: (match, text, id) => id 
        ? `<h5 id="${id}">${text}</h5>` 
        : `<h5>${text}</h5>`
    },

    // Heading level 4: #### Title %{id}%
    { 
      regex: /^#### (.*?)\s*(?:%\{(.+?)\}%\s*)?$/gm, 
      replace: (match, text, id) => id 
        ? `<h4 id="${id}">${text}</h4>` 
        : `<h4>${text}</h4>`
    },

    // Heading level 3: ### Title %{id}%
    { 
      regex: /^### (.*?)\s*(?:%\{(.+?)\}%\s*)?$/gm, 
      replace: (match, text, id) => id 
        ? `<h3 id="${id}">${text}</h3>` 
        : `<h3>${text}</h3>`
    },

    // Heading level 2: ## Title %{id}%
    { 
      regex: /^## (.*?)\s*(?:%\{(.+?)\}%\s*)?$/gm, 
      replace: (match, text, id) => id 
        ? `<h2 id="${id}">${text}</h2>` 
        : `<h2>${text}</h2>`
    },

    // Heading level 1: # Title %{id}%
    { 
      regex: /^# (.*?)\s*(?:%\{(.+?)\}%\s*)?$/gm, 
      replace: (match, text, id) => id 
        ? `<h1 id="${id}">${text}</h1>` 
        : `<h1>${text}</h1>`
    },

    // Hard break: #b
    { regex: /^#b.*$/gm, replace: '%%HARD_BREAK%%' },

    // Horizontal separator: #s
    { regex: /^#s.*$/gm, replace: '<hr>' },

    // Embedded iframe: #iframe( ¡<html>! )
    {
      regex: /^\s*#iframe\(\s*¡([\s\S]+?)!\s*\)\s*$/gm,
      replace: (match, content) => {
        const html = content.trim();
        return `<div class="iframe">${html}</div>`;
      }
    },

    // Code file inclusion: #code(path/to/file) [flags]
    { 
      regex: /^#code\((.+?)\)(?:\s+([\w\s]+))?$/gm, 
      replace: (match, path, flags) => {
        const opts = flags ? flags.trim().split(/\s+/) : [];
        const auto = opts.includes("auto");
        const extraClasses = opts.filter(f => f !== "auto");
        let classes = ["fileCode", "multiline-code", ...extraClasses];
        return auto
          ? `<pre class="${classes.join(" ")}" path="${path}" auto="true"></pre>`
          : `<pre class="${classes.join(" ")}" path="${path}"></pre>`;
      }
    },

    // Block audio: !!!( path ) [classes]
    { 
      regex: /^!!!\(([^)]+)\)(?:\s+([\w\-\s]+))?\s*$/gm, 
      replace: (match, src, classes) => {
        const cls = classes ? ` ${classes.trim().split(/\s+/).join(' ')}` : '';
        return `<div class="audio${cls}"><audio src="${src}" controls></audio></div>`;
      }
    },

    // Block video: !!( path ) [classes]
    { 
      regex: /^!!\(([^)]+)\)(?:\s+([\w\-\s]+))?\s*$/gm, 
      replace: (match, src, classes) => {
        const clsAttr = classes ? ` class="${classes.trim().split(/\s+/).join(' ')}"` : '';
        return `<video src="${src}" controls${clsAttr}></video>`;
      }
    },

    // Block image: ![alt](path) [classes]
    {
      regex: /^!\[([^\]]*)\]\(([^)]+)\)(?:\s+([\w\-\s]+))?\s*$/gm,
      replace: (match, alt, src, classes) => {
        const cls = classes ? ` class="${classes.trim().split(/\s+/).join(' ')}"` : '';
        return `<img alt="${alt}" class="img" src="${src}"${cls}>`;
      }
    }
  ],

  multiline: [
    // Note block: :::note [classes] ... :::
    {
      name: 'note',
      open: /^:::note(?:\s+([^\n]+))?\s*$/gm,
      close: /^:::\s*$/gm,
      tag: 'div',
      class: 'note',
    },

    // Code block: :::code [language] [flags] ... :::
    {
      name: 'code',
      open: /^:::code(?:\s+([^\n]+))?\s*$/gm,
      close: /^:::\s*$/gm,
      tag: 'pre',
      class: 'multiline-code',
      raw: true
    },

    // Table block: #table [mode] [classes] ... #endtable
    {
      name: 'table',
      open: /^#table(?:\(([^)]+)\))?(?:\s+([^\n]+))?\s*$/gm,
      close: /^#endtable\s*$/gm,
      tag: 'table',
      class: 'table',
      raw: false
    },
  ],

  inline: [
    // Inline image icon: <-path/to/image->
    {
      regex: /<\-([^>]+)\->/g,
      replace: (match, src) => `<img class="inlineImg" alt="icon" src="${src}">`
    },

    // Link: [text](url)
    {
      regex: /\[([^\]]+)\]\(([^)]+)\)/g,
      replace: (match, text, href) => {
        return `<a target="_blank" href="${href}">${text}</a>`;
      }
    },

    // Bold: **text**
    {
      regex: /\*\*(.*?)\*\*/g,
      replace: (match, text) => `<strong>${text}</strong>`
    },

    // Italic: *text*
    {
      regex: /\*(.*?)\*/g,
      replace: (match, text) => `<em>${text}</em>`
    },

    // Colored text: <c="color">text</c>
    { 
      regex: /<c="([^"]+)">(.*?)<\/c>/gs,
      replace: (match, color, content) => {
        return `<div class="coloredText" style="color: ${color};">${content}</div>`;
      }
    },

    // Inline code: `code`
    { 
      regex: /`([^`]+)`/g, 
      replace: (match, code) => {
        return `<code class="inline-code">${code}</code>`;
      }
    }
  ]
};