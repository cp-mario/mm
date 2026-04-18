/**
 * JavaScript Minifier
 * Removes comments and minifies JavaScript code without external libraries
 * @param {string} jsCode - Original JavaScript code
 * @returns {string} Minified JavaScript code
 */
export function minifyJs(jsCode) {
  let result = "";
  let i = 0;
  const len = jsCode.length;
  let lastChar = "";
  
  while (i < len) {
    const char = jsCode[i];
    
    // Check for single-line comment //
    if (char === "/" && jsCode[i + 1] === "/") {
      // Skip until end of line
      while (i < len && jsCode[i] !== "\n" && jsCode[i] !== "\r") {
        i++;
      }
      continue;
    }
    
    // Check for multi-line comment /* */
    if (char === "/" && jsCode[i + 1] === "*") {
      i += 2;
      // Handle both * and ! for documentation comments
      if (jsCode[i] === "!") i++;
      
      // Find end of comment
      while (i < len - 1) {
        if (jsCode[i] === "*" && jsCode[i + 1] === "/") {
          i += 2;
          break;
        }
        i++;
      }
      continue;
    }
    
    // Keep strings (both " and ' and `)
    if (char === '"' || char === "'" || char === "`") {
      const quote = char;
      result += char;
      i++;
      
      while (i < len) {
        if (jsCode[i] === "\\") {
          result += jsCode[i] + jsCode[i + 1];
          i += 2;
          continue;
        }
        if (jsCode[i] === quote) {
          result += quote;
          i++;
          break;
        }
        result += jsCode[i];
        i++;
      }
      lastChar = char;
      continue;
    }
    
    // Handle regex literals: /pattern/ or /pattern/flags
    // Regex starts after = ( : , ( [ { ? : || && == != === !== <= >= return throw case 
    if (char === "/" && jsCode[i + 1] !== "/" && jsCode[i + 1] !== "*") {
      const codeAfterOperators = "=:(,[-+*%&|^!?<>=}];"
      const prevNonSpace = findPreviousNonSpace(result, lastChar);
      if (prevNonSpace && codeAfterOperators.includes(prevNonSpace)) {
        // This is a regex literal - keep it entirely
        result += char;
        i++;
        while (i < len) {
          if (jsCode[i] === "\\") {
            result += jsCode[i] + jsCode[i + 1];
            i += 2;
            continue;
          }
          if (jsCode[i] === "/") {
            result += "/";
            i++;
            // Check for regex flags (g, i, m, s, u, y)
            while (i < len && "gimsuy".includes(jsCode[i])) {
              result += jsCode[i];
              i++;
            }
            break;
          }
          result += jsCode[i];
          i++;
        }
        lastChar = "/";
        continue;
      }
    }
    
    // Regular character - keep it
    result += char;
    lastChar = char;
    i++;
  }
  
  // Remove unnecessary whitespace
  result = removeUnnecessaryWhitespace(result);
  
  return result;
}

/**
 * Find the previous non-whitespace character
 * @param {string} result - Current result string
 * @param {string} lastChar - Last char before spaces
 * @returns {string} Previous non-space character
 */
function findPreviousNonSpace(result, lastChar) {
  if (lastChar && lastChar !== " " && lastChar !== "\n" && lastChar !== "\t" && lastChar !== "\r") {
    return lastChar;
  }
  for (let j = result.length - 1; j >= 0; j--) {
    if (result[j] !== " " && result[j] !== "\n" && result[j] !== "\t" && result[j] !== "\r") {
      return result[j];
    }
  }
  return "";
}

function removeUnnecessaryWhitespace(code) {
  let result = "";
  let i = 0;
  const len = code.length;
  let lastWasSpace = false;
  let parenLevel = 0;
  let braceLevel = 0;
  let bracketLevel = 0;
  let inString = false;
  let stringChar = "";
  let inRegex = false;
  
  while (i < len) {
    const char = code[i];
    
    // Handle escape sequences
    if (char === "\\" && !inString && !inRegex) {
      result += char + code[i + 1];
      i += 2;
      continue;
    }
    
    // Detect string start
    if ((char === '"' || char === "'" || char === "`") && !inString && !inRegex) {
      inString = true;
      stringChar = char;
      result += char;
      i++;
      continue;
    }
    
    // Detect string end
    if (char === stringChar && inString) {
      inString = false;
      result += char;
      i++;
      continue;
    }
    
    // Inside string - keep everything
    if (inString) {
      result += char;
      i++;
      continue;
    }
    
    // Detect regex start (simplified)
    if (!inRegex && char === "/" && i + 1 < len && code[i + 1] !== "/" && code[i + 1] !== "*") {
      const codeAfterOperators = "=:(,[-+*%&|^!?<>=}];"
      const prevNonSpace = findPreviousNonSpaceSimple(result);
      if (prevNonSpace && codeAfterOperators.includes(prevNonSpace)) {
        inRegex = true;
        result += char;
        i++;
        continue;
      }
    }
    
    // Detect regex end
    if (inRegex && char === "/") {
      result += char;
      i++;
      // Check for flags
      while (i < len && "gimsuy".includes(code[i])) {
        result += code[i];
        i++;
      }
      inRegex = false;
      continue;
    }
    
    // Inside regex - keep everything
    if (inRegex) {
      result += char;
      i++;
      continue;
    }
    
    // Track brackets
    if (char === "(") parenLevel++;
    if (char === ")") parenLevel--;
    if (char === "{") braceLevel++;
    if (char === "}") braceLevel--;
    if (char === "[") bracketLevel++;
    if (char === "]") bracketLevel--;
    
    // Whitespace handling
    if (char === " " || char === "\n" || char === "\t" || char === "\r") {
      // Don't remove space after: , ( [ { = : ? ? :
      if (char === " " && result.length > 0) {
        const lastChar = result[result.length - 1];
        if (",([{=:?|+-*/%".includes(lastChar)) {
          result += " ";
          lastWasSpace = true;
        } else if (!lastWasSpace) {
          result += " ";
          lastWasSpace = true;
        }
      }
      // Skip consecutive whitespace
      if (lastWasSpace) {
        i++;
        continue;
      }
      // Replace newlines/tabs with single space when needed
      if (parenLevel > 0 || braceLevel > 0 || bracketLevel > 0) {
        if (!lastWasSpace) {
          result += " ";
          lastWasSpace = true;
        }
      }
      i++;
      continue;
    }
    
    result += char;
    lastWasSpace = false;
    i++;
  }
  
  // Remove leading/trailing spaces around operators
  result = result.replace(/\s+([;,(){}\[\]=<>+|&!?:-])/g, "$1");
  result = result.replace(/([;,(){}\[\]=<>+|&!?:-])\s+/g, "$1");
  
  return result;
}

/**
 * Find the previous non-whitespace character
 * @param {string} result - Current result string
 * @param {string} lastChar - Last char before spaces
 * @returns {string} Previous non-space character
 */
function findPreviousNonSpaceSimple(result) {
  for (let j = result.length - 1; j >= 0; j--) {
    if (result[j] !== " " && result[j] !== "\n" && result[j] !== "\t" && result[j] !== "\r") {
      return result[j];
    }
  }
  return "";
}

/**
 * Minifies a JavaScript file and saves it
 * @param {string} inputPath - Path to input .js file
 * @param {string} outputPath - Path to output minified .js file
 */
export function minifyJsFile(inputPath, outputPath) {
  const fs = require("fs");
  const original = fs.readFileSync(inputPath, "utf-8");
  const minified = minifyJs(original);
  fs.writeFileSync(outputPath, minified, "utf-8");
}