import { parseMDX as parse } from "./src/parser";

// Test with the simplest possible JSX expression
const simpleContent = `
function TestComponent() {
  return (
    {<@OlItem item="test" />}
  )
}
`;

console.log("=== Simplest JSX Expression Test ===");
const parsed = parse(simpleContent);
console.log("Parsed JSX expressions:", parsed.jsxExpressions);
console.log("Markdown:", parsed.markdown);
