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
      open: /^:::note\s*$/gm,
      close: /^:::\s*$/gm,
      tag: 'div',
      class: 'note',
    },
    {
      name: 'code',
      open: /^:::code(?:\s+(\w+))?.*$/gm,
      close: /^:::\s*$/gm,
      tag: 'pre',
      class: 'multiline-code',
      raw: true
    }
  ],
  inline: [
    { regex: /!!!\(([^)]+)\)/g, replace: '<div class="audio"><audio src="$1" controls></audio></div>' },
    { regex: /!!\(([^)]+)\)/g, replace: '<video src="$1" controls></video>' },
    { regex: /!\[([^\]]*)\]\(([^)]+)\)/g, replace: '<img alt="$1" src="$2">' },
    { regex: /\[([^\]]+)\]\(([^)]+)\)/g, replace: '<a target="_blank" href="$2">$1</a>' },
    { regex: /\*\*(.*?)\*\*/g, replace: '<strong>$1</strong>' },
    { regex: /\*(.*?)\*/g, replace: '<em>$1</em>' },
    { regex: /`([^`]+)`/g, replace: '<code class="inline-code">$1</code>' }
  ]
};