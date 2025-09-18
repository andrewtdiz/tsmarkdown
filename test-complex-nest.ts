import { parseMDX as parse } from "./src/parser";
import { compile } from "./src/compiler";
import { render } from "./src/renderer";

// Test with different contexts
const testFile = "./mdx/ComplexNest.mdx";
const content = await Bun.file(testFile).text();


const parsed = parse(content);
console.log(parsed);
const compiled = compile(parsed);
console.log(compiled);

console.log("=== Test 1: Complex nested conditionals ===");
const result1 = await render(compiled, {}, {}, "./mdx");
console.log(result1.content);
