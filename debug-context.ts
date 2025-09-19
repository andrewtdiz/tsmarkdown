import { createPropsContext } from "./src/renderer/render-context";

// Test context creation
const functionParams = ["items", "withAnd"];
const props = { items: ["First", "Second", "Third"] }; // withAnd is missing
const parameterTypes = [
    { name: "items", type: "string[]", required: true },
    { name: "withAnd", type: "boolean", required: true }
];

console.log("Function params:", functionParams);
console.log("Props:", props);
console.log("Parameter types:", parameterTypes);

const context = createPropsContext(functionParams, props, parameterTypes);
console.log("Created context:", context);

// Test if withAnd is in the context
console.log("withAnd in context:", 'withAnd' in context);
console.log("withAnd value:", context.withAnd);
console.log("withAnd type:", typeof context.withAnd);
