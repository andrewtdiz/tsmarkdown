import { findMatchingBrace } from "./src/parser/parser-utils";

const content = "{<@OlItem item=\"test\" />}";
console.log("Content:", content);
console.log("Length:", content.length);

const openBraceIndex = 0;
const closeBraceIndex = findMatchingBrace(content, openBraceIndex);
console.log("Open brace at:", openBraceIndex);
console.log("Close brace at:", closeBraceIndex);

if (closeBraceIndex !== -1) {
  const expression = content.substring(openBraceIndex + 1, closeBraceIndex);
  console.log("Extracted expression:", expression);
  console.log("Expression contains <:", expression.includes('<'));
}
