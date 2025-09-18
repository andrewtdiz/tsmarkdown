import { processJSXExpressions } from "./src/parser/parser-utils";

const content = "{<@OlItem item=\"test\" />}";
const jsxExpressions: Array<{ placeholder: string; expression: string }> = [];

console.log("=== Full JSX Parsing Debug ===");
console.log("Input content:", content);

const result = processJSXExpressions(content, jsxExpressions);

console.log("Output content:", result);
console.log("JSX expressions:", jsxExpressions);
