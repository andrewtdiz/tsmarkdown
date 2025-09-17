import { readFileSync } from "fs";
import { parseMDX } from "./src/parser";
import { compile } from "./src/compiler";
import { render } from "./src/renderer";

// Test with different contexts
const testFile = "./mdx/AsyncExample.mdx";
const content = readFileSync(testFile, "utf-8");


const parsed = parseMDX(content);
console.log(parsed);
const compiled = compile(parsed);
console.log(compiled);

console.log("=== Test 1: List items and ternary expression ===");
const result1 = await render(compiled, { userName: "Alice", items: ["React", "TypeScript", "MDX"] }, {}, "./mdx");
console.log(result1.content);
