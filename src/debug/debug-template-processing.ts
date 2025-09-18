import { processTemplateContent } from "../renderer/render-utils";

const content = "<@List items={items} />";
const interpolations: Array<{ placeholder: string; expression: string }> = [];
const conditionalBlocks: Array<{ condition: string; content: string }> = [];
const ternaryExpressions: Array<{ condition: string; trueValue: string; falseValue: string }> = [];
const jsxExpressions: Array<{ placeholder: string; expression: string }> = [];

console.log("=== Template Processing Debug ===");
console.log("Input content:", content);
console.log("JSX expressions before:", jsxExpressions);

const result = processTemplateContent(
    content,
    interpolations,
    conditionalBlocks,
    ternaryExpressions,
    jsxExpressions
);

console.log("Output content:", result);
console.log("JSX expressions after:", jsxExpressions);
