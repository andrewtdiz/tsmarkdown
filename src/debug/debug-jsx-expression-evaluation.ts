import { parseMDX as parse } from "../parser";
import { compile } from "../compiler";
import { render } from "../renderer";

// Debug JSX expression evaluation specifically
const listFile = "./mdx/List.mdx";
const listContent = await Bun.file(listFile).text();
const listParsed = parse(listContent);
const listCompiled = compile(listParsed);

console.log("=== Testing JSX expression evaluation ===");

const context = {
    items: ["First", "Second", "Third"],
    ordered: false
};

// Test the resolved expression
const resolvedExpression = 'items.length === 0 ? "Empty" : items.map((item, index) => ordered ? <@OlItem item={item} index={index} /> : <@UlItem item={item} />)';

console.log("Resolved expression:", resolvedExpression);
console.log("Context:", context);

// Test if this is a ternary expression
console.log("Contains ?:", resolvedExpression.includes('?'));
console.log("Contains .map(:", resolvedExpression.includes('.map('));

// Test the ternary evaluation
console.log("\n--- Testing ternary evaluation ---");
try {
    // Find the ternary operator
    let parenCount = 0;
    let questionIndex = -1;
    let colonIndex = -1;

    for (let i = 0; i < resolvedExpression.length; i++) {
        const char = resolvedExpression[i];
        if (char === '(') parenCount++;
        else if (char === ')') parenCount--;
        else if (char === '?' && parenCount === 0) {
            questionIndex = i;
            break;
        }
    }

    if (questionIndex !== -1) {
        // Find the matching colon
        for (let i = questionIndex + 1; i < resolvedExpression.length; i++) {
            const char = resolvedExpression[i];
            if (char === '(') parenCount++;
            else if (char === ')') parenCount--;
            else if (char === ':' && parenCount === 0) {
                colonIndex = i;
                break;
            }
        }

        if (colonIndex !== -1) {
            const condition = resolvedExpression.substring(0, questionIndex).trim();
            const trueValue = resolvedExpression.substring(questionIndex + 1, colonIndex).trim();
            const falseValue = resolvedExpression.substring(colonIndex + 1).trim();

            console.log("Condition:", condition);
            console.log("True value:", trueValue);
            console.log("False value:", falseValue);

            // Evaluate the condition
            const conditionFunc = new Function(...Object.keys(context), `return (${condition})`);
            const conditionResult = conditionFunc(...Object.values(context));
            console.log("Condition result:", conditionResult);

            // Choose the appropriate value
            const selectedExpression = conditionResult ? trueValue : falseValue;
            console.log("Selected expression:", selectedExpression);
            console.log("Selected contains .map(:", selectedExpression.includes('.map('));
        }
    }
} catch (error) {
    console.log("Error in ternary evaluation:", error);
}
