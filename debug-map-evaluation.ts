import { parseMDX as parse } from "./src/parser";
import { compile } from "./src/compiler";
import { render } from "./src/renderer";

// Debug the map evaluation specifically
const listFile = "./mdx/List.mdx";
const listContent = await Bun.file(listFile).text();
const listParsed = parse(listContent);
const listCompiled = compile(listParsed);

console.log("=== Debugging Map Evaluation ===");

const context = {
    items: ["First", "Second", "Third"],
    ordered: false
};

// Let's test the map expression step by step
const mapExpression = "items.map((item, index) => ordered ? (\n    <@OlItem item={item} index={index} />\n  ) : (\n    <@UlItem item={item} />\n  ))";

console.log("Map expression:", mapExpression);

// Import the evaluation functions
const { evaluateMapExpression, evaluateTernaryJSXExpression } = await import("./src/renderer/render-utils");

try {
    console.log("Testing map expression evaluation...");
    const mapResult = await evaluateMapExpression(mapExpression, context);
    console.log("Map result:", mapResult);
} catch (error) {
    console.error("Map evaluation error:", error);
    console.error("Error stack:", error.stack);
}

// Let's test the ternary JSX expression with a single item
const singleItemContext = {
    item: "Test Item",
    index: 0,
    ordered: false
};

try {
    console.log("\nTesting ternary JSX expression...");
    const ternaryExpression = "ordered ? (\n    <@OlItem item={item} index={index} />\n  ) : (\n    <@UlItem item={item} />\n  )";
    const ternaryResult = await evaluateTernaryJSXExpression(ternaryExpression, singleItemContext);
    console.log("Ternary result:", ternaryResult);
} catch (error) {
    console.error("Ternary evaluation error:", error);
    console.error("Error stack:", error.stack);
}