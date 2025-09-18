import { parseMDX as parse } from "../../../parser";
import { compile } from "../../../compiler";

// Test with a simple JSX expression
const simpleContent = `
function TestComponent() {
  return (
    {items.map(item => <@OlItem item={item} />)}
  )
}
`;

console.log("=== Simple JSX Expression Test ===");
const parsed = parse(simpleContent);
console.log("Parsed JSX expressions:", parsed.jsxExpressions);
console.log("Markdown:", parsed.markdown);

const compiled = compile(parsed);
console.log("Compiled JSX expressions:", compiled.jsxExpressions);
