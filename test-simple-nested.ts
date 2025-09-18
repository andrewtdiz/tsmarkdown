import { parseMDX as parse } from "./src/parser";
import { compile } from "./src/compiler";
import { render } from "./src/renderer";

// Test with a simple nested conditional
const testInput = `
function SimpleNestedTest() {
  const outer = true;
  const inner = true;

  return (
    {outer && (
      {inner && (
        # Nested Content
      )}
    )}
  )
}
`;

console.log("=== Testing Simple Nested Conditional ===");
console.log("Input:", testInput);

const parsed = parse(testInput);
console.log("Parsed conditional blocks:", parsed.conditionalBlocks);

const compiled = compile(parsed);
console.log("Compiled conditional blocks:", compiled.conditionalBlocks);

const result = await render(compiled, {}, {}, "./mdx");
console.log("Rendered content:", result.content);
console.log("Expected: # Nested Content");
console.log("Match:", result.content.trim() === "# Nested Content");
