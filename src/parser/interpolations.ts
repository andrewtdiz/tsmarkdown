// Unified double-brace syntax dispatcher
import { findMatchingDoubleBrace, findMatchingBrace } from './string-helpers';
import type { ParseContext } from './types';

// Warning system for legacy single-brace usage
const legacyWarnings = new Set<string>();

function warnLegacySyntax(expression: string, line: number): void {
    const warning = `Legacy single-brace syntax detected at line ${line}: {${expression}}. Please migrate to double-brace syntax: {{${expression}}}`;
    if (!legacyWarnings.has(warning)) {
        console.warn(`[Better MDX] ${warning}`);
        legacyWarnings.add(warning);
    }
}

// Process legacy single-brace syntax with warnings
function processLegacySingleBraces(content: string, context: ParseContext): string {
    let processedContent = content;
    let startIndex = 0;

    while (startIndex < processedContent.length) {
        // Find the next { pattern (not {{)
        const openIndex = processedContent.indexOf('{', startIndex);
        if (openIndex === -1) break;

        // Skip if it's a double brace {{
        if (processedContent[openIndex + 1] === '{') {
            startIndex = openIndex + 2;
            continue;
        }

        // Find the matching closing brace
        const closeIndex = findMatchingBrace(processedContent, openIndex);
        if (closeIndex === -1) {
            startIndex = openIndex + 1;
            continue;
        }

        // Extract the expression
        const expression = processedContent.substring(openIndex + 1, closeIndex).trim();

        if (expression) {
            // Calculate approximate line number for warning
            const lineNumber = processedContent.substring(0, openIndex).split('\n').length;
            warnLegacySyntax(expression, lineNumber);

            // Classify and process the legacy expression as if it were double-brace
            const expressionType = classifyExpression(expression);
            let placeholder: string;

            switch (expressionType) {
                case 'conditional':
                    placeholder = `__CONDITIONAL_${context.conditionalBlocks.length}__`;
                    const andPattern = /&&\s*\(/;
                    const match = expression.match(andPattern);
                    if (match) {
                        const andIndex = match.index!;
                        const condition = expression.substring(0, andIndex).trim();
                        const parenStart = andIndex + match[0].length - 1;
                        const parenEnd = findMatchingParen(expression, parenStart);
                        if (parenEnd !== -1) {
                            const blockContent = expression.substring(parenStart + 1, parenEnd).trim();
                            // Recursively process the block content to handle nested constructs
                            const processedBlockContent = parseInterpolations(blockContent, context);
                            context.conditionalBlocks.push({
                                condition: condition,
                                content: processedBlockContent,
                            });
                        }
                    }
                    break;

                case 'ternary':
                    placeholder = `__TERNARY_${context.ternaryExpressions.length}__`;
                    const questionIndex = expression.indexOf('?');
                    const colonIndex = expression.lastIndexOf(':');
                    if (questionIndex !== -1 && colonIndex !== -1 && colonIndex > questionIndex) {
                        const condition = expression.substring(0, questionIndex).trim();
                        const trueValue = expression.substring(questionIndex + 1, colonIndex).trim();
                        const falseValue = expression.substring(colonIndex + 1).trim();
                        context.ternaryExpressions.push({
                            condition: condition,
                            trueValue: trueValue,
                            falseValue: falseValue,
                        });
                    }
                    break;

                case 'jsx':
                    placeholder = `__JSX_EXPRESSION_${context.jsxExpressions.length}__`;
                    context.jsxExpressions.push({ placeholder, expression });
                    break;

                case 'interpolation':
                default:
                    placeholder = `__INTERPOLATION_${context.interpolations.length}__`;
                    context.interpolations.push({ placeholder, expression });
                    break;
            }

            // Replace the entire { expression } with the placeholder
            processedContent = processedContent.substring(0, openIndex) +
                placeholder +
                processedContent.substring(closeIndex + 1);

            // Update startIndex to continue from the placeholder
            startIndex = openIndex + placeholder.length;
        } else {
            startIndex = closeIndex + 1;
        }
    }

    return processedContent;
}

// Classify expression type and route to appropriate handler
function classifyExpression(expression: string): 'conditional' | 'ternary' | 'jsx' | 'interpolation' {
    const trimmed = expression.trim();

    // Check for conditional pattern: condition && (content)
    // Must have && followed by ( and the pattern should be at the start
    if (trimmed.includes('&&') && trimmed.includes('(') && trimmed.includes(')')) {
        const andPattern = /^[^{}]*&&\s*\(/;
        if (andPattern.test(trimmed)) {
            return 'conditional';
        }
    }

    // Check for ternary pattern: condition ? trueValue : falseValue
    // Must have exactly one ? and one : in the right order
    if (trimmed.includes('?') && trimmed.includes(':')) {
        const questionCount = (trimmed.match(/\?/g) || []).length;
        const colonCount = (trimmed.match(/:/g) || []).length;
        if (questionCount === 1 && colonCount === 1) {
            const questionIndex = trimmed.indexOf('?');
            const colonIndex = trimmed.lastIndexOf(':');
            if (colonIndex > questionIndex) {
                return 'ternary';
            }
        }
    }

    // Check for JSX pattern: contains < and > or JSX elements
    if (trimmed.includes('<') && trimmed.includes('>')) {
        return 'jsx';
    }

    // Default to interpolation
    return 'interpolation';
}

// Unified dispatcher for double-brace syntax with legacy support
export function parseInterpolations(content: string, context: ParseContext): string {
    let processedContent = content;
    let startIndex = 0;

    // First pass: process double-brace syntax {{...}}
    while (startIndex < processedContent.length) {
        // Find the next {{ pattern
        const openIndex = processedContent.indexOf('{{', startIndex);
        if (openIndex === -1) break;

        // Find the matching }} using the helper function
        const closeIndex = findMatchingDoubleBrace(processedContent, openIndex);
        if (closeIndex === -1) {
            // No matching }} found, skip this one
            startIndex = openIndex + 2;
            continue;
        }

        // Extract the expression (everything between {{ and }})
        const expression = processedContent.substring(openIndex + 2, closeIndex).trim();

        if (expression) {
            // Classify the expression type
            const expressionType = classifyExpression(expression);

            let placeholder: string;

            switch (expressionType) {
                case 'conditional':
                    // Parse conditional logic
                    const andPattern = /&&\s*\(/;
                    const match = expression.match(andPattern);
                    if (match) {
                        const andIndex = match.index!;
                        const condition = expression.substring(0, andIndex).trim();
                        const parenStart = andIndex + match[0].length - 1;
                        const parenEnd = findMatchingParen(expression, parenStart);
                        if (parenEnd !== -1) {
                            const blockContent = expression.substring(parenStart + 1, parenEnd).trim();

                            // Store the current length to get the correct index for this conditional
                            const currentIndex = context.conditionalBlocks.length;

                            // Add the conditional block first (before processing nested content)
                            context.conditionalBlocks.push({
                                condition: condition,
                                content: blockContent, // Don't process nested content yet
                            });

                            // Now process the nested content and update the content
                            const processedBlockContent = parseInterpolations(blockContent, context);
                            context.conditionalBlocks[currentIndex].content = processedBlockContent;

                            placeholder = `__CONDITIONAL_${currentIndex}__`;
                        }
                    }
                    break;

                case 'ternary':
                    placeholder = `__TERNARY_${context.ternaryExpressions.length}__`;
                    // Parse ternary logic
                    const questionIndex = expression.indexOf('?');
                    const colonIndex = expression.lastIndexOf(':');
                    if (questionIndex !== -1 && colonIndex !== -1 && colonIndex > questionIndex) {
                        const condition = expression.substring(0, questionIndex).trim();
                        const trueValue = expression.substring(questionIndex + 1, colonIndex).trim();
                        const falseValue = expression.substring(colonIndex + 1).trim();
                        context.ternaryExpressions.push({
                            condition: condition,
                            trueValue: trueValue,
                            falseValue: falseValue,
                        });
                    }
                    break;

                case 'jsx':
                    placeholder = `__JSX_EXPRESSION_${context.jsxExpressions.length}__`;
                    context.jsxExpressions.push({ placeholder, expression });
                    break;

                case 'interpolation':
                default:
                    placeholder = `__INTERPOLATION_${context.interpolations.length}__`;
                    context.interpolations.push({ placeholder, expression });
                    break;
            }

            // Replace the entire {{ expression }} with the placeholder
            processedContent = processedContent.substring(0, openIndex) +
                placeholder +
                processedContent.substring(closeIndex + 2);

            // Update startIndex to continue from the placeholder
            startIndex = openIndex + placeholder.length;
        } else {
            // Empty expression, skip
            startIndex = closeIndex + 2;
        }
    }

    // Second pass: process legacy single-brace syntax {...} with warnings
    processedContent = processLegacySingleBraces(processedContent, context);

    return processedContent;
}

// Helper function to find matching parenthesis (needed for conditional parsing)
function findMatchingParen(content: string, startIndex: number): number {
    let parenCount = 0;

    for (let i = startIndex; i < content.length; i++) {
        const char = content[i];

        if (char === '(') {
            parenCount++;
        } else if (char === ')') {
            parenCount--;
            if (parenCount === 0) {
                return i;
            }
        }
    }

    return -1; // No matching parenthesis found
}

export function processNestedInterpolations(
    content: string,
    interpolations: Array<{ placeholder: string; expression: string }>,
): string {
    let processedContent = content;
    let startIndex = 0;

    while (startIndex < processedContent.length) {
        // Find the next {{ pattern
        const openIndex = processedContent.indexOf('{{', startIndex);
        if (openIndex === -1) break;

        // Find the matching }} by counting nested braces
        let braceCount = 0;
        let closeIndex = openIndex + 2; // Start after {{

        while (closeIndex < processedContent.length) {
            const char = processedContent[closeIndex];
            const nextChar = processedContent[closeIndex + 1];

            if (char === '{' && nextChar === '{') {
                // Found nested {{
                braceCount++;
                closeIndex += 2;
            } else if (char === '}' && nextChar === '}') {
                // Found }}
                if (braceCount === 0) {
                    // This is the matching closing }}
                    break;
                } else {
                    // This is a nested closing }}, decrement count
                    braceCount--;
                    closeIndex += 2;
                }
            } else {
                closeIndex++;
            }
        }

        if (closeIndex >= processedContent.length) {
            // No matching }} found, skip this one
            startIndex = openIndex + 2;
            continue;
        }

        // Extract the expression (everything between {{ and }})
        const expression = processedContent.substring(openIndex + 2, closeIndex).trim();

        if (expression) {
            const placeholder = `__INTERPOLATION_${interpolations.length}__`;
            interpolations.push({ placeholder, expression });

            // Replace the entire {{ expression }} with the placeholder
            processedContent = processedContent.substring(0, openIndex) +
                placeholder +
                processedContent.substring(closeIndex + 2);

            // Update startIndex to continue from the placeholder
            startIndex = openIndex + placeholder.length;
        } else {
            // Empty expression, skip
            startIndex = closeIndex + 2;
        }
    }

    return processedContent;
}
