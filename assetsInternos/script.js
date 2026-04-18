/**
 * DOCUMENTATION VIEWER - CLIENT-SIDE SCRIPT
 * 
 * This script is loaded in every HTML page of the generated documentation.
 * It handles:
 * - Dynamic sidebar menu generation from index.json
 * - Icon loading (favicon detection and loading)
 * - Code block enhancements (syntax highlighting, copy buttons)
 * - Responsive hamburger menu for mobile devices
 * - Folder expand/collapse with session storage
 * - Media player initialization (video and audio)
 * - Image zoom functionality
 * 
 * Dependencies:
 * - highlight.js (hljs) - Syntax highlighting for code blocks
 * - Plyr.js - Video/audio player
 * - medium-zoom - Image zoom on click
 */

// ============================================================================
// SIDEBAR ICONS - SVG elements for folder expand/collapse
// ============================================================================

/**
 * Expand icon (plus sign inside a box)
 * Shows when a folder is collapsed and clickable to expand
 */
const iconExpand = `
<svg width="18" height="18" viewBox="0 0 32 32" fill="none">
  <rect x="2" y="2" width="28" height="28" rx="4" fill="#1E88E5"/>
  <rect x="6" y="6" width="20" height="20" rx="3" fill="none" stroke="#64B5F6" stroke-width="2"/>
  <line x1="16" y1="10" x2="16" y2="22" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="10" y1="16" x2="22" y2="16" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
</svg>`;

/**
 * Collapse icon (minus sign inside a box)
 * Shows when a folder is expanded and clickable to collapse
 */
const iconCollapse = `
<svg width="18" height="18" viewBox="0 0 32 32" fill="none">
  <rect x="2" y="2" width="28" height="28" rx="4" fill="#1E88E5"/>
  <rect x="6" y="6" width="20" height="20" rx="3" fill="none" stroke="#64B5F6" stroke-width="2"/>
  <line x1="10" y1="16" x2="22" y2="16" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
</svg>`;

/**
 * Global variable to store the project name
 * Loaded from config.json and used in the sidebar title
 */
let nombreProyecto;

// ============================================================================
// STEP 1: Load project configuration
// ============================================================================
/**
 * Fetch config.json to get project metadata
 * The config file contains project title, author, and other settings
 * This allows customization without modifying code
 */
fetch(prefix + "config.json")
  .then(res => res.json())
  .then(data => {
    nombreProyecto = data.project.title; // Extract project title for sidebar
  });

// ============================================================================
// STEP 2: Load favicon - Project icon detection and loading
// ============================================================================
/**
 * Attempts to load a favicon from the assets folder
 * Tries multiple image formats to maximize compatibility
 * Formats: svg, png, ico, webp, jpg, jpeg
 */
(async () => {
  const exts = ["svg", "png", "ico", "webp", "jpg", "jpeg"];
  
  // Try each extension in order
  for (const ext of exts) {
    const url = prefix + `assets/icon.${ext}`;
    
    // Check if the file exists using HEAD request (lightweight, no download)
    if ((await fetch(url, { method: "HEAD" })).ok) {
      // Insert the favicon link into the document head
      document.head.insertAdjacentHTML(
        "beforeend",
        `<link rel="icon" href="${url}">`
      );
      break; // Stop searching once found
    }
  }
})();

// ============================================================================
// STEP 3: Load code from external files (#code directive)
// ============================================================================
/**
 * Processes <pre class="fileCode"> elements that have a "path" attribute
 * Fetches the file content and injects it into the code block
 * Optionally applies syntax highlighting with hljs
 */
