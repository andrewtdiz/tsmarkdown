import { readFileSync } from "fs";
import { parseMDX } from "./src/parser";
import { compileMDX } from "./src/compiler";
import { executeMDXTemplate } from "./src/template-engine";

// Test the List component directly
const listContent = readFileSync('./mdx/List.mdx', 'utf-8');

const parsed = parseMDX(listContent);
const compiled = compileMDX(parsed);

console.log('List component compiled:');
console.log(JSON.stringify(compiled, null, 2));

console.log('\n=== Testing List component execution ===');
const result = await executeMDXTemplate(compiled, {}, {
    items: ["Apple", "Banana", "Cherry"],
    ordered: false
}, "./mdx");

console.log('List component result:');
console.log(result.content);
