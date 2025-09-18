import { parseMDX } from "../../parser";
import { compileMDX } from "../../compiler";

// Test with different MDX files
const testFiles = [
    "./mdx/TestExample.mdx",
    "./mdx/List.mdx",
    "./mdx/UlItem.mdx",
    "./mdx/OlItem.mdx"
];


for (const testFile of testFiles) {
    console.log(`\n=== ${testFile} ===`);

    const content = await Bun.file(testFile).text();
    console.log("Original MDX content:");
    console.log(content);

    const parsed = parseMDX(content);
    console.log("\nParsed structure:");
    console.log(JSON.stringify(parsed, null, 2));

    const compiled = compileMDX(parsed);
    console.log("\nCompiled TypeScript:");
    console.log(compiled.typescript);

    console.log("\nTemplate:");
    console.log(compiled.template);

    console.log("\nDependencies:");
    console.log(compiled.dependencies);

    console.log("\nJSX Expressions:");
    console.log(JSON.stringify(compiled.jsxExpressions, null, 2));

    console.log("\n" + "=".repeat(80));
}
