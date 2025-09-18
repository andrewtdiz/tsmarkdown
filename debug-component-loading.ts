import { parseMDX as parse } from "./src/parser";
import { compile } from "./src/compiler";
import { render } from "./src/renderer";

// Debug component loading specifically
const listFile = "./mdx/List.mdx";
const listContent = await Bun.file(listFile).text();
const listParsed = parse(listContent);
const listCompiled = compile(listParsed);

console.log("=== List component dependencies ===");
console.log("Dependencies:", listCompiled.dependencies);

console.log("\n=== Testing component loading ===");

// Test loading dependencies manually
const { loadDependencies } = await import("./src/renderer/render-utils");
const errors: string[] = [];
loadDependencies(listCompiled.dependencies, "./mdx", errors);

console.log("Loading errors:", errors);

// Check if components are in registry
const { componentRegistry } = await import("./src/renderer/render-utils");
console.log("Component registry keys:", Object.keys(componentRegistry));

// Test rendering with loaded dependencies
console.log("\n=== Testing rendering with loaded dependencies ===");
const result = await render(listCompiled, {}, {
  items: ["First", "Second", "Third"],
  ordered: false,
}, "./mdx");

console.log("Result:", JSON.stringify(result, null, 2));