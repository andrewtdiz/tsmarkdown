// Shared types for the parser modules
import type { Chunk } from '../runtime/tsm-runtime';

export interface ParseContext {
    interpolations: Array<{ placeholder: string, expression: string }>;
    conditionalBlocks: Array<{ condition: string, content: any }>;
    ternaryExpressions: Array<{ condition: string, trueValue: any, falseValue: any }>;
    jsxExpressions: Array<{ placeholder: string, expression: string }>;
    variableValues?: Map<string, any>;
}
