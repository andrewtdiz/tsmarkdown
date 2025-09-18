import { parseMDX as parse } from "./src/parser";
import { compile } from "./src/compiler";

const content = `
function TestComponent() {
  return (
    <@List items={items} />
  )
}
`;

console.log("=== JSX Element Debug ===");
const parsed = parse(content);
console.log("Parsed JSX expressions:", parsed.jsxExpressions);
console.log("Markdown:", parsed.markdown);

const compiled = compile(parsed);
console.log("Compiled JSX expressions:", compiled.jsxExpressions);
console.log("Template:", compiled.template);
