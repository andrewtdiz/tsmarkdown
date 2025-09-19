import { parseMDX as parse } from "./src/parser";
import { compile } from "./src/compiler";
import { render } from "./src/renderer";

// Test the InternalList component directly
const componentFile = "./test/expanded-features/InternalList.mdx";
const content = await Bun.file(componentFile).text();

console.log("Component content:");
console.log(content);

const parsed = parse(content);
console.log("\nParsed:");
console.log(JSON.stringify(parsed, null, 2));

const compiled = compile(parsed);
console.log("\nCompiled:");
console.log(JSON.stringify(compiled, null, 2));

console.log("\n=== Test: List rendering ===");
const result = await render(compiled, {}, {
    items: ["Apple", "Banana", "Cherry"],
    ordered: false
}, "./test/expanded-features");
console.log(result.content);
