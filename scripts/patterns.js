/**
 * MMX PATTERN DEFINITIONS
 * 
 * This file exports all regex patterns used to convert MMX (custom markdown-like format) to HTML.
 * Patterns are organized in three categories:
 * - monoline: Single-line patterns (headings, hard breaks, separators, embedded code)
 * - multiline: Multi-line block patterns (code blocks, tables, notes)
 * - inline: Inline formatting patterns (bold, italic, links, images, audio, video)
 * 
 * Each pattern has a regex to match the MMX syntax and a replace function to convert to HTML.
 */

export const PATTERNS = {
  /**
   * MONOLINE PATTERNS - Single-line transformations
   * These patterns match and convert single lines of MMX to HTML
   * Processed early in the conversion pipeline
   */
  monoline: [
    /**
     * HEADING LEVEL 6 (######)
     * Supports optional ID for anchor links using %{id}% syntax
     * Example: ###### My Subheading %{section-1}%
     */
    { 
      regex: /^###### (.*?)\s*(?:%\{(.+?)\}%\s*)?$/gm, 
      replace: (match, text, id) => id 
        ? `<h6 id="${id}">${text}</h6>` 
        : `<h6>${text}</h6>`
    },

    /**
     * HEADING LEVEL 5 (#####)
     * Supports optional ID for anchor links
     */
    { 
      regex: /^##### (.*?)\s*(?:%\{(.+?)\}%\s*)?$/gm, 
      replace: (match, text, id) => id 
        ? `<h5 id="${id}">${text}</h5>` 
        : `<h5>${text}</h5>`
    },

    /**
     * HEADING LEVEL 4 (####)
     * Supports optional ID for anchor links
     */
    { 
      regex: /^#### (.*?)\s*(?:%\{(.+?)\}%\s*)?$/gm, 
      replace: (match, text, id) => id 
        ? `<h4 id="${id}">${text}</h4>` 
        : `<h4>${text}</h4>`
    },

    /**
     * HEADING LEVEL 3 (###)
     * Supports optional ID for anchor links
     */
    { 
      regex: /^### (.*?)\s*(?:%\{(.+?)\}%\s*)?$/gm, 
      replace: (match, text, id) => id 
        ? `<h3 id="${id}">${text}</h3>` 
        : `<h3>${text}</h3>`
    },

    /**
     * HEADING LEVEL 2 (##)
     * Supports optional ID for anchor links
     */
    { 
      regex: /^## (.*?)\s*(?:%\{(.+?)\}%\s*)?$/gm, 
      replace: (match, text, id) => id 
        ? `<h2 id="${id}">${text}</h2>` 
        : `<h2>${text}</h2>`
    },

    /**
     * HEADING LEVEL 1 (#)
     * Supports optional ID for anchor links
     * Top-level heading, often used as page title
     */
    { 
      regex: /^# (.*?)\s*(?:%\{(.+?)\}%\s*)?$/gm, 
      replace: (match, text, id) => id 
        ? `<h1 id="${id}">${text}</h1>` 
        : `<h1>${text}</h1>`
    },

    /**
     * HARD BREAK (#b)
     * Syntax: #b anywhere on a line
     * Creates a line break in the output
     * Converted to placeholder for later processing
     */
    { regex: /^#b.*$/gm, replace: '%%HARD_BREAK%%' },

    /**
     * HORIZONTAL SEPARATOR (#s)
     * Syntax: #s anywhere on a line
     * Creates a <hr> (horizontal rule) element for visual separation
     */
    { regex: /^#s.*$/gm, replace: '<hr>' },

    /**
     * EMBEDDED IFRAME/RAW HTML (#iframe())
     * Syntax: #iframe( ¡<html code here>! )
     * The special characters ¡ and ! mark the content boundaries
     * Used to embed interactive content like embeds, widgets, etc.
     * 
     * Example: #iframe( ¡<iframe src="..."></iframe>! )
     */
    {
      regex: /^\s*#iframe\(\s*¡([\s\S]+?)!\s*\)\s*$/gm,
      replace: (match, content) => {
        const html = content.trim();
        return `<div class="iframe">${html}</div>`;
      }
    },

    /**
     * CODE FILE INCLUSION (#code())
     * Syntax: #code(path/to/file.txt) [flags]
     * Loads code from external files and displays in a <pre> block
     * 
     * Flags (optional, space-separated):
     * - auto: Enable automatic syntax highlighting (uses hljs)
     * - className: Additional CSS classes for styling
     * 
     * Examples:
     *   #code(assets/example.js) auto
     *   #code(assets/config.json) highlighting
     *   #code(assets/data.txt) auto className1 className2
     */
    { 
      regex: /^#code\((.+?)\)(?:\s+([\w\s]+))?$/gm, 
      replace: (match, path, flags) => {
        // Parse the flags string into an array of tokens
        const opts = flags ? flags.trim().split(/\s+/) : [];

        // Check if 'auto' flag is present (for automatic syntax highlighting)
        const auto = opts.includes("auto");

        // Get all other flags as additional CSS classes
        const extraClasses = opts.filter(f => f !== "auto");

        // Base CSS classes for styling
        let classes = ["fileCode", "multiline-code", ...extraClasses];

        // Return <pre> with path attribute and optional auto flag
        // The path is used by client-side script to fetch and load the file
        return auto
          ? `<pre class="${classes.join(" ")}" path="${path}" auto="true"></pre>`
          : `<pre class="${classes.join(" ")}" path="${path}"></pre>`;
      }
    },

    /**
     * AUDIO (BLOCK-LEVEL)
     * Syntax: !!!( path/to/audio.mp3 ) [optional classes]
     * Must be on its own line at the start
     * Creates an audio player with controls
     * Useful for sound effects, music, audio content
     * 
     * Classes are optional CSS classes for styling/layout
     * 
     * Example:
     *   !!!( assets/intro.mp3 ) audio-player medium-size
     *   !!!( /uploads/song.wav )
     */
    { 
      regex: /^!!!\(([^)]+)\)(?:\s+([\w\-\s]+))?\s*$/gm, 
      replace: (match, src, classes) => {
        const cls = classes ? ` ${classes.trim().split(/\s+/).join(' ')}` : '';
        return `<div class="audio${cls}"><audio src="${src}" controls></audio></div>`;
      }
    },

    /**
     * VIDEO (BLOCK-LEVEL)
     * Syntax: !!( path/to/video.mp4 ) [optional classes]
     * Must be on its own line at the start
     * Creates a video player with controls
     * Supports common video formats (mp4, webm, ogg)
     * 
     * Example:
     *   !!( assets/tutorial.mp4 ) responsive
     *   !!( assets/demo.webm )
     */
    { 
      regex: /^!!\(([^)]+)\)(?:\s+([\w\-\s]+))?\s*$/gm, 
      replace: (match, src, classes) => {
        const clsAttr = classes ? ` class="${classes.trim().split(/\s+/).join(' ')}"` : '';
        return `<video src="${src}" controls${clsAttr}></video>`;
      }
    },

    /**
     * IMAGE (BLOCK-LEVEL)
     * Syntax: ![alt text](path/to/image.jpg) [optional classes]
     * Must be on its own line at the start
     * Standard markdown-style image syntax
     * Alt text is important for accessibility
     * 
     * Classes are optional CSS classes for styling
     * 
     * Example:
     *   ![My Profile](assets/profile.jpg) rounded centered
     *   ![Screenshot](assets/screenshot.png)
     */
    {
      regex: /^!\[([^\]]*)\]\(([^)]+)\)(?:\s+([\w\-\s]+))?\s*$/gm,
      replace: (match, alt, src, classes) => {
        const cls = classes ? ` class="${classes.trim().split(/\s+/).join(' ')}"` : '';
        return `<img alt="${alt}" class="img" src="${src}"${cls}>`;
      }
    }
  ],

  /**
   * MULTILINE PATTERNS - Block-level transformations
   * These patterns match opening (:::) and closing lines to define blocks
   * Processed by parseMultilineBlocks() in parser.js
   */
  multiline: [
    /**
     * NOTE BLOCK
     * Syntax:
     *   :::note [optional classes]
     *   Content here...
     *   :::
     * 
     * Creates a highlighted note box. Automatically prefixes with "Note:" label.
     * Classes can be added for custom styling.
     * 
     * Example:
     *   :::note important warning
     *   This is an important warning message.
     *   :::
     */
    {
      name: 'note',
      open: /^:::note(?:\s+([^\n]+))?\s*$/gm,
      close: /^:::\s*$/gm,
      tag: 'div',
      class: 'note',
    },

    /**
     * CODE/SYNTAX HIGHLIGHTING BLOCK
     * Syntax:
     *   :::code [language] [flags]
     *   Code here...
     *   :::
     * 
     * Creates a syntax-highlighted code block.
     * Raw: true = HTML entities are escaped to preserve code literally
     * 
     * Flags (optional):
     * - Language name (e.g., javascript, python, html) - for syntax highlighting
     * - auto: Enable automatic syntax highlighting with hljs
     * 
     * Examples:
     *   :::code javascript auto
     *   console.log('Hello World');
     *   :::
     * 
     *   :::code python
     *   def hello():
     *       print("Hello")
     *   :::
     */
    {
      name: 'code',
      open: /^:::code(?:\s+([^\n]+))?\s*$/gm,
      close: /^:::\s*$/gm,
      tag: 'pre',
      class: 'multiline-code',
      raw: true  // Important: escape HTML entities to preserve code
    },

    /**
     * VERTICAL TABLE
     * Syntax:
     *   #vtable [optional classes]
     *   Header 1 | Data 1 | Data 2
     *   Header 2 | Data 3 | Data 4
     *   #endvtable
     * 
     * Format: First column is headers, remaining columns are data cells
     * Use pipes (|) to separate columns
     * 
     * Example:
     *   #vtable
     *   Name | John Smith | Jane Doe
     *   Age | 30 | 28
     *   #endvtable
     */
    {
      name: 'vtable',
      open: /^#vtable(?:\s+([^\n]+))?\s*$/gm,
      close: /^#endvtable\s*$/gm,
      tag: 'table',
      class: 'vtable',
      raw: false
    },

    /**
     * HORIZONTAL TABLE
     * Syntax:
     *   #htable [optional classes]
     *   Header1 | Header2 | Header3
     *   Row1Col1 | Row1Col2 | Row1Col3
     *   Row2Col1 | Row2Col2 | Row2Col3
     *   #endhtable
     * 
     * Format: First row is headers, remaining rows are data rows
     * Use pipes (|) to separate columns
     * 
     * Example:
     *   #htable
     *   Name | Age | City
     *   John | 30 | New York
     *   Jane | 28 | Portland
     *   #endhtable
     */
    {
      name: 'htable',
      open: /^#htable(?:\s+([^\n]+))?\s*$/gm,
      close: /^#endhtable\s*$/gm,
      tag: 'table',
      class: 'htable',
      raw: false
    },

    /**
     * STANDARD TABLE
     * Syntax:
     *   #table [optional classes]
     *   Header1 | Header2 | Header3
     *   Data1 | Data2 | Data3
     *   Footer1 | Footer2 | Footer3
     *   #endtable
     * 
     * Format: First row = header, last row = footer, middle rows = body data
     * Use pipes (|) to separate columns
     * Supports <thead>, <tbody>, <tfoot> HTML structure
     * 
     * Example:
     *   #table striped
     *   Name | Score | Status
     *   Alice | 95 | Pass
     *   Bob | 87 | Pass
     *   Summary | Results | Complete
     *   #endtable
     */
    {
      name: 'table',
      open: /^#table(?:\s+([^\n]+))?\s*$/gm,
      close: /^#endtable\s*$/gm,
      tag: 'table',
      class: 'table',
      raw: false
    }
  ],

  /**
   * INLINE PATTERNS - Character-level formatting
   * These patterns match inline content and convert to HTML formatting
   * Applied to regular text and text within blocks (but not inside <pre> code blocks)
   */
  inline: [
    /**
     * INLINE IMAGE ICON
     * Syntax: <-path/to/image.svg->
     * Display small inline images/icons
     * Common for status indicators, badges, visual elements
     * 
     * Example: <-assets/icon-check.svg->
     */
    {
      regex: /<\-([^>]+)\->/g,
      replace: (match, src) => `<img class="inlineImg" alt="icon" src="${src}">`
    },

    /**
     * LINK/ANCHOR
     * Syntax: [link text](https://example.com)
     * Standard markdown-style link syntax
     * External links open in a new tab (target="_blank")
     * 
     * Example:
     *   [Click here](https://example.com)
     *   [Documentation](https://docs.example.com)
     */
    {
      regex: /\[([^\]]+)\]\(([^)]+)\)/g,
      replace: (match, text, href) => {
        return `<a target="_blank" href="${href}">${text}</a>`;
      }
    },

    /**
     * BOLD TEXT
     * Syntax: **text**
     * Creates <strong> tag for important, bold text
     * 
     * Example: This is **very important** text.
     */
    {
      regex: /\*\*(.*?)\*\*/g,
      replace: (match, text) => `<strong>${text}</strong>`
    },

    /**
     * ITALIC TEXT
     * Syntax: *text* or _text_
     * Creates <em> tag for emphasized, italic text
     * Note: Single asterisks are used for italic
     * 
     * Example: This is *emphasized* text.
     */
    {
      regex: /\*(.*?)\*/g,
      replace: (match, text) => `<em>${text}</em>`
    },

    /**
     * COLORED TEXT / TEXT WITH STYLE
     * Syntax: <c="color">text</c>
     * Apply custom colors to text
     * 
     * Example:
     *   <c="red">This is red text</c>
     *   <c="#0099FF">This is blue text</c>
     */
    { 
      regex: /<c="([^"]+)">(.*?)<\/c>/gs,
      replace: (match, color, content) => {
        return `<div class="coloredText" style="color: ${color};">${content}</div>`;
      }
    },

    /**
     * INLINE CODE / CODE SNIPPET
     * Syntax: `code`
     * Displays inline code with monospace font
     * 
     * Example:
     *   The `console.log()` function prints to console.
     *   Use `const` for javascript keywords
     */
    { 
      regex: /`([^`]+)`/g, 
      replace: (match, code) => {
        return `<code class="inline-code">${code}</code>`;
      }
    }
  ]
};