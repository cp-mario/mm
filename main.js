//Este script pertenece a la parte de generación de la documentación, no va a acabar en la documentación final

//imports =========================================
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { mmxToHtml } from "./scripts/parser.js";
import { parseMCFG } from "./scripts/MCFGParser.js"
//=================================================


//Importar configuración desde config.mcfg

const CONFIG = parseMCFG(fs.readFileSync('./config.mcfg', 'utf-8'))


// ============================================================================
// GENERADOR DE INDEX.JSON
// ============================================================================
function generateIndexRecursive(sourceDir, rootDir) {
  const items = fs.readdirSync(sourceDir);
  const result = [];

  for (const item of items) {
    const fullPath = path.join(sourceDir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      result.push({
        type: "folder",
        name: item,
        path: path.relative(rootDir, fullPath),
        children: generateIndexRecursive(fullPath, rootDir)
      });
    } else if (item.endsWith(".html")) {
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
// FUNCIONES DE PROCESAMIENTO DE PROYECTO
// ============================================================================
function processProjectStructure(sourceDir, outputDir, options = {}) {
  const { deleteOriginals = false, verbose = true } = options;
  const log = (msg) => verbose && console.log(msg);

  log(`\nProcesando proyecto: ${sourceDir}`);
  log(`Output: ${outputDir}\n`);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const stats = { processed: 0, errors: 0, copied: 0 };

  // Copiar assetsInternos
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const assetsInternosSource = path.join(__dirname, "assetsInternos");

  if (fs.existsSync(assetsInternosSource)) {
    const assetsInternosDest = path.join(outputDir, "assetsInternos");
    copyDirectoryRecursive(assetsInternosSource, assetsInternosDest);
    log(`assetsInternos/ copiado`);
  }

  // Copiar config.json
  const configSource = path.join(sourceDir, 'config.json');
  if (fs.existsSync(configSource)) {
    fs.copyFileSync(configSource, path.join(outputDir, 'config.json'));
    log(`config.json copiado`);
  }

  // Copiar assets/
  const assetsSource = path.join(sourceDir, 'assets');
  if (fs.existsSync(assetsSource)) {
    copyDirectoryRecursive(assetsSource, path.join(outputDir, 'assets'));
    log(`assets/ copiado`);
  }

  // Procesar pages/
  const pagesSource = path.join(sourceDir, 'pages');
  const pagesDest = path.join(outputDir, 'pages');
  if (!fs.existsSync(pagesDest)) fs.mkdirSync(pagesDest, { recursive: true });

  processPagesRecursive(pagesSource, pagesDest, stats, { deleteOriginals, log, outputRoot: outputDir });
  // Procesar index.mmx en la raíz del proyecto
  const rootIndexMmx = path.join(sourceDir, "index.mmx");
  if (fs.existsSync(rootIndexMmx)) {
    const rootIndexHtml = path.join(outputDir, "index.html");
    log(`index.mmx → index.html`);
    
    // 👇 Usar outputDir ya que outputRoot no existe aquí
    convertMmxFile(rootIndexMmx, rootIndexHtml, outputDir);
    stats.processed++;
  }


  //GENERAR INDEX.JSON
  const indexData = generateIndexRecursive(pagesDest, pagesDest);
  const indexPath = path.join(outputDir, "assetsInternos", "index.json");
  fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2), "utf8");
  log(`Generado índice: assetsInternos/index.json`);

  // Resumen
  log(`\nResumen:`);
  log(`Convertidos: ${stats.processed}`);
  log(`Copiados: ${stats.copied}`);
  log(`Errores: ${stats.errors}`);
  log(`Proceso completado\n`);
}

function copyDirectoryRecursive(source, destination) {
  if (!fs.existsSync(destination)) fs.mkdirSync(destination, { recursive: true });
  const items = fs.readdirSync(source);
  for (const item of items) {
    const srcPath = path.join(source, item);
    const destPath = path.join(destination, item);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyDirectoryRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function processPagesRecursive(sourceDir, outputDir, stats, options) {
  // 👇 Extraer outputRoot con valor por defecto
  const { deleteOriginals, log, outputRoot } = options;
  
  const items = fs.readdirSync(sourceDir);

  for (const item of items) {
    const srcPath = path.join(sourceDir, item);
    const destPath = path.join(outputDir, item);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      if (!fs.existsSync(destPath)) fs.mkdirSync(destPath, { recursive: true });
      
      // 👇 CRÍTICO: Propagar outputRoot SIN CAMBIAR
      processPagesRecursive(srcPath, destPath, stats, { 
        deleteOriginals, 
        log, 
        outputRoot  // 👈 Mismo valor, nunca outputDir
      });

    } else if (item.endsWith('.mmx')) {
      try {
        const htmlName = item.replace('.mmx', '.html');
        const htmlDest = path.join(outputDir, htmlName);

        log(`${item} → ${htmlName}`);
        
        // 👇 outputRoot debe estar definido aquí
        convertMmxFile(srcPath, htmlDest, outputRoot);
        
        stats.processed++;
        if (deleteOriginals) fs.unlinkSync(srcPath);
      } catch (error) {
        console.error(`  ❌ Error en ${item}:`, error.message);
        stats.errors++;
      }
    } else {
      fs.copyFileSync(srcPath, destPath);
      stats.copied++;
    }
  }
}

// Calcula el prefijo de rutas relativas según la profundidad del archivo
function calculatePrefix(outputPath, outputRoot) {
  // Normalizar rutas para evitar problemas con slashes
  const normalizedOutput = path.normalize(outputPath);
  const normalizedRoot = path.normalize(outputRoot);
  
  // Obtener el directorio del archivo de salida
  const fileDir = path.dirname(normalizedOutput);
  
  // Calcular ruta relativa desde la raíz hasta el directorio del archivo
  const relativeDir = path.relative(normalizedRoot, fileDir);
  
  // Debug (descomenta para ver qué está pasando)
  // console.log(`[DEBUG] outputPath: ${outputPath}`);
  // console.log(`[DEBUG] outputRoot: ${outputRoot}`);
  // console.log(`[DEBUG] fileDir: ${fileDir}`);
  // console.log(`[DEBUG] relativeDir: "${relativeDir}"`);
  
  // Si relativeDir es vacío o '.', el archivo está en la raíz
  if (!relativeDir || relativeDir === '.' || relativeDir.startsWith('..')) {
    return './';
  }
  
  // Contar profundidad: dividir por sep del SO o por '/' como fallback
  const depth = relativeDir.split(path.sep).filter(p => p && p !== '/').length;
  
  // Construir prefijo: ../ por cada nivel + ./ al final
  return '../'.repeat(depth) + './';
}

// Aplica el prefijo a las rutas de assets y páginas en el HTML generado
function applyPathPrefix(html, prefix) {
  // Evitar modificar URLs absolutas o externas
  const notExternal = '(?!https?://|//|mailto:|tel:)';
  
  return html
    // ========================================
    // IMÁGENES, AUDIO, VIDEO - Agregar prefijo
    // ========================================
    .replace(/(src=["'])(assets\/[^"']+)/g, `$1${prefix}$2`)
    
    // ========================================
    // ENLACES - Agregar prefijo Y corregir target
    // ========================================
    
    // Enlaces a pages/ → prefijo + target="_self"
    .replace(/<a\s+target="_blank"\s+href=["'](pages\/[^"']+)["']/g, 
      `<a target="_self" href="${prefix}$1"`)
    
    // Enlaces con ancla # → target="_self" (sin prefijo)
    .replace(/<a\s+target="_blank"\s+href=["'](#[^"']+)["']/g, 
      `<a target="_self" href="$1"`)
    
    // Enlaces a assets/ → prefijo + target="_self"
    .replace(/<a\s+target="_blank"\s+href=["'](assets\/[^"']+)["']/g, 
      `<a target="_self" href="${prefix}$1"`)
    
    // Enlaces externos (http/https) → mantener target="_blank"
    // (no los modificamos, ya están bien)
    
    // ========================================
    // HREF (atributo suelto, no solo en <a>)
    // ========================================
    .replace(/(href=["'])(pages\/[^"']+)/g, `$1${prefix}$2`)
    .replace(/(href=["'])(assets\/[^"']+)/g, `$1${prefix}$2`);
}

function convertMmxFile(inputPath, outputPath, outputRoot) {
  const content = fs.readFileSync(inputPath, "utf8");
  const template = fs.readFileSync("./template.html", "utf8");
  const htmlContent = mmxToHtml(content);

  const titleMatch = content.match(/^# (.+)$/m);
  const title = titleMatch ? titleMatch[1] : "Documentación";

  // 👇 CALCULAR Y APLICAR PREFIJO
  const prefix = calculatePrefix(outputPath, outputRoot);
  
  let finalTemplate = template
    .replaceAll("{{title}}", title)
    .replaceAll("{{content}}", htmlContent);
  
  // Aplicar prefijo a las rutas
  finalTemplate = applyPathPrefix(finalTemplate, prefix);

  fs.writeFileSync(outputPath, finalTemplate, "utf8");
}




//vaciar la carpeta (si existe) del output antes de generarlo
if (!CONFIG.singleFile) {
  const dir = CONFIG.outputPath;

  if (fs.existsSync(dir)) {
    for (const file of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, file);

      if (fs.statSync(fullPath).isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(fullPath);
      }
    }
  }
}

function main() {
  if (!CONFIG.singleFile) {
    if (!fs.existsSync(CONFIG.inputPath)) {
      console.error(`❌ Carpeta de origen no existe: ${CONFIG.inputPath}`);
      process.exit(1);
    }
    processProjectStructure(CONFIG.inputPath, CONFIG.outputPath, {
      deleteOriginals: false,
      verbose: true
    });

  } else {
    try {
      const content = fs.readFileSync(singleInputPath, "utf8");
      const template = fs.readFileSync("./template.html", "utf8");
      const htmlContent = mmxToHtml(content);

      const titleMatch = content.match(/^# (.+)$/m);
      const title = titleMatch ? titleMatch[1] : "Documentación";

      const finalTemplate = template
        .replaceAll("{{title}}", title)
        .replaceAll("{{content}}", htmlContent);

      const dir = path.dirname(singleOutputPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      fs.writeFileSync(singleOutputPath, finalTemplate, "utf8");
      console.log(`Generado: ${singleOutputPath}`);

    } catch (error) {
      console.error("❌ Error:", error.message);
      process.exit(1);
    }
  }
}

main();
