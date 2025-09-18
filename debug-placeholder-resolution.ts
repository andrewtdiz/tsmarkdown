import { parseMDX as parse } from "./src/parser";
import { compile } from "./src/compiler";
import { render } from "./src/renderer";

// Debug placeholder resolution specifically
const listFile = "./mdx/List.mdx";
const listContent = await Bun.file(listFile).text();
const listParsed = parse(listContent);
const listCompiled = compile(listParsed);

console.log("=== JSX Expressions ===");
listCompiled.jsxExpressions.forEach((expr, index) => {
    console.log(`${index}: ${expr.placeholder} -> ${expr.expression}`);
});

console.log("\n=== Testing placeholder resolution ===");

// Test the resolution step by step
const jsxExpressions = listCompiled.jsxExpressions;
const context = {
    items: ["First", "Second", "Third"],
    ordered: false
};

// Test __JSX_EXPRESSION_0__ resolution
console.log("\n--- Testing __JSX_EXPRESSION_0__ ---");
const expr0 = jsxExpressions.find(e => e.placeholder === "__JSX_EXPRESSION_0__");
console.log("Expression 0:", expr0?.expression);

// Test __JSX_EXPRESSION_1__ resolution  
console.log("\n--- Testing __JSX_EXPRESSION_1__ ---");
const expr1 = jsxExpressions.find(e => e.placeholder === "__JSX_EXPRESSION_1__");
console.log("Expression 1:", expr1?.expression);

// Test __JSX_EXPRESSION_2__ resolution
console.log("\n--- Testing __JSX_EXPRESSION_2__ ---");
const expr2 = jsxExpressions.find(e => e.placeholder === "__JSX_EXPRESSION_2__");
console.log("Expression 2:", expr2?.expression);

// Test if __JSX_EXPRESSION_2__ contains __JSX_EXPRESSION_1__
if (expr2?.expression.includes("__JSX_EXPRESSION_1__")) {
    console.log("Expression 2 contains Expression 1 placeholder");

    // Try to resolve it
    const resolved = expr2.expression.replace("__JSX_EXPRESSION_1__", expr1?.expression || "");
    console.log("Resolved expression 2:", resolved);
}
