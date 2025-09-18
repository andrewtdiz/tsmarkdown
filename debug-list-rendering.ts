import { parseMDX as parse } from "./src/parser";
import { compile } from "./src/compiler";
import { render } from "./src/renderer";

// Debug List component rendering specifically
const listFile = "./mdx/List.mdx";
const listContent = await Bun.file(listFile).text();
const listParsed = parse(listContent);
const listCompiled = compile(listParsed);

console.log("=== Testing List component rendering ===");

const context = {
    items: ["First", "Second", "Third"],
    ordered: false
};

console.log("Context:", context);
console.log("List compiled:", JSON.stringify(listCompiled, null, 2));

// Test rendering with detailed logging
console.log("\n=== Testing rendering ===");
const result = await render(listCompiled, {}, context, "./mdx");

console.log("Result:", JSON.stringify(result, null, 2));

// Test with empty items
console.log("\n=== Testing with empty items ===");
const emptyContext = {
    items: [],
    ordered: false
};

const emptyResult = await render(listCompiled, {}, emptyContext, "./mdx");
console.log("Empty result:", JSON.stringify(emptyResult, null, 2));
