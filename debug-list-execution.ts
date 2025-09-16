import { readFileSync } from "fs";
import { MDXParser } from "./src/parser";
import { MDXCompiler } from "./src/compiler";
import { TemplateExecutionEngine } from "./src/template-engine";

// Test the List component directly
const listContent = readFileSync('./mdx/List.mdx', 'utf-8');
const parser = new MDXParser();
const compiler = new MDXCompiler();
const engine = new TemplateExecutionEngine();

const parsed = parser.parse(listContent);
const compiled = compiler.compile(parsed);

console.log('List component compiled:');
console.log(JSON.stringify(compiled, null, 2));

console.log('\n=== Testing List component execution ===');
const result = await engine.execute(compiled, {}, {
    items: ["Apple", "Banana", "Cherry"],
    ordered: false
}, "./mdx");

console.log('List component result:');
console.log(result.content);
