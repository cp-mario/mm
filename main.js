/**
 * MAIN DOCUMENTATION GENERATOR SCRIPT
 * This script is part of the documentation generation pipeline and does NOT end up in the final documentation.
 * 
 * Main purpose:
 * - Converts .mmx (custom markdown-like format) files to HTML
 * - Generates a complete project structure with proper file hierarchy
 * - Creates an index.json for dynamic navigation menu generation
 * - Copies assets, configuration, and internal styling files
 * - Handles path prefixes for deep nested documentation structures
 */

// IMPORTS ===============================================
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { mmxToHtml } from "./scripts/parser.js"; // Converts custom MMX format to HTML
import { parseMCFG } from "./scripts/MCFGParser.js" // Parses the config.mcfg configuration file
// =======================================================

// CONFIG LOADING - Read and parse the configuration file
// config.mcfg contains settings like inputPath, outputPath, singleFile mode, etc.
const CONFIG = parseMCFG(fs.readFileSync('./config.mcfg', 'utf-8'))



// ============================================================================
// INDEX.JSON GENERATOR - Creates a tree structure of all pages
// ============================================================================
/**
 * Recursively scans a directory and builds a JSON tree structure.
 * Used to create the navigation menu that gets loaded into the HTML pages.
 * 
 * Returns: Array with folders and files organized hierarchically
 * Example: { type: "folder", name: "Getting Started", children: [...] }
 */
function generateIndexRecursive(sourceDir, rootDir) {
  const items = fs.readdirSync(sourceDir); // Read all items in the directory
  const result = [];

  for (const item of items) {
    const fullPath = path.join(sourceDir, item);
    const stat = fs.statSync(fullPath); // Check if it's a file or folder

    if (stat.isDirectory()) {
      // If it's a folder, recursively process it and add it to the tree
      result.push({
        type: "folder",
        name: item,
        path: path.relative(rootDir, fullPath), // Store relative path
        children: generateIndexRecursive(fullPath, rootDir) // Recursively process children
      });
    } else if (item.endsWith(".html")) {
      // If it's an HTML file, add it as a file entry (remove .html extension for display)
      result.push({
        type: "file",
        name: item.replace(".html", ""),
        path: path.relative(rootDir, fullPath)
      });
    }
  }

  return result;
}

// ============================================================================
// PROJECT PROCESSING FUNCTIONS
// ============================================================================
/**
 * Main orchestrator function that processes an entire documentation project.
 * 
 * Steps performed:
 * 1. Copies internal assets (sidebar, styles, scripts)
 * 2. Copies project-specific config.json
 * 3. Copies project assets folder
 * 4. Converts all .mmx pages to HTML with proper structure
 * 5. Generates index.json for navigation
 * 
 * @param {string} sourceDir - Input directory with .mmx files
 * @param {string} outputDir - Output directory for generated HTML
 * @param {Object} options - Configuration options
 */
