export function parseMCFG(text) {
  const result = {};

  const parseValue = (val) => {
    val = val.trim();

    if (val === "true") return true;
    if (val === "false") return false;

    if (!isNaN(val) && val !== "") return Number(val);

    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      return val.slice(1, -1);
    }

    return val;
  };

  text.split("\n").forEach(line => {
    line = line.trim();

    if (!line || line.startsWith("#")) return;

    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) return;

    const key = line.slice(0, eqIndex).trim();

    const rawValue = line.slice(eqIndex + 1);

    result[key] = parseValue(rawValue);
  });

  return result;
}