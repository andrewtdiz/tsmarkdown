// Shared types for the parser modules
import type { Chunk } from '../runtime/tsm-runtime';
import { TSMComponentAttribute } from './tsm-ast';

export interface ParseContext {
    interpolations: Array<{ placeholder: string, expression: string }>;
    conditionalBlocks: Array<{ condition: string, content: any }>;
    ternaryExpressions: Array<{ condition: string, trueValue: any, falseValue: any }>;
    jsxExpressions: Array<{ placeholder: string; expression: string; name: string; props: Array<TSMComponentAttribute> }>;
    variableValues?: Map<string, any>;
}

export interface TSMBlockMatch {
    index: number;
    0: string;
    1: string;
}