function processProjectStructure(sourceDir, outputDir, options = {}) {
  const { deleteOriginals = false, verbose = true } = options; // Configuration options
  const log = (msg) => verbose && console.log(msg); // Conditional logging function

  log(`\nProcessing project: ${sourceDir}`);
  log(`Output: ${outputDir}\n`);

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Statistics tracker for the conversion process
  const stats = { processed: 0, errors: 0, copied: 0 };

  // STEP 1: Copy internal assets (sidebar, styles, scripts)
  // These files are essential for the HTML pages to display correctly
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const assetsInternosSource = path.join(__dirname, "assetsInternos");

  if (fs.existsSync(assetsInternosSource)) {
    const assetsInternosDest = path.join(outputDir, "assetsInternos");
    copyDirectoryRecursive(assetsInternosSource, assetsInternosDest);
    log(`assetsInternos/ copied`);
  }

  // STEP 2: Copy project configuration file
  // This file contains metadata like project title, author, etc.
  const configSource = path.join(sourceDir, 'config.json');
  if (fs.existsSync(configSource)) {
    fs.copyFileSync(configSource, path.join(outputDir, 'config.json'));
    log(`config.json copied`);
  }

  // STEP 3: Copy project assets (images, downloads, etc.)
  const assetsSource = path.join(sourceDir, 'assets');
  if (fs.existsSync(assetsSource)) {
    copyDirectoryRecursive(assetsSource, path.join(outputDir, 'assets'));
    log(`assets/ copied`);
  }

  // STEP 4: Process all pages directory
  // Convert .mmx files to HTML recursively
  const pagesSource = path.join(sourceDir, 'pages');
  const pagesDest = path.join(outputDir, 'pages');
  if (!fs.existsSync(pagesDest)) fs.mkdirSync(pagesDest, { recursive: true });

  processPagesRecursive(pagesSource, pagesDest, stats, { deleteOriginals, log, outputRoot: outputDir });
  
  // STEP 5: Process root index.mmx file (if exists)
  const rootIndexMmx = path.join(sourceDir, "index.mmx");
  if (fs.existsSync(rootIndexMmx)) {
    const rootIndexHtml = path.join(outputDir, "index.html");
    log(`index.mmx → index.html`);
    
    // Convert the root index file
    convertMmxFile(rootIndexMmx, rootIndexHtml, outputDir);
    stats.processed++;
  }

  // STEP 6: Generate index.json for dynamic navigation menu
  const indexData = generateIndexRecursive(pagesDest, pagesDest);
  const indexPath = path.join(outputDir, "assetsInternos", "index.json");
  fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2), "utf8");
  log(`Generated index: assetsInternos/index.json`);

  // STEP 7: Log summary of the conversion process
  log(`\nSummary:`);
  log(`Converted: ${stats.processed}`);
  log(`Copied: ${stats.copied}`);
  log(`Errors: ${stats.errors}`);
  log(`Process completed\n`);
}


/**
 * Recursively copies an entire directory structure.
 * Creates destination directories as needed.
 * 
 * @param {string} source - Source directory to copy from
 * @param {string} destination - Destination directory to copy to
 */
