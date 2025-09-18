import { parseMDX as parse } from "../parser";
import { compile } from "../compiler";
import { render } from "../renderer";
import { componentRegistry, loadDependencies, evaluateJSXExpression, evaluateMapExpression } from "../renderer/render-utils";

// Debug map expression detection specifically
const listFile = "./mdx/List.mdx";
const listContent = await Bun.file(listFile).text();
const listParsed = parse(listContent);
const listCompiled = compile(listParsed);

console.log("=== Debugging Map Expression Detection ===");

// Load dependencies
const errors: string[] = [];
loadDependencies(listCompiled.dependencies, "./mdx", errors);

const context = {
    items: ["First", "Second", "Third"],
    ordered: false
};

// Test the map expression detection
const mapExpression = "items.map((item, index) => ordered ? (\n    <@OlItem item={item} index={index} />\n  ) : (\n    <@UlItem item={item} />\n  ))";

console.log("Map expression:", mapExpression);
console.log("Contains .map(:", mapExpression.includes('.map('));

// Test the regex pattern used in evaluateMapExpression
const mapStartMatch = mapExpression.match(/(.+)\.map\s*\(\s*\(([^)]+)\)\s*=>\s*/);
console.log("Map start match:", mapStartMatch);

if (mapStartMatch) {
    console.log("Array expression:", mapStartMatch[1]);
    console.log("Parameters:", mapStartMatch[2]);

    // Test the callback extraction
    const callbackStart = mapStartMatch[0].length;
    console.log("Callback start position:", callbackStart);

    let parenCount = 0;
    let callbackEnd = -1;

    for (let i = callbackStart; i < mapExpression.length; i++) {
        const char = mapExpression[i];
        if (char === '(') parenCount++;
        else if (char === ')') {
            parenCount--;
            if (parenCount < 0) {
                callbackEnd = i;
                break;
            }
        }
    }

    console.log("Callback end position:", callbackEnd);

    if (callbackEnd !== -1) {
        const elementExpr = mapExpression.substring(callbackStart, callbackEnd).trim();
        console.log("Element expression:", elementExpr);
    }
}

// Test evaluateMapExpression directly
try {
    console.log("\nTesting evaluateMapExpression directly...");
    const mapResult = await evaluateMapExpression(mapExpression, context);
    console.log("Map result:", mapResult);
} catch (error) {
    console.error("Map evaluation error:", error);
}

// Test evaluateJSXExpression
try {
    console.log("\nTesting evaluateJSXExpression...");
    const jsxResult = await evaluateJSXExpression(mapExpression, context);
    console.log("JSX result:", jsxResult);
} catch (error) {
    console.error("JSX evaluation error:", error);
}
