// Test how JavaScript handles undefined in ternary expressions
const context1 = { items: ["First", "Second", "Third"], withAnd: true };
const context2 = { items: ["First", "Second", "Third"], withAnd: false };
const context3 = { items: ["First", "Second", "Third"], withAnd: undefined };

const expression = "items.slice(0, -1).join(', ') + (withAnd ? ' and ' : ', ') + items[items.length - 1]";

console.log("=== Testing with withAnd: true ===");
try {
    const func1 = new Function(...Object.keys(context1), `return (${expression})`);
    const result1 = func1(...Object.values(context1));
    console.log("Result:", result1);
} catch (error) {
    console.log("Error:", error.message);
}

console.log("\n=== Testing with withAnd: false ===");
try {
    const func2 = new Function(...Object.keys(context2), `return (${expression})`);
    const result2 = func2(...Object.values(context2));
    console.log("Result:", result2);
} catch (error) {
    console.log("Error:", error.message);
}

console.log("\n=== Testing with withAnd: undefined ===");
try {
    const func3 = new Function(...Object.keys(context3), `return (${expression})`);
    const result3 = func3(...Object.values(context3));
    console.log("Result:", result3);
} catch (error) {
    console.log("Error:", error.message);
}

// Test the specific ternary part
console.log("\n=== Testing ternary part ===");
const ternaryExpression = "withAnd ? ' and ' : ', '";

console.log("withAnd: true ->", true ? ' and ' : ', ');
console.log("withAnd: false ->", false ? ' and ' : ', ');
console.log("withAnd: undefined ->", undefined ? ' and ' : ', ');
