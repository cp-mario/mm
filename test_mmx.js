import { mmxToHtml } from './scripts/parser.js';

// Test 1: Inline code should not compile MMX inside backticks
console.log("TEST 1: Inline code with bold inside");
const test1 = "This is `code with **bold** inside` text.";
const result1 = mmxToHtml(test1);
console.log("Input:", test1);
console.log("Output:", result1);
console.log("Expected: <p>contains %%INLINE_CODE or <code> with **bold** not compiled</p>\n");

// Test 2: Code block should preserve content exactly
console.log("TEST 2: Code block line preservation");
const test2 = `:::code javascript
function test() {
  return **not bold**;
}
:::`;
const result2 = mmxToHtml(test2);
console.log("Input lines: 4 (funcdef, return, closing brace, then close :::)");
console.log("Output:", result2);
console.log("Expected: pre with exact 3 lines of code (no ::), with ** NOT compiled\n");

// Test 3: Multiple inline codes
console.log("TEST 3: Multiple inline codes");
const test3 = "Use `const x = 5` or `**y** = 10` in code.";
const result3 = mmxToHtml(test3);
console.log("Input:", test3);
console.log("Output:", result3);
console.log("Expected: two <code> blocks with ** NOT compiled\n");

// Test 4: Bold with inline code
console.log("TEST 4: Bold outside, inline code inside");
const test4 = "This **`code`** is bold";
const result4 = mmxToHtml(test4);
console.log("Input:", test4);
console.log("Output:", result4);
console.log("Expected: <strong><code>code</code></strong>\n");
