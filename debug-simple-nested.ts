import { parseMDX as parse } from "./src/parser";
import { compile } from "./src/compiler";
import { render } from "./src/renderer";

// Test with a simple nested conditional
const testInput = `
function SimpleNestedTest() {
  const user = { permissions: ['delete', 'read'] };

  return (
    {user && (
      # Admin Dashboard

      {user.permissions.includes('delete') ? (
        You have delete permissions. {{ user.permissions.length - 1 }} other permissions found.
      ) : (
        Delete permissions not found.
      )}
    )}
  )
}
`;

console.log("=== Debugging Simple Nested Conditional ===");
console.log("Input:", testInput);

const parsed = parse(testInput);
console.log("Parsed conditional blocks:");
parsed.conditionalBlocks.forEach((block, i) => {
    console.log(`  ${i}: condition="${block.condition}"`);
    console.log(`      content="${block.content}"`);
});

console.log("Parsed interpolations:");
parsed.interpolations.forEach((interp, i) => {
    console.log(`  ${i}: placeholder="${interp.placeholder}", expression="${interp.expression}"`);
});

const compiled = compile(parsed);
console.log("Template:", compiled.template);
console.log("Compiled interpolations:");
compiled.interpolations.forEach((interp, i) => {
    console.log(`  ${i}: placeholder="${interp.placeholder}", expression="${interp.expression}"`);
});

const result = await render(compiled, {}, {}, "./mdx");
console.log("Rendered content:", result.content);
console.log("Expected: # Admin Dashboard\n\nYou have delete permissions. 1 other permissions found.");
console.log("Match:", result.content.trim() === "# Admin Dashboard\n\nYou have delete permissions. 1 other permissions found.");
