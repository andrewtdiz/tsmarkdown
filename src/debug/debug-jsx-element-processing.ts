import { processJSXElements } from "../parser/parser-utils";

const content = "<@List items={items} />";
const jsxExpressions: Array<{ placeholder: string; expression: string }> = [];

console.log("=== JSX Element Processing Debug ===");
console.log("Input content:", content);

const result = processJSXElements(content, jsxExpressions);

console.log("Output content:", result);
console.log("JSX expressions:", jsxExpressions);