document.querySelectorAll('pre.fileCode').forEach(async pre => {
    // Get the file path from the path attribute
    const path = pre.getAttribute("path");

    try {
      // Fetch the file content
      const contenido = await fetch(path).then(r => r.text());

      // Create a code element and set its text content
      const code = document.createElement('code');
      code.textContent = contenido; // Text content prevents HTML parsing

      // Append the code to the pre element
      pre.appendChild(code);
      
      // If "auto" attribute is set, apply syntax highlighting
      if (pre.hasAttribute("auto")) {
        hljs.highlightElement(code); // Highlight with hljs
      }

      // Add a copy-to-clipboard button
      createCopyButton(pre);
    } catch (error) {
      console.error(`Error loading code from ${path}:`, error);
    }
});

// ============================================================================
// STEP 4: Load sidebar and build dynamic navigation menu
// ============================================================================
/**
 * Loads sidebar.html and initializes the navigation menu
 * Uses index.json to build a tree structure of all pages
 * Supports folder expand/collapse with session storage
 */
fetch(prefix + "assetsInternos/sidebar.html")
  .then(res => {
    if (!res.ok) throw new Error("Could not load sidebar.html");
    return res.text();
  })
  .then(html => {
    // Insert the sidebar HTML into the page
    document.body.insertAdjacentHTML('beforeend', html);
    
    // Initialize hamburger menu for mobile
    cargarMenuHamburguesa();

    // Load the auto-generated index.json file
    // Index contains the complete directory/page structure as JSON
    return fetch(prefix + "assetsInternos/index.json");
  })
  .then(res => {
    if (!res.ok) throw new Error("Could not load index.json");
    return res.json();
  })
  .then(indexData => {
    // Build the dynamic navigation menu from index.json data
    const menu = document.querySelector("#sidebar-menu");
    if (!menu) return; // Exit if no menu element found

    /**
     * ORGANIZE MENU ITEMS
     * Sort with loose files (pages) first, then folders
     * Both groups are alphabetically sorted
     */
    const orphans = indexData.filter(n => n.type === "file"); // Loose pages
    const folders = indexData.filter(n => n.type === "folder"); // Folders

    orphans.sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
    folders.sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically

    const ordered = [...orphans, ...folders]; // Combine: pages first, then folders

    // Set the sidebar title as a link to the home page
    document.getElementById("sidebar-title").href = prefix;
    document.getElementById("sidebar-title").textContent = nombreProyecto;

    /**
     * Recursively render the menu tree structure
     * Handles both files (links) and folders (collapsible sections)
     * 
     * @param {Object} node - A menu node (file or folder)
     * @param {Element} container - The DOM element to render into
     */
    function renderNode(node, container) {
      if (node.type === "file") {
        // FILE: Create a simple anchor link
        const a = document.createElement("a");
        a.href = prefix + "pages/" + node.path;
        a.textContent = node.name;
        a.style.display = "block";
        container.appendChild(a);
        return;
      }

      if (node.type === "folder") {
        // FOLDER: Create a collapsible section
        const folderId = "folder_" + node.path; // Unique ID based on path

        // Create the folder header (clickable title)
        const header = document.createElement("div");
        header.classList.add("folder-header");

        // Folder icon (expand/collapse indicator)
        const icon = document.createElement("span");
        icon.classList.add("folder-icon");

        // Folder name/title
        const title = document.createElement("span");
        title.textContent = node.name;
        title.classList.add("folder-title");

        // Assemble the header
        header.appendChild(icon);
        header.appendChild(title);
        container.appendChild(header);

        // Create the content container (hidden by default)
        const sub = document.createElement("div");
        sub.classList.add("folder-content");
        sub.style.marginLeft = "15px"; // Indent for visual hierarchy
        container.appendChild(sub);

        // Recursively render children (subfolders and files)
        node.children.forEach(child => renderNode(child, sub));

        /**
         * RESTORE COLLAPSED/EXPANDED STATE
         * Uses sessionStorage to remember folder states across page visits
         * Default: folders start collapsed
         */
        const savedState = sessionStorage.getItem(folderId);
        const isCollapsed = savedState === "closed" || savedState === null;

        if (isCollapsed) {
          sub.classList.add("collapsed"); // Hide the folder contents
          icon.innerHTML = iconExpand; // Show expand icon
        } else {
          icon.innerHTML = iconCollapse; // Show collapse icon
        }

        /**
         * SAVE AND RESTORE SCROLL POSITION
         * Remembers where the user was scrolled in the sidebar
         * Useful for long navigation menus
         */
        const tree = document.getElementById("sidebar-menu");

        // Restore scroll position on page load
        const savedScroll = sessionStorage.getItem("sidebar-menu");
        if (savedScroll !== null) {
          tree.scrollTop = parseInt(savedScroll, 10);
        }

        // Save scroll position in real-time as user scrolls
        tree.addEventListener("scroll", () => {
          sessionStorage.setItem("sidebar-menu", tree.scrollTop);
        });

        /**
         * TOGGLE FOLDER EXPANDED/COLLAPSED
         * Click handler for the folder header
         */
        header.addEventListener("click", () => {
          const collapsed = sub.classList.toggle("collapsed");

          if (collapsed) {
            // Folder is now collapsed
            icon.innerHTML = iconExpand;
            sessionStorage.setItem(folderId, "closed");
          } else {
            // Folder is now expanded
            icon.innerHTML = iconCollapse;
            sessionStorage.setItem(folderId, "open");
          }
        });
      }
    }

    // Render all top-level nodes into the menu
    ordered.forEach(node => renderNode(node, menu));

    /**
     * HIGHLIGHT CURRENT PAGE
     * Adds an "active" class to the link of the current page
     * Allows CSS styling to show which page is being viewed
     */
    const currentPath = path.replace(/^\//, ""); // Remove leading slash
    const links = document.querySelectorAll("#sidebar-menu a");
    links.forEach(a => {
      if (a.href.endsWith(currentPath)) {
        a.classList.add("active"); // Mark this link as the current page
      }
    });
  })
  .catch(err => console.error("Error loading sidebar:", err));

// ============================================================================
// STEP 5: Initialize hamburger menu for mobile
// ============================================================================
/**
 * Manages the responsive hamburger menu for mobile devices
 * Handles:
 * - Toggle sidebar visibility on mobile
 * - Auto-hide/show based on screen size (999px breakpoint)
 * - Sync button state with sidebar visibility
 * - Apply appropriate CSS classes based on screen size
 */
function cargarMenuHamburguesa() {
  const btn = document.getElementById("icon-btn"); // Hamburger button in main
  const btn2 = document.getElementById("icon-btn2"); // Close button in sidebar
  const nav = document.getElementById("sidebar"); // Sidebar element
  const main = document.getElementsByTagName("main")[0]; // Main content area

  /**
   * EVENT: Click hamburger or close button
   * Toggles sidebar visibility on mobile
   */
  btn.addEventListener("click", () => {
    nav.classList.toggle("show"); // Show/hide sidebar
    btn2.classList.toggle("active"); // Update button appearance
    main.classList.toggle("sidebarActiva"); // Adjust main content layout
  });

  btn2.addEventListener("click", () => {
    nav.classList.toggle("show");
    btn2.classList.toggle("active");
    main.classList.toggle("sidebarActiva");
  });

  /**
   * RESPONSIVE BEHAVIOR
   * Media query at 999px breakpoint to detect mobile vs desktop
   * Automatically adjusts sidebar visibility based on screen size
   */
  const mq = window.matchMedia("(max-width: 999px)");

  /**
   * Handler for screen size changes
   * Only executes when crossing the 999px threshold, not on every resize
   */
  function handleChange(e) {
    if (e.matches) {
      // MOBILE MODE: Hide sidebar, show hamburger menu
      nav.classList.remove("show");
      btn2.classList.remove("active");
      main.classList.remove("sidebarActiva");
      main.classList.remove("pc");
      
    } else {
      // DESKTOP MODE: Show sidebar permanently
      nav.classList.add("show");
      btn2.classList.add("active");
      main.classList.add("sidebarActiva");
      main.classList.add("pc");
    }
  }

  // Execute on initial load to set correct state
  handleChange(mq);

  // Execute only when crossing the 999px threshold
  mq.addEventListener("change", handleChange);
}

// ============================================================================
// STEP 6: Copy-to-clipboard buttons for code blocks
// ============================================================================
/**
 * Adds copy buttons to all inline code blocks (not file code blocks)
 * Users can click to copy code to their clipboard
 */
document.querySelectorAll('pre.multiline-code').forEach(pre => {
    // Skip file code blocks (they get their own copy button in step 3)
    if (pre.classList.contains("fileCode")) return;
    
    // Create and attach copy button
    createCopyButton(pre);
});

/**
 * Creates a copy button and appends it to a code block
 * 
 * @param {Element} father - The <pre> element to add the button to
 */
function createCopyButton(father) {
    father.insertAdjacentHTML("beforeend", `
          <button class="copy-btn" title="Copy code to clipboard">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
          </button>
    `);

    // Set up the click handler for this button
    putCopyButton(father.querySelector(".copy-btn"));
}

/**
 * Handles copy button click event
 * Copies code content to clipboard and shows confirmation
 * 
 * @param {Element} btn - The copy button element
 */
function putCopyButton(btn) {
  btn.addEventListener('click', async () => {
    // Disable button and show "copied" state
    btn.classList.add('copied', 'disabled');
    
    const originalHTML = btn.innerHTML;

    // Change button appearance to show "Copied" message
    btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span class="copy-text">Copied</span>
    `;

    try {
      // Find the code element within the <pre> block
      const pre = btn.closest('pre.multiline-code');
      const code = pre.querySelector('code');
      if (!code) throw new Error('No code found');

      // Copy the code text to clipboard
      await navigator.clipboard.writeText(code.innerText);

      // Revert button after 1 second
      setTimeout(() => {
        btn.classList.remove('copied', 'disabled');
        btn.innerHTML = originalHTML;
      }, 1000);

    } catch (err) {
      console.error('Error copying code:', err);
      // Reset button on error
      btn.classList.remove('copied', 'disabled');
      btn.innerHTML = originalHTML;
    }
  });
}

// ============================================================================
// STEP 7: Initialize syntax highlighting for code blocks
// ============================================================================
/**
 * Apply highlight.js (hljs) to all code blocks with auto="true"
 * This provides syntax highlighting for popular programming languages
 */
const codes = document.querySelectorAll('pre[auto="true"] > code');
codes.forEach(el => {
    hljs.highlightElement(el); // Apply syntax highlighting
});

// ============================================================================
// STEP 8: Initialize media players and image zoom
// ============================================================================
/**
 * medium-zoom: Click on images to zoom in/out
 * Enhanced viewing experience for documentation graphics
 */
mediumZoom('.img');

/**
 * Plyr.js: Initialize video and audio players
 * Provides custom, responsive media controls
 */
const players = Plyr.setup('video'); // Video player controls
const aundioPlayers = Plyr.setup('audio'); // Audio player controls

// ============================================================================
// STEP 9: Generate header navigator (table of contents) on right side
// ============================================================================
/**
 * Creates a table of contents navigator on the right side
 * Shows all headers (h1-h6) from the main content
 * Only visible on PC (desktop) with sufficient screen width
 */
function generateHeaderNavigator() {
  const main = document.querySelector('main');
  if (!main) return;

  // Get all headers from the main content
  const headers = main.querySelectorAll('h1, h2, h3, h4, h5, h6');
  
  if (headers.length === 0) return;

  // Create the navigator container
  const nav = document.createElement('nav');
  nav.id = 'header-navigator';
  nav.setAttribute('aria-label', 'Table of contents');
  
  // Add title
  const title = document.createElement('div');
  title.id = 'header-navigator-title';
  title.textContent = 'On this page';
  nav.appendChild(title);

  // Create list
  const list = document.createElement('ul');
  nav.appendChild(list);

  // Process each header
  headers.forEach((header, index) => {
    // Generate an ID if the header doesn't have one
    let id = header.id;

    // Determine the level for indentation
    const level = header.tagName.toLowerCase(); // 'h1', 'h2', etc.
    
    // Create list item
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#' + id;
    a.textContent = header.textContent;
    a.classList.add('nav-' + level);
    
    // Handle click for smooth scroll
    let clickTimeout = null;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
        // Update URL without reload
        history.pushState(null, null, '#' + id);
        
        // Clear any pending timeout
        if (clickTimeout) clearTimeout(clickTimeout);
        
        // Ignore scroll-based updates for 1 second
        ignoreScrollUpdates = true;
        
        // Temporary highlight
        list.querySelectorAll('a').forEach(l => l.classList.remove('active'));
        a.classList.add('active');
        
        // After 1 second, let updateActiveHeader take over
        clickTimeout = setTimeout(() => {
          ignoreScrollUpdates = false;
          a.classList.remove('active');
          updateActiveHeader();
        }, 1000);
      }
    });

    li.appendChild(a);
    list.appendChild(li);
  });

  // Add to body
  document.body.appendChild(nav);

  // Flag to temporarily ignore scroll-based updates (set when user clicks a link)
  let ignoreScrollUpdates = false;

  // Highlight current section on scroll
  // Uses scroll position to determine which header is currently visible
  function updateActiveHeader() {
    // Skip if user just clicked a link (temporary highlight active)
    if (ignoreScrollUpdates) return;
    
    const allLinks = list.querySelectorAll('a');
    if (allLinks.length === 0) return;
    
    // Get current scroll position (top of viewport)
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    
    // Find the header that is closest to the top of the viewport
    // and either above it or just below it
    let activeLink = null;
    let minDistance = Infinity;
    
    allLinks.forEach(link => {
      const id = link.getAttribute('href').substring(1);
      const el = document.getElementById(id);
      if (el) {
        const rect = el.getBoundingClientRect();
        
        // Use rect.top directly (distance from viewport top)
        // Negative = above viewport, Positive = below viewport
        const distance = rect.top;
        
        // We want headers that are:
        // 1. Above the viewport (distance < 0), OR
        // 2. Just below the viewport top (distance > 0 but < 100)
        // Both should be close to the top of the viewport
        if ((distance < 0 && distance > -600) || (distance >= 0 && distance < 100)) {
          if (Math.abs(distance) < minDistance) {
            minDistance = Math.abs(distance);
            activeLink = link;
          }
        }
      }
    });
    
    // If no header found, use the first one that's in the viewport
    if (!activeLink) {
      for (const link of allLinks) {
        const id = link.getAttribute('href').substring(1);
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top > 0 && rect.top < window.innerHeight) {
            activeLink = link;
            break;
          }
        }
      }
    }
    
    // Update active state (but preserve user-clicked state)
    list.querySelectorAll('a').forEach(link => {
      // Don't remove if user just clicked this link (temporary override)
      if (!link.classList.contains('user-clicked')) {
        link.classList.remove('active');
      }
    });
    
    if (activeLink) {
      activeLink.classList.add('active');
    }
  }
  
  // Update on scroll with debounce for performance
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(updateActiveHeader, 5);
  });
  
  // Initial update
  updateActiveHeader();

  // Observe all headers
  headers.forEach((header) => {
    if (header.id) {
      observer.observe(header);
    }
  });
}

// Run the header navigator on desktop
if (window.innerWidth >= 1600) {
  generateHeaderNavigator();
}

// Also run when resizing to desktop
window.addEventListener('resize', () => {
  if (window.innerWidth >= 1600 && !document.getElementById('header-navigator')) {
    generateHeaderNavigator();
  }
});