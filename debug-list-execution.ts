import { readFileSync } from "fs";
import { parseMDX } from "./src/parser";
import { compile } from "./src/compiler";
import { render } from "./src/renderer";

// Test the List component directly
const listContent = readFileSync('./mdx/List.mdx', 'utf-8');

const parsed = parseMDX(listContent);
const compiled = compile(parsed);

console.log('List component compiled:');
console.log(JSON.stringify(compiled, null, 2));

console.log('\n=== Testing List component execution ===');
const result = await render(compiled, {}, {
    items: ["Apple", "Banana", "Cherry"],
    ordered: false
}, "./mdx");

console.log('List component result:');
console.log(result.content);
