import { parseMDX as parse } from "./src/parser";
import { compile } from "./src/compiler";
import { render } from "./src/renderer";

// Test the exact same scenario as the test
const mdx = await Bun.file("./test/expanded-features/InternalCommaList.mdx").text();
console.log("MDX content:");
console.log(mdx);

const parsed = parse(mdx);
console.log("\nParsed:");
console.log(JSON.stringify(parsed, null, 2));

const compiled = compile(parsed);
console.log("\nCompiled:");
console.log(JSON.stringify(compiled, null, 2));

// Test with the exact same context as the test
const context = {
    basePath: "./test/expanded-features",
    items: ["First", "Second", "Third"]
};

console.log("\nContext:", context);

const result = await render(compiled, context, {}, "./test/expanded-features");
console.log("Result:", result.content);
console.log("Errors:", result.errors);

// Let's also test what the context looks like after processing
console.log("\n=== Testing context creation ===");
import { createPropsContext } from "./src/renderer/render-context";

const propsContext = createPropsContext(compiled.functionParams || [], context, compiled.metadata?.parameterTypes);
console.log("Props context:", propsContext);
