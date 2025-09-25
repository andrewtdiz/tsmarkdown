// Conditional parsing and processing
import { findMatchingBrace, findMatchingParen } from './string-helpers';
import type { ParseContext } from './types';
import { processTernaryExpressions } from './ternary';

// Recursive conditional parser
export function parseConditionals(content: string, context: ParseContext): string {
    let processedContent = content;
    let startIndex = 0;

    while (startIndex < processedContent.length) {
        const openBraceIndex = processedContent.indexOf('{', startIndex);
        if (openBraceIndex === -1) break;

        // Find the matching closing brace
        const endIndex = findMatchingBrace(processedContent, openBraceIndex);
        if (endIndex === -1) {
            startIndex = openBraceIndex + 1;
            continue;
        }

        // Extract the expression, including the closing parenthesis
        // endIndex points to the closing brace, but we need to include the closing parenthesis
        const expression = processedContent.substring(openBraceIndex + 1, endIndex);
        const trimmedExpression = expression.trim();

        // Check if this is a conditional block (contains && and parentheses)
        if (trimmedExpression.includes('&&') && trimmedExpression.includes('(') && trimmedExpression.includes(')')) {
            // Look for the pattern: condition && (content)
            const andPattern = /&&\s*\(/;
            const match = trimmedExpression.match(andPattern);

            if (!match) {
                startIndex = endIndex + 1;
                continue;
            }

            const andIndex = match.index!;
            const condition = trimmedExpression.substring(0, andIndex).trim();

            // Find the opening parenthesis that comes after the &&
            const parenStart = andIndex + match[0].length - 1; // -1 because we want the position of the (
            if (parenStart === -1) {
                startIndex = endIndex + 1;
                continue;
            }

            // Find the matching closing parenthesis
            const parenEnd = findMatchingParen(trimmedExpression, parenStart);
            if (parenEnd === -1) {
                startIndex = endIndex + 1;
                continue;
            }

            const blockContent = trimmedExpression.substring(parenStart + 1, parenEnd).trim();

            // Note: Recursive parsing would be handled by the main pipeline
            const parsedNested = blockContent;

            const placeholder = `__CONDITIONAL_${context.conditionalBlocks.length}__`;
            context.conditionalBlocks.push({
                condition: condition,
                content: parsedNested,
            });


            // Replace the entire conditional block with the placeholder
            processedContent = processedContent.substring(0, openBraceIndex) +
                placeholder +
                processedContent.substring(endIndex + 1);

            // Update startIndex to continue from the placeholder
            startIndex = openBraceIndex + placeholder.length;
        } else {
            startIndex = endIndex + 1;
        }
    }

    return processedContent;
}

export function processConditionalBlocks(
    content: string,
    conditionalBlocks: Array<{ condition: string; content: string }>,
    ternaryExpressions: Array<{ condition: string; trueValue: string; falseValue: string }> = [],
    interpolations: Array<{ placeholder: string; expression: string }> = [],
): string {
    let processedContent = content;
    let startIndex = 0;

    while (startIndex < processedContent.length) {
        const openBraceIndex = processedContent.indexOf('{', startIndex);
        if (openBraceIndex === -1) break;

        // Skip if it's a double brace {{ }}
        if (processedContent[openBraceIndex + 1] === '{') {
            startIndex = openBraceIndex + 2;
            continue;
        }

        // Find the matching closing brace
        const endIndex = findMatchingBrace(processedContent, openBraceIndex);
        if (endIndex === -1) {
            startIndex = openBraceIndex + 1;
            continue;
        }

        const expression = processedContent.substring(openBraceIndex + 1, endIndex);
        const trimmedExpression = expression.trim();

        // Check if this is a conditional block (contains && and parentheses)
        if (trimmedExpression.includes('&&') && trimmedExpression.includes('(') && trimmedExpression.includes(')')) {
            // Look for the pattern: condition && (content)
            // We need to find the && that comes right before the opening parenthesis
            const andPattern = /&&\s*\(/;
            const match = trimmedExpression.match(andPattern);

            if (!match) {
                startIndex = endIndex + 1;
                continue;
            }

            const andIndex = match.index!;
            const condition = trimmedExpression.substring(0, andIndex).trim();

            // Find the opening parenthesis that comes after the &&
            const parenStart = andIndex + match[0].length - 1; // -1 because we want the position of the (
            if (parenStart === -1) {
                startIndex = endIndex + 1;
                continue;
            }

            // Find the matching closing parenthesis
            const parenEnd = findMatchingParen(trimmedExpression, parenStart);
            if (parenEnd === -1) {
                startIndex = endIndex + 1;
                continue;
            }

            const blockContent = trimmedExpression.substring(parenStart + 1, parenEnd).trim();

            // Process any nested conditionals, ternary expressions, and interpolations within this block recursively
            let processedBlockContent = blockContent;
            if (blockContent.includes('{') && blockContent.includes('&&')) {
                processedBlockContent = processConditionalBlocks(processedBlockContent, conditionalBlocks, ternaryExpressions, interpolations);
            }
            if (blockContent.includes('{') && blockContent.includes('?')) {
                // Note: This creates a dependency on ternary - consider refactoring to avoid circular dependencies
                
                processedBlockContent = processTernaryExpressions(processedBlockContent, ternaryExpressions);
            }
            if (blockContent.includes('{{')) {
                processedBlockContent = processedBlockContent.replace(
                    /\{\{\s*([^}]+)\s*\}\}/g,
                    (match, expression) => {
                        const placeholder = `__INTERPOLATION_${interpolations.length}__`;
                        interpolations.push({ placeholder, expression: expression.trim() });
                        return placeholder;
                    },
                );
            }

            const placeholder = `__CONDITIONAL_${conditionalBlocks.length}__`;
            conditionalBlocks.push({
                condition: condition,
                content: processedBlockContent,
            });

            // Replace the entire conditional block with the placeholder
            processedContent = processedContent.substring(0, openBraceIndex) +
                placeholder +
                processedContent.substring(endIndex + 1);

            // Update startIndex to continue from the placeholder
            startIndex = openBraceIndex + placeholder.length;
        } else {
            startIndex = endIndex + 1;
        }
    }

    return processedContent;
}
