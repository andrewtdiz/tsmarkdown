import { parseMDX as parse, parseMDX } from "./src/parser";
import { compile } from "./src/compiler";
import { render } from "./src/renderer";

// Test with different contexts
const testFile = "./mdx/MultipleInterpolations.mdx";
const content = await Bun.file(testFile).text();

console.log("=== PARSING PHASE ===");
const parsed = parse(content);
console.log("Parsed AST:", JSON.stringify(parsed, null, 2));

console.log("\n=== COMPILATION PHASE ===");
const compiled = compile(parsed);
console.log("Compiled code:", compiled);

console.log("\n=== RENDERING TESTS ===");

// Test 1: Default scenario (user logged in, showWelcome true)
console.log("\n--- Test 1: Default scenario (logged in, showWelcome true) ---");
const result1 = await render(compiled, {}, {}, "./mdx");
console.log(result1.content);
