// Shared types for the parser modules

export interface ParseContext {
    interpolations: Array<{ placeholder: string, expression: string }>;
    conditionalBlocks: Array<{ condition: string, content: string }>;
    ternaryExpressions: Array<{ condition: string, trueValue: string, falseValue: string }>;
    jsxExpressions: Array<{ placeholder: string, expression: string }>;
}
