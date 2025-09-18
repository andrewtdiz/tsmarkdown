import { parseMDX as parse } from "../parser";
import { compile } from "../compiler";
import { render } from "../renderer";
import { componentRegistry, loadDependencies, evaluateMapExpression } from "../renderer/render-utils";

// Debug map expression context handling
const listFile = "./mdx/List.mdx";
const listContent = await Bun.file(listFile).text();
const listParsed = parse(listContent);
const listCompiled = compile(listParsed);

console.log("=== Debugging Map Expression Context ===");

// Load dependencies
const errors: string[] = [];
loadDependencies(listCompiled.dependencies, "./mdx", errors);

const context = {
    items: ["First", "Second", "Third"],
    ordered: false
};

console.log("Context:", context);

// Test the map expression
const mapExpression = "items.map((item, index) => ordered ? (\n    <@OlItem item={item} index={index} />\n  ) : (\n    <@UlItem item={item} />\n  ))";

console.log("Map expression:", mapExpression);

try {
    console.log("Testing map expression evaluation...");
    const mapResult = await evaluateMapExpression(mapExpression, context);
    console.log("Map result:", mapResult);
    console.log("Map result type:", typeof mapResult);
    console.log("Map result length:", mapResult.length);
} catch (error) {
    console.error("Map evaluation error:", error);
    console.error("Error stack:", error.stack);
}

// Let's also test with a simpler map expression
const simpleMapExpression = "items.map((item, index) => `<li>${item}</li>`)";

try {
    console.log("\nTesting simple map expression...");
    const simpleResult = await evaluateMapExpression(simpleMapExpression, context);
    console.log("Simple map result:", simpleResult);
} catch (error) {
    console.error("Simple map error:", error);
}