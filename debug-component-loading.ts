import { parseMDX as parse } from "./src/parser";
import { compile } from "./src/compiler";
import { render } from "./src/renderer";

const content = `
function TestComponent() {
  return (
    {<@OlItem item="test" />}
  )
}
`;

console.log("=== Component Loading Debug ===");

const parsed = parse(content);
const compiled = compile(parsed);

// Test with basePath
const result = await render(compiled, { basePath: "./mdx" }, {}, "./mdx");
console.log("Rendered content:", result.content);
console.log("Errors:", result.errors);

// Test without basePath
const result2 = await render(compiled, {}, {}, "./mdx");
console.log("Rendered content (no basePath in context):", result2.content);
console.log("Errors:", result2.errors);
