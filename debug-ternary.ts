import { parseMDX as parse } from "./src/parser";
import { compile } from "./src/compiler";
import { render } from "./src/renderer";

// Test the ternary evaluation directly
const testExpression = `items.length === 0 ? (
  "Empty"
) : items.length === 1 ? items[0] : items.slice(0, -1).join(', ') + (withAnd ? ' and ' : ', ') + items[items.length - 1]`;

console.log("Testing expression:", testExpression);

// Create a simple test component
const testComponent = `function TestComponent({ items, withAnd }: { items: string[]; withAnd: boolean }) {
  return (
    {{ ${testExpression} }}
  )
}`;

console.log("Test component:");
console.log(testComponent);

const parsed = parse(testComponent);
console.log("\nParsed:");
console.log(JSON.stringify(parsed, null, 2));

const compiled = compile(parsed);
console.log("\nCompiled:");
console.log(JSON.stringify(compiled, null, 2));

console.log("\n=== Test with withAnd: true ===");
const result1 = await render(compiled, {}, {
  items: ["First", "Second", "Third"],
  withAnd: true
}, "./test/expanded-features");
console.log(result1.content);
console.log("Errors:", result1.errors);

console.log("\n=== Test with withAnd: false ===");
const result2 = await render(compiled, {}, {
  items: ["First", "Second", "Third"],
  withAnd: false
}, "./test/expanded-features");
console.log(result2.content);
console.log("Errors:", result2.errors);

console.log("\n=== Test with withAnd: undefined ===");
const result3 = await render(compiled, {}, {
  items: ["First", "Second", "Third"]
}, "./test/expanded-features");
console.log(result3.content);
console.log("Errors:", result3.errors);