function copyDirectoryRecursive(source, destination) {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(destination)) fs.mkdirSync(destination, { recursive: true });
  
  // Read all files and folders in source
  const items = fs.readdirSync(source);
  
  for (const item of items) {
    const srcPath = path.join(source, item);
    const destPath = path.join(destination, item);
    const stat = fs.statSync(srcPath);
    
    // If it's a directory, recursively copy it
    if (stat.isDirectory()) {
      copyDirectoryRecursive(srcPath, destPath);
    } else {
      // If it's a file, copy it directly
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Recursively processes all .mmx files in the pages directory.
 * Converts .mmx files to HTML and copies non-mmx files as-is.
 * 
 * Key features:
 * - Maintains folder structure
 * - Uses outputRoot consistently for path calculations
 * - Tracks conversion statistics
 * 
 * @param {string} sourceDir - Source pages directory
 * @param {string} outputDir - Destination pages directory
 * @param {Object} stats - Statistics object to track progress
 * @param {Object} options - Configuration options including outputRoot
 */
function processPagesRecursive(sourceDir, outputDir, stats, options) {
  // Extract configuration options
  const { deleteOriginals, log, outputRoot } = options;
  
  // Read all items in the current directory
  const items = fs.readdirSync(sourceDir);

  for (const item of items) {
    const srcPath = path.join(sourceDir, item);
    const destPath = path.join(outputDir, item);
    const stat = fs.statSync(srcPath);

    // If it's a directory, create it and process recursively
    if (stat.isDirectory()) {
      if (!fs.existsSync(destPath)) fs.mkdirSync(destPath, { recursive: true });
      
      // Recursively process the subdirectory while keeping outputRoot consistent
      processPagesRecursive(srcPath, destPath, stats, { 
        deleteOriginals, 
        log, 
        outputRoot  // Important: Pass the same outputRoot, don't change it
      });

    } else if (item.endsWith('.mmx')) {
      // If it's an .mmx file, convert it to HTML
      try {
        const htmlName = item.replace('.mmx', '.html');
        const htmlDest = path.join(outputDir, htmlName);

        log(`${item} → ${htmlName}`);
        
        // Convert the MMX file to HTML with proper path references
        convertMmxFile(srcPath, htmlDest, outputRoot);
        
        stats.processed++; // Increment conversion counter
        if (deleteOriginals) fs.unlinkSync(srcPath); // Optionally delete the original .mmx file
      } catch (error) {
        console.error(`Error processing ${item}:`, error.message);
        stats.errors++; // Increment error counter
      }
    } else {
      // If it's any other file, just copy it
      fs.copyFileSync(srcPath, destPath);
      stats.copied++; // Increment copy counter
    }
  }
}


/**
 * Calculates the relative path prefix needed to correctly reference assets.
 * This is crucial for nested documentation where pages at different depths need
 * different relative paths to access the same assets.
 * 
 * Example:
 * - File at pages/index.html needs prefix: ./
 * - File at pages/Getting Started/Basics.html needs prefix: ../../
 * 
 * @param {string} outputPath - The full path of the output HTML file
 * @param {string} outputRoot - The root output directory
 * @returns {string} - Relative path prefix (e.g., "./" or "../../")
 */
function calculatePrefix(outputPath, outputRoot) {
  // Normalize paths to avoid cross-platform slash issues (\\ vs /)
  const normalizedOutput = path.normalize(outputPath);
  const normalizedRoot = path.normalize(outputRoot);
  
  // Get the directory containing the output file
  const fileDir = path.dirname(normalizedOutput);
  
  // Calculate relative path from root to the file's directory
  const relativeDir = path.relative(normalizedRoot, fileDir);
  
  // Debug section - uncomment to see what's happening
  // console.log(`[DEBUG] outputPath: ${outputPath}`);
  // console.log(`[DEBUG] outputRoot: ${outputRoot}`);
  // console.log(`[DEBUG] fileDir: ${fileDir}`);
  // console.log(`[DEBUG] relativeDir: "${relativeDir}"`);
  
  // If the file is in the root, return "./"
  if (!relativeDir || relativeDir === '.' || relativeDir.startsWith('..')) {
    return './';
  }
  
  // Count depth by splitting the relative path
  const depth = relativeDir.split(path.sep).filter(p => p && p !== '/').length;
  
  // Create prefix: one "../" for each level + "./" at the end
  // Example: depth=2 → "../" + "../" + "./" = "../.././"
  return '../'.repeat(depth) + './';
}

/**
 * Applies path prefixes to all relative asset references in HTML.
 * Handles:
 * - Image/video/audio sources
 * - Internal page links
 * - Asset file references
 * - Code file paths
 * 
 * Does NOT modify:
 * - Absolute URLs (http://, https://)
 * - Anchor links (#)
 * - Email/phone links
 * 
 * @param {string} html - The HTML content to process
 * @param {string} prefix - The relative path prefix to apply
 * @returns {string} - HTML with corrected paths
 */
function applyPathPrefix(html, prefix) {
  // Pattern to avoid matching external URLs
  const notExternal = '(?!https?://|//|mailto:|tel:)';
  
  return html
    // ========================================
    // MEDIA FILES - Add prefix to sources
    // ========================================
    // Handles: <img src="assets/...">  <video src="assets/...">  <audio src="assets/...">
    .replace(/(src=["'])(assets\/[^"']+)/g, `$1${prefix}$2`)
    
    // ========================================
    // LINKS - Add prefix and ensure internal navigation
    // ========================================
    
    // Internal page links with target="_blank" → target="_self" (stay in doc)
    .replace(/<a\s+target="_blank"\s+href=["'](pages\/[^"']+)["']/g, 
      `<a target="_self" href="${prefix}$1"`)
    
    // Anchor links (#section) → target="_self" (no prefix needed for anchors)
    .replace(/<a\s+target="_blank"\s+href=["'](#[^"']+)["']/g, 
      `<a target="_self" href="$1"`)
    
    // Asset file links with target="_blank" → target="_self"
    .replace(/<a\s+target="_blank"\s+href=["'](assets\/[^"']+)["']/g, 
      `<a target="_self" href="${prefix}$1"`)
    
    // External URLs maintain their target="_blank" - no changes needed
    
    // ========================================
    // HREF ATTRIBUTES - Standalone href paths
    // ========================================
    // Links to pages/ directory
    .replace(/(href=["'])(pages\/[^"']+)/g, `$1${prefix}$2`)
    
    // Links to assets/ directory
    .replace(/(href=["'])(assets\/[^"']+)/g, `$1${prefix}$2`)

    // ========================================
    // CODE FILE PATHS - For code blocks that load external files
    // ========================================
    .replace(/(path=["'])(assets\/[^"']+)/g, `$1${prefix}$2`)
}

/**
 * Converts a single .mmx file to HTML.
 * 
 * Process:
 * 1. Read the .mmx content file
 * 2. Read the HTML template
 * 3. Convert .mmx markup to HTML
 * 4. Extract page title from the first heading (#)
 * 5. Replace template placeholders
 * 6. Calculate and apply relative path prefixes
 * 7. Write the final HTML file
 * 
 * @param {string} inputPath - Path to the .mmx input file
 * @param {string} outputPath - Path to the HTML output file
 * @param {string} outputRoot - Root directory for calculating relative paths
 */
function convertMmxFile(inputPath, outputPath, outputRoot) {
  // Read the MMX content file
  const content = fs.readFileSync(inputPath, "utf8");
  
  // Read the HTML template with placeholders
  const template = fs.readFileSync("./template.html", "utf8");
  
  // Convert MMX markup to HTML using the parser
  const htmlContent = mmxToHtml(content);

  // Extract the page title from the first h1 heading (# Title)
  const titleMatch = content.match(/^# (.+)$/m);
  const title = titleMatch ? titleMatch[1] : "Documentation";

  // Calculate the relative path prefix for this file's depth
  const prefix = calculatePrefix(outputPath, outputRoot);
  
  // Replace template placeholders with actual content
  let finalTemplate = template
    .replaceAll("{{title}}", title) // Page title in <title> tag
    .replaceAll("{{content}}", htmlContent); // Page content in body
  
  // Apply relative path prefixes to all asset and page references
  finalTemplate = applyPathPrefix(finalTemplate, prefix);

  // Write the final HTML file
  fs.writeFileSync(outputPath, finalTemplate, "utf8");
}

// ============================================================================
// INITIALIZATION AND MAIN EXECUTION
// ============================================================================

// Clear the output directory before generating (if it exists)
// This prevents accumulation of old files from previous runs
if (!CONFIG.singleFile) {
  const dir = CONFIG.outputPath;

  if (fs.existsSync(dir)) {
    // Read all items in the output directory
    for (const file of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, file);

      // Remove subdirectories recursively
      if (fs.statSync(fullPath).isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        // Remove individual files
        fs.unlinkSync(fullPath);
      }
    }
  }
}

/**
 * Main function that orchestrates the entire document generation process.
 * 
 * Two modes:
 * 1. FULL PROJECT MODE (singleFile=false): Processes entire project structure
 * 2. SINGLE FILE MODE (singleFile=true): Converts a single .mmx file to HTML
 */
function main() {
  if (!CONFIG.singleFile) {
    // MODE 1: Process entire project with folder structure
    if (!fs.existsSync(CONFIG.inputPath)) {
      console.error(`Error: Input folder does not exist: ${CONFIG.inputPath}`);
      process.exit(1);
    }
    
    // Start the full project processing pipeline
    processProjectStructure(CONFIG.inputPath, CONFIG.outputPath, {
      deleteOriginals: false,
      verbose: true,
      outputRoot: CONFIG.outputPath  // Pass the root directory for path calculations
    });

  } else {
    // MODE 2: Convert a single .mmx file to HTML
    try {
      // Read the single input file
      const content = fs.readFileSync(singleInputPath, "utf8");
      
      // Read the HTML template
      const template = fs.readFileSync("./template.html", "utf8");
      
      // Convert MMX to HTML
      const htmlContent = mmxToHtml(content);

      // Extract page title
      const titleMatch = content.match(/^# (.+)$/m);
      const title = titleMatch ? titleMatch[1] : "Documentation";

      // Replace template placeholders
      const finalTemplate = template
        .replaceAll("{{title}}", title)
        .replaceAll("{{content}}", htmlContent);

      // Create output directory if needed
      const dir = path.dirname(singleOutputPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      // Write the final HTML file
      fs.writeFileSync(singleOutputPath, finalTemplate, "utf8");
      console.log(`Generated: ${singleOutputPath}`);

    } catch (error) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  }
}

// Execute the main function
main();
