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
      while (i < len && jsCode[i] !== "\n" && jsCode[i] !== "\r") {
        i++;
      }
      continue;
    }
    
    // Check for multi-line comment /* */
    if (char === "/" && jsCode[i + 1] === "*") {
      i += 2;
      if (jsCode[i] === "!") i++;
      
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
    
    // Handle regex literals
    if (char === "/" && jsCode[i + 1] !== "/" && jsCode[i + 1] !== "*") {
      const codeAfterOperators = "=:(,[-+*%&|^!?<>=}];"
      const prevNonSpace = findPreviousNonSpace(result, lastChar);
      if (prevNonSpace && codeAfterOperators.includes(prevNonSpace)) {
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
    
    result += char;
    lastChar = char;
    i++;
  }
  
  result = removeUnnecessaryWhitespace(result);
  return result;
}

/**
 * Find the previous non-whitespace character
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
    
    if (char === "\\" && !inString && !inRegex) {
      result += char + code[i + 1];
      i += 2;
      continue;
    }
    
    if ((char === '"' || char === "'" || char === "`") && !inString && !inRegex) {
      inString = true;
      stringChar = char;
      result += char;
      i++;
      continue;
    }
    
    if (char === stringChar && inString) {
      inString = false;
      result += char;
      i++;
      continue;
    }
    
    if (inString) {
      result += char;
      i++;
      continue;
    }
    
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
    
    if (inRegex && char === "/") {
      result += char;
      i++;
      while (i < len && "gimsuy".includes(code[i])) {
        result += code[i];
        i++;
      }
      inRegex = false;
      continue;
    }
    
    if (inRegex) {
      result += char;
      i++;
      continue;
    }
    
    if (char === "(") parenLevel++;
    if (char === ")") parenLevel--;
    if (char === "{") braceLevel++;
    if (char === "}") braceLevel--;
    if (char === "[") bracketLevel++;
    if (char === "]") bracketLevel--;
    
    if (char === " " || char === "\n" || char === "\t" || char === "\r") {
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
      if (lastWasSpace) {
        i++;
        continue;
      }
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
  
  result = result.replace(/\s+([;,(){}\[\]=<>+|&!?:-])/g, "$1");
  result = result.replace(/([;,(){}\[\]=<>+|&!?:-])\s+/g, "$1");
  
  return result;
}

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