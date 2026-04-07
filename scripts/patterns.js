export const PATTERNS = {
monoline: [
    // H6
    { 
      regex: /^###### (.*?)\s*(?:%\{(.+?)\}%\s*)?$/gm, 
      replace: (match, text, id) => id 
        ? `<h6 id="${id}">${text}</h6>` 
        : `<h6>${text}</h6>`
    },

    // H5
    { 
      regex: /^##### (.*?)\s*(?:%\{(.+?)\}%\s*)?$/gm, 
      replace: (match, text, id) => id 
        ? `<h5 id="${id}">${text}</h5>` 
        : `<h5>${text}</h5>`
    },

    // H4
    { 
      regex: /^#### (.*?)\s*(?:%\{(.+?)\}%\s*)?$/gm, 
      replace: (match, text, id) => id 
        ? `<h4 id="${id}">${text}</h4>` 
        : `<h4>${text}</h4>`
    },

    // H3
    { 
      regex: /^### (.*?)\s*(?:%\{(.+?)\}%\s*)?$/gm, 
      replace: (match, text, id) => id 
        ? `<h3 id="${id}">${text}</h3>` 
        : `<h3>${text}</h3>`
    },

    // H2
    { 
      regex: /^## (.*?)\s*(?:%\{(.+?)\}%\s*)?$/gm, 
      replace: (match, text, id) => id 
        ? `<h2 id="${id}">${text}</h2>` 
        : `<h2>${text}</h2>`
    },

    // H1
    { 
      regex: /^# (.*?)\s*(?:%\{(.+?)\}%\s*)?$/gm, 
      replace: (match, text, id) => id 
        ? `<h1 id="${id}">${text}</h1>` 
        : `<h1>${text}</h1>`
    },

    // Hard break
    { regex: /^#b.*$/gm, replace: '%%HARD_BREAK%%' },

    //Separator (#s)
    { regex: /^#s.*$/gm, replace: '<hr>' },


    {
      regex: /^\s*#iframe\(\s*¡([\s\S]+?)!\s*\)\s*$/gm,
      replace: (match, content) => {
        const html = content.trim();
        return `<div class="iframe">${html}</div>`;
      }
    },

    


    // code from txt
    { 
      regex: /^#code\((.+?)\)(?:\s+([\w\s]+))?$/gm, 
      replace: (match, path, flags) => {

      // Convertir flags en array
      const opts = flags ? flags.trim().split(/\s+/) : [];

      // Detectar auto (único que NO es clase)
      const auto = opts.includes("auto");

      // Clases extra (todas excepto auto)
      const extraClasses = opts.filter(f => f !== "auto");

      // Clases base
      let classes = ["fileCode", "multiline-code", ...extraClasses];

      // Siempre <pre>, nunca <p>
      return auto
        ? `<pre class="${classes.join(" ")}" path="${path}" auto="true"></pre>`
        : `<pre class="${classes.join(" ")}" path="${path}"></pre>`;
    }
    

    },
  ],
  multiline: [
    {
      name: 'note',
      open: /^:::note(?:\s+([^\n]+))?\s*$/gm,
      close: /^:::\s*$/gm,
      tag: 'div',
      class: 'note',
    },
    {
      name: 'code',
      open: /^:::code(?:\s+([^\n]+))?\s*$/gm,
      close: /^:::\s*$/gm,
      tag: 'pre',
      class: 'multiline-code',
      raw: true
    },
    {
      name: 'vtable',
      open: /^#vtable(?:\s+([^\n]+))?\s*$/gm,
      close: /^#endvtable\s*$/gm,
      tag: 'table',
      class: 'vtable',
      raw: false
    },
    {
      name: 'htable',
      open: /^#htable(?:\s+([^\n]+))?\s*$/gm,
      close: /^#endhtable\s*$/gm,
      tag: 'table',
      class: 'htable',
      raw: false
    },
    {
      name: 'table',
      open: /^#table(?:\s+([^\n]+))?\s*$/gm,
      close: /^#endtable\s*$/gm,
      tag: 'table',
      class: 'table',
      raw: false
    }
  ],
  inline: [
    {
      regex: /<\-([^>]+)\->/g,
      replace: (match, src) => `<img class="inlineImg" alt="icon" src="${src}">`
    },
    { 
      regex: /!!!\(([^)]+)\)(?:\s+([\w\-\s]+))?/g, 
      replace: (match, src, classes) => {
        const cls = classes ? ` ${classes.trim().split(/\s+/).join(' ')}` : '';
        return `<div class="audio${cls}"><audio src="${src}" controls></audio></div>`;
      }
    },
    { 
      regex: /!!\(([^)]+)\)(?:\s+([\w\-\s]+))?/g, 
      replace: (match, src, classes) => {
        const clsAttr = classes ? ` class="${classes.trim().split(/\s+/).join(' ')}"` : '';
        return `<video src="${src}" controls${clsAttr}></video>`;
      }
    },
    {
      regex: /!\[([^\]]*)\]\(([^)]+)\)(?:\s+([\w\-\s]+))?/g,
      replace: (match, alt, src, classes) => {
        const cls = classes ? ` class="${classes.trim().split(/\s+/).join(' ')}` : '';
        return `<img alt="${alt}" class="img" src="${src}"${cls}>`;
      }
    },
    {
      regex: /\[([^\]]+)\]\(([^)]+)\)(?:\s+([\w\-\s]+))?/g,
      replace: (match, text, href, classes) => {
        const cls = classes ? ` class="${classes.trim().split(/\s+/).join(' ')}"` : '';
        return `<a target="_blank" href="${href}"${cls}>${text}</a>`;
      }
    },
    // **bold**
    {
      regex: /\*\*(.*?)\*\*/g,
      replace: (match, text) => `<strong>${text}</strong>`
    },

    // *italic*
    {
      regex: /\*(.*?)\*/g,
      replace: (match, text) => `<em>${text}</em>`
    },
    { 
      regex: /<c="([^"]+)">(.*?)<\/c>/gs,
      replace: (match, classes, content) => {
        const cls = classes.trim().split(/\s+/).join(' ');
        return `<div class="coloredText" style="color: ${cls};">${content}</div>`;
      }
    },
    { 
      regex: /`([^`]+)`(?:\s+([\w\-\s]+))?/g, 
      replace: (match, code, classes) => {
        const cls = classes ? ` ${classes.trim().split(/\s+/).join(' ')}` : '';
        return `<code class="inline-code${cls}">${code}</code>`;
      }
    }
  ]
};