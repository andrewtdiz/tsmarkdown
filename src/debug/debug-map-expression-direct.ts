import { parseMDX as parse } from "../parser";
import { compile } from "../compiler";
import { render } from "../renderer";

// Debug map expression evaluation directly
const listFile = "./mdx/List.mdx";
const listContent = await Bun.file(listFile).text();
const listParsed = parse(listContent);
const listCompiled = compile(listParsed);

console.log("=== Testing map expression evaluation directly ===");

const context = {
    items: ["First", "Second", "Third"],
    ordered: false
};

// Test the map expression
const mapExpression = 'items.map((item, index) => ordered ? <@OlItem item={item} index={index} /> : <@UlItem item={item} />)';

console.log("Map expression:", mapExpression);
console.log("Context:", context);

// Test the regex match
const mapMatch = mapExpression.match(/(.+)\.map\s*\(\s*\(([^)]+)\)\s*=>\s*(.+)\s*\)/);
console.log("Map match:", mapMatch);

if (mapMatch) {
    const [, arrayExpr, params, elementExpr] = mapMatch;
    console.log("\n--- Parsed map expression ---");
    console.log("Array expression:", arrayExpr);
    console.log("Parameters:", params);
    console.log("Element expression:", elementExpr);

    // Get the array
    const arrayFunc = new Function(...Object.keys(context), `return (${arrayExpr})`);
    const array = arrayFunc(...Object.values(context));
    console.log("Array:", array);

    // Parse parameters
    const paramNames = params.split(',').map(p => p.trim());
    console.log("Parameter names:", paramNames);

    // Test first iteration
    console.log("\n--- Testing first iteration ---");
    const item = array[0];
    const index = 0;
    console.log("Item:", item);
    console.log("Index:", index);

    // Create iteration context
    const iterationContext = { ...context };
    paramNames.forEach((paramName, paramIndex) => {
        if (paramIndex === 0) iterationContext[paramName] = item;
        if (paramIndex === 1) iterationContext[paramName] = index;
    });
    console.log("Iteration context:", iterationContext);

    // Test element expression evaluation
    console.log("\n--- Testing element expression evaluation ---");
    console.log("Element expression contains < and >:", elementExpr.includes('<') && elementExpr.includes('>'));
    console.log("Element expression contains ?:", elementExpr.includes('?'));

    // Test if we can evaluate the element expression directly
    try {
        const elemFunc = new Function(...Object.keys(iterationContext), `return (${elementExpr})`);
        const result = elemFunc(...Object.values(iterationContext));
        console.log("Element expression result:", result);
    } catch (error) {
        console.log("Error evaluating element expression:", error);
    }
}
