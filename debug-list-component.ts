import { parseMDX as parse } from "./src/parser";
import { compile } from "./src/compiler";
import { render } from "./src/renderer";

// Debug the List component specifically
const listFile = "./mdx/List.mdx";
const listContent = await Bun.file(listFile).text();
console.log("=== List.mdx content ===");
console.log(listContent);

const listParsed = parse(listContent);
console.log("\n=== Parsed List component ===");
console.log(JSON.stringify(listParsed, null, 2));

const listCompiled = compile(listParsed);
console.log("\n=== Compiled List component ===");
console.log(JSON.stringify(listCompiled, null, 2));

console.log("\n=== Test with items ===");
const result1 = await render(listCompiled, {}, {
    items: ["First", "Second", "Third"],
    ordered: false,
}, "./mdx");
console.log("Result:", JSON.stringify(result1, null, 2));

console.log("\n=== Test with empty items ===");
const result2 = await render(listCompiled, {}, {
    items: [],
    ordered: false,
}, "./mdx");
console.log("Result:", JSON.stringify(result2, null, 2));
