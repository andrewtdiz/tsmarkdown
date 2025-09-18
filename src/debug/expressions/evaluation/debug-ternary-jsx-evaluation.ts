import { parseMDX as parse } from "../../../parser";
import { compile } from "../../../compiler";
import { render } from "../../../renderer";

// Debug the specific ternary JSX evaluation issue
const listFile = "./mdx/List.mdx";
const listContent = await Bun.file(listFile).text();
const listParsed = parse(listContent);
const listCompiled = compile(listParsed);

console.log("=== Debugging Ternary JSX Evaluation ===");

const context = {
    items: ["First", "Second", "Third"],
    ordered: false
};

console.log("Context:", context);

// Let's manually test the map expression
const mapExpression = "items.map((item, index) => ordered ? (\n    <@OlItem item={item} index={index} />\n  ) : (\n    <@UlItem item={item} />\n  ))";

console.log("Map expression:", mapExpression);

// Test the ternary JSX expression directly
const ternaryExpression = "ordered ? (\n    <@OlItem item={item} index={index} />\n  ) : (\n    <@UlItem item={item} />\n  )";

console.log("Ternary expression:", ternaryExpression);

// Test with a single item context
const singleItemContext = {
    item: "Test Item",
    index: 0,
    ordered: false
};

console.log("Single item context:", singleItemContext);

// Let's test the JSX component rendering directly
try {
    const jsxElement = "<@UlItem item={item} />";
    console.log("Testing JSX element:", jsxElement);

    // Import the renderJSXComponent function
    const { renderJSXComponent } = await import("../../../renderer/render-utils");
    const result = await renderJSXComponent(jsxElement, singleItemContext);
    console.log("JSX component result:", result);
} catch (error) {
    console.error("JSX component error:", error);
}