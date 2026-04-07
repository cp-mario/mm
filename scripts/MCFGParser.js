/**
 * MCFG CONFIGURATION FILE PARSER
 * 
 * Parses the .mcfg configuration file format which uses simple key=value syntax.
 * Similar to .ini or .properties files but simpler.
 * 
 * Supported features:
 * - Comments with # at the start of a line
 * - Boolean values (true/false)
 * - Numbers (integers and decimals)
 * - Quoted strings (single or double quotes)
 * - Plain text values
 * 
 * Example .mcfg file:
 *   # Configuration for documentation generator
 *   inputPath = "./myProject"
 *   outputPath = "./output"
 *   singleFile = false
 *   maxDepth = 10
 *   title = "My Documentation"
 */
export function parseMCFG(text) {
  const result = {}; // Object to store parsed key-value pairs

  /**
   * Converts string values to their correct JavaScript type.
   * 
   * Rules:
   * - "true" or "false" → boolean
   * - Numeric strings → number
   * - Quoted strings (single or double) → string (without quotes)
   * - Other strings → string as-is
   * 
   * @param {string} val - The value string to parse
   * @returns {*} The parsed value with correct type
   */
  const parseValue = (val) => {
    // Remove leading/trailing whitespace
    val = val.trim();

    // Check for boolean true
    if (val === "true") return true;
    
    // Check for boolean false
    if (val === "false") return false;

    // Check if it's a number (but not an empty string)
    if (!isNaN(val) && val !== "") return Number(val);

    // Check for quoted strings and remove the quotes
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      return val.slice(1, -1); // Remove first and last character (the quotes)
    }

    // Return as unquoted string
    return val;
  };

  // Process each line of the configuration file
  text.split("\n").forEach(line => {
    // Trim whitespace from the line
    line = line.trim();

    // Skip empty lines and comment lines (starting with #)
    if (!line || line.startsWith("#")) return;

    // Find the position of the equals sign
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) return; // Skip lines without an equals sign

    // Extract the key (everything before the =)
    const key = line.slice(0, eqIndex).trim();

    // Extract the raw value (everything after the =)
    const rawValue = line.slice(eqIndex + 1);

    // Parse the value type and store in result
    result[key] = parseValue(rawValue);
  });

  return result;
}