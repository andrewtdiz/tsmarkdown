import { parseMDX as parse } from "../parser";
import { compile } from "../compiler";
import { render } from "../renderer";

const content = `
function TestComponent() {
  return (
    {<@OlItem item="test" />}
  )
}
`;

console.log("=== Full Pipeline Debug ===");
console.log("Input content:", content);

const parsed = parse(content);
console.log("Parsed JSX expressions:", parsed.jsxExpressions);

const compiled = compile(parsed);
console.log("Compiled JSX expressions:", compiled.jsxExpressions);

const result = await render(compiled, {}, {}, "./mdx");
console.log("Rendered content:", result.content);
console.log("Errors:", result.errors);
