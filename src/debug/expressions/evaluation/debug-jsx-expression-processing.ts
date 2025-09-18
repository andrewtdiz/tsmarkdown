import { parseMDX as parse } from "../../../parser";
import { compile } from "../../../compiler";
import { render } from "../../../renderer";
import { componentRegistry, loadDependencies, evaluateJSXExpression } from "../../../renderer/render-utils";

// Debug JSX expression processing step by step
const listFile = "./mdx/List.mdx";
const listContent = await Bun.file(listFile).text();
const listParsed = parse(listContent);
const listCompiled = compile(listParsed);

console.log("=== Debugging JSX Expression Processing ===");

// Load dependencies
const errors: string[] = [];
loadDependencies(listCompiled.dependencies, "./mdx", errors);

const context = {
    items: ["First", "Second", "Third"],
    ordered: false
};

console.log("Context:", context);
console.log("JSX expressions:", listCompiled.jsxExpressions);

// Test each JSX expression individually
for (let i = 0; i < listCompiled.jsxExpressions.length; i++) {
    const jsxExpr = listCompiled.jsxExpressions[i];
    console.log(`\n--- Testing JSX Expression ${i} ---`);
    console.log("Placeholder:", jsxExpr.placeholder);
    console.log("Expression:", jsxExpr.expression);

    try {
        const result = await evaluateJSXExpression(jsxExpr.expression, context);
        console.log("Result:", result);
        console.log("Result type:", typeof result);
    } catch (error) {
        console.error("Error:", error);
        console.error("Error stack:", error.stack);
    }
}

// Test the specific expression that's failing
console.log("\n--- Testing the failing expression directly ---");
const failingExpression = "items.map((item, index) => ordered ? (\n    <@OlItem item={item} index={index} />\n  ) : (\n    <@UlItem item={item} />\n  ))";

try {
    console.log("Expression:", failingExpression);
    const result = await evaluateJSXExpression(failingExpression, context);
    console.log("Direct result:", result);
} catch (error) {
    console.error("Direct error:", error);
    console.error("Error stack:", error.stack);
}
