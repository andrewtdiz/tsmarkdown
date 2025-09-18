// Re-exports from modular parser architecture
import type { ParseContext } from './types';

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
    // Import the functions we need
    const { parseContent } = require('./pipeline');
    const { processJSXElements } = require('./jsx');

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
