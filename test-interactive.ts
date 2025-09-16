import { readFileSync } from "fs";
import { MDXParser } from "./src/parser";
import { MDXCompiler } from "./src/compiler";
import { TemplateExecutionEngine } from "./src/template-engine";

// Test with different contexts
const testFile = "./mdx/TestExample.mdx";
const content = readFileSync(testFile, "utf-8");

const parser = new MDXParser();
const compiler = new MDXCompiler();
const engine = new TemplateExecutionEngine();

const parsed = parser.parse(content);
console.log(parsed);
const compiled = compiler.compile(parsed);
console.log(compiled);

console.log("=== Test 1: Logged in user ===");
const result1 = await engine.execute(compiled, {

}, {
  items: ["Apple", "Banana", "Cherry"],  
});
console.log(result1.content);

console.log("\n=== Test 2: Not logged in ===");
const result2 = engine.execute(compiled, {

}, {
  items: ["Apple", "Banana", "Cherry"],  
});
console.log(result2.content);

console.log("\n=== Test 3: Different user ===");
const result3 = engine.execute(compiled, {

}, {
  items: ["Apple", "Banana", "Cherry"],  
});
console.log(result3.content);
