import { parseMDX as parse } from "./src/parser";
import { compile } from "./src/compiler";
import { render } from "./src/renderer";
import { componentRegistry, loadDependencies, renderJSXComponent } from "./src/renderer/render-utils";

// Debug JSX component rendering specifically
const listFile = "./mdx/List.mdx";
const listContent = await Bun.file(listFile).text();
const listParsed = parse(listContent);
const listCompiled = compile(listParsed);

console.log("=== Debugging JSX Component Rendering ===");

// Load dependencies
const errors: string[] = [];
loadDependencies(listCompiled.dependencies, "./mdx", errors);

console.log("Registry after loading:", Object.keys(componentRegistry));

// Test JSX component rendering with different contexts
const testContexts = [
    { item: "Test Item 1", index: 0, ordered: false },
    { item: "Test Item 2", index: 1, ordered: true }
];

for (const context of testContexts) {
    console.log(`\n--- Testing with context:`, context);
    
    // Test UlItem
    try {
        const ulItemJSX = "<@UlItem item={item} />";
        console.log("Testing UlItem JSX:", ulItemJSX);
        const ulResult = await renderJSXComponent(ulItemJSX, context);
        console.log("UlItem result:", ulResult);
    } catch (error) {
        console.error("UlItem error:", error);
    }
    
    // Test OlItem
    try {
        const olItemJSX = "<@OlItem item={item} index={index} />";
        console.log("Testing OlItem JSX:", olItemJSX);
        const olResult = await renderJSXComponent(olItemJSX, context);
        console.log("OlItem result:", olResult);
    } catch (error) {
        console.error("OlItem error:", error);
    }
}

// Test the ternary JSX expression
try {
    console.log("\n--- Testing ternary JSX expression ---");
    const ternaryContext = { item: "Test Item", index: 0, ordered: false };
    const ternaryExpression = "ordered ? (\n    <@OlItem item={item} index={index} />\n  ) : (\n    <@UlItem item={item} />\n  )";
    console.log("Ternary expression:", ternaryExpression);
    
    const { evaluateTernaryJSXExpression } = await import("./src/renderer/render-utils");
    const ternaryResult = await evaluateTernaryJSXExpression(ternaryExpression, ternaryContext);
    console.log("Ternary result:", ternaryResult);
} catch (error) {
    console.error("Ternary error:", error);
    console.error("Error stack:", error.stack);
}