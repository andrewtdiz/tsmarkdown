import { readFileSync } from "fs";
import { MDXParser } from "./src/parser";
import { MDXCompiler } from "./src/compiler";
import { TemplateExecutionEngine } from "./src/template-engine";

// Test with different contexts
const testFile = "./mdx/AsyncExample.mdx";
const content = readFileSync(testFile, "utf-8");

const parser = new MDXParser();
const compiler = new MDXCompiler();
const engine = new TemplateExecutionEngine();

const parsed = parser.parse(content);
console.log(parsed);
const compiled = compiler.compile(parsed);
console.log(compiled);

console.log("=== Test 1: List items and ternary expression ===");
const result1 = await engine.execute(compiled, { userName: "Alice", items: ["React", "TypeScript", "MDX"] }, {}, "./mdx");
console.log(result1.content);
