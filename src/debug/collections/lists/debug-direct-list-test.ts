import { parseMDX as parse } from "../../../parser";
import { compile } from "../../../compiler";
import { render } from "../../../renderer";

// Test the List component directly
const listFile = "./mdx/List.mdx";
const listContent = await Bun.file(listFile).text();
const listParsed = parse(listContent);
const listCompiled = compile(listParsed);

console.log("=== Testing List Component Directly ===");

// Test with unordered list
console.log("--- Test 1: Unordered list ---");
const result1 = await render(listCompiled, {}, {
    items: ["Apple", "Banana", "Cherry"],
    ordered: false
}, "./mdx");
console.log(result1.content);
console.log("Errors:", result1.errors);

// Test with ordered list
console.log("\n--- Test 2: Ordered list ---");
const result2 = await render(listCompiled, {}, {
    items: ["First", "Second", "Third"],
    ordered: true
}, "./mdx");
console.log(result2.content);
console.log("Errors:", result2.errors);

// Test with empty list
console.log("\n--- Test 3: Empty list ---");
const result3 = await render(listCompiled, {}, {
    items: [],
    ordered: false
}, "./mdx");
console.log(result3.content);
console.log("Errors:", result3.errors);
