import { parseMDX as parse } from "./src/parser";
import { compile } from "./src/compiler";
import { render } from "./src/renderer";

// Test with different contexts
const testFile = "./mdx/TestExample.mdx";
const content = await Bun.file(testFile).text();

const parsed = parse(content);
console.log(parsed);
const compiled = compile(parsed);
console.log(compiled);

console.log("=== Test 1: Unordered list items and ternary expression ===");
const result1 = await render(compiled, {

}, {
  items: ["Apple", "Banana", "Cherry"],
}, "./mdx");
console.log(result1.content);

console.log("\n=== Test 2: Empty list ===");
const result2 = await render(compiled, {}, {
  items: [],
}, "./mdx");
console.log(result2.content);

console.log("\n=== Test 3: Direct List component test (ordered) ===");
const listFile = "./mdx/List.mdx";
const listContent = await Bun.file(listFile).text();
const listParsed = parse(listContent);
const listCompiled = compile(listParsed);
const result3 = await render(listCompiled, {}, {
  items: ["First", "Second", "Third"],
  ordered: true,
}, "./mdx");
console.log(result3.content);

console.log("\n=== Test 4: Direct List component test (unordered) ===");
const result4 = await render(listCompiled, {}, {
  items: ["First", "Second", "Third"],
  ordered: false,
}, "./mdx");
console.log(result4.content);

console.log("\n=== Test 5: Direct List component test (empty) ===");
const result5 = await render(listCompiled, {}, {
  items: [],
  ordered: false,
}, "./mdx");
console.log(result5.content);

console.log("\n=== Test 6: CommaList component test (unordered) ===");
const commaListFile = "./mdx/CommaList.mdx";
const commaListContent = await Bun.file(commaListFile).text();
const commaListParsed = parse(commaListContent);
const commaListCompiled = compile(commaListParsed);
const result6 = await render(commaListCompiled, {}, {
  items: ["First", "Second", "Third"],
}, "./mdx");
console.log(result6.content);

console.log("\n=== Test 7: CommaList component test (empty) ===");
const result7 = await render(commaListCompiled, {}, {
  items: [],
  ordered: true,
}, "./mdx");
console.log(result7.content);
