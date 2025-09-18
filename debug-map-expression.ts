import { parseMDX as parse } from "./src/parser";
import { compile } from "./src/compiler";
import { render } from "./src/renderer";

// Debug the map expression specifically
const listFile = "./mdx/List.mdx";
const listContent = await Bun.file(listFile).text();
const listParsed = parse(listContent);
const listCompiled = compile(listParsed);

console.log("=== Testing map expression evaluation ===");

// Test the map expression directly
const context = {
    items: ["First", "Second", "Third"],
    ordered: false
};

console.log("Context:", context);

// Let's manually test the map expression
const mapExpression = 'items.map((item, index) => ordered ? <@OlItem item={item} index={index} /> : <@UlItem item={item} />)';

console.log("Map expression:", mapExpression);

try {
    // Test if we can evaluate the array part
    const arrayFunc = new Function(...Object.keys(context), `return (items)`);
    const array = arrayFunc(...Object.values(context));
    console.log("Array:", array);

    // Test the map function
    const mapFunc = new Function(...Object.keys(context), `return (${mapExpression})`);
    const result = mapFunc(...Object.values(context));
    console.log("Map result:", result);
} catch (error) {
    console.log("Error:", error);
}
