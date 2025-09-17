import { MDXParser } from "./src/parser";
import { MDXCompiler } from "./src/compiler";
import { TemplateExecutionEngine } from "./src/template-engine";

// Test with different contexts
const testFile = "./mdx/TestExample.mdx";
const content = await Bun.file(testFile).text();

const parser = new MDXParser();
const compiler = new MDXCompiler();
const engine = new TemplateExecutionEngine();

const parsed = parser.parse(content);
console.log(parsed);
const compiled = compiler.compile(parsed);
console.log(compiled);

console.log("=== Test 1: List items and ternary expression ===");
const result1 = await engine.execute(compiled, {

}, {
  items: ["Apple", "Banana", "Cherry"],
}, "./mdx");
console.log(result1.content);

console.log("\n=== Test 2: Unordered list ===");
const result2 = await engine.execute(compiled, {}, {
  items: ["React", "TypeScript", "MDX"],
}, "./mdx");
console.log(result2.content);

console.log("\n=== Test 3: Empty list ===");
const result3 = await engine.execute(compiled, {}, {
  items: [],
}, "./mdx");
console.log(result3.content);

console.log("\n=== Test 4: Direct List component test (ordered) ===");
const listFile = "./mdx/List.mdx";
const listContent = await Bun.file(listFile).text();
const listParsed = parser.parse(listContent);
const listCompiled = compiler.compile(listParsed);
const result4 = await engine.execute(listCompiled, {}, {
  items: ["First", "Second", "Third"],
  ordered: true,
}, "./mdx");
console.log(result4.content);

console.log("\n=== Test 5: Direct List component test (unordered) ===");
const result5 = await engine.execute(listCompiled, {}, {
  items: ["First", "Second", "Third"],
  ordered: false,
}, "./mdx");
console.log(result5.content);

console.log("\n=== Test 6: CommaList component test (unordered) ===");
const commaListFile = "./mdx/CommaList.mdx";
const commaListContent = await Bun.file(commaListFile).text();
const commaListParsed = parser.parse(commaListContent);
const commaListCompiled = compiler.compile(commaListParsed);
const result6 = await engine.execute(commaListCompiled, {}, {
  items: ["First", "Second", "Third"],
}, "./mdx");
console.log(result6.content);

console.log("\n=== Test 7: CommaList component test (empty) ===");
const result7 = await engine.execute(commaListCompiled, {}, {
  items: [],
  ordered: true,
}, "./mdx");
console.log(result7.content);
