import { parseMDX as parse } from "../../parser";
import { compile } from "../../compiler";
import { render } from "../../renderer";

// Debug ternary expression evaluation specifically
const listFile = "./mdx/List.mdx";
const listContent = await Bun.file(listFile).text();
const listParsed = parse(listContent);
const listCompiled = compile(listParsed);

console.log("=== Testing ternary expression evaluation ===");

const context = {
    items: ["First", "Second", "Third"],
    ordered: false
};

// Test the ternary expression directly
const ternaryExpression = 'items.length === 0 ? "Empty" : items.map((item, index) => ordered ? <@OlItem item={item} index={index} /> : <@UlItem item={item} />)';

console.log("Ternary expression:", ternaryExpression);
console.log("Context:", context);

// Test condition evaluation
const condition = "items.length === 0";
console.log("\n--- Testing condition ---");
console.log("Condition:", condition);

try {
    const conditionFunc = new Function(...Object.keys(context), `return (${condition})`);
    const conditionResult = conditionFunc(...Object.values(context));
    console.log("Condition result:", conditionResult);

    // Test the false value (map expression)
    const falseValue = 'items.map((item, index) => ordered ? <@OlItem item={item} index={index} /> : <@UlItem item={item} />)';
    console.log("\n--- Testing false value (map expression) ---");
    console.log("False value:", falseValue);

    // Test if it contains .map(
    console.log("Contains .map(:", falseValue.includes('.map('));

} catch (error) {
    console.log("Error:", error);
}
