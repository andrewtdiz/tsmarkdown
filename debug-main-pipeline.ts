import { parseMDX as parse } from "./src/parser";
import { compile } from "./src/compiler";
import { render } from "./src/renderer";
import { componentRegistry, loadDependencies } from "./src/renderer/render-utils";

// Debug the main pipeline step by step
const listFile = "./mdx/List.mdx";
const listContent = await Bun.file(listFile).text();
const listParsed = parse(listContent);
const listCompiled = compile(listParsed);

console.log("=== Debugging Main Pipeline ===");
console.log("Compiled JSX expressions:", listCompiled.jsxExpressions);

// Load dependencies
const errors: string[] = [];
loadDependencies(listCompiled.dependencies, "./mdx", errors);

const context = {
    items: ["First", "Second", "Third"],
    ordered: false
};

console.log("Context:", context);

// Test the rendering step by step
console.log("\n=== Testing rendering ===");
const result = await render(listCompiled, {}, context, "./mdx");
console.log("Result:", JSON.stringify(result, null, 2));

console.log("\n=== Testing with empty items ===");
const emptyResult = await render(listCompiled, {}, { items: [], ordered: false }, "./mdx");
console.log("Empty result:", JSON.stringify(emptyResult, null, 2));
