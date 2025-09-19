// Re-exports from modular parser architecture
import type { ParseContext } from './types';
import { parseContent } from './pipeline';
import { processJSXElements } from './jsx';

// ESLint integration (opt-in)
import { parseForESLint, validateForESLint, extractTypeInfo, analyzeReturnStatements } from './eslint-parser';
import { locateComponent, splitComponent, validateComponentStructure } from './component-scanner';

// Core pipeline and types
export type { ParseContext } from './types';
export { parseContent } from './pipeline';

// String utilities
export { findMatchingBrace, findMatchingParen, normalizeIndentation } from './string-helpers';

// Interpolation parsing
export { parseInterpolations, processNestedInterpolations } from './interpolations';

// Conditional parsing
export { parseConditionals, processConditionalBlocks } from './conditionals';

// Ternary parsing
export { parseTernary, processTernaryExpressions } from './ternary';

// JSX parsing
export { parseJSX, processJSXElements, processJSXExpressions } from './jsx';

// Parameter parsing
export { parseParameters, parseParameterTypes, inferTypeFromUsage, generatePropsInterface } from './parameters';

// Legacy compatibility - keeping processTemplateContent function
export function processTemplateContent(
    content: string,
    interpolations: Array<{ placeholder: string; expression: string }>,
    conditionalBlocks: Array<{ condition: string; content: string }>,
    ternaryExpressions: Array<{ condition: string; trueValue: string; falseValue: string }>,
    jsxExpressions: Array<{ placeholder: string; expression: string }>,
): string {
    // Create unified parsing context
    const context: ParseContext = {
        interpolations,
        conditionalBlocks,
        ternaryExpressions,
        jsxExpressions,
    };

    // Use the new unified parsing architecture
    let processed = parseContent(content, context);

    // Ensure JSX elements are processed after other content processing
    processed = processJSXElements(processed, jsxExpressions);

    return processed;
}

// ESLint integration exports (opt-in functionality)
export { parseForESLint, validateForESLint, extractTypeInfo, analyzeReturnStatements } from './eslint-parser';
export { locateComponent, splitComponent, validateComponentStructure } from './component-scanner';

// ESLint integration types
export type { ESLintParseResult, ESLintParseOptions } from './eslint-parser';
export type { ComponentSplit, ComponentLocation } from './component-scanner';
