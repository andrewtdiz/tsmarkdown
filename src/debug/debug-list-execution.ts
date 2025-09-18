import { parseMDX } from "../parser";
import { compile } from "../compiler";
import { render } from "../renderer";

// Test the List component directly
const listContent = await Bun.file('./mdx/List.mdx').text();

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
