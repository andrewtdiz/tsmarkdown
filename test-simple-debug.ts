import { parseContent } from "./src/parser/pipeline";
import type { ParseContext } from "./src/parser/types";

const testContent = `Welcome, {{ data.name }}!`;
const context: ParseContext = {
    interpolations: [],
    conditionalBlocks: [],
    ternaryExpressions: [],
    jsxExpressions: []
};

console.log("Testing parseContent with simple interpolation...");
const result = parseContent(testContent, context);
console.log("Result:", result);
console.log("Result type:", typeof result);
console.log("Is array:", Array.isArray(result));
